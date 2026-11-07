import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { UnifiedRoomSession } from "../../src/server/rooms/room-manager";
import { Player } from "../../src/server/types";

describe("Unified Room Orchestrator & Seamless Game Switching", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createPlayers = (): Player[] => [
    {
      id: "p1",
      name: "Dominik",
      isHost: true,
      isGuest: false,
      score: 0,
      isConnected: true,
      chameleonColors: { primary: "#06B6D4", secondary: "#4F46E5", accent: "#F59E0B" },
    },
    {
      id: "p2",
      name: "Gabriela",
      isHost: false,
      isGuest: false,
      score: 0,
      isConnected: true,
      chameleonColors: { primary: "#10B981", secondary: "#06B6D4", accent: "#EF130B" },
    },
    {
      id: "p3",
      name: "Hubert",
      isHost: false,
      isGuest: false,
      score: 0,
      isConnected: true,
      chameleonColors: { primary: "#4F46E5", secondary: "#10B981", accent: "#FFE400" },
    },
  ];

  it("initializes room with persistent code LJ-TEST and default RYSOWANIE", () => {
    const session = new UnifiedRoomSession("LJ-TEST", "p1");
    expect(session.roomCode).toBe("LJ-TEST");
    expect(session.hostId).toBe("p1");
    expect(session.currentGameType).toBe("RYSOWANIE");
    expect(session.state.phase).toBe("LOBBY");
    session.destroy();
  });

  it("seamlessly switches between activities without dropping players or changing room code", () => {
    const session = new UnifiedRoomSession("LJ-SEAM", "p1");
    const [p1, p2, p3] = createPlayers();

    session.addPlayer(p1);
    session.addPlayer(p2);
    session.addPlayer(p3);

    expect(Object.keys(session.players)).toHaveLength(3);

    // Switch to TWO_TRUTHS
    session.switchGame("TWO_TRUTHS");
    expect(session.currentGameType).toBe("TWO_TRUTHS");
    expect(session.twoTruthsSession).not.toBeNull();
    expect(session.roomCode).toBe("LJ-SEAM");
    expect(Object.keys(session.twoTruthsSession!.players)).toHaveLength(3);

    // Switch to THIS_OR_THAT
    session.switchGame("THIS_OR_THAT");
    expect(session.currentGameType).toBe("THIS_OR_THAT");
    expect(session.thisOrThatSession).not.toBeNull();
    expect(Object.keys(session.thisOrThatSession!.players)).toHaveLength(3);

    // Switch to STORY_CHAIN
    session.switchGame("STORY_CHAIN");
    expect(session.currentGameType).toBe("STORY_CHAIN");
    expect(session.storyChainSession).not.toBeNull();

    // Switch to HOT_SEAT
    session.switchGame("HOT_SEAT");
    expect(session.currentGameType).toBe("HOT_SEAT");
    expect(session.hotSeatSession).not.toBeNull();

    // Switch to QUIZ_SUPERLATIVES
    session.switchGame("QUIZ_SUPERLATIVES");
    expect(session.currentGameType).toBe("QUIZ_SUPERLATIVES");
    expect(session.quizSuperlativesSession).not.toBeNull();

    // Switch to HUMAN_BINGO
    session.switchGame("HUMAN_BINGO");
    expect(session.currentGameType).toBe("HUMAN_BINGO");
    expect(session.humanBingoSession).not.toBeNull();

    // Sockets remain attached to LJ-SEAM and players preserved throughout!
    expect(Object.keys(session.players)).toEqual(["p1", "p2", "p3"]);

    session.destroy();
  });

  it("accumulates sessionScores across multiple different games", () => {
    const session = new UnifiedRoomSession("LJ-SCORE", "p1");
    const [p1, p2] = createPlayers();
    session.addPlayer(p1);
    session.addPlayer(p2);

    // Points earned in Rysowanie
    session.addSessionScore("p1", "RYSOWANIE", 350);
    // Points earned in Dwie Prawdy
    session.addSessionScore("p1", "TWO_TRUTHS", 133);
    // Points earned in To czy Tamto
    session.addSessionScore("p1", "THIS_OR_THAT", 70);

    // Points earned by p2
    session.addSessionScore("p2", "RYSOWANIE", 200);
    session.addSessionScore("p2", "TWO_TRUTHS", 100);

    const scoresP1 = session.sessionScores["p1"];
    expect(scoresP1.total).toBe(350 + 133 + 70); // 553
    expect(scoresP1.byGame.RYSOWANIE).toBe(350);
    expect(scoresP1.byGame.TWO_TRUTHS).toBe(133);
    expect(scoresP1.byGame.THIS_OR_THAT).toBe(70);

    const scoresP2 = session.sessionScores["p2"];
    expect(scoresP2.total).toBe(300);
    expect(scoresP2.byGame.RYSOWANIE).toBe(200);
    expect(scoresP2.byGame.TWO_TRUTHS).toBe(100);

    // Player object score is synchronized
    expect(session.players["p1"].score).toBe(553);
    expect(session.players["p2"].score).toBe(300);

    session.destroy();
  });

  it("automatically migrates host authority when the room host disconnects", () => {
    const session = new UnifiedRoomSession("LJ-HOST", "p1");
    const [p1, p2, p3] = createPlayers();

    session.addPlayer(p1);
    session.addPlayer(p2);
    session.addPlayer(p3);

    expect(session.hostId).toBe("p1");

    // Host p1 leaves the room
    session.removePlayer("p1");

    // Authority automatically transfers to p2 without crash or lockup
    expect(session.hostId).toBe("p2");
    expect(session.players["p2"].isHost).toBe(true);

    session.destroy();
  });

  it("provides full backward compatibility with Rysowanie canvas and game state", () => {
    const session = new UnifiedRoomSession("LJ-COMPAT", "p1");
    const [p1] = createPlayers();
    session.addPlayer(p1);

    // Canvas actions delegation
    session.addCanvasAction({
      type: "stroke",
      points: [{ x: 10, y: 10 }, { x: 20, y: 20 }],
      color: "#06B6D4",
      size: 4,
    });

    expect(session.state.canvasHistory).toHaveLength(1);

    session.clearCanvas();
    expect(session.state.canvasHistory).toHaveLength(2); // clear action added

    session.destroy();
  });
});
