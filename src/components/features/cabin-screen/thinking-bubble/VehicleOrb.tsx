"use client";

// The thinking-orbs animation, drawn large enough to fill the thinking bubble. The package's
// <ThinkingOrb> is tuned only at 64, 32 and 20px, and its canvas is sized to match, so stretching
// it with CSS blurs the dots. This draws the same tuned 64px frames from the package's engine onto
// a canvas sized for the display, so the orb stays sharp at 2x.
import { useEffect, useRef } from "react";
import { scaleRadii } from "thinking-orbs";
import { MODE_FRAMES, type OrbState, paintFrame, resolvePreset } from "thinking-orbs/engine";
import { cssVar } from "../map/world";

/** The tuned preset the frames come from. */
const PRESET = 64;
/** Drawn at 2x: 128px, the size the traffic light glyph had in the cloud. */
const SCALE = 2;
/** Bolder dots than the tuned mark, so the orb reads from the back seat. */
const DOT_WEIGHT = 1.5;
/** Where a reduced-motion user's still frame is taken from, as in <ThinkingOrb>. */
const STILL_AT = 0.6;

function rgb(hex: string) {
  const n = Number.parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export type VehicleOrbProps = {
  state: OrbState;
  className?: string;
};

/** Decorative: the bubble's status is announced separately. Client-only; it reads the theme. */
export function VehicleOrb({ state, className }: VehicleOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = Math.min(3, window.devicePixelRatio || 1);
    canvas.width = Math.round(PRESET * SCALE * dpr);
    canvas.height = canvas.width;

    // The orb draws on a canvas and takes an RGB tint, so resolve the token like the map does.
    const root = document.documentElement;
    const dark = root.dataset.theme === "dark" || root.classList.contains("dark");
    const ink = rgb(cssVar("--foreground"));
    const { mode, speed, opts: tuned } = resolvePreset(state, PRESET);
    const opts = scaleRadii(tuned, DOT_WEIGHT);
    const frameAt = MODE_FRAMES[mode];

    const paint = (t: number) => {
      ctx.setTransform(dpr * SCALE, 0, 0, dpr * SCALE, 0, 0);
      ctx.clearRect(0, 0, PRESET, PRESET);
      paintFrame(ctx, frameAt(PRESET, t, opts), dark, ink);
    };

    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      paint(STILL_AT);
      return;
    }
    let raf = 0;
    const loop = () => {
      paint((performance.now() / 1000) * speed);
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [state]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={["size-32", className].filter(Boolean).join(" ")}
    />
  );
}
