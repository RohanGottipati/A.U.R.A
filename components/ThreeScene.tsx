'use client';

import * as THREE from 'three';
import { useEffect, useRef } from 'react';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Room, SceneFile, SceneObject, Wall } from '@/types/scene';
import { buildObjectMesh } from './objectMeshes';

// The right-side sidebar reserves 280px of horizontal space; the canvas must
// not be drawn underneath it.
const SIDEBAR_WIDTH = 280;

const ROOM_TINT_COLORS: Record<string, number> = {
  main_hall: 0x1f2937,
  office:    0x252e3f,
  corridor:  0x1d1d27,
  bathroom:  0x213338,
  storage:   0x2a241c,
  kitchen:   0x2c241c,
  entrance:  0x2c2c38,
  unknown:   0x222230,
};

interface Props {
  sceneData: SceneFile;
  mode: 'walk' | 'orbit';
  objects: SceneObject[];
  selectedId: string | null;
  onSelectObject: (id: string | null) => void;
  onMoveObject: (id: string, x: number, y: number) => void;
  // Mutable ref written to on every frame so the parent can spawn new
  // objects under the user's current focus instead of the floor centre.
  cameraTargetRef?: React.MutableRefObject<{ x: number; z: number } | null>;
  // "Click on the floor to choose your walk-mode starting point" flow.
  placingWalkSpawn?: boolean;
  walkSpawn?: { x: number; z: number } | null;
  onWalkSpawnSelected?: (x: number, z: number) => void;
  // "Click on the floor to choose where to drop a new component" flow.
  placingObject?: boolean;
  onObjectSpawnSelected?: (x: number, z: number) => void;
  // Called once when a drag begins so the parent can snapshot history before moves accumulate.
  onBeforeMove?: () => void;
}

/* -------------------------------------------------------------------------- */
/*  Procedural textures                                                       */
/* -------------------------------------------------------------------------- */

function makeFloorTexture(): THREE.Texture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Wood plank base
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, '#3a3245');
  grad.addColorStop(1, '#2a2434');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Plank seams
  const plankH = 64;
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 1.5;
  for (let y = 0; y <= size; y += plankH) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }

  // Per-plank vertical seam offset (random staggering)
  for (let y = 0; y < size; y += plankH) {
    const offset = (y / plankH) % 2 === 0 ? 0 : size / 2;
    ctx.beginPath();
    ctx.moveTo(offset, y);
    ctx.lineTo(offset, y + plankH);
    ctx.stroke();
  }

  // Subtle wood grain noise
  for (let i = 0; i < 5500; i++) {
    const a = Math.random() * 0.05;
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1);
  }
  for (let i = 0; i < 2200; i++) {
    const a = Math.random() * 0.06;
    ctx.fillStyle = `rgba(0,0,0,${a})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 16;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeWallTexture(): THREE.Texture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#5b5670';
  ctx.fillRect(0, 0, size, size);

  // Subtle plaster speckle
  for (let i = 0; i < 4000; i++) {
    const a = Math.random() * 0.06;
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1);
  }
  for (let i = 0; i < 1500; i++) {
    const a = Math.random() * 0.08;
    ctx.fillStyle = `rgba(0,0,0,${a})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* -------------------------------------------------------------------------- */
/*  Static scene pieces                                                       */
/* -------------------------------------------------------------------------- */

function createFloor(width: number, depth: number): THREE.Group {
  const group = new THREE.Group();

  const tex = makeFloorTexture();
  tex.repeat.set(Math.max(2, width / 2), Math.max(2, depth / 2));

  const geometry = new THREE.PlaneGeometry(width, depth, 1, 1);
  const material = new THREE.MeshStandardMaterial({
    map: tex,
    color: 0xffffff,
    roughness: 0.55,
    metalness: 0.05,
    envMapIntensity: 0.6,
  });
  const floor = new THREE.Mesh(geometry, material);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(width / 2, 0, depth / 2);
  floor.receiveShadow = true;
  group.add(floor);

  // Trim border with a subtle emissive glow
  const borderMat = new THREE.MeshStandardMaterial({
    color: 0x3b82f6,
    emissive: 0x3b82f6,
    emissiveIntensity: 0.4,
    roughness: 0.4,
    metalness: 0.5,
  });
  const trimT = 0.06;
  const trims = [
    { w: width, d: trimT, x: width / 2, z: 0 },
    { w: width, d: trimT, x: width / 2, z: depth },
    { w: trimT, d: depth, x: 0, z: depth / 2 },
    { w: trimT, d: depth, x: width, z: depth / 2 },
  ];
  for (const t of trims) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(t.w, 0.025, t.d), borderMat);
    m.position.set(t.x, 0.013, t.z);
    group.add(m);
  }

  return group;
}

