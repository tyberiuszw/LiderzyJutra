"use client";

import React from "react";
import Link from "next/link";
import { ChameleonMascot } from "@/components/mascot/ChameleonMascot";
import {
  Users,
  Compass,
  Search,
  Layout,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

export default function TeamworkPage() {
  const activities = [
    {
      title: "Wyzwanie Przetrwania (Survival Challenge)",
      desc: "Lost at Sea i NASA Moon Survival: indywidualny ranking solo, synchronizacja zespołu w podgrupach i matematyczna analiza zysku z synergii.",
      icon: <Compass className="w-5 h-5 text-cyan-400" />,
      tag: "Podejmowanie Decyzji & Synergia",
    },
    {
      title: "Śledztwo & Dzielenie Informacji (Deduction Suite)",
      desc: "Zin Obelisk (33 poszlaki), Dracula (negocjacje), Zagadka TechStream i Tajemnica Planu Filmowego. Praca głosem bez pokazywania ekranu.",
      icon: <Search className="w-5 h-5 text-purple-400" />,
      tag: "Komunikacja & Przełamywanie Silosów",
    },
    {
      title: "Tablica Interaktywna (Jamboard)",
      desc: "Kolorowe karteczki, wielokolorowy rysik, oznaczanie poszlak (alibi, podejrzenia, fakty) i burza mózgów w czasie rzeczywistym.",
      icon: <Layout className="w-5 h-5 text-amber-400" />,
      tag: "Warsztaty & Kolaboracja",
    },
    {
      title: "Rysowanie (Pictionary / skribbl.io)",
      desc: "Rysowanie na żywo z podpowiedziami literowymi, dynamicznym czasem, czatem zgadujących i podium dla najlepszych artystów.",
      icon: <Sparkles className="w-5 h-5 text-emerald-400" />,
      tag: "Kreatywność & Rozluźnienie",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <ChameleonMascot size={36} state="idle" />
            <div>
              <p className="font-bold text-sm text-white">Liderzy Jutra</p>
              <p className="text-[11px] text-cyan-400 font-mono">/teamwork</p>
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
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30"
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
              <span>Przejdź do Panelu</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12 flex-1 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold">
            <Users className="w-3.5 h-3.5" />
            <span>Platforma Budowania Zespołów Zdalnych</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Metodyka Teamwork & Integracji
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Przestrzeń stworzona dla szkół, organizacji młodzieżowych i zespołów projektowych, aby budować zaufanie, przełamywać bariery komunikacyjne i rozwijać przywództwo jutra.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {activities.map((act, idx) => (
            <div
              key={idx}
              className="p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 transition shadow-xl space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700">
                  {act.icon}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {act.tag}
                </span>
              </div>
              <h3 className="text-base font-bold text-white">{act.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{act.desc}</p>
            </div>
          ))}
        </div>

        {/* Remote Team Principles */}
        <div className="p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-cyan-950/30 border border-slate-800 shadow-2xl space-y-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">Trzy Zasady Zespołów Liderów Jutra</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
              <span className="font-bold text-cyan-300">1. Bezpieczeństwo psychologiczne</span>
              <p className="text-slate-400 leading-relaxed">
                Każdy głos ma znaczenie. Błędy są okazją do nauki, a cisi eksperci są zachęcani do dzielenia się swoimi poszlakami.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
              <span className="font-bold text-amber-300">2. Kooperacja ponad rywalizację</span>
              <p className="text-slate-400 leading-relaxed">
                Gry takie jak Dracula czy NASA Survival pokazują, że wymiana informacji i negocjacje dają lepsze rezultaty niż praca w silosach.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
              <span className="font-bold text-emerald-300">3. Zintegrowane spotkania wideo</span>
              <p className="text-slate-400 leading-relaxed">
                Jednoklikowe łączenie z Google Meet, Zoom lub Discordem pozwala na naturalną dyskusję głosową równolegle z interaktywną aplikacją.
              </p>
            </div>
          </div>
          <div className="pt-2 flex flex-wrap justify-center gap-4">
            <Link
              href="/dashboard"
              className="px-6 py-3 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-cyan-500/20"
            >
              Uruchom sesję warsztatową
            </Link>
            <Link
              href="/boost"
              className="px-6 py-3 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs transition"
            >
              Losuj energizer na /boost
            </Link>
            <Link
              href="/goal"
              className="px-6 py-3 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold text-xs transition"
            >
              Poznaj misję na /goal
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
