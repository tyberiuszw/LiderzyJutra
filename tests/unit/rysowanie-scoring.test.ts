import { describe, it, expect } from "vitest";
import {
  calculateGuesserScore,
  calculateDrawerScore,
} from "../../src/server/games/rysowanie-state";

describe("Rysowanie Scoring Formulas & Cliff Elimination (Contract 3)", () => {
  describe("Guesser Continuous Time-Decay Scoring", () => {
    it("awards maximum 500 points for rank 1 instantaneous solve at t = 0", () => {
      const score = calculateGuesserScore(0, 80, 1);
      expect(score).toBe(500);
    });

    it("awards minimum 100 points for rank 1 solve at exact round expiration t = T", () => {
      const score = calculateGuesserScore(80, 80, 1);
      expect(score).toBe(100);
    });

    it("awards exactly 300 points for rank 1 solve at half-time (t = 40s in 80s round)", () => {
      const score = calculateGuesserScore(40, 80, 1);
      expect(score).toBe(300);
    });

    it("applies smooth 5% rank discount per subsequent solver", () => {
      const s1 = calculateGuesserScore(20, 80, 1); // 1.00x
      const s2 = calculateGuesserScore(20, 80, 2); // 0.95x
      const s3 = calculateGuesserScore(20, 80, 3); // 0.90x

      expect(s1).toBe(400); // 100 + 400 * 0.75 = 400
      expect(s2).toBe(380); // 400 * 0.95 = 380
      expect(s3).toBe(360); // 400 * 0.90 = 360
    });

    it("floors rank multiplier at 0.70 for rank 7 and above", () => {
      const s7 = calculateGuesserScore(0, 80, 7);
      const s10 = calculateGuesserScore(0, 80, 10);
      const s20 = calculateGuesserScore(0, 80, 20);

      expect(s7).toBe(350); // 500 * 0.70
      expect(s10).toBe(350);
      expect(s20).toBe(350);
    });

    it("eliminates the 49% cliff between 1st and 2nd solver during dynamic 30s acceleration", () => {
      // In an 80s round:
      // Player 1 solves at t=10s. Round accelerates to 10 + 30 = 40s effective duration.
      // Player 2 solves 2 seconds later at t=12s.
      const p1Score = calculateGuesserScore(10, 40, 1);
      const p2Score = calculateGuesserScore(12, 40, 2);

      expect(p1Score).toBe(400); // (100 + 400 * 0.75) * 1.0 = 400
      expect(p2Score).toBe(361); // (100 + 400 * 0.70) * 0.95 = 380 * 0.95 = 361

      const diff = p1Score - p2Score;
      const percentDrop = (diff / p1Score) * 100;

      // Drop must be smooth and fair (< 12%), completely eliminating the old 49% step cliff!
      expect(percentDrop).toBeCloseTo(9.75, 1);
      expect(percentDrop).toBeLessThan(15);
    });

    it("clamps negative elapsed time and excessive elapsed time safely", () => {
      expect(calculateGuesserScore(-5, 80, 1)).toBe(500);
      expect(calculateGuesserScore(120, 80, 1)).toBe(100);
      expect(calculateGuesserScore(10, 0, 1)).toBe(100);
    });
  });

  describe("Drawer Score Formula with Zero-Division Guards", () => {
    it("returns strictly 0 when totalGuessers is 0 (solo player testing)", () => {
      expect(calculateDrawerScore(0, 0, 0, 80)).toBe(0);
      expect(calculateDrawerScore(0, 5, 10, 80)).toBe(0);
    });

    it("returns strictly 0 when no guessers solve the word (solverCount = 0)", () => {
      expect(calculateDrawerScore(5, 0, 0, 80)).toBe(0);
    });

    it("returns strictly 0 when effectiveDuration <= 0", () => {
      expect(calculateDrawerScore(5, 3, 10, 0)).toBe(0);
      expect(calculateDrawerScore(5, 3, 10, -10)).toBe(0);
    });

    it("awards maximum 500 points when 100% of guessers solve instantaneously", () => {
      // 5 guessers, 5 solvers, average time 0s
      const score = calculateDrawerScore(5, 5, 0, 80);
      expect(score).toBe(500);
    });

    it("scales proportionally when 50% of guessers solve at half time", () => {
      // 4 guessers, 2 solvers (ratio 0.5), average time 40s in 80s round (timeFactor 0.5)
      // 0.5 * (200 + 300 * 0.5) = 0.5 * 350 = 175
      const score = calculateDrawerScore(4, 2, 40, 80);
      expect(score).toBe(175);
    });
  });
});
