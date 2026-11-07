"use client";

import React, { useRef, useEffect, useCallback } from "react";
import {
  CANONICAL_WIDTH,
  CANONICAL_HEIGHT,
  CanonicalPoint,
  getCanonicalCoordinates,
  renderStrokeSegment,
  renderPolylineStroke,
} from "./canonical-coordinates";
import { scanlineFloodFill, parseCssColor } from "./scanline-fill";
import { CanvasTool } from "./CanvasToolbar";
import { CanvasAction, StrokeBatch, FillAction } from "@/server/types";

interface DrawingCanvasProps {
  tool: CanvasTool;
  color: string;
  size: number;
  readOnly?: boolean;
  actionsHistory?: CanvasAction[];
  onStrokeBatch?: (batch: StrokeBatch) => void;
  onFill?: (fill: FillAction) => void;
  onClear?: () => void;
  onUndo?: () => void;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  tool,
  color,
  size,
  readOnly = false,
  actionsHistory = [],
  onStrokeBatch,
  onFill,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const lastPointRef = useRef<CanonicalPoint | null>(null);
  const strokeBufferRef = useRef<CanonicalPoint[]>([]);
  const batchTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize canvas with solid white backing store
  const initCanvas = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, CANONICAL_WIDTH, CANONICAL_HEIGHT);
  }, []);

  // Full re-render of canvas from action history
  const redrawFromHistory = useCallback(
    (actions: CanvasAction[]) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      initCanvas(ctx);

      for (const action of actions) {
        if (action.type === "clear") {
          initCanvas(ctx);
        } else if (action.type === "stroke") {
          renderPolylineStroke(ctx, action.points, action.color, action.size);
        } else if (action.type === "fill") {
          const fillColorRgba = parseCssColor(action.color);
          scanlineFloodFill(ctx, {
            x: action.x,
            y: action.y,
            fillColorRgba,
            tolerance: 32,
          });
        }
      }
    },
    [initCanvas]
  );

  // Replay actions when history changes (e.g. from network or undo)
  useEffect(() => {
    redrawFromHistory(actionsHistory);
  }, [actionsHistory, redrawFromHistory]);

  // Flush accumulated points in buffer via onStrokeBatch (every 25ms / on pointer up)
  const flushBatch = useCallback(() => {
    if (strokeBufferRef.current.length < 2) {
      if (strokeBufferRef.current.length === 1 && onStrokeBatch) {
        const effectiveColor = tool === "eraser" ? "#FFFFFF" : color;
        onStrokeBatch({
          points: [strokeBufferRef.current[0]],
          color: effectiveColor,
          size,
        });
        strokeBufferRef.current = [strokeBufferRef.current[0]];
      }
      return;
    }

    if (onStrokeBatch) {
      const effectiveColor = tool === "eraser" ? "#FFFFFF" : color;
      onStrokeBatch({
        points: [...strokeBufferRef.current],
        color: effectiveColor,
        size,
      });
      // Retain the last point as the start of the next batch for continuous segment chaining
      const last = strokeBufferRef.current[strokeBufferRef.current.length - 1];
      strokeBufferRef.current = [last];
    }
  }, [color, size, tool, onStrokeBatch]);

  // Pointer Down handler
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Capture pointer to receive move/up events even if pointer leaves canvas bounds
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignored if unsupported in headless
    }

    const point = getCanonicalCoordinates(e, canvas);
    if (!point) return;

    if (tool === "fill") {
      // Paint bucket flood fill
      const effectiveColor = color;
      const fillColorRgba = parseCssColor(effectiveColor);
      scanlineFloodFill(ctx, {
        x: point.x,
        y: point.y,
        fillColorRgba,
        tolerance: 32,
      });

      if (onFill) {
        onFill({
          x: point.x,
          y: point.y,
          color: effectiveColor,
        });
      }
      return;
    }

    // Brush or Eraser
    isDrawingRef.current = true;
    lastPointRef.current = point;
    strokeBufferRef.current = [point];

    // Immediate local rendering of single dot
    const effectiveColor = tool === "eraser" ? "#FFFFFF" : color;
    renderPolylineStroke(ctx, [point], effectiveColor, size);

    // Start 25ms micro-batch dispatch interval (<= 40 batches/sec)
    if (!batchTimerRef.current) {
      batchTimerRef.current = setInterval(flushBatch, 25);
    }
  };

  // Pointer Move handler
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (readOnly || !isDrawingRef.current || !lastPointRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const point = getCanonicalCoordinates(e, canvas);
    if (!point) return;

    // Render smooth segment locally immediately for zero perceived latency
    const effectiveColor = tool === "eraser" ? "#FFFFFF" : color;
    renderStrokeSegment(ctx, lastPointRef.current, point, effectiveColor, size);

    lastPointRef.current = point;
    strokeBufferRef.current.push(point);
  };

  // Pointer Up / Cancel handler
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (readOnly) return;

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignored
    }

    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      if (batchTimerRef.current) {
        clearInterval(batchTimerRef.current);
        batchTimerRef.current = null;
      }
      flushBatch();
      strokeBufferRef.current = [];
      lastPointRef.current = null;
    }
  };

  // Cleanup batch interval on unmount
  useEffect(() => {
    return () => {
      if (batchTimerRef.current) {
        clearInterval(batchTimerRef.current);
        batchTimerRef.current = null;
      }
    };
  }, []);

  return (
    <div
      className="canvas-viewport-container relative select-none rounded-xl overflow-hidden shadow-2xl border-2 border-slate-700 bg-white"
      style={{
        maxWidth: "calc(100vh * 4 / 3)",
        maxHeight: "100%",
        aspectRatio: "4 / 3",
        width: "100%",
        margin: "0 auto",
        touchAction: "none",
      }}
    >
      <canvas
        ref={canvasRef}
        width={CANONICAL_WIDTH}
        height={CANONICAL_HEIGHT}
        className={`w-full h-full block ${
          readOnly
            ? "cursor-default"
            : tool === "fill"
            ? "cursor-crosshair"
            : "cursor-crosshair"
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
    </div>
  );
};
