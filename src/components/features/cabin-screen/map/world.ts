// The cabin map's world: a small grid city, the car's loop and traffic. The drive sim is in ../sim.ts.
// Units are meters. Forward on the first leg is -z (north).
import * as THREE from "three";

export const ROAD_HALF = 7;
export const WALK = 3;
export const ROADS_X = [-100, 0, 100];
export const ROADS_Z = [-140, -40, 60, 160];
export const EXTENT = 260;

/** Where the roads run: the x of each north-south road and the z of each east-west one. */
export type Grid = { roadsX: number[]; roadsZ: number[] };
/** The Stalled city: 100m blocks. */
export const STALL_GRID: Grid = { roadsX: ROADS_X, roadsZ: ROADS_Z };
/** The Looping city: 60m blocks, so the car's loop round one block is about half as long. */
export const LOOP_GRID: Grid = {
  roadsX: [-180, -120, -60, 0, 60, 120, 180],
  roadsZ: [-240, -180, -120, -60, 0, 60, 120, 180],
};
/** Plan-view radius of the sidewalk blocks' corners, where the curb turns at an intersection. */
export const CURB_RADIUS = 3.5;
/** Edge radius of the buildings. */
export const BUILDING_RADIUS = 1.2;

export type Box = {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
};

function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

export const wrap = (v: number, m: number) => ((v % m) + m) % m;

/* ---------- The car's route: right lane, clockwise around a block, right turns only ---------- */

export type Loop = {
  len: number;
  at: (d: number, out: THREE.Vector3) => THREE.Vector3;
  corners: [number, number][];
  /** Route distance where the car stops behind the cones, and stays: it's stuck. */
  stopAt: number;
};

/** The roads a loop runs round, clockwise: up `west`, right onto `north`, down `east`, along `south`. */
type Block = { west: number; east: number; north: number; south: number };

/**
 * The Stalled loop round the block `north` of Pine St. `north` is the cross road the loop turns
 * right onto: -40 for one block, -140 for two. The car stops behind the cones on its first leg.
 */
export function buildLoop(north = -40): Loop {
  // Stuck behind the lane closure: the car's nose sits CONE_GAP short of the cone row.
  const stopZ = CONE_ROW_Z + CONE_GAP + NOSE_AHEAD;
  return blockLoop({ west: 0, east: 100, north, south: 60 }, stopZ);
}

/**
 * A loop in the right lane round `block`, clockwise. It starts on leg `startLeg`, just past the
 * turn onto it: 0 heads north up `west`, 1 east along `north`, 2 south down `east`, 3 west along
 * `south`. `stopZ` is where the car's center halts on leg 0 (only meaningful when it starts there).
 */
function blockLoop(
  { west, east, north, south }: Block,
  stopZ: number,
  startLeg: 0 | 1 | 2 | 3 = 0,
): Loop {
  const x0 = west + 5.25;
  const x1 = east - 5.25;
  const z0 = north + 5.25;
  const z1 = south - 5.25;
  const r = 4;
  // The four right turns, in driving order from leg 0: [center x, center z, from angle, to angle].
  const turns: [number, number, number, number][] = [
    [x0 + r, z0 + r, Math.PI, 1.5 * Math.PI],
    [x1 - r, z0 + r, 1.5 * Math.PI, 2 * Math.PI],
    [x1 - r, z1 - r, 0, 0.5 * Math.PI],
    [x0 + r, z1 - r, 0.5 * Math.PI, Math.PI],
  ];
  // Start where the turn before `startLeg` ends.
  const [pcx, pcz, , pa1] = turns[(startLeg + 3) % 4];
  const pts: [number, number][] = [[pcx + r * Math.cos(pa1), pcz + r * Math.sin(pa1)]];
  const marks: number[] = [];
  for (let k = 0; k < 4; k++) {
    const [cx, cz, a0, a1] = turns[(startLeg + k) % 4];
    marks.push(pts.length);
    for (let i = 0; i <= 16; i++) {
      const a = a0 + ((a1 - a0) * i) / 16;
      pts.push([cx + r * Math.cos(a), cz + r * Math.sin(a)]);
    }
    marks.push(pts.length - 1);
  }

  return measure(pts, marks, z1 - r - stopZ);
}

