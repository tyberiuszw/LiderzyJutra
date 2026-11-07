# Comprehensive Architectural Survey & Specification Report: Youth Integration Activities, Multi-Tenancy Authentication & Trilingual i18n

**Author**: Explorer 3 (Integration & Architecture Explorer)  
**Target Milestone**: Survey & Architectural Design (Phase 0)  
**Working Directory**: `c:\Users\tyber\teambonding\.agents\teamwork\teamwork_explorer_survey_3\`  
**Target Delivery Path**: `c:\Users\tyber\teambonding\.agents\teamwork\teamwork_explorer_survey_3\handoff.md`  
**Reference Document**: `c:\Users\tyber\teambonding\.agents\teamwork\ORIGINAL_REQUEST.md`  
**Date**: 2026-11-06  

---

## 1. Direct Observations

### 1.1 Project & Workspace Context
1. **Workspace State**: `c:\Users\tyber\teambonding` is currently a clean workspace containing only `.agents/teamwork/` metadata (`Get-ChildItem -Path c:\Users\tyber\teambonding -Force` returned only `.agents`). No application source code exists yet.
2. **Mandate Compliance**: Under requirement `R1` in `ORIGINAL_REQUEST.md`, *"In accordance with user requirements, no application code modifications may be made before the plan is approved."* All output from this phase must remain exclusively in `.agents/teamwork/teamwork_explorer_survey_3/`.
3. **Core Requirements Directives from `ORIGINAL_REQUEST.md`**:
   - **R2 (Auth & Multi-tenancy)**: *"Plan authentication and organization management supporting admin accounts that can create organizations and add team members. Support multiple admin accounts so different teams can use the application independently. Ensure the admin account (tyberiusz.wylon@gmail.com) is accommodated securely: admin credentials must never be stored in plain text in the codebase, but handled securely via password hashing or environment variable seeding."*
   - **R3 (Activities & Drawing)**: *"Plan a dedicated multiplayer drawing game operating like skribbl.io named 'Rysowanie' within the dashboard. Conduct research to identify top online youth integration activities, games, and icebreaker questions, and integrate them as options within the application dashboard."*
   - **R4 (i18n & Theming)**: *"Specify full trilingual support for Polish, English, and Ukrainian (i18n). The user interface must be modern, minimalist, and very simple to use, with support for dark and light themes. Brand the application with the Liderzy Jutra chameleon mascot, allowing users to customize chameleon colors, which dynamically adapt accent colors across selected UI elements."*

### 1.2 Program & Domain Target Analysis
- **Program Identity**: "Liderzy Jutra" is a nationwide non-profit educational and civic initiative operating across Poland (promoted via `liderzyjutra.com` and partner civic institutions), dedicated to youth, high school students, university students, and young changemakers (ages ~14–25). Core competencies focus on future skills, ethical leadership, AI literacy, and collaborative teamwork.
- **Demographic Reality**: Youth teams in Poland are multilingual and intercultural, with a significant proportion of Ukrainian youth integrated into schools, NGOs, and leadership academies alongside Polish peers, while English serves as the cross-border and international project language (e.g. Erasmus+, civic hackathons).

---

## 2. Logic Chain & Architectural Synthesis

### 2.1 Component A: Curated Youth Integration Activities & Icebreaker Games

To provide a cohesive team-bonding suite that complements the real-time drawing game ("Rysowanie"), the platform implements a unified **Activity Hub** containing six curated integration games. Each activity is designed specifically for youth psychological safety, rapid onboarding (no friction), high engagement, and scalable group sizes (4 to 50+ participants).

```
┌────────────────────────────────────────────────────────────────────────┐
│                   LIDERZY JUTRA ACTIVITY HUB                          │
├─────────────────┬──────────────────────┬───────────────────────────────┤
│ "Rysowanie"     │ Social Deduction &   │ Rapid Decisions &             │
│ (Drawing Game)  │ Self-Expression:     │ Team Chemistry:               │
│ Skribbl-style   │ • Dwie Prawdy i...   │ • To czy Tamto (Dilemmas)     │
│ canvas & chat   │ • Gorące Krzesło     │ • Bingo Integracyjne          │
│                 │ • Quiz Drużynowy     │ • Wspólna Historia            │
└─────────────────┴──────────────────────┴───────────────────────────────┘
```

#### Activity 1: "Dwie prawdy i kłamstwo" (Two Truths and a Lie)
- **Objective**: Break interpersonal barriers, unveil unexpected hobbies and achievements, and challenge stereotypes in a playful social deduction format.
- **Player Count**: 3–30 players.
- **Round Duration**: 2–3 minutes per active player.
- **Game Flow & Interaction Mechanics**:
  1. **Lobby & Queue**: Facilitator opens the activity. Players are placed in a presentation queue.
  2. **Submission Phase (Asynchronous/Private)**: Each player receives a modal with three input fields labeled Statement A, B, and C. They mark exactly one radio button designating the "Lie" (`kłamstwo`). A "Potrzebujesz inspiracji?" (Need inspiration?) drawer provides suggestions categorized by: *Niezwykłe hobby*, *Podróże i wpadki*, *Szkoła i projekty*, *Zwierzęta i dziwne talenty*.
  3. **Stage / Spotlight Phase**: The active player is put "Na scenie" (On Stage). Their three statements are displayed to all other players as interactive, unrevealed cards.
  4. **Voting Window (Synchronous Timer: 30s)**: Guessers secretly tap card A, B, or C. Votes remain hidden to prevent bandwagon effect. The active player sees a counter of locked votes (`7/10 zagłosowało`).
  5. **Dramatic Reveal**: Active player clicks "Odkryj prawdę" (or timer expires). A 3D CSS card-flip animation (`transform: rotateY(180deg)`) executes. The Lie glows vibrant ruby red with a cross icon; the two Truths glow emerald green with checkmarks.
  6. **Points & Scoring Engine**:
     - Guessers: +100 points for correctly identifying the Lie.
     - Active Player (Bluff Bonus): +50 bonus points for every peer they successfully fooled.
     - "Mistrz blefu" (Master of Bluff) badge awarded if 100% of peers guessed incorrectly.
  7. **Micro-Debrief Trigger**: A 20-second open audio/chat cooldown allows the active player to briefly share the story behind their most surprising truth.

#### Activity 2: "To czy Tamto" / "Kto woli co?" (This or That / Would You Rather)
- **Objective**: High-energy warm-up, spark lighthearted debates, visualize group preferences, and highlight shared cultural/daily habits.
- **Player Count**: 2–100+ players.
- **Round Duration**: 20–30 seconds per dilemma; 10–15 dilemmas per session.
- **Game Flow & Interaction Mechanics**:
  1. **Prompt Presentation**: A split-screen UI presents Option A (Left, styled with Chameleon Primary) vs Option B (Right, styled with Chameleon Secondary).
  2. **Fast-Action Voting (Synchronous Timer: 12s)**: Participants tap either side. Instant keyboard shortcuts (Left Arrow / Right Arrow or 1 / 2) allow instant response.
  3. **Real-Time Visual Breakdown**: Once votes lock, the screen animates into a split percentage bar (e.g. `68% vs 32%`). Small chameleon avatar pills representing each player smoothly animate and group into the respective side they chose.
  4. **Outlier Detection ("Jedyny Wybraniec")**: The engine automatically detects solitary or minority voters (e.g., *"Kacper jest jedyną osobą w pokoju, która wybrała wstawać o 5:00 rano!"*) and awards a playful "Buntownik / Indywidualista" (Rebel) badge.
  5. **Discussion Prompt**: The facilitator can click "Zapytaj mniejszość" (Ask the minority) to spotlight the outlier in chat/audio.
- **Curated Dilemma Decks**:
  - *Tech & Future*: AI pisze za Ciebie wypracowania CZY Ty piszesz wszystko ręcznie, ale masz 6.0?
  - *Daily Youth*: Zarywanie nocek na Discordzie CZY wstawanie o 5:30 na wschód słońca?
  - *Social*: Przemawiać przed 500 osobami bez przygotowania CZY spędzić tydzień bez smartfona?
  - *Absurd*: Zawsze musieć mówić rymem CZY przy każdym wejściu do pokoju robić ukłon teatralny?

#### Activity 3: "Wspólna Historia" (Story Chain / Word-by-Word)
- **Objective**: Foster creative collaboration, mutual listening, improv "Yes, And..." thinking, and generate spontaneous inside jokes for the team.
- **Player Count**: 3–20 players.
- **Round Duration**: 5–10 minutes total.
- **Game Flow & Interaction Mechanics**:
  1. **Genre & Starter Selection**: Facilitator selects a theme (e.g., *Sci-Fi w Warszawie 2045*, *Przygoda z Kameleonem*, *Nocny Hackathon*, *Tajemnica Szkolnego Stycznika*). The system provides an initial sentence starter.
  2. **Turn-Taking Loop**: Players take turns in a dynamic circular queue.
     - *Mode A (Word-by-Word)*: Each player has 6 seconds to type exactly 1 word. Auto-space is added.
     - *Mode B (Sentence-by-Sentence)*: Each player has 20 seconds to write 1 complete sentence continuing the story.
  3. **Blind Improv vs Full Story**:
     - *Full Transparency Mode*: Players see the entire evolving paragraph.
     - *Memory/Blind Mode*: Players only see the previous 3 words / last sentence, creating surreal comedy when read in full at the end.
  4. **Twist Injection Cards (Facilitator Wildcard)**: Every 5 turns, the facilitator can trigger a "Zwrot Akcji" (Plot Twist) event (e.g., *"W tym momencie gaśnie światło w całym mieście..."* or *"Nagle z szafy wyskakuje gigantyczny kameleon..."*), which the next player must integrate.
  5. **Grand Finale & Export**: The system compiles the full story, displays it with typewriter animation, generates an automated word count and funny team title (e.g. "Kronika Zielonego Hackathonu"), and allows 1-click download as Markdown or PDF.

#### Activity 4: "Gorące Krzesło / Pytania do Lidera" (Hot Seat / Icebreaker Q&A)
- **Objective**: Deeper peer recognition, empathy building, leadership style reflection, and personal storytelling in a psychologically safe environment.
- **Player Count**: 3–30 players.
- **Round Duration**: 2–4 minutes per spotlighted player.
- **Game Flow & Interaction Mechanics**:
  1. **Hot Seat Spotlight**: One volunteer or elected member enters "Gorące Krzesło". Their chameleon avatar pulses at the center of the UI.
  2. **Tiered Question Deck Architecture**:
     - **Poziom 1 (Lekki / Fun)**: Lighthearted, icebreaker questions to warm up. (e.g. *"Gdyby Twoje życie miało soundtrack, jaki utwór leciałby w tle?"*).
     - **Poziom 2 (Osobisty / Wartości)**: Stories, dreams, quirks, and life lessons. (e.g. *"Jaka była najlepsza rada, jaką w życiu usłyszałeś od mentora lub przyjaciela?"*).
     - **Poziom 3 (Liderski / Refleksja)**: Youth leadership, teamwork ethics, handling failure, vision for the future. (e.g. *"Jaka była Twoja największa zespołowa wpadka i czego Cię nauczyła o współpracy?"*).
  3. **Audience Participation & Upvoting**: While the hot seat occupant is answering, other members can submit custom questions in real-time or upvote questions from the public pool. Top-voted questions float to the top of the queue.
  4. **Psychological Safety "Koło Ratunkowe" (Pass/Skip Lifeline)**: The occupant has an explicit, judgment-free "Pas / Następne pytanie" button. Youth participants are never forced into discomfort.

#### Activity 5: "Quiz Drużynowy / Kto w Drużynie..." (Team Superlatives & Trivia)
- **Objective**: Celebrate individual team strengths, build positive camaraderie, recognize unique talents, and create lasting team awards.
- **Player Count**: 4–50 players.
- **Round Duration**: 30 seconds per superlative; 8–12 superlatives per game.
- **Game Flow & Interaction Mechanics**:
  1. **Superlative Prompt**: System displays a superlative prompt (e.g. *"Kto w drużynie najszybciej stworzy działający startup AI?"*, *"Kto ma najbardziej zorganizowany kalendarz na świecie?"*, *"Kto uratowałby nas na bezludnej wyspie?"*).
  2. **Secret Ballot Voting**: A grid of all active room participants' names and avatars is displayed. Each player casts a secret vote for one peer (self-voting can be enabled or disabled by facilitator).
  3. **Dramatic Podium Reveal**: An animated podium counts down votes: 3rd place, 2nd place, and 1st place champion. Confetti bursts in the winner's custom chameleon accent color.
  4. **Team Superlatives Gallery**: At the end of the game, a downloadable "Księga Pamiątkowa Drużyny" (Team Hall of Fame) summarizes each member's elected title with badges.

#### Activity 6: "Bingo Integracyjne" (Human / Networking Bingo)
- **Objective**: Encourage bilateral conversations, speed networking, discovery of shared and surprising experiences across the team.
- **Player Count**: 6–60+ players.
- **Duration**: 10–15 minutes total.
- **Game Flow & Interaction Mechanics**:
  1. **Dynamic Grid Generation**: Each participant receives a unique, randomized 4x4 or 5x5 grid generated from a curated pool of 60+ youth traits and experiences.
  2. **Speed Mingling / Chat Interaction**: Participants interact via audio breakout rooms or in-game chat to discover who matches which square.
  3. **Claim & Verification Flow**:
     - Player clicks a square (e.g. *"Mówi płynnie w 3 językach"*).
     - A dropdown lists room members. Player selects "Olena".
     - Olena receives a subtle in-app confirmation notification: *"Czy potwierdzasz, że mówisz płynnie w 3 językach?"* [Tak / Nie].
     - Once confirmed, the tile stamps with Olena's miniature chameleon icon and turns green.
  4. **Win Condition & Audit**:
     - First player to complete a horizontal, vertical, or diagonal line triggers "BINGO!" fanfare.
     - Facilitator view displays the completed line with the verified peer names for a quick, celebratory 1-minute recap.

#### 2.1.2 Dashboard Architecture: Unified Activity Hub
The dashboard is structured so that any organization or team leader can orchestrate an entire integration workshop from a single unified control room:
1. **Activity Switcher Carousel**: Facilitator can transition from "Rysowanie" to "To czy Tamto" to "Bingo" without tearing down the WebSocket room, regenerating room codes, or forcing members to re-join.
2. **Persistent Room Code & QR**: Persistent 6-character room codes (`LJ-XXXX`) and direct join links (`teambonding.liderzyjutra.pl/join/LJ-XXXX`).
3. **Aggregated Team Scoreboard**: Points earned across "Rysowanie" (drawing guesses) and integration games ("Dwie prawdy", "To czy Tamto") aggregate into an optional shared session scoreboard.
4. **Facilitator Host Controls**:
   - Quick mute / chat lock
   - Skip turn / Kick disruptive guest
   - Custom content deck injection (e.g. upload custom JSON question decks for a specific school or camp).

---

### 2.2 Component B: Multi-Tenancy, Authentication & Administration Architecture

#### 2.2.1 Multi-Tenant Hierarchy Model
The multi-tenant architecture supports complete isolation between diverse youth organizations, educational foundations, school councils, and independent youth project teams:

```
Platform (Global Superadmin)
   │
   └── Organization / Tenant (Org Admin) ── [e.g. "Liderzy Jutra - Fundacja", "LO im. Staszica"]
         │
         ├── Teams / Spaces (Team Leader / Facilitator) ── [e.g. "Zespół Projektowy AI", "Rada Samorządu"]
         │     │
         │     └── Game Sessions / Rooms ── [Live Drawing / Icebreakers]
         │           │
         │           └── Participants (Members + Ephemeral Guests)
         │
         └── Organization Settings & Analytics (Branding overrides, Members directory)
