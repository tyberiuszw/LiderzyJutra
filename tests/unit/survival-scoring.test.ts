import { describe, it, expect } from "vitest";
import {
  LOST_AT_SEA_ITEMS,
  NASA_MOON_ITEMS,
  calculateSurvivalDifference,
  getSurvivalBracket,
  SurvivalChallengeSession,
} from "../../src/server/games/survival-challenge-state";

describe("Survival Challenge Engine - Scoring & Synergy", () => {
  it("calculates perfect zero difference when user ranking matches expert exactly", () => {
    // Sort items by official expert rank
    const perfectLostAtSea = [...LOST_AT_SEA_ITEMS]
      .sort((a, b) => a.expertRank - b.expertRank)
      .map((it) => it.id);

    const diff = calculateSurvivalDifference(perfectLostAtSea, LOST_AT_SEA_ITEMS);
    expect(diff).toBe(0);

    const bracket = getSurvivalBracket(diff);
    expect(bracket.label).toContain("Doskonały");
  });

  it("calculates maximal difference when user ranking is completely inverted", () => {
    // Completely reversed expert rank (worst possible)
    const reversedMoon = [...NASA_MOON_ITEMS]
      .sort((a, b) => b.expertRank - a.expertRank)
      .map((it) => it.id);

    const diff = calculateSurvivalDifference(reversedMoon, NASA_MOON_ITEMS);
    // For 15 items, maximal inversion sum |(16-i) - i| = 112
    expect(diff).toBe(112);

    const bracket = getSurvivalBracket(diff);
    expect(bracket.range).toBe("71+");
    expect(bracket.label).toContain("Bardzo słaby");
  });

  it("correctly identifies survival brackets across score boundaries", () => {
    expect(getSurvivalBracket(0).label).toContain("Doskonały");
    expect(getSurvivalBracket(25).label).toContain("Doskonały");
    expect(getSurvivalBracket(26).label).toContain("Dobry");
    expect(getSurvivalBracket(32).label).toContain("Dobry");
    expect(getSurvivalBracket(33).label).toContain("Przeciętny");
    expect(getSurvivalBracket(45).label).toContain("Przeciętny");
    expect(getSurvivalBracket(46).label).toContain("Dostateczny");
    expect(getSurvivalBracket(55).label).toContain("Dostateczny");
    expect(getSurvivalBracket(56).label).toContain("Słaby");
    expect(getSurvivalBracket(70).label).toContain("Słaby");
    expect(getSurvivalBracket(71).label).toContain("Bardzo słaby");
    expect(getSurvivalBracket(112).label).toContain("Bardzo słaby");
  });

  it("computes team synergy gain when team outperforms average individual", () => {
    const session = new SurvivalChallengeSession("LJ-SURV", "LOST_AT_SEA");

    // Player 1 has score 60
    // Player 2 has score 50
    // Individual average = 55
    const p1Ranking = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    const p2Ranking = [2, 1, 4, 3, 6, 5, 8, 7, 10, 9, 12, 11, 14, 13, 15];

    session.submitIndividualRanking("player_1", p1Ranking);
    session.submitIndividualRanking("player_2", p2Ranking);

    // Team produces better ranking (closer to expert)
    const teamRanking = [...LOST_AT_SEA_ITEMS]
      .sort((a, b) => a.expertRank - b.expertRank)
      .map((it) => it.id); // score 0

    session.submitTeamRanking("team", teamRanking);
    session.calculateAllScores();

    const teamScoreSummary = session.state.scores["team"];
    expect(teamScoreSummary).toBeDefined();
    expect(teamScoreSummary.teamScore).toBe(0);
    expect(teamScoreSummary.individualScore).toBeGreaterThan(0);
    // Synergy = indAvg - teamScore > 0
    expect(teamScoreSummary.synergyGain).toBe(teamScoreSummary.individualScore);
    expect(teamScoreSummary.bracket.label).toContain("Doskonały");
  });
});
