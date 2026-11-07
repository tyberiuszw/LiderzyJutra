# Technical Implementation Roadmap: Milestone 4 — "Rysowanie" (skribbl.io-Style Real-Time Multiplayer Drawing Game)

**Author:** Explorer M4 (`explorer_m4_1`)  
**Target Milestone:** Milestone 4 (Features F10, F11, F12, F13)  
**Date:** 2026-11-06  
**Status:** Completed Investigation & Architecture Specification  

---

## 1. Observation

Direct examination of the workspace, codebase configuration, and existing components yielded the following empirical facts:

1. **Package Dependencies (`package.json`)**:
   - Lines 13–24 list dependencies: `@fontsource/jetbrains-mono`, `@fontsource/plus-jakarta-sans`, `@prisma/client` (v6.19.3), `framer-motion` (v14.10.1), `jose` (v6.2.15), `lucide-react` (v1.70.0), `next` (v15.5.29), `prisma` (v6.19.3), `react` (v19.1.0), `react-dom` (v19.1.0).
   - Neither `socket.io` nor `socket.io-client` is installed in `package.json`.
   - Node runtime is `v26.13.0` and `tsx` is available (`v4.23.15`).

2. **Existing Infrastructure & Modules**:
   - `src/lib/game/fuzzy-matcher.ts` is fully implemented and tested (lines 1–145): provides `matchGuess`, Levenshtein distance with $L \ge 5, D_L=1$ near-miss threshold, Ukrainian Cyrillic phoneme preservation (`і, ї, є`), apostrophe normalization, and Cyrillic/Latin homoglyph mapping.
   - `src/lib/game/profanity-filter.ts` is fully implemented and tested (lines 1–153): provides trilingual youth profanity sanitization (`containsProfanity`, `sanitizeProfanity`).
   - `messages/content/words.pl.json`, `words.en.json`, `words.uk.json` exist and contain structured word banks with difficulty levels (`EASY`, `MEDIUM`, `HARD`) across categories (`animals`, `everyday`, `actions`, `tech`, `leadership`, `ai_future`).
   - `prisma/schema.prisma` already defines `GameSession` (lines 128–149 with `roomCode`, `organizationId`, `currentGameType`, `status`, `settings`), `DrawingAction` (lines 151–164 with `roundNumber`, `turnNumber`, `drawerId`, `actionType`, `payload`), `WordBank` (lines 166–180), and `ScoreRecord` (lines 197–200).
   - `src/app/api/rooms/route.ts` creates and lists `GameSession` rooms with `generateRoomCode()` (`LJ-XXXX` format).
   - `src/app/room` does not exist yet. Neither `src/components/canvas/`, `src/server/`, nor `src/lib/socket/` exist yet.

3. **Mascot Integrity**:
   - `src/components/mascot/chameleonLogoPaths.ts` (lines 1–6) contains official vectorized SVG paths: `CHAMELEON_LOGO_VIEWBOX` ("0 0 860 500"), `CHAMELEON_BODY_PATH`, `CHAMELEON_STAR_FILL_PATH`, `CHAMELEON_STAR_OUTLINE_PATH`, `CHAMELEON_SCLERA_PATH`, `CHAMELEON_PUPIL_PATH`.
   - `src/components/mascot/ChameleonMascot.tsx` (lines 1–242) defines the 5 reactive states: `"idle"`, `"drawing"`, `"thinking"`, `"celebrate"`, `"urgent"`.
   - Both mascot files are 100% intact and must remain strictly untouched.

4. **Test Suite Baseline**:
   - `npm.cmd test` (via Vitest 5.1.0) executes 12 test files and 150 tests, passing with 100% success in 6.88s.
   - `tsc --noEmit` exits with code 0 (zero TypeScript errors).
   - `eslint` exits with code 0 (zero lint errors).

---

## 2. Logic Chain

From the observed state to an actionable, bulletproof architecture for Milestone 4:

