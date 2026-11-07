export interface ChameleonPalette {
  id: string;
  /** i18n-ready name; translated catalogs arrive in Milestone 3. */
  name: string;
  primary: string;
  secondary: string;
  accent: string;
}

export const CHAMELEON_PRESETS: ChameleonPalette[] = [
  { id: "cyber-teal", name: "Cyber Teal", primary: "#06B6D4", secondary: "#3B82F6", accent: "#10B981" },
  { id: "sunset-blaze", name: "Sunset Blaze", primary: "#FF6B4A", secondary: "#F59E0B", accent: "#EC4899" },
  { id: "deep-violet", name: "Deep Violet", primary: "#7C3AED", secondary: "#6366F1", accent: "#06B6D4" },
  { id: "neon-lime", name: "Neon Lime", primary: "#10B981", secondary: "#14B8A6", accent: "#FACC15" },
  { id: "cosmic-berry", name: "Cosmic Berry", primary: "#EC4899", secondary: "#A855F7", accent: "#38BDF8" },
  { id: "solar-flare", name: "Solar Flare", primary: "#F59E0B", secondary: "#EF4444", accent: "#84CC16" },
];

export const DEFAULT_PALETTE = CHAMELEON_PRESETS[0];

