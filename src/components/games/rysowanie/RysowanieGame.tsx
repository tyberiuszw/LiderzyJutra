"use client";

import React, { useState } from "react";
import { Clock, HelpCircle, Palette } from "lucide-react";
import { RysowanieRoomState, CanvasAction, StrokeBatch, FillAction, ChatMessage, Player } from "@/server/types";
import { DrawingCanvas } from "../../canvas/DrawingCanvas";
import { CanvasToolbar, CanvasTool } from "../../canvas/CanvasToolbar";
import { RysowanieChat } from "./RysowanieChat";
import { RysowanieScoreboard } from "./RysowanieScoreboard";
import { RysowanieWordPicker } from "./RysowanieWordPicker";
import { RysowaniePodium } from "./RysowaniePodium";
import { ChameleonMascot } from "../../mascot/ChameleonMascot";

interface RysowanieGameProps {
  roomState: RysowanieRoomState;
  currentUserId: string;
  canvasActions: CanvasAction[];
  messages: ChatMessage[];
  wordOptions: string[];
  podium: { player: Player; rank: number; score: number }[] | null;
  onStrokeBatch: (batch: StrokeBatch) => void;
  onFill: (fill: FillAction) => void;
  onClear: () => void;
  onUndo: () => void;
  onSendMessage: (text: string) => void;
  onSelectWord: (word: string) => void;
  onRestartGame: () => void;
}

