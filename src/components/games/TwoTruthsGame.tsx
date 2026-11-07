"use client";

import React, { useState } from "react";
import {
  TwoTruthsRoomState,
  Player,
} from "@/server/types";
import { ChameleonMascot } from "@/components/mascot/ChameleonMascot";
import {
  Check,
  X,
  Sparkles,
  HelpCircle,
  Eye,
  Award,
  ArrowRight,
} from "lucide-react";

interface TwoTruthsGameProps {
  state: TwoTruthsRoomState;
  players: Record<string, Player>;
  currentUserId: string;
  isHost: boolean;
  onSubmitStatements: (statements: [string, string, string], lieIndex: number) => void;
  onVote: (statementIndex: number) => void;
  onReveal: () => void;
  onNextTurn: () => void;
  onRestart: () => void;
}

export function TwoTruthsGame({
  state,
  players,
  currentUserId,
  isHost,
  onSubmitStatements,
  onVote,
  onReveal,
  onNextTurn,
  onRestart,
}: TwoTruthsGameProps) {
  const [statement0, setStatement0] = useState("");
  const [statement1, setStatement1] = useState("");
  const [statement2, setStatement2] = useState("");
  const [selectedLieIdx, setSelectedLieIdx] = useState<number>(0);
  const [showInspiration, setShowInspiration] = useState(false);

  const activePlayer = state.activePlayerId ? players[state.activePlayerId] : null;
  const isMeActive = state.activePlayerId === currentUserId;
  const myVote = state.votes[currentUserId];
  const hasVoted = myVote !== undefined;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statement0.trim() || !statement1.trim() || !statement2.trim()) return;
    onSubmitStatements([statement0, statement1, statement2], selectedLieIdx);
  };

  return (
    <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
      {/* Top Banner / Status */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <ChameleonMascot
              state={isMeActive ? "celebrate" : "thinking"}
              size={36}
              colors={activePlayer?.chameleonColors}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800">
                Runda {state.turnNumber} z {state.totalTurns}
              </span>
              <span className="text-xs text-slate-400">
                Na scenie: <strong className="text-white">{activePlayer?.name || "Gracz"}</strong>
              </span>
            </div>
            <h2 className="text-base font-bold text-white mt-0.5">
              Dwie Prawdy i Kłamstwo
            </h2>
          </div>
        </div>

        {/* Voting Countdown Timer */}
        {state.phase === "VOTING" && (
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3.5 py-1.5 rounded-xl">
            <span className="text-xs text-slate-400">Czas:</span>
            <span
              className={`font-mono font-black text-lg ${
                state.votingTimeRemaining <= 5
                  ? "text-rose-400 animate-pulse"
                  : "text-emerald-400"
              }`}
            >
              {state.votingTimeRemaining}s
            </span>
          </div>
        )}
      </div>

      {/* PHASE 1: SUBMISSION */}
      {state.phase === "SUBMISSION" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          {isMeActive ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-400" />
                    Twoja kolej! Wprowadź 2 prawdy i 1 kłamstwo
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Wybierz, które ze zdań jest Twoim sekretnym kłamstwem. Inni będą próbowali je odgadnąć!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowInspiration(!showInspiration)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 bg-cyan-950/60 border border-cyan-800 px-3 py-1.5 rounded-lg"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  {showInspiration ? "Ukryj podpowiedzi" : "Inspiracje tematów"}
                </button>
              </div>

              {/* Inspiration theme box */}
              {showInspiration && (
                <div className="p-3.5 bg-cyan-950/30 border border-cyan-800/60 rounded-xl text-xs space-y-2">
                  <span className="font-bold text-cyan-300 block">
                    Sugerowany motyw rundy: {state.currentTheme}
                  </span>
                  <p className="text-slate-300 text-[11px]">
                    Możesz nawiązać do nietypowych hobby, śmiesznych wpadek w szkole, szalonych marzeń lub niezwykłych podróży z dzieciństwa!
                  </p>
                </div>
              )}

              {/* 3 statement inputs with radio lie selector */}
              <div className="space-y-4">
                {[
                  { val: statement0, setVal: setStatement0, idx: 0, label: "Zdanie A" },
                  { val: statement1, setVal: setStatement1, idx: 1, label: "Zdanie B" },
                  { val: statement2, setVal: setStatement2, idx: 2, label: "Zdanie C" },
                ].map((item) => (
                  <div
                    key={item.idx}
                    className={`p-4 rounded-xl border transition-all ${
                      selectedLieIdx === item.idx
                        ? "bg-rose-950/20 border-rose-500/60 ring-1 ring-rose-500/40"
                        : "bg-slate-950/60 border-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-slate-300">
                        {item.label}
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs">
                        <input
                          type="radio"
                          name="lieIndex"
                          checked={selectedLieIdx === item.idx}
                          onChange={() => setSelectedLieIdx(item.idx)}
                          className="accent-rose-500"
                        />
                        <span
                          className={`font-bold ${
                            selectedLieIdx === item.idx
                              ? "text-rose-400"
                              : "text-slate-500 hover:text-slate-400"
                          }`}
                        >
                          To jest KŁAMSTWO
                        </span>
                      </label>
                    </div>
                    <textarea
                      required
                      maxLength={180}
                      rows={2}
                      value={item.val}
                      onChange={(e) => item.setVal(e.target.value)}
                      placeholder={`Napisz ${item.label.toLowerCase()}...`}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                    />
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={!statement0.trim() || !statement1.trim() || !statement2.trim()}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all active:scale-98"
              >
                Wyślij karty na scenę i rozpocznij głosowanie!
              </button>
            </form>
          ) : (
            <div className="py-12 text-center space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                <ChameleonMascot state="thinking" size={60} colors={activePlayer?.chameleonColors} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {activePlayer?.name || "Gracz"} układa swoje zdania...
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Przygotuj się! Za chwilę pojawią się 3 karty, a Twoim zadaniem będzie wskazanie kłamstwa.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PHASE 2 & 3: VOTING & REVEAL */}
      {(state.phase === "VOTING" || state.phase === "REVEAL") && state.statements && (
        <div className="space-y-6">
          <div className="text-center space-y-1">
            <h3 className="text-base font-bold text-white">
              {state.phase === "VOTING"
                ? isMeActive
                  ? "Twoje karty są na scenie! Gracze próbują odgadnąć kłamstwo..."
                  : "Wybierz kartę, która według Ciebie jest KŁAMSTWEM:"
                : "Wynik rundy — Odkrycie kart!"}
            </h3>
            {state.phase === "VOTING" && !isMeActive && (
              <p className="text-xs text-slate-400">
                {hasVoted ? "Twój głos został zapisany. Czekamy na resztę drużyny..." : "Kliknij na jedno ze zdań, aby zagłosować."}
              </p>
            )}
          </div>

          {/* 3 Interactive Cards with 3D Flip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {state.statements.map((stmt, idx) => {
              const isLie = state.phase === "REVEAL" && state.lieIndex === idx;
              const isMyChoice = myVote === idx;

              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (state.phase === "VOTING" && !isMeActive) {
                      onVote(idx);
                    }
                  }}
                  className={`relative p-5 rounded-2xl border transition-all duration-500 cursor-pointer flex flex-col justify-between min-h-[160px] ${
                    state.phase === "REVEAL"
                      ? isLie
                        ? "bg-rose-950/40 border-rose-500 shadow-xl shadow-rose-500/20"
                        : "bg-emerald-950/40 border-emerald-500 shadow-xl shadow-emerald-500/10"
                      : isMyChoice
                      ? "bg-cyan-950/40 border-cyan-400 ring-2 ring-cyan-400"
                      : "bg-slate-900 border-slate-800 hover:border-slate-700"
                  } ${isMeActive && state.phase === "VOTING" ? "cursor-default" : ""}`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-mono font-bold text-slate-400">
                      Opcja {idx === 0 ? "A" : idx === 1 ? "B" : "C"}
                    </span>
                    {state.phase === "REVEAL" && (
                      <span
                        className={`text-xs font-black px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          isLie
                            ? "bg-rose-500 text-slate-950"
                            : "bg-emerald-500 text-slate-950"
                        }`}
                      >
                        {isLie ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                        {isLie ? "KŁAMSTWO" : "PRAWDA"}
                      </span>
                    )}
                    {state.phase === "VOTING" && isMyChoice && (
                      <span className="text-[10px] bg-cyan-500 text-slate-950 font-bold px-2 py-0.5 rounded-full">
                        Twój głos
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-medium text-white my-3 leading-relaxed">
                    {stmt}
                  </p>

                  {/* Voters count badge during reveal */}
                  {state.phase === "REVEAL" && (
                    <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                      <span>Głosów:</span>
                      <span className="font-mono font-bold text-white">
                        {Object.values(state.votes).filter((v) => v === idx).length}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Reveal & Scoring summary */}
          {state.phase === "REVEAL" && (
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4 text-center">
              <div className="flex items-center justify-center gap-2">
                <Award className="w-6 h-6 text-amber-400" />
                <h4 className="text-base font-bold text-white">Podsumowanie Rundy</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto text-xs">
                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                  <span className="text-slate-400 block">Bonus blefu mówcy:</span>
                  <span className="text-sm font-mono font-bold text-amber-400">
                    +{state.bluffScore} pkt
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    ({state.fooledCount} oszukańców)
                  </span>
                </div>
                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                  <span className="text-slate-400 block">Poprawne dedukcje (+100 pkt):</span>
                  <span className="text-sm font-mono font-bold text-emerald-400">
                    {state.correctVoters.length} graczy
                  </span>
                </div>
              </div>

              {isHost && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onNextTurn}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition-all"
                  >
                    <span>Następna runda</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Host Reveal Button if timer still running */}
          {state.phase === "VOTING" && isHost && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={onReveal}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 shadow-md transition-all"
              >
                <Eye className="w-4 h-4 text-cyan-400" />
                Odkryj karty teraz (zakończ głosowanie)
              </button>
            </div>
          )}
        </div>
      )}

      {/* PHASE 4: GAME OVER */}
      {state.phase === "GAME_OVER" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <Award className="w-10 h-10 text-amber-400" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white">Koniec Gry — Wyniki</h3>
            <p className="text-xs text-slate-400 mt-1">
              Wszyscy uczestnicy zaprezentowali swoje prawdy i kłamstwa!
            </p>
          </div>

          {state.winnerPodium && (
            <div className="max-w-md mx-auto space-y-2">
              {state.winnerPodium.map((item) => (
                <div
                  key={item.player.id}
                  className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-xs text-slate-400">
                      #{item.rank}
                    </span>
                    <span className="text-xs font-bold text-white">
                      {item.player.name}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-cyan-400">
                    {item.score} pkt
                  </span>
                </div>
              ))}
            </div>
          )}

          {isHost && (
            <button
              type="button"
              onClick={onRestart}
              className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm shadow-md"
            >
              Zagraj ponownie
            </button>
          )}
        </div>
      )}
    </div>
  );
}
