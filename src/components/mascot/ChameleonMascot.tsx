"use client";

import { motion, type Variants } from "framer-motion";
import {
  CHAMELEON_BODY_PATH,
  CHAMELEON_LOGO_VIEWBOX,
  CHAMELEON_PUPIL_PATH,
  CHAMELEON_SCLERA_PATH,
  CHAMELEON_STAR_FILL_PATH,
  CHAMELEON_STAR_OUTLINE_PATH,
} from "./chameleonLogoPaths";

export type MascotState = "idle" | "drawing" | "thinking" | "celebrate" | "urgent";

interface ChameleonMascotProps {
  state?: MascotState;
  size?: number;
  /** Override the theme colors (used for other players' chameleons). */
  colors?: { primary: string; secondary: string; accent: string };
  className?: string;
  title?: string;
}

const bodyVariants: Variants = {
  idle: {
    y: [0, -6, 0],
    scale: [1, 1.018, 1],
    transition: { duration: 3.4, repeat: Infinity, ease: "easeInOut" },
  },
  drawing: {
    y: [0, -3, 0],
    rotate: [0, 0.8, 0],
    transition: { duration: 1.2, repeat: Infinity, ease: "easeInOut" },
  },
  thinking: {
    rotate: [0, -1.5, 0],
    transition: { duration: 2.6, repeat: Infinity, ease: "easeInOut" },
  },
  celebrate: {
    y: [0, -20, 0],
    rotate: [0, -3, 3, 0],
    transition: { duration: 0.75, repeat: Infinity, ease: "easeOut" },
  },
  urgent: {
    x: [0, -3, 3, 0],
    transition: { duration: 0.18, repeat: Infinity },
  },
};

const starVariants: Variants = {
  idle: {
    y: [0, -5, 0],
    scale: [1, 1.05, 1],
    transition: { duration: 2.8, repeat: Infinity, ease: "easeInOut" },
  },
  drawing: {
    rotate: [0, 6, -4, 0],
    transition: { duration: 1.4, repeat: Infinity, ease: "easeInOut" },
  },
  thinking: {
    y: [0, -8, 0],
    opacity: [0.85, 1, 0.85],
    transition: { duration: 2.2, repeat: Infinity, ease: "easeInOut" },
  },
  celebrate: {
    scale: [1, 1.18, 1],
    rotate: [0, 12, -12, 0],
    transition: { duration: 0.65, repeat: Infinity, ease: "easeInOut" },
  },
  urgent: {
    scale: [1, 1.12, 0.96, 1],
    transition: { duration: 0.25, repeat: Infinity },
  },
};

const CONFETTI = [
  { x: 140, y: 60, c: "var(--m-primary)" },
  { x: 320, y: 30, c: "var(--m-accent)" },
  { x: 520, y: 45, c: "var(--m-secondary)" },
  { x: 760, y: 35, c: "var(--m-primary)" },
  { x: 430, y: 80, c: "var(--m-accent)" },
];

/**
 * Official Liderzy Jutra chameleon logo rendered as a multi-layer parametric SVG.
 * Uses exact vectorized paths from the provided "Logo liderzy Jutra bez napisów" asset
 * so the chameleon with its headset reaching for the shooting star dynamically adapts
 * to the chosen chameleon palette (--chameleon-primary / secondary / accent).
 */
