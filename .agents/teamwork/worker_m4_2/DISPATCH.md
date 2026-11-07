## 2026-11-06T20:12:49Z

You are Worker M4_2 (`worker_m4_2`).
Your working directory is: `c:\Users\tyber\teambonding\.agents\teamwork\worker_m4_2\`

Read mandatory files first:
- `c:\Users\tyber\teambonding\.agents\teamwork\ORIGINAL_REQUEST.md`
- `c:\Users\tyber\teambonding\PROJECT.md`
- `c:\Users\tyber\teambonding\IMPLEMENTATION_PLAN.md`
- `c:\Users\tyber\teambonding\.agents\teamwork\reviewer_m4_2\handoff.md`

MANDATORY INTEGRITY WARNING:
> DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

CRITICAL INVARIANTS:
1. DO NOT touch or modify `src/components/mascot/chameleonLogoPaths.ts` or replace official paths in `src/components/mascot/ChameleonMascot.tsx` with generic geometry! Keep official vector paths 100% intact.
2. In PowerShell: `$env:PATH = "C:\Program Files\nodejs;" + $env:PATH; & 'C:\Program Files\nodejs\npm.cmd' <args>`.
3. Zero plaintext secrets in git-tracked files.

Your Mission: Implement the two remediation items identified by Reviewer M4_2 in `reviewer_m4_2/handoff.md § 4`:

Item 1: State Machine Real Elapsed Time & Dynamic Effective Duration in `src/server/games/rysowanie-state.ts`:
1. Track cumulative real round elapsed seconds and acceleration timestamp:
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
5. Ensure `endTurn()` calculates drawer score using `this.getEffectiveDuration()` and the real `this.solverTimes`.
6. Add an integration test in `tests/unit/rysowanie-state.test.ts` simulating:
   - Solver 1 solves at $t = 10\text{s}$ ($R=1$).
   - Advance timer by 2s ($t = 12\text{s}$).
   - Solver 2 solves at $t = 12\text{s}$ ($R=2$).
   - Assert: Solver 1 scores 400 pts, Solver 2 scores 361 pts, and score percentage drop is strictly $< 12\%$ (~9.75%), proving runtime elimination of the 49% cliff.

Item 2: Local Stroke Segment Continuity in `src/components/canvas/canonical-coordinates.ts`:
- Update `renderStrokeSegment` to draw a continuous line from `p0` to `p1` (`ctx.lineTo(p1.x, p1.y)`) so local pointer moves have zero gaps:
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
  *(Keep full quadratic Bézier smoothing in `renderPolylineStroke` for packet batches and canvas history replay).*

Verification:
- Run: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.
- Write your handoff report to `c:\Users\tyber\teambonding\.agents\teamwork\worker_m4_2\handoff.md`.
- Send completion message to parent when done.
