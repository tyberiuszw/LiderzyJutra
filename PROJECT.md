# Project Blueprint: Team bonding Liderzy Jutra

## 1. Executive Overview & Mission Architecture
**Team bonding Liderzy Jutra** is a real-time multiplayer web application dedicated to youth team integration, future competencies development, and collaborative leadership. Styled after the visual identity of `liderzyjutra.com`, the platform incorporates the **Liderzy Jutra chameleon mascot** as an interactive character and dynamic theming driver, a full-featured real-time competitive drawing game ("Rysowanie") operating on skribbl.io mechanics, an Activity Hub with six dedicated youth icebreakers, multi-tenant organization management, trilingual internationalization (PL, EN, UK), and OWASP-compliant zero-trust security.

---

## 2. Technology Stack & Architectural Standards

| Architectural Layer | Selected Technology | Version / Specification | Core Responsibility |
|---|---|---|---|
| **Frontend Framework** | **Next.js (App Router)** | 14.2+ / 15.x | Server Components, localized route segments, API route handlers |
| **Language** | **TypeScript** | 5.4+ (Strict Mode) | End-to-end type safety, unified contracts between client and server |
| **Styling & Theming** | **Tailwind CSS** + **CSS Variables** | 3.4+ / 4.x | Utility classes + dynamic `--chameleon-primary` custom properties |
| **Mascot & Motion** | **Inline SVG** + **Framer Motion** | 11.x | Parametric 4-layer vector chameleon with real-time reactive states |
| **Canvas Engine** | **HTML5 2D Canvas API** | W3C Standard | $1200 \times 900$ canonical logical canvas, Bézier smoothing, scanline fill |
| **Real-Time Multiplayer** | **Socket.io / Node.js WebSockets** | 4.7+ | Room routing, heartbeat ping/pong, 25ms micro-batching, state sync |
| **Database & ORM** | **PostgreSQL** + **Prisma ORM** | PG 16+, Prisma 5.15+ | Relational data store with model-aware tenant scoping (`organizationId`) |
| **Authentication & Security** | **Argon2id** (`@node-rs/argon2`) + **jose** | RFC 9106 | $m=64\text{MB}, t=3, p=4$ native hashing, HttpOnly JWT cookies, zero plaintext |
| **Internationalization** | **next-intl** | 3.15+ | App Router routing for Polish (`pl`), English (`en`), and Ukrainian (`uk`) |
| **Primitives & Icons** | **Radix UI** + **Lucide React** | Latest | Unstyled accessible primitives (dialogs, dropdowns, sliders) |

---

## 3. Comprehensive Feature Inventory (F01–F21)

