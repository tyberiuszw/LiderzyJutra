"use client";

import React, { useEffect } from "react";
import { ThisOrThatRoomState, Player } from "@/server/types";
import { ChameleonMascot } from "@/components/mascot/ChameleonMascot";
import { Split, ArrowRight, Award, Zap } from "lucide-react";

interface ThisOrThatGameProps {
  state: ThisOrThatRoomState;
  players: Record<string, Player>;
  currentUserId: string;
  isHost: boolean;
  onVote: (choice: "A" | "B") => void;
  onNextDilemma: () => void;
  onRestart: () => void;
}

export function ThisOrThatGame({
  state,
  players,
  currentUserId,
  isHost,
  onVote,
  onNextDilemma,
  onRestart,
}: ThisOrThatGameProps) {
  const myVote = state.votes[currentUserId];
  const isVoting = state.phase === "VOTING";
  const isResults = state.phase === "RESULTS";

  // Keyboard shortcut listener for 1 (A) or 2 (B)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVoting) return;
      if (e.key === "1") onVote("A");
      if (e.key === "2") onVote("B");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isVoting, onVote]);

  const dilemma = state.currentDilemma;
  const stats = state.stats || {
    countA: 0,
    countB: 0,
    percentA: 50,
    percentB: 50,
  };

  const votersA = Object.keys(state.votes).filter((id) => state.votes[id] === "A");
  const votersB = Object.keys(state.votes).filter((id) => state.votes[id] === "B");

  return (
    <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
      {/* Header bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <Split className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-950 px-2 py-0.5 rounded-full border border-amber-800">
                Dylemat {state.dilemmaIndex} z {state.totalDilemmas}
              </span>
              {dilemma?.category && (
                <span className="text-xs text-slate-400">
                  Kategoria: <strong className="text-white capitalize">{dilemma.category}</strong>
                </span>
              )}
            </div>
            <h2 className="text-base font-bold text-white mt-0.5">
              To czy Tamto?
            </h2>
          </div>
        </div>

        {/* Voting Countdown Timer */}
        {isVoting && (
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3.5 py-1.5 rounded-xl">
            <span className="text-xs text-slate-400">Czas:</span>
            <span
              className={`font-mono font-black text-lg ${
                state.votingTimeRemaining <= 3
                  ? "text-rose-400 animate-pulse"
                  : "text-amber-400"
              }`}
            >
              {state.votingTimeRemaining}s
            </span>
          </div>
        )}
      </div>

      {/* Outlier Alert Banner ("Jedyny Wybraniec") */}
      {isResults && state.outliers && state.outliers.length > 0 && (
        <div className="p-4 bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/40 rounded-2xl flex items-center gap-3 shadow-lg">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center shrink-0">
            <Zap className="w-6 h-6 text-amber-400 animate-bounce" />
          </div>
          <div>
            <span className="text-[11px] font-black uppercase text-amber-400 tracking-wider block">
              ⭐ JEDYNY WYBRANIEC (+50 PKT BONUSU) ⭐
            </span>
            <p className="text-xs text-slate-200 mt-0.5">
              {state.outliers.map((o) => o.playerName).join(", ")} jako jedyna osoba postawiła na swój wybór przeciwko reszcie drużyny!
            </p>
          </div>
        </div>
      )}

      {/* Main Dilemma Cards */}
      {dilemma && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* OPTION A */}
          <div
            onClick={() => isVoting && onVote("A")}
            className={`p-6 rounded-2xl border transition-all duration-300 flex flex-col justify-between min-h-[220px] ${
              isVoting ? "cursor-pointer active:scale-98" : ""
            } ${
              myVote === "A"
                ? "bg-cyan-950/40 border-cyan-400 ring-2 ring-cyan-400 shadow-xl shadow-cyan-500/20"
                : "bg-slate-900 border-slate-800 hover:border-cyan-500/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded-full border border-cyan-800">
                Opcja A (Klawisz 1)
              </span>
              {myVote === "A" && (
                <span className="text-xs font-bold text-cyan-300 bg-cyan-500/20 px-2.5 py-0.5 rounded-full border border-cyan-500/40">
                  Twój wybór
                </span>
              )}
            </div>

            <h3 className="text-xl font-black text-white my-4 leading-snug">
              {dilemma.optionA}
            </h3>

            {/* In results phase: percentage & voters avatars */}
            {isResults ? (
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Głosów: {stats.countA}</span>
                  <span className="font-mono font-black text-cyan-400 text-lg">
                    {stats.percentA}%
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
                  {votersA.map((id) => (
                    <div
                      key={id}
                      className="flex items-center gap-1 bg-slate-800/80 border border-slate-700 px-2 py-1 rounded-full text-[10px] text-white"
                      title={players[id]?.name}
                    >
                      <div className="w-4 h-4 rounded-full overflow-hidden shrink-0">
                        <ChameleonMascot state="idle" size={16} colors={players[id]?.chameleonColors} />
                      </div>
                      <span className="truncate max-w-[80px]">{players[id]?.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-slate-500 italic">
                Kliknij lub wciśnij 1, aby wybrać
              </div>
            )}
          </div>

          {/* OPTION B */}
          <div
            onClick={() => isVoting && onVote("B")}
            className={`p-6 rounded-2xl border transition-all duration-300 flex flex-col justify-between min-h-[220px] ${
              isVoting ? "cursor-pointer active:scale-98" : ""
            } ${
              myVote === "B"
                ? "bg-indigo-950/40 border-indigo-400 ring-2 ring-indigo-400 shadow-xl shadow-indigo-500/20"
                : "bg-slate-900 border-slate-800 hover:border-indigo-500/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded-full border border-indigo-800">
                Opcja B (Klawisz 2)
              </span>
              {myVote === "B" && (
                <span className="text-xs font-bold text-indigo-300 bg-indigo-500/20 px-2.5 py-0.5 rounded-full border border-indigo-500/40">
                  Twój wybór
                </span>
              )}
            </div>

            <h3 className="text-xl font-black text-white my-4 leading-snug">
              {dilemma.optionB}
            </h3>

            {/* In results phase: percentage & voters avatars */}
            {isResults ? (
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Głosów: {stats.countB}</span>
                  <span className="font-mono font-black text-indigo-400 text-lg">
                    {stats.percentB}%
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
                  {votersB.map((id) => (
                    <div
                      key={id}
                      className="flex items-center gap-1 bg-slate-800/80 border border-slate-700 px-2 py-1 rounded-full text-[10px] text-white"
                      title={players[id]?.name}
                    >
                      <div className="w-4 h-4 rounded-full overflow-hidden shrink-0">
                        <ChameleonMascot state="idle" size={16} colors={players[id]?.chameleonColors} />
                      </div>
                      <span className="truncate max-w-[80px]">{players[id]?.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-slate-500 italic">
                Kliknij lub wciśnij 2, aby wybrać
              </div>
            )}
          </div>
        </div>
      )}

      {/* Animated Split Bar in Results Phase */}
      {isResults && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-cyan-400">Opcja A: {stats.percentA}%</span>
            <span className="text-slate-400">Rozkład głosów zespołu</span>
            <span className="text-indigo-400">Opcja B: {stats.percentB}%</span>
          </div>

          <div className="w-full h-4 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
            <div
              style={{ width: `${stats.percentA}%` }}
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-1000 ease-out"
            />
            <div
              style={{ width: `${stats.percentB}%` }}
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000 ease-out"
            />
          </div>

          {/* Host advance button */}
          {isHost && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={onNextDilemma}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-98"
              >
                <span>Następny dylemat</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* GAME OVER */}
      {state.phase === "GAME_OVER" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <Award className="w-10 h-10 text-amber-400" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white">Wszystkie dylematy rozstrzygnięte!</h3>
            <p className="text-xs text-slate-400 mt-1">
              Poznaliście preferencje zespołu. Czas na kolejną aktywność!
            </p>
          </div>

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
