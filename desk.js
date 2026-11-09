/* The desk, in 3D.

   A camera looks down at a walnut desk (images/wood.jpg). On it:
     - two folders: "About me" (education, experience) and "Projects"
     - a CV sheet and a business card
     - a desk lamp, a mug and a pencil
   Clicking a folder, the sheet or the card lifts it and opens its panel
   (site.js). The menu opens the same panels.

   Light. By day the sun comes in through a window on the left wall. To
   night: the sun slides along the window and sets, the patch of sunlight
   stretches and turns orange, the window goes deep blue (the blue hour),
   and the desk lamp switches on. To day: the lamp goes off and the sun comes
   up on the other side of the window. See "Light" below. */

import * as THREE from './vendor/three.module.min.js';

const root = document.documentElement;
const canvas = document.getElementById('desk');
const tip = document.querySelector('.desk-tip');
const intro = document.querySelector('.intro');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  throw e; // no WebGL: the page shows its four cards instead
}
root.classList.add('has-desk');
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const ANISO = renderer.capabilities.getMaxAnisotropy();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x120c08);
const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 200);

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
const range = (t, a, b) => clamp01((t - a) / (b - a));

/* ---------- Frame loop: draw only while something moves ---------- */

let raf = 0;
const movers = new Set(); // functions(now) that return true while still moving
function invalidate() { if (!raf) raf = requestAnimationFrame(frame); }
function frame(now) {
  raf = 0;
  let moving = false;
  for (const m of [...movers]) {
    if (m(now)) moving = true; else movers.delete(m);
  }
  renderer.render(scene, camera);
  if (moving) invalidate();
}
function animate(fn) { movers.add(fn); invalidate(); }

/* ---------- Canvas helpers for printed surfaces ---------- */

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
function texFrom(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = ANISO;
  return t;
}
function grain(g, w, h, amount) {
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * amount;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
}
function fibres(g, w, h, colour, count) {
  g.save();
  g.strokeStyle = colour;
  g.lineWidth = 1;
  for (let i = 0; i < count; i++) {
    const x = Math.random() * w, y = Math.random() * h, l = 4 + Math.random() * 14, a = Math.random() * Math.PI;
    g.globalAlpha = 0.08 + Math.random() * 0.12;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  g.restore();
}
function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function wrapText(g, text, x, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (g.measureText(test).width > maxW && line) { g.fillText(line, x, y); y += lineH; line = word; }
    else line = test;
  }
  if (line) g.fillText(line, x, y);
  return y + lineH;
}
const DISPLAY = '"Fraunces", Georgia, serif';
const BODY = '"IBM Plex Sans", "Segoe UI", sans-serif';
const MONO = '"IBM Plex Mono", ui-monospace, monospace';

/* ---------- Desk ---------- */

const TILE_W = 22, TILE_H = TILE_W * 1088 / 1920;
const woodTex = new THREE.TextureLoader().load('images/wood.jpg', invalidate);
woodTex.colorSpace = THREE.SRGBColorSpace;
woodTex.anisotropy = ANISO;
woodTex.wrapS = woodTex.wrapT = THREE.MirroredRepeatWrapping;
const DESK_SIZE = 70;
woodTex.repeat.set(DESK_SIZE / TILE_W, DESK_SIZE / TILE_H);
woodTex.offset.set(0.5 - DESK_SIZE / TILE_W / 2, 0.5 - DESK_SIZE / TILE_H / 2);
const desk = new THREE.Mesh(
  new THREE.PlaneGeometry(DESK_SIZE, DESK_SIZE),
  new THREE.MeshStandardMaterial({ map: woodTex, bumpMap: woodTex, bumpScale: 1.2, roughness: 0.58, metalness: 0, color: 0xc4b8ad })
);
desk.rotation.x = -Math.PI / 2;
desk.receiveShadow = true;
scene.add(desk);

/* ---------- Materials ---------- */

const std = (o) => new THREE.MeshStandardMaterial(o);
const paperMat = std({ color: 0xf4f1ea, roughness: 0.92 });
const shadowy = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };

/* ---------- Folders ---------- */

const FOLDER_W = 3.3, FOLDER_H = 2.45, TAB_W = 1.15, TAB_H = 0.3, BOARD_T = 0.014;

