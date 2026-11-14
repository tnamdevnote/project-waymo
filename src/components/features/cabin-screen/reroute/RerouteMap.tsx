"use client";

// The flat street map shown while the rider looks over a new route (reroute "overview"): a plain
// top-down map like a phone's maps app, on the right half beside the reroute panel, north up, instead of the 3D chase view. Drawn from the
// same city as the 3D map (world.ts), so the streets, blocks and routes line up with it. The new
// route is solid green; the old one is dashed beside it, up to where the two meet again. After a
// Ride Support call the new route is a U-turn instead: back south, with the blocked way ahead
// dashed. Each time the map opens the new route draws itself out from the car and a red pin drops
// where it ends (motion in globals.css under `.reroute-map`).
import { type CSSProperties, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useCabinScreen } from "../CabinScreenRoot";
import { pathAt } from "../map/detour";
import {
  BUILDING_RADIUS,
  buildCity,
  CURB_RADIUS,
  type Loop,
  loop,
  rerouteLoop,
  ROADS_X,
  ROADS_Z,
  uturnLoop,
} from "../map/world";

const city = buildCity();

type Region = { x0: number; x1: number; z0: number; z1: number };

/** The part of the world the map frames: the block the new route goes round, and the car. */
const REGION: Region = { x0: -12, x1: 112, z0: -152, z1: -8 };
/** For the U-turn: the car, the blocked way ahead, and the way back south to Lake St. */
const UTURN_REGION: Region = { x0: -30, x1: 70, z0: -50, z1: 175 };
/** Where the north-south street names sit along each street, clear of the cross streets. */
const NS_LABEL_Z = -90;
const UTURN_NS_LABEL_Z = 110;
/**
 * Where the map fits the region on screen, in px from each edge: the right half, clear of the
 * reroute panel on the left half (plus a 48px gap) and the menu bar at the bottom. `left` is
 * added to half the width.
 */
const CLEAR = { left: 48, top: 48, right: 48, bottom: 176 };

/** Where the old and new routes meet again: the start of the east street, where `loop` heads
 *  south out of its second corner and `rerouteLoop`, 100m further north, comes down past it. */
const OLD_MERGE = loop.corners[1][1];
const NEW_MERGE = rerouteLoop.corners[1][1] + (-40 - -140);
/** Meters past the merge to keep drawing, so the two visibly join. */
const PAST_MERGE = 12;
/** The U-turn route, drawn through the U-turn and its left onto Lake St, plus this much. */
const UTURN_PAST_TURN = 20;
/** The blocked way, drawn through the cones and the right turn, plus this much. */
const BLOCKED_PAST_TURN = 30;

/** Street names, for the labels. The 3D map has none; these only orient the rider. */
const NS_NAMES = ["Lamar Blvd", "Comal St", "Elm St"];
const EW_NAMES = ["Oak St", "Pine St", "Cedar St", "Lake St"];

type Point = [number, number];

/** World points along `course` from `from` to `to` (route distances), past the cones if `detour`. */
function trace(course: Loop, detour: number | null, from: number, to: number) {
  const out: Point[] = [];
  const p = new THREE.Vector3();
  for (let d = from; d <= to; d += 1) {
    pathAt(course, d, detour, p);
    out.push([p.x, p.z]);
  }
  return out;
}

export function RerouteMap({ shown }: { shown: boolean }) {
  const { state, meta } = useCabinScreen();
  const { course, detour } = state;
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) =>
      setSize({ w: e.contentRect.width, h: e.contentRect.height }),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The car stands still at the stop while the map is up, so one read is enough.
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- re-read each time the map opens
  const car = useMemo(() => meta.getSnapshot(), [meta, shown]);

  const uturn = course === uturnLoop;
  const region = uturn ? UTURN_REGION : REGION;
  const routes = useMemo(() => {
    const at = car.dist;
    if (course === uturnLoop) {
      return {
        next: trace(uturnLoop, null, at, uturnLoop.corners[1][1] + UTURN_PAST_TURN),
        old: trace(loop, null, loop.stopAt, loop.corners[0][1] + BLOCKED_PAST_TURN),
      };
    }
    // Before the course switches there is no new route to show yet.
    if (course !== rerouteLoop) return null;
    return {
      next: trace(rerouteLoop, detour, at, at + (NEW_MERGE - loop.stopAt) + PAST_MERGE),
      old: trace(loop, null, loop.stopAt, OLD_MERGE + PAST_MERGE),
    };
  }, [course, detour, car]);

  // World meters to screen px: north up, the region fitted into the clear area.
  const view = useMemo(() => {
    const { w, h } = size;
    const left = w / 2 + CLEAR.left;
    const aw = w - left - CLEAR.right;
    const ah = h - CLEAR.top - CLEAR.bottom;
    const rw = region.x1 - region.x0;
    const rh = region.z1 - region.z0;
    const s = Math.max(0.1, Math.min(aw / rw, ah / rh));
    const ox = left + (aw - rw * s) / 2 - region.x0 * s;
    const oy = CLEAR.top + (ah - rh * s) / 2 - region.z0 * s;
    return { s, x: (x: number) => ox + x * s, y: (z: number) => oy + z * s };
  }, [size, region]);

  const line = (pts: Point[]) => pts.map(([x, z]) => `${view.x(x)},${view.y(z)}`).join(" ");
  const end = routes?.next.at(-1);
  // Clockwise from screen-up, for the car's arrow.
  const heading = (Math.atan2(Math.sin(car.heading), -Math.cos(car.heading)) * 180) / Math.PI;
  const label = (x: number, z: number, vertical = false): CSSProperties => ({
    left: view.x(x),
    top: view.y(z),
    transform: `translate(-50%, -50%)${vertical ? " rotate(-90deg)" : ""}`,
  });

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
            {city.slabs.map((b, i) => (
              <rect
                key={`s${i}`}
                x={view.x(b.x - b.sx / 2)}
                y={view.y(b.z - b.sz / 2)}
                width={b.sx * view.s}
                height={b.sz * view.s}
                rx={CURB_RADIUS * view.s}
                className="fill-surface-secondary"
              />
            ))}
            {city.buildings.map((b, i) => (
              <rect
                key={`b${i}`}
                x={view.x(b.x - b.sx / 2)}
                y={view.y(b.z - b.sz / 2)}
                width={b.sx * view.s}
                height={b.sz * view.s}
                rx={Math.max(2, BUILDING_RADIUS * view.s)}
                className="fill-surface-tertiary"
              />
            ))}
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
            {/* The car: a navigation arrow in a dot, pointing the way it faces. */}
            <g transform={`translate(${view.x(car.x)} ${view.y(car.z)}) rotate(${heading})`}>
              <circle r={20} strokeWidth={4} className="fill-accent stroke-surface" />
              <path d="M0 -10 L8 8 L0 4 L-8 8 Z" className="fill-accent-foreground" />
            </g>
          </svg>
          {ROADS_X.map((x, i) => (
            <span
              key={`x${x}`}
              className="absolute text-caption whitespace-nowrap text-muted"
              style={label(x, uturn ? UTURN_NS_LABEL_Z : NS_LABEL_Z, true)}
            >
              {NS_NAMES[i]}
            </span>
          ))}
          {ROADS_Z.map((z, i) => (
            <span
              key={`z${z}`}
              className="absolute text-caption whitespace-nowrap text-muted"
              style={label(50, z - 3)}
            >
              {EW_NAMES[i]}
            </span>
          ))}
        </>
      )}
    </div>
  );
}