export function ChameleonMascot({
  state = "idle",
  size = 160,
  colors,
  className,
  title = "Liderzy Jutra — Kameleon",
}: ChameleonMascotProps) {
  const style = {
    "--m-primary": colors?.primary ?? "var(--chameleon-primary)",
    "--m-secondary": colors?.secondary ?? "var(--chameleon-secondary)",
    "--m-accent": colors?.accent ?? "var(--chameleon-accent)",
    width: size,
    height: Math.round(size * (500 / 860)),
  } as React.CSSProperties;

  const pupilShift =
    state === "thinking"
      ? { x: 4, y: -5 }
      : state === "drawing"
        ? { x: 5, y: -2 }
        : { x: 0, y: 0 };

  return (
    <svg
      viewBox={CHAMELEON_LOGO_VIEWBOX}
      role="img"
      aria-label={title}
      style={style}
      className={className}
    >
      <title>{title}</title>

      <motion.g
        variants={bodyVariants}
        animate={state}
        style={{ transformOrigin: "430px 380px" }}
      >
        {/* Layer 1 — Official Chameleon Silhouette with Headset & Coiled Tail */}
        <g id="chameleon-body" fill="var(--m-primary)" fillRule="evenodd">
          <path d={CHAMELEON_BODY_PATH} />
        </g>

        {/* Layer 2 — Eye Sclera & Pupil */}
        <g id="chameleon-features" fillRule="evenodd">
          <path d={CHAMELEON_SCLERA_PATH} fill="#FFFFFF" />
          <motion.g
            animate={{
              x: pupilShift.x,
              y: pupilShift.y,
              scaleY: state === "idle" ? [1, 1, 0.12, 1, 1] : 1,
            }}
            transition={{
              duration: 4.2,
              repeat: Infinity,
              times: [0, 0.9, 0.94, 0.98, 1],
            }}
            style={{ transformOrigin: "530px 245px" }}
          >
            <path d={CHAMELEON_PUPIL_PATH} fill="#0F172A" />
          </motion.g>

          {/* State overlays */}
          {state === "drawing" && (
            <motion.g
              animate={{ rotate: [-6, 10, -6] }}
              transition={{ duration: 0.55, repeat: Infinity }}
              style={{ transformOrigin: "670px 150px" }}
            >
              {/* Paintbrush in raised hand */}
              <rect
                x="658"
                y="88"
                width="9"
                height="62"
                rx="4"
                transform="rotate(28 662 118)"
                fill="var(--m-secondary)"
              />
              <path
                d="M674 72 C 684 58, 698 66, 686 84 Z"
                fill="var(--m-accent)"
              />
            </motion.g>
          )}

          {state === "thinking" && (
            <motion.g
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 1.6, repeat: Infinity }}
            >
              <circle
                cx="595"
                cy="115"
                r="28"
                fill="var(--surface-card)"
                stroke="var(--m-secondary)"
                strokeWidth="5"
              />
              <text
                x="595"
                y="129"
                textAnchor="middle"
                fontSize="40"
                fontWeight="700"
                fill="var(--m-primary)"
              >
                ?
              </text>
            </motion.g>
          )}

          {state === "urgent" && (
            <motion.path
              d="M475 180 C 485 196, 485 208, 475 214 C 465 208, 465 196, 475 180 Z"
              fill="#38BDF8"
              animate={{ y: [0, 18], opacity: [1, 0] }}
              transition={{ duration: 0.75, repeat: Infinity }}
            />
          )}
        </g>
      </motion.g>

      {/* Layer 3 & 4 — Shooting Star (Inner Fill + Outline & Rays) */}
      <motion.g
        variants={starVariants}
        animate={state}
        style={{ transformOrigin: "760px 135px" }}
      >
        <g id="chameleon-accent" fill="var(--m-accent)" fillRule="evenodd">
          <path d={CHAMELEON_STAR_FILL_PATH} />
        </g>
        <g id="chameleon-stripes" fill="var(--m-secondary)" fillRule="evenodd">
          <path d={CHAMELEON_STAR_OUTLINE_PATH} />
        </g>
      </motion.g>

      {state === "celebrate" &&
        CONFETTI.map((p, i) => (
          <motion.rect
            key={i}
            x={p.x}
            y={p.y}
            width="16"
            height="16"
            rx="4"
            fill={p.c}
            animate={{ y: [0, 65], opacity: [1, 0], rotate: [0, 160] }}
            transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.14 }}
          />
        ))}
    </svg>
  );
}
