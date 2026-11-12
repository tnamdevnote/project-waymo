"use client";

// CabinScreen.VehicleThought: a thought bubble over the rider's car saying why it's stopping.
// Red while it brakes for and waits at the stop line; green for a moment as it pulls away.
// Not shown when the rider pulled over: they asked for that stop, so there's nothing to explain.
import { useEffect, useRef, useState } from "react";
import { useCabinScreen } from "../CabinScreenRoot";
import { ThinkingBubble, type ThinkingBubbleContentProps } from "./ThinkingBubble";

const GREEN_MS = 1500;

type Light = "red" | "green";

const ANNOUNCE: Record<Light, string> = {
  red: "Stopping for a red light",
  green: "Light is green. Continuing.",
};

export type VehicleThoughtProps = Omit<ThinkingBubbleContentProps, "children" | "triggerRef">;

export function VehicleThought(props: VehicleThoughtProps) {
  const { state, meta, anchors } = useCabinScreen();
  const { motion, driving, phase } = state;
  const auto = phase === "riding" && driving;

  const [light, setLight] = useState<Light | null>(null);
  // Kept after close so the glyph doesn't change while the bubble fades out.
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
  if (!auto && light !== null) setLight(null);

  useEffect(() => {
    if (light !== "green") return;
    const t = setTimeout(() => setLight(null), GREEN_MS);
    return () => clearTimeout(t);
  }, [light]);

  // React Aria places the bubble once, on open. The car keeps sliding a little on screen while it
  // brakes and the camera settles, so follow it by the drift since then.
  const open = light !== null;
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
          <ThinkingBubble.TrafficLight signal={shown} />
        </ThinkingBubble.Content>
      </ThinkingBubble.Root>
      <output className="sr-only">{light ? ANNOUNCE[light] : ""}</output>
    </>
  );
}
