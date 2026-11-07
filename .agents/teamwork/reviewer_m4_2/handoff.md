# Milestone 4 Independent Quality & Adversarial Review Report

**Reviewer:** Reviewer M4_2 (`reviewer_m4_2`)  
**Target:** Milestone 4 ("Rysowanie" Canvas Engine, Flood Fill, skribbl.io Game Loop, Scoring Math)  
**Date:** 2026-11-06  
**Verdict:** **REQUEST_CHANGES**

---

## 1. Observation

### 1.1 Automated Suite Verification Results
- **Unit & Integration Tests**: `$env:PATH = "C:\Program Files\nodejs;" + $env:PATH; & 'C:\Program Files\nodejs\npm.cmd' test`  
  **Result**: 17 passed test files, 200 passed tests (10.60s duration).
- **TypeScript Typecheck**: `$env:PATH = "C:\Program Files\nodejs;" + $env:PATH; & 'C:\Program Files\nodejs\npm.cmd' run typecheck`  
  **Result**: Exit code 0, 0 type errors.
- **ESLint**: `$env:PATH = "C:\Program Files\nodejs;" + $env:PATH; & 'C:\Program Files\nodejs\npm.cmd' run lint`  
  **Result**: Exit code 0, 0 errors, 0 warnings.
- **Next.js Production Build**: `$env:PATH = "C:\Program Files\nodejs;" + $env:PATH; & 'C:\Program Files\nodejs\npm.cmd' run build`  
  **Result**: Exit code 0. Compiled successfully in 16.0s. All 18 routes statically or dynamically optimized (`/room/[code]` built at 84.2 kB).
- **Mascot Preservation**: `Get-Item src/components/mascot/* | Select-Object Name, Length, LastWriteTime`  
  `chameleonLogoPaths.ts`: 19,429 bytes, timestamp `06.11.2026 17:12:46` (100% untouched).  
  `ChameleonMascot.tsx`: 7,059 bytes, timestamp `06.11.2026 17:19:58` (100% untouched).

---

### 1.2 Critical Defect: Scoring Cliff Recreated in `RysowanieGameSession`
In `src/server/games/rysowanie-state.ts`:

1. **Lines 574–578**:
   ```typescript
   private getEffectiveDuration(): number {
     return this.state.isTimerAccelerated
       ? (this.state.drawTimeTotal - 30) + 30
       : this.state.drawTimeTotal;
   }
   ```
   **Observation**: `(this.state.drawTimeTotal - 30) + 30` is an algebraic tautology that simplifies directly to `this.state.drawTimeTotal`. Regardless of acceleration state, `getEffectiveDuration()` always returns `drawTimeTotal` (e.g. 80). It completely fails to calculate $T_{effective} = t_{accel} + 30$ mandated by `IMPLEMENTATION_PLAN.md` line 588.

2. **Lines 510–522**:
   ```typescript
   const elapsed = this.state.drawTimeTotal - this.state.drawTimeRemaining;
   this.solverTimes.set(senderId, elapsed);

   const solverRank = this.state.solvedPlayerIds.length;
   const effectiveDuration = this.getEffectiveDuration();
   const points = calculateGuesserScore(elapsed, effectiveDuration, solverRank);

   player.score += points;

   // Dynamic 30s timer acceleration if 1st solver
   if (solverRank === 1 && this.state.drawTimeRemaining > 30) {
     this.accelerateTimer(30);
   }
   ```
   **Lines 580–584**:
   ```typescript
   private accelerateTimer(remainingSeconds: number): void {
     this.state.isTimerAccelerated = true;
     this.state.drawTimeRemaining = remainingSeconds;
   ```
   **Observation**:
   - `elapsed` is calculated exclusively as `this.state.drawTimeTotal - this.state.drawTimeRemaining`.
   - When the 1st solver solves at $t = 10\text{s}$ (where `drawTimeRemaining` was 70), `elapsed` is $80 - 70 = 10\text{s}$. Because `accelerateTimer(30)` has not yet run, `getEffectiveDuration()` returns 80. Player 1 earns:
     $$\text{round}((100 + 400 \times (1 - 10/80)) \times 1.0) = \mathbf{450\text{ pts}}$$
     *(According to `IMPLEMENTATION_PLAN.md` §7.5 line 593, Player 1 should receive 400 pts with $T_{effective} = 10 + 30 = 40\text{s}$).*
   - `accelerateTimer(30)` clamps `this.state.drawTimeRemaining` to 30.
   - When the 2nd solver solves just 2 seconds later (at real elapsed time $t = 12\text{s}$), `this.state.drawTimeRemaining` has ticked down from 30 to 28.
   - Line 510 calculates:
     $$\text{elapsed} = 80 - 28 = \mathbf{52\text{s}}$$
     The elapsed time artificially jumps from 10s to 52s!
   - Line 514 evaluates `effectiveDuration = getEffectiveDuration() = 80`.
   - Line 515 calculates:
     $$\text{points} = \text{round}((100 + 400 \times (1 - 52/80)) \times 0.95) = \text{round}(240 \times 0.95) = \mathbf{228\text{ pts}}$$
   - Score difference: $450 - 228 = 222\text{ pts}$.  
     Drop percentage: $(222 / 450) \times 100 = \mathbf{49.33\%}$!
   - **Conclusion**: The runtime game state machine produces the **exact 49.33% score cliff** that Milestone 4 Contract 3 was explicitly designed to eliminate.

