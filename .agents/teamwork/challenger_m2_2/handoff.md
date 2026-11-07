# Milestone 2 Adversarial Challenge Report: Multi-Tenancy, Concurrency & Security

**Verdict**: **REQUEST_CHANGES**
**Date**: 2026-11-06T19:07:00Z
**Challenger**: `challenger_m2_2` (Empirical Challenger)
**Scope**: Multi-Tenant Scoping (`src/lib/db.ts`), Concurrency Race Conditions (`/api/auth/setup`), and Room Code Collision Resilience (`/api/rooms`).

---

## 1. Observation

### 1.1 Multi-Tenant Read Query Scoping & Shared Catalogs (`src/lib/db.ts`)
Direct adversarial tests executed via Vitest in `tests/integration/adversarial-multitenancy.test.ts`:
- **Direct Record Leakage via `findFirst`**:
  `scopedAlpha.user.findFirst({ where: { id: userBeta.id } })` returned verbatim `null`.
  `scopedAlpha.team.findFirst({ where: { id: teamBeta.id } })` returned `null`.
  `scopedAlpha.gameSession.findFirst({ where: { id: sessionBeta.id } })` returned `null`.
  `scopedAlpha.invitation.findFirst({ where: { id: inviteBeta.id } })` returned `null`.
  `scopedAlpha.teamMember.findFirst({ where: { teamId: teamBeta.id } })` returned `null`.
- **Parameter Tampering & Forged `organizationId`**:
  `scopedAlpha.user.findMany({ where: { organizationId: orgBeta.id } })` returned only Org Alpha's users (`[userAlpha]`), zero users from Org Beta. The extension unconditionally overwrote the malicious parameter with `organizationId: orgAlpha.id`.
- **OR Filter Bypass Probes**:
  `scopedAlpha.user.findMany({ where: { OR: [{ organizationId: orgBeta.id }, { id: userBeta.id }] } })` returned 0 records matching `userBeta.id`.
- **Shared Catalog Shielding (`WordBank`, `QuestionDeck`)**:
  - `scopedAlpha.wordBank.findMany()` returned Org Alpha custom bank (`isGlobal: false`) and both Global banks (`isGlobal: true`), strictly excluding Org Beta custom bank.
  - `scopedAlpha.wordBank.findFirst({ where: { id: bankBeta.id } })` returned `null`.
  - `scopedBeta.wordBank.findMany()` returned Org Beta custom bank and both Global banks, strictly excluding Org Alpha custom bank.
  - `scopedBeta.wordBank.findFirst({ where: { id: bankAlpha.id } })` returned `null`.
  - Identical behavior verified for `QuestionDeck`.

### 1.2 EMPIRICAL SECURITY VULNERABILITY: Unshielded Write Operations in `getScopedPrisma`
In `src/lib/db.ts` (lines 30–135), `getScopedPrisma(organizationId)` configures extension hooks under `query`:
```ts
// src/lib/db.ts:32-45
user: {
  async findMany({ args, query }) {
    args.where = { ...args.where, organizationId };
    return query(args);
  },
  async findFirst({ args, query }) {
    args.where = { ...args.where, organizationId };
    return query(args);
  },
  async count({ args, query }) {
    args.where = { ...args.where, organizationId };
    return query(args);
  },
},
```
Notice: Only `findMany`, `findFirst`, and `count` are hooked. Write operations (`update`, `updateMany`, `delete`, `deleteMany`, `upsert`, `create`) are completely absent from the extension.

**Empirical Proof of Cross-Tenant Mutation Leakage**:
Running `tests/integration/adversarial-multitenancy.test.ts` line 348:
```ts
const updateRes = await scopedA.user.updateMany({
  where: { id: userB.id },
  data: { role: "SUPERADMIN" },
});
```
Result logged verbatim:
```
[EMPIRICAL AUDIT] getScopedPrisma write protection results:
  - User updateMany cross-tenant leak: true (role modified: true)
  - Team updateMany cross-tenant leak: true (name modified: true)
  - GameSession updateMany cross-tenant leak: true (status modified: true)
```
The query updated `userB.role` from `"ORG_ADMIN"` to `"SUPERADMIN"` in Org Beta, despite being called from `scopedA = getScopedPrisma(orgA.id)`.