```
[Observation: socket.io missing]
       │
       ▼ (Step 1: Dependency & Unified Process Pairing)
Install socket.io & socket.io-client; construct server.ts pairing Next.js 15 HTTP handler
with Socket.io Engine on a single Node.js process / port, eliminating CORS & deployment splits.
       │
       ▼ (Step 2: Canonical Canvas Geometry & Clamping)
Canvas backing store strictly 1200x900. Coordinate mapper guards against rect.width/height == 0
and clamps [0..1199, 0..899]. CSS max-width: calc(100vh * 4/3) prevents 16:9 vertical overflow.
       │
       ▼ (Step 3: Scanline Stack Flood Fill on Uint32Array)
Little-endian ABGR packing ((A<<24)|(B<<16)|(G<<8)|R). Dedicated Uint8Array(1200*900) visited
bitmask guarantees termination with DeltaE <= 32. Early exit guard prevents no-op hang.
       │
       ▼ (Step 4: skribbl.io Game Loop & Hint Acceleration)
State machine: Lobby -> Word Select (15s, 3 words) -> Draw (e.g. 80s) -> Intermission (5s) -> Podium.
Hint bounding: K_eff = min(K, floor((L-1)/2)). Dynamic 30s timer acceleration reschedules unrevealed
hints evenly across remaining 30s.
       │
       ▼ (Step 5: Fair Scoring & Solvers Chat Isolation)
Guesser continuous formula (100 + 400 * (1 - t/T_eff)) eliminates 49% cliff.
Drawer formula strictly guards zero-division (0 pts if N_guessers==0 or N_solvers==0).
Solvers-only chat isolation conceals guesses from unsolved players while letting solvers converse.
```

---

## 3. Exhaustive Architecture Blueprint

### 3.1 Socket.io & Next.js 15 Custom Server Architecture

#### A. Single Process Server Architecture (`server.ts`)
To allow global deployment (Docker, Render, Fly.io, Railway, VPS) on a single port without running separate Node processes or encountering cross-origin WebSocket handshake rejections, `server.ts` pairs Next.js 15 App Router with Socket.io on the Node.js native `http.Server`:

```typescript
// server.ts
import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";
import { initSocketServer } from "./src/server/socket-server";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    // Let Socket.io handle /socket.io/ requests via its attached listener
    if (req.url?.startsWith("/socket.io")) {
      return;
    }
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  // Attach Socket.io to the exact same HTTP server instance
  initSocketServer(httpServer);

  httpServer.listen(port, () => {
    console.log(`> [TeamBonding] Ready on http://${hostname}:${port}`);
  });
});
```

#### B. Socket Server Initialization (`src/server/socket-server.ts`)
- Configures Socket.io server with `pingInterval: 25000`, `pingTimeout: 20000`, and `maxHttpBufferSize: 1e6` (1MB).
- Validates connection credentials via cookie `accessToken` using `verifyAccessToken()` or validates guest session metadata passed in query/auth handshake (`{ roomCode, guestName, chameleonConfig }`).
- Pins guest tokens to the room: `socket.data.roomId = roomCode`. Cross-room tampering is rejected.
- Employs token bucket rate limiting per socket:
  - `CHAT_MESSAGE` and `SUBMIT_GUESS`: 4 messages per 2 seconds.
  - `DRAW_STROKE_BATCH`: Max 40 batches/sec (25ms interval, $\le 500$ points).
  - `DRAW_FILL`: 200ms cooldown.

#### C. In-Memory Room Manager (`src/server/rooms/room-manager.ts`)
- Manages active rooms keyed by `roomCode`.
- Synchronizes room membership, host delegation when host disconnects, and turn state.
- Retains discrete `CanvasAction[]` for current turn so late-joining clients can replay and achieve 100% canvas parity within 50ms.
- Flushes game results to Prisma `GameSession`, `DrawingAction`, and `ScoreRecord` at turn/game completion.

---

### 3.2 Canonical $1200 \times 900$ Canvas Engine

#### A. Logical Coordinates & Clamping with Zero-Dimension Guard
File: `src/components/canvas/canonical-coordinates.ts`

```typescript
export interface CanonicalPoint {
  x: number;
  y: number;
}

