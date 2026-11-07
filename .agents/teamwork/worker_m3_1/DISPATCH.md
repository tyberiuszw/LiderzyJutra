## 2026-11-06T18:44:52Z
You are Worker 1 for Milestone 3: Trilingual i18n (PL, EN, UK) & Content Banks in 'Team bonding Liderzy Jutra'.
Your working directory is: `c:\Users\tyber\teambonding\.agents\teamwork\worker_m3_1\`
Your parent conversation ID is: `3f2fbc89-93fd-46ef-bd57-df8c289f5cb2`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY FIRST STEPS:
1. Read `c:\Users\tyber\teambonding\.agents\teamwork\ORIGINAL_REQUEST.md`.
2. Read `c:\Users\tyber\teambonding\.agents\teamwork\explorer_m3_1\handoff.md` (authoritative technical blueprint and implementation specifications).
3. Read `c:\Users\tyber\teambonding\PROJECT.md`.

CRITICAL CONSTRAINTS:
- DO NOT overwrite or alter `src/components/mascot/chameleonLogoPaths.ts` or replace official logo paths in `src/components/mascot/ChameleonMascot.tsx`!
- Windows PowerShell environment requirement: Always prepend `C:\Program Files\nodejs` to `$env:PATH`:
  `$env:PATH = "C:\Program Files\nodejs;" + $env:PATH; & 'C:\Program Files\nodejs\npm.cmd' <args>`

YOUR SCOPE OF WORK:
1. Author Trilingual Translation Catalogs:
   - Create `messages/pl.json`, `messages/en.json`, and `messages/uk.json` with 100% key parity across all UI sections (common, nav, home, auth, dashboard, rooms) per `explorer_m3_1/handoff.md § Blueprint A`.
2. Implement Reactive Trilingual UI Infrastructure:
   - Create `src/components/i18n/I18nProvider.tsx` with locale context, `t()` function with parameter interpolation `{name}`, `{count}`, and cookie/localStorage synchronization (`NEXT_LOCALE` / `tb_locale`).
   - Create `src/components/i18n/LanguageSwitcher.tsx` with pill buttons for PL 🇵🇱, EN 🇬🇧, UK 🇺🇦.
   - Wrap application in `I18nProvider` in `src/app/layout.tsx`.
   - Place `LanguageSwitcher` in navigation headers across landing page (`src/app/page.tsx`), auth layouts, and `src/app/dashboard/page.tsx`.
   - Update UI strings in `login`, `register`, `setup`, `dashboard`, and `page.tsx` to use `useI18n()` translations.
3. Author Content Banks:
   - Create `messages/content/words.pl.json`, `words.en.json`, `words.uk.json` with categorized drawing words (Easy, Medium, Hard).
   - Create `messages/content/icebreakers.pl.json`, `icebreakers.en.json`, `icebreakers.uk.json` with curated prompt decks for all 6 youth games (Two Truths, This or That, Story Chain, Hot Seat across 3 depth tiers, Team Superlatives, Human Bingo with 60 traits).
4. Update `prisma/seed.ts` to seed global `WordBank` and `QuestionDeck` records into the database with `isGlobal: true`, and test seed idempotency (`node.exe prisma/seed.ts`).
5. Implement Fuzzy Guess Matcher (`src/lib/game/fuzzy-matcher.ts`):
   - Contract 4 compliance: Ukrainian Cyrillic phoneme preservation (`і, ї, є` preserved), Ukrainian apostrophe normalization (`'`, `’`, `ʼ`, `` ` ``), keyboard convenience (`ґ -> г`), Polish diacritics fallback, Cyrillic/Latin homoglyph mapping (`а, е, і, о, р, с, х, у` <-> `a, e, i, o, p, c, x, y`).
   - Levenshtein distance calculation: "is close!" detection ($D_L = 1$) restricted to words of length $L \ge 5$.
6. Implement Youth Safeguarding Profanity Filter (`src/lib/game/profanity-filter.ts`):
   - Trilingual (PL, EN, UK) profanity regexes and word lists.
   - Text masking (`sanitizeText`) replacing with `***` or `🦎🦎🦎`.
   - Validation (`validateSubmission`) returning localized safety errors on blacklisted words.
7. Author Comprehensive Automated Unit Tests:
   - `tests/unit/i18n-parity.test.ts`: Recursively validates 100% key parity between `pl.json`, `en.json`, and `uk.json`.
   - `tests/unit/fuzzy-matcher.test.ts`: Exhaustive test of exact matches, Ukrainian phoneme preservation (`кіт` vs `кит`), apostrophe normalization (`м’яч` vs `м'яч`), Polish diacritics (`żółw` vs `zolw`), homoglyphs (`kаmеlеоn` vs `kameleon`), Levenshtein bounds ($L < 5$ vs $L \ge 5$).
   - `tests/unit/profanity-filter.test.ts`: Exhaustive test of masking and validation across Polish, English, and Ukrainian vulgarities and evasion attempts.
8. Run Verification Commands:
   - `$env:PATH = "C:\Program Files\nodejs;" + $env:PATH; & 'C:\Program Files\nodejs\npm.cmd' test`
   - `$env:PATH = "C:\Program Files\nodejs;" + $env:PATH; & 'C:\Program Files\nodejs\npm.cmd' run typecheck`
   - `$env:PATH = "C:\Program Files\nodejs;" + $env:PATH; & 'C:\Program Files\nodejs\npm.cmd' run lint`
   - `$env:PATH = "C:\Program Files\nodejs;" + $env:PATH; & 'C:\Program Files\nodejs\npm.cmd' run build`
   Ensure 100% of tests pass and zero TypeScript errors exist.
9. Write complete handoff report in `c:\Users\tyber\teambonding\.agents\teamwork\worker_m3_1\handoff.md`.
10. Send a message to parent (`3f2fbc89-93fd-46ef-bd57-df8c289f5cb2`) when complete.


## 2026-11-06T19:07:52Z
**Context**: Milestone 3 Implementation Completion after Server Restart
**Content**: Server restart occurred. All files for Milestone 3 appear to be in place (fuzzy matcher, profanity filter, i18n catalogs, components, unit tests). Please execute the test suite (`npm.cmd test`), typecheck, lint, and build to verify all pass, author `c:\Users\tyber\teambonding\.agents\teamwork\worker_m3_1\handoff.md`, and report your final status.
**Action**: Run verification, write handoff.md, and reply with completion summary.
