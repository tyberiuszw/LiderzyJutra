"use client";

import React, { useState, useRef, useEffect, MouseEvent } from "react";
import {
  CollaborativeBoardRoomState,
  StickyNote,
  BoardDrawingStroke,
} from "@/server/types";
import {
  StickyNote as StickyIcon,
  Pen,
  Eraser,
  Trash2,
  Tag,
  RotateCcw,
  MousePointer,
  Sparkles,
} from "lucide-react";

interface CollaborativeJamboardProps {
  state: CollaborativeBoardRoomState;
  currentUserId?: string;
  currentUserName?: string;
  isHost: boolean;
  onAddNote: (payload: { text: string; color?: string; x?: number; y?: number }) => void;
  onUpdateNote: (payload: { id: string; text?: string; color?: string; x?: number; y?: number }) => void;
  onDeleteNote: (id: string) => void;
  onAddPin: (payload: { title: string; tag: "poszlaka" | "alibi" | "fakt" | "hipoteza" | "podejrzany"; x?: number; y?: number }) => void;
  onDeletePin: (id: string) => void;
  onDrawStroke: (stroke: BoardDrawingStroke) => void;
  onClearBoard: () => void;
}

const NOTE_COLORS = [
  { name: "Żółty", hex: "#FEF08A" },
  { name: "Koralowy", hex: "#FDA4AF" },
  { name: "Limonkowy", hex: "#BEF264" },
  { name: "Błękitny", hex: "#7DD3FC" },
  { name: "Fioletowy", hex: "#D8B4FE" },
];

