# Team bonding Liderzy Jutra — Master Implementation Plan & Technical Blueprint

**Project Title:** Team bonding Liderzy Jutra  
**Target Environment:** `c:\Users\tyber\teambonding`  
**Document Version:** 1.0.0 (Master Architectural Plan)  
**Date:** 2026-11-06  
**Status:** AWAITING PLAN APPROVAL (Zero application code modified prior to review)  

---

## 1. Executive Summary & Project Purpose

### 1.1 Foundation Mission & Context
*Liderzy Jutra* (`liderzyjutra.com` / `liderzyjutra.org`) is an educational non-profit initiative and leadership foundation initiated by **Tyberiusz Wylon** (youth speaker, TEDx Youth presenter, civic activist) originating from Bielsko-Biała, initially launched within the *Zwolnieni z Teorii* national olympiad framework. The organization's mission is to empower youth (grades 7–8 of primary schools, secondary/high schools, and early university students, ages ~13–21) with **competencies of the future** (*kompetencje przyszłości*), artificial intelligence (AI) literacy, public speaking, democratic engagement, and adaptive leadership.

With educational partnerships encompassing academic institutions (Uniwersytet Bielsko-Bialski - UBB), technology festivals (BBDays4.IT), Google for Education programs, and school councils (*samorządy uczniowskie*), Liderzy Jutra operates at the intersection of modern technology and youth leadership.

### 1.2 The Platform Objective
The **Team bonding Liderzy Jutra** web application is an interactive digital team bonding and icebreaking suite engineered specifically for youth leadership teams, hackathon squads, civic project groups, and classroom councils. The platform combines:
1. **Real-time competitive drawing gameplay ("Rysowanie")** faithfully implementing the mechanics of skribbl.io (word drafting, real-time stroke streaming, scanline stack flood fill, Levenshtein fuzzy matching, and dynamic time-decay scoring).
2. **A dedicated Youth Integration Activity Hub** featuring six psychologically safe, high-engagement multiplayer games (*Dwie prawdy i kłamstwo*, *To czy Tamto*, *Wspólna Historia*, *Gorące Krzesło / Pytania do Lidera*, *Quiz Drużynowy*, and *Bingo Integracyjne*).
3. **Parametric Chameleon Mascot Branding & Dynamic Theming Engine** honoring the Liderzy Jutra chameleon—the mascot of adaptability, multi-directional vision, and individuality—where user-customized colors propagate dynamically across the UI via CSS custom properties with WCAG AA auto-contrast.
4. **Enterprise-Grade Multi-Tenancy & Zero-Trust Security** with platform-wide isolation, role-based access control (RBAC), OWASP-compliant Argon2id password hashing, HttpOnly session cookies, and secure bootstrapping for administrator `tyberiusz.wylon@gmail.com` with strict prohibition of plaintext secrets.
5. **Native Trilingual Support (Polish, English, Ukrainian)** ensuring inclusive engagement for multicultural youth teams across Poland and international youth exchanges.

---

## 2. Tech Stack & System Architecture

### 2.1 Core Technology Selection Matrix

| Layer | Selected Technology | Version / Spec | Justification & Architectural Role |
|---|---|---|---|
| **Web Framework** | **Next.js (App Router)** | 14.2+ / 15.x | High-performance React framework with React Server Components (RSC), optimized route segment layouts, built-in internationalized routing, and native API routes. |
| **Language** | **TypeScript** | 5.4+ (Strict) | End-to-end type safety, unified domain interfaces shared between client and WebSocket server, zero runtime `any` tolerance. |
| **Styling & Design Tokens** | **Tailwind CSS** + **CSS Custom Properties** | 3.4+ / 4.x | Utility-first styling combined with dynamic runtime CSS variables (`--chameleon-primary`, `--surface-card`) for zero-recompile runtime chameleon theming. |
| **Mascot & Motion** | **Inline SVG** + **Framer Motion** | 11.x | Parametric vector chameleon with animatable sub-layers (`body`, `crest`, `belly`, `eyes`), and lightweight physics springs for UI transitions. |
| **Canvas Engine** | **HTML5 2D Canvas API** | W3C Standard | Immediate-mode rendering with canonical $1200 \times 900$ internal logical coordinates, sub-pixel quadratic Bézier smoothing, and raw typed array manipulation (`Uint32Array`). |
| **Real-Time Multiplayer** | **Socket.io / Node.js WebSockets** | 4.7+ | Dual transport (WebSocket with HTTP long-polling fallback), automatic reconnection, room namespacing, and binary/JSON stroke micro-batching. |
| **Database & ORM** | **PostgreSQL** + **Prisma ORM** | PG 16+, Prisma 5.15+ | Relational integrity, foreign key cascades, type-safe migrations, and Prisma Client extensions for automatic multi-tenant row-level query filtering (`organizationId`). |
| **Authentication & Crypto** | **Argon2id** (`argon2`) + **jose** | RFC 9106, OWASP | Gold-standard memory-hard password hashing ($m=64\text{MB}, t=3, p=4$), short-lived JWT access tokens in `HttpOnly` `Secure` cookies, and rotating refresh tokens. |
| **Internationalization (i18n)** | **next-intl** | 3.15+ | Server-side and client-side message compilation for Polish (`pl`), English (`en`), and Ukrainian (`uk`), with ICU message formatting and zero bundle bloat. |
| **Icons & UI Primitives** | **Lucide React** + **Radix UI Primitives** | Latest | Accessible, unstyled accessible UI foundations (dialogs, dropdowns, tooltips, sliders) with clean minimalist line iconography. |

### 2.2 System Topology & Network Architecture

```
                                  [ Client Browser ]
                     (Mobile / Tablet / Chromebook / Desktop)
                                     │         ▲
                      HTTPS (Next.js)│         │ WebSocket (Socket.io)
                                     ▼         │
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 APPLICATION GATEWAY                                    │
│                              (Next.js Middleware & WAF)                                │
│       • Locale Detection (PL/EN/UK)              • Security Headers & CSP             │
│       • JWT Cookie Validation (HttpOnly)         • Rate Limiting (Token Bucket)        │
└──────────────────────────┬─────────────────────────────────┬───────────────────────────┘
                           │                                 │
                           ▼                                 ▼
┌───────────────────────────────────────────────┐ ┌──────────────────────────────────────┐
│           NEXT.JS APP ROUTER ENGINE           │ │      STANDALONE REAL-TIME SERVER     │
│                 (Port 3000)                   │ │              (Port 3001)             │
│                                               │ │                                      │
│  • /[locale]/landing (Branded Portal)         │ │  • WebSocket Handshake Auth (Cookie) │
│  • /[locale]/dashboard (Org & Teams Admin)    │ │  • Room State Machine Manager        │
│  • /[locale]/room/[code] (Live Game Shell)    │ │  • "Rysowanie" Drawing Engine        │
│  • /api/auth/* (Argon2id Login, Refresh, Out) │ │    - Micro-batching (25ms)           │
│  • /api/orgs/* (Multi-tenant Admin CRUD)      │ │    - Scanline Stack Flood Fill       │
│  • /api/decks/* (Custom Content Banks)        │ │    - Levenshtein Fuzzy Matcher       │
│                                               │ │  • Activity Hub Dispatcher           │
│                                               │ │    - 6 Integration Game Loops        │
└───────────────────────┬───────────────────────┘ └──────────────────┬───────────────────┘
                        │                                            │
                        │   Prisma ORM Client ($extends TenantScope) │
                        ▼                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               POSTGRESQL RELATIONAL STORE                              │
│                                                                                        │
│   • Organizations (Tenant Root)      • Teams & Memberships      • Users & Credentials  │
│   • GameSessions & State Audits      • WordBanks & Prompts      • Scores & Superlatives│
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Visual Identity & Design System

### 3.1 Liderzy Jutra Visual Language
The design system of **Team bonding Liderzy Jutra** captures the youthful, forward-looking ethos of the foundation: vibrant, energetic, clean, and accessible. It strictly avoids both childish cartoonishness and sterile corporate bureaucracy, providing an intellectually credible, inspiring space for future leaders.

### 3.2 Color Tokens & Mathematical Palette

#### A. Core Brand Accents

| Token Identifier | Color Name | Hex Code | HSL Value | Symbolic Role & Usage |
|---|---|---|---|---|
| `--color-brand-cyan` | **Electric Cyan / Future Teal** | `#06B6D4` | `hsl(189, 94%, 43%)` | Primary brand accent; represents technology, clarity, and future orientation. |
| `--color-brand-indigo`| **Dynamic Indigo / Ultramarine** | `#4F46E5` | `hsl(243, 75%, 59%)` | Deep brand anchor; represents leadership, trust, and depth of thought. |
| `--color-accent-coral`| **Radiant Coral / Sunset** | `#FF6B4A` | `hsl(11, 100%, 65%)` | Energy accent; represents youth enthusiasm, game action, and urgent alerts. |
| `--color-accent-green`| **Chameleon Emerald** | `#10B981` | `hsl(160, 84%, 39%)` | Growth accent; represents adaptation, successful guesses, and team harmony. |
| `--color-accent-gold` | **Sun Gold / Amber** | `#F59E0B` | `hsl(38, 92%, 50%)` | Achievement; represents points, badges, trophies, and podium crowns. |

#### B. Surface & Neutral Design Tokens

