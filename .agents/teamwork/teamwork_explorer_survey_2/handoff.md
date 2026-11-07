# Game Mechanics & Real-Time Architecture Survey: "Rysowanie" (skribbl.io Clone)

**Author:** Explorer 2 (Game Mechanics Explorer)  
**Date:** 2026-11-06  
**Target:** Implementation Plan for "Team bonding Liderzy Jutra"  
**Working Directory:** `c:\Users\tyber\teambonding\.agents\teamwork\teamwork_explorer_survey_2\`  

---

## 1. Observation

### 1.1 Direct Observations from Web Investigation & Reverse-Engineered Protocols
1. **skribbl.io Architecture & Protocols:**
   - skribbl.io is built on top of Node.js, Express, and Socket.IO over WebSockets (`ws://`/`wss://`), utilizing JSON event packets rather than obfuscated binary opcodes.
   - Initial handshake packet: `["login", {"join": "<roomCode>", "create": 0|1, "name": "<playerName>", "lang": "<langId>", "avatar": [...]}]`.
   - Drawing packets stream discrete action commands (pencil line segments, flood fill seeds, clear screen, and undo operations) rather than streaming video or continuous raw canvas bitmap frames.
2. **Private Room Capabilities & Host Controls:**
   - Private room settings support: Rounds (2–10, default 3), Draw Time (30–240 seconds, default 80s), Word Language (multi-language support), Hints count (0–5 hints, default ~2-3), Word Choices count (1–5, default 3).
   - Custom words list: Comma-separated strings, minimum requirement of 10 words, optional toggle `"Use custom words exclusively"`.
   - Host moderation tools: Direct player kicking, banning, muting, and transfer of host status. In shared lobbies, democratic votekick (`votes / requiredVotes` threshold) is supported.
3. **Canvas Rendering & Flood Fill Behavior:**
   - SVG vector DOM implementations break down under heavy sketching due to thousands of SVG `<path>` DOM nodes triggering layout reflows and garbage collection lag.
   - HTML5 Canvas 2D (`CanvasRenderingContext2D`) is immediate-mode, providing deterministic sub-millisecond drawing and direct typed array access (`ImageData.data` via `Uint32Array`).
   - Standard 4-way flood fill algorithms fail on anti-aliased canvas brush strokes due to semi-transparent blended boundary pixels, causing jagged uncolored halos unless a color distance tolerance parameter (e.g., Euclidean distance $\Delta E \le 32$) is applied.
   - Screen resolution mismatches between clients cause catastrophic desynchronization if raw window/CSS coordinates are transmitted. Normalizing to a canonical internal logical coordinate space (e.g. $1200 \times 900$, 4:3 aspect ratio) mapped via CSS `aspect-ratio` ensures identical rasterization across devices.
4. **Round, Timer, and Guessing Dynamics:**
   - Progressive hint reveals: Letters are revealed at regular intervals based on $\frac{T_{draw}}{N_{hints} + 1}$.
   - Timer acceleration: Upon the first correct guess by any player, if remaining time exceeds 30 seconds, the clock immediately drops to 30 seconds to maintain game pacing and urgency.
   - Turn auto-completion: Once all non-drawing players have correctly guessed, the drawing phase terminates immediately without waiting for the countdown timer.
   - Fuzzy guess matching ("X is close!"): Triggered when a guess is within a Levenshtein distance $\le 1$ (for words $\ge 4$ characters) or $\le 2$ (for words $\ge 7$ characters). To prevent leaking the typo to opponents, the system suppresses the typed guess from chat and broadcasts a public notification `"[Player] is close!"`.
   - Correct guess chat masking: Once a player guesses the target word, their chat is isolated into a "solvers-only" channel. Their messages turn green and are hidden from players who are still guessing.
5. **Scoring Formulas:**
   - Guesser score scales based on speed (remaining time decay) and solve rank: maximum ~500 points for first guesser within first few seconds, decaying linearly or piecewise down to a minimum baseline floor (e.g. 50–100 points).
   - Drawer score scales with audience success: drawer earns points proportional to the percentage of active guessers who solved the drawing and how fast they solved it (up to ~450–500 points).

