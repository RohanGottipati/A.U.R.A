"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { STRUCTURES, LABELS, GATES, HOTSPOTS, VENUE_BOUNDS } from "@/lib/festivalData";
import CrowdSystem from "./CrowdSystem";
import { mapClamp, smoothstep } from "@/hooks/useScrollProgress";

const UNIT_BOX_GEOM = new THREE.BoxGeometry(1, 1, 1);
const UNIT_BOX_EDGES = new THREE.EdgesGeometry(UNIT_BOX_GEOM);

function makeLineLoopGeometry(pts: [number, number, number][]) {
  const flat = new Float32Array(pts.length * 2 * 3);
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    flat.set(a, i * 6);
    flat.set(b, i * 6 + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(flat, 3));
  return g;
}

function makeSegmentsGeometry(segments: [[number, number, number], [number, number, number]][]) {
  const flat = new Float32Array(segments.length * 2 * 3);
  for (let i = 0; i < segments.length; i++) {
    const [a, b] = segments[i];
    flat.set(a, i * 6);
    flat.set(b, i * 6 + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(flat, 3));
  return g;
}

const CAM_KEYS = [
  { t: 0.00, pos: [0, 60, 0.001] as [number, number, number], look: [0, 0, 0] as [number, number, number], fov: 38 },
  { t: 0.18, pos: [0, 58, 0.001] as [number, number, number], look: [0, 0, 0] as [number, number, number], fov: 38 },
  { t: 0.30, pos: [0, 56, 4] as [number, number, number], look: [0, 0, 0] as [number, number, number], fov: 38 },
  { t: 0.40, pos: [2, 44, 16] as [number, number, number], look: [0, 0.4, 0] as [number, number, number], fov: 40 },
  { t: 0.52, pos: [4, 28, 24] as [number, number, number], look: [0, 0.8, 0] as [number, number, number], fov: 42 },
  { t: 0.62, pos: [3, 20, 26] as [number, number, number], look: [0, 1.0, 0] as [number, number, number], fov: 44 },
  { t: 0.74, pos: [12, 10, 16] as [number, number, number], look: [-3, 1.4, 0] as [number, number, number], fov: 50 },
  { t: 0.84, pos: [-14, 8, 14] as [number, number, number], look: [-2, 1.2, 0] as [number, number, number], fov: 52 },
  { t: 0.92, pos: [6, 6, 22] as [number, number, number], look: [0, 1.2, 0] as [number, number, number], fov: 52 },
  { t: 1.00, pos: [16, 5, 14] as [number, number, number], look: [0, 1.4, -6] as [number, number, number], fov: 54 },
];

function lerpVec(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function sampleCam(p: number) {
  if (p <= CAM_KEYS[0].t) return CAM_KEYS[0];
  if (p >= CAM_KEYS[CAM_KEYS.length - 1].t) return CAM_KEYS[CAM_KEYS.length - 1];
  for (let i = 0; i < CAM_KEYS.length - 1; i++) {
    const a = CAM_KEYS[i];
    const b = CAM_KEYS[i + 1];
    if (p >= a.t && p <= b.t) {
      const local = (p - a.t) / (b.t - a.t);
      const e = local * local * (3 - 2 * local);
      return { pos: lerpVec(a.pos, b.pos, e), look: lerpVec(a.look, b.look, e), fov: a.fov + (b.fov - a.fov) * e };
    }
  }
  return CAM_KEYS[CAM_KEYS.length - 1];
}

function CameraRig({ getProgress }: { getProgress: () => number }) {
  const { camera } = useThree();
  useFrame(({ clock }) => {
    const p = getProgress();
    const k = sampleCam(p);
    const bx = Math.sin(clock.elapsedTime * 0.18) * 0.06;
    const by = Math.cos(clock.elapsedTime * 0.22) * 0.04;
    camera.position.set(k.pos[0] + bx, k.pos[1] + by, k.pos[2]);
    (camera as THREE.PerspectiveCamera).lookAt(k.look[0], k.look[1], k.look[2]);
    (camera as THREE.PerspectiveCamera).fov = k.fov;
    camera.updateProjectionMatrix();
  });
  return null;
}

function FogRig({ getProgress }: { getProgress: () => number }) {
  const { scene } = useThree();
  useEffect(() => {
    scene.fog = new THREE.FogExp2("#040409", 0.001);
    scene.background = new THREE.Color("#040409");
  }, [scene]);
  useFrame(() => {
    if (!scene.fog) return;
    const p = getProgress();
    (scene.fog as THREE.FogExp2).density = mapClamp(p, 0.55, 0.78, 0.001, 0.024);
  });
  return null;
}

function Workbench() {
  return (
    <>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.005, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#03030a" metalness={0.1} roughness={0.92} />
      </mesh>
      <gridHelper args={[180, 90, "#0c1620", "#0a1018"]} position={[0, 0, 0]} />
    </>
  );
}

function BlueprintPaper({ getProgress }: { getProgress: () => number }) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const p = getProgress();
    const scan = smoothstep(0.05, 0.24, p);
    const fadeToGround = smoothstep(0.55, 0.78, p);
    if (matRef.current) {
      matRef.current.opacity = 0.55 - fadeToGround * 0.4;
      matRef.current.emissiveIntensity = 0.04 + scan * 0.16;
    }
    if (innerRef.current && innerRef.current.material) {
      (innerRef.current.material as THREE.MeshBasicMaterial).opacity = 0.25 - fadeToGround * 0.18;
    }
  });
  return (
    <group position={[0, 0.001, 0]}>
      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[VENUE_BOUNDS.x * 2 + 6, VENUE_BOUNDS.z * 2 + 6]} />
        <meshStandardMaterial
          ref={matRef}
          color="#06080f"
          emissive="#0a3046"
          emissiveIntensity={0.04}
          metalness={0.05}
          roughness={0.85}
          transparent
          opacity={0.55}
        />
      </mesh>
      <mesh ref={innerRef} rotation-x={-Math.PI / 2} position={[0, 0.002, 0]}>
        <planeGeometry args={[VENUE_BOUNDS.x * 2 + 2, VENUE_BOUNDS.z * 2 + 2]} />
        <meshBasicMaterial color="#0a1a26" transparent opacity={0.25} toneMapped={false} />
      </mesh>
    </group>
  );
}

