"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChameleonMascot, MascotState } from "@/components/mascot/ChameleonMascot";
import {
  RotateCw,
  ArrowRight,
  Flame,
  HelpCircle,
  Play,
} from "lucide-react";

const BOOST_PROMPTS = [
  {
    category: "Supermoce",
    question: "Gdybyś mógł/mogła mieć jedną supermoc w pracy zespołowej na dzisiejszy dzień, co by to było?",
    tip: "Świetne na szybki warm-up 2-minutowy na początek spotkania.",
  },
  {
    category: "Dylemat Błyskawiczny",
    question: "Wolisz cofnąć się w czasie o 100 lat i być geniuszem, czy przenieść się 100 lat w przód i uczyć się wszystkiego od zera?",
    tip: "Wywołuje natychmiastową, wesołą dyskusję w zespole.",
  },
  {
    category: "Wdzięczność & Docenienie",
    question: "Wymień jedną małą rzecz, za którą jesteś dziś wdzięczny/a osobie po Twojej prawej stronie (lub ostatnio zabierającej głos).",
    tip: "Buduje natychmiastowe poczucie bliskości i bezpieczeństwa.",
  },
  {
    category: "Kreatywność Zespołu",
    question: "Wymyślcie w 60 sekund najbardziej szalony produkt łączący parasol i toster.",
    tip: "Przełamuje tremę przed mówieniem i uruchamia kreatywne myślenie.",
  },
  {
    category: "Autentyczność",
    question: "Jaki był Twój najbardziej zabawny lub nieoczekiwany błąd w pierwszym tygodniu pracy / projektu?",
    tip: "Normalizuje popełnianie błędów i zmniejsza dystans między uczestnikami.",
  },
];

export default function BoostPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mascotState, setMascotState] = useState<MascotState>("celebrate");

  const handleNextBoost = () => {
    setCurrentIndex((prev) => (prev + 1) % BOOST_PROMPTS.length);
    setMascotState((prev) => (prev === "celebrate" ? "thinking" : "celebrate"));
  };

  const currentBoost = BOOST_PROMPTS[currentIndex];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <ChameleonMascot size={36} state="idle" />
            <div>
              <p className="font-bold text-sm text-white">Liderzy Jutra</p>
              <p className="text-[11px] text-amber-400 font-mono">/boost</p>
            </div>
          </Link>
          <nav className="hidden sm:flex items-center gap-2">
            <Link
              href="/goal"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-emerald-400 hover:bg-slate-800 transition"
            >
              /goal
            </Link>
            <Link
              href="/teamwork"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-cyan-400 hover:bg-slate-800 transition"
            >
              /teamwork
            </Link>
            <Link
              href="/boost"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30"
            >
              /boost
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-md flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Graj w Zespole</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Boost Workspace */}
      <main className="max-w-4xl mx-auto px-6 py-12 flex-1 flex flex-col items-center justify-center space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Team Energy Booster</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Zastrzyk Energii dla Twojego Zespołu
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
            Masz 3 minuty przed spotkaniem lub po przerwie obiadowej? Wylosuj energizer i obudź zaangażowanie grupy!
          </p>
        </div>

        {/* Mascot & Card */}
        <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                Kategoria: {currentBoost.category}
              </span>
            </div>
            <span className="text-xs font-mono text-slate-500">
              #{currentIndex + 1} / {BOOST_PROMPTS.length}
            </span>
          </div>

          <div className="min-h-32 flex flex-col justify-center space-y-4 text-center sm:text-left">
            <h2 className="text-xl sm:text-2xl font-black text-white leading-snug">
              &quot;{currentBoost.question}&quot;
            </h2>
            <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-slate-400">
              <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Wskazówka facylitatora: {currentBoost.tip}</span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              type="button"
              onClick={handleNextBoost}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCw className="w-4 h-4" />
              <span>Losuj kolejny energizer</span>
            </button>

            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition border border-slate-700 flex items-center justify-center gap-2"
            >
              <span>Uruchom pełną grę w pokoju</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <ChameleonMascot size={100} state={mascotState} />
          <p className="text-[11px] text-slate-500 font-mono">
            Kameleon Liderzy Jutra czuwa nad energią Twojego zespołu!
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/goal"
              className="text-xs px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-emerald-400 hover:border-emerald-500/50 transition"
            >
              Misja i cel: /goal
            </Link>
            <Link
              href="/teamwork"
              className="text-xs px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-cyan-400 hover:border-cyan-500/50 transition"
            >
              Metodyka zespołu: /teamwork
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
