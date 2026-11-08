/* The desk and the book.

   A camera looks straight down at a desk. The desk is a photograph
   (images/desk.jpg) when it exists, otherwise a procedural oak top.
   A hardcover book lies on it, modelled in code: a back board, a front
   cover that swings open, and four paper leaves that bend as they turn.

   In the hero the book lies closed to one side. In the projects section the
   book slides to the centre and scrolling turns its pages:

     spread 0  title page   | contents
     spread 1  lightning    | lightning text
     spread 2  hazard       | hazard text
     spread 3  flood        | flood text
     spread 4  closing page | endpaper

   Pages are drawn on 2D canvases and used as textures. The same projects are
   written in the HTML catalogue for screen readers, phones and no-WebGL. */

import * as THREE from './vendor/three.module.min.js';

const root = document.documentElement;
const canvas = document.getElementById('desk');
const workEl = document.getElementById('work');
const heroEl = document.getElementById('top');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const bookQuery = window.matchMedia('(min-width: 760px)');

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
} catch (e) {
  throw e; // the page keeps its catalogue and the plain desk colour
}
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const useBook = () => bookQuery.matches;
function syncMode() { root.classList.toggle('has-book', useBook()); }
syncMode();
bookQuery.addEventListener('change', () => { syncMode(); });

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
camera.up.set(0, 0, -1); // looking down, screen-up is -z

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;

/* ---------- Desk ---------- */

const DESK_W = 16;
let deskAspect = 1344 / 832;
const deskMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
const desk = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), deskMat);
desk.rotation.x = -Math.PI / 2;
scene.add(desk);
function sizeDesk() { desk.scale.set(DESK_W, DESK_W / deskAspect, 1); }
sizeDesk();

const shadowCatcher = new THREE.Mesh(
  new THREE.PlaneGeometry(DESK_W, DESK_W),
  new THREE.ShadowMaterial({ opacity: 0.32 })
);
shadowCatcher.rotation.x = -Math.PI / 2;
shadowCatcher.position.y = 0.002;
shadowCatcher.receiveShadow = true;
scene.add(shadowCatcher);

