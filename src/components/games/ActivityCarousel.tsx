"use client";

import React from "react";
import {
  Palette,
  Eye,
  Split,
  BookOpen,
  Sparkles,
  Trophy,
  Grid,
  Users,
  Clock,
  Play,
  Check,
  Compass,
  Search,
  Layout,
} from "lucide-react";
import { GameType } from "@/server/types";

export interface ActivityInfo {
  id: GameType;
  title: string;
  tagline: string;
  players: string;
  duration: string;
  category: string;
  badgeColor: string;
  gradient: string;
  icon: React.ElementType;
}

export const ACTIVITIES: ActivityInfo[] = [
  {
    id: "RYSOWANIE",
    title: "Rysowanie",
    tagline: "Rysuj hasła i zgaduj szkice znajomych w czasie rzeczywistym z płynną animacją.",
    players: "3–16 graczy",
    duration: "15–30 min",
    category: "Kreatywność",
    badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
    gradient: "from-cyan-500/20 to-blue-600/10 border-cyan-500/30",
    icon: Palette,
  },
  {
    id: "TWO_TRUTHS",
    title: "Dwie Prawdy i Kłamstwo",
    tagline: "Ułóż 2 prawdy i 1 sprytne kłamstwo. Zmierz się z detektywami z drużyny!",
    players: "3–30 graczy",
    duration: "10–20 min",
    category: "Integracja",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    gradient: "from-emerald-500/20 to-teal-600/10 border-emerald-500/30",
    icon: Eye,
  },
  {
    id: "THIS_OR_THAT",
    title: "To czy Tamto",
    tagline: "Szybkie dylematy technologiczne i życiowe. Kto zostanie Jedynym Wybrańcem?",
    players: "2–100 graczy",
    duration: "5–10 min",
    category: "Szybki Warmup",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    gradient: "from-amber-500/20 to-rose-600/10 border-amber-500/30",
    icon: Split,
  },
  {
    id: "STORY_CHAIN",
    title: "Wspólna Historia",
    tagline: "Budujcie opowieść słowo po słowie lub zdanie po zdaniu z niespodziewanymi zwrotami akcji.",
    players: "3–20 graczy",
    duration: "10–15 min",
    category: "Współpraca",
    badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
    gradient: "from-indigo-500/20 to-purple-600/10 border-indigo-500/30",
    icon: BookOpen,
  },
  {
    id: "HOT_SEAT",
    title: "Gorące Krzesło / Lider",
    tagline: "Głębokie pytania w bezpiecznej atmosferze. Koło ratunkowe Pas chroni przed presją.",
    players: "3–30 graczy",
    duration: "15–25 min",
    category: "Refleksja & Empatia",
    badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/40",
    gradient: "from-rose-500/20 to-orange-600/10 border-rose-500/30",
    icon: Sparkles,
  },
  {
    id: "QUIZ_SUPERLATIVES",
    title: "Kto w Drużynie...",
    tagline: "Głosujcie na kolegów z zespołu w pozytywnych kategoriach i stwórzcie Księgę Pamiątkową.",
    players: "4–50 graczy",
    duration: "10–15 min",
    category: "Docenianie",
    badgeColor: "bg-violet-500/20 text-violet-300 border-violet-500/40",
    gradient: "from-violet-500/20 to-indigo-600/10 border-violet-500/30",
    icon: Trophy,
  },
  {
    id: "HUMAN_BINGO",
    title: "Bingo Integracyjne",
    tagline: "Odkrywajcie ukryte talenty i cechy znajomych. Weryfikujcie kafelki i krzyczcie BINGO!",
    players: "6–60 graczy",
    duration: "15–20 min",
    category: "Networking",
    badgeColor: "bg-teal-500/20 text-teal-300 border-teal-500/40",
    gradient: "from-teal-500/20 to-emerald-600/10 border-teal-500/30",
    icon: Grid,
  },
  {
    id: "SURVIVAL_CHALLENGE",
    title: "Wyzwanie Przetrwania (Survival)",
    tagline: "Lost at Sea & NASA Moon Survival: ranking solo, zespołowy i analiza synergii decyzyjnej.",
    players: "3–30 graczy",
    duration: "20–35 min",
    category: "Kooperacja & Podejmowanie Decyzji",
    badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
    gradient: "from-cyan-500/20 to-teal-600/10 border-cyan-500/30",
    icon: Compass,
  },
  {
    id: "INFORMATION_DEDUCTION",
    title: "Śledztwo & Dedykacja",
    tagline: "Zin Obelisk, Dracula, Murder Mystery: zbieranie faktów bez pokazywania ekranu.",
    players: "3–30 graczy",
    duration: "20–40 min",
    category: "Komunikacja & Rozwiązywanie Problemów",
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    gradient: "from-purple-500/20 to-indigo-600/10 border-purple-500/30",
    icon: Search,
  },
  {
    id: "COLLABORATIVE_BOARD",
    title: "Tablica Jamboard",
    tagline: "Współdzielona tablica warsztatowa: kolorowe karteczki, szkicownik i poszlaki.",
    players: "2–50 graczy",
    duration: "Elastyczny",
    category: "Burza Mózgów & Warsztaty",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    gradient: "from-amber-500/20 to-orange-600/10 border-amber-500/30",
    icon: Layout,
  },
];

interface ActivityCarouselProps {
  currentGameType: GameType;
  isHost: boolean;
  onSelectGame: (gameType: GameType) => void;
  onClose?: () => void;
}

export function ActivityCarousel({
  currentGameType,
  isHost,
  onSelectGame,
  onClose,
}: ActivityCarouselProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            Wybierz Aktywność Zespołową
          </h2>
          <p className="text-xs text-slate-400">
            {isHost
              ? "Jako gospodarz możesz przełączać gry w dowolnym momencie bez rozłączania pokoju."
              : "Przeglądaj dostępne aktywności w warsztacie Liderzy Jutra."}
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700"
          >
            Zamknij
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-[70vh] overflow-y-auto pr-1">
        {ACTIVITIES.map((act) => {
          const Icon = act.icon;
          const isSelected = act.id === currentGameType;

          return (
            <div
              key={act.id}
              className={`p-4 rounded-xl border bg-gradient-to-br transition-all flex flex-col justify-between ${
                act.gradient
              } ${
                isSelected
                  ? "ring-2 ring-cyan-400 shadow-lg shadow-cyan-500/20"
                  : "hover:border-slate-600"
              }`}
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-lg bg-slate-900/80 border border-slate-700 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-cyan-400" />
                  </div>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${act.badgeColor}`}
                  >
                    {act.category}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                    {act.title}
                    {isSelected && (
                      <span className="text-[10px] bg-cyan-500 text-slate-950 font-black px-1.5 py-0.5 rounded">
                        AKTYWNA
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 line-clamp-2">
                    {act.tagline}
                  </p>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    {act.players}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    {act.duration}
                  </span>
                </div>
              </div>

              <div className="pt-4 mt-3 border-t border-slate-800/80">
                {isHost ? (
                  <button
                    type="button"
                    onClick={() => onSelectGame(act.id)}
                    disabled={isSelected}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      isSelected
                        ? "bg-slate-800 text-slate-400 cursor-default"
                        : "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20 active:scale-98"
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-cyan-400" />
                        Obecnie Wybrana
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        Przełącz na tę grę
                      </>
                    )}
                  </button>
                ) : (
                  <div className="text-[11px] text-center text-slate-500 italic">
                    {isSelected ? "Trwająca aktywność" : "Oczekuje na wybór gospodarza"}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
