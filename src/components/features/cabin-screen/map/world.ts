// The cabin map's world: a small grid city, the car's loop and traffic. The drive sim is in ../sim.ts.
// Units are meters. Forward on the first leg is -z (north).
import * as THREE from "three";

export const ROAD_HALF = 7;
export const WALK = 3;
export const ROADS_X = [-100, 0, 100];
export const ROADS_Z = [-140, -40, 60, 160];
export const EXTENT = 260;

export type Box = { x: number; y: number; z: number; sx: number; sy: number; sz: number };

function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

export const wrap = (v: number, m: number) => ((v % m) + m) % m;

/* ---------- The car's route: right lane, clockwise around one block, right turns only ---------- */

export type Loop = {
  len: number;
  at: (d: number, out: THREE.Vector3) => THREE.Vector3;
  corners: [number, number][];
  stopAt: number;
};

export function buildLoop(): Loop {
  const x0 = 5.25;
  const x1 = 94.75;
  const z0 = -34.75;
  const z1 = 54.75;
  const r = 4;
  const pts: [number, number][] = [[x0, z1 - r]];
  const marks: number[] = [];
  const arc = (cx: number, cz: number, a0: number, a1: number) => {
    marks.push(pts.length);
    for (let i = 0; i <= 16; i++) {
      const a = a0 + ((a1 - a0) * i) / 16;
      pts.push([cx + r * Math.cos(a), cz + r * Math.sin(a)]);
    }
    marks.push(pts.length - 1);
  };
  arc(x0 + r, z0 + r, Math.PI, 1.5 * Math.PI);
  arc(x1 - r, z0 + r, 1.5 * Math.PI, 2 * Math.PI);
  arc(x1 - r, z1 - r, 0, 0.5 * Math.PI);
  arc(x0 + r, z1 - r, 0.5 * Math.PI, Math.PI);

  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }
  const len = cum[cum.length - 1];
  const corners: [number, number][] = [];
  for (let k = 0; k < marks.length; k += 2) corners.push([cum[marks[k]], cum[marks[k + 1]]]);

  const at = (d: number, out: THREE.Vector3) => {
    d = wrap(d, len);
    let lo = 0;
    let hi = cum.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] <= d) lo = mid;
      else hi = mid;
    }
    const t = (d - cum[lo]) / (cum[hi] - cum[lo] || 1);
    return out.set(
      pts[lo][0] + (pts[hi][0] - pts[lo][0]) * t,
      0,
      pts[lo][1] + (pts[hi][1] - pts[lo][1]) * t,
    );
  };

  // Stop sign before the first crosswalk: car center sits 3m behind the white line.
  const stopZ = -40 + ROAD_HALF + WALK + 0.6 + 2.4;
  return { len, at, corners, stopAt: z1 - r - stopZ };
}

/* ---------- Static city ---------- */

export function buildCity() {
  const r = rng(11);
  const slabs: Box[] = [];
  const buildings: Box[] = [];
  const xs = [-EXTENT, ...ROADS_X, EXTENT];
  const zs = [-EXTENT, ...ROADS_Z, EXTENT];
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < zs.length - 1; j++) {
      const ax = xs[i] + (i === 0 ? 0 : ROAD_HALF);
      const bx = xs[i + 1] - (i + 1 === xs.length - 1 ? 0 : ROAD_HALF);
      const az = zs[j] + (j === 0 ? 0 : ROAD_HALF);
      const bz = zs[j + 1] - (j + 1 === zs.length - 1 ? 0 : ROAD_HALF);
      slabs.push({ x: (ax + bx) / 2, y: 0.1, z: (az + bz) / 2, sx: bx - ax, sy: 0.2, sz: bz - az });

      const inset = 6;
      const lx0 = ax + inset;
      const lx1 = bx - inset;
      const lz0 = az + inset;
      const lz1 = bz - inset;
      const nx = Math.max(1, Math.round((lx1 - lx0) / 24));
      const nz = Math.max(1, Math.round((lz1 - lz0) / 24));
      const w = (lx1 - lx0) / nx;
      const h = (lz1 - lz0) / nz;
      for (let a = 0; a < nx; a++) {
        for (let b = 0; b < nz; b++) {
          if (r() < 0.2) continue;
          const gap = 1.5 + r() * 2.5;
          const height = 4 + r() * r() * 32;
          buildings.push({
            x: lx0 + w * (a + 0.5),
            y: height / 2 + 0.2,
            z: lz0 + h * (b + 0.5),
            sx: w - gap * 2,
            sy: height,
            sz: h - gap * 2,
          });
        }
      }
    }
  }
  return { slabs, buildings };
}