```

#### 2.2.2 Role-Based Access Control (RBAC) Matrix

| Permission / Action | Superadmin | Org Admin | Team Leader / Facilitator | Team Member | Guest (Room Code) |
|---|:---:|:---:|:---:|:---:|:---:|
| Manage Platform Settings & Orgs | **Yes** | No | No | No | No |
| Create New Organizations | **Yes** | No | No | No | No |
| Manage Org Profile & Billing/Limits | **Yes** | **Yes** | No | No | No |
| Invite / Remove Facilitators & Members | **Yes** | **Yes** | No | No | No |
| Create Teams & Workspaces | **Yes** | **Yes** | **Yes** | No | No |
| Launch / Terminate Game Sessions | **Yes** | **Yes** | **Yes** | No | No |
| Facilitate / Moderate Active Games | **Yes** | **Yes** | **Yes** | No | No |
| Upload Custom Question / Word Decks | **Yes** | **Yes** | **Yes** | No | No |
| Participate in Games & Vote | **Yes** | **Yes** | **Yes** | **Yes** | **Yes** |
| Customize Persistent Chameleon Avatar | **Yes** | **Yes** | **Yes** | **Yes** | Ephemeral only |
| View Organization Historical Analytics | **Yes** | **Yes** | Team-only | Self-only | No |

#### 2.2.3 Secure Accommodation of Initial Admin (`tyberiusz.wylon@gmail.com`)
**Critical Security Mandate**: In strict compliance with requirement `R2`, credentials for `tyberiusz.wylon@gmail.com` must **never** be hardcoded in plaintext within the source code, version control commits, mock fixtures, or docker images.

##### Concrete Bootstrapping & Seeding Architecture:
1. **Password Hashing Standard**:
   - **Algorithm**: **Argon2id** (OWASP recommended gold standard, RFC 9106, hybrid resistant to GPU cracking and side-channel timing attacks).
   - **Cryptographic Parameters**:
     - Memory Cost ($m$): $65,536 \text{ KiB}$ ($64 \text{ MiB}$)
     - Time Cost / Iterations ($t$): $3$ iterations
     - Parallelism ($p$): $4$ threads
     - Salt: 16 bytes cryptographically secure pseudo-random bytes (`crypto.randomBytes(16)`), stored with hash.
   - *Fallback*: bcrypt with work factor $\ge 12$ if native Argon2 bindings are constrained on specific host runtimes.

2. **Environment Variable Configuration (`.env.example` vs `.env.production`)**:
   - The repository tracks only `.env.example` with zero secrets:
     ```env
     # System Admin Seed Configuration (No plaintext passwords committed)
     SEED_ADMIN_EMAIL="tyberiusz.wylon@gmail.com"
     SEED_ADMIN_PASSWORD_HASH=""
     SEED_ADMIN_INITIAL_TEMP_PASSWORD=""
     JWT_ACCESS_SECRET="CHANGE_ME_IN_PRODUCTION_MIN_32_BYTES"
     JWT_REFRESH_SECRET="CHANGE_ME_IN_PRODUCTION_MIN_32_BYTES"
     ```

3. **Multi-Mode Idempotent Bootstrap Mechanism**:
   - **Mode 1: Automated Production Seeding Script (`scripts/bootstrap-admin.ts`)**:
     ```typescript
     // Idempotent execution during initial container deployment / database migration
     import { PrismaClient } from '@prisma/client';
     import argon2 from 'argon2';
     import crypto from 'crypto';

     const prisma = new PrismaClient();

     async function bootstrapInitialAdmin() {
       const adminEmail = process.env.SEED_ADMIN_EMAIL || 'tyberiusz.wylon@gmail.com';
       const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

       if (existingAdmin) {
         console.log(`[Bootstrap] Admin account ${adminEmail} already provisioned. Skipping.`);
         return;
       }

       let passwordHash: string;
       let isTemporary = false;

       if (process.env.SEED_ADMIN_PASSWORD_HASH) {
         passwordHash = process.env.SEED_ADMIN_PASSWORD_HASH;
       } else if (process.env.SEED_ADMIN_INITIAL_TEMP_PASSWORD) {
         passwordHash = await argon2.hash(process.env.SEED_ADMIN_INITIAL_TEMP_PASSWORD, {
           type: argon2.argon2id,
           memoryCost: 65536,
           timeCost: 3,
           parallelism: 4
         });
         isTemporary = true;
       } else {
         // Generate a secure one-time bootstrap activation token
         const tempToken = crypto.randomBytes(24).toString('base64url');
         passwordHash = await argon2.hash(tempToken, {
           type: argon2.argon2id,
           memoryCost: 65536,
           timeCost: 3,
           parallelism: 4
         });
         isTemporary = true;
         console.warn(`================================================================`);
         console.warn(`[SECURITY ALERT] Initial Superadmin Provisioned!`);
         console.warn(`Email: ${adminEmail}`);
         console.warn(`One-Time Activation Password: ${tempToken}`);
         console.warn(`You MUST log in and change this password immediately!`);
         console.warn(`================================================================`);
       }

       // Create Root Platform Organization and Superadmin User
       const rootOrg = await prisma.organization.upsert({
         where: { slug: 'liderzy-jutra-hq' },
         update: {},
         create: {
           name: 'Liderzy Jutra HQ',
           slug: 'liderzy-jutra-hq',
           isSystemTenant: true
         }
       });

       await prisma.user.create({
         data: {
           email: adminEmail,
           passwordHash,
           role: 'SUPERADMIN',
           mustChangePassword: isTemporary,
           organizationId: rootOrg.id,
           emailVerified: new Date(),
           profile: {
             create: {
               displayName: 'Tyberiusz Wylon (Platform Admin)',
               chameleonColor: '#00E676' // Signature Liderzy Jutra Neon Green
             }
           }
         }
       });

       console.log(`[Bootstrap] Successfully created Superadmin account for ${adminEmail}.`);
     }
     ```

   - **Mode 2: First-Run Setup Wizard (`/setup`)**:
     - If `await prisma.user.count() === 0`, navigating to `/setup` allows setting the initial credentials for `tyberiusz.wylon@gmail.com` via a secure HTTPS UI form.
     - Once the initial user is created, `/setup` is permanently disabled at the middleware routing level (returning `404 Not Found`).

4. **Session & Token Management**:
   - **Dual-Token Architecture**:
     - *Access Token*: Short-lived JWT (15-minute expiration), stored in an `HttpOnly`, `Secure`, `SameSite=Lax` cookie (`tb_access_token`). Contains `{ userId, orgId, role, sessionVersion }`.
     - *Refresh Token*: Long-lived token (30-day expiration), stored in an `HttpOnly`, `Secure`, `SameSite=Strict` cookie (`tb_refresh_token`). A hashed representation is stored in the database `RefreshToken` table with automatic token rotation (old refresh token invalidated upon renewal to protect against token theft).
   - **WebSocket Handshake Authentication**:
     - Socket.io connection handshake intercepts the `Cookie` header, validates the `tb_access_token` JWT, and decorates the socket instance with verified user identity: `socket.data.user = { id, email, role, orgId, chameleonColor }`.
     - Unauthenticated guests entering via room code are issued a signed ephemeral guest session cookie (`tb_guest_token`) containing `{ guestId, nickname, roomId, chameleonColor }`, enabling full game participation without database clutter.

5. **Multi-Tenant Data Isolation Strategy**:
   - **Shared Database with Scoped Row-Level Isolation**:
     - All tenant-dependent entities (`Team`, `Session`, `WordBank`, `QuestionDeck`, `GameHistory`) contain a mandatory foreign key `organizationId`.
     - Prisma Client extension (`prisma.$extends`) automatically injects `where: { organizationId: context.orgId }` into all CRUD operations, eliminating accidental data cross-contamination between different schools or organizations.

---

### 2.3 Component C: Internationalization (i18n) Architecture

#### 2.3.1 Trilingual Rationale: Polish (PL), English (EN), Ukrainian (UK)
1. **Polish (`pl`)**: Primary platform language. Essential for Polish youth, high school student councils, civic clubs, and local communities.
2. **Ukrainian (`uk`)**: Vital for civic inclusion and integration. Poland hosts hundreds of thousands of Ukrainian students and youth who actively participate in school programs, community hackathons, and youth leadership projects. Providing native Ukrainian UI and prompts establishes dignity, belonging, and psychological safety.
3. **English (`en`)**: International lingua franca for youth exchanges, European leadership projects (Erasmus+, Euroscola), technology competitions, and multinational student teams.

#### 2.3.2 Localization Engine & Next.js App Router Structure
The platform utilizes **`next-intl`** integrated with the Next.js App Router for zero-bundle-overhead server rendering and rapid client interactivity.

##### Directory & File Organization:
```text
teambonding/
├── messages/
│   ├── pl.json                   # Polish UI strings
│   ├── en.json                   # English UI strings
│   ├── uk.json                   # Ukrainian UI strings
│   └── content/
│       ├── words.pl.json         # Drawing word bank (PL)
│       ├── words.en.json         # Drawing word bank (EN)
│       ├── words.uk.json         # Drawing word bank (UK)
│       ├── icebreakers.pl.json   # 6 Activity prompt banks (PL)
│       ├── icebreakers.en.json   # 6 Activity prompt banks (EN)
│       └── icebreakers.uk.json   # 6 Activity prompt banks (UK)
├── src/
│   ├── i18n/
│   │   ├── routing.ts            # Locales definition (pl, en, uk), default: pl
│   │   ├── request.ts            # Request-scoped messages loader
│   │   └── navigation.ts         # Localized Link, useRouter, redirect
│   ├── middleware.ts             # Locale detection (cookie -> Accept-Language -> default)
│   └── app/
│       └── [locale]/
│           ├── layout.tsx        # Injects NextIntlClientProvider & lang attribute
│           ├── (auth)/
│           └── dashboard/
```

##### Routing Configuration (`src/i18n/routing.ts`):
```typescript
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['pl', 'en', 'uk'],
  defaultLocale: 'pl',
  localePrefix: 'as-needed', // Hides /pl/ for default Polish, shows /en/ and /uk/
  domains: []
});

