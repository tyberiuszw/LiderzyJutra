import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  StoryChainGameSession,
  exportStoryToMarkdown,
  exportStoryToText,
} from "../../src/server/games/story-chain-state";
import { Player, StorySegment } from "../../src/server/types";

describe("Collaborative Story Chain State Machine & Improv Mechanics", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createPlayers = (): Record<string, Player> => ({
    p1: {
      id: "p1",
      name: "Ola",
      isHost: true,
      isGuest: false,
      score: 0,
      isConnected: true,
      chameleonColors: { primary: "#06B6D4", secondary: "#4F46E5", accent: "#F59E0B" },
    },
    p2: {
      id: "p2",
      name: "Piotr",
      isHost: false,
      isGuest: false,
      score: 0,
      isConnected: true,
      chameleonColors: { primary: "#10B981", secondary: "#06B6D4", accent: "#EF130B" },
    },
    p3: {
      id: "p3",
      name: "Rafał",
      isHost: false,
      isGuest: false,
      score: 0,
      isConnected: true,
      chameleonColors: { primary: "#4F46E5", secondary: "#10B981", accent: "#FFE400" },
    },
  });

  describe("Text & Markdown Compilers", () => {
    it("exports story to formatted Markdown with quotes and author chips", () => {
      const segments: StorySegment[] = [
        {
          id: "s1",
          authorId: "p1",
          authorName: "Ola",
          text: "Nagle na ekranie pojawił się kod w Pythonie.",
          timestamp: 1000,
        },
        {
          id: "s2",
          authorId: "system",
          authorName: "Kameleon Narrator",
          text: "ZWROT AKCJI: Zgasły wszystkie światła!",
          isWildcard: true,
          timestamp: 2000,
        },
        {
          id: "s3",
          authorId: "p2",
          authorName: "Piotr",
          text: "Wszyscy chwycili za latarki w smartfonach.",
          timestamp: 3000,
        },
      ];

      const md = exportStoryToMarkdown(
        "Nocny Hackathon",
        "Podczas hackathonu o 3:15...",
        segments
      );

      expect(md).toContain("# Nocny Hackathon");
      expect(md).toContain("Podczas hackathonu o 3:15...");
      expect(md).toContain("*Ola*: Nagle na ekranie pojawił się kod w Pythonie.");
      expect(md).toContain("⚡ **ZWROT AKCJI: Zgasły wszystkie światła!**");
      expect(md).toContain("*Piotr*: Wszyscy chwycili za latarki w smartfonach.");
    });

    it("compiles cohesive plain-text narrative combining starter and segments", () => {
      const segments: StorySegment[] = [
        { id: "s1", authorId: "p1", authorName: "Ola", text: "Drzwi otworzyły się.", timestamp: 1 },
        { id: "s2", authorId: "p2", authorName: "Piotr", text: "Weszliśmy do środka.", timestamp: 2 },
      ];

      const fullText = exportStoryToText("Ciemna noc.", segments);
      expect(fullText).toBe("Ciemna noc. Drzwi otworzyły się. Weszliśmy do środka.");
    });
  });

  describe("Circular Queue & Game Modes", () => {
    it("rotates circular queue across players in order", () => {
      const players = createPlayers();
      const session = new StoryChainGameSession("LJ-STORY", "p1", players);

      session.startGame();
      expect(session.state.currentTurnPlayerId).toBe("p1");

      session.submitSegment("p1", "Pierwsze zdanie.");
      expect(session.state.currentTurnPlayerId).toBe("p2");

      session.submitSegment("p2", "Drugie zdanie.");
      expect(session.state.currentTurnPlayerId).toBe("p3");

      session.submitSegment("p3", "Trzecie zdanie.");
      // Back to p1
      expect(session.state.currentTurnPlayerId).toBe("p1");

      session.destroy();
    });

    it("supports switching between SENTENCE (20s) and WORD (6s) modes", () => {
      const players = createPlayers();
      const session = new StoryChainGameSession("LJ-STORY", "p1", players);
      session.startGame();

      expect(session.state.mode).toBe("SENTENCE");
      expect(session.state.turnTimeTotal).toBe(20);

      session.setMode("WORD");
      expect(session.state.mode).toBe("WORD");
      expect(session.state.turnTimeTotal).toBe(6);
      expect(session.state.turnTimeRemaining).toBe(6);

      session.destroy();
    });

    it("rejects turn submission from non-active players", () => {
      const players = createPlayers();
      const session = new StoryChainGameSession("LJ-STORY", "p1", players);
      session.startGame();

      expect(session.state.currentTurnPlayerId).toBe("p1");

      // p2 tries to submit out of turn
      const ok = session.submitSegment("p2", "Próba wtrącenia się");
      expect(ok).toBe(false);
      expect(session.state.segments).toHaveLength(0);

      session.destroy();
    });

    it("triggers WILDCARD_ALERT every 5 turns and awards bonus points", () => {
      const players = createPlayers();
      let awardedScoresMap: Record<string, number> = {};

      const session = new StoryChainGameSession("LJ-STORY", "p1", players, undefined, {
        onScoresAwarded: (scores) => {
          awardedScoresMap = { ...awardedScoresMap, ...scores };
        },
      });
      session.startGame();

      // Turns 1 to 4
      session.submitSegment("p1", "Zdanie 1");
      session.submitSegment("p2", "Zdanie 2");
      session.submitSegment("p3", "Zdanie 3");
      session.submitSegment("p1", "Zdanie 4");

      // Turn 5 triggers wildcard alert
      expect(session.state.phase).toBe("WILDCARD_ALERT");
      expect(session.state.activeWildcard).not.toBeNull();

      // Advance alert countdown (3 seconds)
      vi.advanceTimersByTime(3000);

      expect(session.state.phase).toBe("TURN_ACTIVE");
      expect(session.state.segments.some((s) => s.isWildcard)).toBe(true);

      // p2 now contributes responding to the wildcard -> gets 50 + 50 = 100 pts!
      session.submitSegment("p2", "Kontynuacja po zwrocie akcji");
      expect(awardedScoresMap["p2"]).toBe(100);

      session.destroy();
    });

    it("advances turn on timeout without crashing", () => {
      const players = createPlayers();
      const session = new StoryChainGameSession("LJ-STORY", "p1", players);
      session.startGame();

      expect(session.state.currentTurnPlayerId).toBe("p1");

      // Let 20s pass
      vi.advanceTimersByTime(20000);

      expect(session.state.currentTurnPlayerId).toBe("p2");

      session.destroy();
    });
  });
});
