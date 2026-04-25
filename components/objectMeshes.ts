import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { SceneObject, ObjectType } from '@/types/scene';

/* -------------------------------------------------------------------------- */
/*  Palette                                                                    */
/* -------------------------------------------------------------------------- */

export const OBJECT_COLORS: Record<string, number> = {
  table:           0x8B6914,
  chair:           0x4a7c59,
  stage:           0x2c5282,
  booth:           0x7b2d8b,
  desk:            0x6b8cae,
  podium:          0xd69e2e,
  screen:          0x1a1a2a,
  workstation:     0x4a5568,
  shelf:           0x744210,
  counter:         0x975a16,
  equipment:       0x2d3748,
  divider:         0xe2e8f0,
  plant:           0x276749,
  entrance_marker: 0xe53e3e,
  toilet:          0xf3f4f6,
  sink:            0xeef2f6,
  door:            0x6b4423,
  staircase:       0x8a8377,
  bed:             0xe7d8c1,
  kitchen_unit:    0xc7ad8a,
  bathtub:         0xf5f7fa,
};

const ACCENT_COLORS: Record<string, number> = {
  table:           0x6b4f0a,
  chair:           0x2f5a3f,
  stage:           0x1a365d,
  booth:           0x4a1f5a,
  desk:            0x4a6383,
  podium:          0xa67c1a,
  screen:          0x3b82f6,
  workstation:     0x2d3748,
  shelf:           0x5a3210,
  counter:         0x6b3f0c,
  equipment:       0x1a202c,
  divider:         0xa0aec0,
  plant:           0x553311,
  entrance_marker: 0xc53030,
  toilet:          0xb8c1cc,
  sink:            0xb1bcc8,
  door:            0x4a2d18,
  staircase:       0x4b4a47,
  bed:             0x4a3a2a,
  kitchen_unit:    0x6b5236,
  bathtub:         0xb8c1cc,
};

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

interface MatOpts {
  metalness?: number;
  roughness?: number;
  emissive?: number;
  emissiveIntensity?: number;
  envMapIntensity?: number;
  transparent?: boolean;
  opacity?: number;
}

// Material cache — every (color, opts) combination produces a single shared
// MeshStandardMaterial instance. Without this, every chair was creating ~6
// brand-new materials, causing thousands of GPU material switches/uploads.
const _matCache = new Map<string, THREE.MeshStandardMaterial>();

function mat(color: number, opts: MatOpts = {}): THREE.MeshStandardMaterial {
  const metalness = opts.metalness ?? 0.1;
  const roughness = opts.roughness ?? 0.7;
  const emissive = opts.emissive ?? 0x000000;
  const emissiveIntensity = opts.emissiveIntensity ?? 0;
  const envMapIntensity = opts.envMapIntensity ?? 1;
  const transparent = opts.transparent ?? false;
  const opacity = opts.opacity ?? 1;
  const key = `${color}|${metalness}|${roughness}|${emissive}|${emissiveIntensity}|${envMapIntensity}|${transparent}|${opacity}`;
  const cached = _matCache.get(key);
  if (cached) return cached;
  const m = new THREE.MeshStandardMaterial({
    color,
    metalness,
    roughness,
    emissive,
    emissiveIntensity,
    envMapIntensity,
    transparent,
    opacity,
  });
  _matCache.set(key, m);
  return m;
}

// Most decorative details DON'T need to cast shadows; only the main body of
// each object should. This drops shadow-pass mesh count by ~5-10x.
function box(w: number, h: number, d: number, material: THREE.Material, cast = false): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.castShadow = cast;
  m.receiveShadow = true;
  return m;
}

function rbox(w: number, h: number, d: number, r: number, material: THREE.Material, cast = false): THREE.Mesh {
  const radius = Math.min(r, Math.min(w, h, d) * 0.45);
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, radius), material);
  m.castShadow = cast;
  m.receiveShadow = true;
  return m;
}

function cyl(rTop: number, rBot: number, h: number, material: THREE.Material, segments = 12, cast = false): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, segments), material);
  m.castShadow = cast;
  m.receiveShadow = true;
  return m;
}

function sphere(r: number, material: THREE.Material, w = 12, h = 10, cast = false): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, w, h), material);
  m.castShadow = cast;
  m.receiveShadow = true;
  return m;
}

// Mark only the largest mesh of an inner group as a shadow caster. This keeps
// silhouettes/grounding shadows while skipping the cost of N small meshes.
function markBodyAsCaster(group: THREE.Group) {
  let largest: THREE.Mesh | null = null;
  let largestVol = 0;
  group.traverse((c) => {
    if (c instanceof THREE.Mesh) {
      c.castShadow = false;
      // BoxGeometry/RoundedBoxGeometry/CylinderGeometry all have parameters
      const params = (c.geometry as THREE.BufferGeometry & { parameters?: Record<string, number> })
        .parameters;
      let vol = 0;
      if (params) {
        const w = params.width ?? params.radiusTop ?? 0.1;
        const h = params.height ?? 0.1;
        const d = params.depth ?? params.radiusBottom ?? 0.1;
        vol = w * h * d;
      }
      if (vol > largestVol) {
        largestVol = vol;
        largest = c;
      }
    }
  });
  if (largest) (largest as THREE.Mesh).castShadow = true;
}

function getColor(obj: SceneObject, fallback: number): number {
  return obj.color ? new THREE.Color(obj.color).getHex() : fallback;
}

/* -------------------------------------------------------------------------- */
/*  Tables                                                                     */
/* -------------------------------------------------------------------------- */

function buildTable(obj: SceneObject): THREE.Group {
  const g = new THREE.Group();
  const wood = mat(getColor(obj, OBJECT_COLORS.table), { roughness: 0.45, metalness: 0.05 });
  const dark = mat(ACCENT_COLORS.table, { roughness: 0.5 });
  const apronMat = mat(ACCENT_COLORS.table, { roughness: 0.55 });

  const topThickness = 0.06;
  const apronH = 0.1;
  const legSize = 0.07;
  const legHeight = obj.height - topThickness - apronH;

  // Tabletop (rounded edges)
  const top = rbox(obj.width, topThickness, obj.depth, 0.02, wood);
  top.position.y = obj.height - topThickness / 2;
  g.add(top);

  // Apron (under tabletop, rim around legs)
  const inset = 0.12;
  const apronFront = box(obj.width - inset * 2, apronH, 0.04, apronMat);
  apronFront.position.set(0, obj.height - topThickness - apronH / 2, obj.depth / 2 - 0.05);
  g.add(apronFront);
  const apronBack = box(obj.width - inset * 2, apronH, 0.04, apronMat);
  apronBack.position.set(0, obj.height - topThickness - apronH / 2, -obj.depth / 2 + 0.05);
  g.add(apronBack);
  const apronL = box(0.04, apronH, obj.depth - inset * 2, apronMat);
  apronL.position.set(-obj.width / 2 + 0.05, obj.height - topThickness - apronH / 2, 0);
  g.add(apronL);
  const apronR = box(0.04, apronH, obj.depth - inset * 2, apronMat);
  apronR.position.set(obj.width / 2 - 0.05, obj.height - topThickness - apronH / 2, 0);
  g.add(apronR);

  // Tapered legs
  const xOff = obj.width / 2 - legSize;
  const zOff = obj.depth / 2 - legSize;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = cyl(legSize * 0.5, legSize * 0.65, legHeight, dark, 12);
      leg.position.set(sx * xOff, legHeight / 2, sz * zOff);
      g.add(leg);
    }
  }

  return g;
}

/* -------------------------------------------------------------------------- */
/*  Chair                                                                      */
/* -------------------------------------------------------------------------- */

