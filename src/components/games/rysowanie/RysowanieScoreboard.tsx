"use client";

import React from "react";
import { Crown, Pencil, CheckCircle } from "lucide-react";
import { Player } from "@/server/types";
import { ChameleonMascot } from "../../mascot/ChameleonMascot";

interface RysowanieScoreboardProps {
  players: Record<string, Player>;
  currentDrawerId: string | null;
  currentUserId: string;
}

export const RysowanieScoreboard: React.FC<RysowanieScoreboardProps> = ({
  players,
  currentDrawerId,
  currentUserId,
}) => {
  // Sort players descending by score
  const sortedPlayers = Object.values(players).sort((a, b) => b.score - a.score);

  return (
    <div className="flex flex-col h-full bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-800 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 bg-slate-800/80 border-b border-slate-700/60 flex items-center justify-between text-xs font-semibold text-slate-300">
        <span>Tabela Graczy ({sortedPlayers.length})</span>
        <span className="text-slate-400">Punkty</span>
      </div>

      {/* Players List */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto">
        {sortedPlayers.map((player, idx) => {
          const isDrawer = player.id === currentDrawerId;
          const isMe = player.id === currentUserId;

          // Reactive chameleon mascot state based on in-game role
          const mascotState = isDrawer
            ? "drawing"
            : player.hasSolved
            ? "celebrate"
            : "idle";

          return (
            <div
              key={player.id}
              className={`p-2 rounded-lg border transition-all flex items-center justify-between gap-2.5 ${
                isMe
                  ? "bg-cyan-950/30 border-cyan-500/50 shadow-sm"
                  : player.hasSolved
                  ? "bg-emerald-950/20 border-emerald-700/40"
                  : isDrawer
                  ? "bg-indigo-950/20 border-indigo-600/40"
                  : "bg-slate-800/40 border-slate-700/40"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {/* Rank Badge */}
                <span className="text-[11px] font-bold text-slate-400 w-4 text-center">
                  #{idx + 1}
                </span>

                {/* Parametric Chameleon Mascot Avatar */}
                <div className="shrink-0 w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-700/60">
                  <ChameleonMascot
                    size={28}
                    state={mascotState}
                    colors={player.chameleonColors}
                  />
                </div>

                {/* Player Name and Badges */}
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-xs font-semibold truncate ${
                        isMe ? "text-cyan-300 font-bold" : "text-slate-200"
                      }`}
                    >
                      {player.name}
                    </span>
                    {player.isHost && (
                      <span title="Gospodarz" className="inline-flex items-center">
                        <Crown className="w-3 h-3 text-amber-400 shrink-0" />
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px]">
                    {isDrawer && (
                      <span className="flex items-center gap-0.5 text-indigo-400 font-medium">
                        <Pencil className="w-2.5 h-2.5" /> Rysuje
                      </span>
                    )}
                    {player.hasSolved && (
                      <span className="flex items-center gap-0.5 text-emerald-400 font-medium">
                        <CheckCircle className="w-2.5 h-2.5" /> Odgadł(a)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Score Tally */}
              <div className="text-right shrink-0">
                <span className="text-sm font-bold text-cyan-400 font-mono">
                  {player.score}
                </span>
                <span className="text-[10px] text-slate-500 ml-1">pkt</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