export const RysowanieGame: React.FC<RysowanieGameProps> = ({
  roomState,
  currentUserId,
  canvasActions,
  messages,
  wordOptions,
  podium,
  onStrokeBatch,
  onFill,
  onClear,
  onUndo,
  onSendMessage,
  onSelectWord,
  onRestartGame,
}) => {
  const [tool, setTool] = useState<CanvasTool>("brush");
  const [color, setColor] = useState<string>("#000000");
  const [size, setSize] = useState<number>(10);

  const isDrawer = roomState.currentDrawerId === currentUserId;
  const currentUser = roomState.players[currentUserId];
  const hasSolved = currentUser?.hasSolved || false;
  const isHost = roomState.hostId === currentUserId;

  const currentDrawer = roomState.currentDrawerId
    ? roomState.players[roomState.currentDrawerId]
    : null;

  const isUrgent =
    roomState.phase === "DRAWING" && roomState.drawTimeRemaining <= 10;

  return (
    <div className="flex flex-col h-screen max-h-screen bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* Top Header Bar */}
      <header className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-4 z-20">
        {/* Round Badge & Drawer Indicator */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 bg-slate-800 rounded-lg border border-slate-700 text-xs font-semibold">
            Runda {roomState.round} / {roomState.totalRounds}
          </div>
          {currentDrawer && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
              <Palette className="w-3.5 h-3.5 text-cyan-400" />
              <span>Rysuje:</span>
              <strong className="text-white font-semibold">{currentDrawer.name}</strong>
            </div>
          )}
        </div>

        {/* Word Display & Hints */}
        <div className="flex items-center gap-3">
          {roomState.phase === "DRAWING" && (
            <div className="text-center">
              {isDrawer ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-cyan-400 font-semibold uppercase tracking-wider">
                    Twoje Hasło:
                  </span>
                  <span className="text-lg font-black text-white tracking-widest bg-cyan-950/60 border border-cyan-500/50 px-3 py-0.5 rounded-lg">
                    {roomState.currentWord}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xl font-mono font-black text-cyan-300 tracking-widest bg-slate-800 px-4 py-0.5 rounded-lg border border-slate-700">
                    {roomState.hintPattern || "_ ".repeat(roomState.wordLength).trim()}
                  </span>
                  <span className="text-xs text-slate-400">
                    ({roomState.wordLength} liter)
                  </span>
                </div>
              )}
            </div>
          )}

          {roomState.phase === "WORD_SELECTION" && (
            <div className="text-xs font-semibold text-amber-400 flex items-center gap-1">
              <HelpCircle className="w-4 h-4 animate-spin" />
              {isDrawer ? "Wybierz hasło..." : "Rysownik wybiera hasło..."}
            </div>
          )}

          {roomState.phase === "TURN_INTERMISSION" && (
            <div className="text-center">
              <span className="text-xs text-slate-400 uppercase">Hasłem było: </span>
              <strong className="text-base font-black text-emerald-400 ml-1">
                {roomState.currentWord}
              </strong>
            </div>
          )}
        </div>

        {/* Timer Bar */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border font-mono font-bold text-sm ${
              isUrgent
                ? "bg-rose-950/80 border-rose-500 text-rose-300 animate-pulse"
                : "bg-slate-800 border-slate-700 text-slate-200"
            }`}
          >
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>
              {roomState.phase === "WORD_SELECTION"
                ? `${roomState.wordChoiceTimeRemaining}s`
                : `${roomState.drawTimeRemaining}s`}
            </span>
          </div>

          {/* Chameleon Mascot Reactive Icon */}
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden">
            <ChameleonMascot
              size={24}
              state={isUrgent ? "urgent" : isDrawer ? "drawing" : hasSolved ? "celebrate" : "idle"}
            />
          </div>
        </div>
      </header>

      {/* Main Grid: Scoreboard (left) + Canvas (center) + Chat (right) */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3 p-3 overflow-hidden">
        {/* Left: Players Scoreboard */}
        <div className="hidden md:flex md:col-span-3 lg:col-span-2 flex-col h-full overflow-hidden">
          <RysowanieScoreboard
            players={roomState.players}
            currentDrawerId={roomState.currentDrawerId}
            currentUserId={currentUserId}
          />
        </div>

        {/* Center: Canvas Area & Toolbar */}
        <div className="col-span-1 md:col-span-6 lg:col-span-7 flex flex-col items-center justify-between gap-2 h-full overflow-hidden">
          <div className="w-full flex-1 flex items-center justify-center relative min-h-0">
            <DrawingCanvas
              tool={tool}
              color={color}
              size={size}
              readOnly={!isDrawer || roomState.phase !== "DRAWING"}
              actionsHistory={canvasActions}
              onStrokeBatch={onStrokeBatch}
              onFill={onFill}
              onClear={onClear}
              onUndo={onUndo}
            />

            {/* Waiting overlay for guessers during word selection */}
            {roomState.phase === "WORD_SELECTION" && !isDrawer && (
              <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center gap-3 text-center p-4">
                <ChameleonMascot state="thinking" size={72} />
                <h3 className="text-lg font-bold text-white">
                  {currentDrawer?.name || "Rysownik"} wybiera hasło...
                </h3>
                <p className="text-xs text-slate-400">
                  Przygotuj się do zgadywania! ({roomState.wordChoiceTimeRemaining}s)
                </p>
              </div>
            )}

            {/* Turn Intermission Banner */}
            {roomState.phase === "TURN_INTERMISSION" && (
              <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center gap-2 text-center p-4">
                <ChameleonMascot state="celebrate" size={72} />
                <h3 className="text-xl font-black text-white">Koniec Tury!</h3>
                <p className="text-sm text-slate-300">
                  Hasło to: <strong className="text-cyan-400">{roomState.currentWord}</strong>
                </p>
                <span className="text-xs text-slate-400 mt-2">Następna tura za chwilę...</span>
              </div>
            )}
          </div>

          {/* Bottom Toolbar (enabled for drawer only) */}
          <div className="w-full max-w-2xl">
            <CanvasToolbar
              tool={tool}
              color={color}
              size={size}
              disabled={!isDrawer || roomState.phase !== "DRAWING"}
              onToolChange={setTool}
              onColorChange={setColor}
              onSizeChange={setSize}
              onUndo={onUndo}
              onClear={onClear}
            />
          </div>
        </div>

        {/* Right: Real-Time Chat & Guessing */}
        <div className="col-span-1 md:col-span-3 lg:col-span-3 flex flex-col h-full overflow-hidden">
          <RysowanieChat
            messages={messages}
            currentUserId={currentUserId}
            isDrawer={isDrawer}
            hasSolved={hasSolved}
            onSendMessage={onSendMessage}
            disabled={roomState.phase !== "DRAWING"}
          />
        </div>
      </div>

      {/* Word Picker Modal (unicast for active drawer) */}
      {roomState.phase === "WORD_SELECTION" && isDrawer && wordOptions.length > 0 && (
        <RysowanieWordPicker
          words={wordOptions}
          remainingSeconds={roomState.wordChoiceTimeRemaining}
          onSelectWord={onSelectWord}
        />
      )}

      {/* Podium Overlay */}
      {roomState.phase === "GAME_OVER" && podium && (
        <RysowaniePodium
          podium={podium}
          isHost={isHost}
          onRestart={onRestartGame}
        />
      )}
    </div>
  );
};
