"use client";
/* oxlint-disable react/immutability -- R3F idiom: the car's transform and brake color are mutated per frame in useFrame, outside React. */

// CabinMap.Vehicle: the rider's car, a Waymo-fitted Jaguar I-PACE. Brake light comes on when slowing or stopped.
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useCabinScreen } from "../CabinScreenRoot";
import { NOSE_AHEAD, cssVar } from "./world";

// Jaguar I-PACE proportions, meters. Local +z is forward. Length 4.68, width 1.90 (no mirrors),
// height 1.56, wheelbase 2.99 with the wheels pushed out to the corners. The profile below is drawn
// at full size, then squeezed to LENGTH so the car reads a little more compact on the map.
const LENGTH = 0.92;
const WHEELBASE_HALF = 1.495;
const TRACK_HALF = 0.83;
const WHEEL_R = 0.37;
const ARCH_R = 0.45;
const WHEELS = [
  [TRACK_HALF, WHEELBASE_HALF * LENGTH],
  [-TRACK_HALF, WHEELBASE_HALF * LENGTH],
  [TRACK_HALF, -WHEELBASE_HALF * LENGTH],
  [-TRACK_HALF, -WHEELBASE_HALF * LENGTH],
] as const;

const v = (z: number, y: number) => new THREE.Vector2(z, y);

/** Side profile of the lower body: short nose, low hood, flat beltline, Kamm tail, wheel arches. */
function bodyShape() {
  const s = new THREE.Shape();
  s.moveTo(2.3, 0.3);
  s.lineTo(2.34, 0.5);
  s.quadraticCurveTo(2.35, 0.74, 2.22, 0.8);
  s.quadraticCurveTo(1.75, 0.9, 1.22, 0.99);
  s.lineTo(-1.6, 1.03);
  s.quadraticCurveTo(-2.25, 1.05, -2.33, 0.96);
  s.lineTo(-2.36, 0.55);
  s.quadraticCurveTo(-2.36, 0.32, -2.25, 0.28);
  for (const c of [-WHEELBASE_HALF, WHEELBASE_HALF]) {
    // Drawn wider so the arch is round again once the body is squeezed to LENGTH.
    const rz = ARCH_R / LENGTH;
    s.lineTo(c - rz, 0.24);
    s.lineTo(c - rz, 0.36);
    s.absellipse(c, 0.36, rz, ARCH_R, Math.PI, 0, true, 0);
    s.lineTo(c + rz, 0.24);
  }
  s.lineTo(2.22, 0.26);
  return s;
}

// The coupe-like roofline: up from a steeply raked windshield, falling into the rear spoiler.
const ROOF = new THREE.SplineCurve([v(0.22, 1.49), v(-0.3, 1.555), v(-1.0, 1.53), v(-1.8, 1.36)]);

/** Side profile of the glasshouse, sunk a little into the body so no seam shows. */
function glassShape() {
  const s = new THREE.Shape();
  s.moveTo(1.3, 0.94);
  for (const p of ROOF.getPoints(24)) s.lineTo(p.x, p.y);
  s.lineTo(-2.02, 0.98);
  s.lineTo(-1.6, 0.97);
  return s;
}

/** The body-color roof panel over the glass, running back into the spoiler lip. */
function roofShape() {
  const pts = ROOF.getPoints(24).slice(1);
  pts.push(v(-1.92, 1.33));
  const s = new THREE.Shape();
  pts.forEach((p, i) => (i === 0 ? s.moveTo(p.x, p.y + 0.03) : s.lineTo(p.x, p.y + 0.03)));
  for (const p of pts.toReversed()) s.lineTo(p.x, p.y - 0.06);
  return s;
}

/** Extrude a side profile across the car's width, with rounded edges, centered on x = 0. */
function extrudeProfile(shape: THREE.Shape, width: number, bevel: number) {
  const depth = width - bevel * 2;
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    curveSegments: 12,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: 3,
  });
  // Shape x is the car's length: turn it so the extrusion runs across the car.
  g.rotateY(-Math.PI / 2);
  g.translate(depth / 2, 0, 0);
  g.computeVertexNormals();
  return g;
}

/** Where overlays point: the top of the hood's front edge, meters above the ground. */
const NOSE_Y = 1.2;
/** How far right of center overlays point: the car's right side, half its 1.9 m width. */
const SIDE = 0.95;

