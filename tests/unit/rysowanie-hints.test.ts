import { describe, it, expect } from "vitest";
import {
  calculateEffectiveHints,
  generateHintPattern,
  calculateHintTimes,
  rescheduleHintsOnAcceleration,
} from "../../src/server/games/rysowanie-state";

describe("Rysowanie Progressive Hints & Dynamic Acceleration (Contract 3)", () => {
  describe("Word-Length Hint Bounding Formula K_effective", () => {
    it("bounds hints for 2-letter words to strictly 0 (never reveals 50%)", () => {
      expect(calculateEffectiveHints("ul", 3)).toBe(0);
      expect(calculateEffectiveHints("on", 3)).toBe(0);
    });

    it("bounds hints for 3-letter words to strictly 1 (e.g. kot, dog)", () => {
      expect(calculateEffectiveHints("kot", 3)).toBe(1); // floor((3-1)/2) = 1
      expect(calculateEffectiveHints("dog", 3)).toBe(1);
    });

    it("bounds hints for 4-letter words to strictly 1 (e.g. pies, dron)", () => {
      expect(calculateEffectiveHints("pies", 3)).toBe(1); // floor((4-1)/2) = 1
      expect(calculateEffectiveHints("dron", 3)).toBe(1);
    });

    it("bounds hints for 5-letter words to 2 (e.g. robot, rzeka)", () => {
      expect(calculateEffectiveHints("robot", 3)).toBe(2); // floor((5-1)/2) = 2
    });

    it("allows configured 3 hints for 7+ letter words (e.g. kameleon)", () => {
      expect(calculateEffectiveHints("kameleon", 3)).toBe(3); // floor((8-1)/2) = 3
      expect(calculateEffectiveHints("helikopter", 3)).toBe(3);
    });

    it("ignores whitespace when calculating non-space letter length L", () => {
      // "burza mózgów" has 5 + 6 = 11 letters
      expect(calculateEffectiveHints("burza mózgów", 3)).toBe(3);
      // "a b" has 2 letters -> 0 hints
      expect(calculateEffectiveHints("a b", 3)).toBe(0);
    });

    it("respects lower maxHints configuration when passed", () => {
      expect(calculateEffectiveHints("kameleon", 1)).toBe(1);
      expect(calculateEffectiveHints("kameleon", 2)).toBe(2);
      expect(calculateEffectiveHints("kameleon", 0)).toBe(0);
    });
  });

  describe("Hint Pattern Generation", () => {
    it("generates masked underscores with spaces for unrevealed single word", () => {
      const pattern = generateHintPattern("kot", []);
      expect(pattern).toBe("_ _ _");
    });

    it("reveals letters at specified indices while keeping other characters masked", () => {
      const pattern = generateHintPattern("kameleon", [1, 4]); // 'a' and 'l'
      expect(pattern).toBe("_ a _ _ l _ _ _");
    });

    it("preserves space breaks in multi-word phrases", () => {
      const pattern = generateHintPattern("burza mozgow", [0, 6]);
      expect(pattern).toBe("b _ _ _ _   m _ _ _ _ _");
    });
  });

  describe("Hint Timestamps & Acceleration Rescheduling", () => {
    it("calculates standard hint timestamps evenly spaced across 80s round with 3 hints", () => {
      // 80 * (1 - 1/4) = 60s
      // 80 * (1 - 2/4) = 40s
      // 80 * (1 - 3/4) = 20s
      const times = calculateHintTimes(80, 3);
      expect(times).toEqual([60, 40, 20]);
    });

    it("calculates single hint at exact midpoint for 1 hint (e.g. 40s in 80s round)", () => {
      const times = calculateHintTimes(80, 1);
      expect(times).toEqual([40]);
    });

    it("returns empty array when effectiveHints is 0", () => {
      expect(calculateHintTimes(80, 0)).toEqual([]);
    });

    it("reschedules 2 unrevealed hints evenly across the 30s accelerated window", () => {
      // 30 * (1 - 1/3) = 20s
      // 30 * (1 - 2/3) = 10s
      const rescheduled = rescheduleHintsOnAcceleration(30, 2);
      expect(rescheduled).toEqual([20, 10]);
    });

    it("reschedules 1 unrevealed hint to exact midpoint (15s) of 30s window", () => {
      const rescheduled = rescheduleHintsOnAcceleration(30, 1);
      expect(rescheduled).toEqual([15]);
    });
  });
});
