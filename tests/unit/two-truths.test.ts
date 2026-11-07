import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  TwoTruthsGameSession,
  calculateBluffScore,
} from "../../src/server/games/two-truths-state";
import { Player } from "../../src/server/types";

describe("Two Truths & A Lie State Machine & Scoring", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createPlayers = (): Player[] => [
    {
      id: "p1",
      name: "Anna",
      isHost: true,
      isGuest: false,
      score: 0,
      isConnected: true,
      chameleonColors: { primary: "#06B6D4", secondary: "#4F46E5", accent: "#F59E0B" },
    },
    {
      id: "p2",
      name: "Bartek",
      isHost: false,
      isGuest: false,
      score: 0,
      isConnected: true,
      chameleonColors: { primary: "#10B981", secondary: "#06B6D4", accent: "#EF130B" },
    },
    {
      id: "p3",
      name: "Celina",
      isHost: false,
      isGuest: false,
      score: 0,
      isConnected: true,
      chameleonColors: { primary: "#4F46E5", secondary: "#10B981", accent: "#FFE400" },
    },
    {
      id: "p4",
      name: "Dawid",
      isHost: false,
      isGuest: false,
      score: 0,
      isConnected: true,
      chameleonColors: { primary: "#F59E0B", secondary: "#4F46E5", accent: "#06B6D4" },
    },
  ];

  describe("Bluff Bonus Normalization Formula", () => {
    it("returns 0 points when 0 peers are fooled", () => {
      expect(calculateBluffScore(0, 10)).toBe(0);
      expect(calculateBluffScore(0, 3)).toBe(0);
    });

    it("returns exactly 200 points when 100% of peers are fooled", () => {
      expect(calculateBluffScore(10, 10)).toBe(200);
      expect(calculateBluffScore(3, 3)).toBe(200);
      expect(calculateBluffScore(1, 1)).toBe(200);
    });

    it("scales proportionally and rounds cleanly for intermediate ratios", () => {
      // 5 out of 10 peers fooled = 50% * 200 = 100 pts
      expect(calculateBluffScore(5, 10)).toBe(100);

      // 1 out of 3 peers fooled = 1/3 * 200 = 66.666 -> 67 pts
      expect(calculateBluffScore(1, 3)).toBe(67);

      // 2 out of 3 peers fooled = 2/3 * 200 = 133.333 -> 133 pts
      expect(calculateBluffScore(2, 3)).toBe(133);
    });

    it("strictly guards against division by zero and negative inputs", () => {
      expect(calculateBluffScore(0, 0)).toBe(0);
      expect(calculateBluffScore(5, 0)).toBe(0);
      expect(calculateBluffScore(-2, 5)).toBe(0);
    });

    it("caps score at 200 points maximum even under anomalous inputs", () => {
      expect(calculateBluffScore(15, 10)).toBe(200);
    });
  });

  describe("Lifecycle, Secret Masking & Voting Flow", () => {
    it("starts in LOBBY and transitions to SUBMISSION on startGame", () => {
      const players = createPlayers();
      const playerMap = Object.fromEntries(players.map((p) => [p.id, p]));
      const session = new TwoTruthsGameSession("LJ-TRUTH", "p1", playerMap);

      expect(session.state.phase).toBe("LOBBY");
      expect(session.state.activePlayerId).toBe("p1");

      session.startGame();
      expect(session.state.phase).toBe("SUBMISSION");
      expect(session.state.turnNumber).toBe(1);
      expect(session.state.totalTurns).toBe(4);

      session.destroy();
    });

    it("masks lieIndex from peers during VOTING phase", () => {
      const players = createPlayers();
      const playerMap = Object.fromEntries(players.map((p) => [p.id, p]));
      const session = new TwoTruthsGameSession("LJ-TRUTH", "p1", playerMap);
      session.startGame();

      // p1 submits cards with statement index 1 as the lie
      const ok = session.submitStatements(
        "p1",
        [
          "Mam w domu pytona królewskiego",
          "Nigdy nie piłem herbaty z cytryną",
          "Wygrałem zawody w pływaniu",
        ],
        1
      );
      expect(ok).toBe(true);
      expect(session.state.phase).toBe("VOTING");

      // Active bluffer can see their own lie index
      const activeState = session.getPublicState("p1");
      expect(activeState.lieIndex).toBe(null); // hidden in direct state
      expect(session.state.lieIndex).toBeNull(); // explicitly hidden until reveal!

      // Peers see null for lieIndex
      const peerState = session.getPublicState("p2");
      expect(peerState.lieIndex).toBeNull();

      session.destroy();
    });

    it("prevents active bluffer from voting on their own cards", () => {
      const players = createPlayers();
      const playerMap = Object.fromEntries(players.map((p) => [p.id, p]));
      const session = new TwoTruthsGameSession("LJ-TRUTH", "p1", playerMap);
      session.startGame();
      session.submitStatements("p1", ["S1", "S2", "S3"], 2);

      const blufferVote = session.submitVote("p1", 0);
      expect(blufferVote).toBe(false);
      expect(session.state.votes["p1"]).toBeUndefined();

      session.destroy();
    });

    it("records peer votes, reveals lie, and calculates scores correctly", () => {
      const players = createPlayers();
      const playerMap = Object.fromEntries(players.map((p) => [p.id, p]));
      let awardedScoresMap: Record<string, number> = {};

      const session = new TwoTruthsGameSession("LJ-TRUTH", "p1", playerMap, undefined, {
        onScoresAwarded: (scores) => {
          awardedScoresMap = scores;
        },
      });
      session.startGame();

      // Lie is at index 1
      session.submitStatements(
        "p1",
        ["Byłem w Paryżu", "Umiem latać samolotem", "Gram na gitarze"],
        1
      );

      // p2 votes correctly (index 1) -> +100 pts
      session.submitVote("p2", 1);
      // p3 votes incorrectly (index 0) -> fooled
      session.submitVote("p3", 0);
      // p4 votes incorrectly (index 2) -> fooled
      // All 3 peers have voted, triggering auto-reveal!
      session.submitVote("p4", 2);

      expect(session.state.phase).toBe("REVEAL");
      expect(session.state.lieIndex).toBe(1);
      expect(session.state.correctVoters).toEqual(["p2"]);
      expect(session.state.fooledCount).toBe(2);

      // S_bluff = round(200 * 2 / 3) = 133 pts for bluffer p1
      expect(session.state.bluffScore).toBe(133);
      expect(awardedScoresMap["p1"]).toBe(133);
      expect(awardedScoresMap["p2"]).toBe(100);
      expect(awardedScoresMap["p3"]).toBeUndefined();

      session.destroy();
    });

    it("times out voting after 30 seconds and reveals automatically", () => {
      const players = createPlayers();
      const playerMap = Object.fromEntries(players.map((p) => [p.id, p]));
      const session = new TwoTruthsGameSession("LJ-TRUTH", "p1", playerMap);
      session.startGame();
      session.submitStatements("p1", ["S0", "S1", "S2"], 0);

      // Only p2 votes
      session.submitVote("p2", 0);
      expect(session.state.phase).toBe("VOTING");

      // Advance timers by 30 seconds
      vi.advanceTimersByTime(30000);

      expect(session.state.phase).toBe("REVEAL");
      expect(session.state.lieIndex).toBe(0);

      session.destroy();
    });

    it("advances turns and transitions to GAME_OVER after total turns", () => {
      const players = createPlayers().slice(0, 2); // 2 players: p1, p2
      const playerMap = Object.fromEntries(players.map((p) => [p.id, p]));
      let gameOverPodium: unknown = null;

      const session = new TwoTruthsGameSession("LJ-TRUTH", "p1", playerMap, undefined, {
        onGameOver: (podium) => {
          gameOverPodium = podium;
        },
      });

      session.startGame();
      expect(session.state.turnNumber).toBe(1);
      expect(session.state.activePlayerId).toBe("p1");

      session.submitStatements("p1", ["A", "B", "C"], 0);
      session.submitVote("p2", 0);
      expect(session.state.phase).toBe("REVEAL");

      // Turn 2
      session.nextTurn();
      expect(session.state.turnNumber).toBe(2);
      expect(session.state.activePlayerId).toBe("p2");
      expect(session.state.phase).toBe("SUBMISSION");

      session.submitStatements("p2", ["D", "E", "F"], 2);
      session.submitVote("p1", 1);
      expect(session.state.phase).toBe("REVEAL");

      // End of game
      session.nextTurn();
      expect(session.state.phase).toBe("GAME_OVER");
      expect(gameOverPodium).not.toBeNull();

      session.destroy();
    });
  });
});
