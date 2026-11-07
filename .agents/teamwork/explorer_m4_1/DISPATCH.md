## 2026-11-06T19:34:51Z
You are Explorer M4 (`explorer_m4_1`).
Your working directory is: `c:\Users\tyber\teambonding\.agents\teamwork\explorer_m4_1\`
Read mandatory files first:
- `c:\Users\tyber\teambonding\.agents\teamwork\ORIGINAL_REQUEST.md`
- `c:\Users\tyber\teambonding\PROJECT.md`
- `c:\Users\tyber\teambonding\IMPLEMENTATION_PLAN.md`

Your mission:
Investigate and produce an exhaustive technical implementation roadmap for **Milestone 4 — "Rysowanie" (skribbl.io-style Real-Time Multiplayer Drawing Game)**:
1. **Socket.io Architecture**:
   - Check `package.json` to see if `socket.io` and `socket.io-client` are installed.
   - Design custom server architecture (`server.ts` or `src/server/socket-server.ts`) that pairs with Next.js 15 App Router so that a single Node.js process serves both Next.js pages and WebSocket connections seamlessly.
2. **Canonical $1200 \times 900$ HTML5 Canvas**:
   - Coordinate clamping $[0..1199, 0..899]$ with zero-dimension guards (`if (!rect.width || !rect.height) return null`).
   - CSS viewport fitting (`max-width: calc(100vh * 4 / 3); max-height: 100%; aspect-ratio: 4 / 3; width: 100%; margin: 0 auto; touch-action: none;`).
   - Quadratic Bézier stroke smoothing and 26-color palette + 4 brush sizes + eraser + undo/redo + clear.
   - Non-recursive scanline stack flood fill on `Uint32Array` with `Uint8Array(1200 * 900)` visited bitmask and little-endian ABGR packing.
3. **skribbl.io Game Loop & State Machine**:
   - Turn lifecycle: Lobby -> Word selection (15s, 3 words from `messages/content/words.{lang}.json`) -> Drawing phase (custom draw time, e.g. 80s) -> Round intermission -> Game Over podium.
   - Progressive letter hints: $K_{effective} = \min(K, \lfloor (L-1)/2 \rfloor)$, dynamic 30s timer acceleration.
   - Solvers-only chat isolation: once a player guesses correctly, their chat is hidden from unsolved players, while solvers can chat together; near-miss Levenshtein broadcast ($L \ge 5, D_L=1$).
   - Scoring formulas: continuous time-decay guesser formula ($100 + 400 \times t/T$) and drawer formula with zero-division guard.
4. **Mascot Integrity**:
   - Confirm that `src/components/mascot/chameleonLogoPaths.ts` and `src/components/mascot/ChameleonMascot.tsx` must remain 100% untouched.

Write your report to `c:\Users\tyber\teambonding\.agents\teamwork\explorer_m4_1\handoff.md` and send a completion message with summary.
