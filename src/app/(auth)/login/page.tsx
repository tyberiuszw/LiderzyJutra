"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChameleonMascot, type MascotState } from "@/components/mascot/ChameleonMascot";
import { ThemeToggle } from "@/components/theme/ThemeControls";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { useI18n } from "@/components/i18n/I18nProvider";
import { LogIn, ArrowRight, AlertCircle, Sparkles } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mascotState, setMascotState] = useState<MascotState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setMascotState("thinking");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
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
            <h1 className="text-2xl font-bold tracking-tight">{t("auth.loginTitle")}</h1>
            <p className="text-sm text-ink-soft mt-1">
              {t("auth.loginSubtitle")}
            </p>
          </div>

          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-2">
                {t("auth.emailLabel")}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={t("auth.emailPlaceholder")}
                className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cham"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft">
                  {t("auth.passwordLabel")}
                </label>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={t("auth.passwordPlaceholder")}
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
                <span>{t("auth.loggingIn")}</span>
              ) : (
                <>
                  <LogIn size={18} />
                  <span>{t("auth.loginButton")}</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 border-t border-line pt-6 text-center text-xs text-ink-soft space-y-2">
            <p>
              {t("auth.noAccount")}{" "}
              <Link href="/register" className="font-semibold text-cham-text hover:underline inline-flex items-center gap-1">
                {t("auth.registerLink")} <ArrowRight size={12} />
              </Link>
            </p>
            <p>
              <Link href="/setup" className="font-semibold text-cham-text hover:underline inline-flex items-center gap-1">
                {t("auth.setupTitle")} <Sparkles size={12} />
              </Link>
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
