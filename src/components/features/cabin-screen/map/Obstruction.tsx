"use client";
/* oxlint-disable react/immutability -- R3F idiom: the heat's opacity is animated per frame in useFrame. */

// CabinMap.Obstruction: marks what the car is stuck behind once it has found it (the "detected"
// diagnosis stage) as heat painted on the road: one soft blob per cone plus a wide, faint one over
// the closure, so it reads hottest where the cones bunch up. Drawn in the scene, so it follows the
// map's perspective. Decorative: the Diagnosis panel says "Obstruction detected" for screen readers.
// See docs/decisions/obstruction-marker.md.
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import * as THREE from "three";
import { useCabinScreen } from "../CabinScreenRoot";
import { CONES, cssVar } from "./world";

// The closure the car is stuck behind: the cone row nearest the car (it drives toward -z) and
// anything within 4m past it.
const nearZ = Math.max(...CONES.map(([, z]) => z));
const CLOSURE = CONES.filter(([, z]) => z >= nearZ - 4);
const AREA = (() => {
  const xs = CLOSURE.map(([x]) => x);
  const zs = CLOSURE.map(([, z]) => z);
  return {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    z: (Math.min(...zs) + Math.max(...zs)) / 2,
    sx: Math.max(...xs) - Math.min(...xs) + 7,
    sz: Math.max(...zs) - Math.min(...zs) + 7,
  };
})();

/** Meters across one cone's blob. */
const CONE_SIZE = 4.4;
const CONE_OPACITY = 0.6;
const AREA_OPACITY = 0.4;
/** Above the route ribbon (0.06m) and drawn after it (renderOrder 2), so the heat sits on top. */
const Y = 0.08;
const RENDER_ORDER = 3;
const FLAT: [number, number, number] = [-Math.PI / 2, 0, 0];
const ENTER_S = 0.3;
const EXIT_S = 0.2;

/** Stands in for cubic-bezier(0.32, 0.72, 0, 1), the project's enter curve. */
const easeOut = (t: number) => 1 - (1 - t) ** 4;

/** A white radial falloff, tinted by the material. */
function blobTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.45, "rgba(255,255,255,0.55)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const REDUCED = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (on: () => void) => {
  const mq = matchMedia(REDUCED);
  mq.addEventListener("change", on);
  return () => mq.removeEventListener("change", on);
};

export function Obstruction() {
  const { state } = useCabinScreen();
  const shown = state.diagnosis === "detected";
  const reduced = useSyncExternalStore(
    subscribeReduced,
    () => matchMedia(REDUCED).matches,
    () => false,
  );

  const tex = useMemo(() => blobTexture(), []);
  const mats = useMemo(() => {
    const make = () =>
      new THREE.MeshBasicMaterial({
        map: tex,
        color: cssVar("--danger"),
        transparent: true,
        depthWrite: false,
        opacity: 0,
      });
    return { cone: make(), area: make() };
  }, [tex]);
  useEffect(
    () => () => {
      tex.dispose();
      mats.cone.dispose();
      mats.area.dispose();
    },
    [tex, mats],
  );

  // 0 hidden → 1 shown, stepped per frame so a reversal mid-fade picks up where it is.
  const progress = useRef(0);
  const group = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    const target = shown ? 1 : 0;
    const p = progress.current;
    if (reduced) progress.current = target;
    else if (p < target) progress.current = Math.min(target, p + dt / ENTER_S);
    else if (p > target) progress.current = Math.max(target, p - dt / EXIT_S);
    const k = easeOut(progress.current);
    mats.cone.opacity = CONE_OPACITY * k;
    mats.area.opacity = AREA_OPACITY * k;
    if (group.current) group.current.visible = progress.current > 0;
  });

  return (
    <group ref={group} visible={false}>
      <mesh
        position={[AREA.x, Y, AREA.z]}
        rotation={FLAT}
        scale={[AREA.sx, AREA.sz, 1]}
        material={mats.area}
        renderOrder={RENDER_ORDER}
      >
        <planeGeometry />
      </mesh>
      {CLOSURE.map(([x, z]) => (
        <mesh
          key={`${x},${z}`}
          position={[x, Y + 0.001, z]}
          rotation={FLAT}
          scale={CONE_SIZE}
          material={mats.cone}
          renderOrder={RENDER_ORDER}
        >
          <planeGeometry />
        </mesh>
      ))}
    </group>
  );
}
