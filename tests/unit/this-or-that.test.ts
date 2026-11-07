import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  ThisOrThatGameSession,
  calculateThisOrThatStats,
  detectThisOrThatOutliers,
} from "../../src/server/games/this-or-that-state";
import { Player } from "../../src/server/types";

describe("This or That Dilemmas State Machine & Outlier Analytics", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createPlayers = (): Record<string, Player> => ({
    p1: {
      id: "p1",
      name: "Kacper",
      isHost: true,
      isGuest: false,
      score: 0,
      isConnected: true,
      chameleonColors: { primary: "#06B6D4", secondary: "#4F46E5", accent: "#F59E0B" },
    },
    p2: {
      id: "p2",
      name: "Lena",
      isHost: false,
      isGuest: false,
      score: 0,
      isConnected: true,
      chameleonColors: { primary: "#10B981", secondary: "#06B6D4", accent: "#EF130B" },
    },
    p3: {
      id: "p3",
      name: "Mateusz",
      isHost: false,
      isGuest: false,
      score: 0,
      isConnected: true,
      chameleonColors: { primary: "#4F46E5", secondary: "#10B981", accent: "#FFE400" },
    },
    p4: {
      id: "p4",
      name: "Natalia",
      isHost: false,
      isGuest: false,
      score: 0,
      isConnected: true,
      chameleonColors: { primary: "#F59E0B", secondary: "#4F46E5", accent: "#06B6D4" },
    },
  });

  describe("Split Percentage Calculations", () => {
    it("returns 50%/50% default when zero votes exist", () => {
      const stats = calculateThisOrThatStats({});
      expect(stats.countA).toBe(0);
      expect(stats.countB).toBe(0);
      expect(stats.percentA).toBe(50);
      expect(stats.percentB).toBe(50);
    });

    it("calculates exact percentage split and maintains 100% total sum", () => {
      const votes: Record<string, "A" | "B"> = {
        p1: "A",
        p2: "A",
        p3: "A",
        p4: "B",
      };
      const stats = calculateThisOrThatStats(votes);
      expect(stats.countA).toBe(3);
      expect(stats.countB).toBe(1);
      expect(stats.percentA).toBe(75);
      expect(stats.percentB).toBe(25);
      expect(stats.percentA + stats.percentB).toBe(100);
    });

    it("accurately handles 50/50 split with multiple voters", () => {
      const votes: Record<string, "A" | "B"> = {
        p1: "A",
        p2: "A",
        p3: "B",
        p4: "B",
      };
      const stats = calculateThisOrThatStats(votes);
      expect(stats.percentA).toBe(50);
      expect(stats.percentB).toBe(50);
    });
  });

  describe("Outlier Detection ('Jedyny Wybraniec' / Rebel Badge)", () => {
    it("detects single voter on A when 3+ peers choose B", () => {
      const players = createPlayers();
      const votes: Record<string, "A" | "B"> = {
        p1: "A",
        p2: "B",
        p3: "B",
        p4: "B",
      };

      const outliers = detectThisOrThatOutliers(votes, players);
      expect(outliers).toHaveLength(1);
      expect(outliers[0].playerId).toBe("p1");
      expect(outliers[0].playerName).toBe("Kacper");
      expect(outliers[0].choice).toBe("A");
      expect(outliers[0].badge).toBe("Jedyny Wybraniec");
    });

    it("detects single voter on B when 3+ peers choose A", () => {
      const players = createPlayers();
      const votes: Record<string, "A" | "B"> = {
        p1: "A",
        p2: "A",
        p3: "A",
        p4: "B",
      };

      const outliers = detectThisOrThatOutliers(votes, players);
      expect(outliers).toHaveLength(1);
      expect(outliers[0].playerId).toBe("p4");
      expect(outliers[0].choice).toBe("B");
    });

    it("does not award badge if minority has >= 2 voters", () => {
      const players = createPlayers();
      const votes: Record<string, "A" | "B"> = {
        p1: "A",
        p2: "A",
        p3: "B",
        p4: "B",
      };

      const outliers = detectThisOrThatOutliers(votes, players);
      expect(outliers).toHaveLength(0);
    });

    it("does not award badge if opposing peers count is less than 3", () => {
      const players = createPlayers();
      // Only 3 players total: 1 on A, 2 on B (peers = 2 < 3)
      const votes: Record<string, "A" | "B"> = {
        p1: "A",
        p2: "B",
        p3: "B",
      };

      const outliers = detectThisOrThatOutliers(votes, players);
      expect(outliers).toHaveLength(0);
    });
  });

  describe("Session Lifecycle, Timers & Scoring", () => {
    it("starts game, selects dilemma, and initializes 12s timer", () => {
      const players = createPlayers();
      const session = new ThisOrThatGameSession("LJ-TOT", "p1", players);

      expect(session.state.phase).toBe("LOBBY");
      session.startGame();

      expect(session.state.phase).toBe("VOTING");
      expect(session.state.dilemmaIndex).toBe(1);
      expect(session.state.currentDilemma).not.toBeNull();
      expect(session.state.votingTimeRemaining).toBe(12);

      session.destroy();
    });

    it("auto-advances to RESULTS when all players have voted", () => {
      const players = createPlayers();
      const session = new ThisOrThatGameSession("LJ-TOT", "p1", players);
      session.startGame();

      session.submitVote("p1", "A");
      session.submitVote("p2", "B");
      session.submitVote("p3", "B");
      expect(session.state.phase).toBe("VOTING");

      // 4th player votes -> triggers calculateResults immediately
      session.submitVote("p4", "B");
      expect(session.state.phase).toBe("RESULTS");
      expect(session.state.stats).toBeDefined();
      expect(session.state.outliers).toHaveLength(1);
      expect(session.state.outliers![0].playerId).toBe("p1");

      session.destroy();
    });

    it("awards participation (+20) and outlier (+50) points", () => {
      const players = createPlayers();
      let awardedScoresMap: Record<string, number> = {};

      const session = new ThisOrThatGameSession("LJ-TOT", "p1", players, undefined, {
        onScoresAwarded: (scores) => {
          awardedScoresMap = scores;
        },
      });
      session.startGame();

      session.submitVote("p1", "A"); // Outlier! (1 vs 3)
      session.submitVote("p2", "B");
      session.submitVote("p3", "B");
      session.submitVote("p4", "B");

      // p1 earns 20 (vote) + 50 (outlier) = 70 pts
      expect(awardedScoresMap["p1"]).toBe(70);
      // p2, p3, p4 earn 20 pts each
      expect(awardedScoresMap["p2"]).toBe(20);
      expect(awardedScoresMap["p3"]).toBe(20);
      expect(awardedScoresMap["p4"]).toBe(20);

      session.destroy();
    });

    it("times out voting after 12 seconds if not all players vote", () => {
      const players = createPlayers();
      const session = new ThisOrThatGameSession("LJ-TOT", "p1", players);
      session.startGame();

      session.submitVote("p1", "A");
      expect(session.state.phase).toBe("VOTING");

      vi.advanceTimersByTime(12000);

      expect(session.state.phase).toBe("RESULTS");
      expect(session.state.stats?.countA).toBe(1);

      session.destroy();
    });
  });
});
