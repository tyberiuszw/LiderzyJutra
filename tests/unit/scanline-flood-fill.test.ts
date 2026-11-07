import { describe, it, expect } from "vitest";
import {
  scanlineFloodFillBuffer,
  parseCssColor,
} from "../../src/components/canvas/scanline-fill";

describe("Scanline Flood Fill Engine on Uint32Array (Contract 2)", () => {
  it("parses CSS color strings accurately into [r, g, b, a]", () => {
    expect(parseCssColor("#ffffff")).toEqual([255, 255, 255, 255]);
    expect(parseCssColor("#000000")).toEqual([0, 0, 0, 255]);
    expect(parseCssColor("#06B6D4")).toEqual([6, 182, 212, 255]); // Cyber Teal
    expect(parseCssColor("#F59E0B")).toEqual([245, 158, 11, 255]); // Amber
    expect(parseCssColor("#fff")).toEqual([255, 255, 255, 255]);
    expect(parseCssColor("#f00")).toEqual([255, 0, 0, 255]);
    expect(parseCssColor("rgb(10, 20, 30)")).toEqual([10, 20, 30, 255]);
    expect(parseCssColor("rgba(10, 20, 30, 0.5)")).toEqual([10, 20, 30, 128]);
  });

  it("fills an empty solid canvas buffer completely", () => {
    const width = 10;
    const height = 10;
    const buffer = new Uint32Array(width * height);
    // Initial color: all 0 (transparent black: RGBA 0,0,0,0)

    const fillRgba: [number, number, number, number] = [255, 0, 0, 255]; // Red
    const changed = scanlineFloodFillBuffer(buffer, width, height, {
      x: 0,
      y: 0,
      fillColorRgba: fillRgba,
      tolerance: 32,
    });

    expect(changed).toBe(true);

    // Little endian ABGR for [255, 0, 0, 255]: (255<<24)|(0<<16)|(0<<8)|255 = 0xff0000ff
    const expected32 = ((((255 & 0xff) << 24) | (255 & 0xff)) >>> 0);
    for (let i = 0; i < buffer.length; i++) {
      expect(buffer[i]).toBe(expected32);
    }
  });

  it("strictly respects closed borders and does not leak outside a bounded box", () => {
    const width = 10;
    const height = 10;
    const buffer = new Uint32Array(width * height);

    const border32 = ((((255 & 0xff) << 24) | ((255 & 0xff) << 16)) >>> 0);

    // Draw 6x6 border from (2,2) to (7,7)
    for (let x = 2; x <= 7; x++) {
      buffer[2 * width + x] = border32;
      buffer[7 * width + x] = border32;
    }
    for (let y = 2; y <= 7; y++) {
      buffer[y * width + 2] = border32;
      buffer[y * width + 7] = border32;
    }

    // Fill inside the box at (4,4) with Red
    const fillRgba: [number, number, number, number] = [255, 0, 0, 255];
    const fill32 = ((((255 & 0xff) << 24) | (255 & 0xff)) >>> 0);

    const changed = scanlineFloodFillBuffer(buffer, width, height, {
      x: 4,
      y: 4,
      fillColorRgba: fillRgba,
      tolerance: 0,
    });

    expect(changed).toBe(true);

    // Verify inside is filled with Red
    for (let y = 3; y <= 6; y++) {
      for (let x = 3; x <= 6; x++) {
        expect(buffer[y * width + x]).toBe(fill32);
      }
    }

    // Verify border remains Blue
    expect(buffer[2 * width + 4]).toBe(border32);
    expect(buffer[7 * width + 4]).toBe(border32);

    // Verify outside remains initial 0 (unfilled)
    expect(buffer[0]).toBe(0);
    expect(buffer[1 * width + 1]).toBe(0);
    expect(buffer[8 * width + 8]).toBe(0);
  });

  it("activates O(1) early exit when seed pixel already equals fill color within tolerance", () => {
    const width = 5;
    const height = 5;
    const buffer = new Uint32Array(width * height);

    const red32 = ((255 & 0xff) << 24) | (255 & 0xff);
    buffer.fill(red32);

    // Attempting to fill with red on an already red canvas
    const changed = scanlineFloodFillBuffer(buffer, width, height, {
      x: 2,
      y: 2,
      fillColorRgba: [255, 0, 0, 255],
      tolerance: 32,
    });

    expect(changed).toBe(false);
  });

  it("visited bitmask guarantees loop termination with tolerance DeltaE <= 32", () => {
    const width = 20;
    const height = 20;
    const buffer = new Uint32Array(width * height);

    // Create subtle gradient where adjacent pixels differ by 5 (< 32 tolerance)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const r = Math.min(255, x * 4);
        buffer[y * width + x] = ((255 & 0xff) << 24) | (r & 0xff);
      }
    }

    // Start fill with Emerald Green
    const start = Date.now();
    const changed = scanlineFloodFillBuffer(buffer, width, height, {
      x: 0,
      y: 0,
      fillColorRgba: [16, 185, 129, 255],
      tolerance: 32,
    });
    const duration = Date.now() - start;

    expect(changed).toBe(true);
    // Must terminate almost instantly without hanging or infinite cycling
    expect(duration).toBeLessThan(100);
  });

  it("handles out of bounds coordinates safely returning false", () => {
    const buffer = new Uint32Array(100);
    expect(
      scanlineFloodFillBuffer(buffer, 10, 10, {
        x: -1,
        y: 5,
        fillColorRgba: [255, 255, 255, 255],
      })
    ).toBe(false);

    expect(
      scanlineFloodFillBuffer(buffer, 10, 10, {
        x: 10,
        y: 5,
        fillColorRgba: [255, 255, 255, 255],
      })
    ).toBe(false);
  });
});