function createRoomFloorOverlays(rooms: Room[]): THREE.Group {
  // Adds a thin tinted floor patch per room above the global wood floor.
  // Uses the room polygon when available (irregular / L-shaped rooms) and
  // otherwise falls back to the bounding rectangle.
  const group = new THREE.Group();
  for (const room of rooms) {
    const color = ROOM_TINT_COLORS[room.type] ?? ROOM_TINT_COLORS.unknown;
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.85,
      metalness: 0.0,
      transparent: true,
      opacity: 0.45,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    let mesh: THREE.Mesh;
    if (room.polygon && room.polygon.length >= 3) {
      const shape = new THREE.Shape();
      shape.moveTo(room.polygon[0].x, room.polygon[0].y);
      for (let i = 1; i < room.polygon.length; i++) {
        shape.lineTo(room.polygon[i].x, room.polygon[i].y);
      }
      shape.closePath();
      const geometry = new THREE.ShapeGeometry(shape);
      mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = 0.012;
    } else {
      const geometry = new THREE.PlaneGeometry(room.width, room.height);
      mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(room.x + room.width / 2, 0.012, room.y + room.height / 2);
    }
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  return group;
}

function createCeiling(width: number, depth: number, height: number): THREE.Group {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0x1a1825,
    roughness: 0.95,
    side: THREE.DoubleSide,
  });
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(width / 2, height, depth / 2);
  group.add(ceiling);

  // Recessed ceiling lights (instanced — single draw call, no shadows).
  const lightMat = new THREE.MeshStandardMaterial({
    color: 0xfff4e0,
    emissive: 0xfff4e0,
    emissiveIntensity: 1.2,
    roughness: 0.4,
  });
  const cellW = 4;
  const cellD = 4;
  const cols = Math.max(1, Math.floor(width / cellW));
  const rows = Math.max(1, Math.floor(depth / cellD));
  const startX = (width - (cols - 1) * cellW) / 2;
  const startZ = (depth - (rows - 1) * cellD) / 2;
  const panelGeo = new THREE.BoxGeometry(0.8, 0.05, 0.8);
  const inst = new THREE.InstancedMesh(panelGeo, lightMat, cols * rows);
  inst.castShadow = false;
  inst.receiveShadow = false;
  const m = new THREE.Matrix4();
  let idx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      m.makeTranslation(startX + c * cellW, height - 0.025, startZ + r * cellD);
      inst.setMatrixAt(idx++, m);
    }
  }
  inst.instanceMatrix.needsUpdate = true;
  group.add(inst);

  return group;
}

function createWallShared(wall: Wall, material: THREE.Material): THREE.Mesh {
  const dx = wall.x2 - wall.x1;
  const dz = wall.y2 - wall.y1;
  const length = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dz, dx);

  const geometry = new THREE.BoxGeometry(length, wall.height, 0.18);
  const wallMesh = new THREE.Mesh(geometry, material);

  wallMesh.position.set(
    (wall.x1 + wall.x2) / 2,
    wall.height / 2,
    (wall.y1 + wall.y2) / 2,
  );
  wallMesh.rotation.y = -angle;
  // Walls only receive shadows — they shouldn't cast shadows on each other.
  wallMesh.receiveShadow = true;
  return wallMesh;
}

/* -------------------------------------------------------------------------- */
/*  Main component                                                            */
/* -------------------------------------------------------------------------- */

