## 2026-11-06T17:32:36Z
You are Worker 1 for Milestone 2: Multi-Tenancy, Security, Organizations & Admin Accommodation in 'Team bonding Liderzy Jutra'.
Your working directory is: `c:\Users\tyber\teambonding\.agents\teamwork\worker_m2_1\`
Your parent conversation ID is: `3f2fbc89-93fd-46ef-bd57-df8c289f5cb2`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY FIRST STEPS:
1. Read `c:\Users\tyber\teambonding\.agents\teamwork\ORIGINAL_REQUEST.md`.
2. Read `c:\Users\tyber\teambonding\.agents\teamwork\explorer_m2_1\handoff.md` (authoritative technical blueprint and implementation guide).
3. Read `c:\Users\tyber\teambonding\PROJECT.md`.

CRITICAL INSTRUCTIONS & CONSTRAINTS:
- DO NOT overwrite or alter `src/components/mascot/chameleonLogoPaths.ts` or replace official logo paths in `src/components/mascot/ChameleonMascot.tsx`! Preserve the official vectorized Liderzy Jutra logo paths.
- Windows PowerShell environment requirement: Always prepend `C:\Program Files\nodejs` to `$env:PATH`:
  `$env:PATH = "C:\Program Files\nodejs;" + $env:PATH; & 'C:\Program Files\nodejs\npm.cmd' <args>` or `npx.cmd` / `node.exe`.
- NEVER hardcode plaintext passwords in code, seed files, or git-tracked files. Superadmin `tyberiusz.wylon@gmail.com` must be accommodated securely via `.env` seed variables (`SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD_HASH` / `SEED_ADMIN_INITIAL_TEMP_PASSWORD`) or random one-time token.

YOUR SCOPE OF WORK:
1. Install dependencies:
   `$env:PATH = "C:\Program Files\nodejs;" + $env:PATH; & 'C:\Program Files\nodejs\npm.cmd' install prisma @prisma/client jose`
2. Create `.env` and `.env.example`:
   Set `DATABASE_URL="file:./dev.db"`, `JWT_SECRET`, `SEED_ADMIN_EMAIL="tyberiusz.wylon@gmail.com"`, etc. Ensure `.env` is in `.gitignore` if not already.
3. Create `prisma/schema.prisma` per the blueprint in `explorer_m2_1/handoff.md § 4.1`.
4. Generate Prisma Client and initialize SQLite database:
   `$env:PATH = "C:\Program Files\nodejs;" + $env:PATH; & 'C:\Program Files\nodejs\npx.cmd' prisma generate`
   `$env:PATH = "C:\Program Files\nodejs;" + $env:PATH; & 'C:\Program Files\nodejs\npx.cmd' prisma db push`
5. Implement auth and database libraries:
   - `src/lib/auth/password.ts`: Node built-in `crypto.scrypt` + `crypto.randomBytes` + `crypto.timingSafeEqual` constant-time verification.
   - `src/lib/auth/jwt.ts`: `jose` based signing and verification.
   - `src/lib/auth/session.ts`: `HttpOnly` cookie helpers (`cookies()` awaited for Next 15).
   - `src/lib/db.ts`: Prisma client singleton with model-aware tenant scoping (`getScopedPrisma`) and `prismaUnscoped`.
   - `src/types/auth.ts`: Strict types and interfaces.
6. Implement `prisma/seed.ts` per `explorer_m2_1/handoff.md § 4.2` and execute it:
   `$env:PATH = "C:\Program Files\nodejs;" + $env:PATH; node.exe prisma/seed.ts`
   Verify it creates superadmin `tyberiusz.wylon@gmail.com` cleanly, and test that running it a second time is idempotent.
7. Implement API route handlers:
   - `src/app/api/auth/setup/route.ts` (with atomic transaction locking on `SystemConfig`)
   - `src/app/api/auth/login/route.ts`
   - `src/app/api/auth/register/route.ts` (supporting both new org creation and invitation token acceptance)
   - `src/app/api/auth/logout/route.ts`
   - `src/app/api/auth/me/route.ts`
   - `src/app/api/orgs/route.ts`
   - `src/app/api/teams/route.ts`
   - `src/app/api/invitations/route.ts`
8. Implement App Router UI pages:
   - `src/app/(auth)/login/page.tsx` (incorporates `ChameleonMascot`, input fields, login action)
   - `src/app/(auth)/register/page.tsx` (org registration or join via invite, chameleon preset picker)
   - `src/app/(auth)/setup/page.tsx` (first-run setup wizard)
   - `src/app/dashboard/page.tsx` (comprehensive admin & organization dashboard: Overview, Teams, Members/Invites, Game Rooms launcher with 6-character room code `LJ-XXXX`, Personalization)
   - Also update landing page or navigation if appropriate so users can navigate to `/login`, `/register`, or `/dashboard`.
9. Author automated unit and integration tests:
   - `tests/unit/password.test.ts`: Hashing, verification, incorrect password rejection, invalid format rejection, timing-safe equality.
   - `tests/unit/jwt.test.ts`: Token signing, payload validation, expiration, invalid token rejection.
   - `tests/integration/auth-multitenancy.test.ts`: Integration test for user registration, login, tenant isolation, and idempotent seed.
10. Run tests, typecheck, and lint:
   - `$env:PATH = "C:\Program Files\nodejs;" + $env:PATH; & 'C:\Program Files\nodejs\npm.cmd' test`
   - `$env:PATH = "C:\Program Files\nodejs;" + $env:PATH; & 'C:\Program Files\nodejs\npm.cmd' run typecheck`
   - `$env:PATH = "C:\Program Files\nodejs;" + $env:PATH; & 'C:\Program Files\nodejs\npm.cmd' run lint`
   Ensure 100% of tests pass and zero TypeScript errors exist.
11. Write a complete handoff report to `c:\Users\tyber\teambonding\.agents\teamwork\worker_m2_1\handoff.md`.
12. Send a message to your parent (`3f2fbc89-93fd-46ef-bd57-df8c289f5cb2`) when complete.
