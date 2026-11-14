// The drive sim: how fast the car goes and where it is along the loop.
// A plain mutable object stepped once per frame, outside React.
import * as THREE from "three";
import { type Loop, wrap } from "./map/world";

const TURN_SPEED = 4.5; // m/s through corners
const DECEL = 2.5; // m/s² used to plan braking
// Seconds held at the stop before driving on. The stop is a lane closure the car can't get
// past, so it holds for good: the rider is meant to find it stuck and report it.
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
  braking: boolean;
  /** Braking to a standstill (pull over or stop line), not just slowing for a turn. */
  stopping: boolean;
};

export const newSim = (): Sim => ({
  dist: 0,
  v: 0,
  time: 0,
  hold: 0,
  served: -1,
  pullOver: false,
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
  const toStop = next - sim.dist;
  const stopCap = Math.sqrt(2 * DECEL * Math.max(0, toStop - 0.05));
  const forStopLine = stopCap < target && stopCap < sim.v + 0.5;
  target = Math.min(target, stopCap);
  if (toStop < 0.6 && sim.v < 0.25) {
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
