'use client';
/* oxlint-disable react/immutability -- R3F idiom: instance matrices and colors are mutated per frame in useFrame, outside React. */

// CabinMap.Traffic: other cars, shown only within `range` meters and fading into the fog at the edge.
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useCabinScreen } from '../CabinScreenRoot';
import { TRAFFIC, cssVar, laneSpot } from './world';

const SIZE: [number, number, number] = [1.9, 1.45, 4.5];
const TOTAL = TRAFFIC.reduce((n, l) => n + l.count, 0);

const TRAFFIC_OPACITY = 0.85;

export function Traffic({ range = 60 }: { range?: number }) {
  const { meta } = useCabinScreen();
  const ref = useRef<THREE.InstancedMesh>(null);
  const tmp = useMemo(
    () => ({
      o: new THREE.Object3D(),
      p: new THREE.Vector3(),
      ego: new THREE.Vector3(),
      c: new THREE.Color(),
      near: new THREE.Color(cssVar('--surface')),
      far: new THREE.Color(cssVar('--background')),
    }),
    [],
  );

  useFrame(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const live = meta.getSnapshot();
    tmp.ego.set(live.x, 0, live.z);
    let i = 0;
    for (const lane of TRAFFIC) {
      for (let k = 0; k < lane.count; k++) {
        laneSpot(lane, k, live.time, tmp.p);
        const dist = tmp.p.distanceTo(tmp.ego);
        tmp.o.position.set(tmp.p.x, SIZE[1] / 2 + 0.05, tmp.p.z);
        tmp.o.rotation.y = lane.axis === 'z' ? 0 : Math.PI / 2;
        tmp.o.scale.setScalar(dist < range ? 1 : 0);
        tmp.o.updateMatrix();
        mesh.setMatrixAt(i, tmp.o.matrix);
        tmp.c.lerpColors(
          tmp.near,
          tmp.far,
          THREE.MathUtils.smoothstep(dist, range * 0.6, range),
        );
        mesh.setColorAt(i, tmp.c);
        i++;
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, TOTAL]}
      frustumCulled={false}
    >
      <boxGeometry args={SIZE} />
      <meshLambertMaterial transparent opacity={TRAFFIC_OPACITY} />
    </instancedMesh>
  );
}
