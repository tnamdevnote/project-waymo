// The drive sim: how fast the car goes and where it is along the loop.
// A plain mutable object stepped once per frame, outside React.
import * as THREE from "three";
import { type Loop, wrap } from "./map/world";

const TURN_SPEED = 4.5; // m/s through corners
const DECEL = 2.5; // m/s² used to plan braking
// Seconds held at the stop before driving on. The stop is behind a parked fire truck the car
// isn't sure it can pass, so it holds for good: the rider is meant to find it stuck and report it.
const STOP_HOLD = Infinity;

export type Motion = "driving" | "stopping" | "stopped";

export type Sim = {
  /** Meters driven since the start (not wrapped). */
  dist: number;
  /** Current speed, m/s. */
  v: number;
  /** Seconds simulated. Drives the traffic. */
  time: number;
  hold: number;
  served: number;
  pullOver: boolean;
  /** Whether the car halts at its loop's stop point (`Loop.stopAt`) at all. */
  stops: boolean;
  /** A one-off stop, as a route distance (not wrapped): where the car pulls up to reroute, or
   *  the end of the new route. It holds there until this is cleared. */
  target: number | null;
  braking: boolean;
  /** Braking to a standstill (pull over or stop line), not just slowing for a turn. */
  stopping: boolean;
};

export const newSim = (stops = true): Sim => ({
  dist: 0,
  v: 0,
  time: 0,
  hold: 0,
  served: -1,
  pullOver: false,
  stops,
  target: null,
  braking: false,
  stopping: false,
});

/** Route distance (not wrapped) of the next stop the car will hold at, at or ahead of it. */
export function nextStop(sim: Sim, loop: Loop) {
  const next = loop.stopAt + loop.len * Math.ceil((sim.dist - loop.stopAt - 0.6) / loop.len);
  return next <= sim.served ? next + loop.len : next;
}

export function stepSim(sim: Sim, dt: number, cruise: number, loop: Loop) {
  sim.time += dt;
  const d = wrap(sim.dist, loop.len);
  let target = cruise;
  for (const [a, b] of loop.corners) {
    const into = wrap(d - a, loop.len);
    if (into < b - a) target = Math.min(target, TURN_SPEED);
    else {
      target = Math.min(target, Math.sqrt(TURN_SPEED ** 2 + 2 * DECEL * wrap(a - d, loop.len)));
    }
  }
  const next = nextStop(sim, loop);
  let toStop = sim.stops ? next - sim.dist : Infinity;
  if (sim.target !== null) toStop = Math.min(toStop, sim.target - sim.dist);
  const stopCap = Math.sqrt(2 * DECEL * Math.max(0, toStop - 0.05));
  const forStopLine = stopCap < target && stopCap < sim.v + 0.5;
  target = Math.min(target, stopCap);
  // Only the loop's own stop is ever released by the hold; a target holds until it's cleared.
  if (toStop < 0.6 && sim.v < 0.25 && sim.target === null) {
    sim.hold += dt;
    if (sim.hold > STOP_HOLD) {
      sim.served = next;
      sim.hold = 0;
    }
  }
  if (sim.pullOver) target = 0;
  sim.stopping = sim.pullOver || forStopLine;
  sim.braking = target < sim.v - 0.3;
  sim.v = Math.max(0, sim.v + THREE.MathUtils.clamp(target - sim.v, -4 * dt, 2 * dt));
  sim.dist += sim.v * dt;
}

/** Coarse motion for React: changes a few times per stop, never per frame. */
export function motionOf(sim: Sim): Motion {
  if (sim.v < 0.1) return "stopped";
  if (sim.stopping) return "stopping";
  return "driving";
}
