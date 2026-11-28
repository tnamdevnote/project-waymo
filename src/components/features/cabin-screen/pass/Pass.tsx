"use client";

// CabinScreen.Pass: getting past the fire truck, after the rider reports "Waymo is stuck" in the
// Stalled scenario (docs/decisions/firetruck-stuck.md). A split view over the left of the map:
// the car scans the road ahead, then says it will pass on the left and counts down to doing it.
// The rider can go now or take the detour instead; nothing has to be pressed for the ride to go
// on. CabinMap.PassArrows draws both ways on the road. Once the car moves, a short note says
// which way it went.
import { Button, Chip } from "@heroui/react";
import { type CSSProperties, useEffect, useId, useRef, useState } from "react";
import { ScanIndicator } from "@/components/ui/ScanIndicator";
import { PASS_MINUTES, type PassWay, useCabinScreen } from "../CabinScreenRoot";

/** Seconds before the car takes the bypass on its own. */
const COUNTDOWN_S = 10;

/** What each way is called, and what it costs. */
const WAYS: Record<PassWay, { label: string; going: string; cost: string }> = {
  bypass: {
    label: "Pass on the left",
    going: "Passing on the left",
    cost: `+${PASS_MINUTES.bypass} min`,
  },
  detour: {
    label: "Detour instead",
    going: "Turning around",
    cost: `+${PASS_MINUTES.detour} min`,
  },
};

const svg = {
  "aria-hidden": true,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** Up, one lane left, and on: the bypass. Up, round, and back: the detour. */
function WayIcon({ way, className }: { way: PassWay; className?: string }) {
  return way === "bypass" ? (
    <svg {...svg} className={className}>
      <path d="M16 21v-4.5a3 3 0 0 0-1.3-2.5l-3.4-2.4A3 3 0 0 1 10 9.1V3" />
      <path d="m6 7 4-4 4 4" />
    </svg>
  ) : (
    <svg {...svg} className={className}>
      <path d="M17 21V10a5 5 0 0 0-10 0v8" />
      <path d="m3 14 4 4 4-4" />
    </svg>
  );
}

/**
 * Counts down from COUNTDOWN_S and calls `onDone` at zero. Holds while `paused` (the rider pulled
 * over) or the tab is hidden, and picks up where it left off. Drives `--p` (0–1) on `fill`.
 */
function useCountdown(paused: boolean, onDone: () => void) {
  const [left, setLeft] = useState(COUNTDOWN_S);
  const fill = useRef<HTMLSpanElement>(null);
  const elapsed = useRef(0);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });
  useEffect(() => {
    if (paused) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      if (!document.hidden) elapsed.current += (now - last) / 1000;
      last = now;
      const remaining = Math.max(0, COUNTDOWN_S - elapsed.current);
      setLeft(Math.ceil(remaining));
      // Reduced motion: the fill steps once a second instead of sweeping.
      const p = reduced ? 1 - Math.ceil(remaining) / COUNTDOWN_S : elapsed.current / COUNTDOWN_S;
      fill.current?.style.setProperty("--p", String(Math.min(1, p)));
      if (remaining <= 0) return done.current();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused]);
  return { left, fill };
}

/** Both choices: at least 96px tall, growing if the label wraps; icon and value never shrink. */
const ROW =
  "pass-enter h-auto min-h-24 w-full justify-start gap-4 px-6 py-5 text-left text-body whitespace-normal xl:gap-5 xl:px-8";
/** Label and its value: stacked below 2xl so the label keeps one line, side by side from 2xl. */
const LABEL =
  "flex min-w-0 flex-1 flex-col items-start gap-1 2xl:flex-row 2xl:items-center 2xl:justify-between 2xl:gap-4";

