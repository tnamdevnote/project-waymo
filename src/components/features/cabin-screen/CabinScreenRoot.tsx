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
import { type Loop, loop, rerouteLoop, uturnLoop, wrap } from "./map/world";
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

/** How long "connecting" shows before the agent picks up. */
const CONNECTING_MS = 3000;

/** How long "rerouting" shows before the new route is ready. */
const REROUTING_MS = 3000;

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
  phase: RidePhase;
  /** Set while the car diagnoses a stall the rider reported; null otherwise. */
  diagnosis: DiagnosisStage | null;
  /** Set while the car reroutes at the rider's request; null otherwise. */
  reroute: RerouteStage | null;
  /** Set while the rider is on a call with Ride Support; null otherwise. */
  support: SupportStage | null;
  /** The loop the car is driving: `loop`, or `rerouteLoop` / `uturnLoop` once it has rerouted. */
  course: Loop;
  /** Route distance (not wrapped) where the car's detour around an obstruction starts, while it
   *  is on it or just past it; null otherwise. See map/detour.ts. */
  detour: number | null;
  /** The rider wants the car moving (false after pullOver()). Only moves it while riding. */
  driving: boolean;
  motion: Motion;
  /** Cruise speed, m/s. */
  speed: number;
};

export type CabinScreenActions = {
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

function createEngine(
  onMotion: (m: Motion) => void,
  onDetour: (from: number | null) => void,
  onCourse: (course: Loop) => void,
) {
  const sim = newSim();
  const listeners = new Set<() => void>();
  let cruise = 9;
  let motion = motionOf(sim);
  const pos = new THREE.Vector3();
  const ahead = new THREE.Vector3();
  const behind = new THREE.Vector3();
  let detour: number | null = null;
  let course = loop;
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

  return {
    configure(next: { cruise: number; driving: boolean }) {
      cruise = next.cruise;
      sim.pullOver = !next.driving;
    },
    /**
     * Switch to `to` and plan the way onto it, but keep holding: the route redraws now, the car
     * moves on escape(). `rerouteLoop` goes past the cones, so it plans a detour round them;
     * `uturnLoop` turns round before them, so it needs none. Only from the part of the first leg
     * the loops share (up to the corner, or up to the stop for the U-turn); anywhere else the car
     * keeps its course.
     */
    reroute(to: Loop = rerouteLoop) {
      const d = wrap(sim.dist, course.len);
      const shared = to === uturnLoop ? loop.stopAt + 0.6 : loop.corners[0][0];
      if (course !== loop || d > shared) return;
      // Same spot on the new loop: the first leg is shared. Counting restarts on its first lap,
      // so `dist` steps back here, while the car is standing still.
      sim.dist = d;
      sim.served = -1;
      course = to;
      onCourse(course);
      detour = to === uturnLoop ? null : nextStop(sim, course);
      onDetour(detour);
      snapshot = live();
    },
    /** Release the hold at the stop ahead and drive around what's blocking it (or, on the
     *  U-turn loop, turn round before it). */
    escape() {
      const at = nextStop(sim, course);
      sim.served = at;
      sim.hold = 0;
      detour = course === uturnLoop ? null : at;
      onDetour(detour);
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
  /** Starting phase. "boarding" holds the car until startRide(). */
  defaultPhase?: RidePhase;
  /** Cruise speed, m/s. */
  speed?: number;
};

/**
 * Holds a run counter and remounts everything under it when `reset()` bumps it, so every part
 * (state, the drive sim, traffic, the camera) starts over from its defaults.
 */
export function CabinScreenRoot(props: CabinScreenRootProps) {
  const [run, setRun] = useState(0);
  const reset = useCallback(() => setRun((n) => n + 1), []);
  return <CabinScreenRun key={run} reset={reset} {...props} />;
}

function CabinScreenRun({
  reset,
  driving: drivingProp,
  onDrivingChange,
  defaultDriving = true,
  defaultPhase = "riding",
  speed: speedProp = 9,
  className,
  children,
  ...props
}: CabinScreenRootProps & { reset: () => void }) {
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

  const [motion, setMotion] = useState<Motion>("stopped");
  const [detour, setDetour] = useState<number | null>(null);
  const [course, setCourse] = useState<Loop>(loop);
  const [engine] = useState(() => createEngine(setMotion, setDetour, setCourse));

  // Rerouting: work it out, then show the new route and wait for the rider to confirm it.
  useEffect(() => {
    if (reroute !== "rerouting") return;
    const t = setTimeout(() => {
      engine.reroute();
      setReroute("overview");
    }, REROUTING_MS);
    return () => clearTimeout(t);
  }, [reroute, engine]);

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
      startRide: () => setPhase("riding"),
      pullOver: () => setDriving(false),
      resume: () => setDriving(true),
      setSpeed: (n) => setSpeedState(Math.max(0, n)),
      startDiagnosis: () => setDiagnosis("scanning"),
      endDiagnosis: () => setDiagnosis(null),
      startReroute: () => setReroute("rerouting"),
      confirmReroute: () => {
        engine.escape();
        setReroute(null);
      },
      startSupport: () => {
        setDiagnosis(null);
        setReroute(null);
        setSupport("connecting");
      },
      endSupport: () => setSupport(null),
      proceedWithUturn: () => {
        setSupport(null);
        setDiagnosis(null);
        engine.reroute(uturnLoop);
        setReroute("overview");
      },
      reset,
    }),
    [setDriving, engine, reset],
  );

  const value = useMemo<CabinScreenContextValue>(
    () => ({
      state: { phase, diagnosis, reroute, support, course, detour, driving, motion, speed },
      actions,
      meta: engine.meta,
      anchors,
    }),
    [
      phase,
      diagnosis,
      reroute,
      support,
      course,
      detour,
      driving,
      motion,
      speed,
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
