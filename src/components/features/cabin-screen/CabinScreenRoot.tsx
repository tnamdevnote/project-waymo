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
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { loop } from "./map/world";
import { type Motion, motionOf, newSim, stepSim } from "./sim";

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

export type CabinScreenState = {
  phase: RidePhase;
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

function createEngine(onMotion: (m: Motion) => void) {
  const sim = newSim();
  const listeners = new Set<() => void>();
  let cruise = 9;
  let motion = motionOf(sim);
  const pos = new THREE.Vector3();
  const ahead = new THREE.Vector3();
  const behind = new THREE.Vector3();
  const live = (): CabinLive => {
    loop.at(sim.dist, pos);
    loop.at(sim.dist + 1, ahead).sub(loop.at(sim.dist - 1, behind));
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
    /** Advance one frame. Called by CabinMap.Viewport before any part reads the snapshot. */
    step(dt: number) {
      stepSim(sim, dt, cruise, loop);
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

export function CabinScreenRoot({
  driving: drivingProp,
  onDrivingChange,
  defaultDriving = true,
  defaultPhase = "riding",
  speed: speedProp = 9,
  className,
  children,
  ...props
}: CabinScreenRootProps) {
  const [drivingState, setDrivingState] = useState(defaultDriving);
  const driving = drivingProp ?? drivingState;
  const [phase, setPhase] = useState<RidePhase>(defaultPhase);

  // `speed` seeds the cruise speed; setSpeed() changes it, and a new prop value wins again.
  const [speed, setSpeedState] = useState(speedProp);
  const [lastSpeedProp, setLastSpeedProp] = useState(speedProp);
  if (speedProp !== lastSpeedProp) {
    setLastSpeedProp(speedProp);
    setSpeedState(speedProp);
  }

  const [motion, setMotion] = useState<Motion>("stopped");
  const [engine] = useState(() => createEngine(setMotion));
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
    }),
    [setDriving],
  );

  const value = useMemo<CabinScreenContextValue>(
    () => ({ state: { phase, driving, motion, speed }, actions, meta: engine.meta, anchors }),
    [phase, driving, motion, speed, actions, engine, anchors],
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
