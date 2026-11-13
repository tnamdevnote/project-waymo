"use client";

// PROTOTYPE (stall): pieces every variant uses the same way, so they don't skew the comparison.
import { Button, Chip, Spinner } from "@heroui/react";
import { useEffect, useRef, useState } from "react";
import { STEPS, type Support } from "./useStall";

const svg = {
  "aria-hidden": true,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function CheckIcon({ className = "size-8" }: { className?: string }) {
  return (
    <svg {...svg} className={className}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function ShieldIcon({ className = "size-8" }: { className?: string }) {
  return (
    <svg {...svg} className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function SirenIcon({ className = "size-8" }: { className?: string }) {
  return (
    <svg {...svg} className={className}>
      <path d="M7 18v-6a5 5 0 0 1 10 0v6" />
      <path d="M5 21a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v1H5z" />
      <path d="M21 12h1M18.5 4.5 18 5M2 12h1M12 2v1M4.9 4.9l.7.7" />
    </svg>
  );
}

export function HeadsetIcon({ className = "size-8" }: { className?: string }) {
  return (
    <svg {...svg} className={className}>
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <rect x="3" y="14" width="4" height="6" rx="1.5" />
      <rect x="17" y="14" width="4" height="6" rx="1.5" />
      <path d="M19 20a4 4 0 0 1-4 3h-2" />
    </svg>
  );
}

const HOLD_MS = 1500;

/**
 * Call 911 with press-and-hold, so a bump in a moving car can't place the call.
 * Keyboard: hold Enter/Space. A fill sweeps across while held; letting go early cancels.
 */
export function Hold911Button({ className = "" }: { className?: string }) {
  const [holding, setHolding] = useState(false);
  const [calling, setCalling] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <Button
      variant="danger"
      size="lg"
      aria-label={calling ? "Calling 911" : "Hold to call 911"}
      data-holding={holding || undefined}
      className={`proto-hold relative h-20 gap-3 overflow-hidden px-8 text-caption ${className}`}
      onPressStart={() => {
        if (calling) return;
        setHolding(true);
        timer.current = setTimeout(() => {
          setHolding(false);
          setCalling(true);
        }, HOLD_MS);
      }}
      onPressEnd={() => {
        clearTimeout(timer.current);
        setHolding(false);
      }}
    >
      <span aria-hidden className="proto-hold-fill bg-danger-foreground" />
      <SirenIcon />
      <span className="relative">{calling ? "Calling 911…" : "Hold for 911"}</span>
    </Button>
  );
}

/** Support: one press to call; the chip carries the call state. */
export function SupportControl({
  support,
  onCall,
  className = "",
}: {
  support: Support;
  onCall: () => void;
  className?: string;
}) {
  if (support === "idle") {
    return (
      <Button
        variant="tertiary"
        size="lg"
        onPress={onCall}
        className={`h-20 gap-3 rounded-full bg-surface px-8 text-caption text-foreground shadow-float ${className}`}
      >
        <HeadsetIcon />
        Call support
      </Button>
    );
  }
  return (
    <output aria-live="polite">
      <Chip
        size="lg"
        color={support === "connected" ? "success" : "accent"}
        variant="soft"
        className={`h-20 gap-3 rounded-full px-8 ${className}`}
      >
        {support === "connecting" ? <Spinner size="sm" color="current" /> : <HeadsetIcon />}
        <Chip.Label className="text-caption">
          {support === "connecting"
            ? "Connecting to support · about 1 min"
            : "On a call with support"}
        </Chip.Label>
      </Chip>
    </output>
  );
}

/** Remote-assist steps. `step` = how many are done. */
export function StepList({ step, className = "" }: { step: number; className?: string }) {
  return (
    <ol className={`flex flex-col gap-4 ${className}`}>
      {STEPS.map((label, i) => {
        const done = i < step;
        const current = i === step;
        return (
          <li
            key={label}
            className={`flex items-center gap-4 text-body ${done || current ? "" : "text-muted"}`}
          >
            <span className="flex size-10 shrink-0 items-center justify-center">
              {done ? (
                <CheckIcon className="size-8 text-success" />
              ) : current ? (
                <Spinner size="md" color="accent" />
              ) : (
                <span className="size-3 rounded-full bg-border" />
              )}
            </span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}
