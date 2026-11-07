import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  ensureContrast,
  ensureReadablePrimary,
  getContrastTextColor,
  getRelativeLuminance,
  hslToHex,
} from "./contrast";
import { CHAMELEON_PRESETS } from "./presets";

const LIGHT_SURFACE = "#FFFFFF";
const DARK_SURFACE = "#151D2F";

describe("contrast helpers", () => {
  it("computes known luminance values", () => {
    expect(getRelativeLuminance("#FFFFFF")).toBeCloseTo(1, 4);
    expect(getRelativeLuminance("#000000")).toBeCloseTo(0, 4);
  });

  it("white on black is 21:1", () => {
    expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 1);
  });

  it.each(CHAMELEON_PRESETS)(
    "preset $name: button text reaches WCAG AA (>= 4.5:1)",
    (p) => {
      const text = getContrastTextColor(p.primary);
      expect(contrastRatio(p.primary, text)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it.each(CHAMELEON_PRESETS)(
    "preset $name: --chameleon-text passes AA on light and dark surfaces",
    (p) => {
      expect(
        contrastRatio(ensureContrast(p.primary, LIGHT_SURFACE), LIGHT_SURFACE),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatio(ensureContrast(p.primary, DARK_SURFACE), DARK_SURFACE),
      ).toBeGreaterThanOrEqual(4.5);
    },
  );

  it("every custom hue from the slider yields AA-safe button text", () => {
    for (let h = 0; h < 360; h += 5) {
      const bg = ensureReadablePrimary(hslToHex(h, 82, 52));
      const text = getContrastTextColor(bg);
      expect(contrastRatio(bg, text)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
