"use client";

import React, { useState } from "react";
import {
  InformationDeductionRoomState,
  DeductionGameId,
  Player,
} from "@/server/types";
import {
  Search,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  FileText,
  Key,
  Award,
  Sparkles,
} from "lucide-react";

interface InformationDeductionGameProps {
  state: InformationDeductionRoomState;
  players?: Record<string, Player>;
  currentUserId: string;
  isHost: boolean;
  onSelectGame: (gameId: DeductionGameId) => void;
  onDealCards: () => void;
  onUpdateNotes: (notes: string) => void;
  onSubmitSolution: (solution: string) => void;
  onDesignateNegotiator: (playerId: string) => void;
  onNextPhase: () => void;
}

export function InformationDeductionGame({
  state,
  players,
  currentUserId,
  isHost,
  onSelectGame,
  onDealCards,
  onUpdateNotes,
  onSubmitSolution,
  onDesignateNegotiator,
  onNextPhase,
}: InformationDeductionGameProps) {
  const [solutionInput, setSolutionInput] = useState("");
  const [activeTab, setActiveTab] = useState<"clues" | "notes" | "solution">("clues");

  const myClueCards = state.clueCards[currentUserId] || [];
  const myRole = state.roles?.[currentUserId];
  const isNegotiator = state.negotiators?.includes(currentUserId);
  const [selectedDraculaTeam, setSelectedDraculaTeam] = useState<"team-1" | "team-2">("team-1");

  const handleSolutionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!solutionInput.trim()) return;
    onSubmitSolution(solutionInput.trim());
    setActiveTab("solution");
  };

  return (
    <div className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6">
      {/* Top Header & Game Switcher */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-950/60 border border-purple-800/80 flex items-center justify-center text-purple-400 shrink-0">
            <Search className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-lg text-white">{state.title}</h1>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                Śledztwo & Dedykacja
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{state.briefing}</p>
          </div>
        </div>

        {/* Host Game Switcher & Actions */}
        <div className="flex items-center gap-2">
          {isHost && (
            <select
              value={state.gameId}
              onChange={(e) => onSelectGame(e.target.value as DeductionGameId)}
              className="bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-purple-400"
            >
              <option value="ZIN_OBELISK">Zin Obelisk (33 Poszlaki)</option>
              <option value="DRACULA">Dracula (Negocjatorzy & Kooperacja)</option>
              <option value="MURDER_TECHSTREAM">Zagadka TechStream (Mulligan)</option>
              <option value="MOVIE_MYSTERY">Plan Filmowy (10 Ról)</option>
            </select>
          )}

          {isHost && (
            <button
              type="button"
              onClick={onDealCards}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition shadow-md cursor-pointer"
            >
              Rozdaj karty
            </button>
          )}

          {isHost && (
            <button
              type="button"
              onClick={onNextPhase}
              className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow-md cursor-pointer"
            >
              Faza &rarr;
            </button>
          )}
        </div>
      </div>

      {/* Strict Privacy Warning Banner */}
      <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-300 text-xs font-medium">
        <EyeOff className="w-5 h-5 shrink-0 text-rose-400" />
        <p>
          <strong className="font-bold uppercase tracking-wider text-rose-200">Zasada bezwzględna: </strong>
          {state.ruleWarning}
        </p>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("clues")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === "clues"
              ? "bg-purple-600 text-white shadow-md"
              : "text-slate-400 hover:bg-slate-800 hover:text-white"
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>Twoje Tajne Karty ({myClueCards.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("notes")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === "notes"
              ? "bg-purple-600 text-white shadow-md"
              : "text-slate-400 hover:bg-slate-800 hover:text-white"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Wspólny Notatnik & Szkicownik</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("solution")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === "solution"
              ? "bg-purple-600 text-white shadow-md"
              : "text-slate-400 hover:bg-slate-800 hover:text-white"
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Rozwiązanie & Werdykt</span>
        </button>
      </div>

      {/* TAB 1: YOUR SECRET CLUE CARDS & ROLE */}
      {activeTab === "clues" && (
        <div className="space-y-6">
          {/* Movie Mystery Role Details (if applicable) */}
          {myRole && (
            <div className="p-5 rounded-2xl border border-purple-500/40 bg-gradient-to-br from-purple-950/40 to-slate-900 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  Twoja Rola: {myRole.occupation}
                </span>
                <span className="text-xs font-mono text-purple-200 font-bold">{myRole.name}</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{myRole.bio}</p>
              <div className="pt-2 border-t border-purple-800/40 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="font-bold text-rose-300 block mb-1">Twój sekretny cel:</span>
                  <p className="text-slate-300">{myRole.secretObjective}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="font-bold text-amber-300 block mb-1">Twoje alibi / działanie:</span>
                  <p className="text-slate-300">{myRole.actionClue}</p>
                </div>
              </div>
            </div>
          )}

          {/* Dracula Team Fact Sheet (if applicable) */}
          {state.teamFactSheets && (
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-400" />
                  Arkusze Zespołów (Dracula)
                </h3>
                <div className="flex items-center gap-2">
                  {!isNegotiator && !isHost && state.phase !== "SOLUTION_REVEAL" && state.phase !== "DEBRIEFING" && (
                    <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                      <button
                        type="button"
                        onClick={() => setSelectedDraculaTeam("team-1")}
                        className={`px-2.5 py-1 rounded-lg font-bold transition ${
                          selectedDraculaTeam === "team-1"
                            ? "bg-cyan-500 text-slate-950"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Zespół 1
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedDraculaTeam("team-2")}
                        className={`px-2.5 py-1 rounded-lg font-bold transition ${
                          selectedDraculaTeam === "team-2"
                            ? "bg-amber-500 text-slate-950"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Zespół 2
                      </button>
                    </div>
                  )}
                  {isNegotiator ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      Jesteś Wyznaczonym Negocjatorem! (Widzisz oba arkusze)
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onDesignateNegotiator(currentUserId)}
                      className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white border border-slate-700 transition"
                    >
                      Zostań Negocjatorem
                    </button>
                  )}
                </div>
              </div>

              <div className={`grid gap-4 ${isNegotiator || isHost || state.phase === "SOLUTION_REVEAL" || state.phase === "DEBRIEFING" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
                {Object.entries(state.teamFactSheets)
                  .filter(([teamKey]) => {
                    if (isNegotiator || isHost || state.phase === "SOLUTION_REVEAL" || state.phase === "DEBRIEFING") {
                      return true;
                    }
                    const userTeam = players?.[currentUserId]?.breakoutGroupId === "group-2" ? "team-2" : selectedDraculaTeam;
                    return teamKey === userTeam;
                  })
                  .map(([teamKey, sheet]) => (
                    <div key={teamKey} className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <h4 className="font-bold text-xs text-cyan-300">{sheet.title}</h4>
                        <span className="text-[10px] font-mono text-slate-500 uppercase">
                          {teamKey === "team-1" ? "Drużyna Wschodu" : "Drużyna Zakonu"}
                        </span>
                      </div>
                      <ul className="space-y-1.5 text-xs text-slate-300">
                        {sheet.facts.map((fact, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-cyan-400 font-mono">•</span>
                            <span>{fact}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Dealt Secret Clue Cards Grid */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Karty Poszlak Przydzielone Wyłącznie Tobie:
            </h3>

            {myClueCards.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2">
                <Search className="w-8 h-8 mx-auto text-slate-600" />
                <p className="text-xs font-bold text-slate-400">Brak rozdanych kart</p>
                <p className="text-[11px] text-slate-500">
                  Gospodarz pokoju może kliknąć &quot;Rozdaj karty&quot;, aby przydzielić wskazówki.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {myClueCards.map((clue, idx) => (
                  <div
                    key={clue.id}
                    className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 hover:border-purple-500/40 shadow-lg space-y-2 transition-transform hover:scale-102"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        Poszlaka #{idx + 1}
                      </span>
                      <Key className="w-3.5 h-3.5 text-purple-400" />
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed">{clue.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SHARED SCRATCHPAD NOTES */}
      {activeTab === "notes" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                Współdzielony Notatnik Śledczy
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Zapisujcie wspólnie zebrane fakty, obliczenia matematyczne i eliminujcie błędne hipotezy w czasie rzeczywistym.
              </p>
            </div>
          </div>

          <textarea
            value={state.notes}
            onChange={(e) => onUpdateNotes(e.target.value)}
            placeholder="Zapisujcie tutaj dedukcje i wyliczenia (np. 18 robotników * 16 bloków = 288 bloków/dzień)..."
            rows={12}
            className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-4 text-xs font-mono leading-relaxed focus:ring-2 focus:ring-purple-400 focus:outline-none"
          />
        </div>
      )}

      {/* TAB 3: SOLUTION SUBMISSION & VERDICT */}
      {activeTab === "solution" && (
        <div className="space-y-6">
          {/* Solution Input Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              Zgłoś Ostateczną Odpowiedź Zespołu
            </h3>
            <p className="text-xs text-slate-400">
              Przedyskutujcie odpowiedź i wpiszcie rozwiązanie (np. dzień tygodnia lub nazwisko sprawcy):
            </p>

            <form onSubmit={handleSolutionSubmit} className="flex gap-2">
              <input
                type="text"
                required
                value={solutionInput}
                onChange={(e) => setSolutionInput(e.target.value)}
                placeholder="Wpisz rozwiązanie (np. Neptiminus lub Bob Hartley)..."
                className="flex-1 bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-purple-400"
              />
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition shadow-md"
              >
                Sprawdź
              </button>
            </form>

            {state.submittedSolution && (
              <div
                className={`p-4 rounded-xl border flex items-center gap-3 ${
                  state.isSolutionCorrect
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-amber-500/10 border-amber-500/30 text-amber-300"
                }`}
              >
                {state.isSolutionCorrect ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                )}
                <div className="text-xs">
                  <p className="font-bold">
                    {state.isSolutionCorrect ? "Brawo! Prawidłowe rozwiązanie!" : "Nietrafione rozwiązanie..."}
                  </p>
                  <p className="text-[11px] opacity-90">
                    Twoja propozycja: &quot;{state.submittedSolution}&quot;
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Official Rationale & Debriefing Prompts */}
          {(state.phase === "SOLUTION_REVEAL" || state.phase === "DEBRIEFING" || state.isSolutionCorrect) && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-800/60 space-y-2">
                <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider block">
                  Oficjalne Rozwiązanie:
                </span>
                <p className="text-base font-black text-white">{state.officialSolution}</p>
              </div>

              {/* Step-by-Step Rationale */}
              {state.rationaleSteps.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Krok po kroku: Pełne Uzasadnienie Logiczne
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-300 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                    {state.rationaleSteps.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-purple-400 font-bold shrink-0">{idx + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Debriefing Questions */}
              {state.debriefingQuestions.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Pytania do Refleksji Zespołowej (Debriefing)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {state.debriefingQuestions.map((q, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 leading-relaxed">
                        <span className="font-bold text-amber-400 block mb-1">Pytanie #{idx + 1}:</span>
                        {q}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