```css
/* Light Mode Semantic Tokens */
:root[data-theme="light"], :root {
  --page-bg: #F8FAFC;              /* Slate 50: Clean, bright background */
  --surface-card: #FFFFFF;         /* Pure white container cards */
  --surface-secondary: #F1F5F9;    /* Slate 100: Toolbars, inactive pills */
  --surface-hover: #E2E8F0;        /* Slate 200: Interactive hover states */
  --border-subtle: #E2E8F0;        /* Slate 200: Dividers, card borders */
  --border-strong: #CBD5E1;        /* Slate 300: Inputs, active tool borders */
  --text-primary: #0F172A;         /* Slate 900: High-contrast body & titles (14.2:1) */
  --text-secondary: #475569;       /* Slate 600: Captions, subtitles, hints */
  --text-muted: #94A3B8;           /* Slate 400: Placeholders, disabled states */
  --shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.04);
  --shadow-lg: 0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.03);
}

/* Dark Mode Semantic Tokens */
:root[data-theme="dark"] {
  --page-bg: #0B0F19;              /* Deep Obsidian: Midnight blue-black canvas */
  --surface-card: #151D2F;         /* Midnight Slate: Elevated cards with soft glow */
  --surface-secondary: #1E293B;    /* Slate 800: Toolbars, chat backdrops */
  --surface-hover: #28354D;        /* Elevated hover fill */
  --border-subtle: #1E293B;        /* Slate 800: Structural borders */
  --border-strong: #334155;        /* Slate 700: Focus rings, active cards */
  --text-primary: #F8FAFC;         /* Slate 50: Crisp white legibility (15.5:1) */
  --text-secondary: #94A3B8;       /* Slate 400: Metadata, inactive player names */
  --text-muted: #64748B;           /* Slate 500: Timestamps, subtle indicators */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4);
  --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.5);
  --shadow-lg: 0 12px 24px rgba(0, 0, 0, 0.6);
}
```

### 3.3 Typography Stack & Glyphs
1. **Primary Interface Font**: `Plus Jakarta Sans` (Google Fonts / `@fontsource/plus-jakarta-sans`, weights: 400 Regular, 500 Medium, 600 SemiBold, 700 Bold).
   - *Rationale*: Open geometric counters, high x-height for readability on mobile screens, native Unicode support for Polish Latin diacritics (`ą, ć, ę, ł, ń, ó, ś, ź, ż`) and Ukrainian Cyrillic (`і, ї, є, ґ`).
2. **Numerical & Timer Font**: `JetBrains Mono` (weights: 500 Medium, 700 Bold) with `font-variant-numeric: tabular-nums`.
   - *Rationale*: Monospaced digits prevent visual layout jitter during high-speed turn countdowns and live scoreboard point increments.

---

## 4. Parametric Chameleon Mascot & Dynamic Theming Engine

### 4.1 Anatomical Vector Layering (SVG Component)
The Liderzy Jutra chameleon mascot is engineered as a clean, parametric React component (`src/components/mascot/ChameleonMascot.tsx`) rendered purely in scalable vector graphics (SVG) with zero external bitmap dependencies:

```
                      [ Dorsal Crest & Flank Stripes ]
                       fill="var(--chameleon-secondary)"
                                    │
    [ 360° Rotating Eyes ]          │            [ Prehensile Curled Tail ]
     Iris & White Highlights        │            fill="var(--chameleon-primary)"
              │                     │                           │
              ▼                     ▼                           ▼
        (O)───────(O)       /\  /\  /\  /\                   ╭─────╮
       (  ◕   ‿   ◕  )─────/  \/  \/  \/  \─────────────────╯      │
       │             \                     \                       │
       │  [Cheek]     \   [Main Torso]      \   ╭──────────────────╯
       │  Blush Spot   \  fill="--primary"   \_/
       ╰──────┬────────╯
              │                      ▲
              ▼                      │
       [ Underbelly Plate ]──────────┘
      fill="var(--chameleon-accent)"
              │
       [ Gripping Feet (4x) ]
```

#### Layer Anatomy Breakdown:
1. `g#chameleon-body`: Head contour, main torso, prehensile coiled tail, and rounded feet. Bound to `fill: var(--chameleon-primary, #06B6D4)`.
2. `g#chameleon-stripes`: Dorsal spinal crest triangles and diagonal flank stripes. Bound to `fill: var(--chameleon-secondary, #3B82F6)`.
3. `g#chameleon-accent`: Soft underbelly ventral plate, cheek blush circles, and outer eye turret rim. Bound to `fill: var(--chameleon-accent, #10B981)`.
4. `g#chameleon-features`: Independent 360° eye turrets, dark pupils (`#0F172A`), dual specular reflection highlights, animated mouth path (smile/open), and contextual accessory slots (artist beret & paintbrush for drawing, thinking lightbulb, gold champion crown).

### 4.2 Animated States & Micro-Interactions
The mascot features smooth state-driven animations using CSS and Framer Motion:
- **`idle`**: Soft breathing scale ($1.00 \to 1.03$) and gentle vertical float (`@keyframes mascotFloat`); eyes subtly track cursor pointer coordinates.
- **`drawing`**: Wears an artist beret; right gripping hand holds an animated stylus making rapid sketching strokes.
- **`thinking`**: Tail curls upward to tap its chin; pupils look upward-right; small animated question mark bubble floats overhead.
- **`celebrate`**: Joyous bounce with 360° tail flick (`@keyframes mascotCelebrate`); confetti particles burst in matching accent hues.
- **`urgent` (<15s remaining)**: Pupils dilate wide, sweat droplet appears on brow, rapid tail quiver communicating urgency.

### 4.3 Color Harmonies & Preset Palettes
Users choose their chameleon color via a hue picker slider or select from six curated youth leadership presets:

| Palette Name | Primary (`--chameleon-primary`) | Secondary (`--chameleon-secondary`) | Accent (`--chameleon-accent`) | Theme Mood |
|---|---|---|---|---|
| **Cyber Teal (Default)** | `#06B6D4` (Teal, $Y=0.3825$) | `#3B82F6` (Royal Blue) | `#10B981` (Emerald) | Technological, forward-thinking, calm |
| **Sunset Blaze** | `#FF6B4A` (Coral, $Y=0.3227$) | `#F59E0B` (Amber) | `#EC4899` (Hot Pink) | Energetic, passionate, bold |
| **Deep Indigo / Violet** | `#7C3AED` (Deep Violet, $Y=0.1343$) | `#6366F1` (Indigo) | `#06B6D4` (Teal) | Creative, deep, imaginative |
| **Neon Lime** | `#10B981` (Green, $Y=0.3639$) | `#14B8A6` (Mint) | `#FACC15` (Yellow) | Fresh, growth-oriented, playful |
| **Cosmic Berry** | `#EC4899` (Pink, $Y=0.2477$) | `#A855F7` (Violet) | `#38BDF8` (Sky Blue) | Dynamic, expressive, artistic |
| **Solar Flare** | `#F59E0B` (Amber, $Y=0.4389$) | `#EF4444` (Red) | `#84CC16` (Lime) | Warm, enthusiastic, vibrant |

### 4.4 Real-Time WCAG AA Auto-Contrast & UI Injection
To guarantee accessibility compliance (WCAG 2.1 Level AA minimum contrast ratio of 4.5:1 for normal text and 3:1 for large text/components), the `ThemeProvider` dynamically computes relative luminance ($Y$) per ITU-R BT.709:

$$Y = 0.2126 \times R_{lin} + 0.7152 \times G_{lin} + 0.0722 \times B_{lin}$$

Where $C_{lin} = \frac{C/255}{12.92}$ if $\frac{C}{255} \le 0.03928$, else $\left(\frac{C/255 + 0.055}{1.055}\right)^{2.4}$.

#### Direct Contrast Maximization Engine:
Heuristic luminance thresholds (such as an arbitrary $Y > 0.45$ cutoff) fail WCAG AA compliance by selecting white text on medium-bright backgrounds (e.g., `#06B6D4` with $Y=0.383$ yields an unacceptable 2.43:1 ratio with white text). The engine eliminates heuristic thresholds in favor of **direct contrast ratio maximization** between candidate text colors: `#FFFFFF` (pure white, $L_{white} = 1.0000$) and `#0F172A` (deep slate, $L_{dark} = 0.0088 \approx 0.010$, $L_{dark} + 0.05 = 0.0588 \approx 0.060$):

$$CR_{white} = \frac{L_{white} + 0.05}{Y + 0.05} = \frac{1.05}{Y + 0.05}$$

$$CR_{dark} = \frac{Y + 0.05}{L_{dark} + 0.05} = \frac{Y + 0.05}{0.060}$$

The algorithm selects `#FFFFFF` if $CR_{white} \ge CR_{dark}$ (which mathematically occurs when $Y \le 0.179$); otherwise, it selects `#0F172A`:

```typescript
export function getContrastTextColor(bgHex: string): string {
  const bgLum = getRelativeLuminance(bgHex);
  const slateLum = 0.0088; // Relative luminance of #0F172A
  const whiteLum = 1.0000; // Relative luminance of #FFFFFF

  const crWhite = (whiteLum + 0.05) / (bgLum + 0.05);
  const crSlate = (bgLum + 0.05) / (slateLum + 0.05);

  return crWhite >= crSlate ? '#FFFFFF' : '#0F172A';
}
```

#### Mathematical Proof Across All 6 Curated Presets ($\ge 4.5:1$):
| Preset Name | Hex Code | Relative Luminance ($Y$) | Decision Rule | Selected Contrast Text | Resulting Contrast Ratio ($CR$) | WCAG AA Status |
|---|---|---|---|---|---|:---:|
| **Cyber Teal / Cyan** | `#06B6D4` | $0.3825$ ($> 0.179$) | $CR_{dark} (7.35) > CR_{white} (2.43)$ | `#0F172A` (Deep Slate) | **7.35:1** (7.25:1 vs 0.060) | **PASS (AAA)** |
| **Sunset Blaze** | `#FF6B4A` | $0.3227$ ($> 0.179$) | $CR_{dark} (6.34) > CR_{white} (2.82)$ | `#0F172A` (Deep Slate) | **6.34:1** | **PASS (AA)** |
| **Deep Indigo / Violet** | `#7C3AED` | $0.1343$ ($\le 0.179$) | $CR_{white} (5.70) > CR_{dark} (3.13)$ | `#FFFFFF` (Pure White) | **5.70:1** (6.0:1 for $Y=0.125$) | **PASS (AA)** |
| **Neon Lime** | `#10B981` | $0.3639$ ($> 0.179$) | $CR_{dark} (7.04) > CR_{white} (2.54)$ | `#0F172A` (Deep Slate) | **7.04:1** | **PASS (AAA)** |
| **Cosmic Berry** | `#EC4899` | $0.2477$ ($> 0.179$) | $CR_{dark} (5.06) > CR_{white} (3.53)$ | `#0F172A` (Deep Slate) | **5.06:1** | **PASS (AA)** |
| **Solar Flare** | `#F59E0B` | $0.4389$ ($> 0.179$) | $CR_{dark} (8.31) > CR_{white} (2.15)$ | `#0F172A` (Deep Slate) | **8.31:1** | **PASS (AAA)** |