3. **Disconnection in Test Verification (`tests/unit/rysowanie-scoring.test.ts`)**:
   **Lines 44–60**:
   ```typescript
   it("eliminates the 49% cliff between 1st and 2nd solver during dynamic 30s acceleration", () => {
     // In an 80s round:
     // Player 1 solves at t=10s. Round accelerates to 10 + 30 = 40s effective duration.
     // Player 2 solves 2 seconds later at t=12s.
     const p1Score = calculateGuesserScore(10, 40, 1);
     const p2Score = calculateGuesserScore(12, 40, 2);

     expect(p1Score).toBe(400);
     expect(p2Score).toBe(361);
     ...
   ```
   **Observation**: The test author tested the pure helper function `calculateGuesserScore` by manually injecting synthetic numbers `(10, 40, 1)` and `(12, 40, 2)`. The test passed, but because `RysowanieGameSession` was never tested with multiple solvers under acceleration, the test functioned as a self-certifying facade that hid the 49% cliff bug in runtime execution.

4. **Corrupted Drawer Score in `endTurn()`**:
   **Lines 620–634**:
   ```typescript
   if (solverCount > 0) {
     let totalTime = 0;
     for (const elapsed of this.solverTimes.values()) {
       totalTime += elapsed;
     }
     avgElapsed = totalTime / solverCount;
   }
   drawerScore = calculateDrawerScore(
     activeGuessers,
     solverCount,
     avgElapsed,
     this.getEffectiveDuration()
   );
   ```
   **Observation**: Because Player 2's `elapsed` was stored as 52s (instead of 12s), `avgElapsed` evaluates to $(10 + 52) / 2 = 31\text{s}$ instead of $(10 + 12) / 2 = 11\text{s}$, and `effectiveDuration` is 80 instead of 40, distorting drawer scoring.

---

### 1.3 Major Defect: Local Stroke Segment Discontinuity
In `src/components/canvas/canonical-coordinates.ts` and `DrawingCanvas.tsx`:

1. **`canonical-coordinates.ts` Lines 54–72**:
   ```typescript
   export function renderStrokeSegment(
     ctx: CanvasRenderingContext2D,
     p0: CanonicalPoint,
     p1: CanonicalPoint,
     color: string,
     size: number
   ): void {
     ...
     const mid = getMidPoint(p0, p1);

     ctx.beginPath();
     ctx.moveTo(p0.x, p0.y);
     ctx.quadraticCurveTo(p0.x, p0.y, mid.x, mid.y);
     ctx.stroke();
   }
   ```
2. **`DrawingCanvas.tsx` Lines 177–181**:
   ```typescript
   renderStrokeSegment(ctx, lastPointRef.current, point, effectiveColor, size);
   lastPointRef.current = point;
   strokeBufferRef.current.push(point);
   ```
   **Observation**:
   - `renderStrokeSegment` moves to `p0` and draws a quadratic curve to `mid = getMidPoint(p0, p1)`.
   - In `handlePointerMove`, `lastPointRef.current` is set to `point` (not `mid`).
   - On the next move event, drawing begins at `point` and curves to `mid(point, point_next)`.
   - The region between `mid(p0, point)` and `point` is **never drawn on local canvas**, creating 50% gaps/discontinuities along the stroke during continuous pointer movement.

---

## 2. Logic Chain

1. **Scoring Math Contract & Requirements**:
   - `PROJECT.md` Feature F13 & `IMPLEMENTATION_PLAN.md` §7.5 mandate:
     "Points are instead scaled continuously with the actual elapsed time fraction relative to the effective active duration ($T_{effective}$): If timer acceleration was triggered at elapsed time $t_{accel}$, $T_{effective} = t_{accel} + 30$."
   - The primary objective of this equation was to eliminate the 49% cliff between solver 1 and solver 2.
2. **Execution Reality in `RysowanieGameSession`**:
   - `RysowanieGameSession` does not maintain a cumulative round elapsed timer (`elapsedRoundSeconds`).
   - Instead, it subtracts `drawTimeRemaining` from `drawTimeTotal`.
   - When the first solver solves, `accelerateTimer(30)` clamps `drawTimeRemaining` to 30.
   - Any solver after that point has their elapsed time calculated as $80 - \text{clampedRemaining}$, producing spurious elapsed times $\ge 50\text{s}$.
   - Simultaneously, `getEffectiveDuration()` computes `drawTimeTotal - 30 + 30 = drawTimeTotal`, so $T_{effective}$ is never adjusted to $t_{accel} + 30$.
   - Combining $\text{elapsed} \ge 50$ with $T_{effective} = 80$ yields a score drop from 450 to 228 (49.33%), perfectly reproducing the bug the milestone was intended to solve.