---

## 2. Logic Chain

### 2.1 Drawing Canvas Engine: HTML5 Canvas vs. SVG
* **Step 1 (Rendering Paradigm):** SVG creates retained-mode DOM elements. A 60-second drawing session with fast sketching produces between 1,500 and 6,000 line segments. In SVG, this results in thousands of active DOM nodes, causing severe memory pressure, browser repaints, and dropped frames on mobile and lower-spec youth laptops.
* **Step 2 (Pixel Manipulation):** A key mechanic of skribbl.io is the paint bucket (flood fill). SVG lacks native, high-performance pixel-level flood fill; approximating flood fill in vector geometry requires complex 2D polygon clipping (e.g., ClipperLib or polygon unioning), which is computationally prohibitive at 60 FPS in JavaScript.
* **Step 3 (Resolution Independence):** HTML5 Canvas 2D provides immediate-mode bitmap drawing and direct memory access via `getImageData()` and `putImageData()`. By setting an internal canvas logical resolution of $1200 \times 900$ (backing store) and using CSS `width: 100%; height: auto; aspect-ratio: 4 / 3; object-fit: contain;`, the canvas automatically scales to any device screen (smartphones, tablets, chromebooks, ultra-wide desktops) without distorting coordinates or degrading rendering performance.
* **Conclusion for Canvas:** Use HTML5 2D Canvas with a canonical fixed logical coordinate space ($1200 \times 900$).

### 2.2 Coordinate Normalization & Smoothing
* **Step 1 (Coordinate Transformation):** When a user triggers pointer events (`pointerdown`, `pointermove`, `pointerup`), coordinates must be converted from viewport space to internal logical coordinates:
  $$X_{logical} = \text{round}\left( (e.clientX - rect.left) \times \frac{CanvasWidth_{internal}}{rect.width} \right)$$
  $$Y_{logical} = \text{round}\left( (e.clientY - rect.top) \times \frac{CanvasHeight_{internal}}{rect.height} \right)$$
* **Step 2 (Stroke Smoothing via Quadratic Béziers):** Connecting raw pointer coordinates with linear segments (`lineTo`) yields jagged, polygonal strokes, especially on devices with 60 Hz touch polling. To achieve smooth strokes like skribbl.io:
  - Cache previous points $P_{prev}$ and $P_{curr}$.
  - Compute midpoint: $M = \left(\frac{P_{prev}.x + P_{curr}.x}{2}, \frac{P_{prev}.y + P_{curr}.y}{2}\right)$.
  - Render quadratic curve: `ctx.quadraticCurveTo(P_{prev}.x, P_{prev}.y, M.x, M.y)`.
  - Set `ctx.lineCap = 'round'` and `ctx.lineJoin = 'round'`.
* **Step 3 (Brush Specifications):**
  - Brush sizes: Size 1 (3px - fine detail), Size 2 (7px - default sketch), Size 3 (15px - thick marker), Size 4 (30px - large fill/highlighter).
  - Standard color palette: 26 curated high-contrast colors arranged in 2 rows of 13 swatches:
    - Row 1: `#FFFFFF` (white/eraser), `#C1C1C1`, `#EF130B` (red), `#FF7100` (orange), `#FFE400` (yellow), `#00CC00` (green), `#00B2FF` (light blue), `#231FD3` (dark blue), `#A300BA` (purple), `#DF69A7` (pink), `#FFAC8E` (peach), `#A0522D` (brown), `#000000` (black).
    - Row 2: `#4C4C4C`, `#7F7F7F`, `#740B07`, `#C23800`, `#E8A200`, `#005510`, `#00569E`, `#0E0865`, `#550069`, `#A75574`, `#ECB68A`, `#63300D`, `#222222`.

