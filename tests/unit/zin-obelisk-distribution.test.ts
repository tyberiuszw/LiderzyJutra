import { describe, it, expect } from "vitest";
import {
  InformationDeductionSession,
  ZIN_OBELISK_CLUES,
} from "../../src/server/games/information-deduction-state";

describe("Information Sharing Engine - Zin Obelisk Clue Distribution", () => {
  it("has exactly 33 rich clues for the Atlantian math mystery", () => {
    expect(ZIN_OBELISK_CLUES.length).toBe(33);
  });

  it("partitions 33 clue cards among 4 players with no loss or duplication", () => {
    const session = new InformationDeductionSession("LJ-ZIN1", "ZIN_OBELISK");
    const players = ["player_a", "player_b", "player_c", "player_d"];

    session.dealCards(players);

    const allAssignedCardTexts: string[] = [];
    players.forEach((pId) => {
      const cards = session.state.clueCards[pId] || [];
      expect(cards.length).toBeGreaterThanOrEqual(8);
      expect(cards.length).toBeLessThanOrEqual(9);
      cards.forEach((c) => allAssignedCardTexts.push(c.text));
    });

    // Total dealt clues must equal 33
    expect(allAssignedCardTexts.length).toBe(33);

    // No duplicate clues
    const uniqueClues = new Set(allAssignedCardTexts);
    expect(uniqueClues.size).toBe(33);

    // Every original clue is accounted for
    ZIN_OBELISK_CLUES.forEach((originalClue) => {
      expect(uniqueClues.has(originalClue)).toBe(true);
    });
  });

  it("partitions 33 clue cards among 6 players cleanly", () => {
    const session = new InformationDeductionSession("LJ-ZIN2", "ZIN_OBELISK");
    const players = ["p1", "p2", "p3", "p4", "p5", "p6"];

    session.dealCards(players);

    let totalDealt = 0;
    players.forEach((pId) => {
      const count = (session.state.clueCards[pId] || []).length;
      expect([5, 6]).toContain(count);
      totalDealt += count;
    });

    expect(totalDealt).toBe(33);
  });

  it("evaluates correct solution 'Neptiminus' case-insensitively and tolerates surrounding text", () => {
    const session = new InformationDeductionSession("LJ-ZIN3", "ZIN_OBELISK");

    expect(session.submitSolution("Neptiminus")).toBe(true);
    expect(session.state.isSolutionCorrect).toBe(true);
    expect(session.state.phase).toBe("SOLUTION_REVEAL");

    // Case-insensitive test
    const session2 = new InformationDeductionSession("LJ-ZIN4", "ZIN_OBELISK");
    expect(session2.submitSolution("Dzień neptiminus w 44 tygodniu")).toBe(true);
    expect(session2.state.isSolutionCorrect).toBe(true);

    // Wrong answer test
    const session3 = new InformationDeductionSession("LJ-ZIN5", "ZIN_OBELISK");
    expect(session3.submitSolution("Poseidonis")).toBe(false);
    expect(session3.state.isSolutionCorrect).toBe(false);
  });
});