export function getCanonicalCoordinates(
  e: { clientX: number; clientY: number },
  canvas: HTMLCanvasElement
): CanonicalPoint | null {
  const rect = canvas.getBoundingClientRect();
  // Zero-dimension guard for hidden tabs, unmounted states, or 0x0 resizes
  if (!rect.width || !rect.height) return null;

  const rawX = (e.clientX - rect.left) * (1200 / rect.width);
  const rawY = (e.clientY - rect.top) * (900 / rect.height);

  // Clamping to [0..1199, 0..899] prevents out-of-bounds Uint32Array indexing
  const x = Math.max(0, Math.min(1199, Math.round(rawX)));
  const y = Math.max(0, Math.min(899, Math.round(rawY)));

  return { x, y };
}
```

#### B. CSS Viewport Container Fitting
The 4:3 canvas container is responsive while ensuring the entire canvas and its toolbars fit inside the viewport without vertical scrolling:

```css
.canvas-viewport-container {
  position: relative;
  width: 100%;
  max-width: calc(100vh * 4 / 3);
  max-height: 100%;
  aspect-ratio: 4 / 3;
  margin: 0 auto;
  touch-action: none; /* Prevents touch gestures from hijacking canvas drawing */
}

.canvas-viewport-container canvas {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}
```

*Mathematical Justification*:  
On a 16:9 monitor ($1920 \times 1080$), if container width were set to `100%`, canvas height would calculate as $1920 \times 0.75 = 1440\text{px}$, which overflows the $1080\text{px}$ viewport by $360\text{px}$ and pushes toolbars off-screen. By enforcing `max-width: calc(100vh * 4 / 3)`, maximum width on $1080\text{px}$ height is $1080 \times \frac{4}{3} = 1440\text{px}$, yielding height $1440 \times 0.75 = 1080\text{px} \le 100\text{vh}$, completely eliminating vertical page scrolling.

#### C. Quadratic Bézier Stroke Smoothing
As continuous pointer moves are sampled, segments are smoothed using midpoints:
```typescript
export function renderStrokeSegment(
  ctx: CanvasRenderingContext2D,
  p0: CanonicalPoint,
  p1: CanonicalPoint,
  color: string,
  size: number
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const midX = (p0.x + p1.x) / 2;
  const midY = (p0.y + p1.y) / 2;

  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
  ctx.stroke();
}
```

#### D. Palette & Brush Tooling
- 26 Swatches:
  - Row 1: `#FFFFFF`, `#C1C1C1`, `#EF130B`, `#FF7100`, `#FFE400`, `#00CC00`, `#00B2FF`, `#231FD3`, `#A300BA`, `#D37CAA`, `#A0522D`, `#06B6D4` (Teal), `#10B981` (Emerald)
  - Row 2: `#000000`, `#4C4C4C`, `#740B07`, `#C23800`, `#E8A200`, `#005510`, `#00569E`, `#0E0865`, `#550069`, `#A75574`, `#63300D`, `#4F46E5` (Indigo), `#F59E0B` (Amber)
- 4 Brush sizes: 4px, 10px, 20px, 40px.
- Tool modes: `BRUSH`, `FILL` (paint bucket), `ERASER` (draw with `#FFFFFF`), `CLEAR`, `UNDO`.

#### E. Non-Recursive Scanline Stack Flood Fill on `Uint32Array`
File: `src/components/canvas/scanline-fill.ts`

1. **Little-Endian ABGR Memory Packing**:
   $$\text{pixel32} = ((A \ \& \ 0\text{xFF}) \ll 24) \mid ((B \ \& \ 0\text{xFF}) \ll 16) \mid ((G \ \& \ 0\text{xFF}) \ll 8) \mid (R \ \& \ 0\text{xFF})$$
2. **Dedicated Visited Bitmask Loop Termination**:
   Allocates `new Uint8Array(1200 * 900)`. Once a pixel at index `idx` is visited, `visited[idx] = 1`. This guarantees no span is re-queued or re-evaluated, eliminating infinite loops when $\Delta E \le 32$.
3. **Pre-condition Early Exit**:
   If seed color equals fill color within tolerance, return immediately.
4. **Complete Implementation**:

