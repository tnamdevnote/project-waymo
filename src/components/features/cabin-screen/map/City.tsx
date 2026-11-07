"use client";

// CabinMap.City: ground, sidewalk blocks, buildings and road markings. Static, built once.
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { palette } from "./palette";
import { type Box, buildCity, buildMarkings } from "./world";

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
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1200, 1200]} />
        <meshLambertMaterial color={palette.road} />
      </mesh>
      <Boxes items={city.slabs} color={palette.sidewalk} />
      <Boxes items={city.buildings} color={palette.building} />
      <Boxes items={marks.lines} color={palette.marking} />
      <Boxes items={marks.dashes} color={palette.marking} />
      <Boxes items={marks.walks} color={palette.marking} />
    </>
  );
}
