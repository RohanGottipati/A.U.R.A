'use client';

import * as THREE from 'three';
import { useEffect, useRef, useCallback } from 'react';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { SceneFile, SceneObject, Wall } from '@/types/scene';

interface Props {
  sceneData: SceneFile;
  mode: 'walk' | 'orbit';
}

const OBJECT_COLORS: Record<string, number> = {
  table:        0x8B6914,
  chair:        0x4a7c59,
  stage:        0x2c5282,
  booth:        0x7b2d8b,
  desk:         0x6b8cae,
  podium:       0xd69e2e,
  screen:       0x1a1a2a,
  workstation:  0x4a5568,
  shelf:        0x744210,
  counter:      0x975a16,
  equipment:    0x2d3748,
  divider:      0xe2e8f0,
  plant:        0x276749,
  entrance_marker: 0xe53e3e,
};

function createFloor(width: number, depth: number): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(width, depth);
  const material = new THREE.MeshLambertMaterial({ color: 0x2d2d2d });
  const floor = new THREE.Mesh(geometry, material);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(width / 2, 0, depth / 2);
  floor.receiveShadow = true;
  return floor;
}

function createWall(wall: Wall): THREE.Mesh {
  const dx = wall.x2 - wall.x1;
  const dz = wall.y2 - wall.y1;
  const length = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dz, dx);

  const geometry = new THREE.BoxGeometry(length, wall.height, 0.2);
  const material = new THREE.MeshLambertMaterial({ color: 0x4a4a6a });
  const wallMesh = new THREE.Mesh(geometry, material);

  wallMesh.position.set(
    (wall.x1 + wall.x2) / 2,
    wall.height / 2,
    (wall.y1 + wall.y2) / 2
  );
  wallMesh.rotation.y = -angle;
  wallMesh.castShadow = true;
  wallMesh.receiveShadow = true;
  return wallMesh;
}

function createTextLabel(text: string): CSS2DObject {
  const div = document.createElement('div');
  div.textContent = text;
  div.style.cssText = `
    background: rgba(0,0,0,0.7);
    color: white;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 11px;
    font-family: Inter, sans-serif;
    white-space: nowrap;
    pointer-events: none;
  `;
  return new CSS2DObject(div);
}

function createObject(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();

  let geometry: THREE.BufferGeometry;
  switch (obj.type) {
    case 'plant':
      geometry = new THREE.CylinderGeometry(obj.width / 2, obj.width / 2, obj.height, 8);
      break;
    case 'podium':
      geometry = new THREE.CylinderGeometry(obj.width / 3, obj.width / 2, obj.height, 8);
      break;
    default:
      geometry = new THREE.BoxGeometry(obj.width, obj.height, obj.depth);
  }

  const color = obj.color ? new THREE.Color(obj.color).getHex() : (OBJECT_COLORS[obj.type] ?? 0x718096);
  const material = new THREE.MeshLambertMaterial({ color });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  mesh.position.set(0, obj.height / 2 + obj.z, 0);
  group.position.set(obj.x, 0, obj.y);
  group.rotation.y = (obj.rotation * Math.PI) / 180;
  group.add(mesh);

  const label = createTextLabel(obj.label);
  label.position.set(0, obj.height + 0.3, 0);
  group.add(label);

  return group;
}

export default function ThreeScene({ sceneData, mode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const modeRef = useRef(mode);
  modeRef.current = mode;

  const cleanup = useCallback(() => {}, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0';
    labelRenderer.domElement.style.pointerEvents = 'none';
    container.appendChild(labelRenderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    scene.fog = new THREE.Fog(0x1a1a2e, 20, 80);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(
      sceneData.floorplan.width / 2,
      1.7,
      sceneData.floorplan.depth / 2
    );
    camera.lookAt(sceneData.floorplan.width / 2, 1.7, 0);

    // Floor
    scene.add(createFloor(sceneData.floorplan.width, sceneData.floorplan.depth));

    // Walls
    sceneData.floorplan.walls.forEach(w => scene.add(createWall(w)));

    // Objects
    sceneData.configuration.objects.forEach(obj => scene.add(createObject(obj)));

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 100;
    dirLight.shadow.camera.left = -50;
    dirLight.shadow.camera.right = 50;
    dirLight.shadow.camera.top = 50;
    dirLight.shadow.camera.bottom = -50;
    scene.add(dirLight);

    const pointLight1 = new THREE.PointLight(0x4fc3f7, 0.5, 30);
    pointLight1.position.set(5, 4, 5);
    scene.add(pointLight1);

    // Orbit Controls
    const orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.target.set(sceneData.floorplan.width / 2, 0, sceneData.floorplan.depth / 2);
    orbitControls.maxPolarAngle = Math.PI / 2.1;
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.05;

    // WASD first-person controls
    const keys: Record<string, boolean> = {};
    let yaw = 0;
    let pitch = 0;

    const onKeyDown = (e: KeyboardEvent) => { keys[e.code] = true; };
    const onKeyUp = (e: KeyboardEvent) => { keys[e.code] = false; };
    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === canvas) {
        yaw -= e.movementX * 0.002;
        pitch -= e.movementY * 0.002;
        pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, pitch));
      }
    };
    const onClick = () => {
      if (modeRef.current === 'walk') {
        canvas.requestPointerLock();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('click', onClick);

    function updateFirstPerson() {
      const speed = 0.08;
      const direction = new THREE.Vector3();

      if (keys['KeyW'] || keys['ArrowUp'])    direction.z -= 1;
      if (keys['KeyS'] || keys['ArrowDown'])  direction.z += 1;
      if (keys['KeyA'] || keys['ArrowLeft'])  direction.x -= 1;
      if (keys['KeyD'] || keys['ArrowRight']) direction.x += 1;

      direction.normalize().multiplyScalar(speed);
      direction.applyEuler(new THREE.Euler(0, yaw, 0));

      camera.position.add(direction);
      camera.position.y = 1.7;

      camera.rotation.order = 'YXZ';
      camera.rotation.y = yaw;
      camera.rotation.x = pitch;
    }

    // Resize handler
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      labelRenderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    // Animation loop
    let animationId: number;
    function animate() {
      animationId = requestAnimationFrame(animate);
      if (modeRef.current === 'walk') {
        orbitControls.enabled = false;
        updateFirstPerson();
      } else {
        orbitControls.enabled = true;
        orbitControls.update();
      }
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('click', onClick);
      window.removeEventListener('resize', onResize);
      if (container.contains(labelRenderer.domElement)) {
        container.removeChild(labelRenderer.domElement);
      }
      renderer.dispose();
      cleanup();
    };
  }, [sceneData, cleanup]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}
