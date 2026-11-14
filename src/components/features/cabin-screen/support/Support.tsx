"use client";

// CabinScreen.Support: the split-view panel shown while the rider is on a call with Ride Support,
// after picking "Call support", "Something else" or "None of these" in Troubleshoot. Same layout
// as Diagnosis and Reroute: it covers the left half and fades into the map.
// Figma: "connecting" is node 558:4747, "connected" is node 558:4795.
import { Button } from "@heroui/react";
import { useId, useState } from "react";
import { type SupportStage, useCabinScreen } from "../CabinScreenRoot";
import { VehicleOrb } from "../thinking-bubble/VehicleOrb";

/** What the panel says at each stage: the heading, and the line under it. */
const STAGE: Record<SupportStage, { heading: string; status: string }> = {
  connecting: { heading: "Help is on the way", status: "Connecting you to the remote agent" },
  connected: {
    heading: "You’re connected",
    status: "Speak naturally. Rider Support can hear you through the car.",
  },
};

export type SupportProps = {
  className?: string;
};

export function Support({ className }: SupportProps) {
  const { state, actions } = useCabinScreen();
  const headingId = useId();
  const stage = state.support;
  const hidden = stage === null;
  // Keep the last stage's copy while the panel fades out.
  const [shown, setShown] = useState<SupportStage>("connecting");
  if (stage && stage !== shown) setShown(stage);

  // Stays mounted so the fade can play, like Diagnosis; `inert` while hidden.
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
        <p className="text-caption font-medium text-muted">Ride Support</p>
        <h2 id={headingId} className="text-heading">
          {STAGE[shown].heading}
        </h2>
        <p className="text-caption text-muted">Stay seated with your seat belt fastened.</p>
      </header>
      <div className="flex items-center gap-4">
        {/* The orb means "working on it": only while the call is still being put through. */}
        {stage === "connecting" && <VehicleOrb state="solving" className="size-12" />}
        <output className={shown === "connected" ? "text-caption text-muted" : "text-caption"}>
          {hidden ? "" : STAGE[shown].status}
        </output>
      </div>
      {/* Demo only: stands in for the agent sending the car back the way it came, so a presenter
          can move the story on to the U-turn route. Bottom-left, centred on the menu bar's
          items (mb-9 plus the panel's pb-6 puts its 80px height level with them). */}
      {shown === "connected" && (
        <Button
          variant="secondary"
          size="lg"
          className="mt-auto mb-9 h-20 self-start px-8 text-caption"
          onPress={actions.proceedWithUturn}
        >
          Proceed
        </Button>
      )}
    </section>
  );
}
