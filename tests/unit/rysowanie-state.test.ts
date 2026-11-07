import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RysowanieGameSession } from "../../src/server/games/rysowanie-state";
import { Player } from "../../src/server/types";

describe("Rysowanie Game Session State Machine & Chat Isolation (Contract 3 & 4)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createTestPlayers = (): Player[] => [
    {
      id: "player_1",
      name: "Tymoteusz",
      isHost: true,
      isGuest: false,
      score: 0,
      isConnected: true,
      chameleonColors: { primary: "#06B6D4", secondary: "#4F46E5", accent: "#F59E0B" },
    },
    {
      id: "player_2",
      name: "Zofia",
      isHost: false,
      isGuest: false,
      score: 0,
      isConnected: true,
      chameleonColors: { primary: "#10B981", secondary: "#06B6D4", accent: "#EF130B" },
    },
    {
      id: "player_3",
      name: "Marek",
      isHost: false,
      isGuest: false,
      score: 0,
      isConnected: true,
      chameleonColors: { primary: "#4F46E5", secondary: "#10B981", accent: "#FFE400" },
    },
  ];

  it("initializes in LOBBY phase with clean defaults", () => {
    const session = new RysowanieGameSession("LJ-TEST", "player_1");
    expect(session.state.phase).toBe("LOBBY");
    expect(session.state.round).toBe(1);
    expect(session.state.totalRounds).toBe(3);
    expect(session.state.currentDrawerId).toBeNull();
    session.destroy();
  });

  it("manages players and delegates host when host leaves", () => {
    const session = new RysowanieGameSession("LJ-TEST", "player_1");
    const [p1, p2] = createTestPlayers();

    session.addPlayer(p1);
    session.addPlayer(p2);

    expect(session.state.hostId).toBe("player_1");

    // Remove host
    session.removePlayer("player_1");
    expect(session.state.hostId).toBe("player_2");
    expect(session.state.players["player_2"].isHost).toBe(true);
    session.destroy();
  });

  it("transitions LOBBY -> WORD_SELECTION on startGame()", () => {
    const session = new RysowanieGameSession("LJ-TEST", "player_1");
    const players = createTestPlayers();
    players.forEach((p) => session.addPlayer(p));

    const started = session.startGame();
    expect(started).toBe(true);
    expect(session.state.phase).toBe("WORD_SELECTION");
    expect(session.state.currentDrawerId).toBe("player_1");
    expect(session.state.wordsToChoose.length).toBe(3);
    expect(session.state.wordChoiceTimeRemaining).toBe(15);
    session.destroy();
  });

  it("transitions WORD_SELECTION -> DRAWING on selectWord()", () => {
    const session = new RysowanieGameSession("LJ-TEST", "player_1");
    const players = createTestPlayers();
    players.forEach((p) => session.addPlayer(p));

    session.startGame();
    session.selectWord("kameleon");

    expect(session.state.phase).toBe("DRAWING");
    expect(session.state.currentWord).toBe("kameleon");
    expect(session.state.wordLength).toBe(8);
    expect(session.state.hintPattern).toBe("_ _ _ _ _ _ _ _");
    expect(session.state.drawTimeRemaining).toBe(80);
    session.destroy();
  });

  describe("Solvers-Only Chat Isolation & Guess Processing", () => {
    it("drawer cannot guess or submit solutions", () => {
      const session = new RysowanieGameSession("LJ-TEST", "player_1");
      const players = createTestPlayers();
      players.forEach((p) => session.addPlayer(p));

      session.startGame();
      session.selectWord("kameleon"); // player_1 is drawer

      const res = session.processMessage("player_1", "kameleon");
      expect(res.isCorrect).toBe(false);
      expect(res.targetAudience).toBe("all");
      expect(res.message?.type).toBe("public");
      session.destroy();
    });

    it("evaluates exact match for unsolved guesser, awards points, and accelerates timer on 1st solver", () => {
      const session = new RysowanieGameSession("LJ-TEST", "player_1");
      const players = createTestPlayers();
      players.forEach((p) => session.addPlayer(p));

      session.startGame();
      session.selectWord("kameleon");

      // Advance time by 10s: remaining is 70s
      vi.advanceTimersByTime(10000);

      // Player 2 solves!
      const res = session.processMessage("player_2", "kameleon");
      expect(res.isCorrect).toBe(true);
      expect(res.points).toBeGreaterThan(300);
      expect(session.state.players["player_2"].hasSolved).toBe(true);
      expect(session.state.players["player_2"].score).toBe(res.points);

      // Timer must be accelerated to 30s
      expect(session.state.isTimerAccelerated).toBe(true);
      expect(session.state.drawTimeRemaining).toBe(30);
      session.destroy();
    });

    it("eliminates the 49% scoring cliff at runtime between 1st and 2nd solver during dynamic 30s acceleration", () => {
      const session = new RysowanieGameSession("LJ-TEST", "player_1");
      const players = createTestPlayers(); // player_1: drawer, player_2: guesser 1, player_3: guesser 2
      players.forEach((p) => session.addPlayer(p));

      session.startGame();
      session.selectWord("kameleon");

      // 1. Advance timer by 10s: Solver 1 solves at t = 10s (Rank = 1)
      vi.advanceTimersByTime(10000);
      const res1 = session.processMessage("player_2", "kameleon");
      expect(res1.isCorrect).toBe(true);
      expect(res1.points).toBe(400); // (100 + 400 * (1 - 10/40)) * 1.0 = 400
      expect(session.state.players["player_2"].score).toBe(400);

      // Verify dynamic 30s acceleration was triggered
      expect(session.state.isTimerAccelerated).toBe(true);
      expect(session.state.drawTimeRemaining).toBe(30);

      // 2. Advance timer by 2s: cumulative real round time is now t = 12s, remaining is 28s
      vi.advanceTimersByTime(2000);
      expect(session.state.drawTimeRemaining).toBe(28);

      // 3. Solver 2 solves at t = 12s (Rank = 2)
      const res2 = session.processMessage("player_3", "kameleon");
      expect(res2.isCorrect).toBe(true);
      expect(res2.points).toBe(361); // (100 + 400 * (1 - 12/40)) * 0.95 = 380 * 0.95 = 361
      expect(session.state.players["player_3"].score).toBe(361);

      // 4. Assert score percentage drop is strictly < 12% (~9.75%), proving runtime elimination of the 49% cliff
      const scoreDiff = res1.points - res2.points;
      const dropPercent = (scoreDiff / res1.points) * 100;
      expect(dropPercent).toBeLessThan(12);
      expect(dropPercent).toBeCloseTo(9.75, 1);

      // 5. Verify drawer score was calculated using effective duration 40s and real solver times (10s, 12s)
      // avgElapsed = (10 + 12) / 2 = 11s. Drawer score = 1.0 * (200 + 300 * (1 - 11/40)) = 418
      expect(session.state.players["player_1"].score).toBe(418);
      expect(session.state.phase).toBe("TURN_INTERMISSION");

      session.destroy();
    });

    it("isolates chat messages from already solved players so unsolved guessers cannot see them", () => {
      const session = new RysowanieGameSession("LJ-TEST", "player_1");
      const players = createTestPlayers();
      players.forEach((p) => session.addPlayer(p));

      session.startGame();
      session.selectWord("kameleon");

      // Player 2 solves
      session.processMessage("player_2", "kameleon");
      expect(session.state.players["player_2"].hasSolved).toBe(true);

      // Player 2 chats after solving
      const postSolveMsg = session.processMessage("player_2", "fajny rysunek!");
      expect(postSolveMsg.targetAudience).toBe("solvers_and_drawer");
      expect(postSolveMsg.message?.type).toBe("solver");
      session.destroy();
    });

    it("detects Levenshtein near-miss (L >= 5, D_L = 1) without leaking guessed text", () => {
      const session = new RysowanieGameSession("LJ-TEST", "player_1");
      const players = createTestPlayers();
      players.forEach((p) => session.addPlayer(p));

      session.startGame();
      session.selectWord("kameleon");

      // Player 3 makes a 1-letter typo: "kamelon" (dist = 1, length >= 5)
      const res = session.processMessage("player_3", "kamelon");
      expect(res.isCorrect).toBe(false);
      expect(res.isClose).toBe(true);
      expect(res.message?.type).toBe("close");
      expect(res.message?.text).toBe("jest blisko!");
      // The guessed text "kamelon" must NOT be in the message text!
      expect(res.message?.text).not.toContain("kamelon");
      session.destroy();
    });

    it("advances turn immediately when all active guessers have solved", () => {
      const session = new RysowanieGameSession("LJ-TEST", "player_1");
      const players = createTestPlayers(); // player_1 (drawer), player_2, player_3
      players.forEach((p) => session.addPlayer(p));

      session.startGame();
      session.selectWord("kameleon");

      // Player 2 solves
      session.processMessage("player_2", "kameleon");
      expect(session.state.phase).toBe("DRAWING");

      // Player 3 solves (all guessers now solved!)
      session.processMessage("player_3", "kameleon");

      // Phase must immediately advance to TURN_INTERMISSION
      expect(session.state.phase).toBe("TURN_INTERMISSION");
      session.destroy();
    });
  });

  describe("Full Game Flow & Podium", () => {
    it("transitions to GAME_OVER with podium ranking after all rounds complete", () => {
      const session = new RysowanieGameSession("LJ-TEST", "player_1", { rounds: 1 });
      const [p1, p2] = createTestPlayers().slice(0, 2);
      session.addPlayer(p1);
      session.addPlayer(p2);

      session.startGame();
      session.selectWord("kot");

      // Turn 1: player 2 solves
      session.processMessage("player_2", "kot");
      expect(session.state.phase).toBe("TURN_INTERMISSION");

      // Fast-forward 5s intermission
      vi.advanceTimersByTime(5000);

      // Now turn 2 (player 2 draws)
      expect(session.state.phase).toBe("WORD_SELECTION");
      expect(session.state.currentDrawerId).toBe("player_2");
      session.selectWord("pies");

      // Player 1 solves
      session.processMessage("player_1", "pies");
      expect(session.state.phase).toBe("TURN_INTERMISSION");

      // Fast-forward 5s intermission -> should reach GAME_OVER
      vi.advanceTimersByTime(5000);
      expect(session.state.phase).toBe("GAME_OVER");
      expect(session.state.winnerPodium).toBeDefined();
      expect(session.state.winnerPodium?.length).toBe(2);
      session.destroy();
    });
  });
});
