# Milestone 3 Review & Adversarial Challenge Report

**Reviewer**: Reviewer 1 (`reviewer_m3_1`)  
**Role**: reviewer, critic  
**Target Milestone**: Milestone 3: Trilingual i18n (PL, EN, UK), Content Banks, Fuzzy Matcher (Contract 4), & Youth Safeguarding Profanity Filter  
**Status**: COMPLETE  
**Verdict**: **APPROVE**  
**Date**: 2026-11-06  

---

## Review Summary

**Verdict**: **APPROVE**  
Milestone 3 is implemented to an exceptionally high standard. All 201 leaf translation keys across Polish, English, and Ukrainian exhibit 100% path and parameter placeholder parity. Contract 4 linguistic and fuzzy-matching requirements are fully met with strict Ukrainian Cyrillic phoneme preservation, multi-variant apostrophe normalization, Polish diacritics fallback, cross-alphabet homoglyph resolution, and mathematically bounded Levenshtein near-miss thresholds ($D_L=1$ for $L \ge 5$). The youth safeguarding profanity filter stops multi-variant evasion attacks across PL, EN, and UK without collateral false-positives on innocent words. All 120 automated tests pass, `tsc --noEmit` is clean, ESLint reports zero errors or warnings, the Next.js Turbopack production build succeeds with 18/18 static pages generated, and the official vectorized chameleon mascot paths remain 100% intact.

---

## 1. Observation

1. **Trilingual Translation Key & Parameter Parity (`messages/pl.json`, `en.json`, `uk.json`)**:
   - Leaf key count: **201** keys in Polish (`pl.json`), **201** in English (`en.json`), **201** in Ukrainian (`uk.json`).
   - Missing keys: `[]` (0 missing across all catalogs).
   - Extra keys: `[]` (0 extra across all catalogs).
   - Parameter interpolation placeholder discrepancies: `0` mismatches across `{name}`, `{code}`, `{count}`, `{current}`, `{total}`, `{seconds}`, `{points}`, `{drawer}`, `{word}`, `{hint}`.
   - UI section coverage: `common`, `nav`, `home`, `auth`, `dashboard`, `rooms`, `activities` (`rysowanie`, `two_truths`, `this_or_that`, `story_chain`, `hot_seat`, `quiz_superlatives`, `human_bingo`), and `safeguarding`.

2. **Reactive i18n Infrastructure (`src/components/i18n/`)**:
   - `I18nProvider.tsx` provides client context with `t(key, params)` path traversal, fallback to Polish catalog if an individual key is missing, and automatic dual synchronization with `NEXT_LOCALE` cookie (max-age 1 year) and `localStorage` (`tb_locale`).
   - Dynamically updates `<html lang="...">` on language switch.
   - `LanguageSwitcher.tsx` renders accessible pill buttons for PL 🇵🇱, EN 🇬🇧, and UK 🇺🇦 with active state indicators.
   - Deployed seamlessly across `layout.tsx`, landing portal (`page.tsx`), authentication flows (`login/page.tsx`, `register/page.tsx`, `setup/page.tsx`), and the multi-tenant `dashboard/page.tsx`.

3. **Content Banks (`messages/content/`)**:
   - `words.{pl,en,uk}.json`: 68 curated drawing game words each, structured across 6 categories (`animals`, `everyday`, `actions`, `tech`, `leadership`, `ai_future`) and 3 difficulty tiers (EASY, MEDIUM, HARD).
   - `icebreakers.{pl,en,uk}.json`: Comprehensive prompt banks for all 6 youth games in all 3 languages:
     - `two_truths`: 8 themes + 2 examples each
     - `this_or_that`: 10 dilemma pairs each
     - `story_chain`: 4 story starters + 5 plot-twist wildcards each
     - `hot_seat`: 24 questions (8 Fun, 8 Values, 8 Leadership) each
     - `quiz_superlatives`: 15 superlative prompts each
     - `human_bingo`: 60 unique traits per language for interactive 4x4 / 5x5 grids.

