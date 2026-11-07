"use client";

import React from "react";
import Link from "next/link";
import { ChameleonMascot } from "@/components/mascot/ChameleonMascot";
import {
  Target,
  HeartHandshake,
  Compass,
  ArrowRight,
  Sparkles,
  Rocket,
  CheckCircle2,
} from "lucide-react";

export default function GoalPage() {
  const goals = [
    {
      title: "Przełamywanie Silosów i Barier",
      desc: "Zdalna praca i nauka często zamykają nas we własnych bańkach. Naszym celem jest tworzenie interaktywnych mostów, które uczą współdzielenia wiedzy i otwartej komunikacji.",
      icon: <HeartHandshake className="w-5 h-5 text-cyan-400" />,
    },
    {
      title: "Kształtowanie Kompetencji Przyszłości",
      desc: "Krytyczne myślenie, wspólne podejmowanie decyzji pod presją czasu (Survival Challenge) oraz dedukcja logiczna (Zin Obelisk) to fundamenty nowoczesnego przywództwa.",
      icon: <Target className="w-5 h-5 text-emerald-400" />,
    },
    {
      title: "Włączająca i Bezpieczna Przestrzeń",
      desc: "Autentyczne trójjęzyczne wsparcie (Polski, Ukraiński, Angielski), ochrona przed hejtem (filtry wulgaryzmów) oraz dbałość o kontrast (WCAG AA).",
      icon: <Compass className="w-5 h-5 text-amber-400" />,
    },
    {
      title: "Zwinna i Otwarta Technologia",
      desc: "Next.js 15, Socket.io zintegrowany na jednym porcie, gotowość do wdrożenia w chmurze (Railway/Render/Fly/Docker) oraz architektura multi-tenant z Super Adminem.",
      icon: <Rocket className="w-5 h-5 text-purple-400" />,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <ChameleonMascot size={36} state="celebrate" />
            <div>
              <p className="font-bold text-sm text-white">Liderzy Jutra</p>
              <p className="text-[11px] text-emerald-400 font-mono">/goal</p>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow-md flex items-center gap-1.5"
            >
              <span>Otwórz Aplikację</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-12 flex-1 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
            <Target className="w-3.5 h-3.5" />
            <span>Misja & Wizja Liderzy Jutra</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Cel Platformy: Budować Zespoły Przyszłości
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Projekt powstał, aby dostarczyć facilitatorom, nauczycielom i liderom młodzieżowym gotowe, angażujące narzędzie integracyjne do pracy zdalnej i hybrydowej.
          </p>
        </div>

        {/* Goals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {goals.map((g, idx) => (
            <div
              key={idx}
              className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3 hover:border-emerald-500/40 transition"
            >
              <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 w-fit">
                {g.icon}
              </div>
              <h3 className="text-base font-bold text-white">{g.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{g.desc}</p>
            </div>
          ))}
        </div>

        {/* Mascot Meaning Section */}
        <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col md:flex-row items-center gap-8">
          <div className="shrink-0">
            <ChameleonMascot size={160} state="celebrate" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold">
              <Sparkles className="w-4 h-4" />
              <span>Dlaczego Kameleon ze Słuchawkami i Gwiazdą?</span>
            </div>
            <h2 className="text-xl font-bold text-white">Symbolika Maskotki Liderzy Jutra</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Kameleon symbolizuje <strong>elastyczność i zdolność adaptacji</strong> do dynamicznie zmieniających się warunków współczesnego świata. Słuchawki z mikrofonem odzwierciedlają <strong>gotowość do uważnego słuchania i otwartej komunikacji zdalnej</strong>, a wyciągnięta łapka sięgająca spadającej gwiazdy przypomina, że każdy młody lider ma prawo sięgać po swoje najśmielsze marzenia.
            </p>
            <div className="pt-2 flex flex-wrap gap-2 text-[11px] text-slate-400">
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> liderzyjutra.com</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 10 Gotowych Modułów</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Trójjęzyczność PL/EN/UK</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