function folderSurface(colour, dark, title, subtitle, tabText) {
  // front cover: board colour, fibres, a white label
  const W = 1200, H = Math.round(W * FOLDER_H / FOLDER_W);
  const c = makeCanvas(W, H), g = c.getContext('2d');
  g.fillStyle = colour; g.fillRect(0, 0, W, H);
  fibres(g, W, H, dark, 2600);
  grain(g, W, H, 10);
  // fold scores along the spine
  g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 3;
  [0.05, 0.075].forEach((f) => { g.beginPath(); g.moveTo(f * W, 0); g.lineTo(f * W, H); g.stroke(); });
  // label
  const lx = W * 0.16, ly = H * 0.3, lw = W * 0.66, lh = H * 0.36;
  g.save();
  g.shadowColor = 'rgba(0,0,0,0.18)'; g.shadowBlur = 6; g.shadowOffsetY = 2;
  g.fillStyle = '#FBF9F4'; roundRect(g, lx, ly, lw, lh, 10); g.fill();
  g.restore();
  g.strokeStyle = 'rgba(196,82,31,0.85)'; g.lineWidth = 4;
  g.beginPath(); g.moveTo(lx + 40, ly + lh * 0.66); g.lineTo(lx + lw - 40, ly + lh * 0.66); g.stroke();
  g.fillStyle = '#1F1A16';
  g.font = `400 ${Math.round(lh * 0.36)}px ${DISPLAY}`;
  g.textBaseline = 'alphabetic';
  g.fillText(title, lx + 40, ly + lh * 0.52);
  g.fillStyle = '#5B5148';
  g.font = `400 ${Math.round(lh * 0.14)}px ${BODY}`;
  g.fillText(subtitle, lx + 40, ly + lh * 0.86);
  const front = texFrom(c);

  // tab: same board with a short word
  const TW = 512, TH = Math.round(TW * TAB_H / TAB_W);
  const ct = makeCanvas(TW, TH), gt = ct.getContext('2d');
  gt.fillStyle = colour; gt.fillRect(0, 0, TW, TH);
  fibres(gt, TW, TH, dark, 400);
  grain(gt, TW, TH, 10);
  gt.fillStyle = 'rgba(31,26,22,0.78)';
  gt.font = `500 ${Math.round(TH * 0.42)}px ${MONO}`;
  gt.textBaseline = 'middle';
  gt.fillText(tabText, TW * 0.1, TH * 0.56);
  const tab = texFrom(ct);

  // plain board for the edges and the back
  const cb = makeCanvas(256, 256), gb = cb.getContext('2d');
  gb.fillStyle = colour; gb.fillRect(0, 0, 256, 256);
  fibres(gb, 256, 256, dark, 300);
  grain(gb, 256, 256, 10);
  const plain = texFrom(cb);
  return { front, tab, plain };
}

function printedPlane(w, h, tex, rough = 0.9) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), std({ map: tex, roughness: rough }));
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  return m;
}

function makeFolder(spec) {
  const g = new THREE.Group();
  const s = folderSurface(spec.colour, spec.dark, spec.title, spec.subtitle, spec.tab);
  const boardMat = std({ map: s.plain, roughness: 0.88 });

  // back board with its tab (the tab sits on the far edge, to the left)
  const back = shadowy(new THREE.Mesh(new THREE.BoxGeometry(FOLDER_W, BOARD_T, FOLDER_H), boardMat));
  back.position.y = BOARD_T / 2;
  g.add(back);
  const tab = shadowy(new THREE.Mesh(new THREE.BoxGeometry(TAB_W, BOARD_T, TAB_H), boardMat));
  tab.position.set(-FOLDER_W / 2 + 0.25 + TAB_W / 2 + spec.tabShift, BOARD_T / 2, -FOLDER_H / 2 - TAB_H / 2 + 0.01);
  g.add(tab);
  const tabPrint = printedPlane(TAB_W, TAB_H, s.tab, 0.88);
  tabPrint.position.set(tab.position.x, BOARD_T + 0.0008, tab.position.z);
  g.add(tabPrint);

  // a few sheets inside, peeking out at the right and the bottom
  const sheets = [[0.09, 0.05, 0.012], [0.05, 0.1, -0.02]];
  sheets.forEach(([dx, dz, rot], i) => {
    const p = shadowy(new THREE.Mesh(new THREE.BoxGeometry(FOLDER_W - 0.25, 0.004, FOLDER_H - 0.2), paperMat));
    p.position.set(dx, BOARD_T + 0.004 + i * 0.005, dz);
    p.rotation.y = rot;
    g.add(p);
  });

  // front board, a touch smaller
  const fy = BOARD_T + 0.02;
  const front = shadowy(new THREE.Mesh(new THREE.BoxGeometry(FOLDER_W - 0.02, BOARD_T, FOLDER_H - 0.06), boardMat));
  front.position.set(-0.01, fy + BOARD_T / 2, 0.03);
  g.add(front);
  const frontPrint = printedPlane(FOLDER_W - 0.02, FOLDER_H - 0.06, s.front, 0.86);
  frontPrint.position.set(-0.01, fy + BOARD_T + 0.0008, 0.03);
  g.add(frontPrint);
  return g;
}

/* ---------- CV sheet ---------- */

const CV_W = 2.1, CV_H = 2.97;
function cvSurface() {
  const W = 1240, H = Math.round(W * CV_H / CV_W);
  const c = makeCanvas(W, H), g = c.getContext('2d');
  g.fillStyle = '#F7F5EF'; g.fillRect(0, 0, W, H);
  fibres(g, W, H, '#B9B1A2', 900);
  grain(g, W, H, 6);
  const L = 110, R = W - 110;
  let y = 170;
  g.fillStyle = '#1F1A16';
  g.font = `400 72px ${DISPLAY}`;
  g.fillText('Ricardo Sales Piquer', L, y);
  g.font = `500 34px ${MONO}`;
  g.fillStyle = '#C4521F';
  g.textAlign = 'right'; g.fillText('CV', R, y - 6); g.textAlign = 'left';
  y += 56;
  g.fillStyle = '#5B5148';
  g.font = `400 30px ${BODY}`;
  g.fillText('Mathematician · data, maps and models', L, y);
  y += 42;
  g.fillText('ricardosalespiquer@gmail.com', L, y);
  y += 40;
  g.strokeStyle = 'rgba(31,26,22,0.25)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(L, y); g.lineTo(R, y); g.stroke();

  const section = (title, rows) => {
    y += 78;
    g.fillStyle = '#C4521F';
    g.font = `500 26px ${MONO}`;
    g.fillText(title.toUpperCase(), L, y);
    y += 22;
    rows.forEach(([when, what, where]) => {
      y += 46;
      g.fillStyle = '#5B5148'; g.font = `400 25px ${MONO}`;
      g.fillText(when, L, y);
      g.fillStyle = '#1F1A16'; g.font = `400 29px ${BODY}`;
      g.fillText(what, L + 230, y);
      if (where) {
        y += 36;
        g.fillStyle = '#5B5148'; g.font = `400 25px ${BODY}`;
        g.fillText(where, L + 230, y);
      }
    });
  };
  section('Education', [
    ['2025–27', 'MSc Geospatial Technologies', 'Thesis: lightning clustering, Hawkes processes'],
    ['2021–25', 'BSc Computational Mathematics', 'Universitat Jaume I'],
  ]);
  section('Experience', [
    ['2026', 'Organising team, GeoMundus 2026', 'Castellón'],
    ['2025', 'Scientific computing intern, Blosc2', 'ironArray'],
    ['2024–25', 'Research assistant, clinical data', 'GIANT group, UJI'],
    ['2022–24', 'Leisure and youth activity instructor', 'Les Escoles de la Mar'],
  ]);
  y += 78;
  g.fillStyle = '#C4521F'; g.font = `500 26px ${MONO}`;
  g.fillText('SKILLS', L, y);
  y += 56;
  g.fillStyle = '#1F1A16'; g.font = `400 27px ${BODY}`;
  y = wrapText(g, 'Probability, statistics, numerical analysis, point processes, Python, R, SQL, MATLAB, GIS, remote sensing, Google Earth Engine, PostGIS', L, y, R - L, 40);
  y += 38;
  g.fillStyle = '#C4521F'; g.font = `500 26px ${MONO}`;
  g.fillText('LANGUAGES', L, y);
  y += 56;
  g.fillStyle = '#1F1A16'; g.font = `400 27px ${BODY}`;
  wrapText(g, 'Spanish (native) · English C1 · Catalan C1 · French A2 · Portuguese A1', L, y, R - L, 40);
  return texFrom(c);
}