| Feature ID | Feature Name | Description & Technical Requirements | Milestone | Target Deliverables |
|---|---|---|:---:|---|
| **F01** | **Workspace & Tech Stack Setup** | Clean Next.js + TS + Tailwind + Prisma project scaffold & tooling specifications; zero legacy code; strict lint and formatting rules. | **M1** | Project configuration, `package.json`, `tsconfig.json`, `tailwind.config.ts`. |
| **F02** | **Visual Identity & Design System** | Liderzy Jutra palette (Cyber Teal, Indigo, Coral, Emerald, Amber), Light and Dark mode tokens (`globals.css`), typography (Plus Jakarta Sans, JetBrains Mono). | **M1** | `src/styles/globals.css`, color token definition, typography setup. |
| **F03** | **Parametric Chameleon Mascot** | Parametric SVG component (`ChameleonMascot.tsx`) with 4 recolorable layers (`body`, `stripes`, `accent`, `features`) & animated states (idle, drawing, thinking, celebrate, urgent). | **M1** | `src/components/mascot/ChameleonMascot.tsx`, SVG layer definitions. |
| **F04** | **Dynamic UI Theming Engine** | Dynamic CSS custom property injection (`--chameleon-primary`) with direct WCAG AA contrast maximization ($CR_{white} = 1.05/(Y+0.05)$, $CR_{dark} = (Y+0.05)/0.060$, crossover at $Y \le 0.179$, proof $\ge 4.5:1$ across all 6 presets), secondary token `--chameleon-text`, and multiplayer token isolation. | **M1** | `src/components/theming/ThemeProvider.tsx`, contrast calculator utility. |
| **F05** | **Multi-Tenant Architecture & Data Models** | Multi-tenant PostgreSQL schema with Platform -> Org -> Teams -> Game Sessions hierarchy; model-aware Prisma client extension with relational scoping and global asset fallback (`isGlobal: true`). | **M2** | `prisma/schema.prisma`, Prisma client singleton extension (`src/lib/db.ts`). |
| **F06** | **Secure Auth & Admin Seeding** | OWASP Argon2id native password hashing (`@node-rs/argon2`), dual-token JWT cookies (`HttpOnly`), zero plaintext secrets, idempotent seeding of `tyberiusz.wylon@gmail.com` via `SEED_ADMIN_EMAIL`, and `/setup` wizard protected by transactional isolation locks. | **M2** | `src/lib/auth/`, `prisma/seed.ts`, setup route handler, login UI. |
| **F07** | **Org & Team Management Dashboard** | Multi-tenant administration dashboard (`/[locale]/dashboard`) to create organizations, manage teams, invite facilitators, and audit sessions. | **M2** | `src/app/[locale]/dashboard/`, admin tables, invitation modals. |
| **F08** | **Trilingual i18n Architecture** | `next-intl` App Router integration for Polish (`pl`), English (`en`), and Ukrainian (`uk`), language switcher pill, resilient missing-key fallback, and Trilingual Youth Safeguarding Profanity Filter. | **M3** | `src/i18n/`, `messages/pl.json`, `en.json`, `uk.json`, middleware, profanity filter. |
| **F09** | **Localized Word & Prompt Banks** | Categorized word dictionaries for drawing (Easy, Medium, Hard) and 300+ curated integration prompts across all 6 games; Ukrainian Cyrillic phoneme preservation, cross-alphabet homoglyph mapping, and bounded Levenshtein distance ($D_L=1$ for $L \ge 5$). | **M3** | `messages/content/`, fuzzy matcher with homoglyph normalizer. |
| **F10** | **Real-Time WebSocket Infrastructure** | Standalone Socket.io server, token bucket rate limiting (4 msgs / 2s for chat/guesses; 40 stroke packets/s; 200ms fill cooldown), duplicate guess suppression, guest token room pinning, heartbeat ping/pong, late-join event replay. | **M4** | `src/server/socket-server.ts`, room manager, rate limiter, connection lifecycle handlers. |
| **F11** | **"Rysowanie" Canvas Engine** | $1200 \times 900$ canonical HTML5 canvas, responsive viewport container (`max-width: calc(100vh * 4 / 3); max-height: 100%`), coordinate clamping $[0..1199, 0..899]$ with zero-dimension guards, quadratic Bézier smoothing, 26-color palette, 4 brush sizes, scanline flood fill on `Uint32Array` with `Uint8Array` visited bitmask and little-endian ABGR packing. | **M4** | `src/components/canvas/`, canvas hooks, flood fill algorithm module with loop immunity. |
| **F12** | **"Rysowanie" Game Loop & State Machine** | 15s 3-word drafting phase, turn timer, word-length bounded hints schedule $K_{effective} = \min(K, \lfloor (L-1)/2 \rfloor)$, dynamic 30s timer acceleration hint redistribution, turn intermission, and podium. | **M4** | `src/server/games/rysowanie-state.ts`, round scheduler, dynamic hint dispatcher. |
| **F13** | **"Rysowanie" Guessing, Chat & Scoring** | Solvers-only chat masking, Levenshtein "is close!" broadcast, continuous time-decay guesser formula (up to 500 pts, no 49% cliff), drawer formula with zero-division guard (0 pts if $N_{total\_guessers} == 0$). | **M4** | Chat component, guess validator, continuous scoring calculation engine. |
| **F14** | **Activity Hub: "Dwie prawdy i kłamstwo"** | 3-statement card submission, secret voting (30s), 3D flip card reveal (`rotateY(180deg)`), normalized bluff scoring bonus ($S_{bluff} = \text{round}(200 \times N_{fooled} / N_{peers}) \le 200$ pts). | **M5** | `src/components/games/TwoTruths.tsx`, game state machine. |
| **F15** | **Activity Hub: "To czy Tamto"** | Split-screen dilemma voting (12s), real-time animated percentage split, chameleon avatar grouping animation, outlier badge ("Jedyny Wybraniec"). | **M5** | `src/components/games/ThisOrThat.tsx`, animated split bar. |
| **F16** | **Activity Hub: "Wspólna Historia"** | Circular turn queue, word-by-word (6s) and sentence (20s) modes, plot twist wildcards, typewriter final reveal, Markdown/PDF export. | **M5** | `src/components/games/StoryChain.tsx`, story compiler and exporter. |
| **F17** | **Activity Hub: "Gorące Krzesło"** | Tiered 3-level question decks (Fun, Values, Leadership), audience live upvoting queue, psychological safety pass lifeline ("Pas"). | **M5** | `src/components/games/HotSeat.tsx`, question queue manager. |
| **F18** | **Activity Hub: "Quiz Drużynowy"** | Superlative awards voting on peer avatar grid, animated podium countdown, downloadable team hall of fame ("Księga Pamiątkowa"). | **M5** | `src/components/games/QuizSuperlatives.tsx`, podium presenter. |
| **F19** | **Activity Hub: "Bingo Integracyjne"** | Dynamic 4x4/5x5 grid generation from 60+ traits, peer verification modal workflow, line check and fanfare celebration. | **M5** | `src/components/games/HumanBingo.tsx`, verification protocol. |
| **F20** | **Unified Dashboard & Workshop Orchestrator** | Unified activity switcher carousel, persistent 6-character room codes (`LJ-XXXX`), cross-activity aggregated session scoreboard, facilitator controls. | **M5** | `src/app/[locale]/room/[code]/`, workshop control bar, master scoreboard. |
| **F21** | **Execution Steps & Verification Methodology** | Phased milestone deliverables, automated unit/integration/E2E test suites, security penetration audit, zero plaintext credentials validation. | **M6** | Test suites in `tests/`, verification scripts, deployment runbook. |