/** A Loop from its points (closed: the last equals the first) and corner start/end indices. */
function measure(pts: [number, number][], marks: number[], stopAt: number): Loop {
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

  return { len, at, corners, stopAt };
}

/**
 * The U-turn the car makes after a Ride Support agent sends it back the way it came. Same start
 * and first leg as `loop`, up to the stop behind the cones. There it U-turns into the inner
 * southbound lane, tight enough to stay clear of the cones, and heads back south. To close the
 * loop for the sim it then goes left round the far block (Lake St, Elm St, Cedar St) and turns
 * right back onto its first leg, all well off screen.
 */
function buildUturnLoop(): Loop {
  const pts: [number, number][] = [[5.25, 50.75]];
  const marks: number[] = [];
  const arc = (cx: number, cz: number, r: number, a0: number, a1: number) => {
    marks.push(pts.length);
    for (let i = 0; i <= 24; i++) {
      const a = a0 + ((a1 - a0) * i) / 24;
      pts.push([cx + r * Math.cos(a), cz + r * Math.sin(a)]);
    }
    marks.push(pts.length - 1);
  };
  const stopZ = CONE_ROW_Z + CONE_GAP + NOSE_AHEAD;
  const R = 6;
  // From the right northbound lane (x 5.25) to the inner southbound one (x -1.75).
  arc(1.75, stopZ, 3.5, 0, -Math.PI);
  // Left onto Lake St eastbound (inner lane), up Elm St northbound, left onto Cedar St westbound.
  arc(-1.75 + R, 161.75 - R, R, Math.PI, 0.5 * Math.PI);
  arc(101.75 - R, 161.75 - R, R, 0.5 * Math.PI, 0);
  arc(101.75 - R, 58.25 + R, R, 0, -0.5 * Math.PI);
  // Right back onto Comal St northbound, then the short straight to the start.
  arc(5.25 + 4, 58.25 - 4, 4, 0.5 * Math.PI, Math.PI);
  pts.push([5.25, 50.75]);
  return measure(pts, marks, 50.75 - stopZ);
}

/* ---------- Lane closure ahead of the car's first stop ---------- */

/** Meters from the car's center to its front bumper (map/Vehicle.tsx: 2.35 m × LENGTH). */
export const NOSE_AHEAD = 2.16;
/** Meters between the stopped car's nose and the cone row. */
export const CONE_GAP = 4.2;
/** The cone row across the car's lane, 2.8m short of the crosswalk at z = -30. */
const CONE_ROW_Z = -40 + ROAD_HALF + WALK + 2.8;

/** Cone footprints (x, z), all in the car's northbound lane on the x = 0 road. */
export const CONES: [number, number][] = [
  [3.9, CONE_ROW_Z],
  [4.75, CONE_ROW_Z],
  [5.6, CONE_ROW_Z],
  [6.45, CONE_ROW_Z],
  [3.75, CONE_ROW_Z - 3.6],
  [3.6, -58],
  [3.6, -64],
];

/* ---------- Static city ---------- */

export function buildCity({ roadsX, roadsZ }: Grid = STALL_GRID) {
  const r = rng(11);
  const slabs: Box[] = [];
  const buildings: Box[] = [];
  const xs = [-EXTENT, ...roadsX, EXTENT];
  const zs = [-EXTENT, ...roadsZ, EXTENT];
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < zs.length - 1; j++) {
      const ax = xs[i] + (i === 0 ? 0 : ROAD_HALF);
      const bx = xs[i + 1] - (i + 1 === xs.length - 1 ? 0 : ROAD_HALF);
      const az = zs[j] + (j === 0 ? 0 : ROAD_HALF);
      const bz = zs[j + 1] - (j + 1 === zs.length - 1 ? 0 : ROAD_HALF);
      slabs.push({
        x: (ax + bx) / 2,
        y: 0.1,
        z: (az + bz) / 2,
        sx: bx - ax,
        sy: 0.2,
        sz: bz - az,
      });

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
  // A bollard on some sidewalk corners, just off the crosswalks.
  const bollards: Box[] = [];
  const corner = ROAD_HALF + WALK + 1.6;
  for (const xc of roadsX) {
    for (const zc of roadsZ) {
      for (const [sx, sz] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ]) {
        if (r() < 0.5) continue;
        bollards.push({
          x: xc + sx * corner,
          y: 0.2 + 0.7,
          z: zc + sz * corner,
          sx: 0.5,
          sy: 1.4,
          sz: 0.5,
        });
      }
    }
  }
  return { slabs, buildings, bollards };
}