function hash(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

// Procedural oak, used until images/desk.jpg exists
function oakTexture() {
  const W = 1024, H = Math.round(W / deskAspect);
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const img = g.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      // planks run left to right; the grain wobbles along them
      const plank = Math.floor(y / (H / 5));
      const yy = y + noise(x * 0.004 + plank * 9, plank) * 40;
      const grain = Math.sin(yy * 0.55 + noise(x * 0.01, yy * 0.05 + plank * 3) * 6) * 0.5 + 0.5;
      const fine = noise(x * 0.08, yy * 0.9) * 0.5;
      const shade = 0.72 + grain * 0.16 + fine * 0.12 + (hash(plank, 3) - 0.5) * 0.1;
      const edge = (y % Math.round(H / 5)) < 2 ? 0.55 : 1;
      const i = (y * W + x) * 4;
      img.data[i] = 112 * shade * edge;
      img.data[i + 1] = 80 * shade * edge;
      img.data[i + 2] = 58 * shade * edge;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  // light falling in from the top left
  const light = g.createRadialGradient(W * 0.2, H * 0.1, 0, W * 0.4, H * 0.4, W * 0.9);
  light.addColorStop(0, 'rgba(255,240,220,0.18)');
  light.addColorStop(1, 'rgba(0,0,0,0.25)');
  g.fillStyle = light;
  g.fillRect(0, 0, W, H);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
deskMat.map = oakTexture();

new THREE.TextureLoader().load('images/desk.jpg', (t) => {
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  deskAspect = t.image.width / t.image.height;
  sizeDesk();
  deskMat.map = t;
  deskMat.needsUpdate = true;
  resize();
}, undefined, () => {});

/* ---------- Lights ---------- */

const hemi = new THREE.HemisphereLight(0xffffff, 0x8a7a6a, 1.4);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.position.set(-6, 10, -5); // from the top left, like the window in the render
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -6; sun.shadow.camera.right = 6;
sun.shadow.camera.top = 5; sun.shadow.camera.bottom = -5;
sun.shadow.camera.near = 1; sun.shadow.camera.far = 30;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.02;
sun.shadow.radius = 6;
scene.add(sun);
// at night a desk lamp lights the book
const lamp = new THREE.PointLight(0xffd9a8, 0, 14, 1.6);
lamp.position.set(-1.5, 5, -1.5);
scene.add(lamp);

function applyTheme() {
  const dark = (window.currentTheme ? window.currentTheme() : 'light') === 'dark';
  // night: a dim room and a warm lamp over the book
  deskMat.color.setRGB(dark ? 0.42 : 1, dark ? 0.38 : 1, dark ? 0.4 : 1);
  hemi.intensity = dark ? 0.75 : 1.4;
  sun.color.set(dark ? 0xffe6c8 : 0xffffff);
  sun.intensity = dark ? 2.0 : 2.2;
  lamp.intensity = dark ? 18 : 0;
  shadowCatcher.material.opacity = dark ? 0.45 : 0.32;
  requestRender();
}
document.addEventListener('themechange', applyTheme);

/* ---------- Pages, drawn on canvases ---------- */

// landscape pages, A4 turned on its side, like a catalogue
const PAGE_W = 3.4, PAGE_H = 3.4 / Math.SQRT2;
const PX_W = 1448, PX_H = Math.round(PX_W * PAGE_H / PAGE_W);
const PAPER = '#F4F2EC', INK = '#1B2733', INK_DIM = '#4A5B6E', ORANGE = '#D9531F', CLOTH = '#23415E';

const PROJECTS = [
  {
    key: 'lightning', num: '01', image: 'lightning.jpg', fact: '20 years of strikes, 1990 to 2010',
    title: 'Lightning that follows lightning',
    text: "Lightning doesn't fall at random. When one strike hits, more tend to follow nearby and soon after, a bit like aftershocks after an earthquake. In my master's thesis I'm measuring how much of that clustering comes from the storm itself (heat, humidity, mountains) and how much is one strike making the next one more likely. The data: twenty years of strikes over two regions of southern France.",
    meta: "Master's thesis, in progress, 2026 to 2027",
    link: null,
  },
  {
    key: 'hazard', num: '02', image: 'network.jpg', fact: 'Nearest helper, found on the map',
    title: 'Community Hazard Response Platform',
    text: "When a disaster hits a neighbourhood, like a flood or a wildfire, much of the first help comes from the people living next door. But those who need help and those who can give it often don't know about each other. We built a platform where residents report what they need, volunteers say what they can offer, and a map-aware database pairs each request with the nearest helper.",
    meta: 'Group project, NOVA IMS Lisbon, 2026',
    link: 'https://github.com/Community-Hazard-Response-Platform/Community-Hazard-Response-Platform',
  },
  {
    key: 'flood', num: '03', image: 'flood.jpg', fact: 'Sentinel-1 and Sentinel-2 imagery',
    title: 'Mapping the Valencia flood from space',
    text: "In October 2024 a storm flooded large parts of Valencia. I used satellite images to map which areas were under water. The tricky part: the water was so full of mud that the usual methods didn't recognise it as water. Adding a measure that picks up mud fixed it, and it became one of the most useful signals for the model.",
    meta: 'Team project, University of Münster, 2026',
    link: 'https://github.com/ricardosp4/sentinel-flood-rf-valencia',
  },
];

const images = {};
function loadImage(name) {
  if (images[name] !== undefined) return images[name];
  images[name] = null;
  const img = new Image();
  img.onload = () => { images[name] = img; redrawAll(); };
  img.src = 'images/' + name;
  return null;
}

const contentsHits = []; // rows on the contents page: { y0, y1, spread }

function wrap(g, text, x, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (g.measureText(test).width > maxW && line) {
      g.fillText(line, x, y);
      line = w; y += lineH;
    } else line = test;
  }
  if (line) g.fillText(line, x, y);
  return y + lineH;
}

function paper(g, side) {
  g.fillStyle = PAPER;
  g.fillRect(0, 0, PX_W, PX_H);
  // the page curves into the gutter, so it darkens near the spine
  const gx = side === 'right' ? 0 : PX_W;
  const grad = g.createLinearGradient(gx, 0, side === 'right' ? 90 : PX_W - 90, 0);
  grad.addColorStop(0, 'rgba(60,45,30,0.16)');
  grad.addColorStop(1, 'rgba(60,45,30,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, PX_W, PX_H);
}

function folio(g, n) {
  g.fillStyle = INK_DIM;
  g.font = '24px "IBM Plex Mono", monospace';
  g.textAlign = 'center';
  g.fillText(String(n), PX_W / 2, PX_H - 60);
  g.textAlign = 'left';
}

function studioBackdrop(g, x, y, w, h) {
  const grad = g.createLinearGradient(0, y, 0, y + h);
  grad.addColorStop(0, '#EEF2F3');
  grad.addColorStop(1, '#C3CDD3');
  g.fillStyle = grad;
  g.fillRect(x, y, w, h);
}

function coverImage(g, img, x, y, w, h) {
  const s = Math.max(w / img.width, h / img.height);
  const sw = w / s, sh = h / s;
  g.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}

const DRAW = {
  coverOut(g) {
    g.fillStyle = CLOTH;
    g.fillRect(0, 0, PX_W, PX_H);
    // cloth weave
    g.globalAlpha = 0.05;
    g.fillStyle = '#000';
    for (let y = 0; y < PX_H; y += 3) g.fillRect(0, y, PX_W, 1);
    g.globalAlpha = 1;
    g.strokeStyle = 'rgba(244,242,236,0.35)';
    g.lineWidth = 2;
    g.strokeRect(56, 56, PX_W - 112, PX_H - 112);
    g.fillStyle = '#F4F2EC';
    g.font = '400 120px "Fraunces", Georgia, serif';
    g.fillText('Selected work', 110, 300);
    g.fillStyle = ORANGE;
    g.beginPath(); g.arc(122, 370, 9, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(244,242,236,0.85)';
    g.font = '34px "IBM Plex Sans", sans-serif';
    g.fillText('Ricardo Sales Piquer', 110, PX_H - 130);
    g.textAlign = 'right';
    g.fillText('2026', PX_W - 110, PX_H - 130);
    g.textAlign = 'left';
  },
  title(g) {
    paper(g, 'left');
    g.fillStyle = INK;
    g.font = '400 104px "Fraunces", Georgia, serif';
    g.fillText('Selected work', 112, 330);
    g.fillStyle = INK_DIM;
    g.font = '36px "IBM Plex Sans", sans-serif';
    g.fillText('Ricardo Sales Piquer', 116, 410);
    g.font = '26px "IBM Plex Mono", monospace';
    g.fillText('Three projects, told simply', 116, PX_H - 150);
    g.fillText('2026', 116, PX_H - 106);
  },
  contents(g) {
    paper(g, 'right');
    g.fillStyle = INK;
    g.font = '400 80px "Fraunces", Georgia, serif';
    g.fillText('Contents', 120, 190);
    contentsHits.length = 0;
    let y = 330;
    PROJECTS.forEach((p, i) => {
      const top = y - 56;
      g.fillStyle = ORANGE;
      g.font = '28px "IBM Plex Mono", monospace';
      g.fillText(p.num, 120, y);
      g.fillStyle = INK;
      g.font = '400 50px "Fraunces", Georgia, serif';
      const end = wrap(g, p.title, 210, y, PX_W - 440, 60);
      g.fillStyle = INK_DIM;
      g.font = '28px "IBM Plex Mono", monospace';
      g.textAlign = 'right';
      g.fillText(String(2 + i * 2), PX_W - 120, y);
      g.textAlign = 'left';
      g.font = '28px "IBM Plex Sans", sans-serif';
      g.fillText(p.meta, 210, end + 2);
      const bottom = end + 36;
      g.strokeStyle = 'rgba(27,39,51,0.15)';
      g.lineWidth = 2;
      g.beginPath(); g.moveTo(120, bottom); g.lineTo(PX_W - 120, bottom); g.stroke();
      contentsHits.push({ y0: top, y1: bottom, spread: i + 1 });
      y = bottom + 84;
    });
    g.fillStyle = INK_DIM;
    g.font = '26px "IBM Plex Sans", sans-serif';
    g.fillText('Click a title to jump to it.', 120, PX_H - 100);
    folio(g, 1);
  },
  image(g, p, n) {
    paper(g, 'left');
    const x = 80, y = 80, w = PX_W - 160, h = PX_H - 220;
    const img = loadImage(p.image);
    if (img) coverImage(g, img, x, y, w, h);
    else {
      studioBackdrop(g, x, y, w, h);
      g.fillStyle = INK_DIM;
      g.font = '22px "IBM Plex Mono", monospace';
      g.fillText('images/' + p.image, x + 24, y + 44);
    }
    // the fact chip
    g.font = '24px "IBM Plex Mono", monospace';
    const tw = g.measureText(p.fact).width;
    const cx = x + 28, cy = y + h - 84;
    g.fillStyle = 'rgba(244,242,236,0.88)';
    g.beginPath(); g.roundRect(cx, cy, tw + 72, 56, 28); g.fill();
    g.fillStyle = ORANGE;
    g.beginPath(); g.arc(cx + 30, cy + 28, 7, 0, Math.PI * 2); g.fill();
    g.fillStyle = INK;
    g.fillText(p.fact, cx + 50, cy + 37);
    folio(g, n);
  },
  text(g, p, n) {
    paper(g, 'right');
    const left = 120, colW = 440, right = 640, rightW = PX_W - right - 110;
    g.fillStyle = ORANGE;
    g.font = '28px "IBM Plex Mono", monospace';
    g.fillText(p.num, left, 170);
    g.fillStyle = INK;
    g.font = '400 60px "Fraunces", Georgia, serif';
    wrap(g, p.title, left, 260, colW, 70);
    g.fillStyle = INK_DIM;
    g.font = '26px "IBM Plex Mono", monospace';
    wrap(g, p.meta, left, PX_H - 190, colW, 38);
    g.strokeStyle = 'rgba(27,39,51,0.12)';
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(right - 60, 140); g.lineTo(right - 60, PX_H - 140); g.stroke();
    g.fillStyle = '#2C3B4C';
    g.font = '32px "IBM Plex Sans", sans-serif';
    wrap(g, p.text, right, 262, rightW, 52);
    folio(g, n);
  },
  closing(g) {
    paper(g, 'left');
    g.fillStyle = INK;
    g.font = '400 72px "Fraunces", Georgia, serif';
    let y = wrap(g, 'There is more on GitHub.', 120, 330, PX_W - 240, 84);
    g.fillStyle = INK_DIM;
    g.font = '31px "IBM Plex Sans", sans-serif';
    y = wrap(g, 'Code, notebooks and the R package stevents live at github.com/ricardosp4. For anything else, write to me.', 120, y + 30, 900, 50);
    g.fillStyle = INK;
    g.font = '28px "IBM Plex Mono", monospace';
    g.fillText('ricardosalespiquer@gmail.com', 120, y + 70);
    folio(g, 8);
  },
  endpaper(g) {
    g.fillStyle = '#E9E6DE';
    g.fillRect(0, 0, PX_W, PX_H);
    g.strokeStyle = 'rgba(35,65,94,0.12)';
    g.lineWidth = 2;
    // a quiet contour pattern on the endpaper
    for (let k = 0; k < 18; k++) {
      g.beginPath();
      for (let x = 0; x <= PX_W; x += 16) {
        const y = 80 + k * 72 + Math.sin(x * 0.006 + k * 0.7) * 26 + noise(x * 0.004, k) * 40;
        x ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.stroke();
    }
  },
};

const pageCanvases = [];
function makePage(draw) {
  const c = document.createElement('canvas');
  c.width = PX_W; c.height = PX_H;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const entry = { c, tex, draw };
  pageCanvases.push(entry);
  draw(c.getContext('2d'));
  return tex;
}
function redrawAll() {
  for (const p of pageCanvases) {
    const g = p.c.getContext('2d');
    g.clearRect(0, 0, PX_W, PX_H);
    p.draw(g);
    p.tex.needsUpdate = true;
  }
  requestRender();
}
if (document.fonts) {
  Promise.all([
    document.fonts.load('400 64px "Fraunces"'),
    document.fonts.load('31px "IBM Plex Sans"'),
    document.fonts.load('24px "IBM Plex Mono"'),
  ]).then(redrawAll, () => {});
}

/* ---------- The book ---------- */

const book = new THREE.Group();
scene.add(book);

const BOARD = 0.05, LEAF_T = 0.007, N_LEAVES = 4, SEGMENTS = 30;
const COVER_W = PAGE_W + 0.08, COVER_H = PAGE_H + 0.14;
const STACK_BASE = BOARD;
const clothMat = new THREE.MeshStandardMaterial({ color: CLOTH, roughness: 0.85 });
const edgeMat = new THREE.MeshStandardMaterial({ color: 0xEDE9E0, roughness: 0.95 });

function flipX(tex) {
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.x = -1;
  tex.offset.x = 1;
  return tex;
}

// back board, its inside is the endpaper (the last right-hand page)
const backBoard = new THREE.Mesh(
  new THREE.BoxGeometry(COVER_W, BOARD, COVER_H),
  [clothMat, clothMat,
    new THREE.MeshStandardMaterial({ map: makePage(DRAW.endpaper), roughness: 0.9 }),
    clothMat, clothMat, clothMat]
);
backBoard.position.set(COVER_W / 2, BOARD / 2, 0);
backBoard.castShadow = true; backBoard.receiveShadow = true;
book.add(backBoard);

// front cover, a rigid board on a hinge at the spine
const yClosed = BOARD + N_LEAVES * LEAF_T + 0.006 + BOARD / 2;
const yOpen = BOARD / 2;
const coverPivot = new THREE.Group();
coverPivot.position.y = (yClosed + yOpen) / 2;
book.add(coverPivot);
// the inside face of the board comes out rotated half a turn; turn it back
const coverIn = makePage(DRAW.title);
coverIn.wrapS = coverIn.wrapT = THREE.RepeatWrapping;
coverIn.repeat.set(-1, -1);
coverIn.offset.set(1, 1);
const cover = new THREE.Mesh(
  new THREE.BoxGeometry(COVER_W, BOARD, COVER_H),
  [clothMat, clothMat,
    new THREE.MeshStandardMaterial({ map: makePage(DRAW.coverOut), roughness: 0.8 }),
    new THREE.MeshStandardMaterial({ map: coverIn, roughness: 0.9 }),
    clothMat, clothMat]
);
cover.position.set(COVER_W / 2, (yClosed - yOpen) / 2, 0);
cover.castShadow = true; cover.receiveShadow = true;
coverPivot.add(cover);

// paper leaves: front = right-hand page, back = next left-hand page
const leafSpecs = [
  { front: DRAW.contents, back: (g) => DRAW.image(g, PROJECTS[0], 2) },
  { front: (g) => DRAW.text(g, PROJECTS[0], 3), back: (g) => DRAW.image(g, PROJECTS[1], 4) },
  { front: (g) => DRAW.text(g, PROJECTS[1], 5), back: (g) => DRAW.image(g, PROJECTS[2], 6) },
  { front: (g) => DRAW.text(g, PROJECTS[2], 7), back: DRAW.closing },
];
const leaves = leafSpecs.map((spec, i) => {
  const geo = new THREE.PlaneGeometry(PAGE_W, PAGE_H, SEGMENTS, 1);
  geo.rotateX(-Math.PI / 2);
  geo.translate(PAGE_W / 2, 0, 0);
  const baseX = Float32Array.from({ length: geo.attributes.position.count }, (_, k) => geo.attributes.position.getX(k));
  const front = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: makePage(spec.front), roughness: 0.92, side: THREE.FrontSide }));
  const back = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: flipX(makePage(spec.back)), roughness: 0.92, side: THREE.BackSide }));
  for (const m of [front, back]) { m.castShadow = true; m.receiveShadow = true; book.add(m); }
  front.userData.leaf = i; back.userData.leaf = i;
  front.userData.face = 'front'; back.userData.face = 'back';
  return { geo, baseX, front, back, angle: -1 };
});

