"use client";

import React from "react";
import { Paintbrush, PaintBucket, Eraser, RotateCcw, Trash2 } from "lucide-react";

export type CanvasTool = "brush" | "fill" | "eraser";

export const PALETTE_COLORS: string[][] = [
  // Row 1
  [
    "#FFFFFF",
    "#C1C1C1",
    "#EF130B",
    "#FF7100",
    "#FFE400",
    "#00CC00",
    "#00B2FF",
    "#231FD3",
    "#A300BA",
    "#D37CAA",
    "#A0522D",
    "#06B6D4", // Cyber Teal
    "#10B981", // Emerald
  ],
  // Row 2
  [
    "#000000",
    "#4C4C4C",
    "#740B07",
    "#C23800",
    "#E8A200",
    "#005510",
    "#00569E",
    "#0E0865",
    "#550069",
    "#A75574",
    "#63300D",
    "#4F46E5", // Indigo
    "#F59E0B", // Amber
  ],
];

export const BRUSH_SIZES = [4, 10, 20, 40];

interface CanvasToolbarProps {
  tool: CanvasTool;
  color: string;
  size: number;
  disabled?: boolean;
  onToolChange: (tool: CanvasTool) => void;
  onColorChange: (color: string) => void;
  onSizeChange: (size: number) => void;
  onUndo: () => void;
  onClear: () => void;
}

export const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  tool,
  color,
  size,
  disabled = false,
  onToolChange,
  onColorChange,
  onSizeChange,
  onUndo,
  onClear,
}) => {
  return (
    <div
      className={`w-full bg-slate-900/90 backdrop-blur-md border border-slate-800 text-white rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-3 shadow-lg transition-opacity ${
        disabled ? "opacity-50 pointer-events-none" : ""
      }`}
    >
      {/* Tool Selector */}
      <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-lg border border-slate-700/50">
        <button
          type="button"
          onClick={() => onToolChange("brush")}
          title="Pędzel (Brush)"
          className={`p-2 rounded-md transition-colors ${
            tool === "brush" ? "bg-cyan-500 text-slate-950 font-bold shadow" : "text-slate-300 hover:bg-slate-700/70"
          }`}
        >
          <Paintbrush className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => onToolChange("fill")}
          title="Wypełnienie (Bucket Fill)"
          className={`p-2 rounded-md transition-colors ${
            tool === "fill" ? "bg-cyan-500 text-slate-950 font-bold shadow" : "text-slate-300 hover:bg-slate-700/70"
          }`}
        >
          <PaintBucket className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => onToolChange("eraser")}
          title="Gumka (Eraser)"
          className={`p-2 rounded-md transition-colors ${
            tool === "eraser" ? "bg-cyan-500 text-slate-950 font-bold shadow" : "text-slate-300 hover:bg-slate-700/70"
          }`}
        >
          <Eraser className="w-5 h-5" />
        </button>
      </div>

      {/* Brush Size Selector */}
      <div className="flex items-center gap-2 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/50">
        {BRUSH_SIZES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSizeChange(s)}
            title={`Rozmiar: ${s}px`}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              size === s ? "ring-2 ring-cyan-400 bg-slate-700" : "hover:bg-slate-700/50"
            }`}
          >
            <span
              className="rounded-full bg-white block"
              style={{
                width: `${Math.max(4, Math.min(22, s / 1.8))}px`,
                height: `${Math.max(4, Math.min(22, s / 1.8))}px`,
              }}
            />
          </button>
        ))}
      </div>

      {/* 26-Color Palette Grid */}
      <div className="flex flex-col gap-1 bg-slate-800/80 p-1.5 rounded-lg border border-slate-700/50">
        {PALETTE_COLORS.map((row, rowIdx) => (
          <div key={rowIdx} className="flex items-center gap-1">
            {row.map((c) => {
              const isSelected = color.toUpperCase() === c.toUpperCase() && tool !== "eraser";
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    onColorChange(c);
                    if (tool === "eraser") onToolChange("brush");
                  }}
                  title={c}
                  className={`w-5 h-5 rounded-sm transition-transform border border-slate-700/70 ${
                    isSelected ? "scale-125 ring-2 ring-cyan-400 z-10 shadow-md" : "hover:scale-110"
                  }`}
                  style={{ backgroundColor: c }}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Undo & Clear Action Buttons */}
      <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-lg border border-slate-700/50">
        <button
          type="button"
          onClick={onUndo}
          title="Cofnij (Undo)"
          className="p-2 rounded-md text-slate-300 hover:bg-slate-700/70 hover:text-white transition-colors"
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={onClear}
          title="Wyczyść całe płótno (Clear)"
          className="p-2 rounded-md text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 transition-colors"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