function curledSheet(w, h, tex) {
  const geo = new THREE.PlaneGeometry(w, h, 24, 32);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) / (w / 2), yv = pos.getY(i) / (h / 2);
    // a soft lift at the corners, the way a sheet lies on a desk
    const lift = 0.018 * Math.pow(Math.max(Math.abs(x), Math.abs(yv)), 6) + 0.01 * Math.pow((x + 1) / 2, 3);
    pos.setZ(i, lift);
  }
  geo.computeVertexNormals();
  const m = shadowy(new THREE.Mesh(geo, std({ map: tex, roughness: 0.93, side: THREE.DoubleSide })));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.004;
  return m;
}

/* ---------- Business card ---------- */

const CARD_W = 1.0, CARD_H = 0.6;
function cardSurface() {
  const W = 900, H = Math.round(W * CARD_H / CARD_W);
  const c = makeCanvas(W, H), g = c.getContext('2d');
  g.fillStyle = '#FBFAF6'; g.fillRect(0, 0, W, H);
  grain(g, W, H, 5);
  g.fillStyle = '#C4521F'; g.fillRect(0, H - 18, W, 18);
  g.fillStyle = '#1F1A16';
  g.font = `400 66px ${DISPLAY}`;
  g.fillText('Ricardo Sales Piquer', 64, 150);
  g.fillStyle = '#5B5148';
  g.font = `400 34px ${BODY}`;
  g.fillText('Data science · statistical modelling', 64, 212);
  g.fillStyle = '#1F1A16';
  g.font = `400 33px ${MONO}`;
  g.fillText('ricardosalespiquer@gmail.com', 64, 380);
  g.fillStyle = '#5B5148';
  g.font = `400 29px ${MONO}`;
  g.fillText('linkedin · github: ricardosp4', 64, 440);
  return texFrom(c);
}

/* ---------- Props: lamp, mug, pencil, notebook ---------- */

// The lamp: a jointed desk lamp. Round weighted base, a lower arm of two
// parallel rods with a spring, an upper arm reaching forward, and a dome
// shade with a bulb that shows from the front.
const paint = std({ color: 0xdcd4c4, roughness: 0.5, metalness: 0.05, envMapIntensity: 0.4 }); // ivory enamel
const brass = std({ color: 0xc9a25f, roughness: 0.3, metalness: 1 });
const steel = std({ color: 0x9a9a98, roughness: 0.35, metalness: 1 });
const shadeInnerMat = std({ color: 0xf1ece2, roughness: 0.7, emissive: 0xffb15e, emissiveIntensity: 0 });
const bulbMat = std({ color: 0xfff6e6, roughness: 0.2, emissive: 0xffd6a0, emissiveIntensity: 0 });

function rod(a, b, r, mat) {
  const d = new THREE.Vector3().subVectors(b, a);
  const m = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 12), mat));
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  return m;
}
function joint(p, r, mat) {
  const j = shadowy(new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat));
  j.position.copy(p);
  return j;
}
function spring(a, b, r) { // a coil, as a thin helix
  const d = new THREE.Vector3().subVectors(b, a), len = d.length(), turns = 14;
  const pts = [];
  for (let i = 0; i <= turns * 12; i++) {
    const t = i / (turns * 12), ang = t * turns * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(ang) * r, t * len, Math.sin(ang) * r));
  }
  const m = shadowy(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * 12, 0.009, 5), steel));
  m.position.copy(a);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return m;
}

// glow around the bulb at night (there is no post-processing bloom)
function glowTexture() {
  const S = 256, c = makeCanvas(S, S), g = c.getContext('2d');
  const r = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  r.addColorStop(0, 'rgba(255,236,200,1)');
  r.addColorStop(0.18, 'rgba(255,200,130,0.55)');
  r.addColorStop(0.5, 'rgba(255,160,80,0.12)');
  r.addColorStop(1, 'rgba(255,140,60,0)');
  g.fillStyle = r; g.fillRect(0, 0, S, S);
  return texFrom(c);
}
const glow = new THREE.Sprite(new THREE.SpriteMaterial({
  map: glowTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0,
}));
glow.scale.setScalar(1.9);