export type Locale = (typeof routing.locales)[number];
```

##### Resilient Fallback Strategy:
- When a translation key is missing in Ukrainian (`uk`), the loader falls back to Polish (`pl`), and subsequently to English (`en`).
- A custom type-safe message lookup utility ensures the application **never crashes or displays raw empty keys** in production.

#### 2.3.3 Localized Word Banks for "Rysowanie" (Drawing Game)
To support fair, multilingual gameplay, the drawing game provides rich dictionaries categorized by difficulty tier and semantic theme:

##### Structure & Categorization:
- **Difficulty Tiers**:
  - `Easy` (Łatwy / Легкий / Easy): Common physical objects, basic animals, simple foods (4–6 letters).
  - `Medium` (Średni / Середній / Medium): Actions, complex tools, compound nouns, popular culture concepts.
  - `Hard` (Trudny / Складний / Hard): Abstract concepts, leadership metaphors, modern technologies (AI, neural networks), idioms.
- **Thematic Packs**:
  - `Everyday & School` (Szkoła i codzienność)
  - `Nature & Animals` (Przyroda i zwierzęta)
  - `Tech & Future Skills` (Technologia i AI)
  - `Leadership & Teamwork` (Liderzy i współpraca)

##### Representative Tri-lingual Word Samples:

| Category & Difficulty | Polish (`pl`) | Ukrainian (`uk`) | English (`en`) |
|---|---|---|---|
| **Easy / Animals** | Kameleon, Kot, Pingwin, Żyrafa | Хамелеон, Кіт, Пінгвін, Жирафа | Chameleon, Cat, Penguin, Giraffe |
| **Easy / Objects** | Rakieta, Smartfon, Plecak, Most | Ракета, Смартфон, Рюкзак, Міст | Rocket, Smartphone, Backpack, Bridge |
| **Medium / Actions** | Burza mózgów, Gotowanie, Taniec | Мозковий штурм, Кулінарія, Танець | Brainstorming, Cooking, Dancing |
| **Medium / Tech** | Robot, Dron, Klawiatura, Bateria | Робот, Дрон, Клавіатура, Батарея | Robot, Drone, Keyboard, Battery |
| **Hard / Leadership** | Porozumienie, Synergia, Kompas | Взаєморозуміння, Синергія, Компас | Agreement, Synergy, Compass |
| **Hard / AI & Future** | Sztuczna inteligencja, Algorytm, Kosmos | Штучний інтелект, Алгоритм, Космос | Artificial Intelligence, Algorithm, Cosmos |

##### Forgiving Guess Matching & Diacritics Normalization:
- In fast-paced chat guessing, diacritics and typos shouldn't penalize players unfairly.
- The matching algorithm normalizes incoming chat strings:
  - Polish: converts `ą, ć, ę, ł, ń, ó, ś, ź, ż` to base Latin or compares both normalized and raw.
  - Ukrainian: normalizes Cyrillic Unicode variants (e.g. apostrophe `’` vs `'`, `ґ` vs `г`, `є`, `і`, `ї`).
  - Whitespace & punctuation stripped before comparison.
  - Near-miss detection: Levenshtein distance $\le 1$ triggers a private encouragement toast: *"Jesteś bardzo blisko!" / "Ти дуже близько!" / "You are very close!"*.

