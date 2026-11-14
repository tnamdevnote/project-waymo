"use client";

// CabinMap.Cones: the lane closure that leaves the car stuck. Static traffic cones on square
// bases, each with one white reflective band. Positions come from CONES in world.ts.
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { CONES, cssVar } from "./world";

const BASE = { size: 0.8, height: 0.12 };
const BODY = { top: 0.07, bottom: 0.34, height: 1.05 };
// The band covers this slice of the body's height, as fractions from the bottom.
const BAND = { from: 0.5, to: 0.68 };

const radiusAt = (t: number) => BODY.bottom + (BODY.top - BODY.bottom) * t;

export function Cones() {
  const colors = useMemo(() => {
    const danger = new THREE.Color(cssVar("--danger"));
    return {
      // Safety orange: the danger red pulled toward the warning amber.
      body: danger.clone().lerp(new THREE.Color(cssVar("--warning")), 0.4),
      base: danger,
      band: cssVar("--surface"),
    };
  }, []);
  const geometry = useMemo(
    () => ({
      base: new THREE.BoxGeometry(BASE.size, BASE.height, BASE.size),
      body: new THREE.CylinderGeometry(BODY.top, BODY.bottom, BODY.height, 24),
      // A hair wider than the body so it doesn't z-fight.
      band: new THREE.CylinderGeometry(
        radiusAt(BAND.to) + 0.005,
        radiusAt(BAND.from) + 0.005,
        BODY.height * (BAND.to - BAND.from),
        24,
      ),
    }),
    [],
  );
  useEffect(
    () => () => {
      for (const g of Object.values(geometry)) g.dispose();
    },
    [geometry],
  );

  const bandY = BASE.height + (BODY.height * (BAND.from + BAND.to)) / 2;

  return (
    <>
      {CONES.map(([x, z]) => (
        <group key={`${x},${z}`} position={[x, 0, z]}>
          <mesh geometry={geometry.base} position={[0, BASE.height / 2, 0]}>
            <meshLambertMaterial color={colors.base} />
          </mesh>
          <mesh geometry={geometry.body} position={[0, BASE.height + BODY.height / 2, 0]}>
            <meshLambertMaterial color={colors.body} />
          </mesh>
          <mesh geometry={geometry.band} position={[0, bandY, 0]}>
            <meshLambertMaterial color={colors.band} />
          </mesh>
        </group>
      ))}
    </>
  );
}
