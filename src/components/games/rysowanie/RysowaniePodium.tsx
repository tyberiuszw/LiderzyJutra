"use client";

import React from "react";
import { Trophy, Medal, RotateCcw } from "lucide-react";
import { Player } from "@/server/types";
import { ChameleonMascot } from "../../mascot/ChameleonMascot";

interface RysowaniePodiumProps {
  podium: { player: Player; rank: number; score: number }[];
  isHost: boolean;
  onRestart: () => void;
}

export const RysowaniePodium: React.FC<RysowaniePodiumProps> = ({
  podium,
  isHost,
  onRestart,
}) => {
  const first = podium.find((p) => p.rank === 1);
  const second = podium.find((p) => p.rank === 2);
  const third = podium.find((p) => p.rank === 3);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl max-w-2xl w-full p-6 text-center space-y-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold mb-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            Koniec Gry — Ceremonia Zwycięzców!
          </div>
          <h2 className="text-2xl font-black text-white">Podium Rysowania</h2>
        </div>

        {/* Celebrating Champion Mascot */}
        {first && (
          <div className="flex flex-col items-center">
            <div className="relative mb-2">
              <div className="w-28 h-28 rounded-full bg-amber-500/10 border-2 border-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <ChameleonMascot
                  state="celebrate"
                  size={96}
                  colors={first.player.chameleonColors}
                />
              </div>
              <div className="absolute -top-3 -right-2 bg-amber-400 text-slate-950 font-black rounded-full px-2 py-0.5 text-xs shadow">
                1 MIEJSCE 👑
              </div>
            </div>
            <div className="text-lg font-bold text-white">{first.player.name}</div>
            <div className="text-sm font-semibold text-cyan-400 font-mono">
              {first.score} punktów
            </div>
          </div>
        )}

        {/* 2nd and 3rd place podium row */}
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
          {second ? (
            <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-slate-700 border border-slate-500 flex items-center justify-center shrink-0">
                <ChameleonMascot
                  state="idle"
                  size={36}
                  colors={second.player.chameleonColors}
                />
              </div>
              <div className="text-left min-w-0">
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-300">
                  <Medal className="w-3.5 h-3.5 text-slate-300" /> 2. Miejsce
                </div>
                <div className="text-xs font-bold text-white truncate">
                  {second.player.name}
                </div>
                <div className="text-xs font-mono text-cyan-400 font-semibold">
                  {second.score} pkt
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-800/30 border border-slate-700/40 rounded-xl text-slate-500 text-xs flex items-center justify-center">
              Brak 2. miejsca
            </div>
          )}

          {third ? (
            <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-900/30 border border-amber-700 flex items-center justify-center shrink-0">
                <ChameleonMascot
                  state="idle"
                  size={36}
                  colors={third.player.chameleonColors}
                />
              </div>
              <div className="text-left min-w-0">
                <div className="flex items-center gap-1 text-[11px] font-bold text-amber-500">
                  <Medal className="w-3.5 h-3.5 text-amber-500" /> 3. Miejsce
                </div>
                <div className="text-xs font-bold text-white truncate">
                  {third.player.name}
                </div>
                <div className="text-xs font-mono text-cyan-400 font-semibold">
                  {third.score} pkt
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-800/30 border border-slate-700/40 rounded-xl text-slate-500 text-xs flex items-center justify-center">
              Brak 3. miejsca
            </div>
          )}
        </div>

        {/* Action Button */}
        {isHost && (
          <div className="pt-2">
            <button
              type="button"
              onClick={onRestart}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-lg shadow-cyan-500/20 transition-all hover:scale-105 active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              Zagraj Ponownie
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