const SHEETS = [
  { x: -22, y: 5.2, z: -10, rx: -0.05, rz: 0.08, w: 6, h: 8 },
  { x: 21, y: 4.8, z: -8, rx: 0.06, rz: -0.05, w: 5, h: 7 },
  { x: -16, y: 6.6, z: 15, rx: -0.08, rz: -0.04, w: 4.5, h: 6 },
  { x: 18, y: 5.4, z: 17, rx: 0.04, rz: 0.07, w: 5, h: 7 },
  { x: 0, y: 7.4, z: -22, rx: -0.04, rz: 0.0, w: 5.5, h: 7.5 },
  { x: -8, y: 4.6, z: 22, rx: 0.05, rz: -0.06, w: 4, h: 5.5 },
  { x: 12, y: 6.8, z: -18, rx: -0.06, rz: 0.05, w: 4.2, h: 5.8 },
];

function SheetEdges({ w, h, lineRef }: { w: number; h: number; lineRef: (el: THREE.LineBasicMaterial | null) => void }) {
  const geom = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(w, 0.04, h)), [w, h]);
  return (
    <lineSegments geometry={geom} position={[0, 0.025, 0]}>
      <lineBasicMaterial ref={lineRef} color="#00f0ff" transparent opacity={0.85} toneMapped={false} />
    </lineSegments>
  );
}

function SheetLines({ w, h, index, innerRef }: { w: number; h: number; index: number; innerRef: (el: THREE.LineBasicMaterial | null) => void }) {
  const geom = useMemo(() => {
    const seed = index * 13 + 7;
    const rng = (n: number) => { const x = Math.sin(seed + n * 31.7) * 10000; return x - Math.floor(x); };
    const cellsX = 3 + Math.floor(rng(1) * 2);
    const cellsY = 3 + Math.floor(rng(2) * 2);
    const cw = (w - 0.8) / cellsX;
    const ch = (h - 0.8) / cellsY;
    const segs: [[number, number, number], [number, number, number]][] = [];
    for (let i = 0; i <= cellsX; i++) {
      const x = -w / 2 + 0.4 + i * cw;
      segs.push([[x, 0.027, -h / 2 + 0.4], [x, 0.027, h / 2 - 0.4]]);
    }
    for (let j = 0; j <= cellsY; j++) {
      const z = -h / 2 + 0.4 + j * ch;
      segs.push([[-w / 2 + 0.4, 0.027, z], [w / 2 - 0.4, 0.027, z]]);
    }
    return makeSegmentsGeometry(segs);
  }, [w, h, index]);
  return (
    <lineSegments geometry={geom}>
      <lineBasicMaterial ref={innerRef} color="#00f0ff" transparent opacity={0.45} toneMapped={false} />
    </lineSegments>
  );
}

