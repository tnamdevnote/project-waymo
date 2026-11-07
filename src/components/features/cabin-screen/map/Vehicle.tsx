"use client";
/* oxlint-disable react/immutability -- R3F idiom: the car's transform and brake color are mutated per frame in useFrame, outside React. */

// CabinMap.Vehicle: the rider's car. Brake light comes on when slowing or stopped.
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type * as THREE from "three";
import { useCabinScreen } from "../CabinScreenRoot";
import { palette } from "./palette";

const WHEELS = [
  [0.96, 1.45],
  [-0.96, 1.45],
  [0.96, -1.45],
  [-0.96, -1.45],
] as const;

export function Vehicle() {
  const { meta } = useCabinScreen();
  const car = useRef<THREE.Group>(null);
  const brake = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(() => {
    const live = meta.getSnapshot();
    if (car.current) {
      car.current.position.set(live.x, 0, live.z);
      car.current.rotation.y = live.heading;
    }
    brake.current?.color.set(live.braking || live.speed < 0.1 ? palette.brakeOn : palette.brakeOff);
  });

  return (
    <group ref={car}>
      <mesh position={[0, 0.72, 0]}>
        <boxGeometry args={[1.9, 0.82, 4.6]} />
        <meshLambertMaterial color={palette.vehicle} />
      </mesh>
      <mesh position={[0, 1.38, -0.2]}>
        <boxGeometry args={[1.72, 0.56, 2.5]} />
        <meshLambertMaterial color={palette.vehicleGlass} />
      </mesh>
      <mesh position={[0, 1.7, -0.2]}>
        <boxGeometry args={[1.6, 0.1, 2.1]} />
        <meshLambertMaterial color={palette.vehicle} />
      </mesh>
      <mesh position={[0, 1.93, -0.1]}>
        <cylinderGeometry args={[0.3, 0.34, 0.36, 24]} />
        <meshLambertMaterial color={palette.vehicleSensor} />
      </mesh>
      {WHEELS.map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 0.36, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.36, 0.36, 0.28, 16]} />
          <meshLambertMaterial color={palette.tire} />
        </mesh>
      ))}
      <mesh position={[0, 0.85, -2.31]}>
        <boxGeometry args={[1.6, 0.08, 0.02]} />
        <meshBasicMaterial ref={brake} color={palette.brakeOff} />
      </mesh>
    </group>
  );
}
