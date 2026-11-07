import { describe, it, expect } from "vitest";
import { InformationDeductionSession } from "../../src/server/games/information-deduction-state";

describe("Deduction Solution Validation & Diacritic Robustness", () => {
  it("rejects trivial, short or empty string submissions across all games", () => {
    const games = ["ZIN_OBELISK", "DRACULA", "MURDER_TECHSTREAM", "MOVIE_MYSTERY"] as const;

    games.forEach((gId) => {
      const session = new InformationDeductionSession("ROOM-VAL", gId);
      expect(session.submitSolution("")).toBe(false);
      expect(session.submitSolution(" ")).toBe(false);
      expect(session.submitSolution("e")).toBe(false);
      expect(session.submitSolution("n")).toBe(false);
      expect(session.submitSolution("ab")).toBe(false);
      expect(session.state.isSolutionCorrect).toBe(false);
    });
  });

  it("accurately verifies Zin Obelisk solution", () => {
    const session = new InformationDeductionSession("ROOM-ZIN", "ZIN_OBELISK");
    expect(session.submitSolution("Neptiminus")).toBe(true);
    expect(session.submitSolution("neptiminus")).toBe(true);
    expect(session.submitSolution("W dniu Neptiminus")).toBe(true);
    expect(session.submitSolution("Aqueus")).toBe(false);
    expect(session.submitSolution("Poseidonis")).toBe(false);
  });

  it("accurately verifies Dracula collaborative solution", () => {
    const session = new InformationDeductionSession("ROOM-DRAC", "DRACULA");
    expect(session.submitSolution("Sobota 9:00")).toBe(true);
    expect(session.submitSolution("sobota rano")).toBe(true);
    expect(session.submitSolution("Saturday 9:00 AM")).toBe(true);
    expect(session.submitSolution("wtorek")).toBe(false);
  });

  it("accurately verifies Murder Mystery TechStream solution", () => {
    const session = new InformationDeductionSession("ROOM-TECH", "MURDER_TECHSTREAM");
    expect(session.submitSolution("Bob Hartley")).toBe(true);
    expect(session.submitSolution("hartley")).toBe(true);
    expect(session.submitSolution("wiceprezes Bob")).toBe(true);
    expect(session.submitSolution("James Mulligan")).toBe(false);
  });

  it("accurately verifies Movie Murder Mystery solution", () => {
    const session = new InformationDeductionSession("ROOM-MOV", "MOVIE_MYSTERY");
    expect(session.submitSolution("Julian Cross")).toBe(true);
    expect(session.submitSolution("cross")).toBe(true);
    expect(session.submitSolution("drugoplanowiec")).toBe(true);
    expect(session.submitSolution("Arthur Von Stern")).toBe(false);
    expect(session.submitSolution("Chad Sterling")).toBe(false);
  });
});
