"use client";

// CabinScreen.TrafficReroute: what the rider sees while the car reroutes round heavy traffic on
// its own (Rerouting scenario). Nothing to do: it only tells them what's happening.
// A split view like the rider's own reroute (Reroute.tsx): a panel over the left half says what's
// happening, and a flat map on the right half shows it.
// "rerouting": the jam in orange on the current route and the way the car is considering dashed,
// beside "Re-routing…". "found": the car has switched; the new route is solid and the old one
// dashed grey, and the panel says how much sooner they'll arrive. "switched": back on the 3D map,
// with a short note. The menu bar and the arrival pill stay on top throughout.
import { Chip } from "@heroui/react";
import { useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { type TrafficStage, useCabinScreen } from "../CabinScreenRoot";
import { PAST_MERGE } from "../map/world";
import { VehicleOrb } from "../thinking-bubble/VehicleOrb";
import {
  at,
  CarMarker,
  type Clear,
  FlatCity,
  line,
  screenHeading,
  StreetLabels,
  trace,
  useSize,
  useView,
} from "../reroute/flatMap";

/** Px kept clear round the map, besides the left half under the panel (plus a 48px gap) and the
 *  menu bar at the bottom. Same as the rider's reroute map. */
const GAP = 48;
const BOTTOM = 176;

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export type TrafficRerouteProps = {
  /** Where the ride ends, shown next to the pin at the end of the route. */
  destination: string;
  className?: string;
};

export function TrafficReroute({ destination, className }: TrafficRerouteProps) {
  const { state } = useCabinScreen();
  const { traffic: stage, world } = state;
  const setup = world.heavyTraffic;
  // Keep the last stage's copy while things fade out.
  const [shown, setShown] = useState<TrafficStage>("rerouting");
  if (stage && stage !== shown) setShown(stage);
  const mapShown = stage === "rerouting" || stage === "found";
  const headingId = useId();

  if (!setup) return null;
  const panel =
    shown === "rerouting"
      ? {
          heading: "Re-routing…",
          reason: `Traffic is building up on ${setup.jamStreet}.`,
          status: "Finding a faster way — no action needed.",
        }
      : {
          heading: "New route",
          reason: `Taking ${setup.viaStreet} to avoid traffic on ${setup.jamStreet}.`,
          status: `You’ll arrive about ${setup.savedMinutes} min sooner.`,
        };

  return (
    <>
      <TrafficMap shown={mapShown} destination={destination} />
      {/* The panel over the left half: what the car is doing, then what it decided. Stays
          mounted so the fade can play, like Reroute; `inert` while hidden. Nothing to press. */}
      <section
        aria-labelledby={headingId}
        inert={!mapShown}
        data-hidden={!mapShown || undefined}
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
            {panel.heading}
          </h2>
          <p className="text-caption text-muted">{panel.reason}</p>
        </header>
        <div className="flex items-center gap-4">
          {shown === "rerouting" ? (
            <VehicleOrb state="solving" className="size-12" />
          ) : (
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-success text-success-foreground">
              <CheckIcon className="size-8" />
            </span>
          )}
          <p className="text-caption">{panel.status}</p>
        </div>
      </section>
      {/* Back on the 3D map: a short note that the car is on the faster route. */}
      <div
        data-hidden={stage !== "switched" || undefined}
        aria-hidden
        className={[
          "pointer-events-none absolute inset-x-0 top-36 flex justify-center px-12",
          "transition-opacity duration-300 ease-out motion-reduce:transition-none",
          "data-[hidden]:opacity-0",
        ].join(" ")}
      >
        <Chip
          variant="secondary"
          size="lg"
          className="h-16 gap-4 rounded-full border-none bg-surface pr-8 pl-3 text-foreground shadow-float"
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-success text-success-foreground">
            <CheckIcon className="size-8" />
          </span>
          <Chip.Label className="text-caption">
            Now on a faster route via {setup.viaStreet}
          </Chip.Label>
        </Chip>
      </div>
      {/* One announcement per stage; the cards aren't live regions themselves. */}
      <output className="sr-only">
        {stage === "rerouting" ? `Re-routing. Traffic is building up on ${setup.jamStreet}.` : ""}
        {stage === "found"
          ? `New route via ${setup.viaStreet}. You’ll arrive about ${setup.savedMinutes} minutes sooner.`
          : ""}
      </output>
    </>
  );
}

/**
 * The full-screen flat map: the city, the jam, the current and new routes from the car on, and a
 * pin at the end. The car moves while it's up, so this follows it, one re-render per meter.
 */
function TrafficMap({ shown, destination }: { shown: boolean; destination: string }) {
  const { state, meta } = useCabinScreen();
  const { world, course, traffic: stage } = state;
  const setup = world.heavyTraffic;
  const option = world.reroutes[0];
  const { loop } = world;
  const ref = useRef<HTMLDivElement>(null);
  const size = useSize(ref);
  const region = setup?.region ?? option.map.region;
  // The right half, clear of the panel on the left.
  const clear = useMemo<Clear>(
    () => ({ left: size.w / 2 + GAP, top: GAP, right: GAP, bottom: BOTTOM }),
    [size.w],
  );
  const view = useView(size, region, clear);

  const dist = useSyncExternalStore(
    meta.subscribe,
    () => Math.round(meta.getSnapshot().dist),
    () => 0,
  );
  const car = meta.getSnapshot();
  const switched = course === option.to;

  const lines = useMemo(() => {
    if (!setup) return null;
    const [jamFrom, jamTo] = setup.jam;
    const split = loop.corners[0][0]; // where the new route goes straight on instead of turning
    const oldEnd = loop.corners[1][1] + PAST_MERGE;
    const from = Math.min(dist, split);
    return {
      // The old route past where the routes split, in three parts round the jam.
      before: trace(loop, null, split, jamFrom),
      jam: trace(loop, null, jamFrom, jamTo),
      after: trace(loop, null, jamTo, oldEnd),
      // The shared stretch, from the car to where the routes split.
      shared: trace(loop, null, from, split),
      // The new route: the dashed option while it's considered, then solid from the car.
      next: trace(option.to, null, switched ? dist : split, option.end),
    };
  }, [setup, loop, option, dist, switched]);

  if (!setup || !lines) return null;
  const end = lines.next.at(-1);
  const mid = lines.jam[Math.floor(lines.jam.length / 2)];
  const oldClass = switched ? "stroke-muted" : "stroke-path";

  return (
    <div
      ref={ref}
      aria-hidden
      data-hidden={!shown || undefined}
      className={[
        "reroute-map absolute inset-0 overflow-hidden bg-surface",
        "transition-opacity duration-300 ease-out motion-reduce:transition-none",
        "data-[hidden]:pointer-events-none data-[hidden]:opacity-0",
      ].join(" ")}
    >
      {size.w > 0 && (
        <>
          <svg width={size.w} height={size.h} className="absolute inset-0">
            <FlatCity city={world.city} view={view} />
            {/* The old route: solid while it's the way, dashed grey once the car has left it. */}
            {!switched && (
              <polyline
                points={line(view, lines.shared)}
                fill="none"
                strokeWidth={10}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="stroke-path"
              />
            )}
            {[lines.before, lines.after].map((pts, i) => (
              <polyline
                key={i}
                points={line(view, pts)}
                fill="none"
                strokeWidth={switched ? 8 : 10}
                strokeDasharray={switched ? "10 10" : undefined}
                strokeLinejoin="round"
                className={oldClass}
              />
            ))}
            {/* The jam, on top of the old route. */}
            <polyline
              points={line(view, lines.jam)}
              fill="none"
              strokeWidth={10}
              strokeLinecap="round"
              className="stroke-warning"
            />
            {/* The new route: dashed while the car considers it, then solid, drawn in once. */}
            {switched ? (
              <path
                key="next"
                d={`M${line(view, lines.next)}`}
                pathLength={1}
                fill="none"
                strokeWidth={10}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="reroute-map__route stroke-path"
              />
            ) : (
              <polyline
                key="option"
                points={line(view, lines.next)}
                fill="none"
                strokeWidth={8}
                strokeDasharray="10 10"
                strokeLinejoin="round"
                className="stroke-path"
              />
            )}
            {/* The destination: a ringed dot at the end of the route. */}
            {end && (
              <g transform={`translate(${view.x(end[0])} ${view.y(end[1])})`}>
                <circle r={14} className="fill-foreground stroke-surface" strokeWidth={4} />
                <circle r={5} className="fill-surface" />
              </g>
            )}
            <CarMarker
              transform={`translate(${view.x(car.x)} ${view.y(car.z)}) rotate(${screenHeading(car.heading)})`}
            />
          </svg>
          <StreetLabels
            world={world}
            view={view}
            nsLabelZ={setup.nsLabelZ}
            ewLabelX={setup.ewLabelX}
          />
          {/* What the jam costs, just below it, clear of the street name above the road. */}
          {mid && (
            <Chip
              variant="secondary"
              size="lg"
              className="absolute h-12 gap-3 rounded-full border-none bg-surface px-4 text-foreground shadow-float"
              style={{ ...at(view, mid[0], mid[1]), translate: "0 100%" }}
            >
              <span aria-hidden className="size-3 rounded-full bg-warning" />
              <Chip.Label className="text-caption">Traffic · +{setup.jamMinutes} min</Chip.Label>
            </Chip>
          )}
          {end && stage !== null && (
            <Chip
              variant="secondary"
              size="lg"
              className="absolute h-12 rounded-full border-none bg-surface px-4 text-foreground shadow-float"
              style={{
                left: view.x(end[0]) + 24,
                top: view.y(end[1]),
                transform: "translate(0, -50%)",
              }}
            >
              <Chip.Label className="text-caption">{destination}</Chip.Label>
            </Chip>
          )}
        </>
      )}
    </div>
  );
}