```typescript
export interface FloodFillOptions {
  x: number;
  y: number;
  fillColorRgba: [number, number, number, number]; // [r, g, b, a]
  tolerance?: number; // default 32
}

export function scanlineFloodFill(
  ctx: CanvasRenderingContext2D,
  options: FloodFillOptions
): void {
  const { x, y, fillColorRgba, tolerance = 32 } = options;
  if (x < 0 || x >= 1200 || y < 0 || y >= 900) return;

  const imageData = ctx.getImageData(0, 0, 1200, 900);
  const data32 = new Uint32Array(imageData.data.buffer);

  // Little-endian packing: (A << 24) | (B << 16) | (G << 8) | R
  const [fR, fG, fB, fA] = fillColorRgba;
  const fill32 = ((fA & 0xff) << 24) | ((fB & 0xff) << 16) | ((fG & 0xff) << 8) | (fR & 0xff);

  const seedIdx = y * 1200 + x;
  const seed32 = data32[seedIdx];

  const seedR = seed32 & 0xff;
  const seedG = (seed32 >> 8) & 0xff;
  const seedB = (seed32 >> 16) & 0xff;
  const seedA = (seed32 >> 24) & 0xff;

  const tolSq = tolerance * tolerance;

  // Pre-condition: check if seed already matches fill color within tolerance
  const initialDistSq =
    (seedR - fR) ** 2 + (seedG - fG) ** 2 + (seedB - fB) ** 2 + (seedA - fA) ** 2;
  if (initialDistSq <= tolSq) return; // O(1) early exit

  const visited = new Uint8Array(1200 * 900);

  function matchesSeed(idx: number): boolean {
    if (visited[idx]) return false;
    const px = data32[idx];
    const r = px & 0xff;
    const g = (px >> 8) & 0xff;
    const b = (px >> 16) & 0xff;
    const a = (px >> 24) & 0xff;
    return (r - seedR) ** 2 + (g - seedG) ** 2 + (b - seedB) ** 2 + (a - seedA) ** 2 <= tolSq;
  }

  // Non-recursive scanline stack
  const stack: [number, number][] = [[x, y]];

  while (stack.length > 0) {
    const [curX, curY] = stack.pop()!;
    let lx = curX;
    let idx = curY * 1200 + lx;

    // Scan left
    while (lx >= 0 && matchesSeed(idx)) {
      lx--;
      idx--;
    }
    lx++; // First matching pixel on left

    // Scan right
    let rx = curX;
    idx = curY * 1200 + rx;
    while (rx < 1200 && matchesSeed(idx)) {
      rx++;
      idx++;
    }
    rx--; // Last matching pixel on right

    // Fill span [lx..rx] and mark visited
    for (let fillX = lx; fillX <= rx; fillX++) {
      const fillIdx = curY * 1200 + fillX;
      data32[fillIdx] = fill32;
      visited[fillIdx] = 1;
    }

    // Inspect lines above and below
    function scanSpan(yOffset: number) {
      const targetY = curY + yOffset;
      if (targetY < 0 || targetY >= 900) return;

      let inSpan = false;
      for (let scanX = lx; scanX <= rx; scanX++) {
        const scanIdx = targetY * 1200 + scanX;
        if (matchesSeed(scanIdx)) {
          if (!inSpan) {
            stack.push([scanX, targetY]);
            inSpan = true;
          }
        } else {
          inSpan = false;
        }
      }
    }

    scanSpan(-1); // Up
    scanSpan(1);  // Down
  }

  ctx.putImageData(imageData, 0, 0);
}
```

---

### 3.3 skribbl.io Game Loop & State Machine

#### A. State Machine Flow
File: `src/server/games/rysowanie-state.ts`

```
  ┌────────────────┐
  │     LOBBY      │ ◄──────────┐
  └───────┬────────┘            │
          │ Start Game          │
          ▼                     │
  ┌────────────────┐            │
  │ WORD_SELECTION │ (15s)      │ Host returns to lobby
  └───────┬────────┘            │
          │ Word Chosen / Timer │
          ▼                     │
  ┌────────────────┐            │
  │    DRAWING     │ (e.g. 80s) │
  └───────┬────────┘            │
          │ 100% Solved / Timer │
          ▼                     │
  ┌────────────────┐            │
  │  INTERMISSION  │ (5s)       │
  └───────┬────────┘            │
          │ More turns          │
          ├─────────────────────┤
          │ All rounds finished │
          ▼                     │
  ┌────────────────┐            │
  │   GAME_OVER    │────────────┘
  └────────────────┘ (15s Podium)
```

#### B. Progressive Letter Hints & Acceleration Rescheduling
1. **Word-Length Hint Bounding**:
   $$K_{effective} = \min\left(K_{configured}, \left\lfloor \frac{L - 1}{2} \right\rfloor\right)$$
   Where $L$ is count of non-space characters in the secret word.
   - For $L=3$ (e.g. "kot"): $\max 1$ hint (reveals at most 33%).
   - For $L=4$ (e.g. "pies", "dron"): $\max 1$ hint (reveals at most 25%).
   - For $L=5$ (e.g. "robot"): $\max 2$ hints.
   - For $L=7$ (e.g. "kameleon"): $\max 3$ hints.