function buildChair(obj: SceneObject): THREE.Group {
  const g = new THREE.Group();
  const fabric = mat(getColor(obj, OBJECT_COLORS.chair), { roughness: 0.85 });
  const dark = mat(ACCENT_COLORS.chair, { roughness: 0.4, metalness: 0.5 });
  const cushion = mat(getColor(obj, OBJECT_COLORS.chair), { roughness: 0.9 });

  const seatThick = 0.08;
  const seatY = obj.height * 0.45;

  // Cushioned seat (rounded box)
  const seat = rbox(obj.width * 0.95, seatThick, obj.depth * 0.95, 0.025, cushion);
  seat.position.y = seatY;
  g.add(seat);

  // Seat skirt
  const skirt = box(obj.width * 0.92, 0.03, obj.depth * 0.92, dark);
  skirt.position.y = seatY - seatThick / 2 - 0.015;
  g.add(skirt);

  // Backrest — slightly curved by combining a rounded panel + lumbar cushion
  const backH = obj.height - seatY - seatThick / 2;
  const backPanel = rbox(obj.width * 0.95, backH, 0.04, 0.03, dark);
  backPanel.position.set(0, seatY + backH / 2, -obj.depth / 2 + 0.04);
  backPanel.rotation.x = -0.06;
  g.add(backPanel);

  const lumbar = rbox(obj.width * 0.85, backH * 0.55, 0.05, 0.04, fabric);
  lumbar.position.set(0, seatY + backH * 0.5, -obj.depth / 2 + 0.08);
  lumbar.rotation.x = -0.06;
  g.add(lumbar);

  // Legs (slim metal)
  const legR = 0.022;
  const legH = seatY - seatThick / 2;
  const xOff = obj.width / 2 - 0.07;
  const zOff = obj.depth / 2 - 0.07;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = cyl(legR, legR, legH, dark, 10);
      leg.position.set(sx * xOff, legH / 2, sz * zOff);
      g.add(leg);
    }
  }
  // Stretcher between legs (front-back)
  for (const sx of [-1, 1]) {
    const stretch = cyl(legR * 0.8, legR * 0.8, obj.depth - 0.14, dark, 8);
    stretch.rotation.x = Math.PI / 2;
    stretch.position.set(sx * xOff, legH * 0.35, 0);
    g.add(stretch);
  }
  return g;
}

/* -------------------------------------------------------------------------- */
/*  Stage                                                                      */
/* -------------------------------------------------------------------------- */

function buildStage(obj: SceneObject): THREE.Group {
  const g = new THREE.Group();
  const m = mat(getColor(obj, OBJECT_COLORS.stage), { roughness: 0.6 });
  const trim = mat(ACCENT_COLORS.stage, { roughness: 0.35, metalness: 0.5 });
  const truss = mat(0x222831, { roughness: 0.3, metalness: 0.7 });
  const bulb = mat(0xfff1c4, {
    emissive: 0xffe7a3,
    emissiveIntensity: 1.5,
    roughness: 0.4,
  });

  // Main platform
  const platform = rbox(obj.width, obj.height, obj.depth, 0.02, m);
  platform.position.y = obj.height / 2;
  g.add(platform);

  // Skirt around the platform
  const skirt = box(obj.width * 1.005, obj.height * 0.4, obj.depth * 1.005, trim);
  skirt.position.y = (obj.height * 0.4) / 2;
  g.add(skirt);

  // Front trim band (LED look)
  const band = mat(0x3b82f6, { emissive: 0x3b82f6, emissiveIntensity: 0.6 });
  const ledFront = box(obj.width, 0.04, 0.02, band);
  ledFront.position.set(0, obj.height * 0.4 + 0.02, obj.depth / 2 + 0.012);
  g.add(ledFront);

  // Steps in front
  const stepCount = 3;
  const stepH = obj.height / (stepCount + 1);
  const stepD = 0.4;
  for (let i = 0; i < stepCount; i++) {
    const sw = obj.width * 0.45;
    const step = box(sw, stepH, stepD, m);
    step.position.set(0, stepH / 2 + i * stepH, obj.depth / 2 + stepD / 2 + i * stepD * 0.5);
    g.add(step);
  }

  // Lighting truss above stage (4 vertical posts + 2 horizontal rails + spotlights)
  const trussY = obj.height + 2.2;
  const postH = 2.4;
  const xPad = obj.width * 0.05;
  const zPad = obj.depth * 0.05;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const post = cyl(0.05, 0.05, postH, truss, 8);
      post.position.set(sx * (obj.width / 2 - xPad), obj.height + postH / 2, sz * (obj.depth / 2 - zPad));
      g.add(post);
    }
  }
  for (const sz of [-1, 1]) {
    const rail = cyl(0.05, 0.05, obj.width - xPad * 2, truss, 8);
    rail.rotation.z = Math.PI / 2;
    rail.position.set(0, trussY, sz * (obj.depth / 2 - zPad));
    g.add(rail);
  }
  for (const sx of [-1, 1]) {
    const rail = cyl(0.05, 0.05, obj.depth - zPad * 2, truss, 8);
    rail.rotation.x = Math.PI / 2;
    rail.position.set(sx * (obj.width / 2 - xPad), trussY, 0);
    g.add(rail);
  }
  // Spotlights along the front rail
  const spotsCount = Math.max(3, Math.floor(obj.width / 1.2));
  for (let i = 0; i < spotsCount; i++) {
    const t = (i + 0.5) / spotsCount;
    const x = -obj.width / 2 + xPad + t * (obj.width - xPad * 2);
    const housing = cyl(0.07, 0.09, 0.18, truss, 10);
    housing.position.set(x, trussY - 0.15, obj.depth / 2 - zPad);
    housing.rotation.x = Math.PI / 2.5;
    g.add(housing);
    const lens = cyl(0.06, 0.06, 0.02, bulb, 10);
    lens.position.set(x, trussY - 0.27, obj.depth / 2 - zPad + 0.05);
    lens.rotation.x = Math.PI / 2.5;
    g.add(lens);
  }

  return g;
}

/* -------------------------------------------------------------------------- */
/*  Booth                                                                      */
/* -------------------------------------------------------------------------- */

function buildBooth(obj: SceneObject): THREE.Group {
  const g = new THREE.Group();
  const fabric = mat(getColor(obj, OBJECT_COLORS.booth), { roughness: 0.8 });
  const frame = mat(ACCENT_COLORS.booth, { roughness: 0.3, metalness: 0.6 });
  const counterTop = mat(0xeeeeee, { roughness: 0.3, metalness: 0.3 });
  const counterBody = mat(0xc8c8d0, { roughness: 0.6 });
  const banner = mat(0x60a5fa, { emissive: 0x3b82f6, emissiveIntensity: 0.5, roughness: 0.5 });
  const accent = mat(0xf1f5f9, { roughness: 0.3 });

  const wallT = 0.06;
  const sideD = obj.depth * 0.7;

  // Back wall
  const back = rbox(obj.width, obj.height, wallT, 0.02, fabric);
  back.position.set(0, obj.height / 2, -obj.depth / 2 + wallT / 2);
  g.add(back);

  // Side walls
  const sideH = obj.height * 0.95;
  for (const sx of [-1, 1]) {
    const side = rbox(wallT, sideH, sideD, 0.02, fabric);
    side.position.set(sx * (obj.width / 2 - wallT / 2), sideH / 2, -obj.depth * 0.15);
    g.add(side);
  }

  // Top frame banner
  const topBar = box(obj.width * 1.02, 0.28, sideD * 1.02, frame);
  topBar.position.set(0, obj.height - 0.14, -obj.depth * 0.15);
  g.add(topBar);
  // Banner front (emissive)
  const bannerFace = box(obj.width * 0.95, 0.22, 0.01, banner);
  bannerFace.position.set(0, obj.height - 0.14, sideD / 2 - obj.depth * 0.15 + 0.012);
  g.add(bannerFace);
  // Banner stripes
  for (let i = 0; i < 4; i++) {
    const stripe = box(obj.width * 0.18, 0.03, 0.011, accent);
    stripe.position.set(-obj.width * 0.4 + i * obj.width * 0.27, obj.height - 0.14, sideD / 2 - obj.depth * 0.15 + 0.018);
    g.add(stripe);
  }

  // Counter at front
  const counterH = obj.height * 0.45;
  const counterBody1 = rbox(obj.width * 0.85, counterH * 0.94, obj.depth * 0.3, 0.02, counterBody);
  counterBody1.position.set(0, counterH / 2, obj.depth / 2 - obj.depth * 0.15);
  g.add(counterBody1);
  const counterTopMesh = rbox(obj.width * 0.88, counterH * 0.06, obj.depth * 0.32, 0.02, counterTop);
  counterTopMesh.position.set(0, counterH - counterH * 0.03, obj.depth / 2 - obj.depth * 0.15);
  g.add(counterTopMesh);

  // Items on counter (brochures/laptops)
  const laptopBase = rbox(0.3, 0.02, 0.22, 0.01, mat(0x222222, { roughness: 0.4, metalness: 0.5 }));
  laptopBase.position.set(-obj.width * 0.2, counterH + 0.012, obj.depth / 2 - obj.depth * 0.15);
  g.add(laptopBase);
  const laptopScreen = rbox(0.3, 0.18, 0.01, 0.005, mat(0x111111, { emissive: 0x60a5fa, emissiveIntensity: 0.6 }));
  laptopScreen.position.set(-obj.width * 0.2, counterH + 0.11, obj.depth / 2 - obj.depth * 0.15 - 0.1);
  laptopScreen.rotation.x = -0.2;
  g.add(laptopScreen);

  const brochure = box(0.18, 0.01, 0.12, mat(0xffffff, { roughness: 0.6 }));
  brochure.position.set(obj.width * 0.18, counterH + 0.008, obj.depth / 2 - obj.depth * 0.15 + 0.04);
  g.add(brochure);

  return g;
}

