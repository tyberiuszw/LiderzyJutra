# Technical Implementation Roadmap & Architecture Report: Milestone 5
## Youth Integration Activity Hub (6 Multiplayer Modules + Unified Room Orchestrator)

---

## 1. Observation

Direct code and environment observations:

### 1.1 Server Infrastructure (`src/server/`)
- **`src/server/types.ts`**:
  - `GameType` is defined as:
    ```typescript
    export type GameType = "RYSOWANIE" | "TWO_TRUTHS" | "THIS_OR_THAT" | "STORY_CHAIN" | "HOT_SEAT" | "QUIZ_SUPERLATIVES" | "HUMAN_BINGO";
    ```
  - However, all other interfaces (`RysowanieRoomState`, `ClientToServerEvents`, `ServerToClientEvents`) are tightly coupled solely to `RYSOWANIE`:
    - `RysowanieRoomState` lines 92–115 defines only drawing phases (`LOBBY | WORD_SELECTION | DRAWING | TURN_INTERMISSION | GAME_OVER`), `currentDrawerId`, `canvasHistory`, `hintPattern`.
    - `ClientToServerEvents` lines 121–137 only defines canvas strokes, fills, clear, undo, select word, start, join, leave.
    - Sockets do not have events for switching games, submitting statements, voting on dilemmas, writing stories, answering hot seats, superlative nominations, or bingo claims.
- **`src/server/rooms/room-manager.ts`**:
  - Line 14: `private rooms: Map<string, RysowanieGameSession> = new Map();`
  - Line 25: `getOrCreateRoom(roomCode, hostId, ...): RysowanieGameSession`
  - The in-memory room manager assumes every room is strictly a `RysowanieGameSession`. Switching games within the same room code (`LJ-XXXX`) is not yet supported at the manager layer.
- **`src/server/socket-server.ts`**:
  - Line 128: `socket.on("room:join", ...)` binds sockets to Socket.io room `roomCode`.
  - Line 139: Instantiates `session = roomManager.getOrCreateRoom(upperRoomCode, socket.data.userId, ...)`.
  - Line 190: `socket.on("game:start", ...)` directly invokes `session.startGame()`.
  - Disconnect cleanup (lines 391–401) removes player from `RysowanieGameSession`.

### 1.2 Localized Prompt Dictionaries (`messages/content/icebreakers.*.json`)
Inspection across `messages/content/icebreakers.{pl,en,uk}.json` reveals 100% key and count parity:
- **`two_truths`**: 8 curated themes + 2 complete sample card sets with `statements` and `lieIndex`.
- **`this_or_that`**: 10 dilemma items with `category` (`tech`, `lifestyle`, `leadership`, `humor`), `optionA`, `optionB`.
- **`story_chain`**: 4 genre starters (Sci-Fi 2045 with green chameleon, midnight hackathon, mysterious Tatra valley, space station) + 5 plot twist wildcards ("ZWROT AKCJI...").
- **`hot_seat`**: 24 questions across 3 tiers (8 `tier1_fun`, 8 `tier2_values`, 8 `tier3_leadership`).
- **`quiz_superlatives`**: 15 superlative prompts.
- **`human_bingo`**: Exactly 60 diverse youth/team traits in each language (`pl`: 60, `en`: 60, `uk`: 60).

### 1.3 UI Shell (`src/app/room/[code]/page.tsx`)
- Lines 142–165: When `roomState && roomState.phase !== "LOBBY"`, renders `<RysowanieGame ... />` unconditionally.
- Lines 260–277: Host can only click `Rozpocznij Grę` (which starts Rysowanie). No activity selector or carousel exists yet.
- Lines 280–337: Settings panel only configures Rysowanie settings (`rounds`, `drawTime`, `language`).

### 1.4 Mascot Assets
- `src/components/mascot/chameleonLogoPaths.ts` contains the exact official vectorized paths (`CHAMELEON_LOGO_VIEWBOX`, `CHAMELEON_BODY_PATH`, `CHAMELEON_STAR_FILL_PATH`, `CHAMELEON_STAR_OUTLINE_PATH`, `CHAMELEON_SCLERA_PATH`, `CHAMELEON_PUPIL_PATH`).
- `src/components/mascot/ChameleonMascot.tsx` renders the 4-layer parametric SVG with animated states (`idle`, `drawing`, `thinking`, `celebrate`, `urgent`).
- **Constraint Verified**: Both files must remain 100% untouched.

