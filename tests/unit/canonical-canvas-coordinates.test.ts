import { describe, it, expect, vi } from "vitest";
import {
  CANONICAL_WIDTH,
  CANONICAL_HEIGHT,
  getCanonicalCoordinates,
  getMidPoint,
  renderStrokeSegment,
} from "../../src/components/canvas/canonical-coordinates";

describe("Canonical Canvas Coordinates (Contract 2)", () => {
  const createMockCanvas = (width: number, height: number, left = 0, top = 0) => {
    return {
      getBoundingClientRect: () => ({
        width,
        height,
        left,
        top,
        right: left + width,
        bottom: top + height,
        x: left,
        y: top,
        toJSON: () => {},
      }),
    } as unknown as HTMLCanvasElement;
  };

  it("strictly enforces canonical dimensions 1200x900", () => {
    expect(CANONICAL_WIDTH).toBe(1200);
    expect(CANONICAL_HEIGHT).toBe(900);
  });

  it("accurately maps pointer client coordinates on a 1:1 canvas", () => {
    const canvas = createMockCanvas(1200, 900, 50, 100);
    const point = getCanonicalCoordinates({ clientX: 50, clientY: 100 }, canvas);
    expect(point).toEqual({ x: 0, y: 0 });

    const centerPoint = getCanonicalCoordinates({ clientX: 650, clientY: 550 }, canvas);
    expect(centerPoint).toEqual({ x: 600, y: 450 });

    const maxPoint = getCanonicalCoordinates({ clientX: 1250, clientY: 1000 }, canvas);
    expect(maxPoint).toEqual({ x: 1199, y: 899 });
  });

  it("accurately scales down from a large display (e.g. 2400x1800)", () => {
    const canvas = createMockCanvas(2400, 1800, 0, 0);
    const point = getCanonicalCoordinates({ clientX: 1200, clientY: 900 }, canvas);
    expect(point).toEqual({ x: 600, y: 450 });
  });

  it("accurately scales up from a small display (e.g. 600x450 mobile)", () => {
    const canvas = createMockCanvas(600, 450, 0, 0);
    const point = getCanonicalCoordinates({ clientX: 300, clientY: 225 }, canvas);
    expect(point).toEqual({ x: 600, y: 450 });
  });

  it("triggers zero-dimension guard and returns null when canvas is collapsed (width=0 or height=0)", () => {
    const collapsedWidth = createMockCanvas(0, 900);
    expect(getCanonicalCoordinates({ clientX: 100, clientY: 100 }, collapsedWidth)).toBeNull();

    const collapsedHeight = createMockCanvas(1200, 0);
    expect(getCanonicalCoordinates({ clientX: 100, clientY: 100 }, collapsedHeight)).toBeNull();

    const hiddenCanvas = createMockCanvas(0, 0);
    expect(getCanonicalCoordinates({ clientX: 100, clientY: 100 }, hiddenCanvas)).toBeNull();
  });

  it("strictly clamps coordinates to [0..1199, 0..899] preventing out-of-bounds indexing", () => {
    const canvas = createMockCanvas(800, 600, 100, 100);

    // Negative pointer (moved outside top-left)
    const negative = getCanonicalCoordinates({ clientX: 0, clientY: 0 }, canvas);
    expect(negative).toEqual({ x: 0, y: 0 });

    // Way beyond bottom-right
    const excessive = getCanonicalCoordinates({ clientX: 5000, clientY: 5000 }, canvas);
    expect(excessive).toEqual({ x: 1199, y: 899 });
  });

  it("computes exact integer midpoints for quadratic Bézier curve smoothing", () => {
    const p1 = { x: 100, y: 200 };
    const p2 = { x: 300, y: 400 };
    expect(getMidPoint(p1, p2)).toEqual({ x: 200, y: 300 });

    const odd1 = { x: 1, y: 1 };
    const odd2 = { x: 4, y: 4 };
    expect(getMidPoint(odd1, odd2)).toEqual({ x: 3, y: 3 }); // Math.round(2.5) -> 3
  });

  it("renders a continuous stroke segment from p0 to p1 with zero gaps", () => {
    const mockCtx = {
      strokeStyle: "",
      lineWidth: 0,
      lineCap: "",
      lineJoin: "",
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    const p0 = { x: 100, y: 150 };
    const p1 = { x: 120, y: 180 };

    renderStrokeSegment(mockCtx, p0, p1, "#06B6D4", 4);

    expect(mockCtx.strokeStyle).toBe("#06B6D4");
    expect(mockCtx.lineWidth).toBe(4);
    expect(mockCtx.lineCap).toBe("round");
    expect(mockCtx.lineJoin).toBe("round");
    expect(mockCtx.beginPath).toHaveBeenCalledOnce();
    expect(mockCtx.moveTo).toHaveBeenCalledWith(100, 150);
    expect(mockCtx.lineTo).toHaveBeenCalledWith(120, 180);
    expect(mockCtx.stroke).toHaveBeenCalledOnce();
  });
});
