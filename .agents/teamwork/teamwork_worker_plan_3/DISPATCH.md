# DISPATCH LOG

## 2026-11-06T14:54:50Z
You are Worker 3: Plan Refinement & Defect Remediation Worker.
Your working directory is: c:\Users\tyber\teambonding\.agents\teamwork\teamwork_worker_plan_3\
Original Request path: c:\Users\tyber\teambonding\.agents\teamwork\ORIGINAL_REQUEST.md
Deliverable to Update:
- File 1: c:\Users\tyber\teambonding\IMPLEMENTATION_PLAN.md
- File 2: c:\Users\tyber\teambonding\PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

CRITICAL INSTRUCTIONS:
1. You MUST read c:\Users\tyber\teambonding\.agents\teamwork\ORIGINAL_REQUEST.md before starting work.
2. In accordance with user requirements, NO application code modifications may be made before the plan is approved (do not touch src/ or create application code). You are editing the plan and blueprint markdown files.
3. Review the exact feedback from the challengers and reviewers:
   - Challenger 1 handoff: c:\Users\tyber\teambonding\.agents\teamwork\teamwork_challenger_plan_1\handoff.md
   - Challenger 2 handoff: c:\Users\tyber\teambonding\.agents\teamwork\teamwork_challenger_plan_2\handoff.md
   - Reviewer 1 & 2 handoffs: c:\Users\tyber\teambonding\.agents\teamwork\teamwork_reviewer_plan_1\handoff.md and c:\Users\tyber\teambonding\.agents\teamwork\teamwork_reviewer_plan_2\handoff.md
4. Remediate ALL 12 concrete findings in c:\Users\tyber\teambonding\IMPLEMENTATION_PLAN.md and c:\Users\tyber\teambonding\PROJECT.md:
   a. Dynamic Theming WCAG AA Contrast (Defect 1):
      - Replace the flawed Y > 0.45 threshold with direct contrast maximization:
        CR_white = 1.05 / (Y + 0.05), CR_dark = (Y + 0.05) / 0.060.
        Select #FFFFFF if CR_white >= CR_dark (which occurs at Y <= 0.179), else select #0F172A. Explicitly prove this yields >= 4.5:1 across all 6 presets (e.g. Electric Cyan Y=0.385 -> #0F172A gives 7.25:1; Deep Indigo Y=0.125 -> #FFFFFF gives 6.0:1).
   b. Flood Fill Infinite Loop & Memory Layout (Defect 2):
      - Add an explicit Uint8Array visited bitmask (new Uint8Array(1200 * 900)) to guarantee loop termination even when filling colors within the tolerance threshold (Delta E <= 32).
      - Specify little-endian 32-bit pixel packing: (A << 24) | (B << 16) | (G << 8) | R.
   c. Hint Scheduling Bounding & Timer Acceleration Reschedule (Defect 3):
      - Cap hint count: K_effective = min(K, floor((L - 1) / 2)) so 3-letter words reveal at most 1 hint.
      - Specify dynamic hint rescheduling: when timer acceleration clamps remaining time to 30s, any unrevealed hints are evenly redistributed across the remaining 30s instead of being skipped or bursting simultaneously.
   d. Coordinate Normalization Clamping & Responsive Viewport (Defect 4):
      - Add explicit boundary clamping: X = clamp(0, round(...), 1199), Y = clamp(0, round(...), 899).
      - Add responsive CSS container: max-height: 100%; max-width: calc(100vh * 4 / 3) to prevent vertical scrolling on 16:9 / 21:9 displays.
   e. Scoring Formula Smoothing & Zero-Division Guard (Defect 5):
      - Update guesser scoring to prevent the 49% cliff upon 30s acceleration: scale points continuously with elapsed time fraction (t_elapsed / T_total) rather than raw clamped remaining time.
      - Add zero-division guard in drawer score: if N_total_guessers == 0, S_drawer = 0.
   f. Ukrainian Normalization Preservation (Defect 6):
      - Clarify that Ukrainian Cyrillic characters are NEVER stripped; only Unicode variants (apostrophe ’ vs ', combining diacritics, case-folding) are normalized, preserving distinct phonemes (і, ї, є, ґ) and preventing false collisions.
   g. Bluff Bonus Fair Balancing (Defect 7):
      - Normalize Bluff Bonus in "Dwie prawdy i kłamstwo": S_bluff = round(200 * N_fooled / N_peers), capped at 200 pts, to keep the cross-activity leaderboard fair in large rooms (up to 30 players).
   h. Model-Aware Prisma Tenant Scoping (Defect 8):
      - Replace blanket prisma.$extends with a model-aware extension that scopes only multi-tenant models (User, Team, GameSession, WordBank, QuestionDeck, BingoTile, DrawingAction, ScoreRecord) and allows global asset fallback (isGlobal: true).
   i. WebSocket Rate Limiting & Cooldowns (Defect 9):
      - Specify token bucket rate limiting: max 4 msgs / 2 sec per socket for chat/guesses; 40 stroke packets / sec; 200ms cooldown for flood fill.
   j. Duplicate Guess Suppression (Defect 10):
      - Suppress identical guess submissions sent more than twice within a 3-second window.
   k. Youth Safeguarding & Trilingual Profanity Filter (Defect 11):
      - Add trilingual profanity filter (PL, EN, UK) for public chat, word submissions, and activity prompts.
   l. Bootstrap Seeding Race Condition & Homoglyph Normalization (Defect 12):
      - Guard /setup with transactional isolation (SELECT FOR UPDATE) to eliminate TOCTOU race conditions.
      - Include Cyrillic/Latin homoglyph mapping in fuzzy guessing (e.g. Cyrillic 'а' <-> Latin 'a').
