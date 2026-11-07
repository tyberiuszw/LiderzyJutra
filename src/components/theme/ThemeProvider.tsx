"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ensureContrast,
  getContrastTextColor,
  hexToRgb,
} from "@/lib/theme/contrast";
import { DEFAULT_PALETTE, type ChameleonPalette } from "@/lib/theme/presets";

export type ThemeMode = "light" | "dark";

const STORAGE_KEY = "tb-theme-v1";
const LIGHT_SURFACE = "#FFFFFF";
const DARK_SURFACE = "#151D2F";

interface StoredTheme {
  mode: ThemeMode;
  palette: ChameleonPalette;
}

interface ThemeContextValue {
  mode: ThemeMode;
  palette: ChameleonPalette;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  setPalette: (palette: ChameleonPalette) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Writes theme tokens to <html>. Pure DOM; also mirrored in the no-flash script. */
export function applyTheme(mode: ThemeMode, palette: ChameleonPalette) {
  const root = document.documentElement;
  root.dataset.theme = mode;
  const surface = mode === "dark" ? DARK_SURFACE : LIGHT_SURFACE;
  const [r, g, b] = hexToRgb(palette.primary);
  root.style.setProperty("--chameleon-primary", palette.primary);
  root.style.setProperty("--chameleon-secondary", palette.secondary);
  root.style.setProperty("--chameleon-accent", palette.accent);
  root.style.setProperty(
    "--chameleon-primary-contrast",
    getContrastTextColor(palette.primary),
  );
  root.style.setProperty("--chameleon-primary-glow", `rgba(${r}, ${g}, ${b}, 0.35)`);
  root.style.setProperty("--chameleon-text", ensureContrast(palette.primary, surface, 4.5));
}

function readStored(): StoredTheme {
  const fallbackMode: ThemeMode =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredTheme;
      if (
        (parsed.mode === "light" || parsed.mode === "dark") &&
        parsed.palette?.primary &&
        parsed.palette?.secondary &&
        parsed.palette?.accent
      ) {
        return parsed;
      }
    }
  } catch {
    /* ignore corrupted storage */
  }
  return { mode: fallbackMode, palette: DEFAULT_PALETTE };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoredTheme>({
    mode: "light",
    palette: DEFAULT_PALETTE,
  });

  // Hydrate from storage once on the client.
  useEffect(() => {
    setState(readStored());
  }, []);

  useEffect(() => {
    applyTheme(state.mode, state.palette);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable */
    }
  }, [state]);

  const setMode = useCallback(
    (mode: ThemeMode) => setState((s) => ({ ...s, mode })),
    [],
  );
  const toggleMode = useCallback(
    () => setState((s) => ({ ...s, mode: s.mode === "dark" ? "light" : "dark" })),
    [],
  );
  const setPalette = useCallback(
    (palette: ChameleonPalette) => setState((s) => ({ ...s, palette })),
    [],
  );

  const value = useMemo(
    () => ({ ...state, setMode, toggleMode, setPalette }),
    [state, setMode, toggleMode, setPalette],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}

/**
 * Inline script run before first paint so the saved theme never flashes.
 * Only sets data-theme and the primary variables; ThemeProvider finishes the rest.
 */
export const NO_FLASH_SCRIPT = `(function(){try{var s=JSON.parse(localStorage.getItem('${STORAGE_KEY}')||'null');var m=s&&s.mode?s.mode:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');var r=document.documentElement;r.dataset.theme=m;if(s&&s.palette){r.style.setProperty('--chameleon-primary',s.palette.primary);r.style.setProperty('--chameleon-secondary',s.palette.secondary);r.style.setProperty('--chameleon-accent',s.palette.accent);}}catch(e){}})();`;
