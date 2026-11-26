"use client";

// CabinScreen.PathPick: "Help Waymo pick a path", after the rider reports "Waymo is stuck" in the
// Stalled scenario. A panel over the left half, like Reroute, and a button on the map at the end
// of each way past the fire truck (CabinMap.PathChoices draws the lines and places the buttons).
// One tap suggests a way. The panel then shows Waymo checking it, with Cancel, before the car
// moves. The rider never steers.
import { Button, type ButtonProps } from "@heroui/react";
import { type ReactNode, type Ref, useEffect, useId, useRef, useState } from "react";
import { type CabinAnchor, type PathPickState, useCabinScreen } from "../CabinScreenRoot";
import { useStoppedAtTruck } from "../map/useStoppedAtTruck";
import { VehicleOrb } from "../thinking-bubble/VehicleOrb";

function ChoiceIcon({ path }: { path: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-8"
    >
      <path d={path} />
    </svg>
  );
}

/** Up, swinging left past something and carrying on. */
const AROUND_PATH = "M15 21v-4c0-4-6-4-6-8V4M4 9l5-5 5 5";
/** Up, over to the left and back down. */
const UTURN_PATH = "M18 21V9a6 6 0 0 0-12 0v10M2 15l4 4 4-4";

/** Holds its children centered on a map anchor. CabinMap.PathChoices moves it every frame. */
function MapSpot({ spotRef, children }: { spotRef: CabinAnchor["ref"]; children: ReactNode }) {
  return (
    <div ref={spotRef} className="absolute top-0 left-0 size-0">
      <div className="absolute w-max -translate-x-1/2 -translate-y-1/2">{children}</div>
    </div>
  );
}

type ChoiceButtonProps = Omit<ButtonProps, "children" | "size"> & {
  ref?: Ref<HTMLButtonElement>;
  icon: string;
  iconClassName: string;
  label: string;
};

/** A choice on the map: a big pill with the way's arrow in a disc. */
function ChoiceButton({ icon, iconClassName, label, className, ...props }: ChoiceButtonProps) {
  return (
    <Button
      size="lg"
      className={["h-28 gap-4 rounded-full pr-10 pl-4 text-body font-medium", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      <span className={`flex size-20 items-center justify-center rounded-full ${iconClassName}`}>
        <ChoiceIcon path={icon} />
      </span>
      {label}
    </Button>
  );
}

const STAGE_ANNOUNCE: Record<PathPickState["stage"], string> = {
  choosing: "Help Waymo pick a path. Choose Go around or U-turn.",
  checking: "Waymo is checking your choice.",
};

export type PathPickProps = {
  className?: string;
};

export function PathPick({ className }: PathPickProps) {
  const { state, actions, anchors } = useCabinScreen();
  const headingId = useId();
  const stage = state.pick?.stage ?? null;
  const hidden = stage === null;
  // Keep the last stage's content while the panel fades out.
  const [shown, setShown] = useState<PathPickState["stage"]>("choosing");
  if (stage && stage !== shown) setShown(stage);
  const atTruck = useStoppedAtTruck();
  const choosing = stage === "choosing" && atTruck;

  // The tapped button disappears, so move focus on with the rider: to Cancel while Waymo checks,
  // and back to the first choice if they take it back.
  const aroundRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (stage === "checking") cancelRef.current?.focus();
  }, [stage]);
  useEffect(() => {
    if (choosing) aroundRef.current?.focus();
  }, [choosing]);

  return (
    <>
      {/* Stays mounted so the fade can play, like Reroute; `inert` while hidden. */}
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
          <p className="text-caption font-medium text-muted">Get help · Waymo is stuck</p>
          <h2 id={headingId} className="text-heading">
            Help Waymo pick a path
          </h2>
          <p className="text-caption text-muted">Stay seated with your seat belt fastened.</p>
        </header>
        {shown === "choosing" ? (
          <div className="flex flex-col gap-3 text-body">
            <p>Tap a button to suggest a path.</p>
            <p>Waymo will only go if it’s safe.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            <div className="flex items-center gap-4">
              <VehicleOrb state="solving" className="size-12" />
              <p className="text-caption">Waymo is checking…</p>
            </div>
            <Button
              ref={cancelRef}
              variant="secondary"
              size="lg"
              fullWidth
              className="h-20 text-caption"
              onPress={actions.cancelPathChoice}
            >
              Cancel
            </Button>
          </div>
        )}
      </section>
      <div
        inert={!choosing}
        data-hidden={!choosing || undefined}
        className={[
          "pointer-events-none absolute inset-0 *:*:*:pointer-events-auto",
          "transition-opacity duration-200 ease-out motion-reduce:transition-none",
          "data-[hidden]:opacity-0 data-[hidden]:*:*:*:pointer-events-none",
        ].join(" ")}
      >
        <MapSpot spotRef={anchors.goAround.ref}>
          <ChoiceButton
            ref={aroundRef}
            variant="primary"
            className="shadow-hero"
            icon={AROUND_PATH}
            iconClassName="bg-surface text-accent"
            label="Go around"
            onPress={() => actions.choosePath("around")}
          />
        </MapSpot>
        <MapSpot spotRef={anchors.uturn.ref}>
          <ChoiceButton
            variant="outline"
            className="border-2 border-accent bg-surface text-foreground shadow-float"
            icon={UTURN_PATH}
            iconClassName="bg-accent text-accent-foreground"
            label="U-turn"
            onPress={() => actions.choosePath("uturn")}
          />
        </MapSpot>
      </div>
      {/* One announcement per stage; the panel's own text isn't a live region. */}
      <output className="sr-only">{stage ? STAGE_ANNOUNCE[stage] : ""}</output>
    </>
  );
}
