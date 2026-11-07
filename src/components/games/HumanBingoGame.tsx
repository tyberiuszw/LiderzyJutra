"use client";

import React, { useState } from "react";
import {
  HumanBingoRoomState,
  Player,
  IncomingBingoRequest,
  BingoWinnerRecord,
} from "@/server/types";
import { ChameleonMascot } from "@/components/mascot/ChameleonMascot";
import {
  Grid,
  Check,
  X,
  Sparkles,
  Award,
  Users,
  Settings2,
} from "lucide-react";

interface HumanBingoGameProps {
  state: HumanBingoRoomState;
  players: Record<string, Player>;
  currentUserId: string;
  isHost: boolean;
  incomingRequest: IncomingBingoRequest | null;
  recentCelebration: BingoWinnerRecord | null;
  onClaimTile: (tileIndex: number, targetPlayerId: string) => void;
  onRespondVerification: (verificationId: string, approved: boolean) => void;
  onSetGridSize: (size: 4 | 5) => void;
  onRestart: () => void;
}

export function HumanBingoGame({
  state,
  players,
  currentUserId,
  isHost,
  incomingRequest,
  recentCelebration,
  onClaimTile,
  onRespondVerification,
  onSetGridSize,
  onRestart,
}: HumanBingoGameProps) {
  const [selectedTileIndex, setSelectedTileIndex] = useState<number | null>(null);
  const myGrid = state.playerGrids[currentUserId] || [];
  const peers = Object.values(players).filter((p) => p.id !== currentUserId);

  const handleTileClick = (idx: number) => {
    const tile = myGrid[idx];
    if (!tile || tile.isClaimed || tile.isFree) return;
    setSelectedTileIndex(idx);
  };

  const handleConfirmPeerClaim = (peerId: string) => {
    if (selectedTileIndex === null) return;
    onClaimTile(selectedTileIndex, peerId);
    setSelectedTileIndex(null);
  };

  return (
    <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
      {/* Header bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center">
            <Grid className="w-6 h-6 text-teal-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400 bg-teal-950 px-2 py-0.5 rounded-full border border-teal-800">
                Siatka {state.gridSize}x{state.gridSize}
              </span>
              <span className="text-xs text-slate-400">
                Zweryfikowane: <strong className="text-white">{myGrid.filter((t) => t.isClaimed || t.isFree).length}</strong> / {state.gridSize * state.gridSize}
              </span>
            </div>
            <h2 className="text-base font-bold text-white mt-0.5">
              Bingo Integracyjne
            </h2>
          </div>
        </div>

        {/* Host grid size switcher */}
        {isHost && (
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
            <Settings2 className="w-3.5 h-3.5 text-slate-400" />
            <button
              type="button"
              onClick={() => onSetGridSize(4)}
              className={`px-2 py-0.5 rounded font-bold ${
                state.gridSize === 4
                  ? "bg-teal-500 text-slate-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              4x4
            </button>
            <button
              type="button"
              onClick={() => onSetGridSize(5)}
              className={`px-2 py-0.5 rounded font-bold ${
                state.gridSize === 5
                  ? "bg-teal-500 text-slate-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              5x5
            </button>
          </div>
        )}
      </div>

      {/* Fanfare Line Completion Banner */}
      {recentCelebration && (
        <div className="p-4 bg-gradient-to-r from-teal-500/30 via-emerald-500/30 to-cyan-500/30 border-2 border-teal-400 rounded-2xl flex items-center gap-4 animate-bounce shadow-2xl">
          <div className="w-12 h-12 rounded-xl bg-teal-400 text-slate-950 flex items-center justify-center shrink-0 shadow-lg">
            <Sparkles className="w-7 h-7" />
          </div>
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-teal-300 block">
              🎉 BINGO! LINIA SKOMPLETOWANA (+250 PKT BONUSU) 🎉
            </span>
            <p className="text-sm font-bold text-white mt-0.5">
              {recentCelebration.playerName} jako pierwszy ukończył linię ({recentCelebration.lineType})!
            </p>
          </div>
        </div>
      )}

      {/* INCOMING 2-WAY PEER VERIFICATION MODAL */}
      {incomingRequest && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-teal-500/80 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-teal-500/20 border border-teal-500/40 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-teal-400" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 bg-teal-950 px-2 py-0.5 rounded-full border border-teal-800">
                  Prośba o Potwierdzenie Cechy
                </span>
                <h4 className="text-base font-bold text-white mt-0.5">
                  {incomingRequest.requesterName} pyta o Ciebie!
                </h4>
              </div>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
              <span className="text-slate-400 block">Czy potwierdzasz, że:</span>
              <p className="text-sm font-bold text-teal-300">
                &ldquo;{incomingRequest.trait}&rdquo;?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => onRespondVerification(incomingRequest.verificationId, false)}
                className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <X className="w-4 h-4 text-rose-400" />
                Nie, pomyłka
              </button>
              <button
                type="button"
                onClick={() => onRespondVerification(incomingRequest.verificationId, true)}
                className="py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-teal-500/20 transition-all active:scale-95"
              >
                <Check className="w-4 h-4" />
                Tak, potwierdzam!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SELECT PEER MODAL (When clicking an unclaimed tile) */}
      {selectedTileIndex !== null && myGrid[selectedTileIndex] && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                  Kto w zespole spełnia tę cechę?
                </span>
                <h4 className="text-sm font-bold text-white mt-0.5">
                  &ldquo;{myGrid[selectedTileIndex].trait}&rdquo;
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTileIndex(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Wybierz osobę z listy poniżej. Wyślemy jej szybką prośbę o potwierdzenie.
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {peers.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 italic">
                  Brak innych graczy w pokoju. Zaproś znajomych linkiem!
                </div>
              ) : (
                peers.map((peer) => (
                  <button
                    key={peer.id}
                    type="button"
                    onClick={() => handleConfirmPeerClaim(peer.id)}
                    className="w-full p-2.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl flex items-center gap-3 text-left transition-all group"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0">
                      <ChameleonMascot state="idle" size={24} colors={peer.chameleonColors} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-white group-hover:text-cyan-400 block truncate">
                        {peer.name}
                      </span>
                    </div>
                    <span className="text-[10px] text-cyan-400 opacity-0 group-hover:opacity-100 font-bold">
                      Wybierz &rarr;
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* THE INTERACTIVE BINGO GRID */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-3">
          <span>
            Kliknij na kafel, aby dopasować kolegę/koleżankę z zespołu (+50 pkt za kafelek, +250 pkt za linię).
          </span>
          <span className="text-[11px] font-mono text-teal-400">
            {myGrid.filter((t) => t.isClaimed || t.isFree).length} / {state.gridSize * state.gridSize}
          </span>
        </div>

        <div
          className={`grid gap-2.5 ${
            state.gridSize === 4 ? "grid-cols-4" : "grid-cols-5"
          }`}
        >
          {myGrid.map((tile) => {
            const isDone = tile.isClaimed || tile.isFree;
            const isCenter = tile.isFree;

            return (
              <button
                key={tile.index}
                type="button"
                disabled={isDone}
                onClick={() => handleTileClick(tile.index)}
                className={`p-2.5 sm:p-3 rounded-xl border transition-all text-left flex flex-col justify-between min-h-[90px] sm:min-h-[110px] ${
                  isCenter
                    ? "bg-amber-500/20 border-amber-500/50 shadow-md shadow-amber-500/10 cursor-default"
                    : isDone
                    ? "bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-500/10 cursor-default"
                    : "bg-slate-950/80 border-slate-800 hover:border-teal-500/60 hover:bg-slate-950 cursor-pointer active:scale-95"
                }`}
              >
                <div className="flex items-start justify-between w-full">
                  <span className="text-[9px] font-mono text-slate-500">
                    #{tile.index + 1}
                  </span>
                  {isDone && (
                    <span className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>

                <p
                  className={`text-[10px] sm:text-xs font-semibold my-1 leading-snug line-clamp-3 ${
                    isCenter
                      ? "text-amber-300 font-bold text-center w-full"
                      : isDone
                      ? "text-emerald-200"
                      : "text-slate-200"
                  }`}
                >
                  {tile.trait}
                </p>

                <div className="pt-1">
                  {tile.verifiedByPeerName ? (
                    <span className="text-[9px] font-bold text-emerald-400 truncate block">
                      ✓ {tile.verifiedByPeerName}
                    </span>
                  ) : isCenter ? (
                    <span className="text-[9px] font-black text-amber-400 text-center block">
                      WOLNE POLE
                    </span>
                  ) : (
                    <span className="text-[9px] text-slate-600 block">
                      Dotknij, aby wybrać
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* GAME OVER */}
      {state.phase === "GAME_OVER" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-teal-500/10 border border-teal-500/30 flex items-center justify-center">
            <Award className="w-10 h-10 text-teal-400" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white">Bingo Integracyjne Zakończone!</h3>
            <p className="text-xs text-slate-400 mt-1">
              Gratulacje dla wszystkich mistrzów networkingu i spostrzegawczości!
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
