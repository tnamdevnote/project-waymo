"use client";
/* oxlint-disable react/immutability -- R3F idiom: materials are mutated per frame in useFrame. */

// CabinMap.PassArrows: while the car offers the ways past the fire truck, each way is an arrow
// painted flat on the road along the path the car would drive. The proposed bypass is bright and
// the detour faint, until the rider points at the detour (CabinScreen.Pass sets the focus).
// Decorative: the panel's buttons name the ways.
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { type PassWay, useCabinScreen } from "../CabinScreenRoot";
import { pathAt } from "./detour";
import { cssVar, type World } from "./world";

const REDUCED = "(prefers-reduced-motion: reduce)";
/** Sample spacing along each way, meters. */
const STEP = 0.5;
/** How far each arrow reaches past the stop, meters. */
const REACH: Record<PassWay, number> = { bypass: 22, detour: 17 };
/** Highest opacity: a marking on the road, not a solid shape over it. */
const MAX_OPACITY = 0.85;
const WAYS: PassWay[] = ["bypass", "detour"];

/** Points along the way the car would drive past the truck, from just past the stop. */
function samples(world: World, way: PassWay) {
  const pts: THREE.Vector3[] = [];
  const uturn = world.uturn;
  const out = world.reroutes[0]?.to;
  for (let s = STEP; s <= REACH[way]; s += STEP) {
    if (way === "detour" && uturn) pts.push(uturn.at(uturn.stopAt + s, new THREE.Vector3()));
    // The engine's own path: one lane left past the truck, then straight on up Comal St.
    else if (way === "bypass" && out)
      pts.push(pathAt(out, out.stopAt + s, out.stopAt, new THREE.Vector3()));
  }
  return pts;
}

/** A flat ribbon along `pts`, ending in an arrowhead. */
function arrowGeometry(pts: THREE.Vector3[], width = 1.1, head = 2.6) {
  const pos: number[] = [];
  const side = (i: number) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const d = new THREE.Vector3().subVectors(b, a).normalize();
    return new THREE.Vector3(-d.z, 0, d.x);
  };
  // Stop the shaft short so the head sits on the end.
  const end = pts.length - 1 - Math.round(head / STEP);
  for (let i = 0; i < end; i++) {
    const n0 = side(i).multiplyScalar(width / 2);
    const n1 = side(i + 1).multiplyScalar(width / 2);
    const [a, b] = [pts[i], pts[i + 1]];
    pos.push(a.x + n0.x, 0, a.z + n0.z, a.x - n0.x, 0, a.z - n0.z, b.x + n1.x, 0, b.z + n1.z);
    pos.push(b.x + n1.x, 0, b.z + n1.z, a.x - n0.x, 0, a.z - n0.z, b.x - n1.x, 0, b.z - n1.z);
  }
  const base = pts[end];
  const tip = pts[pts.length - 1];
  const n = side(end).multiplyScalar(width * 1.3);
  pos.push(base.x + n.x, 0, base.z + n.z, base.x - n.x, 0, base.z - n.z, tip.x, 0, tip.z);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  return g;
}

export function PassArrows() {
  const { state } = useCabinScreen();
  const { world, pass } = state;

  // Each way's target opacity, 0–1: hidden outside "choosing"; the proposal bright, the other faint.
  const focus = pass?.stage === "choosing" ? pass.focus : null;
  const level: Record<PassWay, number> =
    pass?.stage === "choosing"
      ? { bypass: focus === "detour" ? 0.35 : 1, detour: focus === "detour" ? 1 : 0.3 }
      : { bypass: 0, detour: 0 };
  const levelRef = useRef(level);
  useEffect(() => {
    levelRef.current = level;
  });

  const geos = useMemo(() => {
    if (!world.blocked || !world.uturn || !world.reroutes[0]) return null;
    return {
      bypass: arrowGeometry(samples(world, "bypass")),
      detour: arrowGeometry(samples(world, "detour")),
    };
  }, [world]);
  const mats = useMemo(() => {
    const make = () =>
      new THREE.MeshBasicMaterial({
        // Not accent: the route already uses blue for the part driven. Foreground reads as a
        // marking painted on the road, in either theme.
        color: cssVar("--foreground"),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
    return { bypass: make(), detour: make() };
  }, []);
  useEffect(
    () => () => {
      for (const g of Object.values(geos ?? {})) g.dispose();
      for (const m of Object.values(mats)) m.dispose();
    },
    [geos, mats],
  );

  useFrame((_, dt) => {
    const reduced = matchMedia(REDUCED).matches;
    for (const way of WAYS) {
      const target = levelRef.current[way] * MAX_OPACITY;
      const m = mats[way];
      // Settles in about 250ms, and reverses cleanly mid-fade.
      m.opacity = reduced ? target : THREE.MathUtils.damp(m.opacity, target, 14, dt);
      m.visible = m.opacity > 0.01;
    }
  });

  if (!geos) return null;
  return (
    <>
      {WAYS.map((way) => (
        <mesh
          key={way}
          geometry={geos[way]}
          material={mats[way]}
          position-y={0.1}
          renderOrder={4}
        />
      ))}
    </>
  );
}
