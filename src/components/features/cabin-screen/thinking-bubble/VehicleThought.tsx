"use client";

// CabinScreen.VehicleThought: a thought bubble over the rider's car showing what it's doing at a
// red light: a warning while it brakes and waits, then a navigation arrow as it pulls away.
// Not shown when the rider pulled over: they asked for that stop, so there's nothing to explain.
// While the car diagnoses a stall the rider reported, it shows a question mark while scanning,
// an exclamation mark once it has found the obstruction, a VR headset while a remote agent
// reviews it, a magnifier while it looks for an alternate path, a tick once it has one, then the
// navigation arrow as it drives around. While it reroutes at the rider's request, it shows a map,
// hides while the map pulls up overhead, then shows the navigation arrow as it drives off.
// While the rider is on a call with Ride Support, it shows grey headphones while connecting and
// blue ones once connected.
import { useEffect, useRef, useState } from "react";
import { useCabinScreen } from "../CabinScreenRoot";
import { ThinkingBubble, type ThinkingBubbleContentProps } from "./ThinkingBubble";
import { ThoughtIcon, type Thought } from "./ThoughtIcon";

const GREEN_MS = 1500;

type Light = "red" | "green";

/** What the car is thinking about: the red light it's stopping for, then moving on. */
const THOUGHT: Record<Light, Thought> = {
  red: "warning",
  green: "navigate",
};
const LIGHTS = Object.keys(THOUGHT) as Light[];

const ANNOUNCE: Record<Light, string> = {
  red: "Stopping for a red light",
  green: "Light is green. Continuing.",
};

export type VehicleThoughtProps = Omit<ThinkingBubbleContentProps, "children" | "triggerRef">;

export function VehicleThought(props: VehicleThoughtProps) {
  const { state, meta, anchors } = useCabinScreen();
  const { motion, driving, phase, diagnosis, reroute, support } = state;
  // Diagnosing, rerouting or on a Support call: the bubble says that, not the red light.
  const busy = diagnosis !== null || reroute !== null || support !== null;
  const auto = phase === "riding" && driving;

  const [light, setLight] = useState<Light | null>(null);
  // Kept after close so the icon doesn't change while the bubble fades out.
  const [shown, setShown] = useState<Light>("red");
  const [prevMotion, setPrevMotion] = useState(motion);
  if (motion !== prevMotion) {
    setPrevMotion(motion);
    if (motion === "stopping" && auto) {
      setLight("red");
      setShown("red");
    } else if (motion === "driving" && light === "red") {
      setLight("green");
      setShown("green");
    }
  }
  // When diagnosis ends the car is driving around the obstruction: go straight to the navigation
  // arrow instead of back to the warning it showed before the rider reported the stall.
  const [prevDiagnosis, setPrevDiagnosis] = useState(diagnosis);
  if (diagnosis !== prevDiagnosis) {
    setPrevDiagnosis(diagnosis);
    if (diagnosis === null && auto) {
      setLight("green");
      setShown("green");
    }
  }
  // Same when a reroute ends: the car is driving off on the new route.
  const [prevReroute, setPrevReroute] = useState(reroute);
  if (reroute !== prevReroute) {
    setPrevReroute(reroute);
    if (reroute === null && auto) {
      setLight("green");
      setShown("green");
    }
  }
  if (!auto && light !== null) setLight(null);

  useEffect(() => {
    if (light !== "green") return;
    const t = setTimeout(() => setLight(null), GREEN_MS);
    return () => clearTimeout(t);
  }, [light]);

  // React Aria places the bubble once, on open. The car keeps sliding a little on screen while it
  // brakes and the camera settles, so follow it by the drift since then.
  // Closed in the overhead view: the car is too small up there to point a bubble at.
  const open = reroute !== "overview" && (light !== null || busy);
  const bubble = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    let base: { x: number; y: number } | null = null;
    return meta.subscribe(() => {
      const el = bubble.current;
      const p = anchors.vehicle.point;
      if (!el) return;
      if (!base) base = { x: p.x, y: p.y };
      el.style.translate = `${p.x - base.x}px ${p.y - base.y}px`;
    });
  }, [open, meta, anchors]);

  return (
    <>
      <ThinkingBubble.Root isOpen={open}>
        <ThinkingBubble.Content ref={bubble} triggerRef={anchors.vehicle.ref} {...props}>
          {LIGHTS.map((l) => (
            <ThinkingBubble.Glyph key={l} shown={!busy && l === shown}>
              <ThoughtIcon name={THOUGHT[l]} />
            </ThinkingBubble.Glyph>
          ))}
          {/* The Diagnosis panel announces this state, so it isn't in the live region below. */}
          {/* The Support panel announces the call. */}
          <ThinkingBubble.Glyph shown={support === "connecting"}>
            <ThoughtIcon name="headset" />
          </ThinkingBubble.Glyph>
          {/* Blue once the agent picks up, as in Figma (node 571:9805). */}
          <ThinkingBubble.Glyph shown={support === "connected"}>
            <ThoughtIcon name="support" />
          </ThinkingBubble.Glyph>
          <ThinkingBubble.Glyph shown={reroute === "rerouting"}>
            <ThoughtIcon name="map" />
          </ThinkingBubble.Glyph>
          <ThinkingBubble.Glyph shown={diagnosis === "scanning"}>
            <ThoughtIcon name="help" />
          </ThinkingBubble.Glyph>
          <ThinkingBubble.Glyph shown={diagnosis === "detected"}>
            <ThoughtIcon name="alert" />
          </ThinkingBubble.Glyph>
          <ThinkingBubble.Glyph shown={diagnosis === "reviewing"}>
            <ThoughtIcon name="remote" />
          </ThinkingBubble.Glyph>
          <ThinkingBubble.Glyph shown={diagnosis === "resolving"}>
            <ThoughtIcon name="search" />
          </ThinkingBubble.Glyph>
          {/* Smaller than the rest, as in Figma: the tick square is 78px in the cloud where the
              others are 100–120px. */}
          <ThinkingBubble.Glyph shown={diagnosis === "confirmed"}>
            <ThoughtIcon name="done" className="size-21" />
          </ThinkingBubble.Glyph>
        </ThinkingBubble.Content>
      </ThinkingBubble.Root>
      <output className="sr-only">{light && !busy ? ANNOUNCE[light] : ""}</output>
    </>
  );
}
