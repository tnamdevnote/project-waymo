"use client";

// CabinScreen.Arrival: a read-only pill at the top center that tells the rider when they'll get
// there. Fades in once the ride starts; hidden under the Start ride takeover. When the rider
// confirms a new route, or the car takes a faster one round traffic, the time moves and the pill
// shows the difference ("+2 min", "4 min sooner") for a few seconds.
import { Chip } from "@heroui/react";
import { useEffect, useState } from "react";
import { useCabinScreen } from "../CabinScreenRoot";

/** How long the time difference stays in the pill after a new route is confirmed. */
const DIFF_MS = 8000;

export type ArrivalPillProps = {
  /** Minutes left until arrival on the original route. */
  minutes: number;
  /** Arrival clock time on the original route, as the rider reads it ("3:30"). */
  at: string;
  className?: string;
};

/** "3:30" plus 2 → "3:32", on a 12-hour clock. */
function addMinutes(at: string, minutes: number) {
  const [h, m] = at.split(":").map(Number);
  const t = ((((h % 12) * 60 + m + minutes) % 720) + 720) % 720;
  return `${Math.floor(t / 60) || 12}:${String(t % 60).padStart(2, "0")}`;
}

export function Arrival({ minutes, at, className }: ArrivalPillProps) {
  const { state } = useCabinScreen();
  const hidden = state.phase !== "riding";
  const { delay } = state;
  const time = addMinutes(at, delay);

  // When the delay changes, remember by how much and show it until the timer clears it.
  const [seen, setSeen] = useState(delay);
  // An object, so a second reroute with the same difference still restarts the timer.
  const [change, setChange] = useState<{ by: number } | null>(null);
  const diff = change?.by ?? null;
  if (delay !== seen) {
    setSeen(delay);
    // Only a change during the ride is news; picking a scenario while boarding isn't.
    if (!hidden) setChange({ by: delay - seen });
  }
  useEffect(() => {
    if (!change) return;
    const t = setTimeout(() => setChange(null), DIFF_MS);
    return () => clearTimeout(t);
  }, [change]);

  // While CabinScreen.Pass covers the left of the screen, its heading reaches past the middle:
  // move the pill right, beside the Reset button, over the map.
  const aside = state.pass !== null && state.pass.stage !== "going";

  // Spans the width to center the pill; top-14 centers it on the 80px Reset button at top-12.
  // Aside, pr-36 keeps it clear of that button (48px inset + 80px + 16px gap).
  return (
    <div
      aria-hidden={hidden || undefined}
      data-hidden={hidden || undefined}
      data-aside={aside || undefined}
      className={[
        "pointer-events-none absolute inset-x-0 top-14 flex justify-center px-12",
        "data-[aside]:justify-end data-[aside]:pr-36",
        "transition-opacity duration-300 ease-out motion-reduce:transition-none",
        "data-[hidden]:opacity-0",
      ].join(" ")}
    >
      <Chip
        variant="secondary"
        size="lg"
        className={[
          "h-16 gap-4 rounded-full border-none bg-surface px-8 text-foreground shadow-float",
          diff !== null && "pr-3",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <Chip.Label className="text-caption">
          Arrival in {minutes + delay} min at {time}
        </Chip.Label>
        {diff !== null && (
          // Later is a caution; sooner is good news.
          <Chip
            color={diff > 0 ? "warning" : "success"}
            variant="soft"
            size="lg"
            className="h-12 rounded-full px-4"
          >
            <Chip.Label className="text-caption font-medium">
              {diff > 0 ? `+${diff} min` : `${-diff} min sooner`}
            </Chip.Label>
          </Chip>
        )}
      </Chip>
      {/* Announce the new time once; the pill's own text isn't a live region. */}
      <output className="sr-only">
        {diff !== null
          ? `New route: arrival at ${time}, ${Math.abs(diff)} min ${diff > 0 ? "later" : "earlier"}.`
          : ""}
      </output>
    </div>
  );
}