/* -------------------------------------------------------------------------- */
/*  Desk                                                                       */
/* -------------------------------------------------------------------------- */

function buildDesk(obj: SceneObject): THREE.Group {
  const g = new THREE.Group();
  const top = mat(getColor(obj, OBJECT_COLORS.desk), { roughness: 0.4, metalness: 0.05 });
  const dark = mat(ACCENT_COLORS.desk, { roughness: 0.5, metalness: 0.4 });
  const drawerMat = mat(0x4a5568, { roughness: 0.5 });
  const monitorBezel = mat(0x111111, { roughness: 0.4 });
  const monitorScreen = mat(0x0a0e1a, { emissive: 0x3b82f6, emissiveIntensity: 0.65 });
  const keyboardMat = mat(0x222222, { roughness: 0.5 });
  const mouseMat = mat(0x222222, { roughness: 0.5 });

  // Top
  const tk = 0.05;
  const topMesh = rbox(obj.width, tk, obj.depth, 0.015, top);
  topMesh.position.y = obj.height - tk / 2;
  g.add(topMesh);

  // Drawer pedestal
  const drawerW = obj.width * 0.3;
  const drawerH = obj.height - tk;
  const drawer = rbox(drawerW, drawerH, obj.depth * 0.9, 0.02, drawerMat);
  drawer.position.set(-(obj.width / 2 - drawerW / 2), drawerH / 2, 0);
  g.add(drawer);
  // Drawer faces
  for (let i = 0; i < 3; i++) {
    const dy = drawerH * (0.18 + i * 0.28);
    const face = box(drawerW * 0.92, drawerH * 0.22, 0.005, mat(0x5a6878, { roughness: 0.4 }));
    face.position.set(-(obj.width / 2 - drawerW / 2), dy, obj.depth * 0.45 + 0.003);
    g.add(face);
    // Handle
    const h = cyl(0.012, 0.012, drawerW * 0.4, mat(0xc0c0c8, { metalness: 0.7, roughness: 0.3 }), 8);
    h.rotation.z = Math.PI / 2;
    h.position.set(-(obj.width / 2 - drawerW / 2), dy, obj.depth * 0.45 + 0.012);
    g.add(h);
  }

  // Two legs on the other side
  const legSize = 0.06;
  const legH = obj.height - tk;
  for (const sz of [-1, 1]) {
    const leg = box(legSize, legH, legSize, dark);
    leg.position.set(obj.width / 2 - legSize, legH / 2, sz * (obj.depth / 2 - legSize));
    g.add(leg);
  }

  // Monitor
  const monH = 0.36;
  const monW = Math.min(obj.width * 0.55, 0.65);
  const monStand = cyl(0.04, 0.05, 0.18, dark, 10);
  monStand.position.set(0, obj.height + 0.09, -obj.depth * 0.2);
  g.add(monStand);
  const monBase = cyl(0.12, 0.13, 0.02, dark, 16);
  monBase.position.set(0, obj.height + 0.01, -obj.depth * 0.2);
  g.add(monBase);
  const monBezel = rbox(monW, monH, 0.03, 0.01, monitorBezel);
  monBezel.position.set(0, obj.height + 0.18 + monH / 2, -obj.depth * 0.2);
  g.add(monBezel);
  const monDisplay = box(monW * 0.94, monH * 0.9, 0.005, monitorScreen);
  monDisplay.position.set(0, obj.height + 0.18 + monH / 2, -obj.depth * 0.2 + 0.018);
  g.add(monDisplay);

  // Keyboard
  const kb = rbox(0.46, 0.018, 0.16, 0.005, keyboardMat);
  kb.position.set(obj.width * 0.05, obj.height + 0.012, obj.depth * 0.1);
  g.add(kb);
  // Mouse
  const ms = rbox(0.07, 0.025, 0.12, 0.025, mouseMat);
  ms.position.set(obj.width * 0.32, obj.height + 0.015, obj.depth * 0.12);
  g.add(ms);

  // Coffee cup
  const cupBody = cyl(0.04, 0.035, 0.09, mat(0xf8fafc, { roughness: 0.4 }), 16);
  cupBody.position.set(obj.width * 0.35, obj.height + 0.05, -obj.depth * 0.18);
  g.add(cupBody);
  const cupRim = cyl(0.041, 0.041, 0.005, mat(0xeae6e0), 16);
  cupRim.position.set(obj.width * 0.35, obj.height + 0.097, -obj.depth * 0.18);
  g.add(cupRim);

  return g;
}

/* -------------------------------------------------------------------------- */
/*  Podium                                                                     */
/* -------------------------------------------------------------------------- */

function buildPodium(obj: SceneObject): THREE.Group {
  const g = new THREE.Group();
  const m = mat(getColor(obj, OBJECT_COLORS.podium), { roughness: 0.4 });
  const trim = mat(ACCENT_COLORS.podium, { roughness: 0.3, metalness: 0.5 });
  const black = mat(0x111111, { metalness: 0.7, roughness: 0.3 });

  // Main body — slightly tapered "keystone" using rounded box (with subtle taper handled in cyl alt)
  const body = rbox(obj.width * 0.85, obj.height * 0.92, obj.depth * 0.85, 0.04, m);
  body.position.y = (obj.height * 0.92) / 2;
  g.add(body);

  // Front decorative panel
  const panel = box(obj.width * 0.55, obj.height * 0.5, 0.01, trim);
  panel.position.set(0, obj.height * 0.45, obj.depth * 0.425 + 0.006);
  g.add(panel);

  // Sloped top
  const topGeo = new THREE.BoxGeometry(obj.width * 0.92, 0.06, obj.depth * 0.85);
  const topMesh = new THREE.Mesh(topGeo, trim);
  topMesh.rotation.x = -0.18;
  topMesh.position.y = obj.height + 0.01;
  topMesh.castShadow = true;
  topMesh.receiveShadow = true;
  g.add(topMesh);

  // Reading paper on top
  const paper = box(obj.width * 0.5, 0.005, obj.depth * 0.4, mat(0xffffff, { roughness: 0.6 }));
  paper.rotation.x = -0.18;
  paper.position.set(0, obj.height + 0.05, 0.02);
  g.add(paper);

  // Mic stand & mic
  const stand = cyl(0.018, 0.018, 0.36, black, 8);
  stand.position.set(obj.width * 0.25, obj.height + 0.18, -obj.depth * 0.2);
  stand.rotation.z = -0.2;
  g.add(stand);
  const mic = cyl(0.035, 0.035, 0.07, black, 10);
  mic.position.set(obj.width * 0.25 + 0.04, obj.height + 0.36, -obj.depth * 0.2);
  mic.rotation.z = -0.4;
  g.add(mic);
  const micGrille = sphere(0.04, mat(0x303030, { metalness: 0.5, roughness: 0.4 }));
  micGrille.position.set(obj.width * 0.25 + 0.07, obj.height + 0.4, -obj.depth * 0.2);
  g.add(micGrille);

  // Water glass
  const glassMat = mat(0x88c0ff, { roughness: 0.1, metalness: 0.0, transparent: true, opacity: 0.5 });
  const glass = cyl(0.03, 0.025, 0.09, glassMat, 12);
  glass.position.set(-obj.width * 0.3, obj.height + 0.05, -obj.depth * 0.1);
  g.add(glass);

  return g;
}

