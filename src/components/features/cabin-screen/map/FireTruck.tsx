"use client";

// CabinMap.FireTruck: the parked fire truck that leaves the car stuck. It juts a little into the
// car's lane from the right curb (FIRE_TRUCK in world.ts). Faces north (-z), like the car.
import { useEffect, useMemo } from "react";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { useCabinScreen } from "../CabinScreenRoot";
import { cssVar, FIRE_TRUCK } from "./world";

const { x: X, z: Z, length: LENGTH, width: WIDTH } = FIRE_TRUCK;
const CAB_LENGTH = 2.4;
const BODY_LENGTH = LENGTH - CAB_LENGTH - 0.15;
/** Centers along the truck, from its own middle: the cab leads (-z), the body trails. */
const CAB_Z = -(LENGTH - CAB_LENGTH) / 2;
const BODY_Z = (LENGTH - BODY_LENGTH) / 2;
const WHEEL_R = 0.5;
const WHEEL_Z = [CAB_Z, BODY_Z + 0.6, BODY_Z + 1.9];
const RUNGS = Array.from({ length: 9 }, (_, i) => BODY_Z - 2.2 + i * 0.55);

export function FireTruck() {
  // Only the Stalled world has the truck.
  const { blocked } = useCabinScreen().state.world;
  const colors = useMemo(
    () => ({
      paint: cssVar("--danger"),
      glass: cssVar("--foreground"),
      trim: cssVar("--surface"),
      metal: cssVar("--waymo-slate"),
      light: cssVar("--warning"),
    }),
    [],
  );
  const geometry = useMemo(
    () => ({
      cab: new RoundedBoxGeometry(WIDTH, 2.1, CAB_LENGTH, 3, 0.3),
      body: new RoundedBoxGeometry(WIDTH, 1.8, BODY_LENGTH, 3, 0.18),
    }),
    [],
  );
  useEffect(
    () => () => {
      geometry.cab.dispose();
      geometry.body.dispose();
    },
    [geometry],
  );

  if (!blocked) return null;

  return (
    <group position={[X, 0, Z]}>
      <mesh geometry={geometry.cab} position={[0, 1.55, CAB_Z]}>
        <meshLambertMaterial color={colors.paint} />
      </mesh>
      <mesh geometry={geometry.body} position={[0, 1.4, BODY_Z]}>
        <meshLambertMaterial color={colors.paint} />
      </mesh>
      {/* Windshield and side windows, as one band round the front of the cab. */}
      <mesh position={[0, 2.1, CAB_Z - 0.25]}>
        <boxGeometry args={[WIDTH + 0.02, 0.6, CAB_LENGTH - 0.45]} />
        <meshLambertMaterial color={colors.glass} />
      </mesh>
      {/* White stripe along the body. */}
      <mesh position={[0, 1.25, BODY_Z]}>
        <boxGeometry args={[WIDTH + 0.03, 0.22, BODY_LENGTH - 0.3]} />
        <meshLambertMaterial color={colors.trim} />
      </mesh>
      {/* Roof light bar. */}
      <mesh position={[0, 2.72, CAB_Z + 0.2]}>
        <boxGeometry args={[WIDTH - 0.4, 0.22, 0.45]} />
        <meshLambertMaterial color={colors.light} />
      </mesh>
      {/* Ladder on the roof: two rails and rungs. */}
      {[-0.5, 0.5].map((x) => (
        <mesh key={x} position={[x, 2.48, BODY_Z]}>
          <boxGeometry args={[0.14, 0.14, BODY_LENGTH - 0.5]} />
          <meshLambertMaterial color={colors.trim} />
        </mesh>
      ))}
      {RUNGS.map((z) => (
        <mesh key={z} position={[0, 2.48, z]}>
          <boxGeometry args={[1.0, 0.1, 0.12]} />
          <meshLambertMaterial color={colors.trim} />
        </mesh>
      ))}
      {/* Rear warning lights. */}
      {[-0.85, 0.85].map((x) => (
        <mesh key={x} position={[x, 2.1, LENGTH / 2]}>
          <boxGeometry args={[0.3, 0.2, 0.06]} />
          <meshLambertMaterial color={colors.light} />
        </mesh>
      ))}
      {[-1, 1].map((side) =>
        WHEEL_Z.map((z) => (
          <mesh
            key={`${side},${z}`}
            position={[side * (WIDTH / 2 - 0.12), WHEEL_R, z]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry args={[WHEEL_R, WHEEL_R, 0.36, 24]} />
            <meshLambertMaterial color={colors.metal} />
          </mesh>
        )),
      )}
    </group>
  );
}
