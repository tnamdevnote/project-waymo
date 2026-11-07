"use client";
/* oxlint-disable react/immutability -- R3F idiom: the camera is mutated per frame in useFrame, outside React. */

// CabinMap.Camera: follows from behind and above, aimed ahead of the car.
// Eases toward its target along a heading smoothed over ±6m of route; snaps under reduced motion.
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useSyncExternalStore } from "react";
import * as THREE from "three";
import { useCabinScreen } from "../CabinScreenRoot";
import { loop } from "./world";

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
  distance = 13,
  height = 26.5,
  lookAhead = 14,
  fov = 50,
}: {
  /** Meters behind the car. */
  distance?: number;
  /** Meters above the ground. */
  height?: number;
  /** Meters ahead of the car the camera aims at. */
  lookAhead?: number;
  /** Vertical field of view, degrees. */
  fov?: number;
}) {
  const { meta } = useCabinScreen();
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
    }),
    [],
  );

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const live = meta.getSnapshot();
    rig.ego.set(live.x, 0, live.z);
    loop
      .at(live.dist + 6, rig.dir)
      .sub(loop.at(live.dist - 6, rig.tmp))
      .normalize();
    rig.want.copy(rig.ego).addScaledVector(rig.dir, -distance).setY(height);
    rig.aim.copy(rig.ego).addScaledVector(rig.dir, lookAhead);
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
