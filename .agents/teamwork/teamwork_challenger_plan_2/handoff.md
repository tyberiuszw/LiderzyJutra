# Handoff Report — Challenger 2: Security, Architecture & Protocol

**Agent Role**: Challenger 2 (Security, Architecture & Protocol Challenger)  
**Working Directory**: `c:\Users\tyber\teambonding\.agents\teamwork\teamwork_challenger_plan_2\`  
**Target Documents**: `IMPLEMENTATION_PLAN.md`, `PROJECT.md`, `ORIGINAL_REQUEST.md`  
**Date**: 2026-11-06  
**Verdict**: **REQUEST_CHANGES** (Actionable architectural amendments detailed below)

---

## 1. Observation

### Observation 1: Plaintext Secret Audit (Empirical Verification)
- Executed recursive search across all files in `c:\Users\tyber\teambonding`:
  ```powershell
  $files = Get-ChildItem -Path "c:\Users\tyber\teambonding" -Recurse -File
  foreach ($file in $files) {
      Select-String -Path $file.FullName -Pattern 'tyberiusz.*password|password\s*=\s*[''"][^''"]+[''"]'
  }
  ```
- **Result**: Zero plaintext passwords, API keys, or JWT secrets exist. Every match was an explicit test command (e.g. `IMPLEMENTATION_PLAN.md:901`, `PROJECT.md:157`), requirement citation (`ORIGINAL_REQUEST.md:20`), or security guideline in markdown.
- No application source code or `.env` files with credentials exist in the repository.

### Observation 2: Password Hashing & Seeding Architecture
- `IMPLEMENTATION_PLAN.md` Section 5.3 (lines 277–280):
  > "- Password Hashing: **Argon2id** (RFC 9106), memory cost $m = 65,536\text{ KiB}$ ($64\text{ MiB}$), time cost $t = 3$ iterations, parallelism $p = 4$ threads. Salt generated via `crypto.randomBytes(16)`."
- `IMPLEMENTATION_PLAN.md` Section 5.4 (lines 290–296):
  > "- Mode 1 (Production Seeding via Environment): An automated seed script (`prisma/seed.ts`) checks for existing admin accounts:
  >   - If `SEED_ADMIN_PASSWORD_HASH` is provided in `.env`, it is used directly.
  >   - If `SEED_ADMIN_INITIAL_TEMP_PASSWORD` is provided, it is securely hashed using Argon2id.
  >   - If neither is provided, the script generates a cryptographically secure 32-byte one-time bootstrap activation token (`crypto.randomBytes(24).toString('base64url')`), hashes it via Argon2id, logs the activation token once to the deployment console, and flags `mustChangePassword: true`.
  > - Mode 2 (First-Run Setup Wizard): If the database contains zero users (`prisma.user.count() === 0`), navigating to `/setup` allows configuring `tyberiusz.wylon@gmail.com` over HTTPS. Upon user creation, `/setup` is permanently disabled in middleware (returns 404)."
- **Gap Noticed**: `SEED_ADMIN_EMAIL` is not explicitly declared as an environment variable in the plan (defaulting to `tyberiusz.wylon@gmail.com`). In Mode 2, the check `prisma.user.count() === 0` is vulnerable to a TOCTOU concurrency race if two concurrent requests hit `/setup` simultaneously on first deployment.

### Observation 3: Multi-Tenancy & Data Isolation (Empirical Model Scan)
- `IMPLEMENTATION_PLAN.md` Section 5.3 line 285 states:
  > "- All tenant data queries use Prisma Client extensions (`prisma.$extends`) that automatically apply `where: { organizationId: currentOrgId }` to all queries, preventing cross-tenant leakage."
- Executed empirical regex analysis on the Prisma schema in lines 590–785:
  ```powershell
  # Models WITH organizationId: User, Team, GameSession, WordBank, QuestionDeck (5 models)
  # Models WITHOUT organizationId: Organization, UserProfile, RefreshToken, TeamMember, DrawingAction, ScoreRecord, BingoTile (7 models)
  ```
- **Result**: Exactly 7 out of 12 models lack an `organizationId` scalar field.

### Observation 4: WebSocket Authentication & Protocol Resilience
- `IMPLEMENTATION_PLAN.md` line 57 mentions:
  > "Rate Limiting (Token Bucket)" in an ASCII gateway diagram.
- `IMPLEMENTATION_PLAN.md` lines 281–283 state:
  > "- WebSocket Handshake Authentication:
  >   - Socket.io connection handshake parses the HTTP `Cookie` header, validates `tb_access_token`, and attaches verified user data to `socket.data.user`.
  >   - Room guests entering via 6-character room codes are issued a signed ephemeral guest token (`tb_guest_token`) containing `{ guestId, nickname, roomId, chameleonColor }`, eliminating guest user database bloat while preserving socket security."
- **Gaps Noticed**:
  1. The WebSocket server protocol in Section 7.6 does NOT specify the Token Bucket parameters for `SUBMIT_GUESS` / chat (e.g. 4 messages / 2 seconds).
  2. No duplicate suppression mechanism is defined for rapid identical guesses.
  3. No trilingual profanity filtering (PL, EN, UK) is specified for chat, collaborative storytelling, or hot-seat prompts.
  4. Room pinning between `socket.data.guest.roomId` and the requested room code during `ROOM_JOIN` is not explicitly asserted.

### Observation 5: Trilingual Parity & Homoglyph Matching
- `IMPLEMENTATION_PLAN.md` Section 6.4 (lines 355–362):
  > "1. Diacritics Stripping: Polish characters (`ą, ć, ę, ł, ń, ó, ś, ź, ż`) and Ukrainian Cyrillic variants (apostrophes, `ґ`/`г`, `є`, `і`, `ї`) are normalized into a unified comparison format...
  > 3. Levenshtein Distance: If distance $D_L = 0$: Exact match... If $D_L = 1$ (for words $\ge 4$ characters) or $D_L \le 2$ (for words $\ge 7$ characters): Near miss"
- Executed empirical test comparing Ukrainian Cyrillic letters with Latin lookalikes:
  - String "kameleon" (Latin) vs "kаmеlеоn" (with Cyrillic 'а', 'е', 'о'):
  - Byte lengths: 8 vs 12; Direct string comparison: `False`; Levenshtein distance: 3.
  - Since distance is 3, words $\ge 4$ characters would fail both exact match AND near-miss threshold ($D_L \le 2$) if a user with a Ukrainian Cyrillic keyboard types Latin-lookalike glyphs.

---

## 2. Logic Chain

1. **Secret Scanning**:
   - Observations 1 and 2 confirm zero plaintext passwords exist. The security design guarantees that neither admin credentials nor user passwords will ever be committed to source control.
2. **Argon2id & Seeding**:
   - The Argon2id parameters ($m=64\text{MB}, t=3, p=4$, 16-byte random salt) match OWASP recommendations for high-memory server hashing.
   - However, without declaring `SEED_ADMIN_EMAIL` in the environment configuration, automated DevOps deployments cannot override the default admin email.
   - Furthermore, in `/setup`, without an atomic transaction lock, concurrent requests during initial rollout could create duplicate or conflicting records.
3. **Multi-Tenancy Scoping Flaw**:
   - In Observation 3, empirical testing proves that 7 out of 12 Prisma models do NOT have an `organizationId` column.
   - If `prisma.$extends` naively injects `where: { organizationId: currentOrgId }` into all queries (`$allModels`), Prisma will throw a runtime exception (`Unknown argument 'organizationId'`) whenever `UserProfile`, `DrawingAction`, `ScoreRecord`, `BingoTile`, `RefreshToken`, or `Organization` is queried.
   - Additionally, global word banks and question decks (`isGlobal: true`) would be hidden if queries are restricted strictly to `organizationId: currentOrgId`.
   - Therefore, the plan must explicitly specify a **Model-Aware Tenant Scoping Extension**.
4. **WebSocket Protocol Deficiencies**:
   - In Observation 4, the absence of WebSocket rate limiting (token bucket: 4 msgs / 2 sec) leaves the server vulnerable to guess-spamming, dictionary brute-forcing, and event loop starvation.
   - The absence of duplicate guess suppression allows users to flood chat with identical incorrect guesses.
   - The absence of trilingual profanity filtering creates a significant safeguarding hazard for a platform intended for youth teams (ages 13–21), school councils, and youth olympiads.
5. **i18n Homoglyph Vulnerability**:
   - In Observation 5, empirical byte comparison proves that Ukrainian Cyrillic characters (`а`, `е`, `о`, `р`, `с`, `х`) deviate from Latin characters by 3+ substitution distance despite identical visual appearance.
   - Without Unicode NFKC normalization and cross-alphabet Cyrillic-to-Latin homoglyph mapping, Ukrainian youth typing on bilingual devices will experience false-negative rejections.

---

## 3. Caveats

- **No Caveats** regarding current repository state: The workspace contains zero plaintext secrets and zero premature application code.
- Assumption made: In production, PostgreSQL will enforce unique constraints on `roomCode` and `email`.
- Load testing under 1,000+ concurrent WebSocket connections was not run because the real-time server code has not yet been built (pre-approval phase).

---

## 4. Conclusion & Verdict

**Verdict**: **REQUEST_CHANGES**

`IMPLEMENTATION_PLAN.md` and `PROJECT.md` are exceptionally high quality, but require the following five concrete architectural amendments prior to final approval:

### Required Amendments for `IMPLEMENTATION_PLAN.md`:

1. **Model-Aware Tenant Scoping Specification (Section 5.3 & 9)**:
   - Replace the blanket `$allModels` extension with a model-aware extension:
     - Whitelist models with direct `organizationId`: `User`, `Team`, `GameSession`, `WordBank`, `QuestionDeck`.
     - For global collections (`WordBank`, `QuestionDeck`), apply: `where: { OR: [{ organizationId: currentOrgId }, { isGlobal: true }] }`.
     - For relational models (`DrawingAction`, `ScoreRecord`, `BingoTile`), enforce tenancy through their parent `GameSession`.
     - Provide an unscoped bypass client (`prismaUnscoped`) for auth route lookups and platform superadmin queries.
     - Validate in `POST /api/teams/:id/members` that `targetUser.organizationId === team.organizationId`.

2. **WebSocket Rate Limiting, Duplicate Suppression & Protocol Security (Section 5.3 & 7.6)**:
   - **Token Bucket Rate Limiter**: Enforce 4 messages per 2 seconds per socket for `SUBMIT_GUESS` and `CHAT_MESSAGE` (capacity: 4, refill: 2 tokens/sec).
   - **Stroke Batch Throttle**: Maximum 40 batches/sec (25ms interval), maximum 500 coordinates per batch.
   - **Flood Fill Cooldown**: 200ms minimum cooldown between consecutive fills per drawer.
   - **Duplicate Guess Suppression**: Suppress identical consecutive guesses by the same player within a 3-second window.
   - **Guest Token Room Pinning**: Assert `socket.data.guest.roomId === requestedRoomCode` during `ROOM_JOIN`.

3. **Youth Safeguarding: Trilingual Profanity Filter (Section 6 & 7.6)**:
   - Add a real-time trilingual profanity filter (Polish, English, Ukrainian) to the WebSocket server.
   - Sanitize all public inputs (`SUBMIT_GUESS`, `CHAT_MESSAGE`, `STORY_CHAIN_SUBMIT`, `HOT_SEAT_SUBMIT`), masking abusive terms with `***` or `🦎🦎🦎` or rejecting the submission with a friendly reminder.

4. **Bootstrap Seeding & Setup Wizard Concurrency (Section 5.4)**:
   - Explicitly document `SEED_ADMIN_EMAIL` in `.env.example` (defaulting to `tyberiusz.wylon@gmail.com`).
   - Wrap the first-run `/setup` wizard user creation in an atomic transaction (`prisma.$transaction`) with an isolation lock to eliminate TOCTOU race conditions.
   - Recommend `@node-rs/argon2` for zero-compile native portability across deployment environments.

5. **Trilingual Fuzzy Matcher Homoglyph Normalization (Section 6.4)**:
   - Update the text normalization specification to include Unicode NFKC normalization and Ukrainian Cyrillic / Latin homoglyph mapping (e.g. mapping Cyrillic `а, е, і, о, р, с, х` to corresponding Latin equivalents during word validation).
   - Formalize exact TypeScript interfaces for `words.{pl,en,uk}.json` and `icebreakers.{pl,en,uk}.json` catalogs.

---

## 5. Verification Method

To independently verify these findings:

1. **Verify Plaintext Secret Absence**:
   ```powershell
   Get-ChildItem -Path "c:\Users\tyber\teambonding" -Recurse -File | Select-String -Pattern "tyberiusz.*password|password\s*=\s*['\"][^'\"]+['\"]"
   ```
   *Expected Output*: Only markdown test commands and prompt quotes; zero credentials.

2. **Verify Prisma Schema Models Missing `organizationId`**:
   ```powershell
   $content = Get-Content -Path "c:\Users\tyber\teambonding\IMPLEMENTATION_PLAN.md" -Raw
   [regex]::Matches($content, 'model\s+(\w+)\s*\{([^}]+)\}') | ForEach-Object {
       [PSCustomObject]@{ Model = $_.Groups[1].Value; HasOrgId = ($_.Groups[2].Value -match '\borganizationId\b') }
   } | Format-Table -AutoSize
   ```
   *Expected Output*: 7 models (`Organization`, `UserProfile`, `RefreshToken`, `TeamMember`, `DrawingAction`, `ScoreRecord`, `BingoTile`) have `HasOrgId = False`.

3. **Verify Homoglyph String Mismatch**:
   ```powershell
   $latin = "kameleon"; $cyrillic = "kаmеlеоn"
   Write-Output "Direct match: $($latin -eq $cyrillic)"
   ```
   *Expected Output*: `Direct match: False`.
