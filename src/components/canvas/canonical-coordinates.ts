/**
 * Canonical 1200x900 Canvas Coordinates & Smoothing Engine (Contract 2)
 *
 * Guarantees cross-device coordinate uniformity regardless of viewport scaling,
 * high-DPI retina multipliers, or responsive layout aspect ratios.
 */

export interface CanonicalPoint {
  x: number;
  y: number;
}

export const CANONICAL_WIDTH = 1200;
export const CANONICAL_HEIGHT = 900;

/**
 * Maps a DOM pointer/mouse event's client coordinates into the canonical 1200x900 space.
 * Includes zero-dimension guard (hidden tabs, unmounted states) and strict clamping.
 */
export function getCanonicalCoordinates(
  e: { clientX: number; clientY: number },
  canvas: HTMLCanvasElement
): CanonicalPoint | null {
  const rect = canvas.getBoundingClientRect();

  // Zero-dimension guard: prevents division by zero if canvas is collapsed or unrendered
  if (!rect.width || !rect.height) {
    return null;
  }

  const rawX = (e.clientX - rect.left) * (CANONICAL_WIDTH / rect.width);
  const rawY = (e.clientY - rect.top) * (CANONICAL_HEIGHT / rect.height);

  // Strict clamping to [0..1199, 0..899] prevents out-of-bounds Uint32Array indexing
  const x = Math.max(0, Math.min(CANONICAL_WIDTH - 1, Math.round(rawX)));
  const y = Math.max(0, Math.min(CANONICAL_HEIGHT - 1, Math.round(rawY)));

  return { x, y };
}

/**
 * Computes mid-point between two points for quadratic Bézier curve smoothing.
 */
export function getMidPoint(p1: CanonicalPoint, p2: CanonicalPoint): CanonicalPoint {
  return {
    x: Math.round((p1.x + p2.x) / 2),
    y: Math.round((p1.y + p2.y) / 2),
  };
}

/**
 * Renders a continuous stroke segment between consecutive pointer points.
 * Connects p0 directly to p1 for real-time local pointer tracking with zero gaps.
 */
export function renderStrokeSegment(
  ctx: CanvasRenderingContext2D,
  p0: CanonicalPoint,
  p1: CanonicalPoint,
  color: string,
  size: number
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.stroke();
}

/**
 * Renders an entire polyline stroke with Bézier smoothing across consecutive points.
 */
export function renderPolylineStroke(
  ctx: CanvasRenderingContext2D,
  points: CanonicalPoint[],
  color: string,
  size: number
): void {
  if (points.length === 0) return;

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (points.length === 1) {
    // Single point: render filled circle dot
    ctx.beginPath();
    ctx.arc(points[0].x, points[0].y, size / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (points.length === 2) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    ctx.lineTo(points[1].x, points[1].y);
    ctx.stroke();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length - 1; i++) {
    const midX = (points[i].x + points[i + 1].x) / 2;
    const midY = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
  }

  const last = points[points.length - 1];
  const secondLast = points[points.length - 2];
  ctx.quadraticCurveTo(secondLast.x, secondLast.y, last.x, last.y);
  ctx.stroke();
}
