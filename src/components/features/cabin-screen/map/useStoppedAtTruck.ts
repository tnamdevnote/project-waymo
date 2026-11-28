"use client";

import { useSyncExternalStore } from "react";
import { useCabinScreen } from "../CabinScreenRoot";
import { wrap } from "./world";

/** Farther than the car ever needs to brake from cruise speed, and far short of where it starts. */
const BRAKING_M = 25;

/**
 * Whether the car is stopping, or has stopped, for the fire truck. True from the moment it starts
 * braking, which is when its question mark shows.
 */
export function useStoppingForTruck() {
  const { meta, state } = useCabinScreen();
  const { loop } = state.world;
  const slowing = state.motion !== "driving";
  const near = useSyncExternalStore(
    meta.subscribe,
    () => {
      const { dist } = meta.getSnapshot();
      const toStop = wrap(loop.stopAt - dist + loop.len / 2, loop.len) - loop.len / 2;
      return toStop > -0.6 && toStop < BRAKING_M;
    },
    () => false,
  );
  return slowing && near;
}