const colX = new Float32Array(SEGMENTS + 1);
const colY = new Float32Array(SEGMENTS + 1);
function bendLeaf(leaf, i, angle) {
  if (Math.abs(angle - leaf.angle) < 1e-4) return;
  leaf.angle = angle;
  // stack height: unturned leaves pile on the right, turned ones on the left
  const yRight = STACK_BASE + LEAF_T * (N_LEAVES - i);
  const yLeft = STACK_BASE + LEAF_T * (i + 1);
  const a = angle / Math.PI;
  const lift = yRight + (yLeft - yRight) * a;
  // the free edge lags behind the spine, which curls the page
  const curl = 0.85 * Math.sin(angle);
  const dx = PAGE_W / SEGMENTS;
  colX[0] = 0; colY[0] = 0;
  for (let j = 0; j < SEGMENTS; j++) {
    const phi = angle - curl * ((j + 0.5) / SEGMENTS);
    colX[j + 1] = colX[j] + dx * Math.cos(phi);
    colY[j + 1] = colY[j] + dx * Math.sin(phi);
  }
  const pos = leaf.geo.attributes.position;
  for (let k = 0; k < pos.count; k++) {
    const j = Math.round((leaf.baseX[k] / PAGE_W) * SEGMENTS);
    pos.setX(k, colX[j]);
    pos.setY(k, colY[j] + lift);
  }
  pos.needsUpdate = true;
  leaf.geo.computeVertexNormals();
  leaf.geo.computeBoundingSphere();
}