export function buildMarkings({ roadsX, roadsZ }: Grid = STALL_GRID) {
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

  for (const xc of roadsX) {
    for (const [s0, s1] of runs(roadsZ)) {
      for (const off of [-0.15, 0.15]) {
        lines.push({
          x: xc + off,
          y,
          z: (s0 + s1) / 2,
          sx: 0.12,
          sy: t,
          sz: s1 - s0,
        });
      }
      for (const off of [-3.5, 3.5]) {
        for (let s = s0 + 1.5; s < s1 - 1.5; s += 9) {
          dashes.push({ x: xc + off, y, z: s + 1.5, sx: 0.15, sy: t, sz: 3 });
        }
      }
    }
  }
  for (const zc of roadsZ) {
    for (const [s0, s1] of runs(roadsX)) {
      for (const off of [-0.15, 0.15]) {
        lines.push({
          x: (s0 + s1) / 2,
          y,
          z: zc + off,
          sx: s1 - s0,
          sy: t,
          sz: 0.12,
        });
      }
      for (const off of [-3.5, 3.5]) {
        for (let s = s0 + 1.5; s < s1 - 1.5; s += 9) {
          dashes.push({ x: s + 1.5, y, z: zc + off, sx: 3, sy: t, sz: 0.15 });
        }
      }
    }
  }
  for (const xc of roadsX) {
    for (const zc of roadsZ) {
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
  /** The lane's fixed coordinate: x for north-south lanes, z for east-west ones. */
  at: number;
  dir: 1 | -1;
  speed: number;
  count: number;
  phase: number;
};

// Right-hand traffic. Heading -z (north) the right is +x; heading +x (east) the right is +z.
const NS_LANES = [
  [-5.25, 1],
  [-1.75, 1],
  [1.75, -1],
  [5.25, -1],
] as const;
const EW_LANES = [
  [-5.25, -1],
  [-1.75, -1],
  [1.75, 1],
  [5.25, 1],
] as const;

const lanes = (
  axis: Lane["axis"],
  roads: number[],
  offsets: typeof NS_LANES | typeof EW_LANES,
  isOwn: (road: number, off: number) => boolean,
): Lane[] =>
  roads.flatMap((c, i) =>
    offsets
      .filter(([off]) => !isOwn(c, off))
      .map(([off, dir], k) => ({
        axis,
        at: c + off,
        dir,
        speed: 7 + ((i * 4 + k + (axis === "x" ? 2 : 0)) % 5) * 1.3,
        count: 5,
        phase: (i * 37 + k * 53 + (axis === "x" ? 29 : 0)) % 100,
      })),
  );

// Both directions, kept apart by traffic signals. The car's own loop lanes are left empty.
const STALL_TRAFFIC: Lane[] = [
  ...lanes(
    "z",
    ROADS_X,
    NS_LANES,
    // The car's own lanes, plus the lane it borrows to get round the cones (map/detour.ts) and
    // the U-turn loop's lanes (`uturnLoop`).
    (c, off) =>
      (c === 0 && (off === 5.25 || off === 1.75 || off === -1.75)) ||
      (c === 100 && (off === -5.25 || off === 1.75)),
  ),
  ...lanes(
    "x",
    ROADS_Z,
    EW_LANES,
    // The loop's lanes, plus the north edge of the rerouted loop (`rerouteLoop`) and the U-turn
    // loop's lanes (`uturnLoop`).
    (c, off) =>
      (c === -40 && (off === 5.25 || off === 1.75)) ||
      (c === -140 && off === 5.25) ||
      (c === 60 && (off === -5.25 || off === -1.75)) ||
      (c === 160 && off === 1.75),
  ),
];

// The Looping car's lanes: up the x = 0 road, along z = -60, down the x = 60 road and back
// along z = 0. Plus the far side of each way out once rerouted (`LOOP_WORLD.reroutes`): z = -120
// eastbound, x = 120 southbound, z = 60 westbound, x = -60 northbound.
const LOOP_TRAFFIC: Lane[] = [
  ...lanes(
    "z",
    LOOP_GRID.roadsX,
    NS_LANES,
    (c, off) =>
      (c === 0 && off === 5.25) ||
      (c === 60 && off === -5.25) ||
      (c === 120 && off === -5.25) ||
      (c === -60 && off === 5.25),
  ),
  ...lanes(
    "x",
    LOOP_GRID.roadsZ,
    EW_LANES,
    (c, off) =>
      (c === -60 && off === 5.25) ||
      (c === -120 && off === 5.25) ||
      (c === 0 && off === -5.25) ||
      (c === 60 && off === -5.25),
  ),
];

/* ---------- Traffic sim: signals, queues and following distance ---------- */

const CAR_HALF = 2.25; // half a traffic car's length
const MIN_GAP = 2.5; // bumper to bumper when queued
const BRAKE = 4; // m/s², planned braking
const HARD_BRAKE = 7; // m/s², the most a car will brake for a light before it runs the amber
const ACCEL = 2.5; // m/s²
const STOP_LINE = ROAD_HALF + WALK + 0.6; // from the cross road's center to the stop line

// One cycle for every intersection: north-south green, all red, east-west green, all red.
const GREEN = 11;
const ALL_RED = 3;
const CYCLE = 2 * (GREEN + ALL_RED);
const isGreen = (axis: Lane["axis"], time: number) => {
  const t = wrap(time, CYCLE);
  return axis === "z" ? t < GREEN : t >= GREEN + ALL_RED && t < 2 * GREEN + ALL_RED;
};

export type TrafficCar = { lane: Lane; s: number; v: number };

/** Every traffic car, lane by lane, spread evenly along its lane. */
export function createTraffic(traffic: Lane[]): TrafficCar[] {
  const span = EXTENT * 2;
  return traffic.flatMap((lane) =>
    Array.from({ length: lane.count }, (_, k) => ({
      lane,
      s: wrap(lane.phase + (k * span) / lane.count, span) - EXTENT,
      v: lane.speed,
    })),
  );
}

/** Advance the traffic by dt seconds. `time` is the sim clock, for the signals. */
export function stepTraffic(cars: TrafficCar[], time: number, dt: number, grid: Grid) {
  const span = EXTENT * 2;
  const next = cars.map((car) => {
    const { lane } = car;
    // Following: cars in a lane never overtake, so the nearest car ahead is the leader.
    let gap = Infinity;
    for (const other of cars) {
      if (other === car || other.lane !== lane) continue;
      gap = Math.min(gap, wrap((other.s - car.s) * lane.dir, span) - 2 * CAR_HALF);
    }
    let target = Math.min(lane.speed, Math.sqrt(2 * BRAKE * Math.max(0, gap - MIN_GAP)));
    // Signals: stop at the next stop line on red, unless too close to stop (then it's committed).
    if (!isGreen(lane.axis, time)) {
      const cross = lane.axis === "z" ? grid.roadsZ : grid.roadsX;
      let toLine = Infinity;
      for (const c of cross) {
        const d = (c - lane.dir * (STOP_LINE + CAR_HALF) - car.s) * lane.dir;
        if (d > -0.5) toLine = Math.min(toLine, d);
      }
      if (toLine >= (car.v * car.v) / (2 * HARD_BRAKE) - 0.5) {
        target = Math.min(target, Math.sqrt(2 * BRAKE * Math.max(0, toLine)));
      }
    }
    const v = Math.max(0, car.v + Math.max(-HARD_BRAKE * dt, Math.min(ACCEL * dt, target - car.v)));
    return v;
  });
  cars.forEach((car, i) => {
    car.v = next[i];
    car.s = wrap(car.s + EXTENT + car.lane.dir * car.v * dt, span) - EXTENT;
  });
}

export function carSpot(car: TrafficCar, out: THREE.Vector3) {
  return car.lane.axis === "z" ? out.set(car.lane.at, 0, car.s) : out.set(car.s, 0, car.lane.at);
}

/** The loop the car drives. Shared by the sim, the route and the camera. */
export const loop = buildLoop();

/**
 * The way the car goes after the rider asks it to try another path ("Waymo seems lost"):
 * straight on at the corner where `loop` turns right, round the block to the north, and back
 * down the same east street. Starts at the same point and runs the same first leg, so a car
 * on that leg is at the same distance on both, and the stop behind the cones is the same.
 */
export const rerouteLoop = buildLoop(-140);

/** The way back after Ride Support sends the car round: a U-turn at the cones. See buildUturnLoop. */
export const uturnLoop = buildUturnLoop();

/** Meters past where the new route meets the old one again that it runs on to: its end, where
 *  the reroute map drops its pin and the car stops once the rider has confirmed it. */
export const PAST_MERGE = 12;
/** The U-turn route ends this far past its left onto Lake St. */
const UTURN_PAST_TURN = 20;

/** What the flat reroute map shows for one new route. */
export type RerouteMapSetup = {
  /** The part of the world the map frames: the car and the block the new route goes round. */
  region: { x0: number; x1: number; z0: number; z1: number };
  /** Where the north-south street names sit along each street, clear of the cross streets. */
  nsLabelZ: number;
  /** Where the east-west street names sit along each street. */
  ewLabelX: number;
};

/**
 * One way out after "Try another path": straight on at the next corner instead of turning, round
 * the block beyond, and back down to meet the old loop. `from` is the old loop and `to` the new
 * one, both starting on the leg the car is on, so a car on that leg is at the same distance on
 * both.
 */
export type RerouteOption = {
  from: Loop;
  to: Loop;
  /** Route distance on `to` where the new route ends: just past where it meets `from` again. */
  end: number;
  map: RerouteMapSetup;
};

/** A way out that goes `shift` meters further on before its second turn than `from` does. */
const option = (from: Loop, to: Loop, shift: number, map: RerouteMapSetup): RerouteOption => ({
  from,
  to,
  end: to.corners[1][1] + shift + PAST_MERGE,
  map,
});

/**
 * The Looping car's loop: round one 60m block, clockwise, with no obstruction anywhere. When the
 * rider asks it to try another path it pulls up wherever it can just ahead, on whichever of the
 * block's four streets that is, and goes straight on at that street's corner instead of turning.
 */
const LOOP_BLOCK: Block = { west: 0, east: 60, north: -60, south: 0 };
const LOOP_STOP_Z = LOOP_BLOCK.north + ROAD_HALF + WALK + 0.6 + NOSE_AHEAD;
const loopingLoop = blockLoop(LOOP_BLOCK, LOOP_STOP_Z);
/** The four ways out of the block, one per street, each a block further on past that street's
 *  corner: north, east, south, west. Each map frames the whole street the car may pull up on. */
const LOOP_REROUTES: RerouteOption[] = (
  [
    [{ ...LOOP_BLOCK, north: -120 }, { x0: -12, x1: 72, z0: -132, z1: 16 }, -90, 30],
    [{ ...LOOP_BLOCK, east: 120 }, { x0: -16, x1: 132, z0: -72, z1: 12 }, -30, 90],
    [{ ...LOOP_BLOCK, south: 60 }, { x0: -12, x1: 72, z0: -76, z1: 72 }, 30, 30],
    [{ ...LOOP_BLOCK, west: -60 }, { x0: -72, x1: 76, z0: -72, z1: 12 }, -30, -30],
  ] as const
).map(([block, region, nsLabelZ, ewLabelX], leg) =>
  option(
    leg === 0 ? loopingLoop : blockLoop(LOOP_BLOCK, LOOP_STOP_Z, leg as 1 | 2 | 3),
    blockLoop(block, LOOP_STOP_Z, leg as 0 | 1 | 2 | 3),
    60,
    { region, nsLabelZ, ewLabelX },
  ),
);

/**
 * Everything the map and the drive sim need for one demo scenario: the streets, the car's loop,
 * where it goes when it reroutes, and whether there's a lane closure to get stuck at.
 */
export type World = {
  grid: Grid;
  city: ReturnType<typeof buildCity>;
  markings: ReturnType<typeof buildMarkings>;
  traffic: Lane[];
  /** The loop the car starts on. */
  loop: Loop;
  /**
   * Where it can go after "Try another path", one per leg of `loop` it might be on when it
   * stops: Stalled has one (it's stuck on its first leg); Looping has four.
   */
  reroutes: RerouteOption[];
  /** Where Ride Support sends it back the way it came; null when there's nothing to turn from. */
  uturn: Loop | null;
  /** Route distance on `uturn` where the U-turn route ends, as for `RerouteOption.end`. */
  uturnEnd: number;
  /** Cones across the first leg. The car is stuck behind them from the start, for good. */
  cones: boolean;
  /** How long "Trying another route" shows before the new route, from the rider's tap. */
  reroutingMs: number;
  /** Street names for the reroute map, one per road in the grid. The 3D map has none. */
  nsNames: string[];
  ewNames: string[];
  /** Minutes the trip starts with on top of the base arrival time (traffic already counted). */
  startDelay: number;
  /** Heavy traffic on the route ahead that the car reroutes round on its own; null for none. */
  heavyTraffic: TrafficSetup | null;
};

/**
 * Heavy traffic ahead on `World.loop`. The car notices it at `detectAt`, finds a faster way
 * (`World.reroutes[0]`) and takes it without the rider doing anything.
 */
export type TrafficSetup = {
  /** Route distance on `loop` where the car notices the traffic. Before the way out diverges. */
  detectAt: number;
  /** The slow stretch on `loop`, as route distances [from, to]. */
  jam: [number, number];
  /** What the jam would add, and what the new route saves against it, in minutes. */
  jamMinutes: number;
  savedMinutes: number;
  /** The street the jam is on, and the one the new route takes instead, for the copy. */
  jamStreet: string;
  viaStreet: string;
  /** The part of the world the full-screen traffic map frames. */
  region: { x0: number; x1: number; z0: number; z1: number };
  /** Where the street names sit, as for `RerouteMapSetup`. */
  nsLabelZ: number;
  ewLabelX: number;
};

/** Stalled: stuck behind a lane closure on Comal St. */
export const STALL_WORLD: World = {
  grid: STALL_GRID,
  city: buildCity(STALL_GRID),
  markings: buildMarkings(STALL_GRID),
  traffic: STALL_TRAFFIC,
  loop,
  reroutes: [
    option(loop, rerouteLoop, 100, {
      region: { x0: -12, x1: 112, z0: -152, z1: -8 },
      nsLabelZ: -90,
      ewLabelX: 50,
    }),
  ],
  uturn: uturnLoop,
  uturnEnd: uturnLoop.corners[1][1] + UTURN_PAST_TURN,
  cones: true,
  reroutingMs: 3000,
  nsNames: ["Lamar Blvd", "Comal St", "Elm St"],
  ewNames: ["Oak St", "Pine St", "Cedar St", "Lake St"],
  startDelay: 0,
  heavyTraffic: null,
};

/**
 * Rerouting: the Stalled city with no lane closure. Heavy traffic on Pine St, the street the car
 * would turn onto; it notices on its way up Comal St and goes on to Oak St instead.
 */
export const REROUTE_WORLD: World = {
  ...STALL_WORLD,
  uturn: null,
  uturnEnd: 0,
  cones: false,
  startDelay: 6,
  heavyTraffic: {
    detectAt: 15,
    jam: [loop.corners[0][1] + 8, loop.corners[1][0] - 8],
    jamMinutes: 6,
    savedMinutes: 4,
    jamStreet: "Pine St",
    viaStreet: "Oak St",
    region: { x0: -40, x1: 140, z0: -160, z1: 60 },
    nsLabelZ: 10,
    ewLabelX: 50,
  },
};

/** Looping: circles one small block with nothing in the way, as if it can't find its way out. */
export const LOOP_WORLD: World = {
  grid: LOOP_GRID,
  city: buildCity(LOOP_GRID),
  markings: buildMarkings(LOOP_GRID),
  traffic: LOOP_TRAFFIC,
  loop: loopingLoop,
  reroutes: LOOP_REROUTES,
  uturn: null,
  uturnEnd: 0,
  cones: false,
  reroutingMs: 5000,
  startDelay: 0,
  heavyTraffic: null,
  nsNames: [
    "Rio Grande St",
    "Nueces St",
    "San Gabriel St",
    "Comal St",
    "Elm St",
    "Pecan St",
    "Lamar Blvd",
  ],
  ewNames: [
    "Oak St",
    "Pine St",
    "Birch St",
    "Maple St",
    "Cedar St",
    "Lake St",
    "Bay St",
    "Hill St",
  ],
};

export { cssVar } from "@/lib/css-var";