/* -------------------------------------------------------------------------- */
/*  Screen / Display                                                           */
/* -------------------------------------------------------------------------- */

function buildScreen(obj: SceneObject): THREE.Group {
  const g = new THREE.Group();
  const frame = mat(0x0a0a0e, { roughness: 0.3, metalness: 0.6 });
  const display = mat(0x0d1a3a, { emissive: 0x3b82f6, emissiveIntensity: 0.7, roughness: 0.15 });
  const stand = mat(0x1f2937, { roughness: 0.5, metalness: 0.4 });
  const bezelGloss = mat(0x1a1a22, { roughness: 0.2, metalness: 0.5 });

  // Stand base
  const baseW = Math.max(obj.width * 0.45, 0.7);
  const base = cyl(baseW * 0.5, baseW * 0.55, 0.05, stand, 32);
  base.position.y = 0.025;
  g.add(base);

  // Pole
  const pole = cyl(0.06, 0.06, obj.height * 0.4, stand, 12);
  pole.position.y = obj.height * 0.2 + 0.05;
  g.add(pole);

  // Frame — rounded
  const frameH = obj.height * 0.55;
  const frameY = obj.height * 0.4 + frameH / 2 + 0.05;
  const f = rbox(obj.width, frameH, 0.06, 0.02, frame);
  f.position.y = frameY;
  g.add(f);

  // Inner gloss bezel
  const bezelInner = rbox(obj.width * 0.97, frameH * 0.95, 0.04, 0.015, bezelGloss);
  bezelInner.position.set(0, frameY, 0.011);
  g.add(bezelInner);

  // Display surface
  const screenInner = box(obj.width * 0.93, frameH * 0.88, 0.02, display);
  screenInner.position.set(0, frameY, 0.04);
  g.add(screenInner);

  // Faux UI bars on the screen
  const uiBar = mat(0x60a5fa, { emissive: 0x60a5fa, emissiveIntensity: 0.7 });
  for (let i = 0; i < 4; i++) {
    const w = obj.width * (0.2 + Math.random() * 0.45);
    const bar = box(w, frameH * 0.04, 0.005, uiBar);
    bar.position.set(-obj.width * 0.3 + w / 2, frameY + frameH * 0.3 - i * frameH * 0.12, 0.052);
    g.add(bar);
  }

  // Brand logo dot
  const logo = mat(0x60a5fa, { emissive: 0x60a5fa, emissiveIntensity: 0.9 });
  const dot = cyl(0.012, 0.012, 0.005, logo, 16);
  dot.rotation.x = Math.PI / 2;
  dot.position.set(0, frameY - frameH / 2 - 0.02, 0.04);
  g.add(dot);

  return g;
}

/* -------------------------------------------------------------------------- */
/*  Workstation                                                                */
/* -------------------------------------------------------------------------- */

function buildWorkstation(obj: SceneObject): THREE.Group {
  const g = new THREE.Group();
  const body = mat(getColor(obj, OBJECT_COLORS.workstation), { roughness: 0.5, metalness: 0.5 });
  const top = mat(0x6b7280, { roughness: 0.4, metalness: 0.6 });
  const orange = mat(0xed8936, { emissive: 0xed8936, emissiveIntensity: 0.4 });
  const green = mat(0x10b981, { emissive: 0x10b981, emissiveIntensity: 0.5 });
  const dark = mat(0x111418, { roughness: 0.4, metalness: 0.5 });

  // Heavy base / cabinet
  const baseH = obj.height * 0.6;
  const base = rbox(obj.width, baseH, obj.depth, 0.03, body);
  base.position.y = baseH / 2;
  g.add(base);

  // Worktop
  const tk = 0.06;
  const topMesh = rbox(obj.width * 1.05, tk, obj.depth * 1.05, 0.02, top);
  topMesh.position.y = baseH + tk / 2;
  g.add(topMesh);

  // Tool rack at back
  const rackH = obj.height - baseH - tk;
  const rack = box(obj.width * 0.95, rackH, 0.08, body);
  rack.position.set(0, baseH + tk + rackH / 2, -obj.depth / 2 + 0.05);
  g.add(rack);

  // Tools hanging on rack
  for (let i = 0; i < 5; i++) {
    const tw = 0.04 + Math.random() * 0.04;
    const tool = box(tw, rackH * 0.7, 0.02, dark);
    tool.position.set(-obj.width * 0.4 + i * (obj.width * 0.18), baseH + tk + rackH * 0.5, -obj.depth / 2 + 0.11);
    g.add(tool);
  }

  // Indicator lights
  for (let i = 0; i < 3; i++) {
    const light = i === 1 ? orange : green;
    const l = cyl(0.04, 0.04, 0.025, light, 8);
    l.rotation.x = Math.PI / 2;
    l.position.set((-obj.width / 3) + i * (obj.width / 3), baseH + tk + 0.06, -obj.depth / 2 + 0.105);
    g.add(l);
  }

  // Tool box on top
  const toolbox = rbox(obj.width * 0.3, 0.18, obj.depth * 0.35, 0.02, mat(0xb91c1c, { roughness: 0.5 }));
  toolbox.position.set(obj.width * 0.25, baseH + tk + 0.09, obj.depth * 0.1);
  g.add(toolbox);

  // Wrench on top
  const wrench = box(0.04, 0.025, 0.3, mat(0xc7c7c7, { metalness: 0.7, roughness: 0.3 }));
  wrench.position.set(-obj.width * 0.2, baseH + tk + 0.013, obj.depth * 0.1);
  wrench.rotation.y = 0.4;
  g.add(wrench);

  return g;
}

/* -------------------------------------------------------------------------- */
/*  Shelf                                                                      */
/* -------------------------------------------------------------------------- */

function buildShelf(obj: SceneObject): THREE.Group {
  const g = new THREE.Group();
  const frame = mat(getColor(obj, OBJECT_COLORS.shelf), { roughness: 0.6 });
  const shelfMat = mat(ACCENT_COLORS.shelf, { roughness: 0.55 });
  const back = mat(0x3a2a1a, { roughness: 0.85 });

  const postT = 0.06;
  // Back panel
  const backPanel = box(obj.width - postT, obj.height, 0.02, back);
  backPanel.position.set(0, obj.height / 2, -obj.depth / 2 + 0.02);
  g.add(backPanel);

  // Vertical posts
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const post = box(postT, obj.height, postT, frame);
      post.position.set(sx * (obj.width / 2 - postT / 2), obj.height / 2, sz * (obj.depth / 2 - postT / 2));
      g.add(post);
    }
  }

  // Horizontal shelves with detailed items
  const shelfCount = 4;
  const itemMatA = [
    mat(0x3b82f6, { roughness: 0.7 }),
    mat(0xed8936, { roughness: 0.7 }),
    mat(0x10b981, { roughness: 0.7 }),
    mat(0xec4899, { roughness: 0.7 }),
    mat(0xf59e0b, { roughness: 0.7 }),
    mat(0xa855f7, { roughness: 0.7 }),
  ];
  for (let i = 0; i < shelfCount; i++) {
    const y = (i + 0.5) * (obj.height / shelfCount);
    const s = box(obj.width - postT, 0.04, obj.depth - postT * 0.4, shelfMat);
    s.position.y = y;
    g.add(s);

    // Items on shelf — mixed boxes and cylinders
    const slots = 4;
    for (let j = 0; j < slots; j++) {
      const variant = (i + j) % 3;
      const colorMat = itemMatA[(i * slots + j) % itemMatA.length];
      const ix = -obj.width / 2 + (j + 0.5) * ((obj.width - postT * 2) / slots) + postT;
      if (variant === 0) {
        // Box of products
        const itemH = (obj.height / shelfCount) * 0.55;
        const it = rbox(obj.width / slots * 0.7, itemH, obj.depth * 0.55, 0.01, colorMat);
        it.position.set(ix, y + 0.02 + itemH / 2, 0);
        g.add(it);
      } else if (variant === 1) {
        // Stack of small boxes
        for (let k = 0; k < 3; k++) {
          const it = rbox(obj.width / slots * 0.6, 0.08, obj.depth * 0.45, 0.01, colorMat);
          it.position.set(ix, y + 0.02 + 0.04 + k * 0.085, 0);
          g.add(it);
        }
      } else {
        // Cylinder containers
        const r = Math.min(obj.width / slots * 0.27, obj.depth * 0.22);
        const h = (obj.height / shelfCount) * 0.5;
        const c = cyl(r, r, h, colorMat, 16);
        c.position.set(ix, y + 0.02 + h / 2, 0);
        g.add(c);
      }
    }
  }
  return g;
}

