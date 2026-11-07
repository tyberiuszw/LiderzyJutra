## 2026-11-06T21:10:04Z
You are Worker M6 (`worker_m6_1`).
Your working directory is: `c:\Users\tyber\teambonding\.agents\teamwork\worker_m6_1\`

Read mandatory files first:
- `c:\Users\tyber\teambonding\.agents\teamwork\ORIGINAL_REQUEST.md`
- `c:\Users\tyber\teambonding\PROJECT.md`
- `c:\Users\tyber\teambonding\IMPLEMENTATION_PLAN.md`

MANDATORY INTEGRITY WARNING:
> DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

CRITICAL INVARIANTS:
1. DO NOT touch or modify `src/components/mascot/chameleonLogoPaths.ts` or replace official paths in `src/components/mascot/ChameleonMascot.tsx` with generic geometry! The official chameleon logo must remain 100% intact.
2. In PowerShell: `$env:PATH = "C:\Program Files\nodejs;" + $env:PATH; & 'C:\Program Files\nodejs\npm.cmd' <args>`.
3. Zero plaintext secrets in git-tracked code.

Your Mission: Finalize Milestone 6 (Verification, Tests & Global Deployment Readiness) so the app can be hosted online for users worldwide:

1. **Lint Cleanup**:
   - In `tests/unit/adversarial-milestone5.test.ts`, remove the unused `beforeEach` import so `npm run lint` exits with 0 errors and 0 warnings.
2. **Global Online Deployment Configuration & Artifacts**:
   - Create `Dockerfile`: Multi-stage production container build (base, dependencies, builder, runner) packaging Node.js, Next.js 15, and Socket.io (`server.ts`) for single-port deployment on Railway, Render, Fly.io, or VPS.
   - Create `.dockerignore`.
   - Create `.env.example`: Document all environment variables (`DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_INITIAL_TEMP_PASSWORD`, `PORT`, `NODE_ENV`, `HOSTNAME`).
   - Create `DEPLOYMENT_RUNBOOK.md` in project root:
     - Clear step-by-step instructions for 1-command cloud hosting:
       a. Cloud Database options: Supabase, Neon, AWS RDS PostgreSQL, or Turso / SQLite LibSQL.
       b. Environment configuration & secret generation.
       c. Prisma migration & seeding (`npx prisma db push` or `prisma migrate deploy`, `npx tsx prisma/seed.ts`).
       d. Docker container build & execution (`docker build -t teambonding .`, `docker run -p 3000:3000 teambonding`).
       e. Production domain & reverse proxy (Nginx, Caddy, Cloudflare WebSocket SSL/TLS support).
3. **Comprehensive Forensic & Automated Verification**:
   - Execute zero-plaintext-password audit: verify no passwords or secrets exist in tracked files.
   - Run full test suite: `npm test` (all tests passing).
   - Run TypeScript typecheck: `npm run typecheck` (0 errors).
   - Run ESLint: `npm run lint` (0 errors, 0 warnings).
   - Run Next.js production build: `npm run build` (successful compilation of all 18 routes).
   - Verify mascot immutability: check `src/components/mascot/chameleonLogoPaths.ts` and `src/components/mascot/ChameleonMascot.tsx`.
4. **Handoff Report**:
   - Write full report to `c:\Users\tyber\teambonding\.agents\teamwork\worker_m6_1\handoff.md`.
   - Send completion message to parent when done.
