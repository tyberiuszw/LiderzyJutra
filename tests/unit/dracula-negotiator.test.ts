import { describe, it, expect } from "vitest";
import { InformationDeductionSession } from "../../src/server/games/information-deduction-state";

describe("Information Sharing Engine - Dracula Fact Sheets & Negotiator Role", () => {
  it("initializes with separate fact sheets for Team 1 and Team 2", () => {
    const session = new InformationDeductionSession("LJ-DRAC", "DRACULA");

    expect(session.state.teamFactSheets).toBeDefined();
    expect(session.state.teamFactSheets?.["team-1"]).toBeDefined();
    expect(session.state.teamFactSheets?.["team-2"]).toBeDefined();

    // Verify key asymmetric information is separated
    const facts1 = session.state.teamFactSheets!["team-1"].facts;
    const facts2 = session.state.teamFactSheets!["team-2"].facts;

    expect(facts1.some((f) => f.includes("most zwodzony"))).toBe(true);
    expect(facts2.some((f) => f.includes("zamkiem runicznym"))).toBe(true);
  });

  it("designates negotiators without duplication", () => {
    const session = new InformationDeductionSession("LJ-DRAC2", "DRACULA");

    session.designateNegotiator("p1");
    session.designateNegotiator("p2");
    session.designateNegotiator("p1"); // duplicate call

    expect(session.state.negotiators).toEqual(["p1", "p2"]);
  });

  it("evaluates cooperative early timing solution", () => {
    const session = new InformationDeductionSession("LJ-DRAC3", "DRACULA");

    // Saturday 9:00 AM (Sobota 9:00 rano) is optimal cooperative solution
    expect(session.submitSolution("Sobota 9:00 rano")).toBe(true);
    expect(session.state.isSolutionCorrect).toBe(true);
  });
});
