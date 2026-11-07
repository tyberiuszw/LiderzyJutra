"use client";

import React, { useState, useEffect } from "react";
import {
  SurvivalChallengeRoomState,
  SurvivalScenario,
  Player,
} from "@/server/types";
import {
  Compass,
  Rocket,
  Clock,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  Award,
  Users,
  ChevronRight,
  HelpCircle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

interface SurvivalChallengeGameProps {
  state: SurvivalChallengeRoomState;
  players: Record<string, Player>;
  currentUserId: string;
  isHost: boolean;
  onSelectScenario?: (scenario: SurvivalScenario) => void;
  onSubmitIndividual: (ranking: number[]) => void;
  onSubmitTeam: (ranking: number[]) => void;
  onNextPhase: () => void;
}

export function SurvivalChallengeGame({
  state,
  players,
  currentUserId,
  isHost,
  onSubmitIndividual,
  onSubmitTeam,
  onNextPhase,
}: SurvivalChallengeGameProps) {
  // Local ranking ordered array of item IDs (1st to 15th)
  const [localRanking, setLocalRanking] = useState<number[]>([]);
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);

  // Initialize local ranking if empty
  useEffect(() => {
    if (state.items && state.items.length > 0) {
      if (state.phase === "INDIVIDUAL_RANKING") {
        const saved = state.individualRankings[currentUserId];
        if (saved && saved.length === state.items.length) {
          setLocalRanking(saved);
        } else if (localRanking.length !== state.items.length) {
          setLocalRanking(state.items.map((i) => i.id));
        }
      } else if (state.phase === "TEAM_RANKING") {
        const teamSaved = state.teamRankings["team"] || state.teamRankings[players[currentUserId]?.breakoutGroupId || ""];
        if (teamSaved && teamSaved.length === state.items.length) {
          setLocalRanking(teamSaved);
        } else if (localRanking.length !== state.items.length) {
          setLocalRanking(state.items.map((i) => i.id));
        }
      }
    }
  }, [state.phase, state.items, currentUserId, state.individualRankings, state.teamRankings, players, localRanking.length]);

  // Move item up in ranking
  const moveItemUp = (index: number) => {
    if (index === 0) return;
    const next = [...localRanking];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    setLocalRanking(next);
  };

  // Move item down in ranking
  const moveItemDown = (index: number) => {
    if (index === localRanking.length - 1) return;
    const next = [...localRanking];
    [next[index + 1], next[index]] = [next[index], next[index + 1]];
    setLocalRanking(next);
  };

  const isIndividualLocked = Boolean(state.individualSubmitted[currentUserId]);
  const isTeamLocked = Boolean(state.teamSubmitted["team"] || state.teamSubmitted[players[currentUserId]?.breakoutGroupId || ""]);

  const myIndividualScore = state.scores[currentUserId]?.individualScore ?? 0;
  const teamScoreSummary = state.scores["team"] || state.scores[players[currentUserId]?.breakoutGroupId || ""];

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6">
      {/* Top Game Header Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-cyan-950/60 border border-cyan-800/80 flex items-center justify-center text-cyan-400 shrink-0">
            {state.scenario === "LOST_AT_SEA" ? <Compass className="w-6 h-6" /> : <Rocket className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-lg text-white">
                {state.scenario === "LOST_AT_SEA" ? "Zagubieni na Morzu (Lost at Sea)" : "Przetrwanie na Księżycu (NASA Moon Survival)"}
              </h1>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                {state.scenario === "LOST_AT_SEA" ? "U.S. Coast Guard" : "NASA"}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {state.scenario === "LOST_AT_SEA"
                ? "Twój jacht spłonął na południowym Pacyfiku. Do lądu macie 1000 mil. Uszeregujcie 15 ocalałych przedmiotów!"
                : "Awaryjne lądowanie 200 mil od bazy księżycowej. Wybierzcie przedmioty kluczowe do pokonania trasy w skafandrach!"}
            </p>
          </div>
        </div>

        {/* Status Indicators & Host Controls */}
        <div className="flex items-center gap-3">
          {/* Phase Badge */}
          <div className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>
              {state.phase === "LOBBY" && "Poczekalnia"}
              {state.phase === "INDIVIDUAL_RANKING" && "Faza 1: Ranking Solo"}
              {state.phase === "TEAM_RANKING" && "Faza 2: Ranking Zespołowy"}
              {state.phase === "EXPERT_REVEAL" && "Faza 3: Werdykt & Synergia"}
              {state.phase === "DEBRIEFING" && "Faza 4: Debriefing"}
            </span>
          </div>

          {/* Countdown timer */}
          {(state.phase === "INDIVIDUAL_RANKING" || state.phase === "TEAM_RANKING") && (
            <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatTimer(state.timerRemaining)}</span>
            </div>
          )}

          {/* Host Next Phase Control */}
          {isHost && (
            <button
              type="button"
              onClick={onNextPhase}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-cyan-500/20 active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <span>
                {state.phase === "LOBBY" && "Rozpocznij Ranking Solo"}
                {state.phase === "INDIVIDUAL_RANKING" && "Przejdź do Dyskusji Zespołowej"}
                {state.phase === "TEAM_RANKING" && "Odkryj Werdykt Ekspertów"}
                {state.phase === "EXPERT_REVEAL" && "Przejdź do Debriefingu"}
                {state.phase === "DEBRIEFING" && "Podsumowanie"}
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* PHASE 1 & PHASE 2: RANKING INTERFACE */}
      {(state.phase === "INDIVIDUAL_RANKING" || state.phase === "TEAM_RANKING" || state.phase === "LOBBY") && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800 gap-2">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400" />
                  {state.phase === "INDIVIDUAL_RANKING"
                    ? "Krok 1: Twój Indywidualny Ranking Przetrwania"
                    : "Krok 2: Uzgodnijcie Wspólny Ranking Zespołowy"}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Użyj strzałek, aby ułożyć przedmioty od najważniejszego (Miejsce 1) do najmniej ważnego (Miejsce 15).
                </p>
              </div>

              {/* Lock-In Button */}
              {state.phase === "INDIVIDUAL_RANKING" && (
                <button
                  type="button"
                  disabled={isIndividualLocked}
                  onClick={() => onSubmitIndividual(localRanking)}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs transition shadow-md flex items-center gap-2 ${
                    isIndividualLocked
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 cursor-default"
                      : "bg-cyan-500 hover:bg-cyan-400 text-slate-950 cursor-pointer"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isIndividualLocked ? "Twój ranking zatwierdzony" : "Zatwierdź mój ranking"}</span>
                </button>
              )}

              {state.phase === "TEAM_RANKING" && (
                <button
                  type="button"
                  disabled={isTeamLocked}
                  onClick={() => onSubmitTeam(localRanking)}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs transition shadow-md flex items-center gap-2 ${
                    isTeamLocked
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 cursor-default"
                      : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer"
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>{isTeamLocked ? "Ranking zespołu zatwierdzony" : "Zatwierdź ranking zespołu"}</span>
                </button>
              )}
            </div>

            {/* Ranking Items Ordered List */}
            <div className="divide-y divide-slate-800 mt-4">
              {localRanking.map((itemId, idx) => {
                const item = state.items.find((i) => i.id === itemId);
                if (!item) return null;
                const rankNum = idx + 1;
                return (
                  <div
                    key={item.id}
                    className="py-3 px-3 flex items-center gap-3 hover:bg-slate-800/40 rounded-xl transition"
                  >
                    {/* Rank Badge */}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-sm ${
                        rankNum <= 3
                          ? "bg-amber-500 text-slate-950"
                          : rankNum <= 8
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {rankNum}
                    </div>

                    {/* Item Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs font-bold text-white truncate">{item.title}</h3>
                      <p className="text-[11px] text-slate-400 truncate">{item.description}</p>
                    </div>

                    {/* Reorder Buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => moveItemUp(idx)}
                        disabled={idx === 0 || (state.phase === "INDIVIDUAL_RANKING" && isIndividualLocked) || (state.phase === "TEAM_RANKING" && isTeamLocked)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-20 text-slate-300 hover:text-white transition"
                        title="Przesuń wyżej"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItemDown(idx)}
                        disabled={idx === localRanking.length - 1 || (state.phase === "INDIVIDUAL_RANKING" && isIndividualLocked) || (state.phase === "TEAM_RANKING" && isTeamLocked)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-20 text-slate-300 hover:text-white transition"
                        title="Przesuń niżej"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* PHASE 3 & 4: EXPERT REVEAL, DIFFERENCE MATRIX & DEBRIEFING */}
      {(state.phase === "EXPERT_REVEAL" || state.phase === "DEBRIEFING") && (
        <div className="space-y-6">
          {/* Synergy & Outcome Summary Card */}
          {teamScoreSummary && (
            <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-6 shadow-2xl space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Individual Average vs Team Score */}
                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 text-center space-y-1">
                  <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">
                    Twój wynik solo
                  </span>
                  <div className="text-3xl font-black text-cyan-400 font-mono">
                    {myIndividualScore}
                  </div>
                  <span className="text-[10px] text-slate-500">Suma różnic z ekspertem (mniej = lepiej)</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 text-center space-y-1">
                  <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">
                    Wynik drużyny (Konsensus)
                  </span>
                  <div className="text-3xl font-black text-amber-400 font-mono">
                    {teamScoreSummary.teamScore}
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Średnia solo grupy: {teamScoreSummary.individualScore}
                  </span>
                </div>

                {/* Team Synergy Gain Card */}
                <div
                  className={`p-4 rounded-xl border text-center space-y-1 ${
                    teamScoreSummary.synergyGain > 0
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                      : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                  }`}
                >
                  <div className="flex items-center justify-center gap-1 text-[11px] uppercase font-bold tracking-wider">
                    {teamScoreSummary.synergyGain > 0 ? (
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-rose-400" />
                    )}
                    <span>Synergia Zespołowa</span>
                  </div>
                  <div className="text-3xl font-black font-mono">
                    {teamScoreSummary.synergyGain > 0 ? `+${teamScoreSummary.synergyGain}` : teamScoreSummary.synergyGain} pkt
                  </div>
                  <span className="text-[10px]">
                    {teamScoreSummary.synergyGain > 0
                      ? "Zysk z dyskusji! Drużyna pobiła średnią osób solo."
                      : "Brak synergii. Grupa popełniła więcej błędów niż średnia solo."}
                  </span>
                </div>
              </div>

              {/* Survival Bracket Outcome */}
              <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-800/50 flex items-start gap-3">
                <Award className="w-6 h-6 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-cyan-300 uppercase tracking-wider">
                      Klasyfikacja szans na przetrwanie:
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-cyan-500/20 text-cyan-200 border border-cyan-500/40">
                      {teamScoreSummary.bracket.label} ({teamScoreSummary.bracket.range} pkt)
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    {teamScoreSummary.bracket.description}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Interactive Difference Matrix */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h3 className="text-sm font-bold text-white mb-3">
              Macierz Różnic: Solo vs Drużyna vs Oficjalny Ekspert
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                    <th className="py-2.5 px-3">Przedmiot</th>
                    <th className="py-2.5 px-3 text-center">Moja pozycja</th>
                    <th className="py-2.5 px-3 text-center">Drużyna</th>
                    <th className="py-2.5 px-3 text-center text-cyan-400">Ekspert</th>
                    <th className="py-2.5 px-3 text-center">Różnica solo</th>
                    <th className="py-2.5 px-3 text-center">Różnica drużyny</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {state.items.map((item) => {
                    const myRank = (state.individualRankings[currentUserId]?.indexOf(item.id) ?? -1) + 1;
                    const mainTeamRanking = state.teamRankings["team"] || state.teamRankings[players[currentUserId]?.breakoutGroupId || ""] || [];
                    const teamRank = (mainTeamRanking.indexOf(item.id) ?? -1) + 1;
                    const myDiff = myRank > 0 ? Math.abs(myRank - item.expertRank) : 0;
                    const teamDiff = teamRank > 0 ? Math.abs(teamRank - item.expertRank) : 0;
                    const isExpanded = expandedItemId === item.id;

                    return (
                      <React.Fragment key={item.id}>
                        <tr
                          onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                          className="hover:bg-slate-800/60 cursor-pointer transition"
                        >
                          <td className="py-2.5 px-3 font-semibold text-white flex items-center gap-2">
                            <span>{item.title}</span>
                            <HelpCircle className="w-3.5 h-3.5 text-slate-500 hover:text-cyan-400" />
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono">{myRank || "—"}</td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-300">
                            {teamRank || "—"}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-cyan-400">
                            {item.expertRank}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono">
                            <span className={myDiff === 0 ? "text-emerald-400 font-bold" : "text-slate-400"}>
                              {myDiff}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono">
                            <span className={teamDiff === 0 ? "text-emerald-400 font-bold" : "text-slate-400"}>
                              {teamDiff}
                            </span>
                          </td>
                        </tr>

                        {/* Expandable Official Rationale */}
                        {isExpanded && (
                          <tr className="bg-slate-950/80">
                            <td colSpan={6} className="p-4 border-l-2 border-cyan-500 text-xs text-slate-300">
                              <p className="font-bold text-cyan-300 mb-1">
                                Oficjalne uzasadnienie Coast Guard / NASA (Pozycja {item.expertRank}):
                              </p>
                              <p className="leading-relaxed">{item.expertRationale}</p>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* DEBRIEFING REFLECTION PROMPTS */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" />
              Pytania do Debriefingu Warsztatowego
            </h3>
            <p className="text-xs text-slate-400">
              Otwórzcie mikrofony na Google Meet / Discordzie i wspólnie omówcie dynamikę grupy:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                <span className="text-xs font-bold text-amber-300">1. Cisi eksperci</span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Czy w trakcie debaty słuchaliście cichych ekspertów, czy osób mówiących najgłośniej lub najbardziej pewnych siebie?
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                <span className="text-xs font-bold text-cyan-300">2. Presja grupy</span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Czy ktoś zrezygnował ze swojego trafnego pomysłu lub uległ fałszywej hipotezie pod presją większości?
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                <span className="text-xs font-bold text-emerald-300">3. Konsensus</span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  W jaki sposób wypracowywaliście decyzje przy różnicy zdań: głosowanie, kompromis czy merytoryczna argumentacja?
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
