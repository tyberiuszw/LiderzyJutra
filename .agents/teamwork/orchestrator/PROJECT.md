# Project: Team bonding Liderzy Jutra - Implementation Plan & Architecture Specification

## Architecture Overview
A full-stack, real-time multiplayer web application dedicated to youth team integration and leadership development, branded with the *Liderzy Jutra* chameleon mascot and design system.

### Tech Stack
- **Frontend Framework**: Next.js 14+ (App Router) with TypeScript, React 18/19
- **Styling & Design System**: Tailwind CSS with CSS Custom Properties dynamic theming engine, Lucide icons, Framer Motion
- **Canvas Rendering**: HTML5 2D Canvas with canonical 1200x900 logical resolution, scanline stack flood fill, and quadratic Bézier curve smoothing
- **Real-Time Multiplayer**: Node.js WebSocket / Socket.io server with binary/JSON micro-batching (25ms), room state machine, and late-join event replay
- **Data Layer & ORM**: PostgreSQL with Prisma ORM (row-level multi-tenant isolation via `organizationId`)
- **Authentication & Security**: Argon2id password hashing, HttpOnly Secure JWT cookies, RBAC, environment-seeded admin bootstrap
- **Internationalization (i18n)**: `next-intl` trilingual support (Polish, English, Ukrainian) with localized game word banks and icebreaker prompt decks

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F01 | Workspace & Tech Stack Setup | Clean Next.js + TS + Tailwind + Prisma project scaffold & tooling specs | M1 | R1, Survey |
| F02 | Visual Identity & Design System | Liderzy Jutra palette, Light/Dark mode tokens, typography (PL/EN/UK) | M1 | R4, Explorer 1 |
| F03 | Parametric Chameleon Mascot | SVG component with 4 recolorable layers & animated states (draw, think, win) | M1 | R4, Explorer 1 |
| F04 | Dynamic UI Theming Engine | CSS custom property injection (--chameleon-primary) with WCAG AA auto-contrast | M1 | R4, Explorer 1 |
| F05 | Multi-Tenant Architecture & Data Models | Prisma schema for Orgs, Teams, Users, GameSessions, Decks, RBAC | M2 | R2, Explorer 3 |
| F06 | Secure Authentication & Admin Seeding | Argon2id auth, HttpOnly cookies, zero plaintext secrets, tyberiusz.wylon bootstrap | M2 | R2, Explorer 3 |
| F07 | Organization & Team Management Dashboard | Admin UI to create orgs, invite members, manage teams & game spaces | M2 | R2, Explorer 3 |
| F08 | Trilingual i18n Architecture | next-intl routing for PL, EN, UK, UI language switcher, fallback handling | M3 | R4, Explorer 3 |
| F09 | Localized Word & Prompt Banks | Dictionaries for drawing (Easy/Med/Hard) and 300+ prompts for icebreakers | M3 | R3, R4, Explorer 3 |
| F10 | Real-Time WebSocket Infrastructure | Socket.io server, room routing, heartbeat ping/pong, reconnect sync | M4 | R3, Explorer 2 |
| F11 | "Rysowanie" Canvas Engine | 1200x900 logical canvas, 26 colors, 4 brush sizes, scanline flood fill, undo/clear | M4 | R3, Explorer 2 |
| F12 | "Rysowanie" Game Loop & State Machine | Word selection (15s), turn timer, letter hints, timer acceleration, podium | M4 | R3, Explorer 2 |
| F13 | "Rysowanie" Guessing, Chat & Scoring | Levenshtein fuzzy match ("is close!"), solvers chat, time-decay scoring | M4 | R3, Explorer 2 |
| F14 | Activity Hub: "Dwie prawdy i kłamstwo" | 3-card submission, secret voting (30s), 3D flip reveal, bluff bonus | M5 | R3, Explorer 3 |
| F15 | Activity Hub: "To czy Tamto" | 12s dilemma voting, split bar graph, chameleon avatar sorting, outlier badge | M5 | R3, Explorer 3 |
| F16 | Activity Hub: "Wspólna Historia" | Circular turn queue, word/sentence modes, twist wildcard, story export | M5 | R3, Explorer 3 |
| F17 | Activity Hub: "Gorące Krzesło" | Tiered 3-level question decks, audience upvoting, pass lifeline | M5 | R3, Explorer 3 |
| F18 | Activity Hub: "Quiz Drużynowy" | Superlative voting, animated podium, downloadable hall of fame | M5 | R3, Explorer 3 |
| F19 | Activity Hub: "Bingo Integracyjne" | Dynamic 4x4/5x5 grid, peer verification workflow, line celebration | M5 | R3, Explorer 3 |
| F20 | Unified Dashboard & Workshop Orchestrator | Persistent room codes, activity switcher carousel, session leaderboard | M5 | R3, Explorer 3 |
| F21 | Execution Steps & Verification Methodology | Phased implementation plan, test coverage, and security audit checklists | M6 | R1, All |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Design System & Chameleon Mascot | F01, F02, F03, F04 | none | PLANNED |
| M2 | Multi-Tenancy, Security & Admin | F05, F06, F07 | M1 | PLANNED |
| M3 | Trilingual i18n & Content Dictionaries | F08, F09 | M1 | PLANNED |
| M4 | "Rysowanie" Real-Time Drawing Game | F10, F11, F12, F13 | M1, M2, M3 | PLANNED |
| M5 | Youth Integration Activity Hub | F14, F15, F16, F17, F18, F19, F20 | M1, M2, M3, M4 | PLANNED |
| M6 | Execution Steps & Delivery Verification | F21 | M1..M5 | PLANNED |