function FloatingSheets({ getProgress }: { getProgress: () => number }) {
  const refs = useRef<(THREE.Group | null)[]>([]);
  const matRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const lineRefs = useRef<(THREE.LineBasicMaterial | null)[]>([]);
  const innerLineRefs = useRef<(THREE.LineBasicMaterial | null)[]>([]);
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const p = getProgress();
    const t = clock.elapsedTime;
    const orbit = mapClamp(p, 0.05, 0.28, 0, 1);
    const fade = 1 - smoothstep(0.18, 0.30, p);
    if (groupRef.current) groupRef.current.visible = fade > 0.01;

    SHEETS.forEach((s, i) => {
      const obj = refs.current[i];
      if (!obj) return;
      const bob = Math.sin(t * 0.6 + i) * 0.18;
      const yaw = Math.sin(t * 0.25 + i * 0.7) * 0.04;
      const rad = 1 - orbit;
      obj.position.set(s.x * rad, s.y + bob + orbit * 5.5, s.z * rad);
      obj.rotation.set(s.rx + yaw + orbit * 0.6, t * 0.06 + i * 0.4 + orbit * Math.PI * 1.2, s.rz + yaw * 0.6 - orbit * 0.4);
      const mat = matRefs.current[i];
      if (mat) mat.opacity = 0.92 * fade;
      const lm = lineRefs.current[i];
      if (lm) lm.opacity = 0.85 * fade;
      const il = innerLineRefs.current[i];
      if (il) il.opacity = 0.45 * fade;
    });
  });

  return (
    <group ref={groupRef}>
      {SHEETS.map((s, i) => (
        <group key={i} ref={(el) => { refs.current[i] = el; }} position={[s.x, s.y, s.z]} rotation={[s.rx, 0, s.rz]}>
          <mesh>
            <boxGeometry args={[s.w, 0.04, s.h]} />
            <meshStandardMaterial
              ref={(el) => { matRefs.current[i] = el; }}
              color="#0a0e16"
              emissive="#062032"
              emissiveIntensity={0.55}
              metalness={0.05}
              roughness={0.9}
              transparent
              opacity={0.92}
            />
          </mesh>
          <SheetEdges w={s.w} h={s.h} lineRef={(el) => { lineRefs.current[i] = el; }} />
          <SheetLines w={s.w} h={s.h} index={i} innerRef={(el) => { innerLineRefs.current[i] = el; }} />
        </group>
      ))}
    </group>
  );
}

