"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore,
  type HTMLAttributes,
  type Ref,
} from "react";
import {
  ImageGeneration,
  PRESETS,
  type ImageGenerationHandle,
  type ImageGenerationPreset,
} from "img-fx";
import { cssColor, cssVar } from "@/lib/css-var";

export interface ScanIndicatorProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** While true, the pixel mosaic churns. Set false to dissolve into `src`. @default true */
  scanning?: boolean;
  /** Image revealed once scanning ends. Without it the indicator just keeps churning. */
  src?: string;
  /** img-fx shader preset. See docs/decisions/scan-indicator.md. @default "pixels-mechanic" */
  preset?: ImageGenerationPreset;
  /** Sizes and shapes the surface. @default "size-80 rounded-3xl" */
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

type Theme = "light" | "dark";
interface Palette {
  theme: Theme;
  cardBg: string;
  colors: string[];
}

/* ---------- Theme-aware palette, resolved from tokens in the browser ---------- */

// Same order img-fx checks, so the shader's theme and ours always agree.
function currentTheme(): Theme {
  const html = document.documentElement;
  const attr = html.dataset.theme;
  if (attr === "dark" || attr === "light") return attr;
  if (html.classList.contains("dark")) return "dark";
  if (html.classList.contains("light")) return "light";
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function luminance(hex: string) {
  const n = parseInt(hex.slice(1, 7), 16);
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
}

// The presets ship greyscale, and most slots sit within a few percent of the card.
// Slots that match the card become --surface, which the shader fades out. The rest
// are ranked by how far they stand out and ramp from a light tint up to full
// --accent, so every visible cell reads as brand blue. Tints keep the mix's own
// chroma: boosting it pushes light blues out of sRGB, which clips to cyan.
//
// Light mode relies on patches/img-fx@0.5.1.patch: unpatched, img-fx composites
// partial alpha twice and multiplies highlights per channel, so tinted cells turn
// grey and cyan on a light surface.
const BG_MATCH = 0.02;
// Coarse cells read as an occupancy map at arm's length (the "Grid" decision).
const CELL_SCALE = 2;
const RAMP_FROM = 30;

function accentTint(pct: number) {
  if (pct >= 100) return cssVar("--accent");
  return cssColor(`color-mix(in oklch, var(--accent) ${Math.round(pct)}%, var(--surface))`);
}

function buildPalette(preset: ImageGenerationPreset, theme: Theme): Palette {
  const mode = PRESETS[preset].modes[theme];
  const bg = luminance(mode.cardBg);
  const distance = mode.colors.map((c) => Math.abs(luminance(c) - bg));
  const ranked = [...new Set(distance.filter((d) => d > BG_MATCH))].toSorted((a, b) => a - b);
  const surface = cssVar("--surface");
  const colors = distance.map((d) => {
    const rank = ranked.indexOf(d);
    if (rank < 0) return surface;
    return accentTint(
      ranked.length === 1 ? 100 : RAMP_FROM + ((100 - RAMP_FROM) * rank) / (ranked.length - 1),
    );
  });
  return { theme, cardBg: surface, colors };
}

const palettes = new Map<string, Palette>();
function getPalette(preset: ImageGenerationPreset) {
  const theme = currentTheme();
  const key = `${theme}:${preset}`;
  let palette = palettes.get(key);
  if (!palette) palettes.set(key, (palette = buildPalette(preset, theme)));
  return palette;
}

function subscribeTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "data-theme"],
  });
  const media = matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  return () => {
    observer.disconnect();
    media.removeEventListener("change", onChange);
  };
}

// img-fx resolves its theme in the browser, so server HTML can't match it.
// The server renders the bare surface; the effect mounts on the client.
const getServerPalette = () => undefined;

/**
 * Processing indicator: a churning pixel mosaic, tinted with the theme's surface
 * and accent tokens, that shows the car is scanning its surroundings. Resolves
 * into `src` when `scanning` turns false.
 */
export function ScanIndicator({
  scanning = true,
  src,
  preset = "pixels-mechanic",
  className = "size-80 rounded-3xl",
  ref,
  "aria-label": ariaLabel = "Scanning surroundings",
  ...props
}: ScanIndicatorProps) {
  const getSnapshot = useCallback(() => getPalette(preset), [preset]);
  const palette = useSyncExternalStore(subscribeTheme, getSnapshot, getServerPalette);
  const effect = useRef<ImageGenerationHandle>(null);
  const surfaceClass = `bg-surface ${className}`;

  // Children's effects run first, so img-fx already has the new `images` here.
  // Rerunning on `mounted` lets `scanning={false}` on first render still reveal.
  const mounted = palette !== undefined;
  useEffect(() => {
    if (!mounted) return;
    if (scanning) effect.current?.triggerHide();
    else if (src) effect.current?.triggerReveal({ hold: "manual" });
  }, [mounted, scanning, src]);

  const a11y = {
    role: "status",
    "aria-busy": scanning,
    "aria-label": ariaLabel,
  } as const;

  if (!palette) return <div ref={ref} className={surfaceClass} {...a11y} {...props} />;

  return (
    <ImageGeneration
      ref={(handle) => {
        effect.current = handle;
        if (typeof ref === "function") ref(handle?.element ?? null);
        else if (ref) ref.current = handle?.element ?? null;
      }}
      preset={preset}
      pixelScale={CELL_SCALE}
      theme={palette.theme}
      cardBg={palette.cardBg}
      colors={palette.colors}
      images={src ? [src] : []}
      {...a11y}
      {...props}
    >
      <div className={surfaceClass} />
    </ImageGeneration>
  );
}