---

## Code Layout
```
c:\Users\tyber\teambonding\
├── .agents/                      # Multi-agent coordination metadata
├── docs/                         # Architecture & design documentation
│   └── IMPLEMENTATION_PLAN.md    # Comprehensive master implementation plan
├── messages/                     # Trilingual i18n message catalogs
│   ├── pl.json                   # Polish UI strings
│   ├── en.json                   # English UI strings
│   ├── uk.json                   # Ukrainian UI strings
│   └── content/                  # Localized game content
│       ├── words.pl.json         # Drawing word bank (PL)
│       ├── words.en.json         # Drawing word bank (EN)
│       ├── words.uk.json         # Drawing word bank (UK)
│       ├── icebreakers.pl.json   # Integration activity prompts (PL)
│       ├── icebreakers.en.json   # Integration activity prompts (EN)
│       └── icebreakers.uk.json   # Integration activity prompts (UK)
├── prisma/
│   ├── schema.prisma             # PostgreSQL schema with multi-tenancy
│   └── seed.ts                   # Idempotent bootstrap script (tyberiusz.wylon)
├── src/
│   ├── app/                      # Next.js App Router with [locale] routing
│   │   ├── [locale]/
│   │   │   ├── (auth)/login/     # Secure login UI
│   │   │   ├── (auth)/setup/     # First-run bootstrap wizard (auto-disabled)
│   │   │   ├── dashboard/        # Multi-org admin & team management
│   │   │   ├── room/[code]/      # Live game room & Activity Hub
│   │   │   └── page.tsx          # Landing page with Liderzy Jutra branding
│   ├── components/
│   │   ├── mascot/               # Parametric SVG Chameleon & animations
│   │   ├── theming/              # Dynamic ThemeProvider & color harmonizer
│   │   ├── canvas/               # HTML5 2D Canvas, flood fill, toolbar
│   │   ├── games/                # Activity Hub game modules (1-6)
│   │   └── ui/                   # Reusable accessible UI components
│   ├── lib/
│   │   ├── auth/                 # Argon2id hashing, JWT, session cookies
│   │   ├── db/                   # Prisma client singleton with tenant scoping
│   │   └── socket/               # Socket.io client hooks & state sync
│   └── server/                   # WebSocket server & game state machine
│       ├── rooms/                # Room manager & circular turn queues
│       ├── games/                # Rysowanie & Icebreaker state machines
│       └── socket-server.ts      # WebSocket entry point with auth handshake
├── IMPLEMENTATION_PLAN.md        # Top-level implementation plan deliverable
└── PROJECT.md                    # Project blueprint & feature inventory
```