/* -------------------------------------------------------------------------- */
/*  Counter                                                                    */
/* -------------------------------------------------------------------------- */

function buildCounter(obj: SceneObject): THREE.Group {
  const g = new THREE.Group();
  const wood = mat(getColor(obj, OBJECT_COLORS.counter), { roughness: 0.5 });
  const top = mat(0x1f2937, { roughness: 0.25, metalness: 0.6 });
  const trim = mat(ACCENT_COLORS.counter, { roughness: 0.5 });

  // Body
  const tk = 0.06;
  const body = rbox(obj.width, obj.height - tk, obj.depth, 0.02, wood);
  body.position.y = (obj.height - tk) / 2;
  g.add(body);

  // Top — slight overhang
  const topMesh = rbox(obj.width * 1.04, tk, obj.depth * 1.06, 0.012, top);
  topMesh.position.y = obj.height - tk / 2;
  g.add(topMesh);

  // Front kickplate
  const kp = box(obj.width, 0.08, 0.04, trim);
  kp.position.set(0, 0.04, obj.depth / 2 + 0.02);
  g.add(kp);

  // Vertical wood paneling on the front
  const panels = 6;
  for (let i = 0; i < panels; i++) {
    const x = -obj.width / 2 + (i + 0.5) * (obj.width / panels);
    const p = box(0.02, obj.height * 0.7, 0.02, mat(ACCENT_COLORS.counter, { roughness: 0.6 }));
    p.position.set(x, obj.height * 0.4, obj.depth / 2 + 0.011);
    g.add(p);
  }

  // Cash register
  const reg = rbox(0.32, 0.14, 0.28, 0.02, mat(0x222222, { roughness: 0.4, metalness: 0.5 }));
  reg.position.set(-obj.width * 0.25, obj.height + 0.07, 0);
  g.add(reg);
  const screen = box(0.28, 0.12, 0.005, mat(0x0a0e1a, { emissive: 0x60a5fa, emissiveIntensity: 0.5 }));
  screen.position.set(-obj.width * 0.25, obj.height + 0.13, 0.14);
  screen.rotation.x = -0.4;
  g.add(screen);

  // Bottle / bowl
  const bowl = cyl(0.1, 0.08, 0.06, mat(0xfafafa, { roughness: 0.4 }), 24);
  bowl.position.set(obj.width * 0.25, obj.height + 0.03, 0);
  g.add(bowl);
  for (let i = 0; i < 5; i++) {
    const fruit = sphere(0.035, mat(i % 2 === 0 ? 0xef4444 : 0xfbbf24, { roughness: 0.6 }), 12, 8);
    const a = (i / 5) * Math.PI * 2;
    fruit.position.set(obj.width * 0.25 + Math.cos(a) * 0.04, obj.height + 0.07, Math.sin(a) * 0.04);
    g.add(fruit);
  }

  return g;
}

/* -------------------------------------------------------------------------- */
/*  Equipment                                                                  */
/* -------------------------------------------------------------------------- */

function buildEquipment(obj: SceneObject): THREE.Group {
  const g = new THREE.Group();
  const body = mat(getColor(obj, OBJECT_COLORS.equipment), { roughness: 0.5, metalness: 0.65 });
  const accent = mat(0xfbbf24, { emissive: 0xfbbf24, emissiveIntensity: 0.4 });
  const panel = mat(0x0f1218, { roughness: 0.3, emissive: 0x3b82f6, emissiveIntensity: 0.55 });
  const pipe = mat(0xb1b5bb, { roughness: 0.3, metalness: 0.85 });
  const knob = mat(0xef4444, { roughness: 0.3 });
  const dark = mat(0x111418, { roughness: 0.4, metalness: 0.5 });

  // Main body
  const main = rbox(obj.width, obj.height * 0.85, obj.depth, 0.03, body);
  main.position.y = (obj.height * 0.85) / 2;
  g.add(main);

  // Top vent
  const vent = rbox(obj.width * 0.7, obj.height * 0.15, obj.depth * 0.7, 0.02, dark);
  vent.position.y = obj.height * 0.85 + (obj.height * 0.15) / 2;
  g.add(vent);

  // Vent grille slots
  for (let i = 0; i < 6; i++) {
    const slot = box(obj.width * 0.6, 0.005, 0.02, body);
    slot.position.y = obj.height * 0.85 + (obj.height * 0.15) - 0.01 - i * (obj.height * 0.15 - 0.02) / 6;
    g.add(slot);
  }

  // Control panel on front
  const cp = rbox(obj.width * 0.55, obj.height * 0.32, 0.04, 0.01, panel);
  cp.position.set(0, obj.height * 0.55, obj.depth / 2 + 0.022);
  g.add(cp);

  // Panel readouts (segments)
  for (let i = 0; i < 4; i++) {
    const seg = box(obj.width * 0.08, 0.025, 0.005, mat(0x60a5fa, { emissive: 0x60a5fa, emissiveIntensity: 1 }));
    seg.position.set(-obj.width * 0.18 + i * obj.width * 0.12, obj.height * 0.62, obj.depth / 2 + 0.045);
    g.add(seg);
  }

  // Knobs
  for (let i = 0; i < 3; i++) {
    const k = cyl(0.03, 0.03, 0.04, knob, 16);
    k.rotation.x = Math.PI / 2;
    k.position.set(-obj.width * 0.18 + i * obj.width * 0.18, obj.height * 0.46, obj.depth / 2 + 0.045);
    g.add(k);
  }

  // Side pipes
  for (const sx of [-1, 1]) {
    const p1 = cyl(0.04, 0.04, obj.height * 0.7, pipe, 14);
    p1.position.set(sx * (obj.width / 2 + 0.02), obj.height * 0.4, -obj.depth * 0.3);
    g.add(p1);
    // Elbow
    const elbow = sphere(0.05, pipe, 12, 8);
    elbow.position.set(sx * (obj.width / 2 + 0.02), obj.height * 0.05, -obj.depth * 0.3);
    g.add(elbow);
  }

  // Warning stripe
  const stripe = box(obj.width, 0.04, 0.04, accent);
  stripe.position.set(0, obj.height * 0.18, obj.depth / 2 + 0.022);
  g.add(stripe);

  // Brand badge
  const badge = box(obj.width * 0.15, 0.04, 0.005, mat(0xc0c0c0, { metalness: 0.7, roughness: 0.3 }));
  badge.position.set(0, obj.height * 0.78, obj.depth / 2 + 0.022);
  g.add(badge);

  return g;
}

/* -------------------------------------------------------------------------- */
/*  Divider                                                                    */
/* -------------------------------------------------------------------------- */

function buildDivider(obj: SceneObject): THREE.Group {
  const g = new THREE.Group();
  const m = mat(getColor(obj, OBJECT_COLORS.divider), { roughness: 0.7 });
  const foot = mat(0x4a5568, { roughness: 0.4, metalness: 0.5 });
  const trim = mat(0x94a3b8, { roughness: 0.4 });

  const panel = rbox(obj.width, obj.height - 0.05, obj.depth, 0.02, m);
  panel.position.y = (obj.height - 0.05) / 2 + 0.05;
  g.add(panel);

  // Decorative grid lines (frosted-glass look)
  for (let i = 1; i < 4; i++) {
    const ln = box(obj.width * 0.95, 0.01, obj.depth + 0.005, trim);
    ln.position.set(0, obj.height * (i / 4), 0);
    g.add(ln);
  }

  // Two feet
  for (const sx of [-1, 1]) {
    const f = rbox(obj.width * 0.18, 0.05, 0.4, 0.015, foot);
    f.position.set(sx * (obj.width / 2 - obj.width * 0.09), 0.025, 0);
    g.add(f);
  }
  return g;
}

/* -------------------------------------------------------------------------- */
/*  Plant                                                                      */
/* -------------------------------------------------------------------------- */