export default function ThreeScene({
  sceneData,
  mode,
  objects,
  selectedId,
  onSelectObject,
  onMoveObject,
  cameraTargetRef,
  placingWalkSpawn = false,
  walkSpawn = null,
  onWalkSpawnSelected,
  placingObject = false,
  onObjectSpawnSelected,
  onBeforeMove,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mode is read live from a ref so we don't tear down the scene on toggle.
  const modeRef = useRef(mode);
  modeRef.current = mode;

  // Allow imperative reset of camera placements when mode changes (without
  // rebuilding the entire scene).
  const orbitControlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const yawRef = useRef(0);
  const pitchRef = useRef(0);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const meshMap = useRef<Map<string, THREE.Group>>(new Map());
  const selectedHelper = useRef<THREE.BoxHelper | null>(null);
  const isDragging = useRef(false);
  const dragObjectId = useRef<string | null>(null);
  const floorPlaneRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const dragPoint = useRef(new THREE.Vector3());
  const dragRaycaster = useRef(new THREE.Raycaster());
  const dragMouse = useRef(new THREE.Vector2());

  // Live mirrors for the walk-spawn placement flow so the build-once setup
  // effect can read the latest values without re-mounting.
  const placingWalkSpawnRef = useRef(placingWalkSpawn);
  placingWalkSpawnRef.current = placingWalkSpawn;
  const onWalkSpawnSelectedRef = useRef(onWalkSpawnSelected);
  onWalkSpawnSelectedRef.current = onWalkSpawnSelected;
  const placingObjectRef = useRef(placingObject);
  placingObjectRef.current = placingObject;
  const onObjectSpawnSelectedRef = useRef(onObjectSpawnSelected);
  onObjectSpawnSelectedRef.current = onObjectSpawnSelected;
  const onBeforeMoveRef = useRef(onBeforeMove);
  onBeforeMoveRef.current = onBeforeMove;
  // Persist the last position the user was at when leaving walk mode so we
  // can return them there next time.
  const lastWalkPosRef = useRef<
    { x: number; z: number; yaw: number; pitch: number } | null
  >(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    /* ---------------- Renderer ---------------- */
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    const canvasWidth = () => Math.max(1, window.innerWidth - SIDEBAR_WIDTH);
    renderer.setSize(canvasWidth(), window.innerHeight);
    // Cap DPR at 1.5 — biggest single perf win on retina screens.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false; // we'll trigger one shadow update on mount
    renderer.shadowMap.needsUpdate = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    /* ---------------- Scene ---------------- */
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0c0d18);
    scene.fog = new THREE.Fog(0x0c0d18, 30, 110);

    // PMREM-based image-based lighting from the procedural Room
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const roomEnv = new RoomEnvironment();
    const envMap = pmrem.fromScene(roomEnv, 0.04).texture;
    scene.environment = envMap;

    const fpw = sceneData.floorplan.width;
    const fpd = sceneData.floorplan.depth;

    /* ---------------- Camera ---------------- */
    const camera = new THREE.PerspectiveCamera(
      68,
      canvasWidth() / window.innerHeight,
      0.05,
      400,
    );
    cameraRef.current = camera;
    camera.position.set(fpw / 2, 1.7, fpd / 2);
    camera.lookAt(fpw / 2, 1.7, 0);

    /* ---------------- Static geometry ---------------- */
    scene.add(createFloor(fpw, fpd));
    scene.add(createRoomFloorOverlays(sceneData.floorplan.rooms));

    const maxWallHeight = sceneData.floorplan.walls.reduce(
      (m, w) => Math.max(m, w.height),
      3,
    );
    const ceilingY = maxWallHeight + 0.5;
    const ceilingGroup = createCeiling(fpw, fpd, ceilingY);
    scene.add(ceilingGroup);

    // Single shared wall texture (cloning per-wall causes one upload per wall).
    const wallTex = makeWallTexture();
    wallTex.repeat.set(2, 1.5);
    const sharedWallMaterial = new THREE.MeshStandardMaterial({
      map: wallTex,
      color: 0xffffff,
      roughness: 0.85,
      metalness: 0.05,
    });
    const wallsGroup = new THREE.Group();
    sceneData.floorplan.walls.forEach((w) =>
      wallsGroup.add(createWallShared(w, sharedWallMaterial)),
    );
    scene.add(wallsGroup);

    // Seed initial objects into meshMap (reactive effect handles subsequent updates)
    objects.forEach((obj) => {
      const group = buildObjectMesh(obj);
      group.userData.objectId = obj.id;
      group.userData.objSize = { w: obj.width, d: obj.depth, h: obj.height };
      scene.add(group);
      meshMap.current.set(obj.id, group);
    });

    /* ---------------- Lighting (kept lean for perf) ---------------- */
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));

    const hemi = new THREE.HemisphereLight(0xc6d4ff, 0x1a1820, 0.7);
    hemi.position.set(fpw / 2, ceilingY, fpd / 2);
    scene.add(hemi);

    const dirLight = new THREE.DirectionalLight(0xfff1d6, 0.95);
    dirLight.position.set(fpw * 0.65, Math.max(fpw, fpd) * 1.1, fpd * 0.35);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(1024, 1024);
    const shadowExtent = Math.max(fpw, fpd);
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = shadowExtent * 3;
    dirLight.shadow.camera.left = -shadowExtent;
    dirLight.shadow.camera.right = shadowExtent;
    dirLight.shadow.camera.top = shadowExtent;
    dirLight.shadow.camera.bottom = -shadowExtent;
    dirLight.shadow.bias = -0.0004;
    scene.add(dirLight);

    // Two soft accent lights only (no shadows). The ceiling-panel grid of point
    // lights was removed because it spiked GPU cost without much visual gain
    // alongside IBL + directional + ambient.
    const accentA = new THREE.PointLight(0x60a5fa, 0.6, Math.max(fpw, fpd) * 0.9);
    accentA.position.set(fpw * 0.15, ceilingY * 0.9, fpd * 0.15);
    scene.add(accentA);
    const accentB = new THREE.PointLight(0xf472b6, 0.5, Math.max(fpw, fpd) * 0.9);
    accentB.position.set(fpw * 0.85, ceilingY * 0.9, fpd * 0.85);
    scene.add(accentB);

    /* ---------------- Orbit controls ---------------- */
    const orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControlsRef.current = orbitControls;
    orbitControls.target.set(fpw / 2, 0, fpd / 2);
    // Allow looking nearly straight down for a true top-down overview, while
    // still preventing flipping past the horizon.
    orbitControls.maxPolarAngle = Math.PI * 0.495;
    orbitControls.minPolarAngle = 0.05;
    orbitControls.minDistance = 2;
    orbitControls.maxDistance = Math.max(fpw, fpd) * 4;
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.08;
    orbitControls.zoomSpeed = 0.9;
    orbitControls.rotateSpeed = 0.85;
    orbitControls.panSpeed = 0.8;
    orbitControls.screenSpacePanning = true;

    const setOrbitOverview = () => {
      // Frame the entire floor-plan footprint in the viewport, regardless of
      // its aspect ratio. The camera is positioned high and pulled back along
      // a fixed isometric-ish direction so the user sees the whole space.
      const fovRad = (camera.fov * Math.PI) / 180;
      const aspect = camera.aspect;
      // Distance needed to fit the largest dimension of the floor.
      const halfW = fpw / 2;
      const halfD = fpd / 2;
      const halfMaxFromVertical = Math.max(halfD, halfW / aspect);
      // Add 25% padding so the floor isn't flush against the viewport edges.
      const distance = (halfMaxFromVertical / Math.tan(fovRad / 2)) * 1.25;

      // Look from a 45-degree-ish elevation angle so we can see object heights
      // while still capturing the full floor.
      const elevation = Math.PI * 0.32; // ~58 degrees from horizontal
      const azimuth = Math.PI * 0.25;   // 45 degrees around the room

      const cx = fpw / 2;
      const cz = fpd / 2;
      camera.position.set(
        cx + Math.cos(azimuth) * distance * Math.cos(elevation),
        Math.sin(elevation) * distance,
        cz + Math.sin(azimuth) * distance * Math.cos(elevation),
      );
      orbitControls.target.set(cx, 0, cz);
      orbitControls.update();
    };

    const applyModeVisibility = (m: 'walk' | 'orbit') => {
      // The ceiling (and its emissive light panels) would otherwise sit
      // between the orbit camera and the room when looking from above. Hide
      // it entirely in orbit mode so the user sees the floor plan clearly.
      ceilingGroup.visible = m === 'walk';
      // Make walls cull from the back side (their inside face) so they don't
      // block the orbit view of the rooms inside.
      wallsGroup.traverse((c) => {
        if (c instanceof THREE.Mesh) {
          const wallMat = c.material as THREE.MeshStandardMaterial;
          wallMat.side = m === 'walk' ? THREE.DoubleSide : THREE.BackSide;
          wallMat.needsUpdate = true;
        }
      });
    };

    if (mode === 'orbit') {
      setOrbitOverview();
      orbitControls.enabled = true;
      applyModeVisibility('orbit');
    } else {
      orbitControls.enabled = false;
      applyModeVisibility('walk');
    }

    /* ---------------- Walk (first-person) controls ---------------- */
    const keys: Record<string, boolean> = {};
    yawRef.current = 0;
    pitchRef.current = 0;

    // Velocity & damping for smooth movement
    const velocity = new THREE.Vector3();
    const target = new THREE.Vector3();

    const onKeyDown = (e: KeyboardEvent) => {
      keys[e.code] = true;
      if (modeRef.current === 'walk') e.preventDefault();
    };
    const onKeyUp = (e: KeyboardEvent) => { keys[e.code] = false; };

    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === canvas && modeRef.current === 'walk') {
        yawRef.current -= e.movementX * 0.0022;
        pitchRef.current -= e.movementY * 0.0022;
        pitchRef.current = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, pitchRef.current));
      }
    };

    const onCanvasClick = () => {
      if (modeRef.current === 'walk' && document.pointerLockElement !== canvas) {
        canvas.requestPointerLock();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('click', onCanvasClick);

    /* ---------------- Click-to-select + Drag-to-move ---------------- */
    const clickRaycaster = new THREE.Raycaster();
    const clickMouse = new THREE.Vector2();

    /* ---------------- Walk-spawn placement marker ----------------- */
    const placementMarker = new THREE.Group();
    placementMarker.visible = false;
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ringMesh = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 64), ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 0.03;
    placementMarker.add(ringMesh);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const innerDisc = new THREE.Mesh(new THREE.CircleGeometry(0.42, 48), innerMat);
    innerDisc.rotation.x = -Math.PI / 2;
    innerDisc.position.y = 0.025;
    placementMarker.add(innerDisc);
    scene.add(placementMarker);

    const clampToFloor = (px: number, pz: number) => {
      const pad = 0.5;
      return {
        x: Math.max(pad, Math.min(fpw - pad, px)),
        z: Math.max(pad, Math.min(fpd - pad, pz)),
      };
    };

    const onMouseDown = (e: MouseEvent) => {
      if (modeRef.current === 'walk') return;
      const rect = canvas.getBoundingClientRect();
      clickMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      clickMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const cam = cameraRef.current;
      if (!cam) return;
      clickRaycaster.setFromCamera(clickMouse, cam);

      // Walk-spawn placement: ignore objects, snap to floor and fire callback.
      if (placingWalkSpawnRef.current) {
        const hit = new THREE.Vector3();
        if (clickRaycaster.ray.intersectPlane(floorPlaneRef.current, hit)) {
          const { x, z } = clampToFloor(hit.x, hit.z);
          onWalkSpawnSelectedRef.current?.(x, z);
        }
        return;
      }

      // Object placement: same idea — snap to floor, fire callback.
      if (placingObjectRef.current) {
        const hit = new THREE.Vector3();
        if (clickRaycaster.ray.intersectPlane(floorPlaneRef.current, hit)) {
          const { x, z } = clampToFloor(hit.x, hit.z);
          onObjectSpawnSelectedRef.current?.(x, z);
        }
        return;
      }

      const allGroups = Array.from(meshMap.current.values());
      const intersects = clickRaycaster.intersectObjects(allGroups, true);

      if (intersects.length > 0) {
        let node: THREE.Object3D | null = intersects[0].object;
        while (node && !node.userData.objectId) {
          node = node.parent;
        }
        const hitId = node?.userData.objectId as string | undefined;
        if (hitId) {
          onBeforeMoveRef.current?.(); // snapshot history ONCE before drag accumulates moves
          onSelectObject(hitId);
          isDragging.current = true;
          dragObjectId.current = hitId;
          if (orbitControlsRef.current) orbitControlsRef.current.enabled = false;
        }
      } else {
        onSelectObject(null);
      }
    };

    const onMouseMoveDrag = (e: MouseEvent) => {
      // Update the placement marker as the cursor moves over the floor.
      if (
        (placingWalkSpawnRef.current || placingObjectRef.current) &&
        modeRef.current !== 'walk'
      ) {
        const cam = cameraRef.current;
        if (cam) {
          const rect = canvas.getBoundingClientRect();
          dragMouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          dragMouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
          dragRaycaster.current.setFromCamera(dragMouse.current, cam);
          const hit = new THREE.Vector3();
          if (
            dragRaycaster.current.ray.intersectPlane(floorPlaneRef.current, hit)
          ) {
            const { x, z } = clampToFloor(hit.x, hit.z);
            placementMarker.position.set(x, 0, z);
            placementMarker.visible = true;
          } else {
            placementMarker.visible = false;
          }
        }
      } else if (placementMarker.visible) {
        placementMarker.visible = false;
      }

      if (!isDragging.current || !dragObjectId.current) return;
      const cam = cameraRef.current;
      if (!cam) return;

      const rect = canvas.getBoundingClientRect();
      dragMouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      dragMouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      dragRaycaster.current.setFromCamera(dragMouse.current, cam);
      if (dragRaycaster.current.ray.intersectPlane(floorPlaneRef.current, dragPoint.current)) {
        onMoveObject(dragObjectId.current, dragPoint.current.x, dragPoint.current.z);
      }
    };

    const onMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        dragObjectId.current = null;
        if (orbitControlsRef.current) orbitControlsRef.current.enabled = true;
      }
    };

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMoveDrag);
    window.addEventListener('mouseup', onMouseUp);

    const enterWalkMode = () => {
      const pos = lastWalkPosRef.current;
      if (pos) {
        camera.position.set(pos.x, 1.7, pos.z);
        yawRef.current = pos.yaw;
        pitchRef.current = pos.pitch;
      } else {
        camera.position.set(fpw / 2, 1.7, fpd / 2);
        yawRef.current = 0;
        pitchRef.current = 0;
      }
      camera.rotation.order = 'YXZ';
      camera.rotation.set(pitchRef.current, yawRef.current, 0);
      velocity.set(0, 0, 0);
      orbitControls.enabled = false;
      applyModeVisibility('walk');
      renderer.shadowMap.needsUpdate = true;
    };

    const enterOrbitMode = () => {
      // Save walk pose so re-entering walk feels continuous
      lastWalkPosRef.current = {
        x: camera.position.x,
        z: camera.position.z,
        yaw: yawRef.current,
        pitch: pitchRef.current,
      };
      if (document.pointerLockElement === canvas) document.exitPointerLock();
      setOrbitOverview();
      orbitControls.enabled = true;
      applyModeVisibility('orbit');
      renderer.shadowMap.needsUpdate = true;
    };

    // Shadow map only needs to render once because nothing in the scene moves.
    renderer.shadowMap.needsUpdate = true;

    /* ---------------- Animate ---------------- */
    const clock = new THREE.Clock();
    let prevMode = mode;
    let animationId = 0;

    function updateFirstPerson(dt: number) {
      if (isDragging.current) return;
      const wantSprint = keys['ShiftLeft'] || keys['ShiftRight'];
      const baseSpeed = wantSprint ? 7.5 : 3.6; // m/s
      target.set(0, 0, 0);
      if (keys['KeyW'] || keys['ArrowUp'])    target.z -= 1;
      if (keys['KeyS'] || keys['ArrowDown'])  target.z += 1;
      if (keys['KeyA'] || keys['ArrowLeft'])  target.x -= 1;
      if (keys['KeyD'] || keys['ArrowRight']) target.x += 1;
      if (target.lengthSq() > 0) target.normalize();
      target.multiplyScalar(baseSpeed);
      target.applyEuler(new THREE.Euler(0, yawRef.current, 0));

      // Critically-damped lerp toward target velocity (frame-rate independent)
      const accelTime = 0.12; // seconds to reach ~63% of target
      const t = 1 - Math.exp(-dt / accelTime);
      velocity.x += (target.x - velocity.x) * t;
      velocity.z += (target.z - velocity.z) * t;

      camera.position.x += velocity.x * dt;
      camera.position.z += velocity.z * dt;
      camera.position.y = 1.7;

      const pad = 0.45;
      camera.position.x = Math.max(pad, Math.min(fpw - pad, camera.position.x));
      camera.position.z = Math.max(pad, Math.min(fpd - pad, camera.position.z));

      camera.rotation.order = 'YXZ';
      camera.rotation.y = yawRef.current;
      camera.rotation.x = pitchRef.current;
      camera.rotation.z = 0;
    }

    function animate() {
      animationId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const m = modeRef.current;

      if (m !== prevMode) {
        if (m === 'walk') enterWalkMode();
        else enterOrbitMode();
        prevMode = m;
      }

      if (m === 'walk') {
        updateFirstPerson(dt);
      } else {
        orbitControls.update();
      }

      if (cameraTargetRef) {
        cameraTargetRef.current = {
          x: orbitControls.target.x,
          z: orbitControls.target.z,
        };
      }

      renderer.render(scene, camera);
    }
    animate();

    /* ---------------- Resize ---------------- */
    const onResize = () => {
      const w = canvasWidth();
      camera.aspect = w / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(w, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    /* ---------------- Cleanup ---------------- */
    return () => {
      cancelAnimationFrame(animationId);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('click', onCanvasClick);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMoveDrag);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('resize', onResize);
      if (document.pointerLockElement === canvas) document.exitPointerLock();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          const mat = obj.material;
          if (Array.isArray(mat)) {
            mat.forEach((mm) => {
              const anyMat = mm as THREE.MeshStandardMaterial;
              if (anyMat.map) anyMat.map.dispose();
              mm.dispose();
            });
          } else {
            const anyMat = mat as THREE.MeshStandardMaterial;
            if (anyMat.map) anyMat.map.dispose();
            mat.dispose();
          }
        }
      });
      pmrem.dispose();
      orbitControls.dispose();
      renderer.dispose();
    };
    // We deliberately exclude `mode` and `objects` from deps; mode is handled via modeRef,
    // objects are seeded here and then managed by the reactive effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneData]);

  /* ---------------- Walk-spawn -> last walk position ---------------- */
  // When the user picks a spawn point in orbit, immediately overwrite the
  // remembered walk-mode position so enterWalkMode() teleports them there
  // on the next mode flip.
  useEffect(() => {
    if (walkSpawn) {
      lastWalkPosRef.current = {
        x: walkSpawn.x,
        z: walkSpawn.z,
        yaw: 0,
        pitch: 0,
      };
    }
  }, [walkSpawn]);

  /* ---------------- Cursor + selection lockout while placing ---------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.style.cursor = placingWalkSpawn || placingObject ? 'crosshair' : '';
    return () => {
      canvas.style.cursor = '';
    };
  }, [placingWalkSpawn, placingObject]);

  /* ---------------- Reactive objects sync ---------------- */
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const currentIds = new Set(objects.map(o => o.id));

    // Remove meshes for deleted objects
    meshMap.current.forEach((group, id) => {
      if (!currentIds.has(id)) {
        scene.remove(group);
        group.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            (child as THREE.Mesh).geometry.dispose();
          }
        });
        meshMap.current.delete(id);
      }
    });

    // Add or update meshes
    objects.forEach((obj) => {
      if (meshMap.current.has(obj.id)) {
        const group = meshMap.current.get(obj.id)!;
        const prev = group.userData.objSize as { w: number; d: number; h: number } | undefined;
        if (!prev || prev.w !== obj.width || prev.d !== obj.depth || prev.h !== obj.height) {
          // Rebuild mesh for size changes
          scene.remove(group);
          group.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) (child as THREE.Mesh).geometry.dispose();
          });
          const newGroup = buildObjectMesh(obj);
          newGroup.userData.objectId = obj.id;
          newGroup.userData.objSize = { w: obj.width, d: obj.depth, h: obj.height };
          scene.add(newGroup);
          meshMap.current.set(obj.id, newGroup);
        } else {
          // Just update transform (buildObjectMesh sets position from obj.x/y)
          group.position.set(obj.x, 0, obj.y);
          group.rotation.y = (obj.rotation * Math.PI) / 180;
        }
      } else {
        // New object
        const group = buildObjectMesh(obj);
        group.userData.objectId = obj.id;
        group.userData.objSize = { w: obj.width, d: obj.depth, h: obj.height };
        scene.add(group);
        meshMap.current.set(obj.id, group);
      }
    });
  }, [objects]);

  /* ---------------- Selection highlight ---------------- */
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (selectedHelper.current) {
      scene.remove(selectedHelper.current);
      selectedHelper.current = null;
    }

    if (selectedId) {
      const group = meshMap.current.get(selectedId);
      if (group) {
        const helper = new THREE.BoxHelper(group, 0x00d4ff);
        scene.add(helper);
        selectedHelper.current = helper;
      }
    }
  }, [selectedId, objects]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}