/* ---------- Book state ---------- */

// F runs from 0 (closed) to 5 (the last spread): 1 for the cover, 1 per leaf
const TURNS = 1 + N_LEAVES;
const SPREAD_LABELS = ['Contents', ...PROJECTS.map((p) => p.num + '  ' + p.title), 'The end'];
const state = { F: 0, place: 0 }; // place: 0 hero pose, 1 reading pose

function applyBook() {
  const coverAngle = Math.PI * smooth(clamp01(state.F));
  coverPivot.rotation.z = coverAngle;
  leaves.forEach((leaf, i) => bendLeaf(leaf, i, Math.PI * smooth(clamp01(state.F - 1 - i))));

  // closed, the book sits centred on itself; open, the spine is the centre
  const open = smooth(clamp01(state.F));
  const p = smooth(state.place);
  const rest = heroRest();
  book.position.set(
    lerp(rest.x, 0, p) - (COVER_W / 2) * (1 - open),
    0,
    lerp(rest.z, 0.15, p)
  );
  book.rotation.y = lerp(rest.rot, 0, p);
}

function heroRest() {
  const aspect = camera.aspect;
  if (aspect < 0.9) return { x: 0, z: 1.8, rot: -0.1 };
  return { x: 1.2, z: 0.3, rot: -0.12 };
}

