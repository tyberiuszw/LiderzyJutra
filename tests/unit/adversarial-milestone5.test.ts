import { describe, it, expect, vi } from "vitest";
import {
  calculateBluffScore,
  TwoTruthsGameSession,
} from "../../src/server/games/two-truths-state";
import {
  calculateThisOrThatStats,
  detectThisOrThatOutliers,
  ThisOrThatGameSession,
} from "../../src/server/games/this-or-that-state";
import {
  StoryChainGameSession,
  exportStoryToMarkdown,
  exportStoryToText,
} from "../../src/server/games/story-chain-state";
import {
  checkBingoLines,
  HumanBingoGameSession,
} from "../../src/server/games/human-bingo-state";
import {
  UnifiedRoomSession,
} from "../../src/server/rooms/room-manager";
import { Player, BingoTileData, GameType } from "../../src/server/types";

describe("Milestone 5 Adversarial Stress Testing: Integration Games & Unified Orchestrator", () => {
  const createMockPlayer = (id: string, name: string, isHost = false): Player => ({
    id,
    name,
    isHost,
    isGuest: false,
    isConnected: true,
    score: 0,
    chameleonColors: {
      primary: "#06B6D4",
      secondary: "#3B82F6",
      accent: "#10B981",
    },
  });

  // =========================================================================
  // MISSION 1: Two Truths & A Lie Scoring Adversarial Stress Test
  // =========================================================================
  describe("Mission 1: Two Truths & A Lie Scoring & Game Lifecycle", () => {
    it("satisfies normalized bluff formula S_bluff = round(200 * N_fooled / N_peers) <= 200 for room sizes N=2..50", () => {
      // Room size N means N_peers = N - 1
      for (let N = 2; N <= 50; N++) {
        const peers = N - 1;
        let prevScore = -1;

        for (let fooled = 0; fooled <= peers; fooled++) {
          const score = calculateBluffScore(fooled, peers);

          // 1. Invariant: score must be between 0 and 200
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(200);

          // 2. Invariant: 0 fooled => 0 score
          if (fooled === 0) {
            expect(score).toBe(0);
          }

          // 3. Invariant: all peers fooled => exactly 200
          if (fooled === peers) {
            expect(score).toBe(200);
          }

          // 4. Invariant: monotonically non-decreasing
          expect(score).toBeGreaterThanOrEqual(prevScore);
          prevScore = score;
        }
      }
    });

    it("handles adversarial inputs without zero-division, NaN, or overflow", () => {
      expect(calculateBluffScore(0, 0)).toBe(0);
      expect(calculateBluffScore(5, 0)).toBe(0);
      expect(calculateBluffScore(-5, 10)).toBe(0);
      expect(calculateBluffScore(5, -10)).toBe(0);
      expect(calculateBluffScore(100, 10)).toBe(200); // clamped to peers
      expect(calculateBluffScore(1_000_000, 1_000_000)).toBe(200);
    });

    it("enforces game turn lifecycle, secret lie masking, and scoring distribution", () => {
      const p1 = createMockPlayer("p1", "Bluffer", true);
      const p2 = createMockPlayer("p2", "Guesser1");
      const p3 = createMockPlayer("p3", "Guesser2");
      const p4 = createMockPlayer("p4", "Guesser3");

      const session = new TwoTruthsGameSession("LJ-TEST", "p1", {
        p1,
        p2,
        p3,
        p4,
      });

      session.startGame();
      expect(session.state.phase).toBe("SUBMISSION");
      expect(session.state.activePlayerId).toBe("p1");

      // Non-active player cannot submit statements
      const rogueSubmit = session.submitStatements(
        "p2",
        ["Prawda 1", "Prawda 2", "Kłamstwo"],
        2
      );
      expect(rogueSubmit).toBe(false);

      // Active player submits 3 statements with lie at index 1
      const validSubmit = session.submitStatements(
        "p1",
        ["Byłem na Islandii", "Mam 4 koty", "Umiem latać szybowcem"],
        1
      );
      expect(validSubmit).toBe(true);
      expect(session.state.phase).toBe("VOTING");

      // Secret lie masking in public state: lieIndex must be null for guessers
      const publicStateForP2 = session.getPublicState("p2");
      expect(publicStateForP2.lieIndex).toBeNull();

      const publicStateForBluffer = session.getPublicState("p1");
      expect(publicStateForBluffer.lieIndex).toBe(null); // internally tracked

      // Active player cannot vote on their own statements
      expect(session.submitVote("p1", 1)).toBe(false);

      // Out-of-bounds votes rejected
      expect(session.submitVote("p2", -1)).toBe(false);
      expect(session.submitVote("p2", 3)).toBe(false);

      // Peers vote: P2 guesses correctly (1), P3 and P4 are fooled (0 and 2)
      expect(session.submitVote("p2", 1)).toBe(true);
      expect(session.submitVote("p3", 0)).toBe(true);
      expect(session.submitVote("p4", 2)).toBe(true);

      // Auto-reveal triggered when all peers have voted
      expect(session.state.phase).toBe("REVEAL");
      expect(session.state.lieIndex).toBe(1);
      expect(session.state.fooledCount).toBe(2);
      expect(session.state.correctVoters).toEqual(["p2"]);

      // Bluff score for 2 fooled out of 3 peers: round(200 * 2 / 3) = 133
      expect(session.state.bluffScore).toBe(133);
      expect(p1.score).toBe(133); // Bluffer got bluff score
      expect(p2.score).toBe(100); // Correct guesser got +100
      expect(p3.score).toBe(0);
      expect(p4.score).toBe(0);

      session.destroy();
    });
  });

  // =========================================================================
  // MISSION 2: This or That Split Percentages & Outlier Boundary Testing
  // =========================================================================
  describe("Mission 2: This or That Split Percentages & Outlier Detection", () => {
    it("guarantees split percentages sum to exactly 100% across all distributions", () => {
      // Empty votes default
      const emptyStats = calculateThisOrThatStats({});
      expect(emptyStats).toEqual({ countA: 0, countB: 0, percentA: 50, percentB: 50 });
      expect(emptyStats.percentA + emptyStats.percentB).toBe(100);

      // Test all combinations up to 30 votes
      for (let countA = 0; countA <= 30; countA++) {
        for (let countB = 0; countB <= 30; countB++) {
          if (countA === 0 && countB === 0) continue;
          const votes: Record<string, "A" | "B"> = {};
          for (let i = 0; i < countA; i++) votes[`a_${i}`] = "A";
          for (let j = 0; j < countB; j++) votes[`b_${j}`] = "B";

          const stats = calculateThisOrThatStats(votes);
          expect(stats.percentA + stats.percentB).toBe(100);
          expect(stats.percentA).toBeGreaterThanOrEqual(0);
          expect(stats.percentA).toBeLessThanOrEqual(100);
          expect(stats.percentB).toBeGreaterThanOrEqual(0);
          expect(stats.percentB).toBeLessThanOrEqual(100);
        }
      }
    });

    it("strictly bounds outlier badge 'Jedyny Wybraniec' to 1 vs >= 3 peers", () => {
      const players: Record<string, Player> = {
        p1: createMockPlayer("p1", "Alice"),
        p2: createMockPlayer("p2", "Bob"),
        p3: createMockPlayer("p3", "Charlie"),
        p4: createMockPlayer("p4", "Diana"),
        p5: createMockPlayer("p5", "Eve"),
      };

      // 1 vs 0 (N=1) -> no outlier
      expect(detectThisOrThatOutliers({ p1: "A" }, players)).toHaveLength(0);

      // 1 vs 1 (N=2) -> no outlier
      expect(detectThisOrThatOutliers({ p1: "A", p2: "B" }, players)).toHaveLength(0);

      // 1 vs 2 (N=3) -> countB is 2, which is < 3 -> NO outlier
      expect(detectThisOrThatOutliers({ p1: "A", p2: "B", p3: "B" }, players)).toHaveLength(0);

      // 1 vs 3 (N=4) -> countA=1, countB=3 (>= 3) -> OUTLIER detected!
      const outliers4 = detectThisOrThatOutliers(
        { p1: "A", p2: "B", p3: "B", p4: "B" },
        players
      );
      expect(outliers4).toHaveLength(1);
      expect(outliers4[0].playerId).toBe("p1");
      expect(outliers4[0].choice).toBe("A");
      expect(outliers4[0].badge).toBe("Jedyny Wybraniec");

      // 3 vs 1 (N=4, outlier chose B)
      const outliersB = detectThisOrThatOutliers(
        { p1: "A", p2: "A", p3: "A", p4: "B" },
        players
      );
      expect(outliersB).toHaveLength(1);
      expect(outliersB[0].playerId).toBe("p4");
      expect(outliersB[0].choice).toBe("B");

      // 0 vs 4 (N=4, Unanimous) -> NO outlier
      expect(
        detectThisOrThatOutliers({ p1: "A", p2: "A", p3: "A", p4: "A" }, players)
      ).toHaveLength(0);

      // 2 vs 3 (N=5) -> NO outlier (neither is exactly 1)
      expect(
        detectThisOrThatOutliers({ p1: "A", p2: "A", p3: "B", p4: "B", p5: "B" }, players)
      ).toHaveLength(0);
    });

    it("awards participation (+20) and outlier bonus (+50) properly in game session", () => {
      const p1 = createMockPlayer("p1", "Outlier");
      const p2 = createMockPlayer("p2", "Peer1");
      const p3 = createMockPlayer("p3", "Peer2");
      const p4 = createMockPlayer("p4", "Peer3");

      const session = new ThisOrThatGameSession("LJ-TOT", "p1", { p1, p2, p3, p4 });
      session.startGame();

      expect(session.state.phase).toBe("VOTING");

      // Submit votes: p1 picks A, p2, p3, p4 pick B
      session.submitVote("p1", "A");
      session.submitVote("p2", "B");
      session.submitVote("p3", "B");
      session.submitVote("p4", "B");

      expect(session.state.phase).toBe("RESULTS");
      expect(session.state.outliers).toHaveLength(1);
      expect(session.state.outliers![0].playerId).toBe("p1");

      // p1 earns 20 (participation) + 50 (outlier) = 70 pts
      expect(p1.score).toBe(70);
      // p2, p3, p4 earn 20 pts
      expect(p2.score).toBe(20);
      expect(p3.score).toBe(20);
      expect(p4.score).toBe(20);

      session.destroy();
    });
  });

  // =========================================================================
  // MISSION 3: Story Chain Queue & Wildcard Adversarial Testing
  // =========================================================================
  describe("Mission 3: Story Chain Turn Rotation, Wildcard & Export", () => {
    it("handles circular player rotation and mid-turn player disconnects seamlessly", () => {
      const p1 = createMockPlayer("p1", "Alice");
      const p2 = createMockPlayer("p2", "Bob");
      const p3 = createMockPlayer("p3", "Charlie");

      const session = new StoryChainGameSession("LJ-STORY", "p1", { p1, p2, p3 });
      session.startGame();

      expect(session.state.phase).toBe("TURN_ACTIVE");
      expect(session.state.currentTurnPlayerId).toBe("p1");

      // p1 submits a sentence
      const ok1 = session.submitSegment("p1", "Zaczęło się od tajemniczej wiadomości na ekranie.");
      expect(ok1).toBe(true);

      // Advances to p2
      expect(session.state.currentTurnPlayerId).toBe("p2");

      // Non-current player p3 attempts to submit -> rejected
      expect(session.submitSegment("p3", "Nie moja kolej!")).toBe(false);

      // Mid-turn disconnect: p2 leaves while it's their turn
      session.removePlayer("p2");

      // Turn advances automatically without crash or deadlocking; remaining players are ["p1", "p3"]
      expect(session.state.turnOrder).toEqual(["p1", "p3"]);
      expect(["p1", "p3"]).toContain(session.state.currentTurnPlayerId);

      const activePlayer = session.state.currentTurnPlayerId!;
      // Active player submits successfully
      expect(session.submitSegment(activePlayer, "Wszyscy spojrzeli w stronę starych drzwi.")).toBe(true);

      // Next turn rotates to the other remaining player
      const expectedNext = activePlayer === "p1" ? "p3" : "p1";
      expect(session.state.currentTurnPlayerId).toBe(expectedNext);

      session.destroy();
    });

    it("triggers wildcard plot twist on turn 5 and integrates wildcard segment", () => {
      vi.useFakeTimers();

      const p1 = createMockPlayer("p1", "Alice");
      const p2 = createMockPlayer("p2", "Bob");

      const session = new StoryChainGameSession("LJ-STORY2", "p1", { p1, p2 });
      session.startGame();

      // Turns 1 to 4
      session.submitSegment("p1", "Zdanie 1");
      session.submitSegment("p2", "Zdanie 2");
      session.submitSegment("p1", "Zdanie 3");
      session.submitSegment("p2", "Zdanie 4");

      // Now at turn 5: should trigger WILDCARD_ALERT
      expect(session.state.turnIndex).toBe(5);
      expect(session.state.phase).toBe("WILDCARD_ALERT");
      expect(session.state.activeWildcard).toBeDefined();

      // Advance timers by 3 seconds for alert countdown
      vi.advanceTimersByTime(3500);

      // Phase changes to TURN_ACTIVE with wildcard segment added
      expect(session.state.phase).toBe("TURN_ACTIVE");
      const wildcardSeg = session.state.segments.find((s) => s.isWildcard);
      expect(wildcardSeg).toBeDefined();
      expect(wildcardSeg?.authorId).toBe("system");

      session.destroy();
      vi.useRealTimers();
    });

    it("exports story to Markdown and coherent plain text faithfully", () => {
      const starter = "W 2045 roku w Bielsku-Białej...";
      const segments = [
        {
          id: "s1",
          authorId: "p1",
          authorName: "Kasia",
          text: "Młodzi inżynierowie odkryli niezwykły artefakt.",
          isWildcard: false,
          timestamp: 1000,
        },
        {
          id: "s2",
          authorId: "system",
          authorName: "Kameleon Narrator",
          text: "ZWROT AKCJI: Artefakt zaczął mówić w trzynastu językach!",
          isWildcard: true,
          timestamp: 2000,
        },
        {
          id: "s3",
          authorId: "p2",
          authorName: "Tomek",
          text: "Postanowili wspólnie odpowiedzieć.",
          isWildcard: false,
          timestamp: 3000,
        },
      ];

      const md = exportStoryToMarkdown("Przygoda z Kameleonem", starter, segments);
      expect(md).toContain("# Przygoda z Kameleonem");
      expect(md).toContain(starter);
      expect(md).toContain("*Kasia*: Młodzi inżynierowie odkryli niezwykły artefakt.");
      expect(md).toContain("⚡ **ZWROT AKCJI: Artefakt zaczął mówić w trzynastu językach!**");
      expect(md).toContain("*Tomek*: Postanowili wspólnie odpowiedzieć.");

      const txt = exportStoryToText(starter, segments);
      expect(txt).toContain(starter);
      expect(txt).toContain("Młodzi inżynierowie");
      expect(txt).toContain("ZWROT AKCJI");
      expect(txt).toContain("Postanowili wspólnie odpowiedzieć.");
    });
  });

  // =========================================================================
  // MISSION 4: Human Bingo Line Detection Stress Test
  // =========================================================================
  describe("Mission 4: Human Bingo Line Detection & Verification", () => {
    // Helper to generate a blank grid
    const createBlankGrid = (size: 4 | 5): BingoTileData[] => {
      const grid: BingoTileData[] = [];
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const index = r * size + c;
          const isCenter = size === 5 && r === 2 && c === 2;
          grid.push({
            index,
            row: r,
            col: c,
            trait: isCenter ? "FREE" : `Trait ${index}`,
            isFree: isCenter,
            isClaimed: isCenter,
          });
        }
      }
      return grid;
    };

    it("detects all horizontal rows, vertical columns, and diagonals on 4x4", () => {
      // 1. Check all 4 rows
      for (let row = 0; row < 4; row++) {
        const grid = createBlankGrid(4);
        for (let c = 0; c < 4; c++) {
          grid[row * 4 + c].isClaimed = true;
        }
        const result = checkBingoLines(grid, 4);
        expect(result.hasBingo).toBe(true);
        expect(result.completedLines).toEqual([{ type: "row", index: row }]);
      }

      // 2. Check all 4 columns
      for (let col = 0; col < 4; col++) {
        const grid = createBlankGrid(4);
        for (let r = 0; r < 4; r++) {
          grid[r * 4 + col].isClaimed = true;
        }
        const result = checkBingoLines(grid, 4);
        expect(result.hasBingo).toBe(true);
        expect(result.completedLines).toEqual([{ type: "col", index: col }]);
      }

      // 3. Check Main Diagonal
      const gridMain = createBlankGrid(4);
      for (let i = 0; i < 4; i++) {
        gridMain[i * 4 + i].isClaimed = true;
      }
      const resultMain = checkBingoLines(gridMain, 4);
      expect(resultMain.hasBingo).toBe(true);
      expect(resultMain.completedLines).toEqual([{ type: "main_diag" }]);

      // 4. Check Anti Diagonal
      const gridAnti = createBlankGrid(4);
      for (let i = 0; i < 4; i++) {
        gridAnti[i * 4 + (3 - i)].isClaimed = true;
      }
      const resultAnti = checkBingoLines(gridAnti, 4);
      expect(resultAnti.hasBingo).toBe(true);
      expect(resultAnti.completedLines).toEqual([{ type: "anti_diag" }]);
    });

    it("verifies 5x5 grid central FREE SPACE and detects diagonal/row/col crossing center", () => {
      // 5x5 Main diagonal (passing through free center (2,2))
      const grid5 = createBlankGrid(5);
      // Center (2,2) is already isFree: true, isClaimed: true
      grid5[0 * 5 + 0].isClaimed = true;
      grid5[1 * 5 + 1].isClaimed = true;
      grid5[3 * 5 + 3].isClaimed = true;
      grid5[4 * 5 + 4].isClaimed = true;

      const res = checkBingoLines(grid5, 5);
      expect(res.hasBingo).toBe(true);
      expect(res.completedLines).toEqual([{ type: "main_diag" }]);

      // Row 2 (passing through free center)
      const gridRow2 = createBlankGrid(5);
      gridRow2[2 * 5 + 0].isClaimed = true;
      gridRow2[2 * 5 + 1].isClaimed = true;
      gridRow2[2 * 5 + 3].isClaimed = true;
      gridRow2[2 * 5 + 4].isClaimed = true;

      const resRow2 = checkBingoLines(gridRow2, 5);
      expect(resRow2.hasBingo).toBe(true);
      expect(resRow2.completedLines).toEqual([{ type: "row", index: 2 }]);
    });

    it("strictly produces ZERO false positives on incomplete lines (4 of 5 tiles)", () => {
      // Test every missing tile in 5x5 Row 0
      for (let missingCol = 0; missingCol < 5; missingCol++) {
        const grid = createBlankGrid(5);
        for (let c = 0; c < 5; c++) {
          if (c !== missingCol) {
            grid[0 * 5 + c].isClaimed = true;
          }
        }
        const result = checkBingoLines(grid, 5);
        expect(result.hasBingo).toBe(false);
        expect(result.completedLines).toHaveLength(0);
      }

      // Test incomplete main diagonal (missing 1 tile)
      const gridIncompleteDiag = createBlankGrid(5);
      gridIncompleteDiag[0 * 5 + 0].isClaimed = true;
      gridIncompleteDiag[1 * 5 + 1].isClaimed = true;
      // missing index 2 (center is free, but what if (3,3) and (4,4) are claimed except (4,4))
      gridIncompleteDiag[3 * 5 + 3].isClaimed = true;
      // (4,4) NOT claimed
      const resultDiag = checkBingoLines(gridIncompleteDiag, 5);
      expect(resultDiag.hasBingo).toBe(false);
      expect(resultDiag.completedLines).toHaveLength(0);
    });

    it("manages 2-way peer verification workflow, rejection, and timeout", () => {
      vi.useFakeTimers();

      const p1 = createMockPlayer("p1", "Claimer");
      const p2 = createMockPlayer("p2", "Peer");

      const session = new HumanBingoGameSession("LJ-BINGO", "p1", { p1, p2 });
      session.startGame();

      // Claiming own tile must fail
      expect(session.claimTile("p1", 0, "p1")).toBe(false);

      // Claiming non-existent target must fail
      expect(session.claimTile("p1", 0, "nonexistent")).toBe(false);

      // Valid claim request from p1 to p2 for tile 0
      const ok = session.claimTile("p1", 0, "p2");
      expect(ok).toBe(true);
      const pendingKeys = Object.keys(session.state.pendingVerifications);
      expect(pendingKeys).toHaveLength(1);
      const verificationId = pendingKeys[0];

      // 1. Test Rejection
      session.respondVerification(verificationId, false);
      expect(Object.keys(session.state.pendingVerifications)).toHaveLength(0);
      expect(session.state.playerGrids["p1"][0].isClaimed).toBe(false);

      // 2. Test Approval
      session.claimTile("p1", 0, "p2");
      const newVId = Object.keys(session.state.pendingVerifications)[0];
      session.respondVerification(newVId, true);
      expect(session.state.playerGrids["p1"][0].isClaimed).toBe(true);
      expect(session.state.playerGrids["p1"][0].verifiedByPeerName).toBe("Peer");
      expect(p1.score).toBe(50); // +50 pts for verified tile

      // Once claimed, further claims must fail
      expect(session.claimTile("p1", 0, "p2")).toBe(false);

      // 3. Test 45-second Timeout
      session.claimTile("p1", 1, "p2");
      expect(Object.keys(session.state.pendingVerifications)).toHaveLength(1);
      vi.advanceTimersByTime(46000);
      // Timeout should expire verification
      expect(Object.keys(session.state.pendingVerifications)).toHaveLength(0);
      expect(session.state.playerGrids["p1"][1].isClaimed).toBe(false);

      session.destroy();
      vi.useRealTimers();
    });

    it("surfaces duplicate pending verification behavior when user re-claims unverified tile", () => {
      const p1 = createMockPlayer("p1", "Claimer");
      const p2 = createMockPlayer("p2", "Peer");

      const session = new HumanBingoGameSession("LJ-BINGO2", "p1", { p1, p2 });
      session.startGame();

      // First claim on tile 2
      const claim1 = session.claimTile("p1", 2, "p2");
      expect(claim1).toBe(true);

      // Second claim on same tile 2 before peer responds
      // Observation: currently permitted because pendingVerifications is not checked
      const claim2 = session.claimTile("p1", 2, "p2");
      expect(claim2).toBe(true);

      const verifications = Object.keys(session.state.pendingVerifications);
      expect(verifications.length).toBe(2);

      // Approving first verification awards 50 pts
      session.respondVerification(verifications[0], true);
      expect(p1.score).toBe(50);

      // Approving second verification awards another 50 pts (cumulative 100 pts for one tile!)
      session.respondVerification(verifications[1], true);
      expect(p1.score).toBe(100);

      session.destroy();
    });
  });

  // =========================================================================
  // MISSION 5: Rapid Activity Switching Stress Test in UnifiedRoomSession
  // =========================================================================
  describe("Mission 5: Rapid Activity Switching & Unified Room Integrity", () => {
    it("preserves room code LJ-XXXX, player connections, and accumulates cross-game scores during 20 rapid switches", () => {
      const p1 = createMockPlayer("p1", "Tyberiusz", true);
      const p2 = createMockPlayer("p2", "Kamil");
      const p3 = createMockPlayer("p3", "Ola");

      const session = new UnifiedRoomSession("LJ-1234", "p1");
      session.addPlayer(p1);
      session.addPlayer(p2);
      session.addPlayer(p3);

      expect(session.roomCode).toBe("LJ-1234");
      expect(session.currentGameType).toBe("RYSOWANIE");

      // Award points in Rysowanie
      session.addSessionScore("p1", "RYSOWANIE", 350);
      session.addSessionScore("p2", "RYSOWANIE", 200);

      expect(session.sessionScores["p1"].total).toBe(350);
      expect(session.sessionScores["p1"].byGame.RYSOWANIE).toBe(350);

      // Switch to Two Truths
      session.switchGame("TWO_TRUTHS");
      expect(session.currentGameType).toBe("TWO_TRUTHS");
      expect(session.roomCode).toBe("LJ-1234");
      expect(session.players["p1"].score).toBe(350);

      // Award points in Two Truths
      session.addSessionScore("p1", "TWO_TRUTHS", 133);
      expect(session.sessionScores["p1"].total).toBe(483);
      expect(session.sessionScores["p1"].byGame.TWO_TRUTHS).toBe(133);

      // Rapidly switch through all 7 game modes in succession (20 cycles)
      const games: GameType[] = [
        "RYSOWANIE",
        "TWO_TRUTHS",
        "THIS_OR_THAT",
        "STORY_CHAIN",
        "HOT_SEAT",
        "QUIZ_SUPERLATIVES",
        "HUMAN_BINGO",
      ];

      for (let i = 0; i < 20; i++) {
        const targetGame = games[i % games.length];
        session.switchGame(targetGame);
        expect(session.currentGameType).toBe(targetGame);
        expect(session.roomCode).toBe("LJ-1234");
        expect(Object.keys(session.players)).toEqual(["p1", "p2", "p3"]);
      }

      // Verify cumulative session scores remain 100% intact
      expect(session.sessionScores["p1"].total).toBe(483);
      expect(session.sessionScores["p1"].byGame.RYSOWANIE).toBe(350);
      expect(session.sessionScores["p1"].byGame.TWO_TRUTHS).toBe(133);
      expect(session.sessionScores["p2"].total).toBe(200);

      // Verify host failover migration
      session.removePlayer("p1"); // Host leaves
      expect(session.hostId).toBe("p2"); // Host migrated to p2
      expect(session.players["p2"].isHost).toBe(true);

      session.destroy();
    });
  });
});
