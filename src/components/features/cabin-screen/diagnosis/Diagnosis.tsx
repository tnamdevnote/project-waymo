"use client";

// CabinScreen.Diagnosis: the split-screen panel shown while the car works out why it's stuck,
// after the rider reported "Obstacles ahead" from Troubleshoot. It covers the left half and fades
// into the map, so the car and what's blocking it stay in view on the right.
import { useId } from "react";
import { type DiagnosisStage, useCabinScreen } from "../CabinScreenRoot";
import { VehicleOrb } from "../thinking-bubble/VehicleOrb";

/** A finished step: a filled circle with a check, 40px inside the 48px step slot. */
function StepDoneIcon() {
  // Stays mounted so the fade can play, like the ride menu; `inert` and silent while hidden.
  return (
    <svg aria-hidden viewBox="0 0 48 48" fill="none" className="size-12 text-foreground">
      <circle cx="24" cy="24" r="20" fill="currentColor" />
      <path
        d="M17 24.5l5 5L31.5 20"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-background"
      />
    </svg>
  );
}

/** What the panel says at each stage: the heading, and the step next to its status icon. */
const STAGE: Record<DiagnosisStage, { heading: string; step: string }> = {
  scanning: { heading: "Diagnosing…", step: "Scanning the road ahead" },
  detected: { heading: "Thanks, we see it", step: "Obstruction detected" },
  reviewing: { heading: "Thanks, we see it", step: "Remote agent reviewing" },
  resolving: { heading: "Resolving issues", step: "Looking for an alternate path" },
  confirmed: { heading: "Safe path confirmed", step: "Resuming your trip" },
};

export type DiagnosisProps = {
  className?: string;
};

export function Diagnosis({ className }: DiagnosisProps) {
  const { state } = useCabinScreen();
  const headingId = useId();
  const stage = state.diagnosis;
  const hidden = stage === null;
  // Keep the last stage's copy while the panel fades out.
  const copy = STAGE[stage ?? "scanning"];

  return (
    <section
      aria-labelledby={headingId}
      inert={hidden}
      data-hidden={hidden || undefined}
      className={[
        // Extra right padding keeps the text clear of where the gradient fades into the map.
        "absolute inset-y-0 left-0 flex w-1/2 flex-col gap-12 pt-12 pr-24 pb-6 pl-12",
        "bg-linear-to-r from-surface from-65% to-transparent",
        "transition-opacity duration-300 ease-out motion-reduce:transition-none",
        "data-[hidden]:pointer-events-none data-[hidden]:opacity-0",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <header className="flex flex-col gap-3">
        <p className="text-caption font-medium text-muted">Troubleshoot</p>
        <h2 id={headingId} className="text-heading">
          {copy.heading}
        </h2>
        <p className="text-caption text-muted">Stay seated with your seat belt fastened.</p>
      </header>
      <div className="flex items-center gap-4">
        {/* The orb means "working on it"; only the finding itself gets a check. */}
        {stage !== null && stage !== "detected" && (
          <VehicleOrb state="solving" className="size-12" />
        )}
        {stage === "detected" && <StepDoneIcon />}
        <output className="text-caption">{stage ? copy.step : ""}</output>
      </div>
    </section>
  );
}