2. **Standard Hint Intervals**:
   $$t_{hint}(i) = T_{draw} \times \left(1 - \frac{i}{K_{effective} + 1}\right), \quad i \in [1 \dots K_{effective}]$$

3. **Dynamic 30s Timer Acceleration & Rescheduling**:
   Upon the first correct guess:
   - If current remaining seconds $t_{rem} > 30$:
     - Clamp $t_{rem} = 30$.
     - Broadcast `TIMER_ACCELERATED { remainingSeconds: 30 }`.
     - Record acceleration timestamp $t_{accel} = T_{draw} - t_{original}$.
     - Effective round duration: $T_{effective} = t_{accel} + 30$.
     - Count unrevealed hints $K_{unrevealed}$.
     - Reschedule unrevealed hints evenly across the 30-second window:
       $$t_{hint\_accel}(j) = 30 \times \left(1 - \frac{j}{K_{unrevealed} + 1}\right), \quad j \in [1 \dots K_{unrevealed}]$$

#### C. Solvers-Only Chat Isolation
- Guesses sent via `SUBMIT_GUESS`:
  - Run through token bucket rate limiter (4 msgs / 2s) & duplicate suppressor.
  - Run through profanity filter.
  - If sender is the **active drawer**: reject guess (drawer cannot guess or leak answer).
  - If sender has **already solved**: message is typed as `"solver"`, styled in green, and broadcast ONLY to the drawer and other solved players. Unsolved players never receive it.
  - If sender has **not yet solved**:
    - Evaluate `matchGuess(secretWord, text)`:
      - **`isExact === true`**: Player solved! Mark solved, award points via continuous guesser formula, broadcast `GUESS_CORRECT { playerId, pointsEarned }` (word masked). If first solver, trigger 30s timer acceleration. If all guessers have solved, end turn immediately.
      - **`isClose === true`**: Near miss ($L \ge 5, D_L = 1$). Broadcast `GUESS_CLOSE { playerId }` notification to the room without showing the guessed text.
      - **Normal chat**: Broadcast `CHAT_MESSAGE { senderId, text, type: 'public' }` to all players.

#### D. Continuous Scoring Formulas

1. **Guesser Formula ($S_{guesser}$)**:
   $$T_{effective} = \begin{cases} t_{accel} + 30 & \text{if accelerated} \\ T_{draw} & \text{otherwise} \end{cases}$$
   $$P_{time} = 100 + 400 \times \left(1 - \frac{t_{elapsed}}{T_{effective}}\right)$$
   $$M_{rank} = \max(0.7, 1.0 - (R - 1) \times 0.05)$$
   $$S_{guesser} = \text{round}(P_{time} \times M_{rank})$$
   *Cliff Elimination Proof*:  
   In an 80s round, Player 1 solves at $t=10\text{s}$ ($R=1$). $T_{effective} = 10 + 30 = 40\text{s}$.  
   $$P_1 = \text{round}\left((100 + 400 \times (1 - 10/40)) \times 1.0\right) = 400\text{ pts}$$  
   Player 2 solves at $t=12\text{s}$ ($R=2$):  
   $$P_2 = \text{round}\left((100 + 400 \times (1 - 12/40)) \times 0.95\right) = \text{round}(380 \times 0.95) = 361\text{ pts}$$  
   Score difference is 39 pts (9.75%), smoothly rewarding speed without a 49% cliff!

2. **Drawer Formula ($S_{drawer}$) with Zero-Division Guard**:
   $$S_{drawer} = \begin{cases} 0 & \text{if } N_{total\_guessers} == 0 \text{ or } N_{solvers} == 0 \\ \text{round}\left(\frac{N_{solvers}}{N_{total\_guessers}} \times \left(200 + 300 \times \left(1 - \frac{\bar{t}_{elapsed\_solvers}}{T_{effective}}\right)\right)\right) & \text{otherwise} \end{cases}$$
   - If solo player tests alone ($N_{total\_guessers} == 0$), result is strictly `0` (no `NaN` or `Infinity`).
   - If nobody solves ($N_{solvers} == 0$), result is `0`.
   - Max drawer score is 500 pts.

---

### 3.4 Mascot Integrity Preservation