function makeLamp() {
  const g = new THREE.Group();
  // base: a low turned disc
  const prof = [[0, 0], [0.6, 0], [0.62, 0.03], [0.6, 0.09], [0.5, 0.13], [0.16, 0.15], [0.13, 0.2], [0, 0.2]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  g.add(shadowy(new THREE.Mesh(new THREE.LatheGeometry(prof, 48), paint)));
  const p0 = new THREE.Vector3(0, 0.26, 0);
  g.add(joint(p0, 0.09, brass));
  // lower arm: up and slightly forward
  const p1 = new THREE.Vector3(0, 2.25, 0.75);
  const side = new THREE.Vector3(0.06, 0, 0);
  g.add(rod(p0.clone().add(side), p1.clone().add(side), 0.032, paint));
  g.add(rod(p0.clone().sub(side), p1.clone().sub(side), 0.032, paint));
  g.add(spring(new THREE.Vector3(0, 0.45, -0.06), new THREE.Vector3(0, 1.45, 0.38), 0.035));
  g.add(joint(p1, 0.075, brass));
  // upper arm: forward and a little down
  const p2 = new THREE.Vector3(0, 2.05, 2.35);
  g.add(rod(p1.clone().add(side), p2.clone().add(side), 0.028, paint));
  g.add(rod(p1.clone().sub(side), p2.clone().sub(side), 0.028, paint));
  g.add(joint(p2, 0.07, brass));

  // the head hangs from p2 and points down and forward
  const head = new THREE.Group();
  head.position.copy(p2);
  const dome = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24, a = t * Math.PI * 0.5;
    dome.push(new THREE.Vector2(0.06 + Math.sin(a) * 0.46, 0.5 - (1 - Math.cos(a)) * 0.5 - t * 0.05));
  }
  dome.push(new THREE.Vector2(0.53, -0.06)); // rolled rim
  dome.reverse(); // bottom to top, so the faces point outward
  const shadeGeo = new THREE.LatheGeometry(dome, 48);
  const shade = shadowy(new THREE.Mesh(shadeGeo, paint));
  const inner = new THREE.Mesh(shadeGeo, shadeInnerMat);
  inner.material.side = THREE.BackSide;
  inner.scale.setScalar(0.985);
  const neck = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.22, 20), brass));
  neck.position.y = 0.58;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.15, 24, 16), bulbMat);
  bulb.position.y = 0.06;
  head.add(shade, inner, neck, bulb);
  // tip the mouth of the shade toward the front of the desk
  head.rotation.x = -0.85;
  head.position.y += 0.15;
  g.add(head);
  return { group: g, head, bulb };
}

function makeMug() {
  const g = new THREE.Group();
  const ceramic = std({ color: 0xefebe4, roughness: 0.25 });
  const pts = [
    [0, 0], [0.36, 0], [0.4, 0.03], [0.42, 0.85], [0.395, 0.86], [0.375, 0.08], [0, 0.08],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const body = shadowy(new THREE.Mesh(new THREE.LatheGeometry(pts, 48), ceramic));
  const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.378, 40), std({ color: 0x24140b, roughness: 0.08 }));
  coffee.rotation.x = -Math.PI / 2;
  coffee.position.y = 0.7;
  const handle = shadowy(new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.055, 14, 28, Math.PI), ceramic));
  handle.position.set(0.41, 0.43, 0);
  handle.rotation.z = -Math.PI / 2;
  g.add(body, coffee, handle);
  return g;
}

function makePencil() {
  const g = new THREE.Group();
  const yellow = std({ color: 0xe8b21a, roughness: 0.5 });
  const L = 1.9, r = 0.05;
  const body = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 6), yellow));
  body.rotation.z = Math.PI / 2;
  const wood = shadowy(new THREE.Mesh(new THREE.ConeGeometry(r, 0.2, 6), std({ color: 0xd9b48a, roughness: 0.8 })));
  wood.rotation.z = -Math.PI / 2; wood.position.x = L / 2 + 0.1;
  const lead = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.06, 8), std({ color: 0x2a2a2a, roughness: 0.4 }));
  lead.rotation.z = -Math.PI / 2; lead.position.x = L / 2 + 0.17;
  const ferrule = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(r * 1.05, r * 1.05, 0.12, 12), steel));
  ferrule.rotation.z = Math.PI / 2; ferrule.position.x = -L / 2 - 0.06;
  const eraser = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.12, 12), std({ color: 0xd98c8c, roughness: 0.9 })));
  eraser.rotation.z = Math.PI / 2; eraser.position.x = -L / 2 - 0.18;
  g.add(body, wood, lead, ferrule, eraser);
  g.position.y = r;
  return g;
}

function makeNotebook() {
  const g = new THREE.Group();
  const cover = shadowy(new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.12, 1.45), std({ color: 0x1f2b27, roughness: 0.75 })));
  cover.position.y = 0.06;
  const band = shadowy(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.125, 1.46), std({ color: 0x111111, roughness: 0.6 })));
  band.position.set(0.85, 0.062, 0);
  g.add(cover, band);
  return g;
}

/* ---------- Build the desk ---------- */

const items = {}; // action -> { group, base: {x, z, rot}, lift, open }
function addItem(action, group, label) {
  group.traverse((o) => { if (o.isMesh) o.userData.action = action; });
  scene.add(group);
  items[action] = { group, label, lift: 0, liftTarget: 0, open: 0, openTarget: 0 };
}

