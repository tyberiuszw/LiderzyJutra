import { describe, it, expect } from "vitest";
import {
  matchGuess,
  levenshteinDistance,
  normalizeUkrainianApostrophes,
  normalizeUkrainianKeyboard,
  stripPolishDiacritics,
  normalizeHomoglyphs,
} from "../../src/lib/game/fuzzy-matcher";

describe("Contract 4: Fuzzy Guess Matcher & Linguistic Precision", () => {
  // =========================================================================
  // 1. Direct & Exact Matches (PL, EN, UK)
  // =========================================================================
  describe("Direct & Exact Matches", () => {
    it("matches identical words case-insensitively with whitespace trimmed", () => {
      expect(matchGuess("kot", "kot")).toEqual({ isExact: true, isClose: false, distance: 0 });
      expect(matchGuess("KOT", "  kot  ")).toEqual({ isExact: true, isClose: false, distance: 0 });
      expect(matchGuess("chameleon", "Chameleon")).toEqual({ isExact: true, isClose: false, distance: 0 });
      expect(matchGuess("пес", "ПЕС")).toEqual({ isExact: true, isClose: false, distance: 0 });
    });

    it("matches multi-word phrases exactly", () => {
      expect(matchGuess("burza mózgów", "burza mózgów")).toEqual({ isExact: true, isClose: false, distance: 0 });
      expect(matchGuess("neural network", "neural network")).toEqual({ isExact: true, isClose: false, distance: 0 });
      expect(matchGuess("мозковий штурм", "мозковий штурм")).toEqual({ isExact: true, isClose: false, distance: 0 });
    });
  });

  // =========================================================================
  // 2. Ukrainian Cyrillic Phoneme Preservation (Contract 4)
  // =========================================================================
  describe("Ukrainian Cyrillic Phoneme Preservation", () => {
    it("strictly preserves 'і' vs 'и' — кіт (cat) is NOT кит (whale)", () => {
      // "кіт" (length 3, cat) vs "кит" (whale)
      const res = matchGuess("кіт", "кит");
      expect(res.isExact).toBe(false);
      // Because length = 3 < 5, distance is 1, but isClose must be FALSE to avoid clue leakage
      expect(res.distance).toBe(1);
      expect(res.isClose).toBe(false);
    });

    it("strictly preserves 'і' vs 'и' — дім (house) is NOT дим (smoke)", () => {
      // "дім" (length 3, house) vs "дим" (smoke)
      const res = matchGuess("дім", "дим");
      expect(res.isExact).toBe(false);
      expect(res.distance).toBe(1);
      expect(res.isClose).toBe(false);
    });

    it("strictly preserves 'ї' and 'є' against conflation", () => {
      expect(matchGuess("їжак", "ижак").isExact).toBe(false);
      expect(matchGuess("єнот", "енот").isExact).toBe(false);
    });
  });

  // =========================================================================
  // 3. Ukrainian Apostrophe Normalization & Apostrophe-less Match
  // =========================================================================
  describe("Ukrainian Apostrophe Normalization", () => {
    it("normalizes typographic apostrophe variants (U+2019, U+02BC, U+0060, U+0027)", () => {
      expect(normalizeUkrainianApostrophes("м’яч")).toBe("м'яч");
      expect(normalizeUkrainianApostrophes("мʼяч")).toBe("м'яч");
      expect(normalizeUkrainianApostrophes("м`яч")).toBe("м'яч");
      expect(normalizeUkrainianApostrophes("м'яч")).toBe("м'яч");
    });

    it("matches guess with typographic apostrophe against ASCII apostrophe", () => {
      const res = matchGuess("м'яч", "м’яч");
      expect(res.isExact).toBe(true);
      expect(res.distance).toBe(0);
    });

    it("matches guess without apostrophe (м'яч vs мяч) for mobile speed", () => {
      const res = matchGuess("м'яч", "мяч");
      expect(res.isExact).toBe(true);
      expect(res.distance).toBe(0);
    });
  });

  // =========================================================================
  // 4. Ukrainian Keyboard Convenience (ґ -> г)
  // =========================================================================
  describe("Ukrainian Keyboard Convenience", () => {
    it("normalizes 'ґ' (U+0491) to 'г' (U+0433)", () => {
      expect(normalizeUkrainianKeyboard("ґрунт")).toBe("грунт");
    });

    it("matches target with ґ when user types standard г", () => {
      const res = matchGuess("ґрунт", "грунт");
      expect(res.isExact).toBe(true);
      expect(res.distance).toBe(0);
    });
  });

  // =========================================================================
  // 5. Polish Diacritics Tolerance Fallback
  // =========================================================================
  describe("Polish Diacritics Fallback", () => {
    it("strips Polish diacritics accurately", () => {
      expect(stripPolishDiacritics("zażółć gęślą jaźń")).toBe("zazolc gesla jazn");
    });

    it("matches Polish word when user types Latin equivalent without Polish keyboard", () => {
      const res = matchGuess("żółw", "zolw");
      expect(res.isExact).toBe(true);
      expect(res.matchedViaDiacriticFallback).toBe(true);
      expect(res.distance).toBe(0);
    });

    it("matches words with 'ł', 'ą', 'ę', 'ś', 'ć', 'ń'", () => {
      expect(matchGuess("słoń", "slon").isExact).toBe(true);
      expect(matchGuess("książka", "ksiazka").isExact).toBe(true);
      expect(matchGuess("ryba", "ryba").isExact).toBe(true);
    });
  });

  // =========================================================================
  // 6. Cross-Alphabet Homoglyph Resolution (Cyrillic <-> Latin)
  // =========================================================================
  describe("Cross-Alphabet Cyrillic/Latin Homoglyphs", () => {
    it("resolves lookalike characters between alphabets (а, е, і, о, р, с, х, у)", () => {
      // Mixed Cyrillic: 'а' (U+0430), 'е' (U+0435), 'о' (U+043E)
      const mixedCyrillicGuess = "k\u0430m\u0435l\u0435\u043En";
      const pureLatinTarget = "kameleon";

      expect(normalizeHomoglyphs(mixedCyrillicGuess)).toBe(pureLatinTarget);

      const res = matchGuess(pureLatinTarget, mixedCyrillicGuess);
      expect(res.isExact).toBe(true);
      expect(res.matchedViaHomoglyph).toBe(true);
    });

    it("handles Latin typing on Ukrainian Cyrillic target with homoglyphs", () => {
      // Cyrillic "коса" (k, o, c, a) -> Latin "koca"
      const cyrillicTarget = "коса";
      const latinGuess = "koca"; // homoglyphs: к=k, о=o, с=c, а=a
      const res = matchGuess(cyrillicTarget, latinGuess);
      expect(res.isExact).toBe(true);

      // Cyrillic "рука" -> Latin "pyka"
      expect(matchGuess("рука", "pyka").isExact).toBe(true);
      // Cyrillic "сорок" -> Latin "copok"
      expect(matchGuess("сорок", "copok").isExact).toBe(true);
    });
  });

  // =========================================================================
  // 7. Bounded Levenshtein Near-Miss Detection (Contract 4)
  // =========================================================================
  describe("Levenshtein Near-Miss (isClose) Bounds", () => {
    it("calculates accurate Levenshtein distance", () => {
      expect(levenshteinDistance("kameleon", "kameleon")).toBe(0);
      expect(levenshteinDistance("kameleon", "kameleom")).toBe(1);
      expect(levenshteinDistance("pies", "piec")).toBe(1);
      expect(levenshteinDistance("drzewo", "drzewa")).toBe(1);
      expect(levenshteinDistance("drzewo", "las")).toBe(6);
    });

    it("flags D_L = 1 as 'isClose: true' ONLY for words with length L >= 5", () => {
      // "drzewo" (L=6) vs "drzewa" (dist=1) -> isClose: true
      const res1 = matchGuess("drzewo", "drzewa");
      expect(res1.isExact).toBe(false);
      expect(res1.distance).toBe(1);
      expect(res1.isClose).toBe(true);

      // "kameleon" (L=8) vs "kameleom" (dist=1) -> isClose: true
      const res2 = matchGuess("kameleon", "kameleom");
      expect(res2.isExact).toBe(false);
      expect(res2.distance).toBe(1);
      expect(res2.isClose).toBe(true);

      // "elephant" (L=8) vs "elephanx" (dist=1) -> isClose: true
      const res3 = matchGuess("elephant", "elephanx");
      expect(res3.isExact).toBe(false);
      expect(res3.distance).toBe(1);
      expect(res3.isClose).toBe(true);
    });

    it("strictly blocks near-miss notification on short words (L <= 4) to prevent clue leakage", () => {
      // "pies" (L=4) vs "piec" (dist=1) -> isClose MUST be FALSE
      const resPies = matchGuess("pies", "piec");
      expect(resPies.isExact).toBe(false);
      expect(resPies.distance).toBe(1);
      expect(resPies.isClose).toBe(false);

      // "cat" (L=3) vs "cot" (dist=1) -> isClose MUST be FALSE
      const resCat = matchGuess("cat", "cot");
      expect(resCat.isExact).toBe(false);
      expect(resCat.distance).toBe(1);
      expect(resCat.isClose).toBe(false);

      // "dom" (L=3) vs "dym" (dist=1) -> isClose MUST be FALSE
      const resDom = matchGuess("dom", "dym");
      expect(resDom.isExact).toBe(false);
      expect(resDom.distance).toBe(1);
      expect(resDom.isClose).toBe(false);

      // "auto" (L=4) vs "auta" (dist=1) -> isClose MUST be FALSE
      const resAuto = matchGuess("auto", "auta");
      expect(resAuto.isExact).toBe(false);
      expect(resAuto.distance).toBe(1);
      expect(resAuto.isClose).toBe(false);
    });

    it("allows D_L = 2 as 'isClose: true' ONLY for long words with length L >= 7", () => {
      // "kameleon" (L=8) vs "kamaleom" (dist=2) -> isClose: true
      const resLong = matchGuess("kameleon", "kamaleom");
      expect(resLong.distance).toBe(2);
      expect(resLong.isClose).toBe(true);

      // "drzewo" (L=6 < 7) vs "drzewi" (dist=2 with substitution + deletion e.g. "drzew")
      const resMedium = matchGuess("drzewo", "drzwa"); // dist=2, L=6
      expect(resMedium.distance).toBe(2);
      expect(resMedium.isClose).toBe(false); // L=6 < 7, so dist=2 is not close
    });
  });
});