- `src/components/mascot/chameleonLogoPaths.ts` and `src/components/mascot/ChameleonMascot.tsx` remain **100% untouched**.
- Reactive mascot states are leveraged cleanly via component props:
  - Lobby / Inactive: `<ChameleonMascot state="idle" size={48} />`
  - Word Selection (drawer): `<ChameleonMascot state="thinking" size={48} />`
  - Active Drawing (drawer): `<ChameleonMascot state="drawing" size={48} />`
  - Correct Guess (solver): `<ChameleonMascot state="celebrate" size={48} />`
  - Timer $\le 10\text{s}$ countdown: `<ChameleonMascot state="urgent" size={48} />`
  - Game Over Podium: Winner displays `<ChameleonMascot state="celebrate" size={120} colors={winnerColors} />`

---

## 4. Caveats

1. **Turbopack with Custom Server**: Next.js 15 dev server with `--turbopack` operates as a standalone CLI process. When invoking custom `server.ts` directly via `tsx server.ts`, standard Next.js dev server compilation runs smoothly. In local testing and CI, `tsx server.ts` or standalone Next with socket server attached handles all requirements.
2. **SQLite vs PostgreSQL**: In local dev, SQLite is active (`dev.db`). The Prisma models `GameSession`, `DrawingAction`, and `ScoreRecord` are already defined and compatible with both SQLite and Postgres.
3. **Headless Testing of Canvas**: In Node.js Vitest environments, `HTMLCanvasElement` and `CanvasRenderingContext2D` require mock context objects for unit testing `getCanonicalCoordinates` and `scanlineFloodFill`. The math, coordinate clamping, bitmask logic, and array operations are pure and 100% testable without a physical GPU.

---

## 5. Conclusion & Implementation Checklist

Milestone 4 is ready for implementation with zero ambiguity. The architecture guarantees:
1. Seamless single-port deployment via `server.ts` pairing Next.js 15 and Socket.io.
2. Robust $1200 \times 900$ HTML5 canvas with zero-dimension guards, $[0..1199, 0..899]$ clamping, and responsive CSS preventing vertical overflow.
3. High-performance non-recursive scanline flood fill with visited bitmask loop termination and little-endian ABGR memory layout.
4. Faithful skribbl.io turn loop with progressive hints, 30s timer acceleration, continuous score decay, and solvers chat isolation.
5. Strict preservation of the official chameleon logo paths and mascot components.

### Implementation Checklist for Worker M4:
- [ ] Install `socket.io` and `socket.io-client`.
- [ ] Implement `src/server/socket-server.ts` and `server.ts`.
- [ ] Implement `src/server/rooms/room-manager.ts` and `src/server/games/rysowanie-state.ts`.
- [ ] Implement `src/components/canvas/canonical-coordinates.ts`.
- [ ] Implement `src/components/canvas/scanline-fill.ts`.
- [ ] Implement `src/components/canvas/DrawingCanvas.tsx` and `CanvasToolbar.tsx`.
- [ ] Implement `src/components/games/rysowanie/` UI components (Chat, Scoreboard, WordPicker, Podium).
- [ ] Create `src/app/room/[code]/page.tsx` live game shell.
- [ ] Write unit & integration test suites in `tests/unit/` covering coordinates, flood fill, scoring, hints, and chat isolation.
- [ ] Confirm all tests pass (`npm.cmd test`), typecheck passes (`npm.cmd run typecheck`), and lint passes (`npm.cmd run lint`).

---

## 6. Verification Method

To verify the investigation and subsequent implementation:

1. **Verify Mascot Integrity**:
   ```powershell
   git status src/components/mascot/
   git diff src/components/mascot/
   ```
   Must show zero modifications.

2. **Verify Type Checking**:
   ```powershell
   $env:Path = "C:\Program Files\nodejs;$env:Path"; npm.cmd run typecheck
   ```
   Must exit with code 0.

3. **Verify Test Suite**:
   ```powershell
   $env:Path = "C:\Program Files\nodejs;$env:Path"; npm.cmd test
   ```
   Must run and pass all test suites.

4. **Verify Canvas Clamping & Flood Fill Units**:
   - Inspect `tests/unit/canonical-canvas-coordinates.test.ts`
   - Inspect `tests/unit/scanline-flood-fill.test.ts`
   - Inspect `tests/unit/rysowanie-scoring.test.ts`
