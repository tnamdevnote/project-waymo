"use client";

// CabinScreen.StartRide: the boarding screen. Covers the map until the rider presses Start ride,
// then fades out and the car pulls away. Stays mounted so the fade can play; `inert` once hidden.
import { Link } from "@heroui/react";
import { type ComponentProps, useSyncExternalStore } from "react";
import { useCabinScreen } from "../CabinScreenRoot";
import { StartRideButton } from "@/components/ui/StartRideButton";
import { SupportButton } from "@/components/ui/SupportButton";

export type StartRideProps = ComponentProps<"section"> & {
  /** Rider's first name, for the greeting. */
  rider: string;
  /** Street address shown under Destination. */
  destination: string;
  onSupport?: () => void;
  onGuestInfo?: () => void;
};

// The hour is read in the browser only; the server can't know the rider's clock.
const noSubscribe = () => () => {};
const useHour = () =>
  useSyncExternalStore(
    noSubscribe,
    () => new Date().getHours(),
    () => null,
  );

function greeting(hour: number | null) {
  if (hour === null) return "Hello";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function StartRide({
  rider,
  destination,
  onSupport,
  onGuestInfo,
  className,
  ...props
}: StartRideProps) {
  const { state, actions } = useCabinScreen();
  const hour = useHour();
  const hidden = state.phase !== "boarding";

  return (
    <section
      aria-label="Start your ride"
      inert={hidden}
      data-hidden={hidden || undefined}
      className={[
        "absolute inset-0 z-10 flex flex-col justify-between gap-12 bg-background p-12",
        "transition-opacity duration-300 ease-out motion-reduce:transition-none",
        "data-[hidden]:pointer-events-none data-[hidden]:opacity-0",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      <header className="flex flex-col gap-8">
        <p className="flex items-center gap-4 text-caption">
          <span className="font-medium tracking-[0.3em]">WAYMO</span>
          <span aria-hidden className="text-muted">
            ×
          </span>
          <span>Uber</span>
        </p>

        <div className="grid grid-cols-[3fr_2fr] items-start gap-12">
          <h1 className="text-heading text-balance">
            {greeting(hour)},
            <br />
            {rider}
          </h1>
          <dl className="flex flex-col gap-1">
            <dt className="text-caption font-medium tracking-wider text-muted uppercase">
              Destination
            </dt>
            <dd className="text-body">{destination}</dd>
          </dl>
        </div>
      </header>

      <StartRideButton onPress={actions.startRide} />

      <footer className="flex items-center justify-between gap-8">
        <p className="text-caption text-muted">
          Riding as a guest?{" "}
          <Link className="text-caption text-accent" onPress={onGuestInfo}>
            Check out
          </Link>{" "}
          what you need to know
        </p>
        <SupportButton onPress={onSupport} />
      </footer>
    </section>
  );
}