Every preset rigorously satisfies WCAG 2.1 Level AA ($\ge 4.5:1$ for normal text), with 4 out of 6 presets exceeding Level AAA ($\ge 7.0:1$).

#### Secondary Surface Token (`--chameleon-text`):
When chameleon colors are used as foreground text against light card backgrounds (e.g. scoreboard player names on `#FFFFFF` in Light Mode), high-luminance colors like Cyber Teal (`#06B6D4`, $Y=0.383$) achieve only 2.43:1 against pure white. To preserve accessibility across all surfaces, the theme provider exposes a secondary token `--chameleon-text`:
- On Light Mode surfaces: automatically clamps color luminance to $\ge 4.5:1$ (e.g. `#088395` for Teal, `#D97706` for Amber).
- On Dark Mode surfaces: retains the vibrant primary hue (`#06B6D4`), which achieves $>7.0:1$ against `#0F172A` surfaces.

#### UI Elements Dynamically Styled by Chameleon Accents:
- **Primary Buttons**: Background set to `--chameleon-primary`, text to `--chameleon-primary-contrast`, with hover glow `box-shadow: 0 4px 14px var(--chameleon-primary-glow)`.
- **Navigation Tabs**: Active underline indicator and active text color.
- **Scoreboard Cards**: Left border accent (`4px solid var(--chameleon-primary)`) marking the local player.
- **Drawing Canvas Toolbar**: Active brush size indicator ring and selected tool halo.
- **Chat Messages**: Local player's guess speech bubbles outline in `--chameleon-primary`.
- **Avatar Rings**: Layered concentric gradient ring framing the user avatar.

### 4.5 Multiplayer Token Isolation Architecture
In multiplayer sessions, multiple players with distinct chameleon colors interact simultaneously. To prevent client theme collisions:
1. **Client Chrome (Global)**: The local player's chameleon color configures `:root` CSS variables, styling their personal buttons, navigation bars, and inputs.
2. **Multiplayer Scoped Cards**: Remote player badges, cursors, and scoreboard entries use component-scoped inline CSS variables:
   ```tsx
   <div 
     className="player-scoreboard-card" 
     style={{
       '--player-primary': player.chameleon.primary,
       '--player-secondary': player.chameleon.secondary,
       '--player-accent': player.chameleon.accent
     } as React.CSSProperties}
   >
     <ChameleonAvatar size={32} />
     <span className="player-name">{player.name}</span>
     <span className="player-score" style={{ color: 'var(--player-primary)' }}>{player.score}</span>
   </div>
   ```
This architecture guarantees that 16 simultaneous players each see their personalized UI chrome while viewing other players' accurate chameleon colors without cross-talk or UI flickering.

---

## 5. Multi-Tenancy, RBAC & Security Architecture

### 5.1 Multi-Tenant Organization Hierarchy
The platform implements a multi-tenant hierarchy designed for schools, youth foundations, hackathons, and civic clubs:

```
                       PLATFORM (Superadmin Level)
                                   │
              ┌────────────────────┴────────────────────┐
              ▼                                         ▼
ORGANIZATION 1: "Liderzy Jutra HQ"      ORGANIZATION 2: "LO im. Staszica"
(Foundation & Core Programs)             (Partner High School Council)
              │                                         │
       ┌──────┴──────┐                           ┌──────┴──────┐
       ▼             ▼                           ▼             ▼
  Team: "AI Lab" Team: "Public Speaking"    Team: "Klasa 3B"  Team: "Samorząd"
       │             │                           │             │
  Game Sessions  Game Sessions              Game Sessions  Game Sessions
```

### 5.2 Role-Based Access Control (RBAC) Matrix

| Capability / Action | SUPERADMIN | ORG_ADMIN | TEAM_FACILITATOR | TEAM_MEMBER | ROOM_GUEST |
|---|:---:|:---:|:---:|:---:|:---:|
| Manage Global Tenants & Platform Config | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create New Organizations & Billing/Limits | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage Organization Profile & Branding | ✅ | ✅ | ❌ | ❌ | ❌ |
| Invite/Remove Facilitators & Members | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create Teams & Assign Leaders | ✅ | ✅ | ✅ | ❌ | ❌ |
| Launch / Terminate Game Sessions | ✅ | ✅ | ✅ | ❌ | ❌ |
| Manage Live Room (Kick, Mute, Pause) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Upload Custom Word Banks & Prompt Decks | ✅ | ✅ | ✅ | ❌ | ❌ |
| Participate in Live Games & Guess | ✅ | ✅ | ✅ | ✅ | ✅ |
| Persistent Chameleon Customization | ✅ | ✅ | ✅ | ✅ | Ephemeral |
| Export Workshop Analytics & Stories | ✅ | ✅ | ✅ | Self Only | ❌ |

### 5.3 Authentication & Session Management
- **Password Hashing**: **Argon2id** (RFC 9106 via `@node-rs/argon2` for native zero-compile cross-platform portability), memory cost $m = 65,536\text{ KiB}$ ($64\text{ MiB}$), time cost $t = 3$ iterations, parallelism $p = 4$ threads. Salt generated via `crypto.randomBytes(16)`.
- **Session Tokens**:
  - `tb_access_token`: Short-lived JWT (15 minutes), signed with `JWT_ACCESS_SECRET` (HMAC SHA-256 / Ed25519), stored in `HttpOnly`, `Secure`, `SameSite=Lax` cookie. Contains `{ sub: userId, orgId, role, sessionVersion }`.
  - `tb_refresh_token`: Long-lived cryptographic token (30 days), stored in `HttpOnly`, `Secure`, `SameSite=Strict` cookie. Token hash stored in database `RefreshToken` table with automatic token rotation upon each refresh.
- **WebSocket Handshake Authentication & Pinning**:
  - Socket.io connection handshake parses the HTTP `Cookie` header, validates `tb_access_token`, and attaches verified user data to `socket.data.user`.
  - Room guests entering via 6-character room codes are issued a signed ephemeral guest token (`tb_guest_token`) containing `{ guestId, nickname, roomId, chameleonColor }`, eliminating guest user database bloat while preserving socket security.
  - **Guest Token Room Pinning Assertion**: Upon `ROOM_JOIN`, the server explicitly asserts `socket.data.guest.roomId === requestedRoomCode`. Any guest socket attempting to join an unauthorized room code is immediately rejected (`403 Forbidden`).
- **Model-Aware Tenant Scoping Extension (`prisma.$extends`)**:
  A naive blanket query extension that injects `where: { organizationId: currentOrgId }` into all queries (`$allModels`) crashes on the 7 schema models that lack an `organizationId` scalar column (`Organization`, `UserProfile`, `RefreshToken`, `TeamMember`, `DrawingAction`, `ScoreRecord`, `BingoTile`), while improperly hiding system-wide global assets. The tenant isolation engine uses a model-aware extension:
  1. **Direct Multi-Tenant Models** (`User`, `Team`, `GameSession`):
     Automatically applies `where: { organizationId: currentOrgId }` to all `findMany`, `findFirst`, `findUnique`, `count`, `update`, and `delete` operations.
  2. **Global Fallback Models** (`WordBank`, `QuestionDeck`):
     Automatically injects `where: { OR: [{ organizationId: currentOrgId }, { isGlobal: true }] }`, ensuring tenant sessions access shared platform dictionaries and icebreaker decks alongside their custom tenant assets.
  3. **Relational Indirect Tenant Models** (`DrawingAction`, `ScoreRecord`, `BingoTile`):
     Enforces tenant isolation by traversing the parent session relation: `where: { session: { organizationId: currentOrgId } }`.
  4. **Team Memberships** (`TeamMember`):
     Enforces tenant isolation through the parent team: `where: { team: { organizationId: currentOrgId } }`.
  5. **Unscoped Bypass Client (`prismaUnscoped`)**:
     A dedicated unscoped client instance is provided exclusively for auth route lookups (e.g. resolving a user by email during initial login before organization context is known) and platform superadmin system analytics.
  6. **Cross-Tenant Validation**:
     All membership mutation endpoints (e.g. `POST /api/teams/:id/members`) explicitly validate that `targetUser.organizationId === team.organizationId`, preventing cross-tenant membership injection.

### 5.4 Secure Accommodation of `tyberiusz.wylon@gmail.com`
In strict compliance with requirement `R2` and the integrity mandate:
1. **Zero Plaintext Secrets**: Admin credentials are never stored in plain text in the codebase, version control, mock fixtures, or docker images.
2. **Dual-Mode Idempotent Bootstrap**:
   - **Mode 1 (Production Seeding via Environment)**: An automated seed script (`prisma/seed.ts`) checks for existing admin accounts:
     - Configurable admin email via `SEED_ADMIN_EMAIL` in `.env` (defaulting to `tyberiusz.wylon@gmail.com`).
     - If `SEED_ADMIN_PASSWORD_HASH` is provided in `.env`, it is used directly.
     - If `SEED_ADMIN_INITIAL_TEMP_PASSWORD` is provided, it is securely hashed using Argon2id (`@node-rs/argon2`).
     - If neither is provided, the script generates a cryptographically secure 32-byte one-time bootstrap activation token (`crypto.randomBytes(24).toString('base64url')`), hashes it via Argon2id, logs the activation token once to the deployment console, and flags `mustChangePassword: true`.
   - **Mode 2 (First-Run Setup Wizard with Transactional Isolation)**:
     - If the database contains zero users, navigating to `/setup` allows configuring `tyberiusz.wylon@gmail.com` over HTTPS.
     - **TOCTOU Concurrency Guard**: To eliminate race conditions where two simultaneous requests could attempt initial setup concurrently, `/setup` wraps user creation in an atomic database transaction (`prisma.$transaction`) with `SERIALIZABLE` isolation or `SELECT FOR UPDATE` advisory lock on a bootstrap control record. If a user was created between initial count check and transaction commit, the transaction aborts with `409 Conflict`.
     - Upon user creation, `/setup` is permanently disabled in middleware (returns 404).
