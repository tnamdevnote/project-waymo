"use client";
/* oxlint-disable react/immutability -- R3F idiom: shader uniforms are mutated per frame in useFrame, outside React. */

// CabinMap.Route: a flat strip on the road. Green ahead of the car, blue behind, fading at both ends.
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useCabinScreen } from "../CabinScreenRoot";
import { palette } from "./palette";
import { loop } from "./world";

const vertexShader = /* glsl */ `
attribute float aDist;
attribute float aSide;
varying float vDist;
varying float vSide;
void main() {
  vDist = aDist;
  vSide = aSide;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const fragmentShader = /* glsl */ `
uniform float uCar;
uniform float uLen;
uniform float uAhead;
uniform float uBehind;
uniform vec3 uAheadColor;
uniform vec3 uBehindColor;
varying float vDist;
varying float vSide;
void main() {
  // signed meters from the car along the route, wrapped around the loop
  float d = mod(vDist - uCar + uLen * 0.5, uLen) - uLen * 0.5;
  if (d > uAhead || -d > uBehind) discard;
  float a = d >= 0.0
    ? 1.0 - smoothstep(uAhead * 0.3, uAhead, d)
    : 1.0 - smoothstep(uBehind * 0.4, uBehind, -d);
  vec3 c = mix(uBehindColor, uAheadColor, smoothstep(-1.2, 1.2, d));
  float edge = 1.0 - smoothstep(0.8, 1.0, abs(vSide));
  gl_FragColor = vec4(c, a * edge * 0.92);
  #include <colorspace_fragment>
}`;

function buildRibbon(width: number) {
  const step = 0.5;
  const n = Math.ceil(loop.len / step) + 1;
  const pos = new Float32Array(n * 6);
  const dist = new Float32Array(n * 2);
  const side = new Float32Array(n * 2);
  const idx: number[] = [];
  const p = new THREE.Vector3();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const d = Math.min(i * step, loop.len);
    loop.at(d, p);
    loop
      .at(d + 0.5, a)
      .sub(loop.at(d - 0.5, b))
      .normalize();
    const rx = -a.z * (width / 2);
    const rz = a.x * (width / 2);
    pos.set([p.x - rx, 0.06, p.z - rz, p.x + rx, 0.06, p.z + rz], i * 6);
    dist.set([d, d], i * 2);
    side.set([-1, 1], i * 2);
    if (i < n - 1) {
      const k = i * 2;
      idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aDist", new THREE.BufferAttribute(dist, 1));
  g.setAttribute("aSide", new THREE.BufferAttribute(side, 1));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

export function Route({
  ahead = 60,
  behind = 25,
  width = 2.4,
}: {
  /** Meters of route shown ahead of the car. */
  ahead?: number;
  /** Meters of route shown behind the car. */
  behind?: number;
  /** Strip width, meters. */
  width?: number;
}) {
  const { meta } = useCabinScreen();
  const geometry = useMemo(() => buildRibbon(width), [width]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const uniforms = useMemo(
    () => ({
      uCar: { value: 0 },
      uLen: { value: loop.len },
      uAhead: { value: 0 }, // written every frame from the props
      uBehind: { value: 0 },
      uAheadColor: { value: new THREE.Color(palette.ahead) },
      uBehindColor: { value: new THREE.Color(palette.behind) },
    }),
    [],
  );

  useFrame(() => {
    uniforms.uCar.value = meta.getSnapshot().dist;
    uniforms.uAhead.value = ahead;
    uniforms.uBehind.value = Math.max(behind, 0.01);
  });

  return (
    <mesh geometry={geometry} renderOrder={2} frustumCulled={false}>
      <shaderMaterial
        args={[{ uniforms, vertexShader, fragmentShader }]}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
