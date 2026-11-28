"use client";

// Parts of the flat, top-down street map (the reroute overview, RerouteMap.tsx): fitting a part of the world to the screen, the city's blocks and buildings, the street names,
// route lines and the car's arrow. Drawn from the same city as the 3D map (world.ts), so streets
// and routes line up with it. North up.
import {
  type CSSProperties,
  memo,
  type RefObject,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import * as THREE from "three";
import { pathAt } from "../map/detour";
import { BUILDING_RADIUS, CURB_RADIUS, type Loop, type World } from "../map/world";

export type Region = { x0: number; x1: number; z0: number; z1: number };
export type Point = [number, number];
/** Px kept clear on each side of the screen when the region is fitted. */
export type Clear = { left: number; top: number; right: number; bottom: number };
/** World meters to screen px. */
export type View = { s: number; x: (x: number) => number; y: (z: number) => number };

/** World points along `course` from `from` to `to` (route distances), round the fire truck if `detour`. */
export function trace(course: Loop, detour: number | null, from: number, to: number) {
  const out: Point[] = [];
  const p = new THREE.Vector3();
  for (let d = from; d <= to; d += 1) {
    pathAt(course, d, detour, p);
    out.push([p.x, p.z]);
  }
  return out;
}

/** The element's size, kept up to date. */
export function useSize(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) =>
      setSize({ w: e.contentRect.width, h: e.contentRect.height }),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

/** Fits `region` into a `w` × `h` screen, inside `clear`, keeping its proportions. */
export function useView(size: { w: number; h: number }, region: Region, clear: Clear): View {
  return useMemo(() => {
    const { w, h } = size;
    const aw = w - clear.left - clear.right;
    const ah = h - clear.top - clear.bottom;
    const rw = region.x1 - region.x0;
    const rh = region.z1 - region.z0;
    const s = Math.max(0.1, Math.min(aw / rw, ah / rh));
    const ox = clear.left + (aw - rw * s) / 2 - region.x0 * s;
    const oy = clear.top + (ah - rh * s) / 2 - region.z0 * s;
    return { s, x: (x: number) => ox + x * s, y: (z: number) => oy + z * s };
  }, [size, region, clear]);
}

/** SVG polyline points for world points. */
export const line = (view: View, pts: Point[]) =>
  pts.map(([x, z]) => `${view.x(x)},${view.y(z)}`).join(" ");

/** Sidewalk blocks and buildings. Roads are whatever background is behind them. */
export const FlatCity = memo(function FlatCity({
  city,
  view,
}: {
  city: World["city"];
  view: View;
}) {
  return (
    <>
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
    </>
  );
});

/** Positions an HTML label centered on a world point. */
export const at = (view: View, x: number, z: number, vertical = false): CSSProperties => ({
  left: view.x(x),
  top: view.y(z),
  transform: `translate(-50%, -50%)${vertical ? " rotate(-90deg)" : ""}`,
});

/** Street names: north-south ones run up the street at `nsLabelZ`, east-west ones at `ewLabelX`. */
export function StreetLabels({
  world,
  view,
  nsLabelZ,
  ewLabelX,
}: {
  world: World;
  view: View;
  nsLabelZ: number;
  ewLabelX: number;
}) {
  return (
    <>
      {world.grid.roadsX.map((x, i) => (
        <span
          key={`x${x}`}
          className="absolute text-caption whitespace-nowrap text-muted"
          style={at(view, x, nsLabelZ, true)}
        >
          {world.nsNames[i]}
        </span>
      ))}
      {world.grid.roadsZ.map((z, i) => (
        <span
          key={`z${z}`}
          className="absolute text-caption whitespace-nowrap text-muted"
          style={at(view, ewLabelX, z - 3)}
        >
          {world.ewNames[i]}
        </span>
      ))}
    </>
  );
}

/** Degrees clockwise from screen-up for a car heading (radians around +y, 0 faces +z). */
export const screenHeading = (heading: number) =>
  (Math.atan2(Math.sin(heading), -Math.cos(heading)) * 180) / Math.PI;

/** The car: a navigation arrow in a dot, pointing the way it faces. Place it with `transform`. */
export function CarMarker(props: { transform?: string; ref?: RefObject<SVGGElement | null> }) {
  return (
    <g {...props}>
      <circle r={20} strokeWidth={4} className="fill-accent stroke-surface" />
      <path d="M0 -10 L8 8 L0 4 L-8 8 Z" className="fill-accent-foreground" />
    </g>
  );
}