---

## 4. Milestone Schedule & Dependency Graph

```
[M1: Design System & Chameleon Mascot] ──┬──► [M2: Multi-Tenancy & Security]
                                         │
                                         ├──► [M3: Trilingual i18n & Word Banks]
                                         │            │
                                         ▼            ▼
                             [M4: "Rysowanie" Real-Time Game]
                                         │
                                         ▼
                             [M5: Youth Integration Activity Hub]
                                         │
                                         ▼
                             [M6: Execution & Final Delivery Verification]
```

| Milestone | Scope | Features | Pre-requisites | Status | Target Outcome |
|---|---|---|:---:|:---:|---|
| **M1** | Design System & Chameleon Mascot | F01, F02, F03, F04 | None | **DONE** | Verified design tokens, responsive layout, parametric SVG chameleon, and dynamic theming engine. |
| **M2** | Multi-Tenancy, Security & Admin | F05, F06, F07 | M1 | **DONE** | Full Prisma schema, secure scrypt auth, idempotent seeding of `tyberiusz.wylon`, and tenant admin dashboard. |
| **M3** | Trilingual i18n & Content Dictionaries | F08, F09 | M1 | **DONE** | Complete PL/EN/UK routing, translation key parity, word banks, and diacritic-tolerant fuzzy matcher. |
| **M4** | "Rysowanie" Real-Time Drawing Game | F10, F11, F12, F13 | M1, M2, M3 | **DONE** | 1200x900 canvas, scanline flood fill, 25ms micro-batching, word selection, hints, scoring, and WebSockets. |
| **M5** | Youth Integration Activity Hub | F14, F15, F16, F17, F18, F19, F20 | M1, M2, M3, M4 | **DONE** | All 6 integration games operational in unified workshop carousel with persistent room codes. |
| **M6** | Execution Steps & Delivery Verification | F21 | M1–M5 | **DONE** | Automated test suites passing, OWASP security audit satisfied, zero plaintext secrets verified. |

---

## 5. Standardized Code Layout

