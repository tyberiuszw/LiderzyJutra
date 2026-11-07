import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HotSeatGameSession } from "../../src/server/games/hot-seat-state";
import { Player } from "../../src/server/types";

describe("Hot Seat Q&A State Machine & Psychological Safety Lifelines", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createPlayers = (): Record<string, Player> => ({
    p1: {
      id: "p1",
      name: "Tymon",
      isHost: true,
      isGuest: false,
      score: 0,
      isConnected: true,
      chameleonColors: { primary: "#06B6D4", secondary: "#4F46E5", accent: "#F59E0B" },
    },
    p2: {
      id: "p2",
      name: "Wiktoria",
      isHost: false,
      isGuest: false,
      score: 0,
      isConnected: true,
      chameleonColors: { primary: "#10B981", secondary: "#06B6D4", accent: "#EF130B" },
    },
    p3: {
      id: "p3",
      name: "Jan",
      isHost: false,
      isGuest: false,
      score: 0,
      isConnected: true,
      chameleonColors: { primary: "#4F46E5", secondary: "#10B981", accent: "#FFE400" },
    },
  });

  describe("Tier Management & Question Decks", () => {
    it("starts in SELECTION and supports 3 depth tiers", () => {
      const players = createPlayers();
      const session = new HotSeatGameSession("LJ-HOT", "p1", players);

      session.startGame();
      expect(session.state.phase).toBe("SELECTION");
      expect(session.state.currentTier).toBe(1);

      session.setTier(2);
      expect(session.state.currentTier).toBe(2);

      session.setTier(3);
      expect(session.state.currentTier).toBe(3);

      session.destroy();
    });

    it("allows speaker selection and advances to QUESTION_PICK", () => {
      const players = createPlayers();
      const session = new HotSeatGameSession("LJ-HOT", "p1", players);
      session.startGame();

      session.selectSpeaker("p2");
      expect(session.state.activeSpeakerId).toBe("p2");
      expect(session.state.phase).toBe("QUESTION_PICK");
      expect(session.state.suggestedQuestions.length).toBeGreaterThan(0);

      session.destroy();
    });
  });

  describe("Audience Question Queue & Upvoting", () => {
    it("submits audience questions, sorts by upvotes, and awards points to author", () => {
      const players = createPlayers();
      let awardedScoresMap: Record<string, number> = {};

      const session = new HotSeatGameSession("LJ-HOT", "p1", players, undefined, {
        onScoresAwarded: (scores) => {
          awardedScoresMap = { ...awardedScoresMap, ...scores };
        },
      });
      session.startGame();
      session.selectSpeaker("p1");

      // p2 and p3 submit custom questions
      session.submitAudienceQuestion("p2", "Pytanie od Wiktorii?");
      session.submitAudienceQuestion("p3", "Pytanie od Jana?");

      expect(session.state.questionQueue).toHaveLength(2);

      // Jan's question gets upvoted by p1 and p2
      const janQ = session.state.questionQueue.find((q) => q.authorId === "p3")!;
      session.upvoteQuestion(janQ.id, "p1");
      session.upvoteQuestion(janQ.id, "p2");

      // Queue is sorted dynamically: Jan's question should be first
      expect(session.state.questionQueue[0].id).toBe(janQ.id);
      expect(session.state.questionQueue[0].score).toBe(20);

      // Speaker picks Jan's question
      session.pickQuestion(janQ.text);
      expect(session.state.phase).toBe("ANSWERING");
      expect(session.state.currentQuestion).toBe(janQ.text);

      // Question author (Jan / p3) gets +30 bonus points!
      expect(awardedScoresMap["p3"]).toBe(30);

      session.destroy();
    });
  });

  describe("Psychological Safety: Zero-Penalty Pas Lifeline", () => {
    it("invoking passQuestion resets the question with zero penalty and returns to QUESTION_PICK", () => {
      const players = createPlayers();
      let awardedScoresMap: Record<string, number> = {};

      const session = new HotSeatGameSession("LJ-HOT", "p1", players, undefined, {
        onScoresAwarded: (scores) => {
          awardedScoresMap = { ...awardedScoresMap, ...scores };
        },
      });
      session.startGame();
      session.selectSpeaker("p1");
      session.pickQuestion("Trudne pytanie");

      expect(session.state.phase).toBe("ANSWERING");

      // Speaker feels uncomfortable and uses "Pas"
      session.passLifeline();

      // Zero score penalty: no negative points awarded!
      expect(awardedScoresMap["p1"]).toBeUndefined();
      expect(session.state.phase).toBe("QUESTION_PICK");
      expect(session.state.currentQuestion).toBeNull();

      session.destroy();
    });

    it("awards +100 points to speaker upon completing an answer", () => {
      const players = createPlayers();
      let awardedScoresMap: Record<string, number> = {};

      const session = new HotSeatGameSession("LJ-HOT", "p1", players, undefined, {
        onScoresAwarded: (scores) => {
          awardedScoresMap = { ...awardedScoresMap, ...scores };
        },
      });
      session.startGame();
      session.selectSpeaker("p2");
      session.pickQuestion("Ulubiona książka?");

      session.completeAnswer();
      expect(awardedScoresMap["p2"]).toBe(100);
      expect(session.state.questionsAnswered).toBe(1);

      session.destroy();
    });
  });
});