#### 2.3.4 Localized Question & Prompt Banks for Icebreakers
The platform includes 300+ pre-compiled prompts distributed across the 6 activities, authored with cultural resonance for youth in PL, EN, and UK:

##### Sample Localized Activity Prompts:

```json
{
  "activities": {
    "this_or_that": {
      "dilemma_1": {
        "pl": { "optionA": "Praca w zespole nad wielkim projektem", "optionB": "Samodzielna realizacja małego zadania" },
        "uk": { "optionA": "Командна робота над великим проєктом", "optionB": "Самостійне виконання невеликого завдання" },
        "en": { "optionA": "Working in a team on a huge project", "optionB": "Working alone on a small task" }
      },
      "dilemma_2": {
        "pl": { "optionA": "Generatywne AI planuje Twój tydzień", "optionB": "Pełna spontaniczność i zero planów" },
        "uk": { "optionA": "Генеративний ШІ планує твій тиждень", "optionB": "Повна спонтанність і жодних планів" },
        "en": { "optionA": "Generative AI plans your entire week", "optionB": "Total spontaneity and zero planning" }
      }
    },
    "hot_seat": {
      "level1_fun": {
        "pl": "Gdybyś mógł zamienić się miejscami z jedną postacią z filmu na 24h, kto by to był?",
        "uk": "Якби ти міг помінятися місцями з одним кіногероєм на 24 години, хто б це був?",
        "en": "If you could trade places with any movie character for 24 hours, who would it be?"
      },
      "level3_leadership": {
        "pl": "Jaka była najważniejsza lekcja, jaką wyciągnąłeś z projektu, który zakończył się niepowodzeniem?",
        "uk": "Який найважливіший урок ти виніс(-ла) з проєкту, який завершився невдачею?",
        "en": "What was the most important lesson you learned from a project that didn't go as planned?"
      }
    },
    "human_bingo": {
      "trait_1": {
        "pl": "Mówi płynnie w więcej niż dwóch językach",
        "uk": "Вільно спілкується більш ніж двома мовами",
        "en": "Speaks more than two languages fluently"
      },
      "trait_2": {
        "pl": "Prowadził kiedyś prezentację lub warsztat przed grupą",
        "uk": "Мав(-ла) досвід проведення презентації або воркшопу перед групою",
        "en": "Has facilitated a presentation or workshop in front of an audience"
      },
      "trait_3": {
        "pl": "Napisał chociaż jedną linijkę kodu lub prompt do AI",
        "uk": "Написав(-ла) хоча б один рядок коду або промпт для ШІ",
        "en": "Has written at least one line of code or an AI prompt"
      }
    }
  }
}
```

