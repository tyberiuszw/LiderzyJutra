## 2026-11-06T20:29:52Z
[Message] timestamp=2026-11-06T20:29:52Z sender=3f2fbc89-93fd-46ef-bd57-df8c289f5cb2 priority=MESSAGE_PRIORITY_HIGH content=You are Explorer M5 (`explorer_m5_1`).
Your working directory is: `c:\Users\tyber\teambonding\.agents\teamwork\explorer_m5_1\`

Read mandatory files first:
- `c:\Users\tyber\teambonding\.agents\teamwork\ORIGINAL_REQUEST.md`
- `c:\Users\tyber\teambonding\PROJECT.md`
- `c:\Users\tyber\teambonding\IMPLEMENTATION_PLAN.md`

Your mission:
Investigate and produce an exhaustive technical implementation roadmap for **Milestone 5 — Youth Integration Activity Hub (6 Multiplayer Modules + Unified Room Orchestrator)**:
1. **Existing Infrastructure & Localized Prompt Dictionaries**:
   - Inspect `src/server/socket-server.ts`, `src/server/rooms/room-manager.ts`, `src/server/types.ts`.
   - Inspect `messages/content/icebreakers.{pl,en,uk}.json` across all 6 games (including the 60 Human Bingo traits in each language).
   - Inspect `src/app/room/[code]/page.tsx` and see how the UI shell currently renders the lobby and game.
2. **Unified Room Orchestrator & Activity Switcher**:
   - Design how the host can seamlessly switch active games (`RYSOWANIE`, `TWO_TRUTHS`, `THIS_OR_THAT`, `STORY_CHAIN`, `HOT_SEAT`, `QUIZ_SUPERLATIVES`, `HUMAN_BINGO`) inside the same room code (`LJ-XXXX`) without disconnecting players or resetting session metadata.
   - Design session-wide aggregated scoreboard tracking points earned across games.
3. **State Machines, Rules & Mathematical Scoring for the 6 Integration Modules**:
   - *Dwie prawdy i kłamstwo* (Two Truths & A Lie): 3 statements submission (2 truths, 1 lie), secret voting (30s), 3D flip card reveal (`rotateY(180deg)`), normalized bluff scoring $S_{bluff} = \text{round}(200 \times N_{fooled} / N_{peers}) \le 200$.
   - *To czy Tamto* (This or That): 12s dilemma voting from localized decks, real-time animated split percentage bar, avatar grouping, outlier badge ("Jedyny Wybraniec").
   - *Wspólna Historia* (Story Chain): circular turn queue, sentence (20s) and word-by-word (6s) modes, plot twist wildcards, typewriter text reveal, Markdown/text story export.
   - *Gorące Krzesło* (Hot Seat Q&A): active player hot seat, 3 depth tiers (Fun, Values, Leadership), audience question queue with upvoting, psychological safety pass lifeline ("Pas").
   - *Quiz Drużynowy / Kto w Drużynie...* (Team Superlatives): superlative prompts, voting on peer avatars, podium reveal, team hall of fame.
   - *Bingo Integracyjne* (Human Bingo): 4x4 or 5x5 dynamic randomized grid generated from 60 localized traits, peer confirmation modal workflow (peer verifies "Yes, that's me!"), line check (horizontal, vertical, diagonal) and fanfare celebration.
4. **Mascot Preservation**:
   - Confirm `src/components/mascot/chameleonLogoPaths.ts` and `src/components/mascot/ChameleonMascot.tsx` must remain 100% untouched.

Write your report to `c:\Users\tyber\teambonding\.agents\teamwork\explorer_m5_1\handoff.md` and send a completion message with summary.