### 1.3 Concurrency & Race Condition Stress-Test (`/api/auth/setup`)
Simulated 5 concurrent HTTP `POST` requests racing to initialize the application via `/api/auth/setup`:
- Exactly 1 request returned HTTP `201 Created` with superadmin session payload.
- Exactly 4 requests were rejected atomically with HTTP `409 Conflict`.
- Verbatim audit output:
  `[CONCURRENCY AUDIT] Setup racing responses: 1 created (201), 4 conflicts (409)`
- Database inspection confirmed exactly 1 superadmin created, `SystemConfig` locked with `system_initialized: "true"`, and 0 orphaned organizations or teams.
- Subsequent `GET /api/auth/setup` returned `{ initialized: true }`.
- Subsequent `POST /api/auth/setup` returned HTTP `409 Conflict`.

### 1.4 Room Code Generation Stress & Collision Analysis (`/api/rooms`)
Batch generation of 25,000 room codes using the algorithm in `src/app/api/rooms/route.ts`:
- **Format Constraint**: 25,000 / 25,000 (100%) conformed to regex `^LJ-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$`.
- **Length Constraint**: All codes exactly 7 characters.
- **Ambiguity Removal**: 0 codes contained ambiguous characters `0`, `1`, `I`, `O`, `l`, `o`, `i`.
- **Collision Rate (Birthday Paradox)**:
  - Code space $S = 30^4 = 810,000$.
  - Sample size $N = 25,000$.
  - Theoretical expectation: $E[\text{collisions}] \approx 25,000 - 810,000 \times (1 - e^{-25000 / 810000}) \approx 296$ collisions ($1.18\%$).
  - Observed collisions: 279 collisions ($1.12\%$).
  - Log output:
    `[COLLISION AUDIT] Generated 25000 codes: 279 observed collisions (1.12%), theoretical expectation ~296 collisions.`
- **Database Collision Resilience**: Pre-seeded collisions triggered Prisma `P2002` unique constraint; the while loop in `/api/rooms` successfully retried and generated unique codes.

---

## 2. Logic Chain

1. **Why Read Isolation Succeeds**:
   - `getScopedPrisma` injects `organizationId: orgId` into `args.where` for `findMany`, `findFirst`, and `count`.
   - In Prisma query compilation, adding `organizationId: orgId` ensures all queries are filtered at the SQL level with `WHERE ... AND organizationId = ?`.
   - Therefore, direct lookups, forged parameters, and OR injections cannot leak cross-tenant read data.

2. **Why Cross-Tenant Mutation Fails (Vulnerability Root Cause)**:
   - In Prisma Client Extensions, unhandled query methods on extended models fall through to the underlying base client.
   - Because `update`, `updateMany`, `delete`, and `deleteMany` are omitted from `src/lib/db.ts`, calling `scopedDb.user.updateMany({ where: { id: userB.id }, data: ... })` does not inject `where: { organizationId }`.
   - Consequently, Prisma compiles `UPDATE "User" SET ... WHERE "id" = ?` without an `organizationId` predicate.
   - Any API route in current or future milestones (M3–M5) that performs updates or deletions via `getScopedPrisma` would permit horizontal privilege escalation or cross-tenant sabotage.

3. **Why Setup Concurrency Succeeds**:
   - `src/app/api/auth/setup/route.ts` wraps the entire bootstrap sequence in `prismaUnscoped.$transaction`.
   - Inside the transaction, it performs a strict lock check on `systemConfig.findUnique({ where: { key: "system_initialized" } })`.
   - In SQLite / PostgreSQL, the serializable/exclusive lock ensures that once the first transaction sets `system_initialized: "true"`, all concurrent racing transactions see the initialized flag, abort immediately by throwing `ALREADY_INITIALIZED`, and return HTTP 409 Conflict.