function buildPrinted() {
  addItem('about', makeFolder({
    colour: '#D6B47F', dark: '#8C6B3F', title: 'About me', subtitle: 'Education · Experience', tab: 'ABOUT', tabShift: 0,
  }), 'Open About me');
  addItem('projects', makeFolder({
    colour: '#6F8597', dark: '#3E5162', title: 'Projects', subtitle: 'Three recent projects', tab: 'PROJECTS', tabShift: 0.9,
  }), 'Open Projects');

  const cv = new THREE.Group();
  cv.add(curledSheet(CV_W, CV_H, cvSurface()));
  addItem('cv', cv, 'Open CV');

  const card = new THREE.Group();
  const cardBody = shadowy(new THREE.Mesh(new THREE.BoxGeometry(CARD_W, 0.01, CARD_H), std({ color: 0xfbfaf6, roughness: 0.85 })));
  cardBody.position.y = 0.005;
  const cardPrint = printedPlane(CARD_W, CARD_H, cardSurface(), 0.85);
  cardPrint.position.y = 0.0105;
  card.add(cardBody, cardPrint);
  addItem('contact', card, 'Open Contact');
}

const lamp = makeLamp();
lamp.group.scale.setScalar(1.45); // a real desk lamp is about 45 cm tall
scene.add(lamp.group, glow);

const lampLight = new THREE.SpotLight(0xffb769, 0, 0, 0.98, 0.9, 1.3);
lampLight.castShadow = true;
lampLight.shadow.mapSize.set(1024, 1024);
lampLight.shadow.normalBias = 0.03;
lampLight.shadow.camera.near = 0.3;
const bulbLight = new THREE.PointLight(0xffb769, 0, 7, 2); // warm spill on the arm, the base and nearby
const lampTarget = new THREE.Object3D();
scene.add(lampLight, bulbLight, lampTarget);
lampLight.target = lampTarget;

const mug = makeMug();
const pencil = makePencil();
const notebook = makeNotebook();
scene.add(mug, pencil, notebook);

/* ---------- Layouts: wide screens and tall screens ---------- */

// x to the right, z toward the viewer, rot in radians. The lamp stands at
// the back of the desk so the camera sees it from the front.
const LAYOUTS = {
  wide: {
    about: [-3.7, 0.3, 0.06], projects: [0.05, 0.45, -0.05], cv: [3.75, 0.7, 0.09], contact: [1.15, 2.75, -0.14],
    lamp: [5.6, -1.7, -0.62], mug: [-5.7, -1.3], pencil: [3.4, 2.75, -0.35], notebook: [-6.5, 2.5, 0.2],
  },
  tall: {
    about: [-0.05, -1.95, 0.05], projects: [0.1, 0.75, -0.04], cv: [-0.6, 4.05, 0.07], contact: [1.3, 3.4, -0.22],
    lamp: [1.75, -4.9, -0.5], mug: [-1.95, -4.35], pencil: [1.55, 4.6, 1.1], notebook: [-2.9, 1.8, 1.4],
  },
};
let layout = LAYOUTS.wide;

function placeAll() {
  for (const [action, it] of Object.entries(items)) {
    const [x, z, rot] = layout[action];
    it.base = { x, z, rot };
    applyItem(it);
  }
  const [lx, lz, lrot] = layout.lamp;
  lamp.group.position.set(lx, 0, lz);
  lamp.group.rotation.y = lrot;
  lamp.group.updateMatrixWorld(true);
  const bulbPos = lamp.bulb.getWorldPosition(new THREE.Vector3());
  // the shade's axis, in world space: where the light goes
  const axis = new THREE.Vector3(0, -1, 0).applyQuaternion(lamp.head.getWorldQuaternion(new THREE.Quaternion()));
  lampLight.position.copy(bulbPos).addScaledVector(axis, 0.75);
  bulbLight.position.copy(bulbPos).addScaledVector(axis, 0.95); // just below the rim, so it reaches the arm and the base
  glow.position.copy(bulbPos).addScaledVector(axis, 0.8); // at the mouth: shows as a halo round the rim
  const toDesk = -bulbPos.y / axis.y;
  lampTarget.position.copy(bulbPos).addScaledVector(axis, toDesk);
  mug.position.set(layout.mug[0], 0, layout.mug[1]);
  pencil.position.set(layout.pencil[0], pencil.position.y, layout.pencil[1]);
  pencil.rotation.y = layout.pencil[2];
  notebook.position.set(layout.notebook[0], 0, layout.notebook[1]);
  notebook.rotation.y = layout.notebook[2];
}

// an item lifts a little on hover and rises toward the camera when opened
function applyItem(it) {
  const { x, z, rot } = it.base;
  const o = smooth(it.open);
  const toCam = new THREE.Vector3().subVectors(camera.position, new THREE.Vector3(x, 0, z)).multiplyScalar(0.12 * o);
  it.group.position.set(x + toCam.x, it.lift + toCam.y, z + toCam.z);
  it.group.rotation.set(0, lerp(rot, rot * 0.3, o), 0);
}

/* ---------- Camera: keep the objects between the menu and the introduction ---------- */

const TILT = 0.5; // radians from straight down: the desk seen from a chair, not from the ceiling
const camTarget = new THREE.Vector3();
const _v = new THREE.Vector3();

