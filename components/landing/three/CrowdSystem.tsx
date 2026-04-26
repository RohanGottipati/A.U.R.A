"use client";

import { useRef, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ATTRACTORS, GATES, HOTSPOTS } from "@/lib/festivalData";
import { mapClamp } from "@/hooks/useScrollProgress";

const COUNT = 360;
const tempObj = new THREE.Object3D();
const tempColor = new THREE.Color();

function pickAttractor() {
  const total = ATTRACTORS.reduce((s, a) => s + a.weight, 0);
  let r = Math.random() * total;
  for (const a of ATTRACTORS) {
    if (r < a.weight) return { x: a.x, z: a.z };
    r -= a.weight;
  }
  return { x: ATTRACTORS[0].x, z: ATTRACTORS[0].z };
}

interface Particle {
  x: number;
  z: number;
  target: { x: number; z: number };
  speed: number;
  spawnAt: number;
  phase: number;
}

export default function CrowdSystem({ getProgress }: { getProgress: () => number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: COUNT }, (_, i) => {
      const gate = GATES[i % GATES.length];
      return {
        x: gate.x + (Math.random() - 0.5) * 5,
        z: gate.z + Math.random() * 4 + 1,
        target: pickAttractor(),
        speed: 0.025 + Math.random() * 0.04,
        spawnAt: Math.random(),
        phase: Math.random() * Math.PI * 2,
      };
    });
  }, []);

  useEffect(() => {
    if (!meshRef.current) return;
    for (let i = 0; i < COUNT; i++) {
      tempObj.position.set(0, -200, 0);
      tempObj.scale.setScalar(0.0001);
      tempObj.updateMatrix();
      meshRef.current.setMatrixAt(i, tempObj.matrix);
      meshRef.current.setColorAt(i, tempColor.set("#00f0ff"));
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, []);

  useFrame((state, dt) => {
    if (!meshRef.current) return;
    const p = getProgress();
    const dtC = Math.min(dt, 0.05);
    const time = state.clock.elapsedTime;
    const crowdReveal = mapClamp(p, 0.66, 0.86, 0, 1);
    const optimization = mapClamp(p, 0.92, 1.0, 0, 1);

    for (let i = 0; i < COUNT; i++) {
      const part = particles[i];
      const visible = part.spawnAt <= crowdReveal;

      if (!visible) {
        tempObj.position.set(0, -200, 0);
        tempObj.scale.setScalar(0.0001);
        tempObj.updateMatrix();
        meshRef.current.setMatrixAt(i, tempObj.matrix);
        continue;
      }

      let tx = part.target.x;
      let tz = part.target.z;
      if (optimization > 0) {
        tx += ((i * 0.937) % 5 - 2.5) * optimization * 2.4;
        tz += ((i * 1.317) % 4 - 2) * optimization * 2.4;
      }

      const dx = tx - part.x;
      const dz = tz - part.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      let inHot = false;
      let nearestHot = 0;
      for (const hot of HOTSPOTS) {
        const ddx = part.x - hot.x;
        const ddz = part.z - hot.z;
        const d2 = ddx * ddx + ddz * ddz;
        if (d2 < hot.radius * hot.radius) {
          inHot = true;
          nearestHot = 1 - Math.sqrt(d2) / hot.radius;
          break;
        }
      }

      if (dist > 0.6) {
        const nx = dx / dist;
        const nz = dz / dist;
        const slow = inHot && optimization < 0.5 ? 0.25 : 1.0;
        const speedBoost = 1 + optimization * 0.6;
        const wanderX = Math.sin(time * 0.6 + part.phase) * 0.12;
        const wanderZ = Math.cos(time * 0.55 + part.phase) * 0.12;
        part.x += (nx * part.speed * slow * speedBoost + wanderX * 0.04) * 60 * dtC;
        part.z += (nz * part.speed * slow * speedBoost + wanderZ * 0.04) * 60 * dtC;
      } else {
        if (Math.random() < 0.04) part.target = pickAttractor();
      }

      let cx = 0, cy = 0.94, cz = 1.0;
      const showCongestion = p > 0.72 && optimization < 0.6;
      if (inHot && showCongestion) {
        cx = THREE.MathUtils.lerp(cx, 1.0, 0.85 + nearestHot * 0.15);
        cy = THREE.MathUtils.lerp(cy, 0.23, 0.85 + nearestHot * 0.15);
        cz = THREE.MathUtils.lerp(cz, 0.18, 0.85 + nearestHot * 0.15);
      }
      if (optimization > 0.2) {
        cx = THREE.MathUtils.lerp(cx, 0.0, optimization);
        cy = THREE.MathUtils.lerp(cy, 1.0, optimization);
        cz = THREE.MathUtils.lerp(cz, 0.66, optimization);
      }
      tempColor.setRGB(cx, cy, cz);

      const y = 0.6 + Math.sin(time * 4 + part.phase) * 0.05;
      tempObj.position.set(part.x, y, part.z);
      tempObj.rotation.y = time * 0.4 + part.phase;
      tempObj.scale.set(0.28, 1.2, 0.28);
      tempObj.updateMatrix();
      meshRef.current.setMatrixAt(i, tempObj.matrix);
      meshRef.current.setColorAt(i, tempColor);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]} castShadow={false}>
      <cylinderGeometry args={[1, 1, 1, 6]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}
