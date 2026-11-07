/**
 * WCAG 2.1 contrast helpers (ITU-R BT.709 relative luminance).
 * Used by ThemeProvider to pick readable text on top of chameleon colors.
 */

export const DARK_TEXT = "#0F172A";
export const LIGHT_TEXT = "#FFFFFF";

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

function linearize(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function getRelativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

export function contrastRatio(hexA: string, hexB: string): number {
  const a = getRelativeLuminance(hexA);
  const b = getRelativeLuminance(hexB);
  const [hi, lo] = a >= b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

/** Picks white or deep slate, whichever gives the higher contrast on `bgHex`. */
export function getContrastTextColor(bgHex: string): string {
  return contrastRatio(bgHex, LIGHT_TEXT) >= contrastRatio(bgHex, DARK_TEXT)
    ? LIGHT_TEXT
    : DARK_TEXT;
}

/**
 * Darkens (or lightens) `hex` until it reaches `minRatio` against `surfaceHex`.
 * Used for the `--chameleon-text` token: chameleon color used as foreground text.
 */
export function ensureContrast(
  hex: string,
  surfaceHex: string,
  minRatio = 4.5,
): string {
  if (contrastRatio(hex, surfaceHex) >= minRatio) return hex.toUpperCase();
  const [r, g, b] = hexToRgb(hex);
  const surfaceIsLight = getRelativeLuminance(surfaceHex) > 0.5;
  const target = surfaceIsLight ? 0 : 255;
  for (let t = 0.02; t <= 1.0001; t += 0.02) {
    const mix = rgbToHex(
      r + (target - r) * t,
      g + (target - g) * t,
      b + (target - b) * t,
    );
    if (contrastRatio(mix, surfaceHex) >= minRatio) return mix;
  }
  return surfaceIsLight ? "#000000" : "#FFFFFF";
}

/**
 * Mid-luminance colors (Y≈0.18) cannot reach 4.5:1 with either white or deep
 * slate text. This nudges such a color toward white or black — whichever
 * needs the smaller change — until one of the two text colors is AA-readable.
 * Colors that already pass (all curated presets) are returned unchanged.
 */
export function ensureReadablePrimary(hex: string, minRatio = 4.5): string {
  const best = (c: string) =>
    Math.max(contrastRatio(c, LIGHT_TEXT), contrastRatio(c, DARK_TEXT));
  if (best(hex) >= minRatio) return hex.toUpperCase();
  const [r, g, b] = hexToRgb(hex);
  for (let t = 0.01; t <= 1.0001; t += 0.01) {
    const darker = rgbToHex(r * (1 - t), g * (1 - t), b * (1 - t));
    const lighter = rgbToHex(r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t);
    if (best(darker) >= minRatio) return darker;
    if (best(lighter) >= minRatio) return lighter;
  }
  return hex.toUpperCase();
}

/** Converts a hue (0-360) to a vivid hex color for the custom hue slider. */
export function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const lig = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(lig, 1 - lig);
  const f = (n: number) =>
    lig - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return rgbToHex(f(0) * 255, f(8) * 255, f(4) * 255);
}
