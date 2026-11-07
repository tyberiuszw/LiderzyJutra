"use client";

import { Moon, Sun } from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { CHAMELEON_PRESETS } from "@/lib/theme/presets";
import { ensureReadablePrimary, hslToHex } from "@/lib/theme/contrast";

export function ThemeToggle() {
  const { mode, toggleMode } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleMode}
      aria-label={mode === "dark" ? "Motyw jasny" : "Motyw ciemny"}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-card text-ink transition hover:bg-hover-surface"
    >
      {mode === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

export function ChameleonColorPicker() {
  const { palette, setPalette } = useTheme();
  const [hue, setHue] = useState(190);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Kolory kameleona">
        {CHAMELEON_PRESETS.map((p) => {
          const active = p.id === palette.id;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={p.name}
              title={p.name}
              onClick={() => setPalette(p)}
              className="h-10 w-10 rounded-full transition hover:scale-110"
              style={{
                background: `linear-gradient(135deg, ${p.primary} 50%, ${p.secondary} 50%)`,
                boxShadow: active
                  ? `0 0 0 3px var(--surface-card), 0 0 0 5px ${p.primary}`
                  : "var(--shadow-sm)",
              }}
            />
          );
        })}
      </div>

      <label className="block text-sm text-ink-soft">
        Własny odcień
        <input
          type="range"
          min={0}
          max={359}
          value={hue}
          onChange={(e) => {
            const h = Number(e.target.value);
            setHue(h);
            setPalette({
              id: "custom",
              name: "Custom",
              primary: ensureReadablePrimary(hslToHex(h, 82, 52)),
              secondary: hslToHex((h + 35) % 360, 80, 55),
              accent: hslToHex((h + 150) % 360, 70, 48),
            });
          }}
          className="mt-2 block h-3 w-full cursor-pointer appearance-none rounded-full"
          style={{
            background:
              "linear-gradient(90deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)",
          }}
        />
      </label>
    </div>
  );
}