function buildPlant(obj: SceneObject): THREE.Group {
  const g = new THREE.Group();
  const pot = mat(0x8B4513, { roughness: 0.7 });
  const potRim = mat(0x6b3410, { roughness: 0.6 });
  const dirt = mat(0x3a2a1a, { roughness: 0.95 });
  const leafCol = getColor(obj, OBJECT_COLORS.plant);
  const leafA = mat(leafCol, { roughness: 0.7 });
  const leafB = mat(new THREE.Color(leafCol).offsetHSL(0, 0, 0.05).getHex(), { roughness: 0.7 });
  const leafC = mat(new THREE.Color(leafCol).offsetHSL(0, 0, -0.05).getHex(), { roughness: 0.7 });
  const stem = mat(0x4a3320, { roughness: 0.7 });

  const potH = obj.height * 0.25;
  const potR = obj.width / 2;
  const potMesh = cyl(potR * 0.85, potR, potH, pot, 24);
  potMesh.position.y = potH / 2;
  g.add(potMesh);
  // Pot rim
  const rim = cyl(potR * 0.92, potR * 0.92, 0.04, potRim, 24);
  rim.position.y = potH - 0.02;
  g.add(rim);
  // Dirt
  const dirtMesh = cyl(potR * 0.84, potR * 0.84, 0.03, dirt, 24);
  dirtMesh.position.y = potH;
  g.add(dirtMesh);

  // Stems
  const stemH = obj.height * 0.35;
  const trunk = cyl(0.03, 0.04, stemH, stem, 8);
  trunk.position.y = potH + stemH / 2;
  g.add(trunk);

  // Foliage clusters — many overlapping leaf-like icospheres
  const foliageY = potH + stemH;
  const foliageR = Math.min(obj.width / 1.6, obj.height * 0.45);

  const cluster = [
    { offset: [0, foliageR * 0.4, 0], r: foliageR * 0.7, m: leafA },
    { offset: [foliageR * 0.5, foliageR * 0.2, 0], r: foliageR * 0.45, m: leafB },
    { offset: [-foliageR * 0.5, foliageR * 0.2, 0], r: foliageR * 0.45, m: leafC },
    { offset: [0, foliageR * 0.2, foliageR * 0.5], r: foliageR * 0.5, m: leafB },
    { offset: [0, foliageR * 0.2, -foliageR * 0.5], r: foliageR * 0.5, m: leafC },
    { offset: [foliageR * 0.35, foliageR * 0.7, foliageR * 0.2], r: foliageR * 0.42, m: leafA },
    { offset: [-foliageR * 0.35, foliageR * 0.7, -foliageR * 0.2], r: foliageR * 0.42, m: leafA },
    { offset: [0, foliageR * 0.95, 0], r: foliageR * 0.4, m: leafB },
  ];
  for (const c of cluster) {
    const blob = new THREE.Mesh(
      new THREE.IcosahedronGeometry(c.r, 1),
      c.m,
    );
    blob.position.set(c.offset[0], foliageY + c.offset[1], c.offset[2]);
    blob.castShadow = true;
    blob.receiveShadow = true;
    g.add(blob);
  }

  // A few hanging leaves
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const r = foliageR * 0.95;
    const leaf = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 6),
      i % 2 === 0 ? leafA : leafB,
    );
    leaf.scale.set(0.7, 0.4, 1.2);
    leaf.position.set(
      Math.cos(angle) * r,
      foliageY + foliageR * 0.3 + Math.sin(angle * 2) * 0.05,
      Math.sin(angle) * r,
    );
    leaf.rotation.y = angle;
    leaf.rotation.z = 0.3;
    leaf.castShadow = true;
    g.add(leaf);
  }

  return g;
}

/* -------------------------------------------------------------------------- */
/*  Entrance Marker                                                            */
/* -------------------------------------------------------------------------- */

function buildEntranceMarker(obj: SceneObject): THREE.Group {
  const g = new THREE.Group();
  const red = mat(getColor(obj, OBJECT_COLORS.entrance_marker), {
    emissive: 0xc53030,
    emissiveIntensity: 0.8,
    roughness: 0.4,
  });
  const base = mat(0x2d3748, { roughness: 0.5, metalness: 0.5 });
  const sign = mat(0x10b981, { emissive: 0x10b981, emissiveIntensity: 0.8 });

  // Base
  const baseH = 0.06;
  const baseMesh = cyl(obj.width * 0.45, obj.width * 0.5, baseH, base, 24);
  baseMesh.position.y = baseH / 2;
  g.add(baseMesh);

  // Pole
  const pole = cyl(0.04, 0.04, obj.height * 0.7, base, 12);
  pole.position.y = obj.height * 0.35 + baseH;
  g.add(pole);

  // Sign panel "ENTRY"
  const panel = rbox(obj.width * 1.0, obj.height * 0.25, 0.04, 0.01, sign);
  panel.position.y = obj.height * 0.85;
  g.add(panel);

  // Arrow in front of base, pointing forward
  const arrowGeo = new THREE.ConeGeometry(obj.width * 0.35, obj.depth * 0.7, 4);
  const arrow = new THREE.Mesh(arrowGeo, red);
  arrow.rotation.x = Math.PI / 2;
  arrow.rotation.y = Math.PI / 4;
  arrow.position.set(0, obj.height * 0.5, 0);
  arrow.castShadow = true;
  g.add(arrow);

  // Bollards on each side
  for (const sx of [-1, 1]) {
    const b = cyl(0.05, 0.05, 0.4, mat(0xfbbf24, { emissive: 0xfbbf24, emissiveIntensity: 0.4 }), 12);
    b.position.set(sx * obj.width * 0.5, 0.2, 0);
    g.add(b);
  }

  return g;
}

/* -------------------------------------------------------------------------- */
/*  Toilet                                                                     */
/* -------------------------------------------------------------------------- */

function buildToilet(obj: SceneObject): THREE.Group {
  const g = new THREE.Group();
  const porcelain = mat(getColor(obj, OBJECT_COLORS.toilet), { roughness: 0.25, metalness: 0.05 });
  const dark = mat(ACCENT_COLORS.toilet, { roughness: 0.4, metalness: 0.4 });

  const tankH = obj.height * 0.55;
  const bowlH = obj.height * 0.4;

  // Bowl
  const bowl = rbox(obj.width * 0.7, bowlH, obj.depth * 0.85, 0.12, porcelain);
  bowl.position.set(0, bowlH / 2, obj.depth * 0.05);
  g.add(bowl);

  // Seat ring
  const seat = rbox(obj.width * 0.7, 0.04, obj.depth * 0.78, 0.1, dark);
  seat.position.set(0, bowlH + 0.02, obj.depth * 0.05);
  g.add(seat);

  // Tank
  const tank = rbox(obj.width * 0.85, tankH, obj.depth * 0.3, 0.04, porcelain);
  tank.position.set(0, bowlH + tankH / 2, -obj.depth / 2 + obj.depth * 0.18);
  g.add(tank);

  // Tank lid
  const lid = box(obj.width * 0.86, 0.04, obj.depth * 0.32, dark);
  lid.position.set(0, bowlH + tankH + 0.02, -obj.depth / 2 + obj.depth * 0.18);
  g.add(lid);

  // Flush button
  const btn = cyl(0.04, 0.04, 0.01, mat(0xc0c0c8, { metalness: 0.7, roughness: 0.3 }), 16);
  btn.position.set(obj.width * 0.25, bowlH + tankH + 0.045, -obj.depth / 2 + obj.depth * 0.18);
  g.add(btn);

  return g;
}

/* -------------------------------------------------------------------------- */
/*  Sink                                                                       */
/* -------------------------------------------------------------------------- */