#### 2.3.5 UI Language Switching, Date & Relative Time Formatting
1. **Chameleon Header Language Pill**:
   - Clean, accessible pill dropdown in the top navigation: `[ 🇵🇱 PL | 🇬🇧 EN | 🇺🇦 UK ]`.
   - Switching triggers a non-reloading state update in client components and sets the `NEXT_LOCALE` cookie.
   - For authenticated users, the selected language preference is automatically synced to `User.locale` in PostgreSQL.
2. **Date, Time & Number Formatting**:
   - Integrated with standard `Intl.DateTimeFormat` and `Intl.RelativeTimeFormat`.
   - Relative timestamps (e.g. chat messages, game records) display naturally:
     - PL: *"przed chwilą"*, *"3 minuty temu"*, *"wczoraj o 18:30"*
     - UK: *"щойно"*, *"3 хвилини тому"*, *"вчора о 18:30"*
     - EN: *"just now"*, *"3 minutes ago"*, *"yesterday at 6:30 PM"*

---

## 3. Caveats & Assumptions

1. **Database Runtime**: It is assumed that PostgreSQL (with Prisma ORM or Drizzle) will be the primary relational data store. The Argon2id hashing implementation relies on the `argon2` npm package which provides native binaries, with standard fallback to bcrypt.
2. **WebSocket Infrastructure**: While Explorer 2 investigates WebSocket/Socket.io transport protocols, the auth model defined herein assumes the WebSocket handshake can inspect standard HTTP `Cookie` headers. If running on cross-origin setups (e.g. separate standalone WS server), CORS and `withCredentials: true` must be strictly configured.
3. **Translation Volume**: Complete human translations for hundreds of icebreaker prompts will be bundled as initial seed files in `messages/content/`. Additional packs can later be added dynamically by Org Admins via the database.
4. **No Code Modifications**: In strict adherence to user instructions, no application code files have been created in `src/` or `app/`. All architecture definitions are preserved here in `handoff.md` for inclusion in the master implementation plan.

