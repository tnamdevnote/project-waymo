"use client";

// CabinMap.City: ground, sidewalk blocks, buildings and road markings. Static, built once.
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { type Box, buildCity, buildMarkings, cssVar } from "./world";

const city = buildCity();
const marks = buildMarkings();

function Boxes({ items, color }: { items: Box[]; color: string }) {
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
      <boxGeometry />
      <meshLambertMaterial color={color} />
    </instancedMesh>
  );
}

export function City() {
  const road = useMemo(() => cssVar("--waymo-slate"), []);
  const sidewalk = useMemo(() => cssVar("--surface-secondary"), []);
  const building = useMemo(() => cssVar("--surface-tertiary"), []);
  const marking = useMemo(() => cssVar("--surface"), []);

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1200, 1200]} />
        <meshLambertMaterial color={road} />
      </mesh>
      <Boxes items={city.slabs} color={sidewalk} />
      <Boxes items={city.buildings} color={building} />
      <Boxes items={marks.lines} color={marking} />
      <Boxes items={marks.dashes} color={marking} />
      <Boxes items={marks.walks} color={marking} />
    </>
  );
}
