## 2026-11-06T20:35:19Z
You are Worker M5 (`worker_m5_1`).
Your working directory is: `c:\Users\tyber\teambonding\.agents\teamwork\worker_m5_1\`

Read mandatory files first:
- `c:\Users\tyber\teambonding\.agents\teamwork\ORIGINAL_REQUEST.md`
- `c:\Users\tyber\teambonding\PROJECT.md`
- `c:\Users\tyber\teambonding\IMPLEMENTATION_PLAN.md`
- `c:\Users\tyber\teambonding\.agents\teamwork\explorer_m5_1\handoff.md`

MANDATORY INTEGRITY WARNING:
> DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

CRITICAL INVARIANTS:
1. DO NOT touch or modify `src/components/mascot/chameleonLogoPaths.ts` or replace official paths in `src/components/mascot/ChameleonMascot.tsx` with generic geometry! Official vector paths must remain 100% intact.
2. In PowerShell: `$env:PATH = "C:\Program Files\nodejs;" + $env:PATH; & 'C:\Program Files\nodejs\npm.cmd' <args>`.
3. Zero plaintext secrets in git-tracked code.

Your Mission: Implement Milestone 5 — Youth Integration Activity Hub (6 Multiplayer Modules + Unified Room Orchestrator) per the Explorer M5 roadmap:

1. **Unified Room Orchestrator & Server Refactoring (`src/server/`)**:
   - In `src/server/types.ts`: Expand types with `UnifiedRoomState`, `SessionScoreData`, and client/server socket events for game switching and each of the 6 activities.
   - In `src/server/rooms/room-manager.ts`: Implement `UnifiedRoomSession` supporting seamless switching of `currentGameType` (`RYSOWANIE`, `TWO_TRUTHS`, `THIS_OR_THAT`, `STORY_CHAIN`, `HOT_SEAT`, `QUIZ_SUPERLATIVES`, `HUMAN_BINGO`) within persistent room code `LJ-XXXX` without kicking players or resetting sockets.
   - Maintain session-wide aggregated scoreboard (`sessionScores`) accumulating scores across games, persisting to Prisma `ScoreRecord`.
   - In `src/server/socket-server.ts`: Wire up event handlers for `game:switch`, `game:start`, and module-specific events.

2. **The 6 Youth Integration State Machines (`src/server/games/`)**:
   - `two-truths-state.ts`: 3 statements submission (2 truths, 1 lie), 30s secret voting, 3D flip reveal, normalized bluff scoring $S_{bluff} = \text{round}(200 \times N_{fooled} / N_{peers}) \le 200$. Correct guessers receive $+100$ pts.
   - `this-or-that-state.ts`: 12s dilemma voting from localized decks in `icebreakers.{lang}.json`, animated split bar, avatar grouping, "Jedyny Wybraniec" outlier detection ($+50$ bonus pts when only 1 player picks an option with $\ge 3$ peers).
   - `story-chain-state.ts`: circular turn queue, sentence (20s) and word-by-word (6s) modes, plot twist wildcards every 5 turns, typewriter finale, Markdown/text export.
   - `hot-seat-state.ts`: active player hot seat, 3 depth tiers (Fun, Values, Leadership) from `icebreakers.{lang}.json`, audience question queue with upvoting, zero-penalty "Pas" lifeline.
   - `quiz-superlatives-state.ts`: superlative awards from `icebreakers.{lang}.json`, avatar grid voting, animated podium countdown (3rd, 2nd, 1st), team hall of fame.
   - `human-bingo-state.ts`: 4x4 or 5x5 dynamic grid generated from the 60 localized traits in `icebreakers.{lang}.json`, 2-way peer confirmation modal workflow (with 45s timeout), line detection (rows, cols, diagonals) with fanfare celebration.

3. **Client UI Shell & Components (`src/components/games/` & `src/app/room/[code]/page.tsx`)**:
   - `ActivityCarousel.tsx`: Beautiful carousel with cards for all 7 games, player counts, duration, and host launch button.
   - `SessionScoreboardModal.tsx`: Cumulative workshop leaderboard showing breakdown across games and grand podium.
   - Game module components: `TwoTruthsGame.tsx`, `ThisOrThatGame.tsx`, `StoryChainGame.tsx`, `HotSeatGame.tsx`, `QuizSuperlativesGame.tsx`, `HumanBingoGame.tsx`.
   - In `src/app/room/[code]/page.tsx`: Unified room header bar with chameleon logo, copyable room code `LJ-XXXX`, Activity Switcher dropdown for host, session scoreboard button, and dynamic rendering of the active game module.

4. **Automated Unit & Integration Tests (`tests/unit/`)**:
   - Write comprehensive unit tests for all 6 games and the orchestrator:
     - `tests/unit/two-truths.test.ts` (bluff normalization formula, voting, reveals)
     - `tests/unit/this-or-that.test.ts` (split percentages, outlier badge detection)
     - `tests/unit/story-chain.test.ts` (turn rotation, wildcards, markdown export)
     - `tests/unit/hot-seat.test.ts` (question tiers, upvoting queue, pass lifeline)
     - `tests/unit/quiz-superlatives.test.ts` (voting tally, podium ranking)
     - `tests/unit/human-bingo.test.ts` (4x4 and 5x5 line detection: rows, cols, diagonals)
     - `tests/unit/unified-room-orchestrator.test.ts` (game switching within room, session score aggregation)

5. **Verification**:
   - Run: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.
   - Write full report to `c:\Users\tyber\teambonding\.agents\teamwork\worker_m5_1\handoff.md`.
   - Send completion message to parent when done.