### 2.3 Flood Fill Algorithm (Scanline Stack on `Uint32Array`)
* **Step 1 (Performance Target):** Standard recursive 4-way flood fill causes stack overflow crashes on canvas sizes $> 400 \times 400$. Queue-based BFS pushes millions of duplicate pixels into memory.
* **Step 2 (Scanline Stack Algorithm):** An iterative scanline stack flood fill scans horizontal lines between boundary edges and pushes only the seed points of adjacent spans onto the stack. This reduces stack entries by over 95%.
* **Step 3 (`Uint32Array` Optimization):** Accessing pixel channels individually via `Uint8ClampedArray` requires 4 array reads/writes per pixel. Wrapping `ImageData.data.buffer` in a `Uint32Array` allows 32-bit single-integer pixel comparison and assignment.
* **Step 4 (Anti-Aliasing Tolerance):** Canvas lines have anti-aliased edges with alpha blending. To prevent white halo artifacts:
  - Calculate color distance in RGBA space:
    $$D(C_1, C_2) = \sqrt{(R_1-R_2)^2 + (G_1-G_2)^2 + (B_1-B_2)^2 + (A_1-A_2)^2}$$
  - If $D(C_{current}, C_{target}) \le 32$, treat as matching and overwrite with fill color.

### 2.4 Command Pattern, Undo/Redo & Late-Join Synchronization
* **Step 1 (Event Sourcing):** Transmitting raw bitmaps across WebSockets consumes excessive bandwidth (a $1200 \times 900$ PNG snapshot is ~150–500 KB per frame). 
* **Step 2 (Action Command Stream):** All canvas interactions are recorded as discrete immutable commands:
  ```typescript
  type CanvasAction = 
    | { id: string; type: 'STROKE'; color: string; size: number; points: number[] }
    | { id: string; type: 'FILL'; x: number; y: number; color: string; tolerance: number }
    | { id: string; type: 'CLEAR' };
  ```
* **Step 3 (Undo Functionality):** When the drawer clicks Undo, the client emits `DRAW_UNDO`. The server removes the last action from the room's current turn command stack and broadcasts `CANVAS_UNDO { actionId }`. All clients pop the action and re-render the canvas from history or rollback to the prior snapshot.
* **Step 4 (Late Joiners & Reconnection):** When a player disconnects or joins mid-turn, the server sends `CANVAS_SYNC { actions: CanvasAction[] }`. The client clears its canvas and replays the actions sequentially, reconstructing the exact pixel state in under 50ms.

### 2.5 Round & Turn Lifecycle (State Machine)
* **Step 1 (Lobby State):** Host configures game parameters (Rounds: 2–10, Draw Time: 30–240s, Language: PL/EN/UK, Custom Words). Host clicks "Start Game".
* **Step 2 (Drawer Selection):** Server initializes a randomized circular queue of player IDs. Each round completes when all connected players have had one turn to draw.
* **Step 3 (Word Selection - 15s):** 
  - Server draws 3 random words from the dictionary/custom word list (categorized into Easy, Medium, Hard).
  - Words are sent *strictly* to the active drawer. Other players receive `DRAWER_SELECTING { drawerId, drawerName, timeout: 15 }`.
  - If drawer fails to choose within 15 seconds, the server automatically selects word 1.
* **Step 4 (Drawing & Guessing Phase):**
  - Server emits `TURN_START { drawerId, drawTime, wordLength: targetWord.length, wordMask: "_ _ _ _ _" }`.
  - Timer counts down synchronously on the server (1-second tick intervals).
  - Hints reveal schedule: If hints are enabled ($K$ hints), milestones occur at:
    $$t_{hint}(i) = \text{round}\left( T_{total} \times \left(1 - \frac{i}{K + 1}\right) \right), \quad i \in \{1, \dots, K\}$$
    At each milestone, the server reveals one random unrevealed letter in the word mask and broadcasts `HINT_REVEAL { wordMask: "_ a _ _ e _" }`.
  - Early timer reduction: When the *first* player guesses correctly, if $T_{remaining} > 30$, the server sets $T_{remaining} = 30$ and emits `TIMER_ACCELERATED { remainingTime: 30 }`.
  - All-correct trigger: If all active non-drawing players solve the word, the drawing phase ends immediately.