function buildSink(obj: SceneObject): THREE.Group {
  const g = new THREE.Group();
  const porcelain = mat(getColor(obj, OBJECT_COLORS.sink), { roughness: 0.2, metalness: 0.1 });
  const chrome = mat(0xd0d4dc, { metalness: 0.95, roughness: 0.15 });
  const cabinet = mat(0x6b5236, { roughness: 0.55 });

  const counterH = obj.height * 0.85;
  const counterT = 0.05;

  // Cabinet base
  const cab = rbox(obj.width, counterH - counterT, obj.depth, 0.02, cabinet);
  cab.position.set(0, (counterH - counterT) / 2, 0);
  g.add(cab);

  // Counter top
  const top = rbox(obj.width, counterT, obj.depth, 0.015, porcelain);
  top.position.set(0, counterH - counterT / 2, 0);
  g.add(top);

  // Basin (carved-out look)
  const basinW = obj.width * 0.7;
  const basinD = obj.depth * 0.7;
  const basinH = 0.13;
  const basin = rbox(basinW, basinH, basinD, 0.04, porcelain);
  basin.position.set(0, counterH - counterT - basinH / 2 + 0.02, 0);
  g.add(basin);
  const basinHole = box(basinW * 0.85, 0.02, basinD * 0.85, mat(0x111111, { roughness: 0.4 }));
  basinHole.position.set(0, counterH - 0.005, 0);
  g.add(basinHole);

  // Faucet
  const faucetBase = cyl(0.025, 0.03, 0.04, chrome, 12);
  faucetBase.position.set(0, counterH + 0.02, -basinD / 2 + 0.02);
  g.add(faucetBase);
  const spout = cyl(0.018, 0.018, 0.18, chrome, 10);
  spout.position.set(0, counterH + 0.13, -basinD / 2 + 0.02);
  g.add(spout);
  const spoutHead = cyl(0.022, 0.022, 0.05, chrome, 10);
  spoutHead.rotation.x = Math.PI / 2;
  spoutHead.position.set(0, counterH + 0.21, -basinD / 2 + 0.05);
  g.add(spoutHead);

  // Mirror above (only if height permits)
  if (obj.height > 0.6) {
    const mirrorH = Math.min(0.8, obj.height * 0.7);
    const mirror = rbox(obj.width * 0.85, mirrorH, 0.03, 0.01, mat(0xe6f0ff, { metalness: 0.9, roughness: 0.05 }));
    mirror.position.set(0, counterH + 0.4 + mirrorH / 2, -obj.depth / 2 + 0.02);
    g.add(mirror);
  }

  return g;
}

/* -------------------------------------------------------------------------- */
/*  Door                                                                       */
/* -------------------------------------------------------------------------- */

function buildDoor(obj: SceneObject): THREE.Group {
  const g = new THREE.Group();
  const wood = mat(getColor(obj, OBJECT_COLORS.door), { roughness: 0.55, metalness: 0.05 });
  const trim = mat(ACCENT_COLORS.door, { roughness: 0.5 });
  const knob = mat(0xc0a060, { metalness: 0.85, roughness: 0.25 });

  const frameT = 0.06;
  const doorW = obj.width - frameT * 2;
  const doorH = obj.height - frameT;
  const doorThick = Math.max(0.04, obj.depth * 0.6);

  // Frame (top)
  const frameTop = box(obj.width, frameT, obj.depth, trim);
  frameTop.position.set(0, obj.height - frameT / 2, 0);
  g.add(frameTop);
  // Frame (sides)
  for (const sx of [-1, 1]) {
    const side = box(frameT, doorH, obj.depth, trim);
    side.position.set(sx * (doorW / 2 + frameT / 2), doorH / 2, 0);
    g.add(side);
  }

  // Door slab — pivoted slightly open for depth/realism
  const pivot = new THREE.Group();
  pivot.position.set(-doorW / 2, 0, 0);
  pivot.rotation.y = -Math.PI / 6;
  const slab = rbox(doorW, doorH, doorThick, 0.01, wood);
  slab.position.set(doorW / 2, doorH / 2, 0);
  pivot.add(slab);

  // Inset panels on the door
  const panelOff = doorThick / 2 + 0.005;
  for (const sy of [-1, 1]) {
    const panel = box(doorW * 0.7, doorH * 0.35, 0.005, trim);
    panel.position.set(doorW / 2, doorH * 0.5 + sy * doorH * 0.22, panelOff);
    pivot.add(panel);
    const panelB = box(doorW * 0.7, doorH * 0.35, 0.005, trim);
    panelB.position.set(doorW / 2, doorH * 0.5 + sy * doorH * 0.22, -panelOff);
    pivot.add(panelB);
  }

  // Knob
  const k = sphere(0.035, knob, 12, 8);
  k.position.set(doorW - 0.1, doorH * 0.5, panelOff + 0.01);
  pivot.add(k);
  const kBack = sphere(0.035, knob, 12, 8);
  kBack.position.set(doorW - 0.1, doorH * 0.5, -panelOff - 0.01);
  pivot.add(kBack);

  g.add(pivot);

  return g;
}

/* -------------------------------------------------------------------------- */
/*  Staircase                                                                  */
/* -------------------------------------------------------------------------- */

function buildStaircase(obj: SceneObject): THREE.Group {
  const g = new THREE.Group();
  const tread = mat(getColor(obj, OBJECT_COLORS.staircase), { roughness: 0.6 });
  const riser = mat(ACCENT_COLORS.staircase, { roughness: 0.65 });
  const railing = mat(0x222831, { metalness: 0.6, roughness: 0.3 });
  const banister = mat(0x3a2a1a, { roughness: 0.55 });

  const stepCount = Math.max(6, Math.min(14, Math.round(obj.height / 0.18)));
  const stepH = obj.height / stepCount;
  const stepD = obj.depth / stepCount;
  const stepW = obj.width;

  // Steps (each = riser + tread)
  for (let i = 0; i < stepCount; i++) {
    const z = -obj.depth / 2 + (i + 0.5) * stepD;
    const y = (i + 0.5) * stepH;
    // Riser (vertical face)
    const r = box(stepW, stepH, 0.02, riser);
    r.position.set(0, y, z - stepD / 2);
    g.add(r);
    // Tread (horizontal walking surface)
    const t = box(stepW, 0.03, stepD * 1.05, tread);
    t.position.set(0, y + stepH / 2 - 0.015, z);
    g.add(t);
  }

  // Side stringers
  for (const sx of [-1, 1]) {
    const stringerGeo = new THREE.BoxGeometry(0.06, obj.height * 1.1, obj.depth * 1.05);
    const stringer = new THREE.Mesh(stringerGeo, banister);
    stringer.position.set(sx * (stepW / 2 + 0.03), obj.height / 2, 0);
    stringer.castShadow = false;
    stringer.receiveShadow = true;
    g.add(stringer);
  }

  // Banister (sloped handrail, matches stair angle)
  const angle = Math.atan2(obj.height, obj.depth);
  const railLen = Math.sqrt(obj.height * obj.height + obj.depth * obj.depth);
  for (const sx of [-1, 1]) {
    const handGeo = new THREE.BoxGeometry(0.05, 0.05, railLen);
    const hand = new THREE.Mesh(handGeo, banister);
    hand.rotation.x = -angle;
    hand.position.set(sx * (stepW / 2 + 0.03), obj.height + 0.85, 0);
    g.add(hand);

    // Vertical balusters
    const balusterCount = Math.max(3, Math.floor(obj.depth / 0.45));
    for (let j = 0; j < balusterCount; j++) {
      const t = (j + 0.5) / balusterCount;
      const z = -obj.depth / 2 + t * obj.depth;
      const yBase = stepH * Math.floor(t * stepCount);
      const balH = obj.height + 0.85 - yBase - 0.025;
      const b = cyl(0.018, 0.018, balH, railing, 8);
      b.position.set(sx * (stepW / 2 + 0.03), yBase + balH / 2, z);
      g.add(b);
    }
  }

  return g;
}

/* -------------------------------------------------------------------------- */
/*  Bed                                                                        */
/* -------------------------------------------------------------------------- */

