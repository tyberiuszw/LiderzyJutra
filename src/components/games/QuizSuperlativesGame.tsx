"use client";

import React from "react";
import { QuizSuperlativesRoomState, Player } from "@/server/types";
import { ChameleonMascot } from "@/components/mascot/ChameleonMascot";
import {
  Trophy,
  Award,
  Medal,
  ArrowRight,
  BookMarked,
  Sparkles,
} from "lucide-react";

interface QuizSuperlativesGameProps {
  state: QuizSuperlativesRoomState;
  players: Record<string, Player>;
  currentUserId: string;
  isHost: boolean;
  onVote: (targetPlayerId: string) => void;
  onNextPrompt: () => void;
  onRestart: () => void;
}

export function QuizSuperlativesGame({
  state,
  players,
  currentUserId,
  isHost,
  onVote,
  onNextPrompt,
  onRestart,
}: QuizSuperlativesGameProps) {
  const myVote = state.votes[currentUserId];
  const isVoting = state.phase === "VOTING";
  const isCountdown = state.phase === "PODIUM_COUNTDOWN";
  const isHallOfFame = state.phase === "HALL_OF_FAME";

  const winners = state.podiumWinners || [];

  return (
    <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
      {/* Header bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-violet-400 bg-violet-950 px-2 py-0.5 rounded-full border border-violet-800">
                Pytanie {state.promptIndex} z {state.totalPrompts}
              </span>
              <span className="text-xs text-slate-400">
                Głosów: <strong className="text-white">{Object.keys(state.votes).length}</strong>
              </span>
            </div>
            <h2 className="text-base font-bold text-white mt-0.5">
              Quiz: Kto w Drużynie...
            </h2>
          </div>
        </div>

        {/* Voting Countdown Timer */}
        {isVoting && (
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3.5 py-1.5 rounded-xl">
            <span className="text-xs text-slate-400">Czas:</span>
            <span
              className={`font-mono font-black text-lg ${
                state.votingTimeRemaining <= 5
                  ? "text-rose-400 animate-pulse"
                  : "text-violet-400"
              }`}
            >
              {state.votingTimeRemaining}s
            </span>
          </div>
        )}
      </div>

      {/* ACTIVE PROMPT CARD */}
      {state.currentPrompt && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 text-center space-y-3 shadow-xl">
          <span className="text-xs font-bold text-violet-400 uppercase tracking-wider">
            Kto najbardziej pasuje do opisu?
          </span>
          <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight">
            &ldquo;{state.currentPrompt}&rdquo;
          </h3>
          <p className="text-xs text-slate-400">
            Oddaj głos na kolegę lub koleżankę z zespołu (+20 pkt za głos, +30 pkt za otrzymany głos)
          </p>
        </div>
      )}

      {/* PHASE 1: VOTING GRID */}
      {isVoting && (
        <div className="space-y-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Wybierz osobę z zespołu:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Object.values(players).map((p) => {
              const isSelected = myVote === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => onVote(p.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col items-center text-center space-y-2 active:scale-95 ${
                    isSelected
                      ? "bg-violet-950/40 border-violet-400 ring-2 ring-violet-400 shadow-lg shadow-violet-500/20"
                      : "bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60"
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                    <ChameleonMascot state="idle" size={32} colors={p.chameleonColors} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block truncate max-w-[120px]">
                      {p.name}
                    </span>
                    {isSelected && (
                      <span className="text-[10px] text-violet-300 font-bold bg-violet-500/20 px-2 py-0.5 rounded-full mt-1 inline-block">
                        Twój głos
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PHASE 2 & 3: PODIUM COUNTDOWN & HALL OF FAME */}
      {(isCountdown || isHallOfFame) && winners.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-8 shadow-xl text-center">
          <div>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center justify-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Wyniki Głosowania Zespołu
            </span>
            <h3 className="text-2xl font-black text-white mt-1">
              Podium Wyróżnienia!
            </h3>
          </div>

          {/* Podium layout */}
          <div className="flex items-end justify-center gap-4 sm:gap-8 pt-4 pb-2">
            {/* 2nd place */}
            {winners[1] && (
              <div
                className={`flex flex-col items-center transition-all duration-700 ${
                  (state.podiumStep ?? 0) <= 2 ? "opacity-100 scale-100" : "opacity-0 scale-90"
                }`}
              >
                <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-slate-400 flex items-center justify-center shadow-lg relative">
                  <ChameleonMascot
                    state="idle"
                    size={44}
                    colors={players[winners[1].playerId]?.chameleonColors}
                  />
                  <span className="absolute -top-2 -right-1 w-6 h-6 rounded-full bg-slate-300 text-slate-950 font-black text-xs flex items-center justify-center border-2 border-slate-900">
                    2
                  </span>
                </div>
                <span className="text-xs font-bold text-white mt-2 truncate max-w-[100px]">
                  {winners[1].playerName}
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {winners[1].votes} głosów
                </span>
                <div className="w-24 sm:w-28 h-16 bg-slate-800/80 border-t-2 border-slate-400 rounded-t-lg mt-2 flex items-center justify-center">
                  <Medal className="w-5 h-5 text-slate-300" />
                </div>
              </div>
            )}

            {/* 1st place */}
            {winners[0] && (
              <div
                className={`flex flex-col items-center transition-all duration-700 ${
                  (state.podiumStep ?? 0) <= 1 ? "opacity-100 scale-100" : "opacity-0 scale-90"
                }`}
              >
                <div className="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center shadow-xl shadow-amber-500/30 relative">
                  <ChameleonMascot
                    state="celebrate"
                    size={56}
                    colors={players[winners[0].playerId]?.chameleonColors}
                  />
                  <span className="absolute -top-2.5 -right-1 w-7 h-7 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center border-2 border-slate-900 shadow-md">
                    👑
                  </span>
                </div>
                <span className="text-sm font-black text-amber-300 mt-2 truncate max-w-[120px]">
                  {winners[0].playerName}
                </span>
                <span className="text-xs font-mono font-bold text-amber-400">
                  {winners[0].votes} głosów
                </span>
                <div className="w-28 sm:w-32 h-24 bg-amber-500/20 border-t-2 border-amber-400 rounded-t-lg mt-2 flex items-center justify-center">
                  <Trophy className="w-7 h-7 text-amber-400" />
                </div>
              </div>
            )}

            {/* 3rd place */}
            {winners[2] && (
              <div
                className={`flex flex-col items-center transition-all duration-700 ${
                  (state.podiumStep ?? 0) <= 3 ? "opacity-100 scale-100" : "opacity-0 scale-90"
                }`}
              >
                <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-amber-700 flex items-center justify-center shadow-lg relative">
                  <ChameleonMascot
                    state="idle"
                    size={44}
                    colors={players[winners[2].playerId]?.chameleonColors}
                  />
                  <span className="absolute -top-2 -right-1 w-6 h-6 rounded-full bg-amber-700 text-amber-100 font-black text-xs flex items-center justify-center border-2 border-slate-900">
                    3
                  </span>
                </div>
                <span className="text-xs font-bold text-white mt-2 truncate max-w-[100px]">
                  {winners[2].playerName}
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {winners[2].votes} głosów
                </span>
                <div className="w-24 sm:w-28 h-12 bg-slate-800/80 border-t-2 border-amber-700 rounded-t-lg mt-2 flex items-center justify-center">
                  <Award className="w-5 h-5 text-amber-600" />
                </div>
              </div>
            )}
          </div>

          {/* Host advance button */}
          {isHost && isHallOfFame && (
            <div className="pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={onNextPrompt}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-400 text-slate-950 font-bold text-xs shadow-md transition-all"
              >
                <span>Następne pytanie</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* HALL OF FAME ACCORDION (Księga Pamiątkowa) */}
      {state.hallOfFame.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <BookMarked className="w-5 h-5 text-amber-400" />
            <h4 className="text-sm font-bold text-white">
              Księga Pamiątkowa Drużyny ({state.hallOfFame.length})
            </h4>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {state.hallOfFame.map((item, idx) => (
              <div
                key={idx}
                className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-slate-400 italic block truncate">
                    &ldquo;{item.prompt}&rdquo;
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-bold text-amber-300">
                    🏆 {item.winnerName}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    ({item.votes} głosów)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GAME OVER */}
      {state.phase === "GAME_OVER" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-violet-500/10 border border-violet-500/30 flex items-center justify-center">
            <Trophy className="w-10 h-10 text-violet-400" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white">Quiz Zakończony!</h3>
            <p className="text-xs text-slate-400 mt-1">
              Księga Pamiątkowa Drużyny została pomyślnie utworzona.
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