4. **Why Room Code Generation Succeeds**:
   - `crypto.randomInt(0, 30)` provides cryptographically secure, uniform random selection across the 30-character alphabet.
   - Across 25,000 samples, empirical collisions ($1.12\%$) match the theoretical birthday problem curve ($1.18\%$) within 0.06%, confirming uniform entropy with zero catastrophic clustering.

---

## 3. Caveats

- **SQLite Single-Writer Concurrency**: Under SQLite, database concurrency is serialized at the file lock level. Under a high-concurrency PostgreSQL cluster, `prismaUnscoped.$transaction` in `/api/auth/setup` relies on transaction isolation (`isolationLevel: 'Serializable'` or database advisory locks). If migrated to PostgreSQL, explicit `isolationLevel: Prisma.TransactionIsolationLevel.Serializable` should be added to the `$transaction` call.
- **Scope of Route Mutations in M2**: Existing M2 routes (`/api/teams`, `/api/invitations`, `/api/rooms`) write via `prismaUnscoped` with explicit `session.orgId` checks in the route handler body. However, `getScopedPrisma` is an exported core architectural utility that claims full tenant scoping; fixing it now prevents critical security debt in Milestones 3, 4, and 5.

---

## 4. Conclusion

The application architecture satisfies read isolation, catalog segregation, first-run atomic concurrency lock, and room code generation constraints.
However, **REQUEST_CHANGES** is issued due to one critical architectural omission in `src/lib/db.ts`:
- **Action Required**: Extend `getScopedPrisma` in `src/lib/db.ts` to intercept `update`, `updateMany`, `delete`, and `deleteMany` on `user`, `team`, `teamMember`, `gameSession`, and `invitation`, injecting `organizationId` into their `where` clauses so that mutations cannot cross tenant boundaries.

### Exact Proposed Fix for `src/lib/db.ts`:
For each tenant-scoped model (`user`, `team`, `gameSession`, `invitation`), add:
```ts
async updateMany({ args, query }) {
  args.where = { ...args.where, organizationId };
  return query(args);
},
async deleteMany({ args, query }) {
  args.where = { ...args.where, organizationId };
  return query(args);
},
async update({ args, query }) {
  // Guard against updating record outside organization
  const existing = await prismaUnscoped.user.findFirst({
    where: { ...args.where, organizationId },
  });
  if (!existing) throw new Error("Record not found or access denied in this organization");
  return query(args);
},
async delete({ args, query }) {
  const existing = await prismaUnscoped.user.findFirst({
    where: { ...args.where, organizationId },
  });
  if (!existing) throw new Error("Record not found or access denied in this organization");
  return query(args);
},
```

---

## 5. Verification Method

To independently verify all findings and test suites:

1. **Run the Full Test Suite**:
   ```powershell
   $env:PATH = "C:\Program Files\nodejs;" + $env:PATH; npm.cmd test
   ```
   *Expected output*: 8 test files passed (8), 76 tests passed (76).
   *Audit output*: Inspect console logs for:
   - `[EMPIRICAL AUDIT] getScopedPrisma write protection results`
   - `[CONCURRENCY AUDIT] Setup racing responses: 1 created (201), 4 conflicts (409)`
   - `[COLLISION AUDIT] Generated 25000 codes: ~280-310 observed collisions (~1.1-1.2%), theoretical expectation ~296 collisions`

2. **Verify Type Safety & Linting**:
   ```powershell
   $env:PATH = "C:\Program Files\nodejs;" + $env:PATH; npm.cmd run typecheck
   $env:PATH = "C:\Program Files\nodejs;" + $env:PATH; npm.cmd run lint
   ```
   *Expected output*: Exit code 0, 0 errors, 0 warnings.

3. **Verify Production Build**:
   ```powershell
   $env:PATH = "C:\Program Files\nodejs;" + $env:PATH; npm.cmd run build
   ```
   *Expected output*: Exit code 0, 18/18 static pages generated successfully.
