import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  QuizSuperlativesGameSession,
  calculateSuperlativePodium,
} from "../../src/server/games/quiz-superlatives-state";
import { Player } from "../../src/server/types";

describe("Quiz Superlatives State Machine & Podium Tallies", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createPlayers = (): Record<string, Player> => ({
    p1: {
      id: "p1",
      name: "Maja",
      isHost: true,
      isGuest: false,
      score: 0,
      isConnected: true,
      chameleonColors: { primary: "#06B6D4", secondary: "#4F46E5", accent: "#F59E0B" },
    },
    p2: {
      id: "p2",
      name: "Kuba",
      isHost: false,
      isGuest: false,
      score: 0,
      isConnected: true,
      chameleonColors: { primary: "#10B981", secondary: "#06B6D4", accent: "#EF130B" },
    },
    p3: {
      id: "p3",
      name: "Emilia",
      isHost: false,
      isGuest: false,
      score: 0,
      isConnected: true,
      chameleonColors: { primary: "#4F46E5", secondary: "#10B981", accent: "#FFE400" },
    },
    p4: {
      id: "p4",
      name: "Filip",
      isHost: false,
      isGuest: false,
      score: 0,
      isConnected: true,
      chameleonColors: { primary: "#F59E0B", secondary: "#4F46E5", accent: "#06B6D4" },
    },
  });

  describe("Podium Tally & Ordering Algorithm", () => {
    it("orders winners by vote counts descending and maps ranks", () => {
      const players = createPlayers();
      const votes: Record<string, string> = {
        p1: "p2",
        p2: "p2",
        p3: "p2", // p2 has 3 votes (1st)
        p4: "p1", // p1 has 1 vote (2nd)
      };

      const podium = calculateSuperlativePodium(votes, players);
      expect(podium).toHaveLength(2);
      expect(podium[0].playerId).toBe("p2");
      expect(podium[0].playerName).toBe("Kuba");
      expect(podium[0].votes).toBe(3);
      expect(podium[0].rank).toBe(1);

      expect(podium[1].playerId).toBe("p1");
      expect(podium[1].playerName).toBe("Maja");
      expect(podium[1].votes).toBe(1);
      expect(podium[1].rank).toBe(2);
    });
  });

  describe("Session Voting, Scoring & Hall of Fame", () => {
    it("initializes prompt and starts 30s voting phase", () => {
      const players = createPlayers();
      const session = new QuizSuperlativesGameSession("LJ-QUIZ", "p1", players);

      expect(session.state.phase).toBe("LOBBY");
      session.startGame();

      expect(session.state.phase).toBe("VOTING");
      expect(session.state.promptIndex).toBe(1);
      expect(session.state.currentPrompt).not.toBeNull();
      expect(session.state.votingTimeRemaining).toBe(30);

      session.destroy();
    });

    it("awards +20 pts for voting and +30 pts per vote received", () => {
      const players = createPlayers();
      let awardedScoresMap: Record<string, number> = {};

      const session = new QuizSuperlativesGameSession("LJ-QUIZ", "p1", players, undefined, {
        onScoresAwarded: (scores) => {
          awardedScoresMap = scores;
        },
      });
      session.startGame();

      // Everyone votes for Kuba (p2)
      session.submitVote("p1", "p2");
      session.submitVote("p2", "p2");
      session.submitVote("p3", "p2");
      session.submitVote("p4", "p2"); // all voted -> reveals

      // Kuba (p2): voted (+20) + received 4 votes * 30 (+120) = 140 pts
      expect(awardedScoresMap["p2"]).toBe(140);
      // Others: voted (+20)
      expect(awardedScoresMap["p1"]).toBe(20);
      expect(awardedScoresMap["p3"]).toBe(20);
      expect(awardedScoresMap["p4"]).toBe(20);

      session.destroy();
    });

    it("appends winner to Team Hall of Fame (Księga Pamiątkowa)", () => {
      const players = createPlayers();
      const session = new QuizSuperlativesGameSession("LJ-QUIZ", "p1", players);
      session.startGame();

      session.submitVote("p1", "p3");
      session.submitVote("p2", "p3");
      session.submitVote("p3", "p3");
      session.submitVote("p4", "p3");

      expect(session.state.hallOfFame).toHaveLength(1);
      expect(session.state.hallOfFame[0].winnerId).toBe("p3");
      expect(session.state.hallOfFame[0].winnerName).toBe("Emilia");
      expect(session.state.hallOfFame[0].votes).toBe(4);

      session.destroy();
    });
  });
});