const PIN_TAGS: Array<{ tag: "poszlaka" | "alibi" | "fakt" | "hipoteza" | "podejrzany"; label: string; color: string }> = [
  { tag: "poszlaka", label: "Poszlaka", color: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
  { tag: "alibi", label: "Alibi", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
  { tag: "fakt", label: "Fakt", color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" },
  { tag: "hipoteza", label: "Hipoteza", color: "bg-purple-500/20 text-purple-300 border-purple-500/40" },
  { tag: "podejrzany", label: "Podejrzany", color: "bg-rose-500/20 text-rose-300 border-rose-500/40" },
];

export function CollaborativeJamboard({
  state,
  isHost,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onAddPin,
  onDeletePin,
  onDrawStroke,
  onClearBoard,
}: CollaborativeJamboardProps) {
  const [activeTool, setActiveTool] = useState<"select" | "pen" | "eraser">("select");
  const [selectedColor, setSelectedColor] = useState<string>(NOTE_COLORS[0].hex);
  const penColor = "#38BDF8";
  const penSize = 3;

  // Pin creation modal state
  const [showPinModal, setShowPinModal] = useState(false);
  const [newPinTitle, setNewPinTitle] = useState("");
  const [newPinTag, setNewPinTag] = useState<"poszlaka" | "alibi" | "fakt" | "hipoteza" | "podejrzany">("poszlaka");

  // Dragging state for sticky notes
  const [draggingNoteId, setDraggingNoteId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Drawing canvas state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const currentStrokePoints = useRef<{ x: number; y: number }[]>([]);

  // Redraw strokes whenever strokes change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    state.strokes.forEach((stroke) => {
      if (stroke.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    });
  }, [state.strokes]);

  // Handle Note Drag
  const handleNoteMouseDown = (e: MouseEvent, note: StickyNote) => {
    if (activeTool !== "select") return;
    setDraggingNoteId(note.id);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleBoardMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (draggingNoteId) {
      const boardRect = e.currentTarget.getBoundingClientRect();
      const newX = Math.max(10, Math.min(boardRect.width - 220, e.clientX - boardRect.left - dragOffset.x));
      const newY = Math.max(10, Math.min(boardRect.height - 200, e.clientY - boardRect.top - dragOffset.y));
      onUpdateNote({ id: draggingNoteId, x: Math.round(newX), y: Math.round(newY) });
    }
  };

  const handleBoardMouseUp = () => {
    setDraggingNoteId(null);
  };

  // Canvas Drawing Handlers
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool !== "pen" && activeTool !== "eraser") return;
    setIsDrawing(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    currentStrokePoints.current = [{ x, y }];
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    currentStrokePoints.current.push({ x, y });

    // Live local preview
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pts = currentStrokePoints.current;
    if (pts.length >= 2) {
      ctx.beginPath();
      ctx.strokeStyle = activeTool === "eraser" ? "#020617" : penColor;
      ctx.lineWidth = activeTool === "eraser" ? 20 : penSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      ctx.stroke();
    }
  };

  const handleCanvasMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStrokePoints.current.length >= 2) {
      onDrawStroke({
        id: `stroke_${Date.now()}_${Math.random()}`,
        points: currentStrokePoints.current,
        color: activeTool === "eraser" ? "#020617" : penColor,
        size: activeTool === "eraser" ? 20 : penSize,
      });
    }
    currentStrokePoints.current = [];
  };

  const handleCreatePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPinTitle.trim()) return;
    onAddPin({
      title: newPinTitle.trim(),
      tag: newPinTag,
    });
    setNewPinTitle("");
    setShowPinModal(false);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 select-none overflow-hidden relative min-h-[700px]">
      {/* Top Floating Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl px-4 py-2.5 shadow-2xl flex items-center gap-3">
        {/* Tool Selectors */}
        <div className="flex items-center gap-1 border-r border-slate-800 pr-3">
          <button
            type="button"
            onClick={() => setActiveTool("select")}
            title="Wskaźnik / Przesuwanie"
            className={`p-2 rounded-xl transition ${
              activeTool === "select"
                ? "bg-cyan-500 text-slate-950 font-bold shadow-md"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <MousePointer className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTool("pen")}
            title="Rysik"
            className={`p-2 rounded-xl transition ${
              activeTool === "pen"
                ? "bg-cyan-500 text-slate-950 font-bold shadow-md"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Pen className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTool("eraser")}
            title="Gumka"
            className={`p-2 rounded-xl transition ${
              activeTool === "eraser"
                ? "bg-cyan-500 text-slate-950 font-bold shadow-md"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Eraser className="w-4 h-4" />
          </button>
        </div>

        {/* Add Note with Color Palette */}
        <div className="flex items-center gap-2 border-r border-slate-800 pr-3">
          <div className="flex items-center gap-1">
            {NOTE_COLORS.map((c) => (
              <button
                key={c.hex}
                type="button"
                onClick={() => setSelectedColor(c.hex)}
                className={`w-5 h-5 rounded-full transition-transform ${
                  selectedColor === c.hex ? "scale-125 ring-2 ring-white shadow-md" : "hover:scale-110"
                }`}
                style={{ backgroundColor: c.hex }}
                title={c.name}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => onAddNote({ text: "Nowa notatka...", color: selectedColor })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition border border-slate-700"
          >
            <StickyIcon className="w-3.5 h-3.5 text-amber-400" />
            <span>Dodaj karteczkę</span>
          </button>
        </div>

        {/* Add Evidence Pin Button */}
        <button
          type="button"
          onClick={() => setShowPinModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition border border-slate-700"
        >
          <Tag className="w-3.5 h-3.5 text-rose-400" />
          <span>Dodaj poszlakę</span>
        </button>

        {/* Host Clear Board Action */}
        {isHost && (
          <button
            type="button"
            onClick={onClearBoard}
            title="Wyczyść całą tablicę"
            className="p-2 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 transition ml-1"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* MODAL: Add Clue Pin */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Tag className="w-4 h-4 text-cyan-400" />
              Przypnij poszlakę do tablicy
            </h3>

            <form onSubmit={handleCreatePin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Tytuł / Treść poszlaki:
                </label>
                <input
                  type="text"
                  required
                  value={newPinTitle}
                  onChange={(e) => setNewPinTitle(e.target.value)}
                  placeholder="Np. Odcisk buta przy oknie..."
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Kategoria / Etykieta:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PIN_TAGS.map((t) => (
                    <button
                      key={t.tag}
                      type="button"
                      onClick={() => setNewPinTag(t.tag)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition text-left ${
                        newPinTag === t.tag ? t.color + " ring-2 ring-white" : "border-slate-800 text-slate-400 hover:bg-slate-800"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
                >
                  Przypnij
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Board Workspace */}
      <div
        className="flex-1 w-full h-full relative overflow-hidden bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px]"
        onMouseMove={handleBoardMouseMove}
        onMouseUp={handleBoardMouseUp}
      >
        {/* Drawing Canvas Overlay */}
        <canvas
          ref={canvasRef}
          width={1920}
          height={1080}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          className={`absolute inset-0 w-full h-full ${
            activeTool === "pen"
              ? "cursor-crosshair z-20"
              : activeTool === "eraser"
              ? "cursor-cell z-20"
              : "pointer-events-none z-10"
          }`}
        />

        {/* Clue Pins on Board */}
        {state.pins.map((pin) => {
          const tagInfo = PIN_TAGS.find((t) => t.tag === pin.tag) || PIN_TAGS[0];
          return (
            <div
              key={pin.id}
              style={{ left: `${pin.x}px`, top: `${pin.y}px` }}
              className="absolute z-20 p-2.5 rounded-xl bg-slate-900/90 border border-slate-700 shadow-xl max-w-xs flex items-start gap-2.5 backdrop-blur-sm group hover:scale-105 transition-transform"
            >
              <div className="p-1 rounded-lg bg-slate-800 text-rose-400 shrink-0">
                <Tag className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded border ${tagInfo.color}`}>
                  {tagInfo.label}
                </span>
                <p className="text-xs font-semibold text-white mt-1 break-words">
                  {pin.title}
                </p>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Dodane przez: {pin.authorName}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onDeletePin(pin.id)}
                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-400 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}

        {/* Sticky Notes on Board */}
        {state.notes.map((note) => (
          <div
            key={note.id}
            onMouseDown={(e) => handleNoteMouseDown(e, note)}
            style={{
              left: `${note.x}px`,
              top: `${note.y}px`,
              zIndex: note.zIndex,
              backgroundColor: note.color,
            }}
            className={`absolute w-52 min-h-44 p-3 rounded-2xl shadow-xl flex flex-col justify-between text-slate-900 border border-black/10 transition-shadow ${
              activeTool === "select" ? "cursor-grab active:cursor-grabbing hover:shadow-2xl" : ""
            }`}
          >
            <div className="flex items-center justify-between pb-1 border-b border-black/10 mb-2">
              <span className="text-[10px] font-bold text-slate-800 truncate">
                ✍️ {note.authorName}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteNote(note.id);
                }}
                className="p-1 rounded-md text-slate-700 hover:text-rose-700 hover:bg-black/5 transition"
                title="Usuń notatkę"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <textarea
              value={note.text}
              onChange={(e) => onUpdateNote({ id: note.id, text: e.target.value })}
              placeholder="Wpisz treść notatki..."
              className="w-full flex-1 bg-transparent resize-none border-none outline-none text-xs font-medium text-slate-900 leading-relaxed placeholder-slate-700/60"
            />

            <div className="pt-2 flex items-center justify-between border-t border-black/10 text-[9px] text-slate-700 font-mono">
              <span>Liderzy Jutra</span>
              <div className="flex items-center gap-1">
                {NOTE_COLORS.map((col) => (
                  <button
                    key={col.hex}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateNote({ id: note.id, color: col.hex });
                    }}
                    className={`w-2.5 h-2.5 rounded-full ${note.color === col.hex ? "ring-1 ring-black" : ""}`}
                    style={{ backgroundColor: col.hex }}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Empty Canvas Friendly Hint */}
        {state.notes.length === 0 && state.pins.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-slate-600 space-y-2">
              <Sparkles className="w-10 h-10 mx-auto text-slate-700" />
              <p className="text-sm font-bold text-slate-400">Tablica jest pusta</p>
              <p className="text-xs max-w-sm">
                Kliknij &quot;Dodaj karteczkę&quot; na pasku narzędzi lub użyj rysika, aby wspólnie burzyć mózgi i planować strategię!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
