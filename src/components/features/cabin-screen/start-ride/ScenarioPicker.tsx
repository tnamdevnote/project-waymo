"use client";

// Demo control on the Start ride screen: a segmented control that picks which story the ride
// plays: Stalled, Looping or Rerouting.
//
// Styled after the emil-prototype picker (dark glass pill, white-alpha text, a highlight that
// slides to the selected segment), scaled up to the cabin's type. Segments are 64px tall, under the 80px touch-target rule, at the user's request.
// The raw white/black alpha colors are a user-approved exception to DESIGN.md: the pill is
// demo chrome, not part of the cabin theme, so it stays the same in light and dark.
import { ToggleButton, ToggleButtonGroup } from "@heroui/react";
import { useLayoutEffect, useRef, useState } from "react";
import { type RideScenario, useCabinScreen } from "../CabinScreenRoot";

const SCENARIOS: { id: RideScenario; label: string }[] = [
  { id: "stalled", label: "Stalled" },
  { id: "looping", label: "Looping" },
  { id: "rerouting", label: "Rerouting" },
];

// HeroUI drives ToggleButton colors through these variables; clear them so the sliding
// highlight is the only fill, and signal state with text color alone.
const SEGMENT = [
  "h-16 rounded-full px-6 text-caption font-normal",
  "[--toggle-button-bg:transparent] [--toggle-button-bg-hover:transparent]",
  "[--toggle-button-bg-pressed:transparent] [--toggle-button-bg-selected:transparent]",
  "[--toggle-button-bg-selected-hover:transparent] [--toggle-button-bg-selected-pressed:transparent]",
  "text-white/55 transition-[color,transform] duration-150 ease-out",
  "hover:text-white/85 data-[selected=true]:text-white",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40",
  "data-[focus-visible=true]:outline-2 data-[focus-visible=true]:outline-offset-2",
  "data-[focus-visible=true]:outline-white/40 data-[focus-visible=true]:shadow-none",
].join(" ");

export function ScenarioPicker() {
  const { state, actions } = useCabinScreen();
  const groupRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ left: number; width: number } | null>(null);
  // The slide is enabled only after the first placement, so load doesn't animate.
  const [ready, setReady] = useState(false);

  const selected = SCENARIOS.findIndex((s) => s.id === state.scenario);
  useLayoutEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    const place = () => {
      const el = group.querySelectorAll<HTMLElement>("button")[selected];
      if (el) setBox({ left: el.offsetLeft, width: el.offsetWidth });
    };
    place();
    const frame = requestAnimationFrame(() => setReady(true));
    // Re-measure when the font loads or the screen resizes.
    const ro = new ResizeObserver(place);
    ro.observe(group);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [selected]);

  return (
    <div
      className={[
        "relative isolate rounded-full p-1.5 select-none",
        "bg-[rgba(10,10,10,0.82)] backdrop-blur-md backdrop-saturate-[1.4]",
        "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),0_8px_24px_rgba(0,0,0,0.24),0_2px_6px_rgba(0,0,0,0.12)]",
      ].join(" ")}
    >
      <span
        aria-hidden
        data-ready={ready || undefined}
        className={[
          "pointer-events-none absolute top-1.5 left-1.5 h-16 rounded-full bg-white/12",
          "data-[ready]:transition-[transform,width] data-[ready]:duration-250",
          "data-[ready]:ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none",
          box ? "" : "opacity-0",
        ].join(" ")}
        style={box ? { width: box.width, transform: `translateX(${box.left}px)` } : undefined}
      />
      <ToggleButtonGroup
        ref={groupRef}
        aria-label="Demo scenario"
        selectionMode="single"
        disallowEmptySelection
        isDetached
        size="lg"
        className="relative gap-1"
        selectedKeys={[state.scenario]}
        onSelectionChange={(keys) => {
          const [next] = keys;
          if (next) actions.setScenario(next as RideScenario);
        }}
      >
        {SCENARIOS.map(({ id, label }) => (
          <ToggleButton key={id} id={id} variant="ghost" className={SEGMENT}>
            {label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </div>
  );
}
