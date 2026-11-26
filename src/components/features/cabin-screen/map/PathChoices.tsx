"use client";

// CabinMap.PathChoices: while the rider is picking a path, draws a dotted line along each way the
// car could go and keeps each choice's HTML anchor at the end of its line, so CabinScreen.PathPick
// can put a button there. The dots are decorative: the buttons name the choices.
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { type CabinAnchor, type PathChoice, useCabinScreen } from "../CabinScreenRoot";
import { pathAt } from "./detour";
import { cssVar, NOSE_AHEAD, type World } from "./world";

const DOT_RADIUS = 0.3;
const DOT_GAP = 1.2;
/** Just above the road. */
const Y = 0.09;
/** Where each line ends, in meters of driving from the stop. The button sits on the end. */
const REACH: Record<PathChoice, number> = {
  around: 15,
  // Half the U-turn (an arc of radius 3.5) and a little way back south.
  uturn: Math.PI * 3.5 + 3,
};
const CHOICES = Object.keys(REACH) as PathChoice[];

/** The point `s` meters past the stop on the way `choice` would drive. */
function pointOn(world: World, choice: PathChoice, s: number, out: THREE.Vector3) {
  const { loop, uturn } = world;
  if (choice === "uturn" && uturn) return uturn.at(uturn.stopAt + s, out);
  return pathAt(loop, loop.stopAt + s, loop.stopAt, out);
}

export function PathChoices() {
  const { state, anchors } = useCabinScreen();
  const { world } = state;
  const shown = state.pick?.stage === "choosing";
  const color = useMemo(() => cssVar("--accent"), []);

  const lines = useMemo(() => {
    if (!world.blocked) return null;
    return CHOICES.map((choice) => {
      const dots: THREE.Vector3[] = [];
      // From just ahead of the nose to just short of the button.
      for (let s = NOSE_AHEAD + 0.6; s < REACH[choice]; s += DOT_GAP) {
        dots.push(pointOn(world, choice, s, new THREE.Vector3()).setY(Y));
      }
      return { choice, dots, end: pointOn(world, choice, REACH[choice], new THREE.Vector3()) };
    });
  }, [world]);

  const spot = useRef(new THREE.Vector3());
  useFrame(({ camera, size }) => {
    if (!lines) return;
    const targets: Record<PathChoice, CabinAnchor> = {
      around: anchors.goAround,
      uturn: anchors.uturn,
    };
    for (const { choice, end } of lines) {
      const p = spot.current.copy(end).project(camera);
      const anchor = targets[choice];
      anchor.point.x = ((p.x + 1) / 2) * size.width;
      anchor.point.y = ((1 - p.y) / 2) * size.height;
      if (anchor.ref.current) {
        anchor.ref.current.style.translate = `${anchor.point.x}px ${anchor.point.y}px`;
      }
    }
  });

  if (!shown || !lines) return null;

  return (
    <>
      {lines.flatMap(({ choice, dots }) =>
        dots.map((dot, i) => (
          <mesh
            key={`${choice}-${i}`}
            position={dot}
            rotation={[-Math.PI / 2, 0, 0]}
            renderOrder={3}
          >
            <circleGeometry args={[DOT_RADIUS, 24]} />
            <meshBasicMaterial color={color} depthWrite={false} />
          </mesh>
        )),
      )}
    </>
  );
}
