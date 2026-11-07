"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChameleonMascot, type MascotState } from "@/components/mascot/ChameleonMascot";
import { ChameleonColorPicker, ThemeToggle } from "@/components/theme/ThemeControls";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { useI18n } from "@/components/i18n/I18nProvider";
import { ArrowRight, LogIn, LayoutDashboard, Play, Sparkles } from "lucide-react";

export default function Home() {
  const { t } = useI18n();
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");

  const handleQuickPlay = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let suffix = "";
    for (let i = 0; i < 4; i++) {
      suffix += chars[Math.floor(Math.random() * chars.length)];
    }
    router.push(`/room/LJ-${suffix}`);
  };

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = joinCode.trim().toUpperCase();
    if (!cleaned) return;
    const formatted = cleaned.startsWith("LJ-") ? cleaned : `LJ-${cleaned}`;
    router.push(`/room/${formatted}`);
  };

  const states: { id: MascotState; labelKey: string }[] = [
    { id: "idle", labelKey: "home.states.idle" },
    { id: "drawing", labelKey: "home.states.drawing" },
    { id: "thinking", labelKey: "home.states.thinking" },
    { id: "celebrate", labelKey: "home.states.celebrate" },
    { id: "urgent", labelKey: "home.states.urgent" },
  ];

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-10">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ChameleonMascot size={76} />
          <div>
            <p className="text-lg font-bold leading-tight">{t("common.appName")}</p>
            <p className="text-sm text-ink-soft">{t("common.appSubtitle")}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/goal"
            className="hidden md:flex items-center text-xs font-semibold text-ink-soft hover:text-ink transition-colors font-mono"
          >
            /goal
          </Link>
          <Link
            href="/teamwork"
            className="hidden md:flex items-center text-xs font-semibold text-ink-soft hover:text-ink transition-colors font-mono"
          >
            /teamwork
          </Link>
          <Link
            href="/boost"
            className="hidden md:flex items-center text-xs font-semibold text-ink-soft hover:text-ink transition-colors font-mono"
          >
            /boost
          </Link>
          <Link
            href="/dashboard"
            className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-ink-soft hover:text-ink transition-colors"
          >
            <LayoutDashboard size={14} />
            <span>{t("nav.dashboard")}</span>
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-1.5 rounded-full border border-line bg-card px-4 py-2 text-xs font-semibold text-ink hover:bg-surface transition-colors"
          >
            <LogIn size={14} />
            <span>{t("nav.login")}</span>
          </Link>
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>

      <section className="grid items-center gap-8 rounded-3xl border border-line bg-card p-8 shadow-[var(--shadow-md)] md:grid-cols-2">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            {t("home.heroTitle")}{" "}
            <span className="text-cham-text">{t("home.heroTitleHighlight")}</span>
          </h1>
          <p className="text-ink-soft">
            {t("home.heroDescription")}
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={handleQuickPlay}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-cham px-6 py-3 font-semibold text-cham-contrast transition hover:brightness-105"
              style={{ boxShadow: "0 4px 14px var(--chameleon-primary-glow)" }}
            >
              <Play size={18} />
              <span>{t("dashboard.launchRoomAction")}</span>
            </button>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-6 py-3 font-semibold text-ink transition hover:bg-card"
            >
              <span>{t("home.startAction")}</span>
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-5 py-3 text-sm font-semibold text-ink-soft transition hover:text-ink"
            >
              <Sparkles size={16} />
              <span>{t("home.registerTeamAction")}</span>
            </Link>
          </div>
          <form onSubmit={handleJoinByCode} className="flex flex-wrap items-center gap-2 pt-3">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="LJ-XXXX"
              aria-label={t("dashboard.roomCodeLabel")}
              className="w-40 rounded-full border border-line bg-surface px-4 py-2 text-sm font-mono uppercase text-ink placeholder:text-ink-soft/60 focus:border-cham focus:outline-none"
            />
            <button
              type="submit"
              className="cursor-pointer rounded-full border border-line bg-card px-4 py-2 text-sm font-semibold text-ink transition hover:border-cham"
            >
              {t("dashboard.joinRoomButton")}
            </button>
          </form>
        </div>
        <div className="flex justify-center">
          <ChameleonMascot size={320} />
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4 rounded-3xl border border-line bg-card p-6">
          <h2 className="text-lg font-semibold">{t("home.colorPickerTitle")}</h2>
          <p className="text-sm text-ink-soft">
            {t("home.colorPickerDescription")}
          </p>
          <ChameleonColorPicker />
        </div>

        <div className="rounded-3xl border border-line bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">{t("home.mascotStatesTitle")}</h2>
          <div className="grid grid-cols-5 gap-2">
            {states.map((s) => (
              <div key={s.id} className="flex flex-col items-center gap-1">
                <ChameleonMascot state={s.id} size={90} />
                <span className="text-xs text-ink-soft">{t(s.labelKey)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-between border-t border-line pt-6 text-xs text-ink-soft">
        <p>© 2026 Liderzy Jutra. Budujemy Zespoły Przyszłości.</p>
        <div className="flex items-center gap-4">
          <Link href="/goal" className="hover:text-ink transition-colors font-mono">
            /goal
          </Link>
          <Link href="/teamwork" className="hover:text-ink transition-colors font-mono">
            /teamwork
          </Link>
          <Link href="/boost" className="hover:text-ink transition-colors font-mono">
            /boost
          </Link>
          <Link href="/dashboard" className="hover:text-ink transition-colors">
            {t("nav.dashboard")}
          </Link>
        </div>
      </footer>
    </main>
  );
}