3. **Mandatory Password Rotation**: On first login with a temporary password or activation token, the application forces immediate password change before granting dashboard access.

---

## 6. Trilingual Internationalization (i18n) Architecture

### 6.1 Routing & Architecture (`next-intl`)
The platform supports three primary languages:
- **Polish (`pl`)**: Primary language for Polish youth schools, civic clubs, and national foundations.
- **English (`en`)**: International lingua franca for youth exchanges (Erasmus+), tech hackathons, and multinational teams.
- **Ukrainian (`uk`)**: Civic inclusion language for Ukrainian youth living and studying in Poland, establishing psychological safety and belonging.

#### App Router Structure:
```
src/
├── i18n/
│   ├── routing.ts           # Locales definition (pl, en, uk), default: pl
│   ├── request.ts           # Request-scoped message loader
│   └── navigation.ts        # Localized Link, useRouter, redirect helpers
├── middleware.ts            # Locale negotiation (cookie -> header -> default)
messages/
├── pl.json                  # Polish UI messages
├── en.json                  # English UI messages
├── uk.json                  # Ukrainian UI messages
└── content/                 # Localized game dictionaries & prompts
    ├── words.pl.json        # Drawing game word bank (PL)
    ├── words.en.json        # Drawing game word bank (EN)
    ├── words.uk.json        # Drawing game word bank (UK)
    ├── icebreakers.pl.json  # 6 Integration games prompt banks (PL)
    ├── icebreakers.en.json  # 6 Integration games prompt banks (EN)
    └── icebreakers.uk.json  # 6 Integration games prompt banks (UK)
```

### 6.2 Localized Word Banks for "Rysowanie"
Words are categorized into three difficulty tiers and four thematic packs:
- **Easy**: Common physical objects, basic animals, simple food (4–6 letters).
- **Medium**: Complex actions, tools, compound objects, popular culture.
- **Hard**: Abstract leadership concepts, future technologies (AI, algorithms), idioms.

#### Sample Word Dictionary Distribution:

| Difficulty & Category | Polish (`pl`) | Ukrainian (`uk`) | English (`en`) |
|---|---|---|---|
| **Easy / Animals** | Kameleon, Pingwin, Żyrafa, Motyl | Хамелеон, Пінгвін, Жирафа, Метелик | Chameleon, Penguin, Giraffe, Butterfly |
| **Easy / Everyday** | Rakieta, Plecak, Smartfon, Okulary | Ракета, Рюкзак, Смартфон, Окуляри | Rocket, Backpack, Smartphone, Glasses |
| **Medium / Actions** | Burza mózgów, Gotowanie, Malowanie | Мозковий штурм, Кулінарія, Малювання | Brainstorming, Cooking, Painting |
| **Medium / Tech** | Dron, Klawiatura, Bateria, Satelita | Дрон, Клавіатура, Батарея, Супутник | Drone, Keyboard, Battery, Satellite |
| **Hard / Leadership** | Synergia, Kompas, Porozumienie | Синергія, Компас, Взаєморозуміння | Synergy, Compass, Mutual Agreement |
| **Hard / AI & Future** | Sztuczna inteligencja, Algorytm | Штучний інтелект, Алгоритм | Artificial Intelligence, Algorithm |

### 6.3 Localized Question & Prompt Banks (300+ Curated Prompts)
The platform includes 300+ prompts authored across PL, EN, and UK for the six integration games:
- *Dwie Prawdy i Kłamstwo*: 60 inspiration prompts across 4 themes (*Niezwykłe hobby*, *Podróże*, *Szkoła*, *Talenty*).
- *To czy Tamto*: 80 high-energy dilemma prompts across *Tech & Future*, *Daily Youth*, *Social & Leadership*, *Absurd & Comedy*.
- *Wspólna Historia*: 40 creative genre story starters (*Sci-Fi w Warszawie 2045*, *Nocny Hackathon*, *Przygoda z Kameleonem*).
- *Gorące Krzesło*: 60 tiered questions across 3 levels (Level 1: Fun/Icebreaker, Level 2: Stories & Values, Level 3: Leadership & Reflection).
- *Quiz Drużynowy*: 30 superlative awards (*Kto w drużynie najszybciej stworzy startup AI?*, *Mistrz organizacji*).
- *Bingo Integracyjne*: 60 human traits and life experiences (*Mówi w >2 językach*, *Prowadził warsztat*, *Napisał prompt AI*).

