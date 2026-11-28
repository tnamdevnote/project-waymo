"use client";

// The flat street map shown while the rider looks over a new route (reroute "overview"): a plain
// top-down map like a phone's maps app, on the right half beside the reroute panel, instead of
// the 3D chase view. Its drawing parts are in flatMap.tsx. The new
// route is solid green; the old one is dashed beside it, up to where the two meet again. After a
// Ride Support call the new route is a U-turn instead: back south, with the blocked way ahead
// dashed. Each time the map opens the new route draws itself out from the car and a red pin drops
// where it ends (motion in globals.css under `.reroute-map`).
import { useMemo, useRef } from "react";
import { useCabinScreen } from "../CabinScreenRoot";
import { PAST_MERGE } from "../map/world";
import {
  CarMarker,
  type Clear,
  FlatCity,
  line as toPoints,
  type Point,
  type Region,
  screenHeading,
  StreetLabels,
  trace,
  useSize,
  useView,
} from "./flatMap";

/** For the U-turn (Stalled only): the car, the blocked way ahead, and the way back south to Lake St. */
const UTURN_REGION: Region = { x0: -30, x1: 70, z0: -50, z1: 175 };
const UTURN_NS_LABEL_Z = 110;
/** Px kept clear round the map, besides the left half under the reroute panel (plus a 48px gap)
 *  and the menu bar at the bottom. */
const GAP = 48;
const BOTTOM = 176;

/** The blocked way, drawn past the fire truck and through the right turn, plus this much. */
const BLOCKED_PAST_TURN = 30;

export function RerouteMap({ shown }: { shown: boolean }) {
  const { state, meta } = useCabinScreen();
  const { course, detour, world } = state;
  const { city, loop, uturn: uturnLoop } = world;
  // The way out the car took, once it has switched to it.
  const option = world.reroutes.find((o) => o.to === course) ?? null;
  const ref = useRef<HTMLDivElement>(null);
  const size = useSize(ref);

  // The car stands still at the stop while the map is up, so one read is enough.
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- re-read each time the map opens
  const car = useMemo(() => meta.getSnapshot(), [meta, shown]);

  const uturn = uturnLoop !== null && course === uturnLoop;
  const setup = (option ?? world.reroutes[0]).map;
  const region: Region = uturn ? UTURN_REGION : setup.region;
  const routes = useMemo(() => {
    const at = car.dist;
    if (uturnLoop && course === uturnLoop) {
      return {
        next: trace(uturnLoop, null, at, world.uturnEnd),
        old: trace(loop, null, loop.stopAt, loop.corners[0][1] + BLOCKED_PAST_TURN),
      };
    }
    // Before the course switches there is no new route to show yet.
    if (!option) return null;
    // The new route to its end; the old one from the car to where the new one meets it again,
    // out of the old loop's second turn.
    return {
      next: trace(option.to, detour, at, option.end),
      old: trace(option.from, null, at, option.from.corners[1][1] + PAST_MERGE),
    };
  }, [course, detour, car, loop, uturnLoop, option, world]);

  // The right half, clear of the reroute panel on the left.
  const clear = useMemo<Clear>(
    () => ({ left: size.w / 2 + GAP, top: GAP, right: GAP, bottom: BOTTOM }),
    [size.w],
  );
  const view = useView(size, region, clear);
  const line = (pts: Point[]) => toPoints(view, pts);
  const end = routes?.next.at(-1);

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
            {/* Roads are the white background; blocks and buildings sit on it. */}
            <FlatCity city={city} view={view} />
            {routes && (
              <>
                <polyline
                  points={line(routes.old)}
                  fill="none"
                  strokeWidth={8}
                  strokeDasharray="10 10"
                  className="reroute-map__old stroke-path opacity-70"
                />
                {/* A path, not a polyline: pathLength lets the draw-in run 1 → 0 at any length. */}
                <path
                  d={`M${line(routes.next)}`}
                  pathLength={1}
                  fill="none"
                  strokeWidth={10}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="reroute-map__route stroke-path"
                />
              </>
            )}
            {/* Where the new route ends: a red pin, its tip on the route's last point. */}
            {end && (
              <g transform={`translate(${view.x(end[0])} ${view.y(end[1])})`}>
                <g className="reroute-map__pin">
                  <path
                    d="M0 0 C-4 -10 -16 -19 -16 -32 A16 16 0 1 1 16 -32 C16 -19 4 -10 0 0 Z"
                    strokeWidth={3}
                    strokeLinejoin="round"
                    className="fill-danger stroke-surface"
                  />
                  <circle cy={-32} r={6} className="fill-danger-foreground" />
                </g>
              </g>
            )}
            <CarMarker
              transform={`translate(${view.x(car.x)} ${view.y(car.z)}) rotate(${screenHeading(car.heading)})`}
            />
          </svg>
          <StreetLabels
            world={world}
            view={view}
            nsLabelZ={uturn ? UTURN_NS_LABEL_Z : setup.nsLabelZ}
            ewLabelX={setup.ewLabelX}
          />
        </>
      )}
    </div>
  );
}
