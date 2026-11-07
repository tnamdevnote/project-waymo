"use client";

// CabinMap.Viewport: the WebGL canvas filling CabinScreen.Root. Steps the drive sim once per
// frame, before the map parts run, so they all read the same updated position.
import { Canvas, useFrame } from "@react-three/fiber";
import type { ReactNode } from "react";
import { useCabinEngine } from "../CabinScreenRoot";
import { palette } from "./palette";

const LABEL =
  "Map: your car driving to the destination. The route ahead is green, the part already driven is blue.";

function Step() {
  const engine = useCabinEngine();
  // Negative priority runs before the parts' default-priority frames and keeps R3F's own render.
  useFrame((_, dt) => engine.step(Math.min(dt, 0.05)), -1);
  return null;
}

export function Viewport({ children }: { children?: ReactNode }) {
  return (
    <Canvas
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a WebGL canvas can't be an <img>
      role="img"
      aria-label={LABEL}
      flat
      dpr={[1, 2]}
      camera={{ fov: 50, near: 0.5, far: 1200, position: [0, 10, 20] }}
      style={{ position: "absolute", inset: 0 }}
    >
      <color attach="background" args={[palette.bg]} />
      <fog attach="fog" args={[palette.bg, palette.fog[0], palette.fog[1]]} />
      <hemisphereLight args={palette.hemi} />
      <directionalLight position={[-60, 120, 40]} intensity={palette.sun} />
      <Step />
      {children}
    </Canvas>
  );
}