/* ---------- Camera ---------- */

const tanHalf = () => Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
function heroHeight() {
  // fill the screen with desk, never past its edges
  const depth = DESK_W / deskAspect;
  return Math.min(depth / (2 * tanHalf()), DESK_W / (2 * tanHalf() * camera.aspect)) * 0.96;
}
function readHeight() {
  const needDepth = COVER_H + 1.7;
  const needWidth = 2 * COVER_W + 0.6;
  return Math.min(heroHeight(), Math.max(needDepth / (2 * tanHalf()), needWidth / (2 * tanHalf() * camera.aspect)));
}

const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
window.addEventListener('pointermove', (e) => {
  pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
  pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
  requestRender();
});

function placeCamera() {
  const p = smooth(state.place);
  const h = lerp(heroHeight(), readHeight(), p);
  const lean = reduceMotion ? 0 : 0.012 * h;
  camera.position.set(pointer.x * lean, h, pointer.y * lean + 0.001);
  camera.lookAt(pointer.x * lean * 0.5, 0, pointer.y * lean * 0.5);
}

/* ---------- Scroll ---------- */

const HOLD = 0.3; // each spread holds still for 2 x HOLD of its scroll segment
const U_MAX = TURNS + HOLD;
function plateau(u) {
  const k = Math.floor(u), f = u - k;
  return k + clamp01((f - HOLD) / (1 - 2 * HOLD));
}
function workRange() {
  const top = workEl.getBoundingClientRect().top + window.scrollY;
  return { top, span: workEl.offsetHeight - window.innerHeight };
}
function scrollForSpread(k) {
  // spread k is F = k + 1; its plateau is centred on u = k + 1
  const { top, span } = workRange();
  return top + ((k + 1) / U_MAX) * span;
}

