"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import plMessages from "../../../messages/pl.json";
import enMessages from "../../../messages/en.json";
import ukMessages from "../../../messages/uk.json";

export type Locale = "pl" | "en" | "uk";
export const SUPPORTED_LOCALES: Locale[] = ["pl", "en", "uk"];
export const DEFAULT_LOCALE: Locale = "pl";

export interface I18nContextValue {
  locale: Locale;
  setLocale: (newLocale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const catalogs: Record<Locale, Record<string, unknown>> = {
  pl: plMessages as unknown as Record<string, unknown>,
  en: enMessages as unknown as Record<string, unknown>,
  uk: ukMessages as unknown as Record<string, unknown>,
};

const I18nContext = createContext<I18nContextValue | null>(null);

function resolvePath(obj: unknown, path: string): string | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  const segments = path.split(".");
  let current: unknown = obj;
  for (const seg of segments) {
    if (current && typeof current === "object" && seg in current) {
      current = (current as Record<string, unknown>)[seg];
    } else {
      return undefined;
    }
  }
  return typeof current === "string" ? current : undefined;
}

export function I18nProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    // Read from cookie or localStorage on initial client mount
    try {
      const match = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/);
      const savedCookie = match ? match[1] : null;
      const savedLocal = localStorage.getItem("tb_locale");
      const active = (savedCookie || savedLocal) as Locale;
      if (active && SUPPORTED_LOCALES.includes(active)) {
        setLocaleState(active);
        document.documentElement.lang = active;
      }
    } catch {
      // Ignore client storage errors
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    if (!SUPPORTED_LOCALES.includes(newLocale)) return;
    setLocaleState(newLocale);
    try {
      localStorage.setItem("tb_locale", newLocale);
      document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
      document.documentElement.lang = newLocale;
    } catch {
      // Ignore client storage errors
    }
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      // 1. Search in current locale catalog
      let val = resolvePath(catalogs[locale], key);

      // 2. Resilient fallback to Polish catalog
      if (val === undefined && locale !== "pl") {
        val = resolvePath(catalogs.pl, key);
      }

      // 3. Fallback to key itself
      if (val === undefined) {
        return key;
      }

      // 4. Interpolate parameters {name}, {count}, etc.
      if (params) {
        return val.replace(/\{(\w+)\}/g, (_, k) =>
          params[k] !== undefined ? String(params[k]) : `{${k}}`
        );
      }

      return val;
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return ctx;
}