### 1.5 Database Schema & Persistence (`prisma/schema.prisma`)
- `GameType` enum contains all 7 games: `RYSOWANIE`, `TWO_TRUTHS`, `THIS_OR_THAT`, `STORY_CHAIN`, `HOT_SEAT`, `QUIZ_SUPERLATIVES`, `HUMAN_BINGO`.
- `GameSession` has `currentGameType` (default `RYSOWANIE`), `status` (`LOBBY | ACTIVE | PAUSED | COMPLETED`), `settings Json`.
- `ScoreRecord` tracks points per player, session, and `gameType`.
- `BingoTile` exists for storing claimed/verified tiles.
- All 235 existing unit/integration tests pass in Vitest with zero errors.

---

## 2. Logic Chain

1. **Persistent Room Identity & Socket Continuity**:
   - Because youth teams join via a single shared room link (`/room/LJ-XXXX`), disconnecting sockets or regenerating room codes when switching games breaks team momentum, causes mobile reconnect dropouts, and loses guest player state.
   - Sockets must remain joined to Socket.io room `LJ-XXXX`.
   - The server must wrap active games inside a `UnifiedRoomSession` that maintains:
     - Persistent room code (`LJ-XXXX`)
     - Persistent player registry (`Record<string, Player>`)
     - Session-wide aggregated scoreboard (`Record<string, { total: number; byGame: Record<GameType, number> }>`)
     - Current active game type (`currentGameType`)
     - Active game state machine instance (`activeGameSession`).

2. **Fair Cross-Game Leaderboard Parity**:
   - In "Rysowanie", players earn up to 500 points per round.
   - If "Dwie Prawdy i Kłamstwo" awarded a flat +50 pts per fooled peer, a 30-player room would grant up to $29 \times 50 = 1,450\text{ pts}$ to a single bluffer, creating massive distortion on the aggregated session leaderboard.
   - Therefore, the Bluff Bonus must be normalized:
     $$S_{bluff} = \text{round}\left(200 \times \frac{N_{fooled}}{N_{peers}}\right) \le 200\text{ pts}$$
     Where $N_{peers} = \max(1, N_{room\_players} - 1)$ and $N_{fooled} = \text{count of peers voting for a Truth}$.
     - Correct guessers receive $+100$ pts.
     - Maximum possible points for an actor in one round is 200 pts, perfectly balancing it alongside Rysowanie and the other integration games.

3. **Psychological Safety in Youth Activities**:
   - For *Gorące Krzesło* (Hot Seat Q&A), teenagers and young leaders must feel safe to participate without peer pressure or embarrassment.
   - An explicit, shame-free "Pas / Następne pytanie" lifeline must be present at all times.
   - Invoking "Pas" triggers zero point penalty, advances immediately to the next question, and presents reassuring chameleon encouragement.

4. **Human Bingo Verification Protocol**:
   - To prevent unilateral fraudulent tile claiming in *Bingo Integracyjne*, a claim must require two-way peer verification:
     1. Player A clicks tile $(r, c)$ associated with Peer B.
     2. Server emits `bingo:verify_request` to Peer B.
     3. Peer B receives a modal dialog: *"Czy potwierdzasz, że [cecha]? (Pyta: Player A)"*.
     4. Only upon Peer B's approval does Player A's tile flip to emerald green with Peer B's avatar and checkmark.
   - Line check evaluates 4 directions (horizontal, vertical, main diagonal, anti-diagonal) to trigger room-wide "BINGO!" celebration.

---

## 3. Detailed Architecture Specifications

### 3.1 Unified Room Orchestrator Architecture

#### Class: `UnifiedRoomSession` (`src/server/rooms/room-manager.ts`)
```typescript
export interface SessionScoreData {
  total: number;
  byGame: Record<GameType, number>;
}

export interface UnifiedRoomState {
  roomCode: string;
  hostId: string;
  currentGameType: GameType;
  phase: "LOBBY" | "IN_GAME" | "GAME_OVER";
  players: Record<string, Player>;
  sessionScores: Record<string, SessionScoreData>;
  settings: RoomSettings;
  // Specific game states (populated depending on currentGameType)
  rysowanieState?: RysowanieRoomState;
  twoTruthsState?: TwoTruthsRoomState;
  thisOrThatState?: ThisOrThatRoomState;
  storyChainState?: StoryChainRoomState;
  hotSeatState?: HotSeatRoomState;
  quizSuperlativesState?: QuizSuperlativesRoomState;
  humanBingoState?: HumanBingoRoomState;
}
```