function ScanSweep({ getProgress }: { getProgress: () => number }) {
  const ref = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(() => {
    if (!ref.current) return;
    const p = getProgress();
    const phase = mapClamp(p, 0.12, 0.28, 0, 1);
    const op = phase > 0 && phase < 1 ? 1 : 0;
    const z = THREE.MathUtils.lerp(VENUE_BOUNDS.z + 4, -VENUE_BOUNDS.z - 4, phase);
    ref.current.position.set(0, 0.06, z);
    if (matRef.current) matRef.current.opacity = op * 0.85;
  });
  return (
    <mesh ref={ref} rotation-x={-Math.PI / 2}>
      <planeGeometry args={[VENUE_BOUNDS.x * 2 + 4, 0.5]} />
      <meshBasicMaterial
        ref={matRef}
        color="#00f0ff"
        transparent
        opacity={0}
        toneMapped={false}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

function Structure({ data, getProgress, index }: {
  data: typeof STRUCTURES[number];
  getProgress: () => number;
  index: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const edgeRef = useRef<THREE.LineSegments>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const lineMatRef = useRef<THREE.LineBasicMaterial>(null);
  const accentColor = useMemo(() => new THREE.Color(data.accent || "#00f0ff"), [data.accent]);
  const stagger = ((data.x + data.z) % 0.06) + index * 0.005;

  useFrame(() => {
    if (!meshRef.current || !edgeRef.current) return;
    const p = getProgress();
    const start = 0.45 + stagger * 0.5;
    const end = 0.62 + stagger * 0.5;
    const ext = smoothstep(start, end, p);
    const easeExt = 1 - Math.pow(1 - ext, 3);
    const heightScale = Math.max(0.001, easeExt * data.h);

    meshRef.current.scale.set(data.w, heightScale, data.d);
    meshRef.current.position.set(data.x, heightScale / 2, data.z);
    edgeRef.current.scale.set(data.w, heightScale, data.d);
    edgeRef.current.position.set(data.x, heightScale / 2, data.z);

    const scan = smoothstep(0.12, 0.28, p);
    const scanPulse = scan * (1 - smoothstep(0.24, 0.36, p));

    if (matRef.current) {
      matRef.current.opacity = 0.04 + easeExt * 0.92;
      matRef.current.emissiveIntensity = 0.04 + easeExt * 0.18 + scanPulse * 0.4;
    }
    if (lineMatRef.current) {
      lineMatRef.current.opacity = (0.55 + (1 - easeExt) * 0.4) + scanPulse * 0.4;
    }
  });

  return (
    <group>
      <mesh ref={meshRef} geometry={UNIT_BOX_GEOM}>
        <meshStandardMaterial
          ref={matRef}
          color={data.color || "#0a0a14"}
          emissive={accentColor}
          emissiveIntensity={0.06}
          metalness={0.35}
          roughness={0.55}
          transparent
          opacity={0.05}
        />
      </mesh>
      <lineSegments ref={edgeRef} geometry={UNIT_BOX_EDGES}>
        <lineBasicMaterial ref={lineMatRef} color={accentColor} transparent opacity={0.95} toneMapped={false} />
      </lineSegments>
    </group>
  );
}

function FenceOutline({ getProgress }: { getProgress: () => number }) {
  const matRef = useRef<THREE.LineBasicMaterial>(null);
  const fenceGeom = useMemo(() => {
    const { x, z } = VENUE_BOUNDS;
    return makeLineLoopGeometry([[-x, 0.02, -z], [x, 0.02, -z], [x, 0.02, z], [-x, 0.02, z]]);
  }, []);
  useFrame(() => {
    if (!matRef.current) return;
    const p = getProgress();
    matRef.current.opacity = 0.7 - smoothstep(0.55, 0.78, p) * 0.4;
  });
  return (
    <lineSegments geometry={fenceGeom}>
      <lineBasicMaterial ref={matRef} color="#00f0ff" transparent opacity={0.7} toneMapped={false} />
    </lineSegments>
  );
}

function Walkways({ getProgress }: { getProgress: () => number }) {
  const matRef = useRef<THREE.LineBasicMaterial>(null);
  const geom = useMemo(() => {
    const segments: [[number, number, number], [number, number, number]][] = [];
    for (const g of GATES) {
      segments.push([[g.x, 0.04, g.z], [0, 0.04, -13]]);
      segments.push([[g.x, 0.04, g.z], [-17, 0.04, 6]]);
      segments.push([[g.x, 0.04, g.z], [15, 0.04, 14]]);
    }
    return makeSegmentsGeometry(segments);
  }, []);
  useFrame(() => {
    if (!matRef.current) return;
    const p = getProgress();
    matRef.current.opacity = smoothstep(0.12, 0.28, p) * (1 - smoothstep(0.5, 0.66, p)) * 0.6;
  });
  return (
    <lineSegments geometry={geom}>
      <lineBasicMaterial ref={matRef} color="#0a84ff" transparent opacity={0} toneMapped={false} />
    </lineSegments>
  );
}

function StageBeams({ getProgress }: { getProgress: () => number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const p = getProgress();
    const op = smoothstep(0.62, 0.76, p);
    ref.current.children.forEach((c, i) => {
      c.rotation.z = Math.sin(clock.elapsedTime * 0.6 + i) * 0.18;
      if ((c as THREE.Mesh).material) ((c as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = op * 0.16;
    });
  });
  const beams = [
    { x: -5, z: -16, color: "#00f0ff" },
    { x: 0, z: -16, color: "#0a84ff" },
    { x: 5, z: -16, color: "#00f0ff" },
    { x: 17, z: 8, color: "#ffb020" },
  ];
  return (
    <group ref={ref}>
      {beams.map((b, i) => (
        <mesh key={i} position={[b.x, 5, b.z]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[3.2, 9, 24, 1, true]} />
          <meshBasicMaterial
            color={b.color}
            transparent
            opacity={0}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function Hotspots({ getProgress }: { getProgress: () => number }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    const p = getProgress();
    const op = smoothstep(0.72, 0.84, p) * (1 - smoothstep(0.92, 1.0, p));
    refs.current.forEach((m, i) => {
      if (!m) return;
      const pulse = 1 + Math.sin(clock.elapsedTime * 2 + i) * 0.12;
      m.scale.set(pulse, pulse, pulse);
      if (m.material) (m.material as THREE.MeshBasicMaterial).opacity = op * 0.55;
    });
  });
  return (
    <group>
      {HOTSPOTS.map((h, i) => (
        <mesh key={h.label} ref={(el) => { refs.current[i] = el; }} position={[h.x, 0.06, h.z]} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[h.radius * 0.55, h.radius, 48]} />
          <meshBasicMaterial color="#ff3b30" transparent opacity={0} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function OptimizationGlow({ getProgress }: { getProgress: () => number }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    const p = getProgress();
    const op = smoothstep(0.93, 1.0, p);
    refs.current.forEach((m, i) => {
      if (!m) return;
      const pulse = 1 + Math.sin(clock.elapsedTime * 1.4 + i) * 0.08;
      m.scale.set(pulse, pulse, pulse);
      if (m.material) (m.material as THREE.MeshBasicMaterial).opacity = op * 0.45;
    });
  });
  return (
    <group>
      {HOTSPOTS.map((h, i) => (
        <mesh key={h.label + "-opt"} ref={(el) => { refs.current[i] = el; }} position={[h.x, 0.07, h.z]} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[h.radius * 0.4, h.radius * 0.7, 48]} />
          <meshBasicMaterial color="#00ffaa" transparent opacity={0} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function Labels({ getProgress }: { getProgress: () => number }) {
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  useFrame(() => {
    const p = getProgress();
    const fadeIn = smoothstep(0.14, 0.26, p);
    const fadeOut = smoothstep(0.52, 0.68, p);
    const opacity = fadeIn * (1 - fadeOut * 0.55);
    Object.values(refs.current).forEach((el) => {
      if (el) el.style.opacity = String(opacity);
    });
  });
  return (
    <>
      {LABELS.map((l) => (
        <Html key={l.id} position={[l.x, 0.5, l.z]} center distanceFactor={20} style={{ pointerEvents: "none" }}>
          <div
            ref={(el) => { refs.current[l.id] = el; }}
            style={{
              color: l.color,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "10px",
              letterSpacing: "0.32em",
              opacity: 0,
              whiteSpace: "nowrap",
              transition: "opacity 0.3s ease",
              textShadow: `0 0 12px ${l.color}55`,
            }}
          >
            — {l.text}
          </div>
        </Html>
      ))}
    </>
  );
}

function Lighting({ getProgress }: { getProgress: () => number }) {
  const dirRef = useRef<THREE.DirectionalLight>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const stageLightRef = useRef<THREE.PointLight>(null);
  const warmDirRef = useRef<THREE.DirectionalLight>(null);
  useFrame(() => {
    const p = getProgress();
    const venue = smoothstep(0.55, 0.78, p);
    if (dirRef.current) dirRef.current.intensity = 0.04 + venue * 0.42;
    if (ambientRef.current) ambientRef.current.intensity = 0.42 - venue * 0.18;
    if (stageLightRef.current) stageLightRef.current.intensity = venue * 8;
    if (warmDirRef.current) warmDirRef.current.intensity = 0.10 + venue * 0.28;
  });
  return (
    <>
      {/* Cooler ambient — dialed back to let warm lights dominate */}
      <ambientLight ref={ambientRef} intensity={0.42} color="#a4b8d0" />
      {/* Primary overhead — slightly desaturated cold fill */}
      <directionalLight ref={dirRef} position={[10, 30, 10]} intensity={0.04} color="#b0c4e0" />
      {/* Warm key from top-left — desk lamp / window simulation */}
      <directionalLight ref={warmDirRef} position={[-20, 24, 6]} intensity={0.10} color="#e8a050" />
      {/* Stage cyan spotlight */}
      <pointLight ref={stageLightRef} position={[0, 4, -14]} intensity={0} color="#00f0ff" distance={28} decay={1.6} />
      {/* Existing warm fill — boosted slightly */}
      <pointLight position={[17, 3, 8]} intensity={2.6} color="#ffb020" distance={16} decay={2} />
      {/* Counter-warm fill from left — stops the scene from feeling one-sided */}
      <pointLight position={[-15, 5, 10]} intensity={1.6} color="#ff9840" distance={20} decay={2.2} />
    </>
  );
}

export default function FestivalScene({ getProgress }: { getProgress: () => number }) {
  return (
    <>
      <CameraRig getProgress={getProgress} />
      <FogRig getProgress={getProgress} />
      <Lighting getProgress={getProgress} />
      <Workbench />
      <BlueprintPaper getProgress={getProgress} />
      <FloatingSheets getProgress={getProgress} />
      <ScanSweep getProgress={getProgress} />
      <FenceOutline getProgress={getProgress} />
      <Walkways getProgress={getProgress} />
      {STRUCTURES.map((s, i) => (
        <Structure key={s.id} data={s} getProgress={getProgress} index={i} />
      ))}
      <Labels getProgress={getProgress} />
      <StageBeams getProgress={getProgress} />
      <Hotspots getProgress={getProgress} />
      <OptimizationGlow getProgress={getProgress} />
      <CrowdSystem getProgress={getProgress} />
    </>
  );
}
