import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Static and Showcase Pages (/goal, /teamwork, /boost)", () => {
  const goalPath = path.resolve(__dirname, "../../src/app/goal/page.tsx");
  const teamworkPath = path.resolve(__dirname, "../../src/app/teamwork/page.tsx");
  const boostPath = path.resolve(__dirname, "../../src/app/boost/page.tsx");

  it("verifies GoalPage file existence, valid client component declaration, and cross-links to /teamwork and /boost", () => {
    expect(fs.existsSync(goalPath)).toBe(true);
    const content = fs.readFileSync(goalPath, "utf-8");
    expect(content).toContain('"use client";');
    expect(content).toContain('href="/teamwork"');
    expect(content).toContain('href="/boost"');
    expect(content).toContain("Cel Platformy: Budować Zespoły Przyszłości");
    expect(content).toContain("Narzędzia Zespołowe: Skorzystaj z /teamwork oraz /boost");
    expect(content).toContain("export default function GoalPage");
  });

  it("verifies TeamworkPage file existence, valid client component, and cross-navigation", () => {
    expect(fs.existsSync(teamworkPath)).toBe(true);
    const content = fs.readFileSync(teamworkPath, "utf-8");
    expect(content).toContain('"use client";');
    expect(content).toContain('href="/goal"');
    expect(content).toContain('href="/boost"');
    expect(content).toContain("Wyzwanie Przetrwania (Survival Challenge)");
    expect(content).toContain("export default function TeamworkPage");
  });

  it("verifies BoostPage file existence, valid client component, and energizer prompts", () => {
    expect(fs.existsSync(boostPath)).toBe(true);
    const content = fs.readFileSync(boostPath, "utf-8");
    expect(content).toContain('"use client";');
    expect(content).toContain('href="/goal"');
    expect(content).toContain('href="/teamwork"');
    expect(content).toContain("Team Energy Booster");
    expect(content).toContain("BOOST_PROMPTS");
    expect(content).toContain("export default function BoostPage");
  });
});

