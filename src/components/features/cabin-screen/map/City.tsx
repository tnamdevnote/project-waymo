"use client";

// CabinMap.City: ground, sidewalk blocks, buildings, bollards and road markings. Static, built once.
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { type Box, BUILDING_RADIUS, buildCity, buildMarkings, CURB_RADIUS, cssVar } from "./world";

const city = buildCity();
const marks = buildMarkings();

function Boxes({
  items,
  color,
  shape = "box",
}: {
  items: Box[];
  color: THREE.ColorRepresentation;
  /** "cylinder" fits a round post inside each box. */
  shape?: "box" | "cylinder";
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const o = new THREE.Object3D();
    items.forEach((b, i) => {
      o.position.set(b.x, b.y, b.z);
      o.scale.set(b.sx, b.sy, b.sz);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]}>
      {shape === "cylinder" ? <cylinderGeometry args={[0.5, 0.5, 1, 20]} /> : <boxGeometry />}
      <meshLambertMaterial color={color} />
    </instancedMesh>
  );
}

/** A w × h rectangle centered on the origin, with corners rounded to r. */
function roundedRect(w: number, h: number, r: number) {
  const x = w / 2;
  const y = h / 2;
  r = Math.min(r, x, y);
  const s = new THREE.Shape();
  s.moveTo(-x + r, -y);
  s.lineTo(x - r, -y);
  s.quadraticCurveTo(x, -y, x, -y + r);
  s.lineTo(x, y - r);
  s.quadraticCurveTo(x, y, x - r, y);
  s.lineTo(-x + r, y);
  s.quadraticCurveTo(-x, y, -x, y - r);
  s.lineTo(-x, -y + r);
  s.quadraticCurveTo(-x, -y, -x + r, -y);
  return s;
}

/** Sidewalk blocks: rounded curb corners in plan and a slightly eased top edge. */
function slabGeometry(items: Box[]) {
  const bevel = 0.06;
  return mergeGeometries(
    items.map((b) => {
      const g = new THREE.ExtrudeGeometry(roundedRect(b.sx, b.sz, CURB_RADIUS), {
        depth: b.sy - bevel * 2,
        curveSegments: 10,
        bevelEnabled: true,
        bevelThickness: bevel,
        bevelSize: bevel,
        bevelOffset: -bevel,
        bevelSegments: 2,
      });
      // Shape is drawn in XY and extruded along +z; stand it on the ground (extrusion → +y).
      g.rotateX(-Math.PI / 2);
      g.translate(b.x, b.y - b.sy / 2 + bevel, b.z);
      return g;
    }),
  );
}

/** Buildings: every edge rounded. The base sinks below the sidewalk so only the top edges show. */
function buildingGeometry(items: Box[]) {
  const r = BUILDING_RADIUS;
  return mergeGeometries(
    items.map((b) => {
      const g = new RoundedBoxGeometry(b.sx, b.sy + r, b.sz, 3, r);
      g.translate(b.x, b.y - r / 2, b.z);
      return g;
    }),
  );
}

function Merged({
  build,
  color,
}: {
  build: () => THREE.BufferGeometry;
  color: THREE.ColorRepresentation;
}) {
  const geometry = useMemo(() => build(), [build]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry}>
      <meshLambertMaterial color={color} />
    </mesh>
  );
}

const slabs = () => slabGeometry(city.slabs);
const buildings = () => buildingGeometry(city.buildings);

export function City() {
  const road = useMemo(() => cssVar("--waymo-slate"), []);
  const sidewalk = useMemo(() => cssVar("--surface-secondary"), []);
  const building = useMemo(() => cssVar("--surface-tertiary"), []);
  const marking = useMemo(() => cssVar("--surface"), []);
  // Road paint yellow for the double center line.
  const centerLine = useMemo(() => cssVar("--warning"), []);
  // Same washed-out brand blue as the other cars, so street furniture reads as "not you".
  const bollard = useMemo(
    () => new THREE.Color(cssVar("--surface")).lerp(new THREE.Color(cssVar("--accent")), 0.55),
    [],
  );

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1200, 1200]} />
        <meshLambertMaterial color={road} />
      </mesh>
      <Merged build={slabs} color={sidewalk} />
      <Merged build={buildings} color={building} />
      <Boxes items={city.bollards} color={bollard} shape="cylinder" />
      <Boxes items={marks.lines} color={centerLine} />
      <Boxes items={marks.dashes} color={marking} />
      <Boxes items={marks.walks} color={marking} />
    </>
  );
}
