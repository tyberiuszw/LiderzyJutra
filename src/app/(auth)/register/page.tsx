"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChameleonMascot, type MascotState } from "@/components/mascot/ChameleonMascot";
import { ThemeToggle } from "@/components/theme/ThemeControls";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { useI18n } from "@/components/i18n/I18nProvider";
import { CHAMELEON_PRESETS, type ChameleonPalette } from "@/lib/theme/presets";
import { UserPlus, ArrowLeft, AlertCircle, Building2, Ticket, CheckCircle2, Users } from "lucide-react";

interface PublicOrg {
  id: string;
  name: string;
  slug: string;
  _count?: { users: number; teams: number };
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite") || "";
  const { t } = useI18n();

  const [mode, setMode] = useState<"join" | "create">(inviteToken ? "join" : "join");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [joinOrgId, setJoinOrgId] = useState("");
  const [joinMessage, setJoinMessage] = useState("");
  const [publicOrgs, setPublicOrgs] = useState<PublicOrg[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);

  const [selectedPresetId, setSelectedPresetId] = useState("cyber-teal");
  const [mascotState, setMascotState] = useState<MascotState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!inviteToken) {
      setLoadingOrgs(true);
      fetch("/api/orgs/public")
        .then((res) => (res.ok ? res.json() : { organizations: [] }))
        .then((data) => {
          const list = data.organizations || [];
          setPublicOrgs(list);
          if (list.length > 0 && !joinOrgId) {
            setJoinOrgId(list[0].id);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingOrgs(false));
    }
  }, [inviteToken, joinOrgId]);

  const selectedPreset: ChameleonPalette =
    CHAMELEON_PRESETS.find((p) => p.id === selectedPresetId) || CHAMELEON_PRESETS[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);
    setLoading(true);
    setMascotState("thinking");

    try {
      const payload: Record<string, unknown> = {
        email,
        password,
        displayName,
        chameleonColor: selectedPreset.primary,
        chameleonSecondary: selectedPreset.secondary,
        chameleonAccent: selectedPreset.accent,
      };

      if (inviteToken) {
        payload.invitationToken = inviteToken;
      } else if (mode === "join") {
        if (!joinOrgId) {
          setError("Wybierz organizację z listy.");
          setLoading(false);
          setMascotState("urgent");
          return;
        }
        payload.joinOrgId = joinOrgId;
        payload.joinMessage = joinMessage || undefined;
      } else {
        if (!orgName.trim()) {
          setError("Wprowadź nazwę organizacji.");
          setLoading(false);
          setMascotState("urgent");
          return;
        }
        payload.orgName = orgName.trim();
      }

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setMascotState("urgent");
        setError(data.error || t("auth.loginFailed"));
        setLoading(false);
        return;
      }

      setMascotState("celebrate");

      if (data.pendingApproval) {
        setSuccessNotice(data.message || "Rejestracja zakończona sukcesem! Twoje konto oczekuje na zatwierdzenie.");
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 1200);
      } else {
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 500);
      }
    } catch {
      setMascotState("urgent");
      setError(t("common.serverError"));
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-line bg-card p-8 shadow-[var(--shadow-md)]">
      <div className="flex flex-col items-center text-center mb-6">
        <div className="mb-2">
          <ChameleonMascot
            state={mascotState}
            size={110}
            colors={{
              primary: selectedPreset.primary,
              secondary: selectedPreset.secondary,
              accent: selectedPreset.accent,
            }}
          />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          {inviteToken
            ? t("auth.joinTeamTitle")
            : mode === "join"
            ? "Dołącz do organizacji"
            : t("auth.registerOrgTitle")}
        </h1>
        <p className="text-sm text-ink-soft mt-1">
          {inviteToken
            ? t("auth.joinTeamSubtitle")
            : mode === "join"
            ? "Wybierz istniejącą organizację i wyślij prośbę o dołączenie"
            : t("auth.registerOrgSubtitle")}
        </p>
      </div>

      {inviteToken && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-cham/30 bg-cham/10 p-3 text-xs text-cham-text">
          <Ticket size={16} className="shrink-0" />
          <span>{t("auth.inviteTokenNotice")}</span>
        </div>
      )}

      {!inviteToken && (
        <div className="flex rounded-2xl bg-surface p-1 mb-6 border border-line">
          <button
            type="button"
            onClick={() => setMode("join")}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === "join"
                ? "bg-cham text-cham-contrast shadow-sm"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            <Users size={14} />
            Dołącz do istniejącej
          </button>
          <button
            type="button"
            onClick={() => setMode("create")}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === "create"
                ? "bg-cham text-cham-contrast shadow-sm"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            <Building2 size={14} />
            Załóż nową
          </button>
        </div>
      )}

      {successNotice && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-400">
          <CheckCircle2 size={18} className="shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {!inviteToken && mode === "join" && (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-2">
              Wybierz organizację
            </label>
            <div className="relative">
              <select
                value={joinOrgId}
                onChange={(e) => setJoinOrgId(e.target.value)}
                disabled={loadingOrgs || publicOrgs.length === 0}
                className="w-full rounded-2xl border border-line bg-surface px-4 py-3 pl-11 text-sm focus:outline-none focus:ring-2 focus:ring-cham disabled:opacity-50"
              >
                {publicOrgs.length === 0 ? (
                  <option value="">
                    {loadingOrgs ? "Ładowanie organizacji..." : "Brak dostępnych organizacji (załóż nową)"}
                  </option>
                ) : (
                  publicOrgs.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org._count?.users || 0} członków)
                    </option>
                  ))
                )}
              </select>
              <Building2 size={18} className="absolute left-4 top-3.5 text-ink-soft pointer-events-none" />
            </div>

            <div className="mt-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-2">
                Wiadomość do administratora (opcjonalnie)
              </label>
              <input
                type="text"
                value={joinMessage}
                onChange={(e) => setJoinMessage(e.target.value)}
                placeholder="Np. Jestem uczniem klasy 2B / nowym liderem zespołu..."
                className="w-full rounded-2xl border border-line bg-surface px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-cham"
              />
            </div>
          </div>
        )}

        {!inviteToken && mode === "create" && (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-2">
              {t("auth.orgNameLabel")}
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder={t("auth.orgNamePlaceholder")}
                className="w-full rounded-2xl border border-line bg-surface px-4 py-3 pl-11 text-sm focus:outline-none focus:ring-2 focus:ring-cham"
              />
              <Building2 size={18} className="absolute left-4 top-3.5 text-ink-soft" />
            </div>
            <p className="text-[11px] text-ink-soft mt-1.5">
              Nowa organizacja zostanie aktywowana po zatwierdzeniu przez Super Administratora platformy.
            </p>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-2">
            {t("auth.displayNameLabel")}
          </label>
          <input
            type="text"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={t("auth.displayNamePlaceholder")}
            className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cham"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-2">
            {t("auth.emailLabel")}
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("auth.emailPlaceholder")}
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
            placeholder={t("auth.passwordPlaceholder")}
            className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cham"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-2">
            {t("auth.chameleonStyleLabel")}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {CHAMELEON_PRESETS.map((preset) => {
              const isSelected = preset.id === selectedPresetId;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSelectedPresetId(preset.id)}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? "border-cham ring-2 ring-cham/30 bg-cham/5 font-semibold"
                      : "border-line bg-surface hover:border-ink-soft/40"
                  }`}
                >
                  <div
                    className="w-5 h-5 rounded-full shadow-sm"
                    style={{ backgroundColor: preset.primary }}
                  />
                  <span className="text-[11px] truncate max-w-full text-center">
                    {preset.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-full bg-cham px-6 py-3 font-semibold text-cham-contrast transition hover:brightness-105 disabled:opacity-50 mt-6 cursor-pointer"
          style={{ boxShadow: "0 4px 14px var(--chameleon-primary-glow)" }}
        >
          {loading ? (
            <span>{t("auth.registering")}</span>
          ) : (
            <>
              <UserPlus size={18} />
              <span>
                {inviteToken
                  ? t("auth.joinButton")
                  : mode === "join"
                  ? "Wyślij prośbę o dołączenie"
                  : t("auth.registerButton")}
              </span>
            </>
          )}
        </button>
      </form>

      <div className="mt-8 border-t border-line pt-6 text-center text-xs text-ink-soft">
        <p>
          {t("auth.haveAccount")}{" "}
          <Link href="/login" className="font-semibold text-cham-text hover:underline inline-flex items-center gap-1">
            <ArrowLeft size={12} /> {t("nav.login")}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const { t } = useI18n();

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
        <Suspense fallback={<div className="text-center p-8 text-ink-soft">{t("common.loading")}</div>}>
          <RegisterForm />
        </Suspense>
      </main>

      <footer className="text-center text-xs text-ink-soft py-4">
        &copy; {new Date().getFullYear()} Liderzy Jutra. Wszelkie prawa zastrzeżone.
      </footer>
    </div>
  );
}