export function Vehicle() {
  const { meta, anchors } = useCabinScreen();
  const body = useMemo(() => cssVar("--surface"), []);
  const glass = useMemo(() => cssVar("--foreground"), []);
  const sensor = useMemo(() => cssVar("--waymo-slate"), []);
  const tire = useMemo(() => cssVar("--waymo-slate"), []);
  const brakeOn = useMemo(() => new THREE.Color(cssVar("--danger")), []);
  const brakeOff = useMemo(() => new THREE.Color(cssVar("--border")), []);
  const hub = useMemo(() => cssVar("--border"), []);
  const shapes = useMemo(
    () => ({
      body: extrudeProfile(bodyShape(), 1.9, 0.14),
      glass: extrudeProfile(glassShape(), 1.44, 0.1),
      roof: extrudeProfile(roofShape(), 1.5, 0.04),
    }),
    [],
  );
  useEffect(
    () => () => {
      shapes.body.dispose();
      shapes.glass.dispose();
      shapes.roof.dispose();
    },
    [shapes],
  );
  const car = useRef<THREE.Group>(null);
  const brake = useRef<THREE.MeshBasicMaterial>(null);
  const nose = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ camera, size }) => {
    const live = meta.getSnapshot();
    // Keep the HTML anchor on the car's front-right corner so overlays can point at it. The camera
    // looks forward, so that's the top-right of the car on screen, where a thinking bubble's puff
    // hangs. Right of heading (sin h, cos h) is (-cos h, sin h).
    nose
      .set(
        live.x + Math.sin(live.heading) * NOSE_AHEAD - Math.cos(live.heading) * SIDE,
        NOSE_Y,
        live.z + Math.cos(live.heading) * NOSE_AHEAD + Math.sin(live.heading) * SIDE,
      )
      .project(camera);
    const anchor = anchors.vehicle;
    anchor.point.x = ((nose.x + 1) / 2) * size.width;
    anchor.point.y = ((1 - nose.y) / 2) * size.height;
    if (anchor.ref.current) {
      anchor.ref.current.style.translate = `${anchor.point.x}px ${anchor.point.y}px`;
    }
    if (car.current) {
      car.current.position.set(live.x, 0, live.z);
      car.current.rotation.y = live.heading;
    }
    const lit = live.braking || live.speed < 0.1;
    brake.current?.color.copy(lit ? brakeOn : brakeOff);
  });

  return (
    <group ref={car}>
      {/* Body and its trim, squeezed to LENGTH. Wheels and the dome sit outside so they stay round. */}
      <group scale={[1, 1, LENGTH]}>
        <mesh geometry={shapes.body}>
          <meshLambertMaterial color={body} />
        </mesh>
        <mesh geometry={shapes.glass}>
          <meshLambertMaterial color={glass} />
        </mesh>
        <mesh geometry={shapes.roof}>
          <meshLambertMaterial color={body} />
        </mesh>
        {/* Hood scoop just ahead of the windshield, and the wide grille in the nose. */}
        <mesh position={[0, 0.955, 1.62]} rotation={[-0.2, 0, 0]}>
          <boxGeometry args={[0.7, 0.03, 0.36]} />
          <meshLambertMaterial color={sensor} />
        </mesh>
        <mesh position={[0, 0.56, 2.33]}>
          <boxGeometry args={[1.0, 0.3, 0.06]} />
          <meshLambertMaterial color={sensor} />
        </mesh>
        {/* Slim headlights at the nose corners. */}
        {[-0.66, 0.66].map((x) => (
          <mesh key={x} position={[x, 0.76, 2.26]} rotation={[-0.35, 0, 0]}>
            <boxGeometry args={[0.42, 0.05, 0.14]} />
            <meshLambertMaterial color={glass} />
          </mesh>
        ))}
        {/* Mirrors, and Waymo's perimeter sensors on the front fenders and rear corners. */}
        {[-1, 1].map((side) => (
          <group key={side}>
            <mesh position={[side * 1.02, 1.07, 1.08]}>
              <boxGeometry args={[0.16, 0.12, 0.2]} />
              <meshLambertMaterial color={body} />
            </mesh>
            <mesh position={[side * 0.96, 1.08, 1.5]}>
              <boxGeometry args={[0.1, 0.2, 0.24]} />
              <meshLambertMaterial color={sensor} />
            </mesh>
            <mesh position={[side * 0.86, 1.1, -2.2]}>
              <boxGeometry args={[0.16, 0.16, 0.16]} />
              <meshLambertMaterial color={sensor} />
            </mesh>
          </group>
        ))}
        {/* Full-width tail light under the spoiler. */}
        <mesh position={[0, 0.88, -2.36]}>
          <boxGeometry args={[1.6, 0.06, 0.02]} />
          <meshBasicMaterial ref={brake} color={brakeOff} />
        </mesh>
      </group>
      {/* Roof lidar dome on its base. */}
      <mesh position={[0, 1.67, -0.3 * LENGTH]}>
        <cylinderGeometry args={[0.3, 0.36, 0.18, 32]} />
        <meshLambertMaterial color={body} />
      </mesh>
      <mesh position={[0, 1.88, -0.3 * LENGTH]}>
        <cylinderGeometry args={[0.26, 0.28, 0.26, 32]} />
        <meshLambertMaterial color={sensor} />
      </mesh>
      <mesh position={[0, 2.01, -0.3 * LENGTH]}>
        <sphereGeometry args={[0.26, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshLambertMaterial color={sensor} />
      </mesh>
      {WHEELS.map(([x, z]) => (
        <group key={`${x}${z}`} position={[x, WHEEL_R, z]} rotation={[0, 0, Math.PI / 2]}>
          <mesh>
            <cylinderGeometry args={[WHEEL_R, WHEEL_R, 0.26, 24]} />
            <meshLambertMaterial color={tire} />
          </mesh>
          {/* Rim face on the outboard side. */}
          <mesh position={[0, Math.sign(x) * -0.132, 0]}>
            <cylinderGeometry args={[0.25, 0.25, 0.01, 24]} />
            <meshLambertMaterial color={hub} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