/** The proposal and the alternative. Mounted fresh each time the ways past show. */
function Choices() {
  const { state, actions } = useCabinScreen();
  const choosing = state.pass?.stage === "choosing";
  // Holds while the rider has pulled over: choosing is the go-ahead, the timer isn't.
  const { left, fill } = useCountdown(!choosing || !state.driving, () =>
    actions.choosePassWay("bypass"),
  );

  // The buttons appear after the scan: put focus on the proposal so keyboard and switch users
  // land on it.
  const primary = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    primary.current?.focus();
  }, []);

  const point = (way: PassWay) => ({
    onHoverStart: () => actions.focusPassWay(way),
    onHoverEnd: () => actions.focusPassWay(null),
    onFocusChange: (f: boolean) => actions.focusPassWay(f ? way : null),
    onPress: () => actions.choosePassWay(way),
  });

  return (
    // Pinned to the bottom, level with the ride controls (both 48px up).
    <div className="mt-auto flex flex-col gap-4">
      <Button
        ref={primary}
        size="lg"
        className={`relative isolate overflow-hidden shadow-hero ${ROW}`}
        {...point("bypass")}
      >
        {/* Time running out, left to right. Decorative: the seconds are in the label. */}
        <span
          ref={fill}
          aria-hidden
          className="pass-countdown absolute inset-0 -z-10 bg-accent-foreground opacity-20"
        />
        <WayIcon way="bypass" className="size-10 shrink-0" />
        <span className={LABEL}>
          <span>{WAYS.bypass.label}</span>
          {/* Not live: announcing every second would talk over everything else. */}
          <span className="text-caption whitespace-nowrap tabular-nums opacity-80 2xl:text-body">
            {left} s
          </span>
        </span>
      </Button>
      <Button
        variant="secondary"
        size="lg"
        className={ROW}
        style={{ "--i": 1 } as CSSProperties}
        {...point("detour")}
      >
        <WayIcon way="detour" className="size-10 shrink-0 text-accent" />
        <span className={LABEL}>
          <span>{WAYS.detour.label}</span>
          <span className="text-caption whitespace-nowrap text-muted">{WAYS.detour.cost}</span>
        </span>
      </Button>
    </div>
  );
}

export type PassProps = {
  className?: string;
};

export function Pass({ className }: PassProps) {
  const { state } = useCabinScreen();
  const headingId = useId();
  const stage = state.pass?.stage ?? null;
  const hidden = stage !== "scanning" && stage !== "choosing";
  // Keep the last stage's content while the panel fades out.
  const [shown, setShown] = useState<"scanning" | "choosing">("scanning");
  if ((stage === "scanning" || stage === "choosing") && stage !== shown) setShown(stage);
  const going = state.pass?.stage === "going" ? state.pass.way : null;
  // Keep the last way while the note fades out.
  const [lastWay, setLastWay] = useState<PassWay>("bypass");
  if (going && going !== lastWay) setLastWay(going);

  return (
    <>
      {/* Stays mounted so the fade can play; `inert` while hidden. */}
      <section
        aria-labelledby={headingId}
        inert={hidden}
        data-hidden={hidden || undefined}
        className={[
          "pass-fade absolute inset-y-0 left-0 flex data-[hidden]:pointer-events-none",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {/* A solid column holds everything; the fade is a separate strip beside it, so no content
            can sit on the gradient at any width. 32rem, 36rem from xl: "Obstruction detected" fits
            on one line. */}
        <div className="flex w-lg flex-col gap-8 bg-surface p-8 pr-4 pb-12 xl:w-xl xl:gap-12 xl:p-12 xl:pr-6">
          <header className="flex flex-col gap-2 xl:gap-3">
            {/* The warning sign is in the car's thought bubble (CabinScreen.VehicleThought). */}
            <h2 id={headingId} className="text-heading text-balance">
              {shown === "choosing" ? (
                <span className="whitespace-nowrap">Obstruction detected</span>
              ) : (
                "Scanning the road ahead…"
              )}
            </h2>
            <p className="text-caption text-pretty text-muted">
              {shown === "choosing"
                ? "There’s room to pass on the left. Your Waymo will go on its own."
                : "Your Waymo stopped for something ahead."}
            </p>
          </header>
          {shown === "scanning" ? (
            <ScanIndicator
              className="aspect-square w-full max-w-80 rounded-3xl"
              aria-label="Scanning the road ahead"
            />
          ) : (
            <Choices />
          )}
        </div>
        <div aria-hidden className="w-24 bg-linear-to-r from-surface to-transparent" />
      </section>
      {/* Once moving: which way, and what it adds. Bottom left, level with the ride controls and clear
          of the arrival pill at the top. */}
      <div
        aria-hidden={!going || undefined}
        data-hidden={!going || undefined}
        className="pass-fade pointer-events-none absolute bottom-12 left-12 flex items-center gap-4 rounded-full bg-surface py-4 pr-8 pl-6 shadow-float"
      >
        <WayIcon way={lastWay} className="size-8 text-accent" />
        <span className="text-caption">{WAYS[lastWay].going}</span>
        <Chip size="lg" color="success" variant="soft" className="text-caption">
          {WAYS[lastWay].cost}
        </Chip>
      </div>
      {/* One announcement per stage; the panel's text changes too often to be a live region. */}
      <output className="sr-only">
        {stage === "scanning" ? "Scanning the road ahead." : ""}
        {stage === "choosing"
          ? `Obstruction detected. Your Waymo will pass on the left in ${COUNTDOWN_S} seconds. Choose Detour instead to turn around.`
          : ""}
        {going ? `${WAYS[going].going}, ${WAYS[going].cost}.` : ""}
      </output>
    </>
  );
}
