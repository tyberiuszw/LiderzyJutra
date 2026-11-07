import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  HumanBingoGameSession,
  checkBingoLines,
} from "../../src/server/games/human-bingo-state";
import { Player, BingoTileData } from "../../src/server/types";

describe("Human Bingo State Machine & Line Detection", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createBlankGrid = (size: 4 | 5): BingoTileData[] => {
    const tiles: BingoTileData[] = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const index = r * size + c;
        const isFree = size === 5 && r === 2 && c === 2;
        tiles.push({
          index,
          row: r,
          col: c,
          trait: isFree ? "FREE SPACE" : `Cecha ${index}`,
          isFree,
          isClaimed: isFree,
        });
      }
    }
    return tiles;
  };

  describe("4x4 and 5x5 Line Detection Algorithm", () => {
    it("detects horizontal row completion on 4x4 grid", () => {
      const grid = createBlankGrid(4);
      // Claim row 1 (indices 4, 5, 6, 7)
      [4, 5, 6, 7].forEach((i) => {
        grid[i].isClaimed = true;
      });

      const result = checkBingoLines(grid, 4);
      expect(result.hasBingo).toBe(true);
      expect(result.completedLines).toContainEqual({ type: "row", index: 1 });
    });

    it("detects vertical column completion on 4x4 grid", () => {
      const grid = createBlankGrid(4);
      // Claim column 2 (indices 2, 6, 10, 14)
      [2, 6, 10, 14].forEach((i) => {
        grid[i].isClaimed = true;
      });

      const result = checkBingoLines(grid, 4);
      expect(result.hasBingo).toBe(true);
      expect(result.completedLines).toContainEqual({ type: "col", index: 2 });
    });

    it("detects main diagonal completion on 4x4 grid", () => {
      const grid = createBlankGrid(4);
      // Claim main diag (0, 5, 10, 15)
      [0, 5, 10, 15].forEach((i) => {
        grid[i].isClaimed = true;
      });

      const result = checkBingoLines(grid, 4);
      expect(result.hasBingo).toBe(true);
      expect(result.completedLines).toContainEqual({ type: "main_diag" });
    });

    it("detects anti-diagonal completion on 4x4 grid", () => {
      const grid = createBlankGrid(4);
      // Claim anti diag (3, 6, 9, 12)
      [3, 6, 9, 12].forEach((i) => {
        grid[i].isClaimed = true;
      });

      const result = checkBingoLines(grid, 4);
      expect(result.hasBingo).toBe(true);
      expect(result.completedLines).toContainEqual({ type: "anti_diag" });
    });

    it("detects diagonal line on 5x5 grid leveraging central FREE SPACE", () => {
      const grid = createBlankGrid(5);
      // In 5x5, index 12 (row 2, col 2) is automatically free and claimed
      expect(grid[12].isFree).toBe(true);

      // Claim remaining main diag tiles: 0, 6, 18, 24
      [0, 6, 18, 24].forEach((i) => {
        grid[i].isClaimed = true;
      });

      const result = checkBingoLines(grid, 5);
      expect(result.hasBingo).toBe(true);
      expect(result.completedLines).toContainEqual({ type: "main_diag" });
    });

    it("returns hasBingo: false when line is incomplete", () => {
      const grid = createBlankGrid(4);
      // Claim only 3 out of 4 tiles in row 0
      [0, 1, 2].forEach((i) => {
        grid[i].isClaimed = true;
      });

      const result = checkBingoLines(grid, 4);
      expect(result.hasBingo).toBe(false);
      expect(result.completedLines).toHaveLength(0);
    });
  });

  describe("2-Way Peer Verification & Scoring Workflow", () => {
    const createPlayers = (): Record<string, Player> => ({
      p1: {
        id: "p1",
        name: "Igor",
        isHost: true,
        isGuest: false,
        score: 0,
        isConnected: true,
        chameleonColors: { primary: "#06B6D4", secondary: "#4F46E5", accent: "#F59E0B" },
      },
      p2: {
        id: "p2",
        name: "Laura",
        isHost: false,
        isGuest: false,
        score: 0,
        isConnected: true,
        chameleonColors: { primary: "#10B981", secondary: "#06B6D4", accent: "#EF130B" },
      },
    });

    it("creates pending verification with 45s timeout when tile is claimed", () => {
      const players = createPlayers();
      const session = new HumanBingoGameSession("LJ-BINGO", "p1", players);
      session.startGame();

      const ok = session.claimTile("p1", 0, "p2");
      expect(ok).toBe(true);

      const verifications = Object.values(session.state.pendingVerifications);
      expect(verifications).toHaveLength(1);
      expect(verifications[0].requesterId).toBe("p1");
      expect(verifications[0].targetId).toBe("p2");
      expect(verifications[0].tileIndex).toBe(0);

      session.destroy();
    });

    it("verifies tile, awards +50 pts on peer approval, and marks tile green", () => {
      const players = createPlayers();
      let awardedScoresMap: Record<string, number> = {};

      const session = new HumanBingoGameSession("LJ-BINGO", "p1", players, undefined, {
        onScoresAwarded: (scores) => {
          awardedScoresMap = { ...awardedScoresMap, ...scores };
        },
      });
      session.startGame();

      session.claimTile("p1", 0, "p2");
      const [verification] = Object.values(session.state.pendingVerifications);

      // Peer p2 approves the claim
      session.respondVerification(verification.id, true, "p2");

      const tile = session.state.playerGrids["p1"][0];
      expect(tile.isClaimed).toBe(true);
      expect(tile.verifiedByPeerId).toBe("p2");
      expect(tile.verifiedByPeerName).toBe("Laura");

      // +50 points awarded to requester
      expect(awardedScoresMap["p1"]).toBe(50);
      expect(Object.keys(session.state.pendingVerifications)).toHaveLength(0);

      session.destroy();
    });

    it("awards +250 points line bonus on completing a full bingo line", () => {
      const players = createPlayers();
      let awardedScoresMap: Record<string, number> = {};

      const session = new HumanBingoGameSession("LJ-BINGO", "p1", players, undefined, {
        onScoresAwarded: (scores) => {
          awardedScoresMap = { ...awardedScoresMap, ...scores };
        },
      });
      session.startGame();

      // Manually set row 0 to 3 tiles claimed
      session.state.playerGrids["p1"][0].isClaimed = true;
      session.state.playerGrids["p1"][1].isClaimed = true;
      session.state.playerGrids["p1"][2].isClaimed = true;

      // Claim the 4th tile (index 3) to complete the line
      session.claimTile("p1", 3, "p2");
      const [verification] = Object.values(session.state.pendingVerifications);

      session.respondVerification(verification.id, true, "p2");

      // 50 pts (tile) + 250 pts (line bonus) = 300 pts!
      expect(awardedScoresMap["p1"]).toBe(300);
      expect(session.state.bingoWinners).toHaveLength(1);
      expect(session.state.bingoWinners[0].playerId).toBe("p1");

      session.destroy();
    });

    it("expires pending verification automatically after 45 seconds", () => {
      const players = createPlayers();
      const session = new HumanBingoGameSession("LJ-BINGO", "p1", players);
      session.startGame();

      session.claimTile("p1", 0, "p2");
      expect(Object.keys(session.state.pendingVerifications)).toHaveLength(1);

      // Fast-forward 45 seconds
      vi.advanceTimersByTime(45000);

      expect(Object.keys(session.state.pendingVerifications)).toHaveLength(0);
      expect(session.state.playerGrids["p1"][0].isClaimed).toBe(false);

      session.destroy();
    });
  });
});