#### Lifecycle Methods on `UnifiedRoomSession`:
- `switchGame(newGameType: GameType)`:
  - Destroys or pauses previous game instance timers.
  - Updates `currentGameType = newGameType`.
  - Sets `phase = "LOBBY"` or immediately starts game loop based on host choice.
  - Syncs localized prompts from `messages/content/icebreakers.{locale}.json`.
  - Broadcasts unified state sync to room `io.to(roomCode).emit("room:unified_state_sync", state)`.
- `addSessionScore(playerId: string, gameType: GameType, points: number)`:
  - Updates `sessionScores[playerId].byGame[gameType] += points`.
  - Updates `sessionScores[playerId].total += points`.
  - Updates `players[playerId].score += points`.
  - Asynchronously creates a `ScoreRecord` in Prisma.

---

### 3.2 State Machines, Rules & Scoring for the 6 Integration Modules

#### Module 1: *Dwie Prawdy i Kłamstwo* (`TwoTruthsSession`)
- **Phases**: `LOBBY` $\to$ `SUBMISSION` $\to$ `VOTING (30s)` $\to$ `REVEAL (3D Flip)` $\to$ `ROUND_RECAP` $\to$ `GAME_OVER`.
- **Card Submission**: Active player enters statements $S_0, S_1, S_2$ and specifies `lieIndex \in {0, 1, 2}`. Validated via `cleanText()` profanity filter.
- **Voting**: Peers select $v \in \{0, 1, 2\}$.
- **Card Reveal**: 3D CSS flip:
  ```css
  .card-inner {
    transform-style: preserve-3d;
    transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .card-flipped {
    transform: rotateY(180deg);
  }
  ```
  - `isLie === true`: Red glow (`bg-rose-500/20 border-rose-500 text-rose-300`), icon `<X className="w-6 h-6 text-rose-400" />`.
  - `isLie === false`: Green glow (`bg-emerald-500/20 border-emerald-500 text-emerald-300`), icon `<Check className="w-6 h-6 text-emerald-400" />`.
- **Scoring**:
  - Guessers who picked $v == lieIndex$: $+100$ pts.
  - Active Player Bluff Bonus:
    $$S_{bluff} = \text{round}\left(200 \times \frac{N_{fooled}}{N_{peers}}\right)$$
    Where $N_{fooled} = \sum [v_i \ne lieIndex]$, $N_{peers} = \max(1, N_{room\_players} - 1)$. Capped at 200 pts.

#### Module 2: *To czy Tamto* (`ThisOrThatSession`)
- **Phases**: `DILEMMA_ACTIVE` $\to$ `VOTING (12s)` $\to$ `ANIMATED_RESULTS (8s)` $\to$ `NEXT_DILEMMA`.
- **Deck**: Loaded from `messages/content/icebreakers.{lang}.json` (`this_or_that` array, 10 dilemmas per round).
- **Split Animation**:
  - Animated progress bar showing Option A vs Option B with gradient styling:
    $$P_A = \text{round}\left(\frac{N_A}{N_A + N_B} \times 100\right)\%, \quad P_B = 100\% - P_A$$
  - Avatars smoothly animate to left or right sides using Framer Motion `layoutId`.
- **Outlier Badge ("Jedyny Wybraniec")**:
  - If $N_A == 1$ and $N_B \ge 3$, that single player is awarded the "Jedyny Wybraniec" badge with celebratory gold border.
  - If $N_B == 1$ and $N_A \ge 3$, the single player on B receives the badge.
- **Scoring**: $+20$ pts per vote cast on time; $+50$ bonus pts for "Jedyny Wybraniec".

#### Module 3: *Wspólna Historia* (`StoryChainSession`)
- **Phases**: `SETUP` $\to$ `TURN_ACTIVE` $\to$ `WILDCARD_ALERT` $\to$ `FINALE_REVEAL`.
- **Turn Modes**:
  - `SENTENCE` mode: 20 seconds per turn, up to 150 characters.
  - `WORD` mode: 6 seconds per turn, 1 single word.
- **Turn Queue**: Circular linked array of active players.
- **Plot Twist Wildcards**:
  - Every 5 turns, server injects a wildcard starter:
    *"ZWROT AKCJI: [losowy wildcard z icebreakers.{lang}.json]"*
  - Wildcard banner displays with pulse animation for all players.
