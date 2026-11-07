## 2026-11-06T18:07:30Z
You are Worker 2 for Milestone 2 Iteration 2: Remediations & Hardening in 'Team bonding Liderzy Jutra'.
Your working directory is: `c:\Users\tyber\teambonding\.agents\teamwork\worker_m2_2\`
Your parent conversation ID is: `3f2fbc89-93fd-46ef-bd57-df8c289f5cb2`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY FIRST STEPS:
1. Read `c:\Users\tyber\teambonding\.agents\teamwork\ORIGINAL_REQUEST.md`.
2. Read the defect handoff reports:
   - `c:\Users\tyber\teambonding\.agents\teamwork\challenger_m2_1\handoff.md`
   - `c:\Users\tyber\teambonding\.agents\teamwork\reviewer_m2_2\handoff.md`
   - `c:\Users\tyber\teambonding\.agents\teamwork\challenger_m2_2\handoff.md`
   - `c:\Users\tyber\teambonding\.agents\teamwork\auditor_m2_1\handoff.md`

CRITICAL INSTRUCTIONS:
- Preserve `src/components/mascot/chameleonLogoPaths.ts` and `src/components/mascot/ChameleonMascot.tsx` intact!
- Always prepend `C:\Program Files\nodejs` to `$env:PATH`:
  `$env:PATH = "C:\Program Files\nodejs;" + $env:PATH; & 'C:\Program Files\nodejs\npm.cmd' <args>`

EXACT 4 REMEDIATION TASKS:
1. **Fix Authentication Bypass in `src/lib/auth/password.ts`**:
   - In `verifyPassword`: Validate that `salt` matches `/^[0-9a-fA-F]{32}$/` and `hexKey` matches `/^[0-9a-fA-F]{128}$/` (enforcing exactly 64 derived bytes `KEY_LENGTH = 64`).
   - If `hexKey` or `salt` does not strictly match hex digits or if decoded `expectedKey.length !== KEY_LENGTH`, return `false` immediately.
   - This eliminates the zero-length buffer bypass where `crypto.timingSafeEqual(0 bytes, 0 bytes)` returned `true` for corrupt/whitespace hashes.

2. **Fix Missing JWT Algorithm Pinning in `src/lib/auth/jwt.ts`**:
   - In `verifyAccessToken` and `verifyRefreshToken`: Explicitly pass `{ algorithms: ["HS256"] }` in `jwtVerify`:
     `await jwtVerify(token, getJwtSecret(), { algorithms: ["HS256"] })`.

3. **Fix Invitation Token Concurrency in `src/app/api/auth/register/route.ts`**:
   - In the invitation acceptance branch, guard against concurrent redemptions by doing an atomic conditional update inside the database transaction:
     ```typescript
     const updateResult = await tx.invitation.updateMany({
       where: { id: invite.id, acceptedAt: null },
       data: { acceptedAt: new Date() },
     });
     if (updateResult.count === 0) {
       return NextResponse.json({ error: "Zaproszenie zostało już wykorzystane" }, { status: 410 });
     }
     ```

4. **Fix Write-Operation Scoping Gap in `src/lib/db.ts`**:
   - In `getScopedPrisma(organizationId)`: Add extension hooks for write operations (`updateMany`, `deleteMany`, and `update`, `delete`) across tenant models (`user`, `team`, `teamMember`, `gameSession`, `invitation`, `wordBank`, `questionDeck`):
     - For `updateMany` and `deleteMany`: inject `args.where = { ...args.where, organizationId: orgId }`.
     - For `update` and `delete`: ensure the target record is verified to belong to `organizationId` before mutation, preventing cross-tenant write leakage.

5. **Run Verification Commands**:
   - `$env:PATH = "C:\Program Files\nodejs;" + $env:PATH; & 'C:\Program Files\nodejs\npm.cmd' test`
   - `$env:PATH = "C:\Program Files\nodejs;" + $env:PATH; & 'C:\Program Files\nodejs\npm.cmd' run typecheck`
   - `$env:PATH = "C:\Program Files\nodejs;" + $env:PATH; & 'C:\Program Files\nodejs\npm.cmd' run lint`
   - `$env:PATH = "C:\Program Files\nodejs;" + $env:PATH; & 'C:\Program Files\nodejs\npm.cmd' run build`
   Ensure ALL test files (including `adversarial-password.test.ts`, `adversarial-jwt.test.ts`, `adversarial-multitenancy.test.ts`, `adversarial-seed-idempotency.test.ts`) pass with 100%.

6. Author a complete handoff report in `c:\Users\tyber\teambonding\.agents\teamwork\worker_m2_2\handoff.md`.
7. Send a message to parent (`3f2fbc89-93fd-46ef-bd57-df8c289f5cb2`) when complete.