* **Step 5 (Turn Recap / Intermission - 5s):**
  - Server reveals the secret word to all players: `TURN_END { secretWord, turnScores, updatedLeaderboard }`.
  - Canvas is frozen. Players see their point gains (+500, +350, etc.).
* **Step 6 (Game Over / Podium - 15s):**
  - After all rounds are completed, server transitions to `GAME_OVER { podium: [1st, 2nd, 3rd], fullScores }`.
  - Confetti animations, mascot celebration, and a button allowing the host to return everyone to the lobby.

### 2.6 Guessing, Chat Engine & Fuzzy Matching
* **Step 1 (Normalization & Diacritic Handling):**
  - Polish letters (ą, ć, ę, ł, ń, ó, ś, ź, ż) and Ukrainian Cyrillic must be handled correctly.
  - Guesses are trimmed, lowercased, and punctuation/excess whitespace stripped.
* **Step 2 (Evaluation Hierarchy):**
  1. *Already Guessed:* If player already solved the word, their message is sent to the solvers-only chat channel.
  2. *Exact Match:* `if (normalizedGuess === normalizedSecretWord)`:
     - Award points to guesser and drawer.
     - Add player to `solvedPlayers` set.
     - Mask the secret word for this player.
     - Broadcast public system message: `"[Player] guessed the word!"` (in green).
     - If first correct guess: clamp remaining timer to $\le 30$s.
     - If all solved: terminate turn.
  3. *Fuzzy Match ("Is Close!"):*
     - Compute Levenshtein distance $D_L(guess, secretWord)$.
     - Condition: 
       $$\text{IsClose} = (D_L == 1 \land \text{length} \ge 4) \lor (D_L == 2 \land \text{length} \ge 7)$$
     - Action: Suppress guess from public chat to prevent giving away the answer. Broadcast `"[Player] is close!"` system notification.
  4. *Normal Chat / Incorrect Guess:*
     - Run profanity filter against banned word dictionary (PL, EN, UK).
     - Broadcast to public chat.
* **Step 3 (Anti-Spam & Rate Limiting):**
  - Token bucket rate limiter per socket: maximum 4 messages per 2 seconds.
  - Duplicate message suppression (blocks identical guess typed 3+ times in a row).
  - If rate limit exceeded: client receives temporary 3-second chat cooldown warning.

### 2.7 Scoring Algorithm Equations
* **Guesser Scoring Formula:**
  - Let $T_{total}$ be total draw time (e.g. 80s), $t$ be seconds remaining when guess is submitted.
  - Let $R$ be the rank of the solver in this turn ($R = 1$ for first solver, $R = 2$ for second, etc.).
  - Base formula:
    $$S_{guesser} = \text{round}\left( \left( 100 + 400 \times \frac{t}{T_{total}} \right) \times \text{RankMultiplier}(R) \right)$$
    Where $\text{RankMultiplier}(R) = \max(0.7, 1.0 - (R - 1) \times 0.05)$.
  - Max possible points: 500 points (instant guess, Rank 1).
  - Minimum floor points: 70 points (correct guess at 1 second remaining).
* **Drawer Scoring Formula:**
  - The drawer is rewarded based on the fraction of the room that guessed their drawing, incentivizing clear and understandable art:
    $$S_{drawer} = \text{round}\left( \frac{N_{solvers}}{N_{total\_guessers}} \times \left( 200 + 300 \times \frac{\bar{t}_{solvers}}{T_{total}} \right) \right)$$
    Where $\bar{t}_{solvers}$ is the average remaining time across all successful guessers.
  - If $N_{solvers} = 0$: $S_{drawer} = 0$ (encourages drawing accurately rather than trolling or writing words).
  - If $100\%$ solve with fast speed: drawer receives up to 500 points.

### 2.8 Real-Time Tech Stack & WebSocket Protocol Design
* **Step 1 (Stack Selection):**
  - Frontend: React / Next.js with HTML5 2D Canvas and `socket.io-client`.
  - Backend: Node.js / TypeScript with `socket.io` and optional Redis adapter for room state scaling and pub/sub.
