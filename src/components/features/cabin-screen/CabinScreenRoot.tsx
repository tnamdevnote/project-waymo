"use client";

// CabinScreen.Root: owns the drive sim and shares it with the map and any HTML panel.
// React state changes only when a coarse value changes; per-frame data goes through `meta`.
import {
  type ComponentProps,
  createContext,
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

export type CabinScreenState = {
  /** The rider wants the car moving (false after pullOver()). */
  driving: boolean;
  motion: Motion;
  /** Cruise speed, m/s. */
  speed: number;
};

export type CabinScreenActions = {
  pullOver: () => void;
  resume: () => void;
  setSpeed: (speed: number) => void;
};

export type CabinScreenMeta = {
  subscribe: (onChange: () => void) => () => void;
  getSnapshot: () => CabinLive;
};

export type CabinScreenContextValue = {
  state: CabinScreenState;
  actions: CabinScreenActions;
  meta: CabinScreenMeta;
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
  /** Cruise speed, m/s. */
  speed?: number;
};

export function CabinScreenRoot({
  driving: drivingProp,
  onDrivingChange,
  defaultDriving = true,
  speed: speedProp = 9,
  className,
  children,
  ...props
}: CabinScreenRootProps) {
  const [drivingState, setDrivingState] = useState(defaultDriving);
  const driving = drivingProp ?? drivingState;

  // `speed` seeds the cruise speed; setSpeed() changes it, and a new prop value wins again.
  const [speed, setSpeedState] = useState(speedProp);
  const [lastSpeedProp, setLastSpeedProp] = useState(speedProp);
  if (speedProp !== lastSpeedProp) {
    setLastSpeedProp(speedProp);
    setSpeedState(speedProp);
  }

  const [motion, setMotion] = useState<Motion>("stopped");
  const [engine] = useState(() => createEngine(setMotion));

  useLayoutEffect(() => {
    engine.configure({ cruise: speed, driving });
  }, [engine, speed, driving]);

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
      pullOver: () => setDriving(false),
      resume: () => setDriving(true),
      setSpeed: (n) => setSpeedState(Math.max(0, n)),
    }),
    [setDriving],
  );

  const value = useMemo<CabinScreenContextValue>(
    () => ({ state: { driving, motion, speed }, actions, meta: engine.meta }),
    [driving, motion, speed, actions, engine],
  );

  return (
    <CabinScreenContext value={value}>
      <EngineContext value={engine}>
        <div
          className={["relative overflow-hidden", className].filter(Boolean).join(" ")}
          {...props}
        >
          {children}
        </div>
      </EngineContext>
    </CabinScreenContext>
  );
}