```
c:\Users\tyber\teambonding\
├── .agents/                                # Multi-agent coordination metadata
├── docs/                                   # Architectural & design documentation
│   └── IMPLEMENTATION_PLAN.md              # Master Implementation Plan & Blueprint
├── messages/                               # Trilingual i18n translation catalogs
│   ├── pl.json                             # Polish UI catalog
│   ├── en.json                             # English UI catalog
│   ├── uk.json                             # Ukrainian UI catalog
│   └── content/                            # Localized game dictionaries & prompts
│       ├── words.pl.json                   # Drawing game word bank (PL)
│       ├── words.en.json                   # Drawing game word bank (EN)
│       ├── words.uk.json                   # Drawing game word bank (UK)
│       ├── icebreakers.pl.json             # 6 Integration games prompt banks (PL)
│       ├── icebreakers.en.json             # 6 Integration games prompt banks (EN)
│       └── icebreakers.uk.json             # 6 Integration games prompt banks (UK)
├── prisma/
│   ├── schema.prisma                       # PostgreSQL schema with multi-tenancy & games
│   └── seed.ts                             # Idempotent bootstrap script (tyberiusz.wylon)
├── src/
│   ├── app/                                # Next.js App Router with [locale] segments
│   │   ├── [locale]/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/page.tsx          # Secure login UI
│   │   │   │   └── setup/page.tsx          # First-run bootstrap wizard (auto-disabled)
│   │   │   ├── dashboard/page.tsx          # Multi-tenant admin & team management
│   │   │   ├── room/[code]/page.tsx        # Live game room & Activity Hub shell
│   │   │   ├── layout.tsx                  # Root layout with i18n & ThemeProvider
│   │   │   └── page.tsx                    # Landing portal with Liderzy Jutra branding
│   │   └── api/
│   │       ├── auth/                       # Login, refresh, logout, session routes
│   │       ├── orgs/                       # Organization & team CRUD routes
│   │       └── decks/                      # Custom question/word bank upload routes
│   ├── components/
│   │   ├── mascot/                         # Parametric SVG Chameleon & animated states
│   │   │   ├── ChameleonMascot.tsx         # SVG with 4 layers and animation states
│   │   │   └── ChameleonCustomizer.tsx     # Palette presets and color picker
│   │   ├── theming/                        # Dynamic ThemeProvider & contrast calculator
│   │   ├── canvas/                         # HTML5 2D Canvas, flood fill, toolbar
│   │   │   ├── DrawingCanvas.tsx           # Canonical 1200x900 canvas with smoothing
│   │   │   ├── CanvasToolbar.tsx           # 26 swatches, 4 brush sizes, bucket, clear, undo
│   │   │   └── scanline-fill.ts            # Non-recursive Uint32Array flood fill algorithm
│   │   ├── games/                          # Activity Hub game modules (1-6)
│   │   │   ├── TwoTruths.tsx               # Dwie Prawdy i Kłamstwo
│   │   │   ├── ThisOrThat.tsx              # To czy Tamto
│   │   │   ├── StoryChain.tsx              # Wspólna Historia
│   │   │   ├── HotSeat.tsx                 # Gorące Krzesło / Pytania do Lidera
│   │   │   ├── QuizSuperlatives.tsx        # Quiz Drużynowy / Kto w Drużynie...
│   │   │   └── HumanBingo.tsx              # Bingo Integracyjne
│   │   └── ui/                             # Accessible UI primitives (buttons, dialogs, pills)
│   ├── i18n/                               # next-intl configuration & routing utilities
│   ├── lib/
│   │   ├── auth/                           # Argon2id hashing, JWT, cookie helpers
│   │   ├── db/                             # Prisma client singleton with tenant scoping
│   │   └── socket/                         # Socket.io client hooks & state sync
│   └── server/                             # Standalone WebSocket server & state machines
│       ├── rooms/                          # Room manager, player registry, turn queues
│       ├── games/                          # Game state machines (Rysowanie, Icebreakers)
│       └── socket-server.ts                # WebSocket entry point with auth handshake
├── tests/                                  # Automated unit, integration, and E2E tests
│   ├── unit/                               # Hashing, flood fill, fuzzy matching, scoring
│   ├── integration/                        # Multi-tenancy scoping, admin seed, socket auth
│   └── e2e/                                # Playwright multiplayer tests across games
├── IMPLEMENTATION_PLAN.md                  # Master implementation plan deliverable
└── PROJECT.md                              # This authoritative project blueprint
```

---

## 6. Architecture Contracts & Verification Gates

### Contract 1: Zero Plaintext Credentials & Transactional Setup Isolation
- Credentials for `tyberiusz.wylon@gmail.com` must never be stored in plain text anywhere in source code or configuration files.
- Seeding utilizes Argon2id with memory cost $64\text{ MB}$, time cost $3$, and parallelism $4$ via native `@node-rs/argon2`. Target admin email is configurable via `SEED_ADMIN_EMAIL` in `.env`.
- First-run `/setup` wizard user creation is guarded by an atomic database transaction (`prisma.$transaction`) with `SERIALIZABLE` isolation or `SELECT FOR UPDATE` advisory lock, eliminating TOCTOU concurrency race conditions.
- Verification: `Get-ChildItem -Recurse | Select-String -Pattern "tyberiusz.*password"` must return zero plaintext matches.

### Contract 2: Canonical Canvas Geometry, Clamping, Bitmask Loop Immunity & Little-Endian Layout
- Internal logical canvas is strictly $1200 \times 900$ pixels.
- External display container uses CSS `max-width: calc(100vh * 4 / 3); max-height: 100%; aspect-ratio: 4 / 3; width: 100%; margin: 0 auto; touch-action: none;` to prevent vertical viewport scrolling on 16:9 and 21:9 displays.
- Coordinate normalization includes zero-dimension guards (`if (!rect.width || !rect.height) return null`) and explicit boundary clamping: $X = \text{clamp}(0, \text{round}(\dots), 1199)$, $Y = \text{clamp}(0, \text{round}(\dots), 899)$.
- Scanline flood fill on `Uint32Array` allocates a dedicated bitmask per execution (`new Uint8Array(1200 * 900)`) and enforces pre-condition check (`if (colorDistance(seed, fill) <= tolerance) return`), guaranteeing loop termination when $\Delta E \le 32$.
- Pixel memory packing explicitly targets little-endian browser architectures: `(A << 24) | (B << 16) | (G << 8) | R`.