---

## 4. Conclusion & Actionable Recommendations

1. **Integration Activities Recommendation**:
   - The platform should deploy the 6 documented youth games alongside "Rysowanie" inside a unified **Activity Hub**.
   - Implementing a shared state-machine loop (`LOBBY` $\rightarrow$ `PROMPT` $\rightarrow$ `SECRET_ACTION` $\rightarrow$ `REVEAL` $\rightarrow$ `POINTS` $\rightarrow$ `COOLDOWN`) across all activities minimizes code duplication and unifies UX.
2. **Multi-Tenancy & Auth Recommendation**:
   - Adopt a multi-tenant hierarchy (`Platform` $\rightarrow$ `Organization` $\rightarrow$ `Team` $\rightarrow$ `Room`) with discriminator columns (`organizationId`) and Prisma middleware scoping.
   - For `tyberiusz.wylon@gmail.com`: Deploy the dual-mode idempotent seed script using OWASP-compliant **Argon2id**. Never commit passwords to git. Enforce `mustChangePassword: true` on initial login.
   - Utilize HttpOnly session cookies for both Web HTTP requests and WebSocket handshakes.
3. **Trilingual i18n Recommendation**:
   - Deploy `next-intl` with Polish (`pl`) as primary default, English (`en`), and Ukrainian (`uk`) for comprehensive regional inclusivity.
   - Equip "Rysowanie" with categorized, difficulty-tiered tri-lingual word banks with diacritic-tolerant fuzzy matching.
   - Provide comprehensive tri-lingual prompt banks for all icebreaker games.

---

## 5. Verification Method

To independently verify the recommendations and requirements in this survey:

1. **Plaintext Credential Scan**:
   Run an automated check to verify that no plaintext passwords exist in any configuration or environment files:
   ```powershell
   Get-ChildItem -Path c:\Users\tyber\teambonding -Recurse -File | Select-String -Pattern "tyberiusz.*password|password\s*=\s*['\"][^'\"]+['\"]"
   ```
   *Expected Result*: Zero occurrences found in workspace.
2. **Argon2id Parameter Compliance**:
   Verify against OWASP Cheat Sheet standards:
   - Memory $\ge 19 \text{ MiB}$ (recommended $64 \text{ MiB}$), Iterations $\ge 2$ (recommended $3$), Parallelism $\ge 1$ (recommended $4$).
3. **Trilingual Locale Coverage Check**:
   Once translation files are staged in Phase 1, run a key-parity verification script to ensure all keys in `pl.json` exist in `en.json` and `uk.json`:
   ```bash
   node scripts/verify-i18n-parity.js
   ```
4. **WebSocket Handshake Auth Verification**:
   Verify that Socket.io handshake middleware extracts `tb_access_token` from cookies and rejects connections without a valid signed JWT.
