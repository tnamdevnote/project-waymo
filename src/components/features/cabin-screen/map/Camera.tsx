"use client";
/* oxlint-disable react/immutability -- R3F idiom: the camera is mutated per frame in useFrame, outside React. */

// CabinMap.Camera: follows from just behind and high above, aimed ahead of the car.
// Defaults look steeply down (~60° pitch: height / (distance + lookAhead) ≈ 1.75) with the car
// about two-thirds of the way down the screen, just clear of the menu bar, so the road and
// intersection ahead fill the rest.
// Eases toward its target along a heading smoothed over ±6m of route; snaps under reduced motion.
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useSyncExternalStore } from "react";
import * as THREE from "three";
import { useCabinScreen } from "../CabinScreenRoot";

const REDUCED = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (on: () => void) => {
  const mq = matchMedia(REDUCED);
  mq.addEventListener("change", on);
  return () => mq.removeEventListener("change", on);
};

function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReduced,
    () => matchMedia(REDUCED).matches,
    () => false,
  );
}

export function Camera({
  distance = 15,
  height = 40,
  lookAhead = 8,
  fov = 42,
  splitOffset = 0.4,
}: {
  /** Meters behind the car. */
  distance?: number;
  /** Meters above the ground. */
  height?: number;
  /** Meters ahead of the car the camera aims at. */
  lookAhead?: number;
  /** Vertical field of view, degrees. */
  fov?: number;
  /**
   * Where the car sits across the screen while a split view (Diagnosis, Reroute, Support) covers
   * the left half:
   * 0 is the centre, 1 the right edge. 0.4 puts it at 70% of the width, in the middle of the
   * visible map. The camera trucks sideways to get there, so the angle doesn't change.
   */
  splitOffset?: number;
}) {
  const { meta, state } = useCabinScreen();
  // Any split-view panel over the left half: Diagnosis, Reroute (before its overhead map) or Support.
  const split = state.diagnosis !== null || state.reroute === "rerouting" || state.support !== null;
  const { course } = state;
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const reduced = useReducedMotion();
  const rig = useMemo(
    () => ({
      snapped: false,
      ego: new THREE.Vector3(),
      look: new THREE.Vector3(),
      dir: new THREE.Vector3(),
      tmp: new THREE.Vector3(),
      want: new THREE.Vector3(),
      aim: new THREE.Vector3(),
      side: new THREE.Vector3(),
    }),
    [],
  );

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const live = meta.getSnapshot();
    rig.ego.set(live.x, 0, live.z);
    course
      .at(live.dist + 6, rig.dir)
      .sub(course.at(live.dist - 6, rig.tmp))
      .normalize();
    rig.want.copy(rig.ego).addScaledVector(rig.dir, -distance).setY(height);
    rig.aim.copy(rig.ego).addScaledVector(rig.dir, lookAhead);
    if (split && splitOffset !== 0) {
      // Truck left by however far `splitOffset` of the half-width is at the car's depth.
      // `dir` is level, so the view axis is (aim - want) and the car's depth is along it.
      rig.tmp.subVectors(rig.aim, rig.want).normalize();
      const depth = rig.side.subVectors(rig.ego, rig.want).dot(rig.tmp);
      const halfWidth = Math.tan(THREE.MathUtils.degToRad(fov / 2)) * camera.aspect * depth;
      // Screen-right is (-dir.z, 0, dir.x); the camera moves the other way.
      rig.side.set(rig.dir.z, 0, -rig.dir.x).multiplyScalar(splitOffset * halfWidth);
      rig.want.add(rig.side);
      rig.aim.add(rig.side);
    }
    if (!rig.snapped || reduced) {
      camera.position.copy(rig.want);
      rig.look.copy(rig.aim);
      rig.snapped = true;
    } else {
      const k = 1 - Math.exp(-dt * 2.5);
      camera.position.lerp(rig.want, k);
      rig.look.lerp(rig.aim, k);
    }
    camera.lookAt(rig.look);
    if (camera.fov !== fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