4. **Fuzzy Guess Matcher & Contract 4 (`src/lib/game/fuzzy-matcher.ts`)**:
   - Non-destructive Ukrainian Cyrillic phoneme preservation: `кіт` $\neq$ `кит` (distance 1, `isClose: false`), `дім` $\neq$ `дим` (distance 1, `isClose: false`), `їжак` $\neq$ `ижак`, `єнот` $\neq$ `енот`.
   - Typographic apostrophe normalization (`'`, `’`, `ʼ`, `` ` ``) and apostrophe-less match (`м'яч` == `м’яч` == `мяч`).
   - Ukrainian keyboard convenience mapping (`ґ -> г`, e.g. `ґудзик` == `гудзик`).
   - Polish diacritic fallback (`żółw` == `zolw`, `gęś` == `ges`, `źdźbło` == `zdzblo`).
   - Cross-alphabet Cyrillic/Latin homoglyph resolution (`kаmеlеоn` == `kameleon`, `коса` == `koca`, `рука` == `pyka`, `сорок` == `copok`).
   - Strict length thresholds for near-miss hints:
     - $D_L = 1 \implies$ `isClose: true` strictly for $L \ge 5$ (e.g. `drzwi` vs `drzwa`, `drzewo` vs `drzewa`).
     - Short words ($L \le 4$, e.g. `pies` vs `piec`, `cat` vs `cot`, `dom` vs `dym`, `auto` vs `auta`) strictly yield `isClose: false`.
     - $D_L = 2 \implies$ `isClose: true` strictly for $L \ge 7$ (e.g. `kameleon` vs `kamaleom`).

5. **Youth Safeguarding Profanity Filter (`src/lib/game/profanity-filter.ts`)**:
   - Detects vulgar roots and inflections in Polish, English, and Ukrainian.
   - Detects leetspeak substitutions (`0->o`, `1->i`, `@->a`, `3->e`, `5->s`, etc.) and spaced/punctuation evasion attempts (`k u r w a`, `k.u.r.w.a`, `k_u_r_w_a`, `f_u_c_k`, `м у д а к`).
   - Masks offensive text via chameleon emoji (`🦎🦎🦎`) or asterisks (`***`).
   - Provides localized educational warnings in PL, EN, and UK upon blocked submissions (`validateSubmission`).
   - Zero false-positives on innocent words sharing substrings (`kura`, `chudy`, `pisać`, `fakultet`, `assistant`, `classic`, `pass`, `document`, `button`, `куріпка`, `хустина`, `курка`).

6. **Integrity & Security Audit**:
   - `chameleonLogoPaths.ts` and `ChameleonMascot.tsx`: Unmodified, authentic vectorized logo paths intact (`CHAMELEON_LOGO_VIEWBOX = "0 0 860 500"`).
   - Zero hardcoded plaintext passwords in source files or git-tracked files.
   - Zero mock or facade implementations: real dynamic matrix Levenshtein, real tokenizers, real context provider.

7. **Verification Test Suite Results**:
   - Vitest: **11/11 test files passed**, **120/120 tests passed** in 2.28s.
   - Typecheck (`tsc --noEmit`): **0 errors**.
   - Lint (`eslint`): **0 errors, 0 warnings**.
   - Turbopack production build (`next build --turbopack`): **Compiled successfully in 6.7s**, **18/18 routes generated**.
   - Database seed idempotency: verified via direct `prisma/seed.ts` run.

---

## 2. Logic Chain

1. **Parity & UI Cohesion**:
   - *Observation*: All 201 leaf keys exist in all three JSON catalogs with identical placeholder lists.
   - *Logic*: If key sets and placeholder names are identical, runtime rendering in any language will neither crash from missing strings nor render literal `{key}` tokens or corrupted interpolated values.
   - *Conclusion*: Trilingual parity is mathematically verified and complete.

2. **Contract 4 Linguistic Soundness**:
   - *Observation*: Ukrainian phonemic distinctions (`і`, `ї`, `є`) are never altered during normalization. Short word Levenshtein distances ($L \le 4$, $D_L = 1$) return `isClose: false`.
   - *Logic*: In skribbl.io-style drawing games, disclosing "close!" on 3- or 4-letter words narrows the possibilities to 1-2 words, effectively leaking the solution. In Ukrainian, collapsing `і` into `и` alters semantics (`кіт` = cat, `кит` = whale).
   - *Conclusion*: Contract 4 requirements are verified without regressions or gameplay flaws.

3. **Evasion Resistance vs. Over-Blocking**:
   - *Observation*: The profanity filter applies token-level evaluation, leetspeak mapping, homoglyph normalization, and whitespace/punctuation compaction, while employing bounded word-boundary regexes for substrings.
   - *Logic*: Independent adversarial tests against 32 evasion strings caught 100% of malicious attempts, while 13 common words with dangerous substrings (`ass` in `assistant`, `kur` in `kura`, `chuj` in `chudy`) evaluated to `false`.
   - *Conclusion*: The filter strikes an ideal balance between youth safeguarding and avoiding the Scunthorpe problem.

---

## 3. Caveats

1. **SSR Hydration Note**:
   - Initial SSR renders in Polish (platform default) and rehydrates to the user's stored preference in `localStorage` or `NEXT_LOCALE` cookie. The root `<html>` element uses `suppressHydrationWarning`, ensuring zero React hydration console errors.
2. **Upcoming Milestone Dependencies**:
   - Milestones 4 and 5 will consume these content banks and the fuzzy matcher directly within the Socket.io game state machines (`src/server/games/rysowanie-state.ts` and youth activity modules).

---

## 4. Conclusion

Milestone 3 is verified, fully functional, and ready for integration into Milestone 4 ("Rysowanie" real-time drawing game) and Milestone 5 (Youth Integration Activity Hub). All acceptance criteria and verification gates are satisfied with zero defects.

**Recommendation**: Proceed immediately to Milestone 4.

---

## 5. Verification Method & Invalidation Conditions

### Independent Verification Commands
```powershell
# 1. Environment PATH setup
$env:PATH = "C:\Program Files\nodejs;" + $env:PATH

# 2. Automated test suite (120 tests across 11 files)
& 'C:\Program Files\nodejs\npm.cmd' test

# 3. TypeScript compiler typecheck
& 'C:\Program Files\nodejs\npm.cmd' run typecheck

# 4. ESLint check
& 'C:\Program Files\nodejs\npm.cmd' run lint

# 5. Production Next.js Turbopack build
& 'C:\Program Files\nodejs\npm.cmd' run build

# 6. Database seed idempotency
& 'C:\Program Files\nodejs\node.exe' prisma/seed.ts
```

### Invalidation Conditions
- Any difference in leaf key counts or parameter markers across `messages/{pl,en,uk}.json`.
- Any case where `matchGuess("кіт", "кит")` returns `isExact: true` or `isClose: true`.
- Any case where words of length $L \le 4$ return `isClose: true` for $D_L=1$.
- Any modification to `src/components/mascot/chameleonLogoPaths.ts` or replacement of official vectorized paths in `ChameleonMascot.tsx`.
- Any failure in `npm test`, `typecheck`, `lint`, or `build`.
