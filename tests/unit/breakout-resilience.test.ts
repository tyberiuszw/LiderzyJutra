import { describe, it, expect } from "vitest";
import { UnifiedRoomSession } from "../../src/server/rooms/room-manager";
import { SurvivalChallengeSession } from "../../src/server/games/survival-challenge-state";

describe("Breakout Group Resilience & Survival Multi-Group Scoring", () => {
  it("safely handles 0, negative, and invalid counts without crashing or throwing", () => {
    const room = new UnifiedRoomSession("ROOM-BRK", "host-1");
    room.addPlayer({
      id: "p1",
      name: "Gracz 1",
      isHost: false,
      isGuest: false,
      score: 0,
      isConnected: true,
      chameleonColors: {
        primary: "#06B6D4",
        secondary: "#3B82F6",
        accent: "#10B981",
      },
    });
    room.addPlayer({
      id: "p2",
      name: "Gracz 2",
      isHost: false,
      isGuest: false,
      score: 0,
      isConnected: true,
      chameleonColors: {
        primary: "#3B82F6",
        secondary: "#8B5CF6",
        accent: "#EC4899",
      },
    });

    // Count = 0
    expect(() => room.createBreakoutGroups(0)).not.toThrow();
    expect(Object.keys(room.breakoutGroups).length).toBeGreaterThanOrEqual(1);

    // Count = -5
    expect(() => room.createBreakoutGroups(-5)).not.toThrow();

    // Count = NaN
    expect(() => room.createBreakoutGroups(NaN)).not.toThrow();
  });

  it("calculates distinct scores for each breakout group in Survival Challenge", () => {
    const session = new SurvivalChallengeSession("ROOM-SURV", "LOST_AT_SEA");

    session.submitIndividualRanking("p1", [2, 8, 3, 5, 11, 14, 15, 13, 7, 10, 12, 9, 6, 4, 1]);
    session.submitIndividualRanking("p2", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);

    // Group 1 submits perfect Coast Guard ranking
    session.submitTeamRanking("group-1", [2, 8, 3, 5, 11, 14, 15, 13, 7, 10, 12, 9, 6, 4, 1]);
    // Group 2 submits completely reversed ranking
    session.submitTeamRanking("group-2", [1, 4, 6, 9, 12, 10, 7, 13, 15, 14, 11, 5, 3, 8, 2]);

    session.calculateAllScores();

    // Group 1 should have score = 0
    expect(session.state.scores["group-1"]).toBeDefined();
    expect(session.state.scores["group-1"].teamScore).toBe(0);
    expect(session.state.scores["group-1"].bracket.label).toContain("Doskonały");

    // Group 2 should have high difference score
    expect(session.state.scores["group-2"]).toBeDefined();
    expect(session.state.scores["group-2"].teamScore).toBeGreaterThan(50);
  });
});