function fitPoints() {
  // the four clickable things and the lamp must be in view; the mug, pencil
  // and notebook may be cropped by the edges
  const box = new THREE.Box3();
  for (const it of Object.values(items)) box.union(new THREE.Box3().setFromObject(it.group));
  box.union(new THREE.Box3().setFromObject(lamp.group));
  const pts = [];
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) pts.push(new THREE.Vector3(x, y, z));
  return pts;
}
function placeCamera(dist) {
  camera.position.set(camTarget.x, Math.cos(TILT) * dist, camTarget.z + Math.sin(TILT) * dist);
  camera.lookAt(camTarget);
  camera.updateMatrixWorld(true);
}
function ndcBounds(pts) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of pts) {
    _v.copy(p).project(camera);
    x0 = Math.min(x0, _v.x); x1 = Math.max(x1, _v.x); y0 = Math.min(y0, _v.y); y1 = Math.max(y1, _v.y);
  }
  return { x0, x1, y0, y1 };
}

let camDist = 20;
function fitCamera() {
  const w = window.innerWidth, h = window.innerHeight, aspect = w / h;
  renderer.setSize(w, h, false);
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
  layout = aspect >= 1.05 ? LAYOUTS.wide : LAYOUTS.tall;
  for (const it of Object.values(items)) { it.lift = 0; }
  placeAll();

  // the safe band, in normalised device coordinates
  const introH = intro ? intro.getBoundingClientRect().height : 160;
  const topPx = 70, bottomPx = introH * (aspect >= 1.05 ? 0.8 : 1) + 8, sidePx = Math.max(16, w * 0.03);
  const safe = { x0: -1 + 2 * sidePx / w, x1: 1 - 2 * sidePx / w, y0: -1 + 2 * bottomPx / h, y1: 1 - 2 * topPx / h };
  const pts = fitPoints();
  const box = new THREE.Box3().setFromPoints(pts);
  camTarget.set((box.min.x + box.max.x) / 2, 0, (box.min.z + box.max.z) / 2);

  for (let pass = 0; pass < 5; pass++) {
    // the nearest distance at which everything fits the band's size
    let lo = 2, hi = 120;
    for (let i = 0; i < 28; i++) {
      const mid = (lo + hi) / 2;
      placeCamera(mid);
      const b = ndcBounds(pts);
      if (b.x1 - b.x0 <= safe.x1 - safe.x0 && b.y1 - b.y0 <= safe.y1 - safe.y0) hi = mid; else lo = mid;
    }
    camDist = hi;
    placeCamera(camDist);
    // then slide along the desk so the objects sit in the middle of the band
    const b = ndcBounds(pts);
    const visH = 2 * camDist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const dx = ((b.x0 + b.x1) / 2 - (safe.x0 + safe.x1) / 2) * visH * aspect / 2;
    const dy = ((b.y0 + b.y1) / 2 - (safe.y0 + safe.y1) / 2) * visH / 2 / Math.cos(TILT);
    camTarget.x += dx;
    camTarget.z -= dy;
  }
  placeCamera(camDist);
  for (const it of Object.values(items)) applyItem(it);
  setTime(timeNow);
  invalidate();
}

/* ---------- Light ----------

   One window, on the left wall behind the desk. Everything that lights the
   desk by day comes through it:
     - sun:  hard light through the panes (a spotlight projecting the window)
     - sky:  soft light from the same opening, blue-white by day, orange at
             sunset, deep blue after (the blue hour), almost nothing at night
     - room: a little bounce from the walls (hemisphere + environment)
   At night only the lamp is on, plus a trace of blue from the window.

   The time of day is one number, from 0 (day) through 1 (sunset) and
   1.35 (blue hour) to 2 (night). Sunrise runs the other way through the
   same window, from the other side of the frame. */

// a soft environment for reflections on the brass, the mug and the coffee
function makeEnvironment() {
  const W = 512, H = 256, c = makeCanvas(W, H), g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#d9d4cc'); sky.addColorStop(0.5, '#a9998a'); sky.addColorStop(0.52, '#4b3a2e'); sky.addColorStop(1, '#2a1d15');
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  g.fillStyle = '#ffffff'; g.fillRect(W * 0.66, H * 0.2, W * 0.1, H * 0.24); // the window
  const t = new THREE.CanvasTexture(c);
  t.mapping = THREE.EquirectangularReflectionMapping;
  t.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(t).texture;
  pmrem.dispose();
  return env;
}
scene.environment = makeEnvironment();

const hemi = new THREE.HemisphereLight(0xe8eef6, 0x4a3426, 0.5);
scene.add(hemi);

// window direction (from the desk toward the window), and its soft skylight
const WINDOW_DIR = new THREE.Vector3(-0.82, 0.48, -0.32).normalize();
const sky = new THREE.DirectionalLight(0xdfe8ff, 1);
sky.castShadow = true;
sky.shadow.mapSize.set(512, 512); // a small map blurs: soft window shadows
sky.shadow.camera.left = -12; sky.shadow.camera.right = 12;
sky.shadow.camera.top = 12; sky.shadow.camera.bottom = -12;
sky.shadow.camera.near = 1; sky.shadow.camera.far = 60;
sky.shadow.normalBias = 0.05;
const skyTarget = new THREE.Object3D();
scene.add(sky, skyTarget);
sky.target = skyTarget;

