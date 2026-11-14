"use client";
/* oxlint-disable react/immutability -- R3F idiom: instance matrices and colors are mutated per frame in useFrame, outside React. */

// CabinMap.Traffic: other cars on every road, stopping for signals and queueing at intersections.
// Shown only within `range` meters and fading into the fog at the edge.
// Each car is a rounded lower body with a smaller rounded cabin on top, slightly see-through.
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { useCabinScreen } from "../CabinScreenRoot";
import { TRAFFIC, carSpot, createTraffic, cssVar, stepTraffic } from "./world";

// [width, height, length] in meters; total height matches the old 1.45 m box.
const BODY: [number, number, number] = [1.9, 0.85, 4.5];
const CABIN: [number, number, number] = [1.65, 0.6, 2.6];
const BODY_RADIUS = 0.35;
const CABIN_RADIUS = 0.25;
// Cabin sits on the body, nudged toward the rear like a sedan greenhouse.
const CABIN_OFFSET = new THREE.Matrix4().makeTranslation(0, (BODY[1] + CABIN[1]) / 2, -0.25);

const TOTAL = TRAFFIC.reduce((n, l) => n + l.count, 0);

const TRAFFIC_OPACITY = 0.7;
// How far the car color moves from --surface toward --waymo-blue (0 = white, 1 = full brand blue).
const TRAFFIC_TINT = 0.55;

export function Traffic({ range = 60 }: { range?: number }) {
  const { meta } = useCabinScreen();
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const cabinRef = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(
    () => ({
      body: new RoundedBoxGeometry(...BODY, 4, BODY_RADIUS),
      cabin: new RoundedBoxGeometry(...CABIN, 4, CABIN_RADIUS),
    }),
    [],
  );
  useEffect(
    () => () => {
      geometry.body.dispose();
      geometry.cabin.dispose();
    },
    [geometry],
  );
  // Mutable traffic state, stepped on the drive sim's clock so it pauses with it.
  const traffic = useMemo(() => ({ cars: createTraffic(), time: -1 }), []);
  const tmp = useMemo(
    () => ({
      o: new THREE.Object3D(),
      m: new THREE.Matrix4(),
      p: new THREE.Vector3(),
      ego: new THREE.Vector3(),
      c: new THREE.Color(),
      // Soft Waymo blue: the brand blue washed toward the surface, like the reference's periwinkle cars.
      near: new THREE.Color(cssVar("--surface")).lerp(
        new THREE.Color(cssVar("--waymo-blue")),
        TRAFFIC_TINT,
      ),
      far: new THREE.Color(cssVar("--background")),
    }),
    [],
  );

  useFrame(() => {
    const body = bodyRef.current;
    const cabin = cabinRef.current;
    if (!body || !cabin) return;
    const live = meta.getSnapshot();
    tmp.ego.set(live.x, 0, live.z);
    if (traffic.time < 0) traffic.time = live.time;
    stepTraffic(traffic.cars, live.time, Math.min(Math.max(live.time - traffic.time, 0), 0.05));
    traffic.time = live.time;
    traffic.cars.forEach((car, i) => {
      carSpot(car, tmp.p);
      const { axis, dir } = car.lane;
      const dist = tmp.p.distanceTo(tmp.ego);
      tmp.o.position.set(tmp.p.x, BODY[1] / 2 + 0.05, tmp.p.z);
      // Face the direction of travel: heading is atan2(dx, dz), as for the rider's car.
      tmp.o.rotation.y = axis === "z" ? (dir > 0 ? 0 : Math.PI) : (dir * Math.PI) / 2;
      tmp.o.scale.setScalar(dist < range ? 1 : 0);
      tmp.o.updateMatrix();
      body.setMatrixAt(i, tmp.o.matrix);
      cabin.setMatrixAt(i, tmp.m.multiplyMatrices(tmp.o.matrix, CABIN_OFFSET));
      tmp.c.lerpColors(tmp.near, tmp.far, THREE.MathUtils.smoothstep(dist, range * 0.6, range));
      body.setColorAt(i, tmp.c);
      cabin.setColorAt(i, tmp.c);
    });
    for (const mesh of [body, cabin]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh ref={bodyRef} args={[geometry.body, undefined, TOTAL]} frustumCulled={false}>
        <meshLambertMaterial transparent opacity={TRAFFIC_OPACITY} />
      </instancedMesh>
      <instancedMesh ref={cabinRef} args={[geometry.cabin, undefined, TOTAL]} frustumCulled={false}>
        <meshLambertMaterial transparent opacity={TRAFFIC_OPACITY} />
      </instancedMesh>
    </>
  );
}
