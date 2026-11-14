"use client";

// CabinScreen.Reroute: what the rider sees while the car finds another way, after they reported
// "Waymo seems lost" and picked "Try another path" in Troubleshoot. A split view over the left
// half, like Diagnosis. While the car works out the route ("rerouting") the 3D map shows on the
// right. Then a flat street map takes over the right side to show the new route next to the old
// one, and the panel asks the rider to confirm it ("overview"). It all goes away when the car
// drives off.
import { Button } from "@heroui/react";
import { useId, useState } from "react";
import { type RerouteStage, useCabinScreen } from "../CabinScreenRoot";
import { VehicleOrb } from "../thinking-bubble/VehicleOrb";
import { RerouteMap } from "./RerouteMap";

const HEADING: Record<RerouteStage, string> = {
  rerouting: "Trying another route",
  overview: "New route",
};

export type RerouteProps = {
  className?: string;
};

export function Reroute({ className }: RerouteProps) {
  const { state, actions } = useCabinScreen();
  const stage = state.reroute;
  const headingId = useId();
  const hidden = stage === null;
  // Keep the last stage's copy while the panel fades out.
  const [shown, setShown] = useState<RerouteStage>("rerouting");
  if (stage && stage !== shown) setShown(stage);

  return (
    <>
      <RerouteMap shown={stage === "overview"} />
      {/* Stays mounted so the fade can play, like Diagnosis; `inert` while hidden. */}
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
            {HEADING[shown]}
          </h2>
          <p className="text-caption text-muted">Stay seated with your seat belt fastened.</p>
        </header>
        {shown === "rerouting" ? (
          <div className="flex items-center gap-4">
            <VehicleOrb state="solving" className="size-12" />
            <p className="text-caption">Re-routing…</p>
          </div>
        ) : (
          // The screen's one action: the car waits on the new route until the rider accepts it.
          <Button
            size="lg"
            fullWidth
            className="h-20 text-caption"
            onPress={actions.confirmReroute}
          >
            Confirm and resume
          </Button>
        )}
      </section>
      {/* One announcement per stage; the panel's own text isn't a live region. */}
      <output className="sr-only">
        {stage === "rerouting" ? `${HEADING.rerouting}. Re-routing.` : ""}
        {stage === "overview" ? `${HEADING.overview} ready.` : ""}
      </output>
    </>
  );
}
