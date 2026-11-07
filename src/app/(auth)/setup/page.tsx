"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChameleonMascot, type MascotState } from "@/components/mascot/ChameleonMascot";
import { ThemeToggle } from "@/components/theme/ThemeControls";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { useI18n } from "@/components/i18n/I18nProvider";
import { ShieldCheck, Sparkles, AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";

export default function SetupPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [checking, setChecking] = useState(true);
  const [alreadyInitialized, setAlreadyInitialized] = useState(false);

  const [email, setEmail] = useState("tyberiusz.wylon@gmail.com");
  const [displayName, setDisplayName] = useState("Tyberiusz Wylon");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("Liderzy Jutra HQ");
  const [teamName, setTeamName] = useState("Główny Zespół Liderów");

  const [mascotState, setMascotState] = useState<MascotState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch("/api/auth/setup");
        const data = await res.json();
        if (data.initialized) {
          setAlreadyInitialized(true);
          setMascotState("celebrate");
        }
      } catch (err) {
        console.error("Setup check error:", err);
      } finally {
        setChecking(false);
      }
    }
    checkStatus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setMascotState("thinking");

    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          displayName,
          orgName,
          teamName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMascotState("urgent");
        setError(data.error || t("auth.loginFailed"));
        setLoading(false);
        return;
      }

      setMascotState("celebrate");
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 500);
    } catch {
      setMascotState("urgent");
      setError(t("common.serverError"));
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <ChameleonMascot state="thinking" size={80} />
          <p className="text-sm text-ink-soft">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between p-6">
      <header className="flex items-center justify-between max-w-5xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-3 group">
          <ChameleonMascot size={48} />
          <div>
            <p className="font-bold text-base leading-tight group-hover:text-cham-text transition-colors">
              {t("common.appName")}
            </p>
            <p className="text-xs text-ink-soft">{t("common.appSubtitle")}</p>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-md w-full mx-auto my-8">
        <div className="rounded-3xl border border-line bg-card p-8 shadow-[var(--shadow-md)]">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="mb-2">
              <ChameleonMascot state={mascotState} size={110} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{t("auth.setupTitle")}</h1>
            <p className="text-sm text-ink-soft mt-1">
              {t("auth.setupSubtitle")}
            </p>
          </div>

          {alreadyInitialized ? (
            <div className="space-y-6 text-center">
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-500 text-left">
                <CheckCircle2 size={24} className="shrink-0" />
                <div>
                  <p className="font-semibold">{t("auth.setupSuccess")}</p>
                  <p className="text-xs opacity-90 mt-0.5">
                    {t("auth.setupWarning")}
                  </p>
                </div>
              </div>

              <Link
                href="/login"
                className="w-full flex items-center justify-center gap-2 rounded-full bg-cham px-6 py-3 font-semibold text-cham-contrast transition hover:brightness-105"
                style={{ boxShadow: "0 4px 14px var(--chameleon-primary-glow)" }}
              >
                <span>{t("nav.login")}</span>
                <ArrowRight size={18} />
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500">
                  <AlertCircle size={18} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-2">
                    Superadministrator — {t("auth.emailLabel")}
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cham"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-2">
                    {t("auth.displayNameLabel")}
                  </label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cham"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-2">
                    {t("auth.passwordLabel")}
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cham"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-2">
                    {t("auth.orgNameLabel")}
                  </label>
                  <input
                    type="text"
                    required
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cham"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-2">
                    {t("dashboard.newTeamButton")}
                  </label>
                  <input
                    type="text"
                    required
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cham"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-full bg-cham px-6 py-3 font-semibold text-cham-contrast transition hover:brightness-105 disabled:opacity-50 mt-6 cursor-pointer"
                  style={{ boxShadow: "0 4px 14px var(--chameleon-primary-glow)" }}
                >
                  {loading ? (
                    <span>{t("auth.settingUp")}</span>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      <span>{t("auth.setupButton")}</span>
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          <div className="mt-8 border-t border-line pt-6 text-center text-xs text-ink-soft">
            <p className="flex items-center justify-center gap-1.5">
              <ShieldCheck size={14} className="text-cham-text" />
              <span>Bezpieczeństwo scrypt + zero plaintext credentials</span>
            </p>
          </div>
        </div>
      </main>

      <footer className="text-center text-xs text-ink-soft py-4">
        &copy; {new Date().getFullYear()} Liderzy Jutra. Wszelkie prawa zastrzeżone.
      </footer>
    </div>
  );
}
