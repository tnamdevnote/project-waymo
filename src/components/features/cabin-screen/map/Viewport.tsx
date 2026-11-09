"use client";

// CabinMap.Viewport: the WebGL canvas filling CabinScreen.Root. Steps the drive sim once per
// frame, before the map parts run, so they all read the same updated position.
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, type ReactNode } from "react";
import { useCabinEngine } from "../CabinScreenRoot";
import { cssVar } from "./world";

const LABEL =
  "Map: your car driving to the destination. The route ahead is green, the part already driven is blue.";

function Step() {
  const engine = useCabinEngine();
  // Negative priority runs before the parts' default-priority frames and keeps R3F's own render.
  useFrame((_, dt) => engine.step(Math.min(dt, 0.05)), -1);
  return null;
}

const FOG_NEAR = 70;
const FOG_FAR = 230;

function Atmosphere() {
  const background = useMemo(() => cssVar("--background"), []);
  const sky = useMemo(() => cssVar("--surface"), []);
  const ground = useMemo(() => cssVar("--border"), []);

  return (
    <>
      <color attach="background" args={[background]} />
      <fog attach="fog" args={[background, FOG_NEAR, FOG_FAR]} />
      <hemisphereLight color={sky} groundColor={ground} intensity={1.9} />
      <directionalLight position={[-60, 120, 40]} intensity={1.3} />
    </>
  );
}

export function Viewport({ children }: { children?: ReactNode }) {
  return (
    <Canvas
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a WebGL canvas can't be an <img>
      role="img"
      aria-label={LABEL}
      className="bg-background"
      flat
      dpr={[1, 2]}
      camera={{ fov: 50, near: 0.5, far: 1200, position: [0, 10, 20] }}
      style={{ position: "absolute", inset: 0 }}
    >
      <Atmosphere />
      <Step />
      {children}
    </Canvas>
  );
}