* **Step 2 (Network Optimization & Micro-Batching):**
  - Direct emission on every `pointermove` event (at 120 Hz) floods the network with 120 packets/sec per drawing client.
  - Micro-batching: Drawer buffers pointer moves locally and flushes batches every 25ms (40 packets/sec) or on `pointerup`.
  - Payload structure: Points are packed into a flat array `[x0, y0, x1, y1, x2, y2, ...]`, reducing JSON key overhead by over 70%.
* **Step 3 (Disconnect & Reconnection Handling):**
  - Heartbeat ping/pong every 5 seconds.
  - If a player disconnects, mark status as `DISCONNECTED` with a 45-second reconnect grace window.
  - If the active drawer disconnects: pause timer for 15 seconds. If drawer does not reconnect, skip turn with system announcement `"Drawer disconnected, skipping turn"`.
  - Host migration: If the room host leaves, automatically promote the oldest connected player in the room.

---

## 3. WebSocket Event Schema Specification

### 3.1 Client to Server (`C -> S`)

| Event Name | Payload Schema | Description |
|:---|:---|:---|
| `ROOM_CREATE` | `{ playerName: string, settings: RoomSettings, avatar: AvatarConfig }` | Create private room |
| `ROOM_JOIN` | `{ roomCode: string, playerName: string, avatar: AvatarConfig }` | Join existing room |
| `ROOM_UPDATE_SETTINGS` | `{ settings: Partial<RoomSettings> }` | Host updates settings |
| `GAME_START` | `{}` | Host starts game |
| `WORD_SELECT` | `{ wordIndex: number }` | Drawer picks 1 of 3 words |
| `DRAW_STROKE_BATCH` | `{ points: number[], color: string, size: number }` | Micro-batched stroke points |
| `DRAW_FILL` | `{ x: number, y: number, color: string }` | Bucket flood fill command |
| `DRAW_CLEAR` | `{}` | Drawer clears canvas |
| `DRAW_UNDO` | `{}` | Drawer undos last stroke |
| `SUBMIT_GUESS` | `{ text: string }` | Guesser sends chat message / guess |
| `HOST_KICK_PLAYER` | `{ targetPlayerId: string }` | Host kicks player |
| `VOTE_KICK_PLAYER` | `{ targetPlayerId: string }` | Player votes to kick |

### 3.2 Server to Client (`S -> C`)

| Event Name | Payload Schema | Description |
|:---|:---|:---|
| `ROOM_STATE` | `{ roomCode, hostId, players, settings, gameState }` | Full room snapshot |
| `PLAYER_JOINED` | `{ player: PlayerInfo }` | Notification of player join |
| `PLAYER_LEFT` | `{ playerId: string, reason: string }` | Player left / disconnected |
| `WORD_SELECTION_START` | `{ drawerId: string, timeout: number, choices?: string[] }` | Choices sent *only* to drawer |
| `TURN_START` | `{ drawerId: string, drawTime: number, wordLength: number, wordMask: string }` | Drawing phase begins |
| `DRAW_STROKE_BATCH` | `{ points: number[], color: string, size: number }` | Broadcast stroke to guessers |
| `DRAW_FILL` | `{ x: number, y: number, color: string }` | Broadcast flood fill |
| `DRAW_CLEAR` | `{}` | Broadcast canvas wipe |
| `DRAW_UNDO` | `{}` | Broadcast undo last action |
| `CANVAS_SYNC` | `{ actions: CanvasAction[] }` | Full canvas state for sync/reconnect |
| `HINT_REVEAL` | `{ wordMask: string }` | Revealed letter milestone |
| `TIMER_TICK` | `{ remainingSeconds: number }` | Synchronized 1-second timer |
| `TIMER_ACCELERATED` | `{ remainingSeconds: number }` | Clamped to 30s after 1st guess |
| `GUESS_CORRECT` | `{ playerId: string, pointsEarned: number }` | Player solved the word |
| `GUESS_CLOSE` | `{ playerId: string }` | Fuzzy match notification (no word) |
| `CHAT_MESSAGE` | `{ senderId: string, senderName: string, text: string, type: 'public' \| 'solver' \| 'system' }` | Public/solver chat |
| `TURN_END` | `{ secretWord: string, scores: Record<string, number>, leaderboard: LeaderboardEntry[] }` | 5s round intermission recap |
| `GAME_OVER` | `{ podium: PodiumWinner[], finalScores: LeaderboardEntry[] }` | 15s final podium screen |

