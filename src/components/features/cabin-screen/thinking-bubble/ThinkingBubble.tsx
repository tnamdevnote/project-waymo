"use client";

// ThinkingBubble: a HeroUI Tooltip restyled as a thought cloud, for what the car is reacting to
// (a red light, a pedestrian). One cloud with a puff on the side facing the anchor, no arrow.
// Anchor it with a Tooltip.Trigger child, or with `triggerRef` for something drawn on the map.
import { Tooltip, type TooltipContentProps, type TooltipRootProps } from "@heroui/react";
import type { ComponentProps } from "react";

const cx = (...classes: (string | false | undefined)[]) => classes.filter(Boolean).join(" ");

/* ---------- Root ---------- */

export type ThinkingBubbleProps = TooltipRootProps;

/** Open state: uncontrolled by default; pass `isOpen` + `onOpenChange` (or `defaultOpen`). */
function Root({ delay = 0, closeDelay = 0, ...props }: ThinkingBubbleProps) {
  return <Tooltip delay={delay} closeDelay={closeDelay} {...props} />;
}

/* ---------- Content ---------- */

export type ThinkingBubbleContentProps = Omit<TooltipContentProps, "showArrow" | "className"> & {
  className?: string;
};

// The cloud is a big circle with a smaller puff fused to its lower-left, the side facing the
// anchor. Both are drawn twice: first with the shadow, then a plain fill on top. The fills cover
// the shadow where the circles overlap, so the cloud reads as one shape with one shadow.
const CLOUD = "pointer-events-none absolute top-0 right-0 size-56 rounded-full bg-overlay";
const PUFF = "pointer-events-none absolute top-38 left-1.5 size-20 rounded-full bg-overlay";

/**
 * The cloud. Defaults put it above and to the right of the anchor, with the puff just past it.
 * Its children are the "thought", centered in the big circle: one glyph, read at a glance.
 *
 * React Aria won't let `crossOffset` move a tooltip past the edge of its anchor, so the puff is
 * moved clear of the anchor with `ml-7` instead. Override it with `className`.
 */
function Content({
  children,
  className,
  placement = "top start",
  offset = 12,
  ...props
}: ThinkingBubbleContentProps) {
  return (
    <Tooltip.Content
      placement={placement}
      offset={offset}
      className={cx(
        "relative ml-7 size-58 max-w-none rounded-none bg-transparent p-0 text-overlay-foreground shadow-none select-none",
        className,
      )}
      {...props}
    >
      <span aria-hidden className={cx(CLOUD, "shadow-float")} />
      <span aria-hidden className={cx(PUFF, "shadow-float")} />
      <span aria-hidden className={CLOUD} />
      <span aria-hidden className={PUFF} />
      <div className="absolute top-0 right-0 flex size-56 items-center justify-center">
        {children}
      </div>
    </Tooltip.Content>
  );
}

/* ---------- Glyphs ---------- */

export type TrafficSignal = "red" | "yellow" | "green";

const LAMPS = [
  { signal: "red", fill: "bg-danger" },
  { signal: "yellow", fill: "bg-warning" },
  { signal: "green", fill: "bg-success" },
] as const;

const SIGNAL_LABEL: Record<TrafficSignal, string> = {
  red: "Red light",
  yellow: "Yellow light",
  green: "Green light",
};

export type TrafficLightProps = ComponentProps<"div"> & {
  /** The lit lamp. The other two stay dim. */
  signal: TrafficSignal;
};

function TrafficLight({ signal, className, ...props }: TrafficLightProps) {
  return (
    <div
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- drawn with tokens, not an image file
      role="img"
      aria-label={SIGNAL_LABEL[signal]}
      className={cx("flex flex-col items-center gap-2 rounded-2xl bg-foreground p-3", className)}
      {...props}
    >
      {LAMPS.map((lamp) => (
        <span
          key={lamp.signal}
          className={cx(
            "size-8 rounded-full transition-opacity duration-300 ease-out motion-reduce:transition-none",
            lamp.fill,
            lamp.signal === signal ? "opacity-100" : "opacity-20",
          )}
        />
      ))}
    </div>
  );
}

export const ThinkingBubble = { Root, Trigger: Tooltip.Trigger, Content, TrafficLight };