- **Finale & Story Export**:
  - Typewriter animation sequentially reveals the paragraphs.
  - Contributor attribution (author avatar + name chip above each segment).
  - 1-Click Export to Markdown (`.md`) and plain text (`.txt`) via `Blob` and `URL.createObjectURL`.
- **Scoring**: $+50$ pts per contributed sentence/word; $+50$ bonus pts for integrating wildcard.

#### Module 4: *Gorące Krzesło* (`HotSeatSession`)
- **Phases**: `SELECTION` $\to$ `QUESTION_PICK` $\to$ `ANSWERING` $\to$ `NEXT_SPEAKER`.
- **Spotlight**: Active member's chameleon is centered in UI with glowing animated aura (`state="thinking"`).
- **3 Depth Tiers**:
  - Tier 1: Fun & Icebreaker (8 questions)
  - Tier 2: Stories & Values (8 questions)
  - Tier 3: Leadership & Reflection (8 questions)
- **Audience Queue & Upvoting**:
  - Audience members submit custom questions; others upvote via `hotseat:upvote_question`.
  - Questions are sorted dynamically: $\text{score} = \text{upvotes} \times 10 + \text{recency}$.
- **Psychological Safety "Pas" Lifeline**:
  - Host or hot-seat player can click `Pas (Następne Pytanie)`.
  - Zero penalty; immediately advances without pressure.
- **Scoring**: $+100$ pts to active speaker per question addressed; $+30$ pts to author of chosen audience question.

#### Module 5: *Quiz Drużynowy / Kto w Drużynie...* (`QuizSuperlativesSession`)
- **Phases**: `PROMPT_ACTIVE` $\to$ `VOTING (30s)` $\to$ `PODIUM_COUNTDOWN` $\to$ `HALL_OF_FAME`.
- **Superlative Prompts**: 15 curated awards from `quiz_superlatives`.
- **Voting**: Interactive peer avatar grid where players vote for a teammate.
- **Podium Countdown Reveal**:
  - 3rd place champion animates onto bronze pedestal.
  - 2nd place champion animates onto silver pedestal.
  - 1st place champion animates onto gold pedestal with chameleon mascot celebrate state (`state="celebrate"`) and confetti.
- **Księga Pamiątkowa (Team Hall of Fame)**:
  - Generates downloadable team yearbook card with each member's superlative titles.
- **Scoring**: $+20$ pts for voting; $+30$ pts per vote received from peers.

#### Module 6: *Bingo Integracyjne* (`HumanBingoSession`)
- **Grid Generation**:
  - 4x4 (16 tiles) or 5x5 (25 tiles with central "FREE SPACE").
  - Shuffled from the 60 localized traits in `icebreakers.{lang}.json`.
  - Deterministic PRNG seeded by `(roomCode + playerId)` ensures unique cards per player.
- **Peer Verification Workflow**:
  ```
  Player A                 Server                 Player B (Target)
     │                       │                           │
     ├─ Claim Tile (r,c) ───►│                           │
     │  target: Player B     ├─ bingo:verify_request ───►│
     │                       │  (claimId, trait, reqA)   │
     │                       │                           │ [Modal: "Czy potwierdzasz?"]
     │                       │◄── bingo:verify_response ─┤ [Tak / Nie]
     │                       │   (approved: true)        │
     │◄─ bingo:tile_verified ┼──────────────────────────►│
     │  (tile green, B icon) │                           │
  ```
- **Line Win Condition**:
  - Evaluates rows $0 \dots N-1$, cols $0 \dots N-1$, main diagonal ($r=c$), anti-diagonal ($r = N-1-c$).
  - When line complete: triggers `bingo:line_completed` with mascot celebration and fanfare!
- **Scoring**: $+50$ pts per verified tile; $+250$ pts for completing a line (BINGO).

---

### 3.3 Activity Switcher Carousel & UI Layout Plan

1. **Activity Carousel Component (`src/components/games/ActivityCarousel.tsx`)**:
   - Visual cards for all 7 games with:
     - Game icon (Palette, Lock/Key, Scale, BookOpen, Flame, Trophy, Grid)
     - Title in active language (PL, EN, UK)
     - Recommended player count & duration tags (e.g. `3–30 graczy • 15 min`)
     - Short description of the activity
     - "Rozpocznij" button (enabled for host)
   - Rendered in Room Lobby and accessible to the Host during any active game via a top-bar dropdown.