function windowTexture() {
  const S = 1024;
  const c = makeCanvas(S, S), g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
  const sharp = makeCanvas(S, S), gs = sharp.getContext('2d');
  gs.fillStyle = '#fff';
  const x0 = S * 0.24, y0 = S * 0.16, w = S * 0.52, h = S * 0.68, m = S * 0.016;
  const cols = 2, rows = 2;
  const pw = (w - m * (cols + 1)) / cols, ph = (h - m * (rows + 1)) / rows;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    gs.fillRect(x0 + m + i * (pw + m), y0 + m + j * (ph + m), pw, ph);
  }
  g.filter = 'blur(9px)';
  g.drawImage(sharp, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const sun = new THREE.SpotLight(0xfff1dc, 0, 0, 0.058, 0.08, 0); // narrow: the cone just covers the window
sun.map = windowTexture();
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 30; sun.shadow.camera.far = 140;
sun.shadow.normalBias = 0.04;
const sunTarget = new THREE.Object3D();
scene.add(sun, sunTarget);
sun.target = sunTarget;

// Sun position, as seen from the desk: `a` swings along the window
// (the evening sun stays near the window's axis, so its patch crosses the
// desk from left to right as it sinks; the morning sun comes from the
// other side), `el` is the height above the horizon.
const SUN_DIST = 50;
function sunDir(a, el) {
  const base = Math.atan2(-0.32, -0.82); // azimuth of the window
  const az = base + THREE.MathUtils.degToRad(a), e = THREE.MathUtils.degToRad(el);
  return new THREE.Vector3(Math.cos(e) * Math.cos(az), Math.sin(e), Math.cos(e) * Math.sin(az));
}

const C = (hex) => new THREE.Color(hex);
const mixC = (a, b, t) => a.clone().lerp(b, clamp01(t));

// keyframes along the time line: [time, values]
const KEYS = [
  { t: 0.0,  a: 18,  el: 46, sun: 3.4, sunC: C(0xfff1dc), sky: 1.05, skyC: C(0xdde7fb), hemi: 0.5,  env: 0.55, exp: 1.0 },
  { t: 0.45, a: -2,  el: 28, sun: 3.6, sunC: C(0xffd49a), sky: 0.85, skyC: C(0xf2e2cf), hemi: 0.42, env: 0.45, exp: 1.02 },
  { t: 0.8,  a: -6,  el: 17, sun: 3.4, sunC: C(0xff9248), sky: 0.6,  skyC: C(0xffb98a), hemi: 0.3,  env: 0.3,  exp: 1.1 },
  { t: 1.0,  a: -9,  el: 9,  sun: 0.0, sunC: C(0xff6a35), sky: 0.42, skyC: C(0xd7869a), hemi: 0.2,  env: 0.18, exp: 1.25 },
  { t: 1.35, a: -10, el: 4,  sun: 0.0, sunC: C(0xff6a35), sky: 0.34, skyC: C(0x5d78c4), hemi: 0.12, env: 0.08, exp: 1.55 },
  { t: 2.0,  a: -10, el: 2,  sun: 0.0, sunC: C(0xff6a35), sky: 0.16, skyC: C(0x3a4f8c), hemi: 0.09, env: 0.03, exp: 1.85 },
];
// sunrise comes up on the other side of the window
const KEYS_MORNING = [
  { t: 0.0,  a: 18,  el: 46, sun: 3.4, sunC: C(0xfff1dc), sky: 1.05, skyC: C(0xdde7fb), hemi: 0.5,  env: 0.55, exp: 1.0 },
  { t: 0.5,  a: 40,  el: 20, sun: 3.0, sunC: C(0xffe0b4), sky: 0.85, skyC: C(0xe9e4dc), hemi: 0.4,  env: 0.42, exp: 1.04 },
  { t: 0.85, a: 52,  el: 5,  sun: 2.2, sunC: C(0xffa868), sky: 0.55, skyC: C(0xf3b4a0), hemi: 0.26, env: 0.26, exp: 1.15 },
  { t: 1.0,  a: 56,  el: 0,  sun: 0.0, sunC: C(0xff8048), sky: 0.4,  skyC: C(0xb990b8), hemi: 0.18, env: 0.16, exp: 1.3 },
  { t: 1.35, a: 58,  el: -4, sun: 0.0, sunC: C(0xff8048), sky: 0.3,  skyC: C(0x5d78c4), hemi: 0.1,  env: 0.07, exp: 1.55 },
  { t: 2.0,  a: 58,  el: -8, sun: 0.0, sunC: C(0xff8048), sky: 0.16, skyC: C(0x3a4f8c), hemi: 0.09, env: 0.03, exp: 1.85 },
];
function sample(keys, t) {
  let i = 0;
  while (i < keys.length - 2 && t > keys[i + 1].t) i++;
  const k0 = keys[i], k1 = keys[i + 1];
  const u = smooth(clamp01((t - k0.t) / (k1.t - k0.t)));
  const out = {};
  for (const key of Object.keys(k0)) {
    if (key === 't') continue;
    out[key] = k0[key].isColor ? mixC(k0[key], k1[key], u) : lerp(k0[key], k1[key], u);
  }
  return out;
}

let lampOn = 0;
function setLamp(on) {
  lampOn = on;
  lampLight.intensity = on * 30;
  bulbLight.intensity = on * 5;
  bulbMat.emissiveIntensity = on * 6;
  shadeInnerMat.emissiveIntensity = on * 1.1;
  glow.material.opacity = on * 0.9;
}

let timeNow = 0, morning = false;
// the window itself: a fixed opening up and to the left, behind the desk.
// The sun's rays pass through it, so its patch on the desk moves and
// stretches as the sun moves and sinks.
const WINDOW_POS = new THREE.Vector3(-8.5, 4.2, -3.5);
function setTime(t) {
  timeNow = t;
  const k = sample(morning ? KEYS_MORNING : KEYS, t);
  const dir = sunDir(k.a, Math.max(k.el, 0.5));
  sunTarget.position.copy(WINDOW_POS);
  sun.position.copy(WINDOW_POS).addScaledVector(dir, SUN_DIST);
  sun.intensity = k.sun;
  sun.color.copy(k.sunC);
  skyTarget.position.copy(camTarget);
  sky.position.copy(camTarget).addScaledVector(WINDOW_DIR, 20);
  sky.intensity = k.sky;
  sky.color.copy(k.skyC);
  hemi.intensity = k.hemi;
  hemi.color.copy(k.skyC);
  hemi.groundColor.copy(mixC(C(0x4a3426), C(0x1a110c), t / 2));
  scene.environmentIntensity = k.env;
  renderer.toneMappingExposure = k.exp;
  scene.background.copy(mixC(C(0x1d140e), C(0x07050a), t / 2));
}

function flicker(v) { // the lamp catches: on, off, on, then settles
  if (v <= 0) return 0;
  if (v < 0.08) return 0.75;
  if (v < 0.16) return 0.08;
  if (v < 0.22) return 0.9;
  return lerp(0.9, 1, smooth(range(v, 0.22, 1)));
}

let isNight = window.currentTheme && window.currentTheme() === 'dark';
function setInstant() {
  setTime(isNight ? 2 : 0);
  setLamp(isNight ? 1 : 0);
  invalidate();
}

let lightAnim = null;
document.addEventListener('themechange', () => {
  const night = window.currentTheme() === 'dark';
  if (night === isNight) return;
  isNight = night;
  if (lightAnim) movers.delete(lightAnim);
  if (reduceMotion.matches) { setInstant(); return; }
  const start = performance.now();
  const from = timeNow, lampFrom = lampOn;
  if (night) {
    // evening: the sun slides along the window and sets, the blue hour, then the lamp
    morning = false;
    const dur = 7000 * (2 - from) / 2 + 400;
    lightAnim = (now) => {
      const p = clamp01((now - start) / dur);
      setTime(lerp(from, 2, p));
      setLamp(Math.max(lampFrom * (1 - p), flicker(range(p, 0.62, 0.9))));
      return p < 1;
    };
  } else {
    // morning: the lamp goes off, the window turns blue, the sun comes up on the other side
    morning = true;
    const dur = 6000 * from / 2 + 400;
    lightAnim = (now) => {
      const p = clamp01((now - start) / dur);
      setLamp(lampFrom * (1 - smooth(range(p, 0, 0.12))));
      setTime(lerp(from, 0, p));
      return p < 1;
    };
  }
  animate(lightAnim);
});

/* ---------- Pointer: hover, tip, click ---------- */

const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let hovered = null;

function pick(clientX, clientY) {
  ndc.set((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const meshes = [];
  for (const it of Object.values(items)) it.group.traverse((o) => { if (o.isMesh) meshes.push(o); });
  lamp.group.traverse((o) => { if (o.isMesh) meshes.push(o); }); // the lamp hides what is behind it
  const hit = ray.intersectObjects(meshes, false)[0];
  return hit ? (hit.object.userData.action || null) : null;
}

function itemMover(it) {
  if (it.moving) return;
  it.moving = true;
  animate(() => {
    it.lift += (it.liftTarget - it.lift) * 0.2;
    it.open += (it.openTarget - it.open) * (reduceMotion.matches ? 1 : 0.16);
    if (Math.abs(it.liftTarget - it.lift) < 0.001) it.lift = it.liftTarget;
    if (Math.abs(it.openTarget - it.open) < 0.002) it.open = it.openTarget;
    applyItem(it);
    const still = it.lift === it.liftTarget && it.open === it.openTarget;
    if (still) it.moving = false;
    return !still;
  });
}

function setHover(action) {
  if (action === hovered) return;
  if (hovered) { items[hovered].liftTarget = 0; itemMover(items[hovered]); }
  hovered = action;
  canvas.style.cursor = action ? 'pointer' : '';
  if (action) { items[action].liftTarget = 0.09; itemMover(items[action]); }
  if (tip) {
    tip.textContent = action ? items[action].label : '';
    tip.classList.toggle('is-on', !!action);
  }
}

canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || root.classList.contains('panel-open')) return;
  setHover(pick(e.clientX, e.clientY));
  if (tip && hovered) {
    tip.style.left = e.clientX + 'px';
    tip.style.top = (e.clientY - 14) + 'px';
  }
});
canvas.addEventListener('pointerleave', () => setHover(null));
canvas.addEventListener('click', (e) => {
  const action = pick(e.clientX, e.clientY);
  if (action) deskOpen(action);
});