let target = { F: 0, place: 0 };
function readScroll() {
  const vh = window.innerHeight;
  const r = workEl.getBoundingClientRect();
  if (!useBook()) {
    target = { F: 0, place: 0 };
    return;
  }
  // the book slides to the centre as the projects section comes up
  const enter = clamp01((vh - r.top) / vh);
  const q = clamp01(-r.top / Math.max(1, r.height - vh));
  target = { place: enter, F: plateau(q * U_MAX) };
}

/* ---------- Interface ---------- */

const ui = document.querySelector('.book-ui');
const label = ui && ui.querySelector('.book-ui__label');
const ghLink = ui && ui.querySelector('.book-ui__link');
function currentSpread() { return Math.max(0, Math.min(N_LEAVES, Math.round(state.F) - 1)); }
let shownSpread = -2;
function syncUI() {
  if (!ui) return;
  const s = state.F < 0.5 ? -1 : currentSpread();
  if (s === shownSpread) return;
  shownSpread = s;
  label.textContent = s < 0 ? 'Scroll to open the book' : SPREAD_LABELS[s];
  const proj = s >= 1 && s <= PROJECTS.length ? PROJECTS[s - 1] : null;
  if (proj && proj.link) { ghLink.href = proj.link; ghLink.hidden = false; }
  else ghLink.hidden = true;
}
function goToSpread(k) {
  k = Math.max(0, Math.min(N_LEAVES, k));
  window.scrollTo({ top: scrollForSpread(k), behavior: reduceMotion ? 'auto' : 'smooth' });
}
function step(dir) {
  const s = state.F < 0.5 ? -1 : currentSpread();
  goToSpread(s + dir);
}
if (ui) ui.querySelectorAll('.book-ui__btn').forEach((b) => b.addEventListener('click', () => step(Number(b.dataset.dir))));

