"use client";

import React, { useState } from "react";
import {
  Trophy,
  Award,
  X,
  Medal,
  ChevronDown,
  ChevronUp,
  Share2,
  Check,
} from "lucide-react";
import { Player, SessionScoreData } from "@/server/types";
import { ChameleonMascot } from "@/components/mascot/ChameleonMascot";

interface SessionScoreboardModalProps {
  players: Record<string, Player>;
  sessionScores: Record<string, SessionScoreData>;
  onClose: () => void;
}

export function SessionScoreboardModal({
  players,
  sessionScores,
  onClose,
}: SessionScoreboardModalProps) {
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Rank players by total cumulative score
  const rankedPlayers = Object.keys(players)
    .map((pId) => {
      const player = players[pId];
      const scoreData = sessionScores[pId] || {
        total: player.score || 0,
        byGame: {
          RYSOWANIE: 0,
          TWO_TRUTHS: 0,
          THIS_OR_THAT: 0,
          STORY_CHAIN: 0,
          HOT_SEAT: 0,
          QUIZ_SUPERLATIVES: 0,
          HUMAN_BINGO: 0,
        },
      };
      return {
        id: pId,
        name: player.name,
        isGuest: player.isGuest,
        chameleonColors: player.chameleonColors,
        total: scoreData.total,
        byGame: scoreData.byGame,
      };
    })
    .sort((a, b) => b.total - a.total);

  const top3 = rankedPlayers.slice(0, 3);

  const handleCopySummary = () => {
    let summary = `🏆 WYNIKI WARSZTATU LIDERZY JUTRA 🏆\n\n`;
    rankedPlayers.forEach((p, i) => {
      summary += `${i + 1}. ${p.name} — ${p.total} pkt\n`;
    });
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Tabela Wyników Całego Warsztatu
              </h2>
              <p className="text-xs text-slate-400">
                Łączna punktacja ze wszystkich rozegranych modułów
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopySummary}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs flex items-center gap-1.5 transition-colors"
              title="Kopiuj wyniki"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="hidden sm:inline text-emerald-400">Skopiowano!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Kopiuj</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Grand Podium */}
        {top3.length > 0 && (
          <div className="p-6 bg-gradient-to-b from-slate-950/60 to-slate-900/40 border-b border-slate-800">
            <div className="flex items-end justify-center gap-3 sm:gap-6 pt-4 pb-2">
              {/* 2nd place */}
              {top3[1] && (
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 rounded-full bg-slate-800 border-2 border-slate-400 flex items-center justify-center shadow-lg relative">
                    <ChameleonMascot
                      state="idle"
                      size={40}
                      colors={top3[1].chameleonColors}
                    />
                    <span className="absolute -top-2 -right-1 w-6 h-6 rounded-full bg-slate-300 text-slate-950 font-black text-xs flex items-center justify-center border-2 border-slate-900">
                      2
                    </span>
                  </div>
                  <span className="text-xs font-bold text-white mt-2 truncate max-w-[80px] sm:max-w-[100px]">
                    {top3[1].name}
                  </span>
                  <span className="text-[11px] font-mono text-cyan-400">
                    {top3[1].total} pkt
                  </span>
                  <div className="w-20 sm:w-24 h-14 bg-slate-800/80 border-t-2 border-slate-400 rounded-t-lg mt-2 flex items-center justify-center">
                    <Medal className="w-5 h-5 text-slate-300" />
                  </div>
                </div>
              )}

              {/* 1st place */}
              {top3[0] && (
                <div className="flex flex-col items-center">
                  <div className="w-18 h-18 rounded-full bg-amber-500/10 border-2 border-amber-400 flex items-center justify-center shadow-xl shadow-amber-500/20 relative">
                    <ChameleonMascot
                      state="celebrate"
                      size={52}
                      colors={top3[0].chameleonColors}
                    />
                    <span className="absolute -top-2.5 -right-1 w-7 h-7 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center border-2 border-slate-900 shadow-md">
                      👑
                    </span>
                  </div>
                  <span className="text-sm font-black text-amber-300 mt-2 truncate max-w-[90px] sm:max-w-[120px]">
                    {top3[0].name}
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-400">
                    {top3[0].total} pkt
                  </span>
                  <div className="w-24 sm:w-28 h-20 bg-amber-500/20 border-t-2 border-amber-400 rounded-t-lg mt-2 flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-amber-400" />
                  </div>
                </div>
              )}

              {/* 3rd place */}
              {top3[2] && (
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 rounded-full bg-slate-800 border-2 border-amber-700 flex items-center justify-center shadow-lg relative">
                    <ChameleonMascot
                      state="idle"
                      size={40}
                      colors={top3[2].chameleonColors}
                    />
                    <span className="absolute -top-2 -right-1 w-6 h-6 rounded-full bg-amber-700 text-amber-100 font-black text-xs flex items-center justify-center border-2 border-slate-900">
                      3
                    </span>
                  </div>
                  <span className="text-xs font-bold text-white mt-2 truncate max-w-[80px] sm:max-w-[100px]">
                    {top3[2].name}
                  </span>
                  <span className="text-[11px] font-mono text-cyan-400">
                    {top3[2].total} pkt
                  </span>
                  <div className="w-20 sm:w-24 h-10 bg-slate-800/80 border-t-2 border-amber-700 rounded-t-lg mt-2 flex items-center justify-center">
                    <Award className="w-5 h-5 text-amber-600" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Detailed Leaderboard List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {rankedPlayers.map((player, idx) => {
            const isExpanded = expandedPlayerId === player.id;
            return (
              <div
                key={player.id}
                className="bg-slate-800/60 border border-slate-700/60 rounded-xl overflow-hidden transition-all"
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpandedPlayerId(isExpanded ? null : player.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setExpandedPlayerId(isExpanded ? null : player.id);
                    }
                  }}
                  className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-800/90"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center font-mono font-black text-slate-400 text-xs">
                      #{idx + 1}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0">
                      <ChameleonMascot
                        state="idle"
                        size={24}
                        colors={player.chameleonColors}
                      />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">
                        {player.name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {player.isGuest ? "Gość" : "Członek zespołu"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono font-bold text-cyan-400">
                      {player.total} pkt
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-3.5 pt-1 border-t border-slate-700/40 bg-slate-900/60 text-xs grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div className="p-2 bg-slate-800/40 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">🎨 Rysowanie</span>
                      <span className="font-mono font-bold text-white">
                        {player.byGame.RYSOWANIE || 0} pkt
                      </span>
                    </div>
                    <div className="p-2 bg-slate-800/40 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">🤫 Dwie Prawdy</span>
                      <span className="font-mono font-bold text-white">
                        {player.byGame.TWO_TRUTHS || 0} pkt
                      </span>
                    </div>
                    <div className="p-2 bg-slate-800/40 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">⚖️ To czy Tamto</span>
                      <span className="font-mono font-bold text-white">
                        {player.byGame.THIS_OR_THAT || 0} pkt
                      </span>
                    </div>
                    <div className="p-2 bg-slate-800/40 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">📖 Wspólna Historia</span>
                      <span className="font-mono font-bold text-white">
                        {player.byGame.STORY_CHAIN || 0} pkt
                      </span>
                    </div>
                    <div className="p-2 bg-slate-800/40 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">🔥 Gorące Krzesło</span>
                      <span className="font-mono font-bold text-white">
                        {player.byGame.HOT_SEAT || 0} pkt
                      </span>
                    </div>
                    <div className="p-2 bg-slate-800/40 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">🏆 Quiz Drużynowy</span>
                      <span className="font-mono font-bold text-white">
                        {player.byGame.QUIZ_SUPERLATIVES || 0} pkt
                      </span>
                    </div>
                    <div className="p-2 bg-slate-800/40 rounded-lg col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-slate-400 block">🎯 Bingo</span>
                      <span className="font-mono font-bold text-white">
                        {player.byGame.HUMAN_BINGO || 0} pkt
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
