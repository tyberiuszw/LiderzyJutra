"use client";

import { useI18n, type Locale } from "./I18nProvider";

const LANGUAGES: { id: Locale; label: string; flag: string }[] = [
  { id: "pl", label: "PL", flag: "🇵🇱" },
  { id: "en", label: "EN", flag: "🇬🇧" },
  { id: "uk", label: "UK", flag: "🇺🇦" },
];

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useI18n();

  return (
    <div
      role="group"
      aria-label="Language selection"
      className={`inline-flex items-center rounded-full border border-line bg-card p-1 shadow-[var(--shadow-sm)] ${className}`}
    >
      {LANGUAGES.map((lang) => {
        const active = locale === lang.id;
        return (
          <button
            key={lang.id}
            type="button"
            onClick={() => setLocale(lang.id)}
            aria-pressed={active}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
              active
                ? "bg-cham text-cham-contrast shadow-sm"
                : "text-ink-soft hover:text-ink hover:bg-surface"
            }`}
          >
            <span aria-hidden="true">{lang.flag}</span>
            <span>{lang.label}</span>
          </button>
        );
      })}
    </div>
  );
}