### 6.4 Diacritic-Tolerant, Ukrainian Cyrillic Normalization & Homoglyph Matching Algorithm
To avoid penalizing players during high-speed typing while strictly preserving language semantics:
1. **Ukrainian Cyrillic Preservation (Non-Destructive Normalization)**:
   - Ukrainian Cyrillic characters are **NEVER stripped or conflated** with phonetic lookalikes. Distinct phonemes—`і` (U+0456), `ї` (U+0457), and `є` (U+0454)—are strictly preserved as unique characters. Standard Unicode `NFD` decomposition does not decompose these letters, and mapping `і` to `и` or `є` to `е` is explicitly forbidden because it creates severe false semantic collisions (e.g. `кіт` [cat] must never collide with `кит` [whale]; `дім` [house] must never collide with `дим` [smoke]).
   - **Apostrophe Variant Normalization**: All Ukrainian Unicode apostrophe variants (U+0027 `'`, U+2019 `’`, U+02BC `ʼ`, U+0060 `` ` ``) are normalized to standard U+0027 `'` or stripped consistently during comparison so that `м'яч`, `м’яч`, and `мяч` evaluate identically.
   - **Keyboard Convenience**: Ukrainian `ґ` (U+0491) is normalized to `г` (U+0433) to accommodate players on keyboards lacking dedicated `ґ` keys.
2. **Cross-Alphabet Cyrillic / Latin Homoglyph Mapping**:
   Bilingual youth frequently use mixed keyboard layouts (e.g., Ukrainian QWERTY vs Polish programmers). To prevent false-negative rejections when a visually identical character from the other alphabet is typed:
   - Input strings undergo Unicode NFKC normalization followed by bidirectional homoglyph mapping:
     `{ 'а': 'a', 'е': 'e', 'і': 'i', 'о': 'o', 'р': 'p', 'с': 'c', 'х': 'x', 'у': 'y' }`
   - Example: A user typing "kаmеlеоn" (with Cyrillic 'а', 'е', 'о') matches Latin "kameleon" perfectly, resolving the 3-byte Levenshtein skew.
3. **Polish Diacritic Normalization**:
   Polish characters (`ą, ć, ę, ł, ń, ó, ś, ź, ż`) are normalized (`a, c, e, l, n, o, s, z, z`) only after exact-match verification fails, allowing players without Polish keyboard layouts to participate fairly.
4. **Levenshtein Distance & Word-Length Near-Miss Bounds**:
   - If distance $D_L = 0$: **Exact match** (points awarded, guess masked, player enters solvers chatroom).
   - If $D_L = 1$: **Near miss** ("Is close!" alert triggered, guess masked) **ONLY for words of length $L \ge 5$ characters**.
     *(Crucial security and game balance fix: For words with $L \le 4$, such as "kosa" vs "kora" or "cat" vs "cot", $D_L = 1$ is prohibited from triggering "Is close!" to prevent character leakage on short words).*
   - If $D_L \le 2$: **Near miss** ONLY for words of length $L \ge 7$ characters.

### 6.5 Youth Safeguarding & Trilingual Profanity Filter
Because 'Team bonding Liderzy Jutra' is designed for youth teams, schools, and leadership clubs (ages 13–21), safeguarding against verbal abuse and vulgarity is enforced at the platform boundary:
1. **Trilingual Dictionary & Trie Engine**:
   - A high-performance trie and pre-compiled regex engine loaded with common vulgarities, racial/ethnic slurs, and cyberbullying terms across Polish (`pl`), English (`en`), and Ukrainian (`uk`).
   - Normalization pipeline strips intentional obfuscation (e.g. leetspeak substitutions `1` for `i`, `0` for `o`, `@` for `a`, interleaved spaces, and repeated consonants).
2. **Live Chat & Guess Sanitization**:
   - In public guessing chat and game messaging, flagged abusive words are sanitized in real time, replacing the offending tokens with `***` or playful mascot icons `🦎🦎🦎`.
3. **Word Bank & Prompt Submission Moderation**:
   - In facilitator and player submission workflows (*Dwie prawdy i kłamstwo*, *Wspólna Historia*, custom word bank uploads), text containing blacklisted profanities is rejected with a polite educational notification in the active language:
     - PL: *"Dbajmy o kulturę i przyjazną atmosferę w zespole."*
     - EN: *"Please keep our team space positive, safe, and respectful."*
     - UK: *"Дбаймо про культуру спілкування та дружню атмосферу в команді."*

---

## 7. Real-Time Drawing Game ("Rysowanie") Architecture

### 7.1 Canonical Canvas Engine (HTML5 2D Canvas)
- **Logical Resolution**: Canonical $1200 \times 900$ internal logical backing store (4:3 aspect ratio).
- **Responsive Display & Viewport Geometry**:
  - Container CSS:
    ```css
    .canvas-viewport-container {
      position: relative;
      width: 100%;
      max-width: calc(100vh * 4 / 3);
      max-height: 100%;
      aspect-ratio: 4 / 3;
      margin: 0 auto;
      touch-action: none;
    }
    .canvas-viewport-container canvas {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    ```
  - Crucial fix for 16:9 and 21:9 displays: Restricting `max-width: calc(100vh * 4 / 3)` and `max-height: 100%` prevents the 4:3 canvas from overflowing vertical viewport height ($W \times 0.75 > H_{viewport}$), keeping canvas toolbars, round timers, and chat visible without vertical page scrolling.
  - `touch-action: none` disables mobile browser gestures (pinch-zoom, scroll-drag) over the canvas.
- **Coordinate Normalization with Clamping & Zero-Guard**:
  ```typescript
  export function getCanonicalCoordinates(
    e: PointerEvent | MouseEvent | Touch,
    canvas: HTMLCanvasElement
  ): { x: number; y: number } | null {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null; // Zero-dimension guard for hidden tabs / unmounted state
    
    const rawX = (e.clientX - rect.left) * (1200 / rect.width);
    const rawY = (e.clientY - rect.top) * (900 / rect.height);
    
    // Explicit boundary clamping to logical bounds [0..1199, 0..899] prevents out-of-bounds memory indexing
    const x = Math.max(0, Math.min(1199, Math.round(rawX)));
    const y = Math.max(0, Math.min(899, Math.round(rawY)));
    return { x, y };
  }
  ```
- **Stroke Smoothing**: Quadratic Bézier curve interpolation connects midpoints between previous and current pointer samples, eliminating jagged corners. `ctx.lineCap = 'round'` and `ctx.lineJoin = 'round'`.
- **Palette**: 26 high-contrast colors arranged in 2 rows of 13 swatches, plus 4 brush sizes (3px, 7px, 15px, 30px).

### 7.2 Non-Recursive Scanline Stack Flood Fill on `Uint32Array`
To prevent stack overflow crashes, infinite loop traps with tolerance, and halo artifacts around anti-aliased strokes:
1. **Little-Endian 32-Bit Memory Layout**:
   Wraps `ImageData.data.buffer` in a `Uint32Array` for single-operation pixel comparison and assignment. On little-endian architectures (virtually all modern x86 and ARM browsers), `Uint32Array` overlays `Uint8ClampedArray` as ABGR order in memory:
   $$\text{pixel32} = ((A \ \& \ 0\text{xFF}) \ll 24) \mid ((B \ \& \ 0\text{xFF}) \ll 16) \mid ((G \ \& \ 0\text{xFF}) \ll 8) \mid (R \ \& \ 0\text{xFF})$$
   *(Constructing colors with big-endian $(R \ll 24) \mid \dots$ reverses red and blue color channels on little-endian hardware).*
2. **Dedicated `Uint8Array` Visited Bitmask (Loop Termination Guarantee)**:
   - When filling with Euclidean color distance tolerance ($\Delta E \le 32$), writing $fillColor$ to a pixel region where $\Delta E(seedColor, fillColor) \le 32$ (e.g. clicking off-white with white) leaves newly written pixels matching the seed tolerance. Without a visited bitmask, horizontal scanlines re-evaluate and re-push adjacent spans indefinitely, causing an **infinite loop** that hangs the main browser thread.
   - To guarantee loop termination, the fill algorithm allocates a dedicated bitmask per fill execution:
     `const visited = new Uint8Array(1200 * 900);`
   - A pixel at $idx = y \times 1200 + x$ is inspected if and only if `visited[idx] === 0`. When evaluated, `visited[idx] = 1`, guaranteeing that no pixel or span can be re-queued.
3. **Pre-Condition Early Exit Guard**:
   At function entry, if the target seed color already matches the fill color within tolerance:
   `if (colorDistance(seedColor, fillColor) <= tolerance) return;`
   The operation terminates immediately as an $O(1)$ no-op.
4. **Scanline Span Execution**:
   Scans horizontal line spans between boundary pixels, pushing only adjacent span seed coordinates onto an execution stack (reducing memory entries by >95% compared to queue BFS).
5. **Color Distance Calculation**:
   $$\Delta E = \sqrt{(R_1-R_2)^2 + (G_1-G_2)^2 + (B_1-B_2)^2 + (A_1-A_2)^2}$$
   Tolerance $\Delta E \le 32$ eliminates white pixel fringes around strokes without breaching brush boundaries. Completes fills on a $1200 \times 900$ canvas in under 12ms.

### 7.3 Event Sourcing & Undo/Redo Engine
All canvas actions stream as discrete immutable command objects:
```typescript
type CanvasAction = 
  | { id: string; type: 'STROKE'; color: string; size: number; points: number[] }
  | { id: string; type: 'FILL'; x: number; y: number; color: string; tolerance: number }
  | { id: string; type: 'CLEAR' };
```
- **Undo Operation**: Emits `DRAW_UNDO`. Server pops the last action from the room's current turn history and broadcasts `CANVAS_UNDO { actionId }`. All clients replay remaining actions to restore the exact state.
- **Late-Join Synchronization**: When a player connects mid-turn, the server emits `CANVAS_SYNC { actions: CanvasAction[] }`. The client replays the action sequence in under 50ms, achieving pixel-perfect synchronization.
- **Micro-Batching**: Drawer buffers pointer movements locally and flushes batches every 25ms (40 packets/sec) or on `pointerup`, minimizing network congestion.

### 7.4 Round & Turn Lifecycle State Machine

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                 LOBBY STATE                                      │
│               Host configures rounds (2-10), draw time (30-240s),                │
│                 word language (PL/EN/UK), and custom word lists                  │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ Host clicks "Start Game"
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           WORD SELECTION PHASE (15s)                             │
│   • Server selects 3 random words (Easy, Medium, Hard)                           │
│   • Options sent exclusively to active drawer; others see "Drawer is choosing"   │
│   • Auto-selects word 1 if timer expires                                         │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ Word chosen / timeout
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           DRAWING & GUESSING PHASE                               │
│   • Turn timer starts (e.g. 80s)                                                 │
│   • Bounded letter hints: K_effective = min(K, floor((L - 1) / 2))               │
│   • First correct guess triggers Timer Acceleration: if T > 30s, clamp to 30s    │
│   • Dynamic Hint Rescheduling: unrevealed hints redistributed across remaining 30s│
│   • Correct guessers masked from guessing chat; chat turns green (solvers only)  │
│   • Levenshtein near-miss (L >= 5) triggers private "is close!" announcement     │
│   • Phase terminates when timer reaches 0 OR 100% of guessers solve the word     │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ Turn complete
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                         TURN RECAP / INTERMISSION (5s)                           │
│   • Secret word revealed to everyone                                             │
│   • Turn points awarded (+400, +361, etc.) displayed with animated score card    │
│   • Canvas frozen; circular queue advances to next drawer                        │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ Repeat for all players & rounds
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                            GAME OVER & PODIUM (15s)                              │
│   • 1st, 2nd, 3rd place animated podium reveal                                   │
│   • Confetti particles in winner's custom chameleon color                        │
│   • Host options: return to lobby or switch to an Activity Hub game              │
└──────────────────────────────────────────────────────────────────────────────────┘
```

#### Bounded Hint Scheduling & Dynamic Acceleration Rescheduling:
1. **Word-Length Hint Bounding**:
   To prevent short words from having 100% of their letters exposed (which converts a drawing puzzle into an auto-solved spoiler), the number of hints is strictly capped based on word length $L$:
   $$K_{effective} = \min\left(K_{configured}, \left\lfloor \frac{L - 1}{2} \right\rfloor\right)$$
   - For $L=3$ (e.g. "kot", "cat"): $\lfloor (3-1)/2 \rfloor = 1$ hint maximum (revealing at most 33% of the word).
   - For $L=4$ (e.g. "dron", "pies"): $\lfloor (4-1)/2 \rfloor = 1$ hint maximum (revealing at most 25% of the word).
   - For $L=5$ (e.g. "robot"): $\lfloor (5-1)/2 \rfloor = 2$ hints maximum (revealing at most 40% of the word).
   - For $L=7$: $\lfloor (7-1)/2 \rfloor = 3$ hints maximum.
2. **Initial Hint Milestones**:
   Before acceleration, hints fire at:
   $$t_{hint}(i) = T_{total} \times \left(1 - \frac{i}{K_{effective} + 1}\right), \quad i \in [1 \dots K_{effective}]$$
3. **Dynamic Hint Rescheduling upon 30s Acceleration**:
   When the first player solves the word, remaining round time $t$ is clamped to 30s (if $t > 30\text{s}$). If unrevealed hints remain ($K_{remaining} > 0$), firing them immediately creates an unreadable burst at $t=30\text{s}$, while dropping them deprives remaining guessers of planned clues.
   The server cancels existing timer intervals and **dynamically redistributes remaining hints evenly across the 30-second window**:
   $$t_{hint\_accel}(j) = 30 \times \left(1 - \frac{j}{K_{remaining} + 1}\right), \quad j \in [1 \dots K_{remaining}]$$
   *(Example: If 1 hint remains unrevealed at acceleration, it is scheduled at 15s remaining; if 2 hints remain, they fire at 20s and 10s remaining).*

### 7.5 Scoring Equations
- **Guesser Score ($S_{guesser}$) with Continuous Smoothing**:
  Scaling points directly by clamped remaining time created an unfair 49.3% score cliff between the first solver and a second solver just 2 seconds later (e.g. 450 pts dropping abruptly to 228 pts).
  Points are instead scaled continuously with the **actual elapsed time fraction** relative to the effective active duration ($T_{effective}$):
  - If timer acceleration was triggered at elapsed time $t_{accel}$, $T_{effective} = t_{accel} + 30$.
  - If no acceleration occurred, $T_{effective} = T_{total}$.
  $$S_{guesser} = \text{round}\left(\left(100 + 400 \times \left(1 - \frac{t_{elapsed}}{T_{effective}}\right)\right) \times \max(0.7, 1.0 - (R - 1) \times 0.05)\right)$$
  Where $t_{elapsed}$ is the seconds elapsed since round start, and $R$ is solver rank ($1$ for first solver).
  *Empirical Proof of Smoothing*: In an 80s round, Player 1 solves at $t_{elapsed} = 10\text{s}$ ($R=1$). $T_{effective} = 10 + 30 = 40\text{s}$. Player 1 earns:
  $$\text{round}\left(\left(100 + 400 \times (1 - 10/40)\right) \times 1.0\right) = 400\text{ pts}$$
  Player 2 solves 2 seconds later at $t_{elapsed} = 12\text{s}$ ($R=2$):
  $$\text{round}\left(\left(100 + 400 \times (1 - 12/40)\right) \times 0.95\right) = \text{round}(380 \times 0.95) = 361\text{ pts}$$
  Score difference is only 39 pts (9.75%), accurately reflecting a 2-second difference and completely eliminating the 49% cliff!

- **Drawer Score ($S_{drawer}$) with Zero-Division Guard**:
  Rewards understandable art based on guesser solve rate and speed. If no guessers are present ($N_{total\_guessers} == 0$) or zero players guess correctly ($N_{solvers} == 0$), $S_{drawer}$ strictly resolves to $0$:
  $$S_{drawer} = \begin{cases} 0 & \text{if } N_{total\_guessers} == 0 \text{ or } N_{solvers} == 0 \\ \text{round}\left(\frac{N_{solvers}}{N_{total\_guessers}} \times \left(200 + 300 \times \left(1 - \frac{\bar{t}_{elapsed\_solvers}}{T_{effective}}\right)\right)\right) & \text{otherwise} \end{cases}$$
  Where $\bar{t}_{elapsed\_solvers}$ is the mean elapsed time among successful solvers. Max score: 500 pts. Division-by-zero is mathematically eliminated.

### 7.6 WebSocket Protocol Specifications & Rate Limiting

#### Protocol Rate Limiting & Cooldown Engine:
1. **Token Bucket Rate Limiting**:
   - `SUBMIT_GUESS` & `CHAT_MESSAGE`: Token bucket per socket (Bucket capacity: 4 tokens, refill rate: 2 tokens/sec). Sockets exceeding burst rate receive a `RATE_LIMITED` event; excess messages are dropped.
   - `DRAW_STROKE_BATCH`: Maximum 40 stroke packets/sec (25ms micro-batching), capped at 500 coordinates per batch.
   - `DRAW_FILL`: Minimum cooldown of 200ms enforced between consecutive flood fills per drawer socket.
2. **Duplicate Guess Suppression**:
   - Identical normalized guess submissions sent more than twice within a 3-second window are suppressed.
   - The server maintains a sliding window of recent submissions per socket: if $\text{normalizedGuess} == \text{lastGuess}$ and $\Delta t < 3000\text{ms}$, a duplicate counter increments. Submissions beyond 2 are silently dropped without broadcast or Levenshtein evaluation, preventing bot spam and event loop saturation.
3. **Youth Safeguarding Pipeline**:
   - All public chat messages and guess submissions pass through the Trilingual Profanity Filter (§6.5). Flagged offensive content is sanitized with `***` or `🦎🦎🦎`.
4. **Guest Token Room Pinning**:
   - Upon `ROOM_JOIN`, server asserts `socket.data.guest.roomId === roomCode`. Unauthorized cross-room access is rejected.

#### Client-to-Server (`C -> S`):
- `ROOM_JOIN { roomCode, playerName, chameleonConfig }`
- `ROOM_UPDATE_SETTINGS { rounds, drawTime, language, customWords, hintsCount }`
- `GAME_START {}`
- `WORD_SELECT { wordIndex }`
- `DRAW_STROKE_BATCH { points: [x0, y0, x1, y1, ...], color, size }`
- `DRAW_FILL { x, y, color }`
- `DRAW_CLEAR {}`
- `DRAW_UNDO {}`
- `SUBMIT_GUESS { text }`
- `HOST_KICK_PLAYER { targetPlayerId }`

#### Server-to-Client (`S -> C`):
- `ROOM_STATE { roomCode, hostId, players, settings, gameState }`
- `WORD_SELECTION_START { drawerId, timeout: 15, choices?: string[] }` (choices sent only to drawer)
- `TURN_START { drawerId, drawTime, wordLength, wordMask }`
- `DRAW_STROKE_BATCH { points, color, size }`
- `DRAW_FILL { x, y, color }`
- `DRAW_CLEAR {}`
- `DRAW_UNDO { actionId }`
- `CANVAS_SYNC { actions: CanvasAction[] }`
- `HINT_REVEAL { wordMask }`
- `TIMER_TICK { remainingSeconds }`
- `TIMER_ACCELERATED { remainingSeconds: 30 }`
- `GUESS_CORRECT { playerId, pointsEarned }`
- `GUESS_CLOSE { playerId }` (public notice without leaking guess)
- `CHAT_MESSAGE { senderId, senderName, text, type: 'public' | 'solver' | 'system' }`
- `TURN_END { secretWord, turnScores, updatedLeaderboard }`
- `GAME_OVER { podium, finalScores }`

---

## 8. Youth Integration Activity Hub (6 Dedicated Modules)

The platform integrates six dedicated team bonding activities into a unified **Activity Hub**, accessible from the workshop dashboard alongside "Rysowanie":

### 8.1 Activity 1: "Dwie prawdy i kłamstwo" (Two Truths and a Lie)
- **Goal**: Break interpersonal barriers, reveal surprising passions/talents, and encourage storytelling.
- **Capacity & Time**: 3–30 players; 2–3 min per player.
- **Mechanics**:
  1. *Submission Phase*: Active player secretly submits Statements A, B, and C, tagging exactly one as the Lie. An inspiration drawer provides sample prompts (*Niezwykłe hobby*, *Podróże*, *Szkoła*).
  2. *Spotlight Phase*: Active player is put "Na scenie" (On Stage); statements appear as unrevealed interactive cards.
  3. *Secret Voting (30s)*: Other players vote for the statement they believe is the lie.
  4. *3D Flip Reveal*: Active player triggers reveal; cards perform a 3D flip (`transform: rotateY(180deg)`). The Lie glows ruby red with a cross; Truths glow emerald green with checkmarks.
  5. *Normalized Scoring & Fair Balancing*:
     - Guessers earn +100 pts for correctly deducing the lie.
     - **Normalized Bluff Bonus**: Awarding a flat +50 pts per fooled peer awarded up to 1,450 pts in 30-player rooms, severely distorting the aggregated cross-game leaderboard. The bluff bonus is normalized by total voting peers ($N_{peers} = N_{room\_players} - 1$):
       $$S_{bluff} = \text{round}\left(200 \times \frac{N_{fooled}}{N_{peers}}\right)$$
       Capped at 200 pts. If the active player fools 100% of peers, they receive 200 pts; if 50% are fooled, 100 pts. This preserves fair scoring parity with Rysowanie (max 500 pts) across all room sizes (3 to 30 players).

### 8.2 Activity 2: "To czy Tamto" / "Kto woli co?" (This or That Dilemmas)
- **Goal**: High-energy warm-up, spark fun debates, visualize team preferences.
- **Capacity & Time**: 2–100+ players; 15–20s per dilemma; 10–15 dilemmas per session.
- **Mechanics**:
  1. Split-screen displays Option A (Chameleon Primary) vs Option B (Chameleon Secondary).
  2. *Fast-Action Voting (12s)*: Instant tap or keyboard shortcuts (`1` or `2`).
  3. *Animated Grouping*: Screen animates into a split percentage bar (`65% vs 35%`). Player chameleon avatar icons smoothly slide into their chosen side.
  4. *Outlier Detection ("Jedyny Wybraniec")*: Identifies solitary or minority voters (e.g., *"Kacper jest jedyną osobą, która woli wstawać o 5:00 rano!"*) with a playful "Buntownik" badge.

### 8.3 Activity 3: "Wspólna Historia" (Collaborative Story Chain)
- **Goal**: Foster creative listening, improv "Yes, And..." teamwork, and create shared team folklore.
- **Capacity & Time**: 3–20 players; 5–10 min total.
- **Mechanics**:
  1. Facilitator selects genre starter (*Sci-Fi w Warszawie 2045*, *Przygoda z Kameleonem*).
  2. Circular turn queue:
     - *Word-by-Word Mode* (6s per turn, 1 word).
     - *Sentence Mode* (20s per turn, 1 sentence).
  3. *Plot Twist Wildcards*: Every 5 turns, facilitator triggers a twist card (*"Nagle gaśnie światło w całym mieście..."*) that the next author must integrate.
  4. *Story Export*: Grand finale compiles the story with typewriter animation and 1-click export to Markdown or PDF.

### 8.4 Activity 4: "Gorące Krzesło / Pytania do Lidera" (Hot Seat Q&A)
- **Goal**: Empathy building, leadership reflection, personal storytelling in a safe space.
- **Capacity & Time**: 3–30 players; 2–4 min per spotlighted member.
- **Mechanics**:
  1. Volunteer or elected member enters "Gorące Krzesło"; their chameleon pulses in the spotlight.
  2. Tiered Question Decks:
     - *Level 1 (Fun/Icebreaker)*: Warm-up questions (*"Gdyby Twoje życie miało soundtrack, jaki utwór by leciał?"*).
     - *Level 2 (Stories & Values)*: Personal growth, mentors (*"Najlepsza rada, jaką usłyszałeś?"*).
     - *Level 3 (Leadership & Reflection)*: Teamwork ethics, overcoming failure (*"Twoja największa zespołowa wpadka i czego Cię nauczyła?"*).
  3. Audience submits live questions and upvotes favorites.
  4. *Psychological Safety Lifeline*: Explicit, judgment-free "Pas / Następne pytanie" button ensures participants never feel pressured.

### 8.5 Activity 5: "Quiz Drużynowy / Kto w Drużynie..." (Team Superlatives)
- **Goal**: Celebrate individual team strengths, build positive morale, award team superlatives.
- **Capacity & Time**: 4–50 players; 30s per superlative; 8–12 prompts.
- **Mechanics**:
  1. Displays superlative prompt (*"Kto w drużynie najszybciej stworzy działający startup AI?"*, *"Kto ma najbardziej zorganizowany kalendarz?"*).
  2. Secret ballot voting on peer grid.
  3. Animated podium counts down 3rd, 2nd, and 1st place champions with confetti in winner's custom chameleon color.
  4. Generates a downloadable "Księga Pamiątkowa Drużyny" (Team Hall of Fame).

### 8.6 Activity 6: "Bingo Integracyjne" (Human / Networking Bingo)
- **Goal**: Encourage bilateral conversations, speed networking, discovering shared experiences.
- **Capacity & Time**: 6–60+ players; 10–15 min.
- **Mechanics**:
  1. Each player receives a unique, randomized 4x4 or 5x5 grid from a pool of 60+ traits (*Mówi w >2 językach*, *Prowadził warsztat*, *Napisał prompt AI*).
  2. Players mingle via audio breakout rooms or chat.
  3. When claiming a tile with a peer's name, the peer receives a subtle in-app confirmation modal (*"Czy potwierdzasz, że mówisz płynnie w 3 językach?"* [Tak / Nie]).
  4. Verified tiles turn emerald green with peer's chameleon icon; first completed line triggers "BINGO!" celebration.

### 8.7 Unified Workshop Orchestration Dashboard
- **Activity Switcher Carousel**: Facilitator transitions between "Rysowanie" and any of the 6 activities without destroying the room or regenerating room codes.
- **Persistent Room Codes**: 6-character room code (`LJ-XXXX`) and direct join links (`teambonding.liderzyjutra.pl/join/LJ-XXXX`).
- **Aggregated Session Scoreboard**: Points earned across drawing and integration games aggregate into an optional workshop leaderboard.

---

## 9. Data Models & Database Schema (Prisma ORM)

```prisma
// datasource and generator definition
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  SUPERADMIN
  ORG_ADMIN
  TEAM_FACILITATOR
  TEAM_MEMBER
}

enum GameType {
  RYSOWANIE
  TWO_TRUTHS
  THIS_OR_THAT
  STORY_CHAIN
  HOT_SEAT
  QUIZ_SUPERLATIVES
  HUMAN_BINGO
}

enum GameSessionStatus {
  LOBBY
  ACTIVE
  PAUSED
  COMPLETED
}

model Organization {
  id              String         @id @default(uuid())
  name            String
  slug            String         @unique
  isSystemTenant  Boolean        @default(false)
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  users           User[]
  teams           Team[]
  gameSessions    GameSession[]
  wordBanks       WordBank[]
  questionDecks   QuestionDeck[]

  @@index([slug])
}

model User {
  id                 String         @id @default(uuid())
  email              String         @unique
  passwordHash       String
  role               Role           @default(TEAM_MEMBER)
  mustChangePassword Boolean        @default(false)
  emailVerified      DateTime?
  locale             String         @default("pl")
  organizationId     String
  createdAt          DateTime       @default(now())
  updatedAt          DateTime       @updatedAt

  organization       Organization   @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  profile            UserProfile?
  refreshTokens      RefreshToken[]
  teamMemberships    TeamMember[]
  hostedSessions     GameSession[]  @relation("SessionHost")
  scoreRecords       ScoreRecord[]

  @@index([email])
  @@index([organizationId])
}

model UserProfile {
  id              String   @id @default(uuid())
  userId          String   @unique
  displayName     String
  chameleonColor  String   @default("#06B6D4") // Default Cyber Teal
  chameleonSecondary String @default("#3B82F6")
  chameleonAccent String   @default("#10B981")
  avatarState     String   @default("idle")
  updatedAt       DateTime @updatedAt

  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model RefreshToken {
  id          String   @id @default(uuid())
  hashedToken String   @unique
  userId      String
  revoked     Boolean  @default(false)
  expiresAt   DateTime
  createdAt   DateTime @default(now())

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model Team {
  id              String         @id @default(uuid())
  name            String
  organizationId  String
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  organization    Organization   @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  members         TeamMember[]
  gameSessions    GameSession[]

  @@index([organizationId])
}

model TeamMember {
  id        String   @id @default(uuid())
  teamId    String
  userId    String
  role      Role     @default(TEAM_MEMBER)
  joinedAt  DateTime @default(now())

  team      Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([teamId, userId])
  @@index([teamId])
  @@index([userId])
}

model GameSession {
  id              String            @id @default(uuid())
  roomCode        String            @unique
  organizationId  String
  teamId          String?
  hostId          String
  currentGameType GameType          @default(RYSOWANIE)
  status          GameSessionStatus @default(LOBBY)
  settings        Json              // Rounds, drawTime, language, custom settings
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  organization    Organization      @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  team            Team?             @relation(fields: [teamId], references: [id], onDelete: SetNull)
  host            User              @relation("SessionHost", fields: [hostId], references: [id])
  drawingActions  DrawingAction[]
  scoreRecords    ScoreRecord[]
  bingoTiles      BingoTile[]

  @@index([roomCode])
  @@index([organizationId])
}

model DrawingAction {
  id            String      @id @default(uuid())
  sessionId     String
  roundNumber   Int
  turnNumber    Int
  drawerId      String
  actionType    String      // STROKE, FILL, CLEAR
  payload       Json        // Points array, color, brush size, coordinates
  createdAt     DateTime    @default(now())

  session       GameSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId, roundNumber, turnNumber])
}

model WordBank {
  id              String       @id @default(uuid())
  organizationId  String
  name            String
  locale          String       @default("pl")
  category        String       // Nature, Everyday, Tech, Leadership
  difficulty      String       // Easy, Medium, Hard
  words           String[]
  isGlobal        Boolean      @default(false)
  createdAt       DateTime     @default(now())

  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId, locale])
}

model QuestionDeck {
  id              String       @id @default(uuid())
  organizationId  String
  gameType        GameType
  name            String
  locale          String       @default("pl")
  items           Json         // Array of localized dilemma/question objects
  isGlobal        Boolean      @default(false)
  createdAt       DateTime     @default(now())

  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId, gameType, locale])
}

model ScoreRecord {
  id          String      @id @default(uuid())
  sessionId   String
  userId      String?
  guestName   String?
  gameType    GameType
  points      Int         @default(0)
  createdAt   DateTime    @default(now())

  session     GameSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  user        User?       @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([sessionId, gameType])
}

model BingoTile {
  id             String      @id @default(uuid())
  sessionId      String
  participantId  String
  row            Int
  col            Int
  traitText      String
  verifiedByPeer String?
  isCompleted    Boolean     @default(false)
  createdAt      DateTime    @default(now())

  session        GameSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@unique([sessionId, participantId, row, col])
  @@index([sessionId, participantId])
}
```

### 9.1 Model-Aware Tenant Scoping Architecture
The multi-tenant isolation layer uses a dedicated Prisma Client extension (`prisma.$extends`) that intercepts query execution based on each entity's structural relationship to the tenant:
1. **Direct Tenant Models** (`User`, `Team`, `GameSession`):
   Every query automatically injects `where: { organizationId: currentOrgId }`.
2. **Global Fallback Models** (`WordBank`, `QuestionDeck`):
   Queries automatically evaluate:
   `where: { OR: [{ organizationId: currentOrgId }, { isGlobal: true }] }`
   This allows organizations to utilize default system-wide word banks and icebreaker prompt decks alongside their privately uploaded collections.
3. **Relational Indirect Tenant Models** (`DrawingAction`, `ScoreRecord`, `BingoTile`):
   Because these models do not contain a redundant `organizationId` foreign key, tenancy is strictly enforced through their parent session relation:
   `where: { session: { organizationId: currentOrgId } }`.
4. **Team Memberships** (`TeamMember`):
   Enforces tenancy through the parent team: `where: { team: { organizationId: currentOrgId } }`.
5. **Unscoped Bypass Client (`prismaUnscoped`)**:
   Exported strictly for auth authentication lookups (e.g. resolving a user by email during login prior to establishing session context) and superadmin management. All application and game routes consume the tenant-scoped client.
6. **Cross-Tenant Mutation Validation**:
   Mutation endpoints (such as assigning users to teams) assert that both the team and user belong to the active tenant (`targetUser.organizationId === team.organizationId`).

---

## 10. Step-by-Step Execution Phases & Milestones

### Phase 1: Foundation, Design System & Parametric Chameleon (Milestone 1)
- **Scope**: Project scaffold, Tailwind setup, design tokens, responsive typography, parametric SVG chameleon mascot, dynamic theming engine with WCAG auto-contrast.
- **Deliverables**:
  1. Next.js 14 App Router project scaffold with TypeScript and Tailwind CSS.
  2. Design token system for Light and Dark modes (`src/styles/globals.css`).
  3. Parametric SVG Chameleon Mascot component (`src/components/mascot/ChameleonMascot.tsx`) with 4 recolorable layers and 5 animation states.
  4. `ThemeProvider` injecting `--chameleon-primary` and computing contrast text color.
- **Verification Gate**:
  - Theme customizer updates CSS custom properties in real-time.
  - Mascot renders smoothly with crisp vector lines at 4K and mobile viewports.
  - Automated contrast validator confirms $\ge 4.5:1$ contrast across all 6 presets.

### Phase 2: Multi-Tenancy, Security & Admin Accommodation (Milestone 2)
- **Scope**: PostgreSQL database schema, Prisma migrations, Argon2id authentication, HttpOnly cookies, RBAC middleware, and accommodation of `tyberiusz.wylon@gmail.com`.
- **Deliverables**:
  1. Complete Prisma schema with tenant scoping middleware (`prisma.$extends`).
  2. Argon2id password hashing utility and dual-token JWT auth engine.
  3. Automated idempotent seeding script (`prisma/seed.ts`) configuring `tyberiusz.wylon@gmail.com` with one-time bootstrap activation token and zero plaintext secrets.
  4. First-run `/setup` wizard (auto-disabled once initial user exists).
  5. Multi-tenant admin dashboard (`/[locale]/dashboard`) for organization and team management.
- **Verification Gate**:
  - Static code scan confirms zero plaintext passwords in source control.
  - Admin login authenticates securely with Argon2id and sets `HttpOnly` `Secure` cookies.
  - Multi-tenant query tests verify Organization A cannot read Organization B records.

### Phase 3: Trilingual Internationalization & Content Banks (Milestone 3)
- **Scope**: `next-intl` configuration for Polish (`pl`), English (`en`), and Ukrainian (`uk`), dictionary seed data, and diacritic-tolerant fuzzy matching.
- **Deliverables**:
  1. App Router `[locale]` routing middleware and UI language switcher pill.
  2. UI message catalogs (`messages/pl.json`, `en.json`, `uk.json`) with complete translation key parity.
  3. Drawing game word bank (Easy, Medium, Hard tiers) in PL, EN, and UK.
  4. 300+ curated icebreaker prompts across all 6 activity modules.
  5. Diacritic-tolerant text normalization and Levenshtein distance calculator.
- **Verification Gate**:
  - Key parity test passes with zero missing keys across PL, EN, and UK catalogs.
  - Unit tests verify fuzzy matcher triggers "is close!" for Polish/Ukrainian typos.

### Phase 4: "Rysowanie" Real-Time Multiplayer Drawing Game (Milestone 4)
- **Scope**: HTML5 2D Canvas engine, scanline stack flood fill, WebSocket server, 25ms micro-batching, room state machine, word selection, hints, and scoring.
- **Deliverables**:
  1. $1200 \times 900$ canonical HTML5 canvas with quadratic Bézier smoothing and 26-color palette.
  2. Iterative scanline stack flood fill on `Uint32Array` with tolerance 32.
  3. Socket.io real-time server with room routing, heartbeat ping/pong, and late-join action replay.
  4. Complete turn lifecycle: 15s word choice, drawing timer, hints schedule, 30s timer acceleration, solvers-only chat isolation.
  5. Time-decay guesser and participation drawer scoring formulas.
- **Verification Gate**:
  - 10-player simulated WebSocket room benchmarks $\le 40$ packets/sec per drawer.
  - Flood fill completes in $<15\text{ms}$ on mobile client without edge leaks or halos.
  - Late-joining client re-renders identical canvas snapshot from action history.

### Phase 5: Youth Integration Activity Hub (Milestone 5)
- **Scope**: Implementation of 6 dedicated youth integration games and unified workshop carousel.
- **Deliverables**:
  1. *Dwie prawdy i kłamstwo*: Statement cards, secret voting, 3D flip animation, bluff scoring.
  2. *To czy Tamto*: 12s dilemma voting, split bar graph, chameleon avatar sorting, outlier detection.
  3. *Wspólna Historia*: Circular queue turn loop, word/sentence modes, twist injection, story export.
  4. *Gorące Krzesło*: 3-tier question decks, audience upvoting queue, pass lifeline.
  5. *Quiz Drużynowy*: Superlative grid voting, animated podium reveal, printable hall of fame.
  6. *Bingo Integracyjne*: Dynamic 4x4/5x5 grid generation, peer confirmation modal, line check.
  7. Workshop Orchestrator: Activity switcher carousel, persistent room codes, aggregated scoreboard.
- **Verification Gate**:
  - Facilitator switches from "Rysowanie" to "Bingo" within the same room without disconnecting peers.
  - Peer verification modal in Bingo reliably triggers two-way WebSocket acknowledgment.
  - Story chain compiles clean Markdown file for download.

### Phase 6: End-to-End Verification, Performance & Security Audit (Milestone 6)
- **Scope**: Comprehensive test automation, security penetration check, performance benchmarking, and production readiness.
- **Deliverables**:
  1. Playwright end-to-end test suite simulating multiplayer rooms across all 7 games.
  2. OWASP Top 10 security audit checklist verification (XSS, CSRF, JWT validation, SQL injection).
  3. Mobile/tablet touch responsiveness audit (iOS Safari, Android Chrome).
  4. Final deployment runbook and administrative documentation.
- **Verification Gate**:
  - E2E tests achieve 100% pass rate.
  - Lighthouse performance score $\ge 90$ on desktop and mobile.
  - Zero critical/high vulnerability findings in npm security audit.

---

## 11. Testing & Verification Methodology

### 11.1 Automated Test Suites

```
tests/
├── unit/
│   ├── auth/
│   │   ├── argon2-hashing.test.ts         # Verifies Argon2id parameters (m=64MB, t=3, p=4) via @node-rs/argon2
│   │   └── jwt-cookies.test.ts            # Verifies token expiration, HttpOnly, and SameSite flags
│   ├── theming/
│   │   └── contrast-maximization.test.ts  # Proves CR >= 4.5:1 across all 6 presets & validates crossover at Y <= 0.179
│   ├── canvas/
│   │   ├── flood-fill.test.ts             # Benchmarks scanline fill, Uint8Array bitmask, and Delta E <= 32 termination
│   │   ├── coordinate-clamping.test.ts    # Tests boundary clamping [0..1199, 0..899] and zero-dimension guards
│   │   └── bezier-smoothing.test.ts       # Tests quadratic curve interpolation across pointer samples
│   ├── games/
│   │   ├── scoring-smoothing.test.ts      # Verifies continuous elapsed-time scaling (no 49% cliff) & drawer zero-guard
│   │   ├── hint-scheduling.test.ts        # Tests K_effective bounding min(K, floor((L-1)/2)) & dynamic 30s reschedule
│   │   ├── homoglyph-matching.test.ts     # Tests Cyrillic/Latin homoglyphs ('а' vs 'a') & Ukrainian phoneme preservation
│   │   └── bluff-bonus.test.ts            # Verifies normalized bluff bonus round(200 * N_fooled / N_peers) <= 200 pts
│   ├── security/
│   │   └── profanity-filter.test.ts       # Tests trilingual PL, EN, UK vulgarity masking and prompt deck rejection
│   └── i18n/
│       └── parity.test.ts                 # Confirms translation key parity across pl.json, en.json, uk.json
├── integration/
│   ├── multi-tenant-scoping.test.ts       # Validates model-aware Prisma tenant scoping & global asset fallback
│   ├── admin-seed.test.ts                 # Validates SEED_ADMIN_EMAIL, temp password, and idempotent bootstrap
│   ├── setup-concurrency.test.ts          # Validates atomic serializable transaction lock eliminating TOCTOU in /setup
│   ├── websocket-rate-limiting.test.ts    # Tests 4 msgs/2s token bucket, 40 stroke packets/s, and 200ms fill cooldown
│   ├── duplicate-guess.test.ts            # Verifies suppression of identical guesses (>2 within 3 seconds)
│   └── websocket-handshake.test.ts        # Tests cookie auth, guest token creation, and guest room pinning
└── e2e/
    ├── rysowanie-multiplayer.spec.ts      # Multi-client live drawing, guessing, solvers chat, and scoring
    └── activity-hub-carousel.spec.ts      # Facilitator game switching across all 6 games & session scoreboard
```

### 11.2 Independent Verification Checklist for Auditors
1. **Plaintext Credential Audit**:
   ```powershell
   Get-ChildItem -Path c:\Users\tyber\teambonding -Recurse -File | Select-String -Pattern "tyberiusz.*password|password\s*=\s*['\"][^'\"]+['\"]"
   ```
   *Expected Result*: Zero occurrences found in workspace (only audit test patterns and requirement citations).
2. **Argon2id Parameter Check**: Verify memory cost $\ge 64\text{ MB}$, iterations $\ge 3$, parallelism $\ge 4$, zero-compile native execution via `@node-rs/argon2`.
3. **Contrast Maximization Mathematical Proof**:
   ```powershell
   $py = "C:\Users\tyber\AppData\Roaming\uv\python\cpython-3.12-windows-x86_64-none\python.exe"
   @'
   def srgb_to_lin(c): c /= 255.0; return c/12.92 if c <= 0.03928 else ((c+0.055)/1.055)**2.4
   def lum(h):
       r,g,b = [int(h.lstrip("#")[i:i+2], 16) for i in (0,2,4)]
       return 0.2126*srgb_to_lin(r) + 0.7152*srgb_to_lin(g) + 0.0722*srgb_to_lin(b)
   def cr(l1, l2): return (max(l1,l2)+0.05)/(min(l1,l2)+0.05)
   presets = [("#06B6D4","Teal"),("#FF6B4A","Coral"),("#7C3AED","Indigo"),("#10B981","Green"),("#EC4899","Pink"),("#F59E0B","Amber")]
   for h, name in presets:
       l = lum(h); chosen = "#FFFFFF" if l <= 0.179 else "#0F172A"
       c = cr(l, lum(chosen))
       print(f"{name} ({h}): Lum={l:.4f} -> Chose {chosen} CR={c:.2f}:1 -> {'PASS' if c>=4.5 else 'FAIL'}")
   '@ | & $py
   ```
   *Expected Result*: All 6 presets output `PASS` ($\ge 4.5:1$).
4. **Flood Fill Loop Immunity Check**:
   Confirm dedicated `visited = new Uint8Array(1200 * 900)` bitmask and little-endian ABGR packing `(A << 24) | (B << 16) | (G << 8) | R`.
5. **Word Hint Bounding & Rescheduling Check**:
   Confirm $K_{effective} = \min(K, \lfloor (L - 1) / 2 \rfloor)$ and dynamic 30s acceleration redistribution across remaining window.
6. **Canvas Geometry & Clamping Check**:
   Confirm CSS container `max-width: calc(100vh * 4 / 3); max-height: 100%; aspect-ratio: 4 / 3;` and coordinate clamping to $[0..1199, 0..899]$.
7. **Ukrainian Phoneme Preservation & Homoglyphs Check**:
   Confirm `і, ї, є` are preserved without lossy phonetic mapping, and Latin/Cyrillic homoglyphs (`а` $\leftrightarrow$ `a`) are mapped during comparison.
8. **WebSocket Rate Limiting & Duplicate Suppression**:
   Confirm token bucket (4 msgs / 2s), stroke batching (40 packets/s), 200ms fill cooldown, and suppression of identical guesses $\ge 2$ within 3s.
9. **No Code Rule**: Confirm no application source code files (`src/`, `prisma/`) were created prior to plan approval.

---

## 12. Conclusion & Next Steps

This Master Implementation Plan provides a complete, exhaustive, and actionable architectural blueprint for **Team bonding Liderzy Jutra**. Upon review and user approval of this document, execution will commence immediately with Phase 1 (Foundation, Design System & Parametric Chameleon Mascot) under strict adherence to the project standards and zero-shortcuts integrity mandate.
