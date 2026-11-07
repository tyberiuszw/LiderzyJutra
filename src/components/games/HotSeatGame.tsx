"use client";

import React, { useState } from "react";
import { HotSeatRoomState, Player } from "@/server/types";
import { ChameleonMascot } from "@/components/mascot/ChameleonMascot";
import {
  Sparkles,
  ThumbsUp,
  Send,
  FastForward,
  CheckCircle,
  HelpCircle,
  Award,
  Users,
} from "lucide-react";

interface HotSeatGameProps {
  state: HotSeatRoomState;
  players: Record<string, Player>;
  currentUserId: string;
  isHost: boolean;
  onSelectSpeaker: (speakerId: string) => void;
  onPickQuestion: (question: string, tier?: 1 | 2 | 3) => void;
  onSubmitQuestion: (text: string) => void;
  onUpvoteQuestion: (questionId: string) => void;
  onPass: () => void;
  onCompleteAnswer: () => void;
  onRestart: () => void;
}

export function HotSeatGame({
  state,
  players,
  currentUserId,
  isHost,
  onSelectSpeaker,
  onPickQuestion,
  onSubmitQuestion,
  onUpvoteQuestion,
  onPass,
  onCompleteAnswer,
  onRestart,
}: HotSeatGameProps) {
  const [customQuestionText, setCustomQuestionText] = useState("");
  const activeSpeaker = state.activeSpeakerId ? players[state.activeSpeakerId] : null;
  const isMeSpeaker = state.activeSpeakerId === currentUserId;

  const handleCustomQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customQuestionText.trim()) return;
    onSubmitQuestion(customQuestionText.trim());
    setCustomQuestionText("");
  };

  return (
    <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
      {/* Header bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-rose-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400 bg-rose-950 px-2 py-0.5 rounded-full border border-rose-800">
                Poziom {state.currentTier}: {state.currentTier === 1 ? "Rozgrzewka" : state.currentTier === 2 ? "Wartości" : "Przywództwo"}
              </span>
              <span className="text-xs text-slate-400">
                Odpowiedzi: <strong className="text-white">{state.questionsAnswered}</strong>
              </span>
            </div>
            <h2 className="text-base font-bold text-white mt-0.5">
              Gorące Krzesło / Pytania do Lidera
            </h2>
          </div>
        </div>

        {/* Answering Timer */}
        {state.phase === "ANSWERING" && (
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3.5 py-1.5 rounded-xl">
            <span className="text-xs text-slate-400">Czas:</span>
            <span
              className={`font-mono font-black text-lg ${
                state.answeringTimeRemaining <= 10 ? "text-rose-400 animate-pulse" : "text-rose-400"
              }`}
            >
              {state.answeringTimeRemaining}s
            </span>
          </div>
        )}
      </div>

      {/* SPEAKER SPOTLIGHT CARD */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-center relative overflow-hidden">
        <div className="relative z-10 flex flex-col items-center space-y-3">
          <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-rose-500/60 flex items-center justify-center shadow-xl shadow-rose-500/20">
            <ChameleonMascot
              state="thinking"
              size={64}
              colors={activeSpeaker?.chameleonColors}
            />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-rose-400 bg-rose-950 px-2.5 py-0.5 rounded-full border border-rose-800">
              NA GORĄCYM KRZEŚLE
            </span>
            <h3 className="text-xl font-black text-white mt-1">
              {activeSpeaker?.name || "Brak wybranego mówcy"}
            </h3>
            <p className="text-xs text-slate-400">
              {isMeSpeaker
                ? "Jesteś w centrum uwagi! Odpowiadaj szczerze i swobodnie."
                : "Słuchaj uważnie i zadawaj inspirujące pytania."}
            </p>
          </div>

          {/* Speaker Selector Trigger for Host */}
          {isHost && (
            <div className="pt-2 flex flex-wrap gap-1.5 justify-center">
              <span className="text-[11px] text-slate-400 w-full mb-1">
                Wybierz innego mówcę:
              </span>
              {Object.values(players).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelectSpeaker(p.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    state.activeSpeakerId === p.id
                      ? "bg-rose-500 text-slate-950"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* PHASE: ANSWERING */}
      {state.phase === "ANSWERING" && state.currentQuestion && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 text-center">
          <div className="space-y-2">
            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
              Aktualne pytanie:
            </span>
            <h3 className="text-xl font-bold text-white max-w-xl mx-auto leading-relaxed">
              &ldquo;{state.currentQuestion}&rdquo;
            </h3>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            {/* Safe "Pas" Lifeline with ZERO penalty */}
            {(isMeSpeaker || isHost) && (
              <button
                type="button"
                onClick={onPass}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs flex items-center gap-2 border border-slate-700 transition-all"
              >
                <FastForward className="w-4 h-4 text-cyan-400" />
                Pas (Następne pytanie — 0 kary)
              </button>
            )}

            {(isMeSpeaker || isHost) && (
              <button
                type="button"
                onClick={onCompleteAnswer}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
              >
                <CheckCircle className="w-4 h-4" />
                Odpowiedź udzielona (+100 pkt)
              </button>
            )}
          </div>
        </div>
      )}

      {/* PHASE: QUESTION_PICK / SELECTION */}
      {(state.phase === "QUESTION_PICK" || state.phase === "SELECTION") && (
        <div className="space-y-6">
          {/* Tier Selector */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xl">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-rose-400" />
              Wybierz kategorię głębokości:
            </span>
            <div className="flex gap-2">
              {[
                { t: 1 as const, label: "1. Fun & Rozgrzewka" },
                { t: 2 as const, label: "2. Wartości & Doświadczenia" },
                { t: 3 as const, label: "3. Lider & Wyzwania" },
              ].map((item) => (
                <button
                  key={item.t}
                  type="button"
                  onClick={() => onPickQuestion(state.suggestedQuestions[0] || "", item.t)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    state.currentTier === item.t
                      ? "bg-rose-500 text-slate-950 shadow-md"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Suggested Question Deck */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Sugerowane pytania z banku:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {state.suggestedQuestions.map((q, idx) => (
                <div
                  key={idx}
                  onClick={() => (isHost || isMeSpeaker) && onPickQuestion(q, state.currentTier)}
                  className={`p-4 rounded-xl border border-slate-800 bg-slate-900 transition-all flex flex-col justify-between ${
                    isHost || isMeSpeaker
                      ? "hover:border-rose-500/60 hover:bg-slate-800/80 cursor-pointer active:scale-98"
                      : ""
                  }`}
                >
                  <p className="text-xs font-medium text-white leading-relaxed">
                    &ldquo;{q}&rdquo;
                  </p>
                  {(isHost || isMeSpeaker) && (
                    <span className="text-[10px] text-rose-400 font-bold mt-3 block">
                      Wybierz to pytanie &rarr;
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Audience Question Queue & Live Submissions */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-cyan-400" />
                  Kolejka pytań od drużyny ({state.questionQueue.length})
                </h4>
                <p className="text-[11px] text-slate-400">
                  Głosujcie na pytania! Autor wybranego pytania otrzymuje +30 pkt bonusu.
                </p>
              </div>
            </div>

            {/* Submit question box */}
            <form onSubmit={handleCustomQuestionSubmit} className="flex gap-2">
              <input
                type="text"
                required
                maxLength={160}
                value={customQuestionText}
                onChange={(e) => setCustomQuestionText(e.target.value)}
                placeholder="Zadaj własne pytanie liderowi na gorącym krześle..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
              <button
                type="submit"
                disabled={!customQuestionText.trim()}
                className="px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 disabled:opacity-40 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-rose-500/20"
              >
                <Send className="w-3.5 h-3.5" />
                Dodaj
              </button>
            </form>

            {/* Questions Queue List */}
            {state.questionQueue.length > 0 && (
              <div className="space-y-2 pt-2 max-h-56 overflow-y-auto pr-1">
                {state.questionQueue.map((q) => {
                  const hasUpvoted = q.upvotes.includes(currentUserId);
                  return (
                    <div
                      key={q.id}
                      className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] text-slate-400 block">
                          Od: {q.authorName}
                        </span>
                        <p className="text-xs text-white mt-0.5">{q.text}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onUpvoteQuestion(q.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border transition-all ${
                            hasUpvoted
                              ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                              : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                          }`}
                        >
                          <ThumbsUp className="w-3 h-3" />
                          <span>{q.upvotes.length}</span>
                        </button>

                        {(isHost || isMeSpeaker) && (
                          <button
                            type="button"
                            onClick={() => onPickQuestion(q.text)}
                            className="px-2.5 py-1 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-xs"
                          >
                            Wybierz
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* GAME OVER */}
      {state.phase === "GAME_OVER" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
            <Award className="w-10 h-10 text-rose-400" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white">Gorące Krzesło Zakończone!</h3>
            <p className="text-xs text-slate-400 mt-1">
              Dziękujemy za otwartość, zaufanie i wspaniałe historie!
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
