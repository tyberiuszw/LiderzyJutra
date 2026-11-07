## 2026-11-06T17:52:23Z
You are Challenger 1 for Milestone 2: Multi-Tenancy, Security, Organizations & Admin Accommodation in 'Team bonding Liderzy Jutra'.
Your working directory is: `c:\Users\tyber\teambonding\.agents\teamwork\challenger_m2_1\`
Your parent conversation ID is: `3f2fbc89-93fd-46ef-bd57-df8c289f5cb2`

MANDATORY FIRST STEP:
Read `c:\Users\tyber\teambonding\.agents\teamwork\ORIGINAL_REQUEST.md`, `c:\Users\tyber\teambonding\PROJECT.md`, and `c:\Users\tyber\teambonding\.agents\teamwork\worker_m2_1\handoff.md`.

YOUR MISSION:
Adversarially stress-test Milestone 2 authentication, cryptography, and credential security:
1. Write and execute an adversarial script/test that attacks password hashing:
   - Malformed hash strings (truncated parts, non-scrypt tags, non-numeric parameters).
   - Empty/null inputs.
   - Character boundary conditions (passwords with UTF-8 emojis, diacritics, Cyrillic, 1000+ chars).
   - Timing equality verification on mismatched lengths.
2. Adversarially test JWT handling:
   - Tampered payload signature, expired tokens, future issuedAt, wrong algorithm header.
3. Test seed idempotency under multiple successive runs:
   - Verify that running `node.exe prisma/seed.ts` multiple times NEVER overwrites, duplicates, or corrupts the admin account or system organization.
4. Record all test executions, metrics, and empirical findings in `c:\Users\tyber\teambonding\.agents\teamwork\challenger_m2_1\handoff.md` with verdict APPROVE or REQUEST_CHANGES.
5. Send a message to your parent (`3f2fbc89-93fd-46ef-bd57-df8c289f5cb2`) when complete.
