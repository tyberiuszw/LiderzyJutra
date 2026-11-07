# BRIEFING — 2026-11-06T20:12:00Z

## Mission
Deliver Milestone 3: Trilingual i18n (PL, EN, UK), Content Banks, Seed Data, Fuzzy Guess Matcher, Youth Safeguarding Profanity Filter, and Automated Unit Tests for 'Team bonding Liderzy Jutra'.

## 🔒 My Identity
- Archetype: implementer
- Roles: implementer, qa, specialist
- Working directory: c:\Users\tyber\teambonding\.agents\teamwork\worker_m3_1\
- Original parent: 3f2fbc89-93fd-46ef-bd57-df8c289f5cb2
- Milestone: Milestone 3 - Trilingual i18n & Content Banks

## 🔒 Key Constraints
- DO NOT CHEAT. All implementations must be genuine. No hardcoded test passes or dummy facades.
- DO NOT overwrite or alter `src/components/mascot/chameleonLogoPaths.ts` or replace official logo paths in `src/components/mascot/ChameleonMascot.tsx`!
- Windows PowerShell environment requirement: Always prepend `C:\Program Files\nodejs` to `$env:PATH`:
  `$env:PATH = "C:\Program Files\nodejs;" + $env:PATH; & 'C:\Program Files\nodejs\npm.cmd' <args>`
- Maintain 100% key parity across `messages/pl.json`, `messages/en.json`, `messages/uk.json`.
- Preserve Ukrainian Cyrillic phonemes (`і, ї, є` distinct from `и`), normalize apostrophes (`'`, `’`, `ʼ`, `` ` ``), keyboard convenience `ґ -> г`, Cyrillic/Latin homoglyphs mapping.
- Levenshtein $D_L = 1$ "is close!" detection restricted to words of length $L \ge 5$.
- Trilingual profanity filtering with masking and localized validation errors.
- 100% tests pass, zero TypeScript errors, clean lint, successful build.

## Current Parent
- Conversation ID: 3f2fbc89-93fd-46ef-bd57-df8c289f5cb2
- Updated: 2026-11-06T20:12:00Z

## Task Summary
- **What to build**: Trilingual catalogs, reactive i18n provider & switcher, content banks (words & icebreakers), seed updates, fuzzy guess matcher, profanity filter, comprehensive unit tests.
- **Success criteria**: 100% key parity, all 120 tests passing, typecheck/lint/build passing, seed idempotent.
- **Interface contracts**: PROJECT.md and explorer_m3_1/handoff.md
- **Code layout**: PROJECT.md

## Key Decisions Made
- Flat route architecture with reactive I18nProvider + cookie/localStorage persistence (`NEXT_LOCALE` / `tb_locale`) to preserve App Router routes and prevent SSR hydration mismatch.
- Complete 100% key parity verified recursively across `messages/pl.json`, `messages/en.json`, and `messages/uk.json` with identical parameter interpolation markers.
- Seed script idempotent upserting of global WordBank and QuestionDeck records linked to systemOrg.
- Full Contract 4 compliance: Ukrainian phonemes (`і, ї, є`) preserved, apostrophes normalized, keyboard convenience (`ґ -> г`), homoglyphs (`а, е, і, о, р, с, х, у, к` <-> `a, e, i, o, p, c, x, y, k`), and bounded Levenshtein ($L \ge 5$ for $D_L=1$, $L \ge 7$ for $D_L=2$).
- Youth safeguarding filter with regexes, leetspeak, homoglyphs, whitespace compacting, and dual masking modes (`🦎🦎🦎` and `***`).

## Artifact Index
- `messages/pl.json`, `messages/en.json`, `messages/uk.json` — Trilingual UI catalogs
- `messages/content/words.{pl,en,uk}.json` — Categorized drawing dictionaries
- `messages/content/icebreakers.{pl,en,uk}.json` — Prompt decks for all 6 games including 60 bingo traits
- `src/components/i18n/I18nProvider.tsx` — Reactive i18n context & `t()` parameter interpolation
- `src/components/i18n/LanguageSwitcher.tsx` — Language selection pill component
- `src/lib/game/fuzzy-matcher.ts` — Diacritic-tolerant, Contract 4 fuzzy matcher
- `src/lib/game/profanity-filter.ts` — Trilingual youth safeguarding filter & sanitizer
- `prisma/seed.ts` — Updated global database seeder
- `tests/unit/i18n-parity.test.ts` — Automated 100% key parity test suite
- `tests/unit/fuzzy-matcher.test.ts` — Linguistic precision & Levenshtein unit tests
- `tests/unit/profanity-filter.test.ts` — Vulgarity & evasion unit tests

## Change Tracker
- **Files modified**:
  - `messages/pl.json`, `messages/en.json`, `messages/uk.json` (created)
  - `messages/content/words.{pl,en,uk}.json` (created)
  - `messages/content/icebreakers.{pl,en,uk}.json` (created)
  - `src/components/i18n/I18nProvider.tsx` (created)
  - `src/components/i18n/LanguageSwitcher.tsx` (created)
  - `src/lib/game/fuzzy-matcher.ts` (created)
  - `src/lib/game/profanity-filter.ts` (created)
  - `prisma/seed.ts` (updated)
  - `src/app/layout.tsx` (updated)
  - `src/app/page.tsx` (updated)
  - `src/app/(auth)/login/page.tsx` (updated)
  - `src/app/(auth)/register/page.tsx` (updated)
  - `src/app/(auth)/setup/page.tsx` (updated)
  - `src/app/dashboard/page.tsx` (updated)
  - `tests/unit/i18n-parity.test.ts` (created)
  - `tests/unit/fuzzy-matcher.test.ts` (created)
  - `tests/unit/profanity-filter.test.ts` (created)
- **Build status**: PASS (18/18 routes statically generated via Turbopack)
- **Pending issues**: None

## Quality Status
- **Build/test result**: 120/120 tests pass (11 test files), typecheck clean, lint clean, build clean
- **Lint status**: 0 errors, 0 warnings
- **Tests added/modified**: 43 new unit tests across 3 dedicated test files

## Loaded Skills
- None