2. **Aggregated Scoreboard Modal (`src/components/games/SessionScoreboardModal.tsx`)**:
   - Displays all participants ranked by cumulative session score.
   - Expandable breakdown per game:
     - 🎨 Rysowanie pts
     - 🤫 Dwie Prawdy pts
     - ⚖️ To czy Tamto pts
     - 📖 Wspólna Historia pts
     - 🔥 Gorące Krzesło pts
     - 🏆 Quiz Drużynowy pts
     - 🎯 Bingo Integracyjne pts
   - "Zakończ Warsztat i Pokaż Wielkie Podium" button for facilitator.

3. **Room Shell Integration (`src/app/room/[code]/page.tsx`)**:
   - Dynamically renders active game based on `roomState.currentGameType`:
     - `"RYSOWANIE"` $\to$ `<RysowanieGame />`
     - `"TWO_TRUTHS"` $\to$ `<TwoTruthsGame />`
     - `"THIS_OR_THAT"` $\to$ `<ThisOrThatGame />`
     - `"STORY_CHAIN"` $\to$ `<StoryChainGame />`
     - `"HOT_SEAT"` $\to$ `<HotSeatGame />`
     - `"QUIZ_SUPERLATIVES"` $\to$ `<QuizSuperlativesGame />`
     - `"HUMAN_BINGO"` $\to$ `<HumanBingoGame />`
   - Persistent room header bar contains:
     - Liderzy Jutra Chameleon icon
     - Room Code badge (`LJ-XXXX`) with 1-click copy
     - Host Activity Switcher button
     - Workshop Scoreboard trigger button
     - Connected players counter & status indicator

---

## 4. Caveats
1. **Network Disconnects during Bingo Verification**:
   - If Peer B goes offline or disconnects before responding to a verification modal, the pending claim could remain hanging.
   - *Mitigation*: The claim request must include a 45-second timeout, after which it expires gracefully with a notification: *"Twój partner nie odpowiedział na czas. Spróbuj zapytać kogoś innego!"*.
2. **Room Host Migration**:
   - If the room host leaves while in an active integration game, the room manager must automatically transfer host privileges to the oldest connected participant to avoid locking the game controls.
3. **Mascot SVG Paths**:
   - Under no circumstances should `chameleonLogoPaths.ts` or `ChameleonMascot.tsx` be edited. Any mascot customizations in the new game views must be achieved strictly by passing props (`state`, `size`, `colors`) to `<ChameleonMascot />`.

---

## 5. Conclusion
Milestone 5 is architecturally clear and ready for immediate implementation by Worker M5:
- **Prompt dictionaries**: 100% complete and validated across PL, EN, and UK in `messages/content/icebreakers.{pl,en,uk}.json`.
- **Mathematical scoring**: Normalized bluff bonus ($S_{bluff} \le 200$), dilemma participation, story wildcards, hot seat audience upvotes, superlative peer nominations, and bingo line bonuses ensure perfect leaderboard parity.
- **Orchestration**: Sockets stay pinned to room code `LJ-XXXX` while the host switches games seamlessly.
- **Mascot**: Official Liderzy Jutra chameleon vector paths remain completely preserved.

---

## 6. Verification Method

### 6.1 Automated Test Suites to Run
To verify Milestone 5 after implementation:
```powershell
$env:Path = "C:\Program Files\nodejs;$env:Path"
npm.cmd test -- --run
```
Expected: All existing 235 unit/integration tests must continue to pass, alongside newly added M5 unit and integration test suites:
- `tests/unit/games/two-truths-scoring.test.ts` (verifies $S_{bluff} = \text{round}(200 \times N_{fooled} / N_{peers}) \le 200$)
- `tests/unit/games/this-or-that-stats.test.ts` (verifies split % and outlier detection)
- `tests/unit/games/story-chain.test.ts` (verifies turn circular queue, markdown export)
- `tests/unit/games/human-bingo-line.test.ts` (verifies row, col, diagonal detection on 4x4 and 5x5)
- `tests/integration/unified-room-orchestrator.test.ts` (verifies seamless game switching without disconnects)

### 6.2 TypeScript Compilation Check
```powershell
$env:Path = "C:\Program Files\nodejs;$env:Path"
npm.cmd run typecheck
```
Must pass with zero TypeScript diagnostics or errors.

### 6.3 Mascot File Integrity Check
```powershell
git status -- src/components/mascot/chameleonLogoPaths.ts src/components/mascot/ChameleonMascot.tsx
```
Must show `clean` (0 modifications).
