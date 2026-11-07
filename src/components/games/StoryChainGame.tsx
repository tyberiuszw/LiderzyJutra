"use client";

import React, { useState } from "react";
import { StoryChainRoomState, Player } from "@/server/types";
import { ChameleonMascot } from "@/components/mascot/ChameleonMascot";
import {
  BookOpen,
  Send,
  Zap,
  Download,
  Copy,
  Check,
  FastForward,
  Settings2,
  Sparkles,
} from "lucide-react";

interface StoryChainGameProps {
  state: StoryChainRoomState;
  players: Record<string, Player>;
  currentUserId: string;
  isHost: boolean;
  onSubmitSegment: (text: string) => void;
  onPass: () => void;
  onSetMode: (mode: "SENTENCE" | "WORD") => void;
  onRestart: () => void;
}

export function StoryChainGame({
  state,
  players,
  currentUserId,
  isHost,
  onSubmitSegment,
  onPass,
  onSetMode,
  onRestart,
}: StoryChainGameProps) {
  const [inputText, setInputText] = useState("");
  const [copied, setCopied] = useState(false);

  const isMyTurn = state.currentTurnPlayerId === currentUserId;
  const currentWriter = state.currentTurnPlayerId ? players[state.currentTurnPlayerId] : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSubmitSegment(inputText.trim());
    setInputText("");
  };

  const handleDownloadMarkdown = () => {
    const md = `# Wspólna Historia — Liderzy Jutra\n\n> ${state.starter}\n\n---\n\n` +
      state.segments.map((s) => s.isWildcard ? `\n⚡ **${s.text}**\n\n` : `*${s.authorName}*: ${s.text}\n\n`).join("");
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `wspolna-historia-${state.roomCode}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadText = () => {
    const txt = state.fullStory;
    const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `wspolna-historia-${state.roomCode}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(state.fullStory);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
      {/* Header bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded-full border border-indigo-800">
                Tura {state.turnIndex}
              </span>
              <span className="text-xs text-slate-400">
                Tryb: <strong className="text-white">{state.mode === "SENTENCE" ? "Pełne Zdanie (20s)" : "Jedno Słowo (6s)"}</strong>
              </span>
            </div>
            <h2 className="text-base font-bold text-white mt-0.5">
              Wspólna Historia
            </h2>
          </div>
        </div>

        {/* Turn timer */}
        {state.phase === "TURN_ACTIVE" && (
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3.5 py-1.5 rounded-xl">
            <span className="text-xs text-slate-400">Czas tury:</span>
            <span
              className={`font-mono font-black text-lg ${
                state.turnTimeRemaining <= 3 ? "text-rose-400 animate-pulse" : "text-indigo-400"
              }`}
            >
              {state.turnTimeRemaining}s
            </span>
          </div>
        )}
      </div>

      {/* Host Mode Switcher */}
      {isHost && state.phase !== "FINALE_REVEAL" && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Settings2 className="w-3.5 h-3.5 text-indigo-400" />
            Zmień tryb pisania:
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSetMode("SENTENCE")}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                state.mode === "SENTENCE"
                  ? "bg-indigo-500 text-slate-950"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              Zdania (20s)
            </button>
            <button
              type="button"
              onClick={() => onSetMode("WORD")}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                state.mode === "WORD"
                  ? "bg-indigo-500 text-slate-950"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              Słowo po słowie (6s)
            </button>
          </div>
        </div>
      )}

      {/* Wildcard Alert Popup Banner */}
      {state.phase === "WILDCARD_ALERT" && state.activeWildcard && (
        <div className="p-4 bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-amber-500/20 border-2 border-amber-400 rounded-2xl flex items-center gap-4 animate-pulse shadow-2xl">
          <div className="w-12 h-12 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-lg">
            <Zap className="w-7 h-7 animate-bounce" />
          </div>
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-amber-300 block">
              ⚡ NAGŁY ZWROT AKCJI! (+50 PKT BONUSU) ⚡
            </span>
            <p className="text-sm font-bold text-white mt-1 leading-snug">
              {state.activeWildcard}
            </p>
          </div>
        </div>
      )}

      {/* Story Feed Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        {/* Starter Quote */}
        <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs space-y-1">
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">
            Początek historii:
          </span>
          <p className="text-slate-300 italic text-sm leading-relaxed">
            &ldquo;{state.starter}&rdquo;
          </p>
        </div>

        {/* Segments Stream */}
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {state.segments.map((seg) => {
            const author = players[seg.authorId];
            if (seg.isWildcard) {
              return (
                <div
                  key={seg.id}
                  className="p-3 bg-amber-950/30 border border-amber-500/50 rounded-xl text-xs flex items-center gap-2.5 text-amber-300"
                >
                  <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="font-bold">{seg.text}</span>
                </div>
              );
            }
            return (
              <div
                key={seg.id}
                className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl flex items-start gap-3"
              >
                <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                  <ChameleonMascot state="idle" size={20} colors={author?.chameleonColors} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-slate-400 block">
                    {seg.authorName}
                  </span>
                  <p className="text-xs text-white mt-0.5 leading-relaxed">
                    {seg.text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Writer Input or Waiting Notice */}
      {state.phase === "TURN_ACTIVE" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
          {isMyTurn ? (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  Twoja kolej! Dopisz ciąg dalszy ({state.mode === "SENTENCE" ? "1 zdanie, max 150 znaków" : "1 słowo"}):
                </span>
                <button
                  type="button"
                  onClick={onPass}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 hover:underline"
                >
                  <FastForward className="w-3.5 h-3.5" />
                  Pasuj turę
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={state.mode === "SENTENCE" ? 150 : 25}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    state.mode === "SENTENCE"
                      ? "Napisz kolejne zdanie opowieści..."
                      : "Wpisz dokładnie 1 słowo..."
                  }
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-500/20 transition-all active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  Dodaj (+50 pkt)
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center gap-3 py-2 text-xs text-slate-400">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                <ChameleonMascot state="thinking" size={24} colors={currentWriter?.chameleonColors} />
              </div>
              <div>
                <span>Teraz pisze: <strong className="text-white">{currentWriter?.name || "Uczestnik"}</strong>...</span>
                <p className="text-[10px] text-slate-500">Czekaj na swoją kolej w kolejce drużyny.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FINALE REVEAL: Grand Complete Story & 1-Click Exports */}
      {state.phase === "FINALE_REVEAL" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
              ✨ Finał Opowieści ✨
            </span>
            <h3 className="text-2xl font-black text-white">
              Wasza Kompletna Drużynowa Historia!
            </h3>
          </div>

          <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 text-sm text-slate-200 leading-relaxed font-serif whitespace-pre-wrap max-h-96 overflow-y-auto">
            {state.fullStory}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleCopyText}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-2 border border-slate-700 transition-all"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied ? "Skopiowano!" : "Kopiuj tekst"}
            </button>

            <button
              type="button"
              onClick={handleDownloadMarkdown}
              className="px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-md transition-all"
            >
              <Download className="w-4 h-4" />
              Pobierz Markdown (.md)
            </button>

            <button
              type="button"
              onClick={handleDownloadText}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-2 border border-slate-700 transition-all"
            >
              <Download className="w-4 h-4" />
              Pobierz Tekst (.txt)
            </button>
          </div>

          {isHost && (
            <div className="text-center pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={onRestart}
                className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md"
              >
                Rozpocznij nową historię
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
