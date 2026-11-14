"use client";

// PROTOTYPE (stall): ways to present a stalled ride, behind the emil-prototype picker.
// Nothing in production imports this. Delete the whole folder once a variant is picked.
import "./proto.css";
import { CabinMap, CabinScreen, useCabinScreen } from "@/components/features/cabin-screen";
import { use, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { BoardVariant } from "./BoardVariant";
import { CountdownBoard } from "./CountdownBoard";
import { RideControls } from "./RideControls";
import { TrackBoard } from "./TrackBoard";
import { isActive, SCENARIOS, type Scenario, type StallState, useStall } from "./useStall";

// Round 2: riffs on the picked Status board. Round 1's Step sheet and Ambient were rejected;
// their files stay in this folder only until the decision is written down.
const VARIANTS = [
  { key: "timeline", name: "Timeline", C: BoardVariant },
  { key: "countdown", name: "Countdown", C: CountdownBoard },
  { key: "track", name: "Track", C: TrackBoard },
] as const;

function Run({ variant, scenario }: { variant: number; scenario: Scenario }) {
  const s: StallState = useStall(scenario);
  const { C } = VARIANTS[variant];
  return (
    <>
      <C s={s} />
      {/* Normal ride controls, including the rider's own Troubleshoot entry. Variants own the
          screen once the stall UI is up. */}
      {!isActive(s.stage) && <RideControls s={s} />}
    </>
  );
}

/* ---------- Picker (PICKER.md, verbatim behavior) ---------- */

function Pills({
  items,
  current,
  onSelect,
  onReplay,
  className,
  label,
  position,
}: {
  items: readonly { name: string }[];
  current: number;
  onSelect: (i: number) => void;
  onReplay?: () => void;
  className?: string;
  label: string;
  position?: "top";
}) {
  const navRef = useRef<HTMLElement>(null);
  const hlRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const moveHighlight = useCallback(() => {
    const el = itemRefs.current[current];
    const hl = hlRef.current;
    if (!el || !hl) return;
    hl.style.width = `${el.offsetWidth}px`;
    hl.style.transform = `translateX(${el.offsetLeft}px)`;
  }, [current]);

  useLayoutEffect(() => moveHighlight(), [moveHighlight]);
  useEffect(() => {
    window.addEventListener("resize", moveHighlight);
    return () => window.removeEventListener("resize", moveHighlight);
  }, [moveHighlight]);
  useEffect(() => {
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => navRef.current?.setAttribute("data-ready", "")),
    );
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <nav
      ref={navRef}
      className={["proto-picker", className].filter(Boolean).join(" ")}
      data-position={position}
      aria-label={label}
    >
      <span ref={hlRef} className="proto-picker-highlight" aria-hidden="true" />
      {items.map((v, i) => (
        <button
          key={v.name}
          ref={(el) => {
            itemRefs.current[i] = el;
          }}
          type="button"
          className="proto-picker-item"
          data-active={i === current ? "" : undefined}
          aria-current={i === current ? "true" : undefined}
          onClick={() => onSelect(i)}
        >
          {v.name}
        </button>
      ))}
      {onReplay && (
        <>
          <span className="proto-picker-divider" aria-hidden="true" />
          <button
            type="button"
            className="proto-picker-item proto-picker-replay"
            aria-label="Replay animation (R)"
            onClick={onReplay}
          >
            ↻
          </button>
        </>
      )}
    </nav>
  );
}

function setParam(k: string, v: number) {
  const url = new URL(location.href);
  url.searchParams.set(k, String(v + 1));
  history.replaceState(null, "", url);
}

function ResetCar() {
  // Each run starts from a moving car.
  const { actions } = useCabinScreen();
  useEffect(() => actions.resume(), [actions]);
  return null;
}

export function StallProto({
  searchParams,
}: {
  searchParams: Promise<{ v?: string; s?: string }>;
}) {
  const params = use(searchParams);
  const [current, setCurrent] = useState(() => {
    const n = parseInt(params.v ?? "", 10);
    return n >= 1 && n <= VARIANTS.length ? n - 1 : 0;
  });
  const [scenario, setScenario] = useState(() => {
    const n = parseInt(params.s ?? "", 10);
    return n >= 1 && n <= SCENARIOS.length ? n - 1 : 0;
  });
  const [run, setRun] = useState(0);

  const select = useCallback((i: number) => {
    if (i < 0 || i >= VARIANTS.length) return;
    setCurrent(i);
    setRun((r) => r + 1);
    setParam("v", i);
  }, []);

  const selectScenario = useCallback((i: number) => {
    setScenario(i);
    setRun((r) => r + 1);
    setParam("s", i);
  }, []);

  const replay = useCallback(() => setRun((r) => r + 1), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= VARIANTS.length) select(n - 1);
      else if (e.key === "ArrowRight") select((current + 1) % VARIANTS.length);
      else if (e.key === "ArrowLeft") select((current - 1 + VARIANTS.length) % VARIANTS.length);
      else if (e.key === "r" || e.key === "R") replay();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [current, select, replay]);

  const runKey = `${current}-${scenario}-${run}`;

  return (
    <main className="h-dvh w-full">
      <CabinScreen.Root defaultPhase="riding" className="size-full">
        <CabinMap.Viewport>
          <CabinMap.City />
          <CabinMap.Cones />
          <CabinMap.Traffic />
          <CabinMap.Route />
          <CabinMap.Vehicle />
          <CabinMap.Camera />
        </CabinMap.Viewport>
        <ResetCar key={`reset-${runKey}`} />
        {/* Keyed: switching variant, scenario or replaying restarts the stall from a moving car. */}
        <Run key={runKey} variant={current} scenario={SCENARIOS[scenario].key} />
      </CabinScreen.Root>
      <Pills
        items={VARIANTS}
        current={current}
        onSelect={select}
        onReplay={replay}
        label="Prototype variants"
        position="top"
      />
      <Pills
        items={SCENARIOS}
        current={scenario}
        onSelect={selectScenario}
        label="Stall scenario"
        className="proto-scenarios"
      />
    </main>
  );
}
