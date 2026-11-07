/**
 * Non-Recursive Scanline Stack Flood Fill on Uint32Array (Contract 2)
 *
 * Implements high-performance paint bucket tool on 1200x900 canvas:
 * 1. Little-endian ABGR 32-bit packing: ((A << 24) | (B << 16) | (G << 8) | R).
 * 2. Dedicated Uint8Array(1200 * 900) visited bitmask that guarantees loop termination
 *    even when Euclidean distance DeltaE <= 32.
 * 3. O(1) pre-condition early exit guard if seed pixel already matches fill color within tolerance.
 */

import { CANONICAL_WIDTH, CANONICAL_HEIGHT } from "./canonical-coordinates";

export interface FloodFillOptions {
  x: number;
  y: number;
  fillColorRgba: [number, number, number, number]; // [r, g, b, a] (0-255)
  tolerance?: number;                              // default 32
}

/**
 * Parses any CSS color string (#RGB, #RRGGBB, rgb(...), rgba(...)) into [r, g, b, a].
 */
export function parseCssColor(color: string): [number, number, number, number] {
  const trimmed = color.trim().toLowerCase();

  // #RRGGBB
  if (trimmed.startsWith("#") && trimmed.length === 7) {
    const r = parseInt(trimmed.slice(1, 3), 16);
    const g = parseInt(trimmed.slice(3, 5), 16);
    const b = parseInt(trimmed.slice(5, 7), 16);
    return [r, g, b, 255];
  }

  // #RGB
  if (trimmed.startsWith("#") && trimmed.length === 4) {
    const r = parseInt(trimmed[1] + trimmed[1], 16);
    const g = parseInt(trimmed[2] + trimmed[2], 16);
    const b = parseInt(trimmed[3] + trimmed[3], 16);
    return [r, g, b, 255];
  }

  // rgb(...) or rgba(...)
  const rgbMatch = trimmed.match(/^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/);
  if (rgbMatch) {
    const r = Math.min(255, Math.max(0, parseInt(rgbMatch[1], 10)));
    const g = Math.min(255, Math.max(0, parseInt(rgbMatch[2], 10)));
    const b = Math.min(255, Math.max(0, parseInt(rgbMatch[3], 10)));
    const a = rgbMatch[4] !== undefined ? Math.round(parseFloat(rgbMatch[4]) * 255) : 255;
    return [r, g, b, a];
  }

  // Default fallback: black
  return [0, 0, 0, 255];
}

/**
 * Pure buffer implementation of scanline flood fill on Uint32Array.
 * Headless-testable without requiring a DOM CanvasRenderingContext2D.
 */
export function scanlineFloodFillBuffer(
  data32: Uint32Array,
  width: number,
  height: number,
  options: FloodFillOptions
): boolean {
  const { x, y, fillColorRgba, tolerance = 32 } = options;

  if (x < 0 || x >= width || y < 0 || y >= height) {
    return false;
  }

  // Little-endian ABGR packing: ((A & 0xff) << 24) | ((B & 0xff) << 16) | ((G & 0xff) << 8) | (R & 0xff)
  const [fR, fG, fB, fA] = fillColorRgba;
  const fill32 =
    ((((fA & 0xff) << 24) |
      ((fB & 0xff) << 16) |
      ((fG & 0xff) << 8) |
      (fR & 0xff)) >>>
      0);

  const seedIdx = y * width + x;
  const seed32 = data32[seedIdx];

  const seedR = seed32 & 0xff;
  const seedG = (seed32 >> 8) & 0xff;
  const seedB = (seed32 >> 16) & 0xff;
  const seedA = (seed32 >> 24) & 0xff;

  const tolSq = tolerance * tolerance;

  // O(1) Pre-condition Early Exit Guard:
  // If the seed pixel already matches the fill color within tolerance, return immediately
  const initialDistSq =
    (seedR - fR) ** 2 +
    (seedG - fG) ** 2 +
    (seedB - fB) ** 2 +
    (seedA - fA) ** 2;

  if (initialDistSq <= tolSq) {
    return false; // No change needed
  }

  // Dedicated visited bitmask guarantees termination and avoids infinite loops with tolerance
  const visited = new Uint8Array(width * height);

  function matchesSeed(idx: number): boolean {
    if (visited[idx]) return false;
    const px = data32[idx];
    const r = px & 0xff;
    const g = (px >> 8) & 0xff;
    const b = (px >> 16) & 0xff;
    const a = (px >> 24) & 0xff;

    const distSq =
      (r - seedR) ** 2 +
      (g - seedG) ** 2 +
      (b - seedB) ** 2 +
      (a - seedA) ** 2;

    return distSq <= tolSq;
  }

  // Non-recursive scanline stack: stores [x, y] coordinates
  const stack: [number, number][] = [[x, y]];

  while (stack.length > 0) {
    const [curX, curY] = stack.pop()!;
    let lx = curX;
    let idx = curY * width + lx;

    // Scan leftwards
    while (lx >= 0 && matchesSeed(idx)) {
      lx--;
      idx--;
    }
    lx++; // First matching pixel in span

    // Scan rightwards
    let rx = curX;
    idx = curY * width + rx;
    while (rx < width && matchesSeed(idx)) {
      rx++;
      idx++;
    }
    rx--; // Last matching pixel in span

    // Fill current horizontal span [lx..rx] and mark in visited bitmask
    for (let fillX = lx; fillX <= rx; fillX++) {
      const fillIdx = curY * width + fillX;
      data32[fillIdx] = fill32;
      visited[fillIdx] = 1;
    }

    // Inspect lines directly above and below to discover adjacent spans
    const scanRow = (yOffset: number) => {
      const targetY = curY + yOffset;
      if (targetY < 0 || targetY >= height) return;

      let inSpan = false;
      for (let scanX = lx; scanX <= rx; scanX++) {
        const scanIdx = targetY * width + scanX;
        if (matchesSeed(scanIdx)) {
          if (!inSpan) {
            stack.push([scanX, targetY]);
            inSpan = true;
          }
        } else {
          inSpan = false;
        }
      }
    };

    scanRow(-1); // Upward scan
    scanRow(1);  // Downward scan
  }

  return true;
}

/**
 * Standard scanline flood fill on a DOM CanvasRenderingContext2D.
 */
export function scanlineFloodFill(
  ctx: CanvasRenderingContext2D,
  options: FloodFillOptions
): void {
  const { x, y } = options;
  if (x < 0 || x >= CANONICAL_WIDTH || y < 0 || y >= CANONICAL_HEIGHT) return;

  const imageData = ctx.getImageData(0, 0, CANONICAL_WIDTH, CANONICAL_HEIGHT);
  const data32 = new Uint32Array(imageData.data.buffer);

  const changed = scanlineFloodFillBuffer(data32, CANONICAL_WIDTH, CANONICAL_HEIGHT, options);
  if (changed) {
    ctx.putImageData(imageData, 0, 0);
  }
}
