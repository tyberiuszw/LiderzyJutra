# Original User Request

## Parameters
[skip-interview]
How this run was launched; not part of the task.

## Initial Request — 2026-11-06T17:20:36Z

The user has approved the implementation plan (`IMPLEMENTATION_PLAN.md` and `PROJECT.md`) and told us: "zrób jak uważasz chcę aby mogli korzystać z tego inni użytkownicy z czałego świata" — build out the full 'Team bonding Liderzy Jutra' application in `c:\Users\tyber\teambonding` across Milestones 2 through 6 so it works end-to-end local and is ready for global online users.

## Current Workspace State (Preserve & Build Upon!)
- Milestone 1 is already built in `c:\Users\tyber\teambonding` (Next.js 15 App Router, Tailwind v4, `src/lib/theme/contrast.ts`, `src/lib/theme/presets.ts`, `src/components/theme/ThemeProvider.tsx`, `src/components/theme/ThemeControls.tsx`).
- **CRITICAL**: `src/components/mascot/ChameleonMascot.tsx` and `src/components/mascot/chameleonLogoPaths.ts` contain the exact vectorized paths extracted from the user's official Liderzy Jutra chameleon logo (chameleon with headset reaching for the shooting star). **DO NOT overwrite `chameleonLogoPaths.ts` or replace the official logo paths in `ChameleonMascot.tsx` with generic geometry!** Keep the official vectorized logo paths intact everywhere `ChameleonMascot` is used.
- Note on PowerShell in this environment: PowerShell script execution policy blocks `.ps1` wrappers, so always invoke `npm.cmd`, `npx.cmd`, or `node.exe` directly (and ensure `C:\Program Files\nodejs` is on `$env:Path`).
- Note on Database: No local PostgreSQL server is running on this Windows machine. Configure Prisma with SQLite (`file:./dev.db`) for zero-config local execution while keeping the schema & repository layer 100% compatible with PostgreSQL / LibSQL (Turso / Neon / Supabase) for global production deployment, and document one-command cloud deployment in the runbook.

## Requirements & Milestones to Implement Now (M2–M6)
1. **Milestone 2 — Multi-Tenancy, Security, Organizations & Admin Accommodation**:
   - Prisma schema & migrations (`Organization`, `Team`, `User`, `Membership`, `Invitation`, `GameRoom`, `WordBank`, `PromptItem`, etc.) with multi-tenant scoping.
   - Secure password hashing (Argon2id or Node `crypto.scrypt` + timingSafeEqual if native addon build is unavailable) and `HttpOnly` JWT session cookies (`jose`).
   - Accommodate super-admin `tyberiusz.wylon@gmail.com` via `.env` seed variables (`SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD_HASH` / `SEED_ADMIN_INITIAL_TEMP_PASSWORD`) — **NEVER hardcode any plaintext password in source files or git-tracked files**. Also support creating new admin accounts and self-registration/invitations so other youth teams around the world can create their own organizations and add team members.
   - Complete Auth UI (`/login`, `/register`, `/setup`) and Admin & Organization Dashboard (`/dashboard`) where admins create organizations, invite/add team members, promote other admins, and launch game rooms.

2. **Milestone 3 — Trilingual i18n (PL, EN, UK) & Content Banks**:
   - Full trilingual UI switching (`pl`, `en`, `uk`) with complete translation parity across every screen.
   - Rich localized word banks (Easy, Medium, Hard) in Polish, English, and Ukrainian for "Rysowanie".
   - Curated youth integration prompt banks in PL, EN, and UK across all 6 integration modules.
   - Diacritic-tolerant, Ukrainian Cyrillic phoneme-preserving (`і, ї, є`), homoglyph-safe fuzzy guess matcher with Levenshtein "is close!" detection + trilingual youth safeguarding profanity filter.

3. **Milestone 4 — "Rysowanie" (skribbl.io-style Real-Time Multiplayer Drawing Game)**:
   - Custom Node.js HTTP + Socket.io server (or integrated custom server `server.ts` so a single port/process serves both Next.js and Socket.io for easy global deployment and multi-tab/multi-user play).
   - Canonical 1200x900 HTML5 2D Canvas with quadratic Bézier stroke smoothing, 26-color palette, brush sizes, eraser, undo/redo, clear, and non-recursive scanline stack flood fill on `Uint32Array` with `Uint8Array` visited bitmask.
   - Complete skribbl.io turn lifecycle: lobby with shareable room code/link, custom rounds/draw time/custom words, 3-word choice (15s), progressive letter hints ($K_{effective}$), dynamic 30s timer acceleration, solvers-only chat isolation, continuous time-decay scoring, round transitions, and final podium celebration.

4. **Milestone 5 — Youth Integration Activity Hub (6 Multiplayer Modules + Unified Room Orchestrator)**:
   - Inside the dashboard and live game room, allow launching and switching seamlessly between "Rysowanie" and all 6 youth integration activities:
     1. *Dwie prawdy i kłamstwo* (Two Truths & A Lie — statement submission, secret voting, reveal & bluff scores)
     2. *To czy Tamto* (This or That — dilemma voting, live split bar, avatar grouping)
     3. *Wspólna Historia* (Collaborative Story Chain — turn-based sentence/word building + Markdown export)
     4. *Gorące Krzesło* (Hot Seat Q&A — 3 depth tiers, audience question queue & upvoting, pass lifeline)
     5. *Quiz Drużynowy / Kto w Drużynie...* (Team Superlatives — voting on team members, podium reveal)
     6. *Bingo Integracyjne* (Human / Networking Bingo — 4x4 or 5x5 interactive grid, peer confirmation, line detection)

5. **Milestone 6 — Verification, Tests & Global Deployment Readiness**:
   - Comprehensive unit & integration test suites (`npm.cmd test`), zero TypeScript errors (`npm.cmd run typecheck`), clean lint (`npm.cmd run lint`), and passing production build (`npm.cmd run build`).
   - Strict forensic check: zero plaintext passwords anywhere in tracked codebase.
   - Clear deployment configuration & documentation so the app can be hosted online for users worldwide.


## Follow-up — 2026-11-06T19:06:23Z

System notice: the server restarted right as Worker M3 finished implementing Milestone 3 (`i18n-parity.test.ts`, `fuzzy-matcher.test.ts`, `profanity-filter.test.ts`, `I18nProvider.tsx`, `LanguageSwitcher.tsx`, word/prompt banks, etc.). Please resume execution from where you left off: complete the Milestone 3 verification gate, and proceed with Milestone 4 ("Rysowanie" real-time multiplayer drawing game), Milestone 5 (6 youth integration games & unified room orchestrator), and Milestone 6 (final verification & global deployment readiness), preserving `chameleonLogoPaths.ts` and `ChameleonMascot.tsx` intact.