// lift the object toward the camera, then open its panel
function deskOpen(action) {
  const it = items[action];
  setHover(null);
  if (!it || reduceMotion.matches) { window.openPanel(action); if (it) { it.openTarget = 1; itemMover(it); } return; }
  it.openTarget = 1;
  itemMover(it);
  setTimeout(() => window.openPanel(action), 260);
}
window.deskOpen = deskOpen;

document.addEventListener('panelclose', (e) => {
  const it = items[e.detail];
  if (it) { it.openTarget = 0; itemMover(it); }
});

/* ---------- Start ---------- */

async function start() {
  // the printed surfaces need the web fonts; wait briefly for them
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load(`400 40px ${DISPLAY}`),
        document.fonts.load(`400 20px ${BODY}`),
        document.fonts.load(`500 20px ${BODY}`),
        document.fonts.load(`400 20px ${MONO}`),
      ]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch (e) {}
  buildPrinted();
  fitCamera();
  setInstant();
  // a panel opened from the address (#projects) shows its object lifted
  const open = Object.keys(items).find((k) => document.getElementById('panel-' + k)?.open);
  if (open) { items[open].openTarget = 1; itemMover(items[open]); }
}
start();

window.addEventListener('resize', fitCamera);
document.addEventListener('visibilitychange', () => { if (!document.hidden) invalidate(); });