### Contract 3: Dynamic Chameleon Theming & Direct Contrast Maximization
- Theme customizer writes `--chameleon-primary` and related tokens directly to `:root`.
- Contrast color is computed via direct contrast maximization:
  $$CR_{white} = \frac{1.05}{Y + 0.05}, \quad CR_{dark} = \frac{Y + 0.05}{0.060}$$
  Selects `#FFFFFF` if $CR_{white} \ge CR_{dark}$ (which occurs at $Y \le 0.179$), else selects `#0F172A`. All 6 curated presets mathematically achieve $CR \ge 4.5:1$ (WCAG AA).
- A secondary token `--chameleon-text` clamps luminance to $\ge 4.5:1$ against card surfaces in Light Mode.
- Remote multiplayer players' cards use scoped CSS variables (`--player-primary`) to prevent client UI pollution.

### Contract 4: Trilingual Content Parity, Ukrainian Cyrillic Preservation & Homoglyphs
- All UI message keys in `messages/pl.json` must exist identically in `messages/en.json` and `messages/uk.json`.
- Ukrainian Cyrillic characters are non-destructively normalized: distinct phonemes (`і`, `ї`, `є`) are strictly preserved to prevent semantic collisions (e.g. `кіт` vs `кит`); apostrophe variants (U+0027, U+2019, U+02BC, U+0060) are unified; keyboard convenience maps `ґ` $\to$ `г`.
- Cross-alphabet Cyrillic/Latin homoglyph mapping (`а, е, і, о, р, с, х` $\leftrightarrow$ `a, e, i, o, p, c, x`) eliminates typing layout mismatches.
- Near-miss threshold ($D_L = 1$) is restricted to words of length $L \ge 5$ characters to prevent clue leakage on short words.

### Contract 5: Safe Workshop Orchestration & Fair Scoring Balance
- Facilitator can switch active activities via the Activity Carousel within an ongoing session without destroying the WebSocket room, dropping connected participants, or altering persistent room codes.
- In "Dwie prawdy i kłamstwo", the Bluff Bonus is normalized by voting peers: $S_{bluff} = \text{round}(200 \times N_{fooled} / N_{peers})$, capped at 200 pts to preserve cross-activity leaderboard parity across 3 to 30 players.
- In "Rysowanie", guesser scoring scales continuously with elapsed time fraction ($t_{elapsed} / T_{effective}$), eliminating the 49% cliff upon 30s timer acceleration. Drawer score includes a strict zero-division guard ($N_{total\_guessers} == 0 \implies S_{drawer} = 0$).
- Hint count is bounded: $K_{effective} = \min(K, \lfloor (L - 1) / 2 \rfloor)$, with dynamic redistribution across the remaining 30s upon acceleration.

### Contract 6: Model-Aware Multi-Tenant Data Isolation
- Queries are filtered using a model-aware Prisma Client extension (`prisma.$extends`).
- Direct multi-tenant models (`User`, `Team`, `GameSession`) enforce `where: { organizationId: currentOrgId }`.
- Shared catalog models (`WordBank`, `QuestionDeck`) enforce `where: { OR: [{ organizationId: currentOrgId }, { isGlobal: true }] }`.
- Indirect relational models (`DrawingAction`, `ScoreRecord`, `BingoTile`) enforce tenancy via `session: { organizationId: currentOrgId }`; `TeamMember` via `team: { organizationId: currentOrgId }`.
- An unscoped client (`prismaUnscoped`) is provided solely for initial auth lookup and superadmin administration.

### Contract 7: WebSocket Hardening, Rate Limiting & Youth Safeguarding
- Token bucket rate limiter restricts sockets to 4 messages per 2 seconds for `SUBMIT_GUESS` and `CHAT_MESSAGE`.
- Stroke packets are capped at 40 batches/sec (25ms interval, max 500 coordinates); flood fills enforce a 200ms cooldown.
- Duplicate guess suppression silently drops identical guess submissions sent more than twice within a 3-second window.
- Guest tokens are pinned to their room (`socket.data.guest.roomId === roomCode`).
- Real-time trilingual profanity filter (PL, EN, UK) sanitizes chat and guess submissions with `***` or `🦎🦎🦎`, and rejects blacklisted vulgarities in custom word bank/prompt submissions.
