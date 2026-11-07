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
  Users,
  Flame,
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
          <nav className="hidden sm:flex items-center gap-2">
            <Link
              href="/goal"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30"
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
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-amber-400 hover:bg-slate-800 transition"
            >
              /boost
            </Link>
          </nav>
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

        {/* Interactive Showcase: You can use /teamwork /boost */}
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Narzędzia Zespołowe: Skorzystaj z /teamwork oraz /boost
            </h2>
            <p className="text-xs text-slate-400 max-w-xl mx-auto">
              Realizuj cele platformy w praktyce — wybierz metodykę warsztatową lub szybki booster energii przed spotkaniem.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 transition shadow-xl flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 w-fit">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    /teamwork
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">Metodyka Teamwork & 10 Modułów Gier</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Dowiedz się, jak Survival Challenge, Zin Obelisk, Dracula Negotiator oraz Pictionary przełamują silosy i uczą podejmowania decyzji w grupie.
                </p>
              </div>
              <Link
                href="/teamwork"
                className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2"
              >
                <span>Przejdź do /teamwork</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition shadow-xl flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 w-fit">
                    <Flame className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    /boost
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">Team Energy Booster (Energizery)</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Szybki 3-minutowy rozgrzewacz przed spotkaniem! Losuj dylematy, pytania o supermoce, wyzwania kreatywne i lodołamacze.
                </p>
              </div>
              <Link
                href="/boost"
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2"
              >
                <span>Uruchom /boost</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
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
