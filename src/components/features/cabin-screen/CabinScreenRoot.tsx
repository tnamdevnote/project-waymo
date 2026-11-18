"use client";

// CabinScreen.Root: owns the drive sim and shares it with the map and any HTML panel.
// React state changes only when a coarse value changes; per-frame data goes through `meta`.
import {
  type ComponentProps,
  createContext,
  type RefObject,
  use,
  useCallback,
  useLayoutEffect,
  useMemo,
  useEffect,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { DETOUR_LENGTH, pathAt } from "./map/detour";
import { LOOP_WORLD, type Loop, REROUTE_WORLD, STALL_WORLD, type World, wrap } from "./map/world";
import { type Motion, motionOf, newSim, nextStop, stepSim } from "./sim";

/** Live per-frame values. A new object each frame, so it works with useSyncExternalStore. */
export type CabinLive = {
  /** Meters driven since the ride started (not wrapped to the loop). */
  dist: number;
  /** Current speed, m/s. */
  speed: number;
  /** Seconds simulated. */
  time: number;
  /** World position on the ground plane, meters. */
  x: number;
  z: number;
  /** Heading in radians around +y (0 faces +z). */
  heading: number;
  /** Slowing down hard enough to light the brake lights. */
  braking: boolean;
};

/**
 * Which demo story the ride plays, picked on the Start ride screen. "stalled": the car stops at
 * the cones and the rider troubleshoots it. "looping": the car circles one small block with
 * nothing in the way, and the rider reports it lost. "rerouting": the car finds heavy traffic
 * ahead and takes a faster way on its own; the rider doesn't have to do anything.
 */
export type RideScenario = "stalled" | "looping" | "rerouting";

/** The city and loops each scenario plays on. */
const WORLD_BY_SCENARIO: Record<RideScenario, World> = {
  stalled: STALL_WORLD,
  looping: LOOP_WORLD,
  rerouting: REROUTE_WORLD,
};

/** Where the ride is: waiting for the rider to press Start ride, or under way. */
export type RidePhase = "boarding" | "riding";

/**
 * The car is working out why it's stuck, after the rider reported it from Troubleshoot.
 * "scanning": checking the road ahead. "detected": found what's blocking it.
 * "reviewing": a remote agent is looking at it. "resolving": looking for a way around it.
 * "confirmed": found a safe path and about to resume the trip. Then the car drives around the
 * obstruction and diagnosis ends.
 */
export type DiagnosisStage = "scanning" | "detected" | "reviewing" | "resolving" | "confirmed";

/**
 * The car is finding another way, after the rider reported "Waymo seems lost" and picked
 * "Try another path". Not the same as diagnosis: nothing is being diagnosed, the car just plans a
 * different street. "rerouting": working it out, in the split view. "overview": a flat street
 * map shows the new route next to the old one, and waits for the rider to confirm. Then the car
 * drives the new way and rerouting ends.
 */
export type RerouteStage = "rerouting" | "overview";

/**
 * The rider is on a call with Ride Support, after picking "Call support", "Something else" or
 * "None of these" in Troubleshoot. "connecting": reaching a remote agent. "connected": talking to
 * them through the car. The call ends when the rider hangs up from the menu bar.
 */
export type SupportStage = "connecting" | "connected";

/**
 * The car reroutes round heavy traffic on its own (Rerouting scenario), with no rider input.
 * "rerouting": a flat map shows the jam and the way the car is considering. "found": it has
 * switched to the new route and the map shows it, with the time saved. "switched": back on the
 * 3D map, with a short note that it's on the faster route. "done": nothing left to show.
 */
export type TrafficStage = "rerouting" | "found" | "switched" | "done";

/** How long each traffic stage shows before the next. */
const TRAFFIC_MS: Record<Exclude<TrafficStage, "done">, number> = {
  rerouting: 3000,
  found: 3000,
  switched: 4000,
};

/** How long "connecting" shows before the agent picks up. */
const CONNECTING_MS = 3000;

/**
 * Minutes each new route adds to the trip, once the rider confirms it. The 3D city is too small
 * for its distances to mean anything, so these are set by hand: around the block, or back the way
 * the car came.
 */
const ROUTE_DELAY_MIN = new Map<Loop, number>([
  ...[...STALL_WORLD.reroutes, ...LOOP_WORLD.reroutes].map((o): [Loop, number] => [o.to, 2]),
  ...(STALL_WORLD.uturn ? [[STALL_WORLD.uturn, 4] as [Loop, number]] : []),
]);

/** Planned braking when the car pulls up to reroute, m/s² (the sim's own DECEL). */
const PULL_UP_DECEL = 2.5;

/** Where each stage goes next on its own, and after how long. */
const NEXT_STAGE: Partial<Record<DiagnosisStage, { to: DiagnosisStage; ms: number }>> = {
  scanning: { to: "detected", ms: 3000 },
  detected: { to: "reviewing", ms: 3000 },
  reviewing: { to: "resolving", ms: 3000 },
  resolving: { to: "confirmed", ms: 3000 },
};
/** How long "Safe path confirmed" shows before the car drives around the obstruction. */
const CONFIRMED_MS = 3000;

export type CabinScreenState = {
  scenario: RideScenario;
  /** The scenario's city and loops. */
  world: World;
  phase: RidePhase;
  /** Set while the car diagnoses a stall the rider reported; null otherwise. */
  diagnosis: DiagnosisStage | null;
  /** Set while the car reroutes at the rider's request; null otherwise. */
  reroute: RerouteStage | null;
  /** Set while the rider is on a call with Ride Support; null otherwise. */
  support: SupportStage | null;
  /** Where the car's own reroute round traffic is; null until it notices the traffic. */
  traffic: TrafficStage | null;
  /** The loop the car is driving: `world.loop`, or a reroute's `to` / `world.uturn` once it has
   *  rerouted. */
  course: Loop;
  /** Route distance (not wrapped) where the car's detour around an obstruction starts, while it
   *  is on it or just past it; null otherwise. See map/detour.ts. */
  detour: number | null;
  /** The rider wants the car moving (false after pullOver()). Only moves it while riding. */
  driving: boolean;
  motion: Motion;
  /** Cruise speed, m/s. */
  speed: number;
  /** Minutes on top of the base arrival time: the world's `startDelay` plus what reroutes have
   *  added (or, below it, saved). */
  delay: number;
  /** The rider confirmed a new route: the car drives to its end and stops there for good. */
  arriving: boolean;
};

export type CabinScreenActions = {
  setScenario: (scenario: RideScenario) => void;
  startRide: () => void;
  pullOver: () => void;
  resume: () => void;
  setSpeed: (speed: number) => void;
  startDiagnosis: () => void;
  endDiagnosis: () => void;
  startReroute: () => void;
  /** The rider accepts the new route: the car drives it. */
  confirmReroute: () => void;
  /** Call Ride Support. Takes over from any diagnosis or reroute in progress. */
  startSupport: () => void;
  endSupport: () => void;
  /**
   * Demo control: the Support agent sends the car back the way it came. Ends the call and goes
   * straight to the reroute overview with a U-turn route, waiting for the rider to confirm it.
   */
  proceedWithUturn: () => void;
  /** Demo control: start over from the Root's defaults, as if the page had just loaded. */
  reset: () => void;
};

export type CabinScreenMeta = {
  subscribe: (onChange: () => void) => () => void;
  getSnapshot: () => CabinLive;
};

/**
 * An invisible HTML element that a map part keeps over its 3D object, so overlays (a tooltip, a
 * thinking bubble) can anchor to it. `point` is its latest position in px from the Root's corner.
 */
export type CabinAnchor = {
  ref: RefObject<HTMLDivElement | null>;
  point: { x: number; y: number };
};

export type CabinScreenAnchors = {
  /** The front of the rider's car. Moved by CabinMap.Vehicle every frame. */
  vehicle: CabinAnchor;
};

export type CabinScreenContextValue = {
  state: CabinScreenState;
  actions: CabinScreenActions;
  meta: CabinScreenMeta;
  anchors: CabinScreenAnchors;
};

/* ---------- Engine: the mutable sim plus a tiny external store ---------- */

/**
 * Which leg of `loop` route distance `d` (wrapped) is on, counting each leg as running up to the
 * end of the turn at its far end, and the distance its straight starts at.
 */
function legOf(loop: Loop, d: number) {
  let start = 0;
  for (let k = 0; k < loop.corners.length; k++) {
    if (d < loop.corners[k][1]) return { leg: k, start };
    start = loop.corners[k][1];
  }
  return { leg: 0, start: loop.len };
}

function createEngine(
  initial: World,
  onMotion: (m: Motion) => void,
  onDetour: (from: number | null) => void,
  onCourse: (course: Loop) => void,
) {
  let world = initial;
  // Only a world with a lane closure stops on its own; the others stop to reroute.
  let sim = newSim(world.cones);
  const listeners = new Set<() => void>();
  let cruise = 9;
  let motion = motionOf(sim);
  const pos = new THREE.Vector3();
  const ahead = new THREE.Vector3();
  const behind = new THREE.Vector3();
  let detour: number | null = null;
  let course = world.loop;
  const live = (): CabinLive => {
    pathAt(course, sim.dist, detour, pos);
    pathAt(course, sim.dist + 1, detour, ahead).sub(pathAt(course, sim.dist - 1, detour, behind));
    return {
      dist: sim.dist,
      speed: sim.v,
      time: sim.time,
      x: pos.x,
      z: pos.z,
      heading: Math.atan2(ahead.x, ahead.z),
      braking: sim.braking,
    };
  };
  let snapshot = live();
  /** On a new route, drive to its end (the reroute map's pin) and stop there. */
  const driveToEnd = () => {
    const option = world.reroutes.find((o) => o.to === course);
    sim.target = option ? option.end : course === world.uturn ? world.uturnEnd : null;
  };

  return {
    /** The loop the car is driving right now. */
    course: () => course,
    /** Start over in another world, from the start of its loop. Only while boarding. */
    setWorld(next: World) {
      if (next === world) return;
      world = next;
      sim = newSim(world.cones);
      course = world.loop;
      detour = null;
      onCourse(course);
      onDetour(null);
      snapshot = live();
      for (const l of listeners) l();
    },
    /**
     * Pull up just ahead, to work out a new route there: as soon as the car can stop gently, but
     * never in a turn or just before one (then just after it instead). A world with cones is
     * already stopped behind them.
     */
    pullUp() {
      if (world.cones || course !== world.loop) return;
      let at = sim.dist + Math.max((sim.v * sim.v) / (2 * PULL_UP_DECEL) + 2, 3);
      const d = wrap(at, course.len);
      for (const [a, b] of course.corners) if (d > a - 2 && d < b + 5) at += b + 5 - d;
      sim.target = at;
    },
    configure(next: { cruise: number; driving: boolean }) {
      cruise = next.cruise;
      sim.pullOver = !next.driving;
    },
    /**
     * Switch to a new route and plan the way onto it, but keep holding: the route redraws now,
     * the car moves on escape(). The new route is `world.uturn` if `uturn`, otherwise the way
     * out (`world.reroutes`) for the leg the car is stopped on. In Stalled, the way out goes past
     * the cones, so it plans a detour round them; the U-turn turns round before them, so it
     * needs none. Looping has no cones, so needs no detour either. Only from the part of the leg
     * the loops share (up to the corner, or up to the stop for the U-turn); anywhere else the car
     * keeps its course.
     */
    reroute(uturn = false) {
      if (course !== world.loop) return;
      const d = wrap(sim.dist, course.len);
      let to: Loop;
      let from: number;
      if (uturn) {
        if (!world.uturn || d > world.loop.stopAt + 0.6) return;
        to = world.uturn;
        from = d;
      } else {
        // The way out that starts on the leg the car stopped on. Stalled has only the one.
        const { leg, start } = legOf(world.loop, d);
        const option = world.reroutes[leg] ?? world.reroutes[0];
        from = d - start;
        if (from > option.to.corners[0][0]) return;
        to = option.to;
      }
      // Same spot on the new loop: the leg is shared. Counting restarts on its first lap, so
      // `dist` steps back here, while the car is standing still.
      sim.dist = from;
      sim.served = -1;
      if (sim.target !== null) sim.target = from;
      course = to;
      onCourse(course);
      // Only the way past the cones needs a detour round them.
      detour = to === world.uturn || !world.cones ? null : nextStop(sim, course);
      onDetour(detour);
      snapshot = live();
    },
    driveToEnd,
    /** Release the hold at the stop ahead and drive around what's blocking it (or, on the
     *  U-turn loop, turn round before it). */
    escape() {
      const at = nextStop(sim, course);
      sim.served = at;
      sim.hold = 0;
      detour = course === world.uturn || !world.cones ? null : at;
      onDetour(detour);
      // Nothing to stop for any more without cones: the car only stopped to reroute.
      if (!world.cones) sim.stops = false;
      driveToEnd();
    },
    /** Advance one frame. Called by CabinMap.Viewport before any part reads the snapshot. */
    step(dt: number) {
      stepSim(sim, dt, cruise, course);
      // Keep the detour until it's well behind, past where the route fades out, then drop it.
      if (detour !== null && sim.dist > detour + DETOUR_LENGTH + 40) {
        detour = null;
        onDetour(null);
      }
      snapshot = live();
      const m = motionOf(sim);
      if (m !== motion) {
        motion = m;
        onMotion(m);
      }
      for (const l of listeners) l();
    },
    meta: {
      subscribe(onChange: () => void) {
        listeners.add(onChange);
        return () => listeners.delete(onChange);
      },
      getSnapshot: () => snapshot,
    } satisfies CabinScreenMeta,
  };
}

type Engine = ReturnType<typeof createEngine>;

const CabinScreenContext = createContext<CabinScreenContextValue | null>(null);
const EngineContext = createContext<Engine | null>(null);

export function useCabinScreen() {
  const ctx = use(CabinScreenContext);
  if (!ctx) throw new Error("useCabinScreen must be used inside <CabinScreen.Root>.");
  return ctx;
}

/** Internal: lets CabinMap.Viewport step the sim. Not exported from the package. */
export function useCabinEngine() {
  const engine = use(EngineContext);
  if (!engine) throw new Error("CabinMap parts must be used inside <CabinScreen.Root>.");
  return engine;
}

/* ---------- Root ---------- */

export type CabinScreenRootProps = ComponentProps<"div"> & {
  /** Controlled: whether the car should be moving. */
  driving?: boolean;
  onDrivingChange?: (driving: boolean) => void;
  /** Uncontrolled starting value for `driving`. */
  defaultDriving?: boolean;
  /** Starting scenario, before the rider picks one on Start ride. */
  defaultScenario?: RideScenario;
  /** Starting phase. "boarding" holds the car until startRide(). */
  defaultPhase?: RidePhase;
  /** Cruise speed, m/s. */
  speed?: number;
};

/**
 * Holds a run counter and remounts everything under it when `reset()` bumps it, so every part
 * (state, the drive sim, traffic, the camera) starts over from its defaults. The scenario lives
 * here, above the remount, so the rider's pick survives a reset.
 */
export function CabinScreenRoot({ defaultScenario = "stalled", ...props }: CabinScreenRootProps) {
  const [run, setRun] = useState(0);
  const reset = useCallback(() => setRun((n) => n + 1), []);
  const [scenario, setScenario] = useState<RideScenario>(defaultScenario);
  return (
    <CabinScreenRun
      key={run}
      reset={reset}
      scenario={scenario}
      setScenario={setScenario}
      {...props}
    />
  );
}

function CabinScreenRun({
  reset,
  scenario,
  setScenario,
  driving: drivingProp,
  onDrivingChange,
  defaultDriving = true,
  defaultPhase = "riding",
  speed: speedProp = 9,
  className,
  children,
  ...props
}: CabinScreenRootProps & {
  reset: () => void;
  scenario: RideScenario;
  setScenario: (scenario: RideScenario) => void;
}) {
  const [drivingState, setDrivingState] = useState(defaultDriving);
  const driving = drivingProp ?? drivingState;
  const [phase, setPhase] = useState<RidePhase>(defaultPhase);
  const [diagnosis, setDiagnosis] = useState<DiagnosisStage | null>(null);
  const [reroute, setReroute] = useState<RerouteStage | null>(null);
  const [support, setSupport] = useState<SupportStage | null>(null);
  // The agent picks up a moment after the rider calls.
  useEffect(() => {
    if (support !== "connecting") return;
    const t = setTimeout(() => setSupport("connected"), CONNECTING_MS);
    return () => clearTimeout(t);
  }, [support]);
  useEffect(() => {
    const next = diagnosis && NEXT_STAGE[diagnosis];
    if (!next) return;
    const t = setTimeout(() => setDiagnosis(next.to), next.ms);
    return () => clearTimeout(t);
  }, [diagnosis]);

  // `speed` seeds the cruise speed; setSpeed() changes it, and a new prop value wins again.
  const [speed, setSpeedState] = useState(speedProp);
  const [lastSpeedProp, setLastSpeedProp] = useState(speedProp);
  if (speedProp !== lastSpeedProp) {
    setLastSpeedProp(speedProp);
    setSpeedState(speedProp);
  }

  const world = WORLD_BY_SCENARIO[scenario];
  const [motion, setMotion] = useState<Motion>("stopped");
  const [detour, setDetour] = useState<number | null>(null);
  const [course, setCourse] = useState<Loop>(world.loop);
  const [delay, setDelay] = useState(0);
  const [arriving, setArriving] = useState(false);
  const [traffic, setTraffic] = useState<TrafficStage | null>(null);
  // When the rider asked for another route, so the new one shows `world.reroutingMs` after that.
  const reroutedAt = useRef(0);
  const [engine] = useState(() => createEngine(world, setMotion, setDetour, setCourse));
  // The rider picks the scenario while boarding; the car starts over on that world's loop.
  useLayoutEffect(() => engine.setWorld(world), [engine, world]);

  // Rerouting: `world.reroutingMs` after the rider asked, once the car is standing still (stuck at
  // the cones already, or pulled up just ahead), show the new route and wait for them to confirm.
  useEffect(() => {
    if (reroute !== "rerouting" || motion !== "stopped") return;
    const wait = Math.max(0, reroutedAt.current + world.reroutingMs - Date.now());
    const t = setTimeout(() => {
      engine.reroute();
      setReroute("overview");
    }, wait);
    return () => clearTimeout(t);
  }, [reroute, motion, engine, world]);

  // Rerouting scenario: notice the traffic once the car passes `detectAt`, then run the stages.
  useEffect(() => {
    const setup = world.heavyTraffic;
    if (!setup || phase !== "riding" || traffic !== null) return;
    const unsubscribe = engine.meta.subscribe(() => {
      if (engine.meta.getSnapshot().dist >= setup.detectAt) setTraffic("rerouting");
    });
    return () => {
      unsubscribe();
    };
  }, [world, phase, traffic, engine]);
  useEffect(() => {
    const setup = world.heavyTraffic;
    if (!setup || traffic === null || traffic === "done") return;
    const t = setTimeout(() => {
      if (traffic === "rerouting") {
        // Still on the shared street, so it switches on the move and drives to the end.
        engine.reroute();
        engine.driveToEnd();
        setDelay((d) => d - setup.savedMinutes);
        setTraffic("found");
      } else setTraffic(traffic === "found" ? "switched" : "done");
    }, TRAFFIC_MS[traffic]);
    return () => clearTimeout(t);
  }, [world, traffic, engine]);

  // After "Safe path confirmed", the car drives around the obstruction and diagnosis ends.
  useEffect(() => {
    if (diagnosis !== "confirmed") return;
    const t = setTimeout(() => {
      engine.escape();
      setDiagnosis(null);
    }, CONFIRMED_MS);
    return () => clearTimeout(t);
  }, [diagnosis, engine]);
  const vehicleAnchorRef = useRef<HTMLDivElement>(null);
  const [vehiclePoint] = useState(() => ({ x: 0, y: 0 }));
  const anchors = useMemo<CabinScreenAnchors>(
    () => ({ vehicle: { ref: vehicleAnchorRef, point: vehiclePoint } }),
    [vehiclePoint],
  );

  useLayoutEffect(() => {
    engine.configure({ cruise: speed, driving: phase === "riding" && driving });
  }, [engine, speed, driving, phase]);

  const onDrivingChangeRef = useRef(onDrivingChange);
  useLayoutEffect(() => {
    onDrivingChangeRef.current = onDrivingChange;
  });
  const controlled = drivingProp !== undefined;
  const setDriving = useCallback(
    (next: boolean) => {
      if (!controlled) setDrivingState(next);
      onDrivingChangeRef.current?.(next);
    },
    [controlled],
  );

  const actions = useMemo<CabinScreenActions>(
    () => ({
      setScenario,
      startRide: () => setPhase("riding"),
      pullOver: () => setDriving(false),
      resume: () => setDriving(true),
      setSpeed: (n) => setSpeedState(Math.max(0, n)),
      startDiagnosis: () => setDiagnosis("scanning"),
      endDiagnosis: () => setDiagnosis(null),
      startReroute: () => {
        reroutedAt.current = Date.now();
        engine.pullUp();
        setReroute("rerouting");
      },
      confirmReroute: () => {
        const added = ROUTE_DELAY_MIN.get(engine.course()) ?? 0;
        setDelay((d) => d + added);
        engine.escape();
        setArriving(true);
        setReroute(null);
      },
      startSupport: () => {
        setDiagnosis(null);
        setReroute(null);
        setSupport("connecting");
      },
      endSupport: () => setSupport(null),
      proceedWithUturn: () => {
        if (!world.uturn) return;
        setSupport(null);
        setDiagnosis(null);
        engine.reroute(true);
        setReroute("overview");
      },
      reset,
    }),
    [setScenario, setDriving, engine, reset, world],
  );

  const value = useMemo<CabinScreenContextValue>(
    () => ({
      state: {
        scenario,
        world,
        phase,
        diagnosis,
        reroute,
        support,
        traffic,
        course,
        detour,
        driving,
        motion,
        speed,
        delay: world.startDelay + delay,
        arriving,
      },
      actions,
      meta: engine.meta,
      anchors,
    }),
    [
      scenario,
      world,
      phase,
      diagnosis,
      reroute,
      support,
      traffic,
      course,
      detour,
      driving,
      motion,
      speed,
      delay,
      arriving,
      actions,
      engine,
      anchors,
    ],
  );

  return (
    <CabinScreenContext value={value}>
      <EngineContext value={engine}>
        <div
          className={["relative overflow-hidden", className].filter(Boolean).join(" ")}
          {...props}
        >
          <div
            ref={vehicleAnchorRef}
            aria-hidden
            className="pointer-events-none absolute top-0 left-0 size-0"
          />
          {children}
        </div>
      </EngineContext>
    </CabinScreenContext>
  );
}