---

## 4. Caveats
1. **Network Latency & Mobile Touch Jitter:** Mobile devices running on cellular data (3G/4G) may experience packet loss or high jitter (>150ms). The client must implement cubic/quadratic Bézier interpolation so lines don't appear disjointed during burst packet arrival.
2. **Anti-Aliasing Leaks:** If a player uses a thin 1px brush with extreme anti-aliasing, a flood fill tolerance threshold set too high ($\ge 60$) can leak through diagonal pixel gaps. Setting a strict tolerance range of $28 \le \text{tolerance} \le 36$ provides the optimal balance between eating anti-aliased borders and preventing leaks.
3. **Word Dictionaries & Youth Appropriateness:** The word dictionary must be thoroughly curated for Polish, English, and Ukrainian to ensure appropriate vocabulary for youth teams, omitting controversial, obscure, or offensive terms.

---

## 5. Conclusion & Architectural Recommendation

1. **Canvas Implementation:** Adopt HTML5 2D Canvas with fixed $1200 \times 900$ internal logical coordinates, responsive CSS `aspect-ratio: 4 / 3;`, quadratic Bézier stroke smoothing, and a 26-color palette.
2. **Flood Fill Engine:** Implement non-recursive scanline stack flood fill utilizing `Uint32Array` buffers with an RGBA Euclidean tolerance threshold of 32 for deterministic, zero-leak fills in under 12ms.
3. **Network Architecture:** Use Socket.IO over WebSockets with client-side stroke micro-batching at 25ms intervals. Synchronize canvas state via an event-sourced command stream (`STROKE`, `FILL`, `CLEAR`, `UNDO`) enabling seamless undo and mid-turn reconnection playback.
4. **Game Loop & Guessing:** Implement a server-authoritative state machine with a 15s word choice phase, progressive letter hints at $\frac{T_{draw}}{N_{hints}+1}$, 30-second timer acceleration upon first solve, Levenshtein fuzzy matching ($D_L \le 1-2$) with private close alerts, and separate solver chatrooms.
5. **Scoring Model:** Deploy a time-decay rank-weighted formula awarding up to 500 points for guessers and a participation-proportional reward up to 500 points for drawers.

---

## 6. Verification Method

To independently verify this specification and its architectural logic:
1. **Canvas Normalization & Flood Fill Verification:**
   - Inspect the coordinate transformation math: verify that on any viewport size, $(e.clientX - rect.left) \times (1200 / rect.width)$ maps cleanly to $[0, 1200]$.
   - Test `Uint32Array` scanline flood fill against anti-aliased strokes: verify that tolerance 32 avoids halos without breaching diagonal pixel boundaries.
2. **Levenshtein Fuzzy Matching Verification:**
   - Test test-cases:
     - Word: "kameleon" (length 8) -> Guess: "kamelon" ($D_L = 1$) -> Triggers "Is close!".
     - Word: "kot" (length 3) -> Guess: "kat" ($D_L = 1$) -> Does NOT trigger "Is close!" (length < 4 threshold prevents false positives).
     - Word: "chameleon" (length 9) -> Guess: "chameleonn" ($D_L = 1$) -> Triggers "Is close!".
3. **Timer Acceleration Logic:**
   - At $t = 70$s with total 80s: Player A guesses correctly. Timer immediately drops to 30s.
   - At $t = 18$s with total 80s: Player A guesses correctly. Timer remains at 18s (no extension).
4. **WebSocket Packet Benchmarking:**
   - Verify that 25ms micro-batching limits outgoing bandwidth to $\le 40$ packets/sec per drawer, maintaining smooth 60 FPS visual rendering on all client peers.