export function buildMarkings() {
  const lines: Box[] = [];
  const dashes: Box[] = [];
  const walks: Box[] = [];
  const y = 0.02;
  const t = 0.02;
  const clear = ROAD_HALF + WALK + 0.6;

  const runs = (cross: number[]) => {
    const b = [-EXTENT, ...cross, EXTENT];
    const out: [number, number][] = [];
    for (let k = 0; k < b.length - 1; k++) {
      out.push([b[k] + (k === 0 ? 0 : clear), b[k + 1] - (k + 1 === b.length - 1 ? 0 : clear)]);
    }
    return out;
  };

  for (const xc of ROADS_X) {
    for (const [s0, s1] of runs(ROADS_Z)) {
      for (const off of [-0.15, 0.15]) {
        lines.push({ x: xc + off, y, z: (s0 + s1) / 2, sx: 0.12, sy: t, sz: s1 - s0 });
      }
      for (const off of [-3.5, 3.5]) {
        for (let s = s0 + 1.5; s < s1 - 1.5; s += 9) {
          dashes.push({ x: xc + off, y, z: s + 1.5, sx: 0.15, sy: t, sz: 3 });
        }
      }
    }
  }
  for (const zc of ROADS_Z) {
    for (const [s0, s1] of runs(ROADS_X)) {
      for (const off of [-0.15, 0.15]) {
        lines.push({ x: (s0 + s1) / 2, y, z: zc + off, sx: s1 - s0, sy: t, sz: 0.12 });
      }
      for (const off of [-3.5, 3.5]) {
        for (let s = s0 + 1.5; s < s1 - 1.5; s += 9) {
          dashes.push({ x: s + 1.5, y, z: zc + off, sx: 3, sy: t, sz: 0.15 });
        }
      }
    }
  }
  for (const xc of ROADS_X) {
    for (const zc of ROADS_Z) {
      for (let k = 0; k < 10; k++) {
        const o = -6.3 + k * 1.4;
        const e = ROAD_HALF + WALK / 2;
        walks.push({ x: xc + o, y, z: zc - e, sx: 0.7, sy: t, sz: WALK });
        walks.push({ x: xc + o, y, z: zc + e, sx: 0.7, sy: t, sz: WALK });
        walks.push({ x: xc - e, y, z: zc + o, sx: WALK, sy: t, sz: 0.7 });
        walks.push({ x: xc + e, y, z: zc + o, sx: WALK, sy: t, sz: 0.7 });
      }
    }
  }
  return { lines, dashes, walks };
}

/* ---------- Moving things ---------- */

export type Lane = {
  axis: "x" | "z";
  at: number;
  dir: 1 | -1;
  speed: number;
  count: number;
  phase: number;
};

// North-south traffic only, so nothing ever crosses another car's path. The car's own lanes are left empty.
export const TRAFFIC: Lane[] = ROADS_X.flatMap((xc, i) =>
  (
    [
      [-5.25, 1],
      [-1.75, 1],
      [1.75, -1],
      [5.25, -1],
    ] as const
  )
    .filter(([off]) => !(xc === 0 && off === 5.25) && !(xc === 100 && off === -5.25))
    .map(([off, dir], k) => ({
      axis: "z" as const,
      at: xc + off,
      dir,
      speed: 7 + ((i * 4 + k) % 5) * 1.3,
      count: 5,
      phase: (i * 37 + k * 53) % 100,
    })),
);

export function laneSpot(lane: Lane, k: number, time: number, out: THREE.Vector3) {
  const span = EXTENT * 2;
  const s =
    wrap(lane.phase + (k * span) / lane.count + lane.dir * lane.speed * time, span) - EXTENT;
  return lane.axis === "z" ? out.set(lane.at, 0, s) : out.set(s, 0, lane.at);
}

/** The one loop the car drives. Shared by the sim, the route and the camera. */
export const loop = buildLoop();
