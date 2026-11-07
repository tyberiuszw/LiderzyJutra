import { describe, it, expect } from "vitest";
import plMessages from "../../messages/pl.json";
import enMessages from "../../messages/en.json";
import ukMessages from "../../messages/uk.json";

function getAllKeyPaths(obj: Record<string, unknown>, prefix = ""): string[] {
  let paths: string[] = [];
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    const newPath = prefix ? `${prefix}.${key}` : key;
    if (val && typeof val === "object" && !Array.isArray(val)) {
      paths = paths.concat(getAllKeyPaths(val as Record<string, unknown>, newPath));
    } else {
      paths.push(newPath);
    }
  }
  return paths;
}

function getValueAtPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let curr: unknown = obj;
  for (const p of parts) {
    if (curr && typeof curr === "object" && p in curr) {
      curr = (curr as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return curr;
}

function extractParams(str: string): string[] {
  const matches = str.match(/\{(\w+)\}/g) || [];
  return matches.map((m) => m.slice(1, -1)).sort();
}

describe("Trilingual i18n Key Parity & Integrity (PL, EN, UK)", () => {
  const plPaths = getAllKeyPaths(plMessages as unknown as Record<string, unknown>).sort();
  const enPaths = getAllKeyPaths(enMessages as unknown as Record<string, unknown>).sort();
  const ukPaths = getAllKeyPaths(ukMessages as unknown as Record<string, unknown>).sort();

  it("has non-empty key catalogs for all three languages", () => {
    expect(plPaths.length).toBeGreaterThan(50);
    expect(enPaths.length).toBeGreaterThan(50);
    expect(ukPaths.length).toBeGreaterThan(50);
  });

  it("achieves 100% key parity between Polish (pl) and English (en)", () => {
    const missingInEn = plPaths.filter((p) => !enPaths.includes(p));
    const extraInEn = enPaths.filter((p) => !plPaths.includes(p));

    expect(missingInEn).toEqual([]);
    expect(extraInEn).toEqual([]);
    expect(enPaths.length).toBe(plPaths.length);
  });

  it("achieves 100% key parity between Polish (pl) and Ukrainian (uk)", () => {
    const missingInUk = plPaths.filter((p) => !ukPaths.includes(p));
    const extraInUk = ukPaths.filter((p) => !plPaths.includes(p));

    expect(missingInUk).toEqual([]);
    expect(extraInUk).toEqual([]);
    expect(ukPaths.length).toBe(plPaths.length);
  });

  it("ensures every key path resolves to a non-empty string in all catalogs", () => {
    for (const path of plPaths) {
      const plVal = getValueAtPath(plMessages as unknown as Record<string, unknown>, path);
      const enVal = getValueAtPath(enMessages as unknown as Record<string, unknown>, path);
      const ukVal = getValueAtPath(ukMessages as unknown as Record<string, unknown>, path);

      expect(typeof plVal, `pl.${path} should be string`).toBe("string");
      expect((plVal as string).trim().length, `pl.${path} must not be empty`).toBeGreaterThan(0);

      expect(typeof enVal, `en.${path} should be string`).toBe("string");
      expect((enVal as string).trim().length, `en.${path} must not be empty`).toBeGreaterThan(0);

      expect(typeof ukVal, `uk.${path} should be string`).toBe("string");
      expect((ukVal as string).trim().length, `uk.${path} must not be empty`).toBeGreaterThan(0);
    }
  });

  it("ensures identical parameter interpolation placeholders across languages", () => {
    for (const path of plPaths) {
      const plVal = getValueAtPath(plMessages as unknown as Record<string, unknown>, path) as string;
      const enVal = getValueAtPath(enMessages as unknown as Record<string, unknown>, path) as string;
      const ukVal = getValueAtPath(ukMessages as unknown as Record<string, unknown>, path) as string;

      const plParams = extractParams(plVal);
      const enParams = extractParams(enVal);
      const ukParams = extractParams(ukVal);

      expect(enParams, `Parameter markers for en.${path} must match pl.${path}`).toEqual(plParams);
      expect(ukParams, `Parameter markers for uk.${path} must match pl.${path}`).toEqual(plParams);
    }
  });

  it("covers all mandatory UI sections (common, nav, home, auth, dashboard, rooms, activities, safeguarding)", () => {
    const sections = ["common", "nav", "home", "auth", "dashboard", "rooms", "activities", "safeguarding"];
    for (const sec of sections) {
      expect(Object.keys(plMessages)).toContain(sec);
      expect(Object.keys(enMessages)).toContain(sec);
      expect(Object.keys(ukMessages)).toContain(sec);
    }
  });

  it("covers all 6 youth activities in the activities section", () => {
    const activityKeys = [
      "rysowanie",
      "two_truths",
      "this_or_that",
      "story_chain",
      "hot_seat",
      "quiz_superlatives",
      "human_bingo",
    ];

    for (const act of activityKeys) {
      expect(plMessages.activities, `pl.activities must contain ${act}`).toHaveProperty(act);
      expect(enMessages.activities, `en.activities must contain ${act}`).toHaveProperty(act);
      expect(ukMessages.activities, `uk.activities must contain ${act}`).toHaveProperty(act);
    }
  });
});