3. **Local Drawing Pipeline**:
   - Drawing local preview incrementally requires each segment to connect smoothly with the next. Drawing from `p0` to `mid` while advancing `lastPoint` to `p1` leaves the span $[mid \dots p1]$ unrendered locally.

---

## 3. Caveats

- The standalone Socket.io architecture, rate limiters (token bucket), guest fallback, JWT cookie handshake, room pinning, scanline flood fill (with $O(1)$ early exit and visited bitmask), and 26-color palette are cleanly implemented and structurally sound.
- The mascot files `chameleonLogoPaths.ts` and `ChameleonMascot.tsx` were preserved with zero alterations.
- The issue is isolated to state-machine time accounting in `src/server/games/rysowanie-state.ts` and segment rendering in `canonical-coordinates.ts`.

---

## 4. Conclusion & Actionable Fixes

**Verdict**: **REQUEST_CHANGES**

### Required Fixes for Approval:

#### Fix 1: State Machine Real Elapsed Time & Dynamic Effective Duration
In `src/server/games/rysowanie-state.ts`:
1. Add state tracking for real elapsed seconds and acceleration timestamp:
   ```typescript
   private elapsedRoundSeconds = 0;
   private accelElapsedSeconds: number | null = null;
   ```
2. In `selectWord(word)`:
   - Reset `this.elapsedRoundSeconds = 0;` and `this.accelElapsedSeconds = null;`.
   - In the 1s `timerInterval`:
     ```typescript
     this.elapsedRoundSeconds++;
     this.state.drawTimeRemaining--;
     ```
3. Update `getEffectiveDuration()`:
   ```typescript
   private getEffectiveDuration(): number {
     return this.accelElapsedSeconds !== null
       ? this.accelElapsedSeconds + 30
       : this.state.drawTimeTotal;
   }
   ```
4. In `processMessage()` upon correct guess:
   ```typescript
   const elapsed = this.elapsedRoundSeconds;
   this.solverTimes.set(senderId, elapsed);

   const solverRank = this.state.solvedPlayerIds.length;

   // If 1st solver and remaining time > 30s, trigger acceleration and set effective duration
   if (solverRank === 1 && this.state.drawTimeRemaining > 30) {
     this.accelElapsedSeconds = elapsed;
     this.accelerateTimer(30);
   }

   const effectiveDuration = this.getEffectiveDuration();
   const points = calculateGuesserScore(elapsed, effectiveDuration, solverRank);
   ```
5. Add an integration test in `tests/unit/rysowanie-state.test.ts` where:
   - Solver 1 solves at $t = 10\text{s}$ ($R=1$).
   - Fake timer advances by 2s.
   - Solver 2 solves at $t = 12\text{s}$ ($R=2$).
   - Assert: Solver 1 earns 400 pts, Solver 2 earns 361 pts, and the score drop is strictly $< 12\%$.

#### Fix 2: Local Stroke Segment Continuity
In `src/components/canvas/canonical-coordinates.ts` / `DrawingCanvas.tsx`:
- For real-time incremental preview in `renderStrokeSegment`, connect directly from `p0` to `p1`:
  ```typescript
  export function renderStrokeSegment(
    ctx: CanvasRenderingContext2D,
    p0: CanonicalPoint,
    p1: CanonicalPoint,
    color: string,
    size: number
  ): void {
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  }
  ```
  *(Full Bézier quadratic smoothing remains in `renderPolylineStroke` for packet batches and canvas replay).*

---

## 5. Verification Method

To verify the fixes once implemented:

1. **Verify State Machine 2-Solver Cliff Elimination**:
   Run the newly added test in `tests/unit/rysowanie-state.test.ts`:
   ```powershell
   $env:PATH = "C:\Program Files\nodejs;" + $env:PATH; & 'C:\Program Files\nodejs\npm.cmd' test tests/unit/rysowanie-state.test.ts
   ```
   Must verify that Solver 1 ($t=10\text{s}$) scores 400, Solver 2 ($t=12\text{s}$) scores 361, and percent drop is ~9.75%.

2. **Run Full Test Suite**:
   ```powershell
   $env:PATH = "C:\Program Files\nodejs;" + $env:PATH; & 'C:\Program Files\nodejs\npm.cmd' test
   $env:PATH = "C:\Program Files\nodejs;" + $env:PATH; & 'C:\Program Files\nodejs\npm.cmd' run typecheck
   $env:PATH = "C:\Program Files\nodejs;" + $env:PATH; & 'C:\Program Files\nodejs\npm.cmd' run lint
   $env:PATH = "C:\Program Files\nodejs;" + $env:PATH; & 'C:\Program Files\nodejs\npm.cmd' run build
   ```
