import { describe, it, expect } from "vitest";
import {
  InformationDeductionSession,
  MOVIE_MYSTERY_ROLES,
  MOVIE_MYSTERY_CLUES,
} from "../../src/server/games/information-deduction-state";

describe("Movie Murder Mystery Party Engine", () => {
  it("defines exactly 10 character roles with complete dossiers and unique IDs", () => {
    expect(MOVIE_MYSTERY_ROLES.length).toBe(10);
    const ids = MOVIE_MYSTERY_ROLES.map((r) => r.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(10);

    // Verify murderer role exists
    const murderer = MOVIE_MYSTERY_ROLES.find((r) => r.id === "co_star");
    expect(murderer).toBeDefined();
    expect(murderer?.name).toBe("Julian Cross");
    expect(murderer?.occupation).toContain("ZABÓJCA");
  });

  it("defines exactly 18 scavenged clues for players to investigate", () => {
    expect(MOVIE_MYSTERY_CLUES.length).toBe(18);
    // Ensure all clues are non-empty strings
    MOVIE_MYSTERY_CLUES.forEach((clue) => {
      expect(typeof clue).toBe("string");
      expect(clue.length).toBeGreaterThan(10);
    });
  });

  it("distributes 10 roles and 18 scavenged clues evenly to players upon dealCards", () => {
    const session = new InformationDeductionSession("ROOM-MMM", "MOVIE_MYSTERY");
    const playerIds = ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "p9", "p10"];

    session.dealCards(playerIds);

    // Each player receives a role
    playerIds.forEach((pid) => {
      expect(session.state.roles?.[pid]).toBeDefined();
      expect(session.state.roles?.[pid].assignedPlayerId).toBe(pid);
    });

    // 18 clues distributed among 10 players -> each gets 1 or 2 clues
    let totalDealtClues = 0;
    playerIds.forEach((pid) => {
      const clues = session.state.clueCards[pid] || [];
      expect(clues.length).toBeGreaterThanOrEqual(1);
      expect(clues.length).toBeLessThanOrEqual(2);
      totalDealtClues += clues.length;
    });
    expect(totalDealtClues).toBe(18);
  });
});