function workPinned() {
  const r = workEl.getBoundingClientRect();
  return useBook() && r.top <= 1 && r.bottom >= window.innerHeight - 1;
}
window.addEventListener('keydown', (e) => {
  if (!workPinned() || e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
  if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
});

// clicking a page: the contents rows jump, otherwise left half back, right half on
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const pickables = leaves.flatMap((l) => [l.front, l.back]).concat([cover]);
function pick(e) {
  ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  return raycaster.intersectObjects(pickables, false)[0];
}
canvas.style.pointerEvents = 'auto';
workEl.addEventListener('click', (e) => {
  if (!workPinned() || e.target.closest('.book-ui, a, button')) return;
  const hit = pick(e);
  if (!hit) return;
  if (hit.object.userData.leaf === 0 && hit.object.userData.face === 'front' && hit.uv) {
    const py = (1 - hit.uv.y) * PX_H;
    const row = contentsHits.find((r) => py >= r.y0 && py <= r.y1);
    if (row) { goToSpread(row.spread); return; }
  }
  const local = book.worldToLocal(hit.point.clone());
  step(local.x < 0 ? -1 : 1);
});
workEl.addEventListener('pointermove', (e) => {
  if (!workPinned()) { workEl.style.cursor = ''; return; }
  workEl.style.cursor = pick(e) ? 'pointer' : '';
});

/* ---------- Size and loop ---------- */

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  requestRender();
}
window.addEventListener('resize', resize);
window.addEventListener('scroll', requestRender, { passive: true });

let needsRender = true;
function requestRender() { needsRender = true; }

function deskVisible() {
  const vh = window.innerHeight;
  const hr = heroEl.getBoundingClientRect();
  const wr = workEl.getBoundingClientRect();
  return hr.bottom > 0 || (useBook() && wr.top < vh && wr.bottom > 0);
}

resize();
applyTheme();
readScroll();
state.F = target.F; state.place = target.place;

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  readScroll();
  const k = reduceMotion ? 1 : 1 - Math.exp(-dt * 7);
  const before = state.F + state.place + pointer.x + pointer.y;
  state.F += (target.F - state.F) * k;
  state.place += (target.place - state.place) * k;
  pointer.x += (pointer.tx - pointer.x) * (reduceMotion ? 0 : 1 - Math.exp(-dt * 3));
  pointer.y += (pointer.ty - pointer.y) * (reduceMotion ? 0 : 1 - Math.exp(-dt * 3));
  const moved = Math.abs(state.F + state.place + pointer.x + pointer.y - before) > 1e-5;

  if ((needsRender || moved) && deskVisible()) {
    applyBook();
    placeCamera();
    renderer.render(scene, camera);
    syncUI();
    needsRender = false;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