function buildBed(obj: SceneObject): THREE.Group {
  const g = new THREE.Group();
  const frame = mat(0x4a3422, { roughness: 0.6 });
  const sheet = mat(getColor(obj, OBJECT_COLORS.bed), { roughness: 0.85 });
  const pillow = mat(0xfafaf6, { roughness: 0.8 });
  const blanket = mat(0x2c5e8a, { roughness: 0.85 });

  const frameH = obj.height * 0.3;
  const mattressH = obj.height * 0.35;

  // Bed frame
  const fr = rbox(obj.width, frameH, obj.depth, 0.02, frame);
  fr.position.y = frameH / 2;
  g.add(fr);

  // Mattress
  const mat1 = rbox(obj.width * 0.96, mattressH, obj.depth * 0.96, 0.05, sheet);
  mat1.position.y = frameH + mattressH / 2;
  g.add(mat1);

  // Folded blanket
  const bl = rbox(obj.width * 0.92, 0.04, obj.depth * 0.45, 0.02, blanket);
  bl.position.set(0, frameH + mattressH + 0.025, obj.depth * 0.2);
  g.add(bl);

  // Pillows
  for (const sx of [-1, 1]) {
    const p = rbox(obj.width * 0.4, 0.1, obj.depth * 0.22, 0.05, pillow);
    p.position.set(sx * obj.width * 0.22, frameH + mattressH + 0.06, -obj.depth * 0.32);
    g.add(p);
  }

  // Headboard
  const hb = rbox(obj.width * 1.02, obj.height * 0.95, 0.08, 0.04, frame);
  hb.position.set(0, obj.height * 0.475, -obj.depth / 2 - 0.03);
  g.add(hb);

  return g;
}

/* -------------------------------------------------------------------------- */
/*  Kitchen Unit                                                               */
/* -------------------------------------------------------------------------- */

function buildKitchenUnit(obj: SceneObject): THREE.Group {
  const g = new THREE.Group();
  const cabinet = mat(getColor(obj, OBJECT_COLORS.kitchen_unit), { roughness: 0.55 });
  const counter = mat(0x2c2c33, { roughness: 0.3, metalness: 0.4 });
  const stainless = mat(0xc0c4ca, { metalness: 0.85, roughness: 0.2 });
  const burner = mat(0x111111, { roughness: 0.5 });
  const knob = mat(0x3a3a3a, { metalness: 0.4, roughness: 0.4 });

  const counterT = 0.05;
  const baseH = obj.height - counterT;

  // Base cabinets
  const base = rbox(obj.width, baseH, obj.depth, 0.02, cabinet);
  base.position.y = baseH / 2;
  g.add(base);

  // Counter top
  const top = rbox(obj.width * 1.02, counterT, obj.depth * 1.02, 0.012, counter);
  top.position.y = baseH + counterT / 2;
  g.add(top);

  // Cabinet doors (segmented)
  const doorCount = Math.max(2, Math.floor(obj.width / 0.7));
  for (let i = 0; i < doorCount; i++) {
    const dw = obj.width / doorCount * 0.92;
    const x = -obj.width / 2 + (i + 0.5) * (obj.width / doorCount);
    const door = box(dw, baseH * 0.85, 0.01, mat(0xb29770, { roughness: 0.5 }));
    door.position.set(x, baseH * 0.5, obj.depth / 2 + 0.005);
    g.add(door);
    const handle = box(0.04, 0.18, 0.012, stainless);
    handle.position.set(x + dw * 0.4, baseH * 0.65, obj.depth / 2 + 0.012);
    g.add(handle);
  }

  // Stove area (left half top)
  const stoveW = Math.min(obj.width * 0.45, 0.7);
  const stove = rbox(stoveW, 0.015, obj.depth * 0.7, 0.01, burner);
  stove.position.set(-obj.width * 0.22, baseH + counterT + 0.008, 0);
  g.add(stove);
  // Burners
  for (let i = 0; i < 4; i++) {
    const bx = -obj.width * 0.22 + (i % 2 === 0 ? -1 : 1) * stoveW * 0.22;
    const bz = (i < 2 ? -1 : 1) * obj.depth * 0.18;
    const b = cyl(0.06, 0.06, 0.01, knob, 16);
    b.position.set(bx, baseH + counterT + 0.018, bz);
    g.add(b);
  }

  // Sink area (right half top)
  const sinkW = Math.min(obj.width * 0.4, 0.6);
  const sinkD = obj.depth * 0.7;
  const sinkBasin = rbox(sinkW, 0.08, sinkD, 0.03, stainless);
  sinkBasin.position.set(obj.width * 0.25, baseH + counterT - 0.04, 0);
  g.add(sinkBasin);
  const faucet = cyl(0.02, 0.02, 0.22, stainless, 10);
  faucet.position.set(obj.width * 0.25, baseH + counterT + 0.13, -sinkD / 2 + 0.02);
  g.add(faucet);

  return g;
}

/* -------------------------------------------------------------------------- */
/*  Bathtub                                                                    */
/* -------------------------------------------------------------------------- */

function buildBathtub(obj: SceneObject): THREE.Group {
  const g = new THREE.Group();
  const porcelain = mat(getColor(obj, OBJECT_COLORS.bathtub), { roughness: 0.2, metalness: 0.1 });
  const water = mat(0x9ec5ff, { roughness: 0.1, metalness: 0.0, transparent: true, opacity: 0.6 });
  const chrome = mat(0xd0d4dc, { metalness: 0.95, roughness: 0.15 });
  const tile = mat(0xe6e2d8, { roughness: 0.6 });

  // Outer tub shell
  const outer = rbox(obj.width, obj.height, obj.depth, 0.08, porcelain);
  outer.position.y = obj.height / 2;
  g.add(outer);

  // Inner basin (slight inset, darker rim)
  const innerH = obj.height * 0.7;
  const inner = box(obj.width * 0.85, innerH, obj.depth * 0.78, mat(0x111316, { roughness: 0.5 }));
  inner.position.y = obj.height - innerH / 2 + 0.005;
  g.add(inner);

  // Water surface
  const w = box(obj.width * 0.83, 0.005, obj.depth * 0.76, water);
  w.position.y = obj.height - 0.05;
  g.add(w);

  // Faucet on one end
  const faucetBase = cyl(0.04, 0.04, 0.02, chrome, 12);
  faucetBase.position.set(0, obj.height + 0.01, -obj.depth / 2 + 0.08);
  g.add(faucetBase);
  const spout = cyl(0.025, 0.025, 0.16, chrome, 10);
  spout.position.set(0, obj.height + 0.09, -obj.depth / 2 + 0.08);
  g.add(spout);
  const spoutTip = cyl(0.03, 0.03, 0.05, chrome, 10);
  spoutTip.rotation.x = Math.PI / 2;
  spoutTip.position.set(0, obj.height + 0.18, -obj.depth / 2 + 0.13);
  g.add(spoutTip);

  // Wall tiles backsplash (subtle)
  const back = box(obj.width, obj.height * 1.6, 0.04, tile);
  back.position.set(0, obj.height * 0.8 + obj.height * 0.3, -obj.depth / 2 - 0.02);
  g.add(back);

  return g;
}

/* -------------------------------------------------------------------------- */
/*  Default                                                                    */
/* -------------------------------------------------------------------------- */

function buildDefault(obj: SceneObject): THREE.Group {
  const g = new THREE.Group();
  const color = getColor(obj, OBJECT_COLORS[obj.type] ?? 0x718096);
  const m = mat(color);
  const mesh = rbox(obj.width, obj.height, obj.depth, 0.04, m);
  mesh.position.y = obj.height / 2;
  g.add(mesh);
  return g;
}

const BUILDERS: Record<ObjectType, (obj: SceneObject) => THREE.Group> = {
  table:           buildTable,
  chair:           buildChair,
  stage:           buildStage,
  booth:           buildBooth,
  desk:            buildDesk,
  podium:          buildPodium,
  screen:          buildScreen,
  workstation:     buildWorkstation,
  shelf:           buildShelf,
  counter:         buildCounter,
  equipment:       buildEquipment,
  divider:         buildDivider,
  plant:           buildPlant,
  entrance_marker: buildEntranceMarker,
  toilet:          buildToilet,
  sink:            buildSink,
  door:            buildDoor,
  staircase:       buildStaircase,
  bed:             buildBed,
  kitchen_unit:    buildKitchenUnit,
  bathtub:         buildBathtub,
};

export function buildObjectMesh(obj: SceneObject): THREE.Group {
  const builder = BUILDERS[obj.type] ?? buildDefault;
  const inner = builder(obj);
  // Cast shadow only from the largest mesh in the group (cheap silhouette).
  markBodyAsCaster(inner);
  // Outer wrapper handles world position/rotation/z lift
  const wrapper = new THREE.Group();
  wrapper.add(inner);
  inner.position.y = obj.z;
  wrapper.position.set(obj.x, 0, obj.y);
  wrapper.rotation.y = (obj.rotation * Math.PI) / 180;
  return wrapper;
}
