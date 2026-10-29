// Escena 3D: renderer, cámara orbital, relieve (mapa de alturas), cielo con ciclo día/noche,
// cordillera, árboles decorativos, capas de casillas sobre el terreno y selección por rayo.
import * as THREE from '../vendor/three.module.min.js';
import { Builder, rng, mats } from './geom.js';
import { GRID_N } from './units.js';

export const N = GRID_N;
const K = N / 64; // el relieve se diseñó para 64 casillas; se escala al tamaño del mapa
export const tw = (i) => i - N / 2 + 0.5; // centro de casilla -> mundo
export const wt = (v) => Math.floor(v + N / 2); // mundo -> casilla
const M = 40; // margen de terreno fuera de la ciudad

export const S = {
  renderer: null, scene: null, camera: null, canvas: null, sun: null, hemi: null,
  cam: { x: 0, z: 0, yaw: Math.PI / 4, pitch: 0.9, dist: 40, ty: 0 },
  root: new THREE.Group(),
  time: 9.5, dayCycle: true, terrain: 'valle', night: 0,
};

// ---------------- relieve ----------------
const HV = new Float32Array((N + 1) * (N + 1)); // alturas en las esquinas de las casillas (con vías niveladas)
const HV0 = new Float32Array((N + 1) * (N + 1)); // terreno original, sin nivelar
let noiseSeed = 7;

function hash2(ix, iz) {
  let h = Math.imul(ix, 374761393) + Math.imul(iz, 668265263) + Math.imul(noiseSeed, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz), b = hash2(ix + 1, iz), c = hash2(ix, iz + 1), d = hash2(ix + 1, iz + 1);
  return (a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz) * 2 - 1;
}
function fbm(x, z) {
  return vnoise(x, z) * 0.55 + vnoise(x * 2.03, z * 2.03) * 0.28 + vnoise(x * 4.1, z * 4.1) * 0.17;
}
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Altura analítica del terreno en coordenadas de mundo.
export function terrainFn(x, z) {
  x /= K; z /= K;
  return terrainBase(x, z) * (S.terrain === 'llano' ? 1 : 0.6);
}
function terrainBase(x, z) {
  if (S.terrain === 'llano') {
    return fbm(x * 0.05, z * 0.05) * 0.5 + 3 * sstep(34, 60, Math.max(Math.abs(x), Math.abs(z)));
  }
  // Valle andino: fondo plano, laderas al oriente y occidente, colinas al norte y sur
  const ax = Math.abs(x + fbm(z * 0.03, 3.1) * 5), az = Math.abs(z);
  let h = 7.2 * sstep(9, 33, ax) + 2.6 * sstep(18, 42, az) + 5 * sstep(32, 60, Math.max(ax, az));
  // escarpe en la ladera occidental (zona de escaleras y calles peatonales)
  h += x < 0 ? 2.6 * sstep(20, 26, ax) : 0;
  h += fbm(x * 0.05, z * 0.05) * (0.1 + 0.5 * sstep(5, 28, ax));
  return h;
}

export function genTerrain(kind = 'valle', seed = 7) {
  S.terrain = kind;
  noiseSeed = seed;
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) HV0[j * (N + 1) + i] = terrainFn(i - N / 2, j - N / 2);
  HV.set(HV0);
  if (S.ground) rebuildTerrainMesh();
}

export const hC = (i, j) => HV[j * (N + 1) + i]; // altura de esquina
export const hC0 = (i, j) => HV0[j * (N + 1) + i]; // altura original de esquina

// Aplica alturas niveladas bajo las vías (Map índice -> altura) y reconstruye la malla del terreno.
export function applyCornerLevels(levels) {
  HV.set(HV0);
  for (const [k, h] of levels) HV[k] = h;
  if (S.ground) rebuildTerrainMesh();
}
export function corners(x, y) {
  return [hC(x, y), hC(x + 1, y), hC(x, y + 1), hC(x + 1, y + 1)];
}
// altura bilineal en un punto del mundo
export function heightAt(wx, wz) {
  const fx = wx + N / 2, fz = wz + N / 2;
  if (fx < 0 || fz < 0 || fx >= N || fz >= N) return terrainFn(wx, wz);
  const i = Math.floor(fx), j = Math.floor(fz);
  const tx = fx - i, tz = fz - j;
  const a = hC(i, j), b = hC(i + 1, j), c = hC(i, j + 1), d = hC(i + 1, j + 1);
  return a * (1 - tx) * (1 - tz) + b * tx * (1 - tz) + c * (1 - tx) * tz + d * tx * tz;
}
// plataforma de un lote: tope = esquina más alta, base = más baja
export function padOf(x, y, w = 1, h = 1) {
  let top = -1e9, bot = 1e9;
  for (let j = 0; j <= h; j++) for (let i = 0; i <= w; i++) {
    const v = hC(x + i, y + j);
    if (v > top) top = v;
    if (v < bot) bot = v;
  }
  return { top, bot, slope: top - bot };
}
export const tileCenterH = (x, y) => heightAt(tw(x), tw(y));

// ---------------- texturas ----------------
function grassTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 256);
  const r = rng(7);
  for (let i = 0; i < 2600; i++) {
    const l = 78 + r() * 22;
    g.fillStyle = `hsl(${80 + r() * 40},${10 + r() * 15}%,${l}%)`;
    g.fillRect(r() * 256, r() * 256, 2 + r() * 3, 2 + r() * 3);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set((N + 2 * M) / 4, (N + 2 * M) / 4);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const cGrass = new THREE.Color('#78b35a'), cGrass2 = new THREE.Color('#5f9a48'), cHigh = new THREE.Color('#6c8f4c'),
  cRock = new THREE.Color('#8f8a78'), cDirt = new THREE.Color('#a08a62');

function rebuildTerrainMesh() {
  const g = S.ground.geometry;
  const pos = g.attributes.position, col = g.attributes.color;
  const W = N + 2 * M;
  const c = new THREE.Color();
  for (let k = 0; k < pos.count; k++) {
    const x = pos.getX(k), z = pos.getZ(k);
    const inside = Math.abs(x) <= N / 2 + 1e-6 && Math.abs(z) <= N / 2 + 1e-6;
    const y = inside ? heightAt(Math.min(N / 2 - 1e-4, x), Math.min(N / 2 - 1e-4, z)) : terrainFn(x, z);
    pos.setY(k, inside ? hC(Math.round(x + N / 2), Math.round(z + N / 2)) : y);
  }
  g.computeVertexNormals();
  const nor = g.attributes.normal;
  for (let k = 0; k < pos.count; k++) {
    const x = pos.getX(k), y = pos.getY(k), z = pos.getZ(k);
    const ny = nor.getY(k);
    const steep = 1 - ny; // 0 plano … 1 vertical
    c.copy(cGrass).lerp(cGrass2, Math.max(0, Math.min(1, (vnoise(x * 0.15, z * 0.15) + 1) / 2)));
    c.lerp(cHigh, Math.min(1, Math.max(0, y / 14)));
    c.lerp(cDirt, Math.min(1, Math.max(0, (steep - 0.06) * 6)) * 0.6);
    c.lerp(cRock, Math.min(1, Math.max(0, (steep - 0.18) * 4)));
    col.setXYZ(k, c.r, c.g, c.b);
  }
  pos.needsUpdate = true; col.needsUpdate = true; nor.needsUpdate = true;
  g.computeBoundingSphere();
  void W;
  rebuildGridLines();
  for (const m of S.mountains || []) m.position.y = terrainFn(m.position.x, m.position.z) + (m.geometry.parameters?.height || 30) * m.scale.y * 0.5 - 4;
  // el plano lejano queda justo debajo del borde del terreno
  let lo = 1e9;
  const E = N / 2 + M;
  for (let i = -E; i <= E; i += 2) lo = Math.min(lo, terrainFn(i, -E), terrainFn(i, E), terrainFn(-E, i), terrainFn(E, i));
  if (S.far) S.far.position.y = lo - 0.4;
}

function rebuildGridLines() {
  const pts = [];
  for (let j = 0; j <= N; j++) for (let i = 0; i < N; i++) pts.push(i - N / 2, hC(i, j) + 0.04, j - N / 2, i + 1 - N / 2, hC(i + 1, j) + 0.04, j - N / 2);
  for (let i = 0; i <= N; i++) for (let j = 0; j < N; j++) pts.push(i - N / 2, hC(i, j) + 0.04, j - N / 2, i - N / 2, hC(i, j + 1) + 0.04, j + 1 - N / 2);
  S.grid.geometry.dispose();
  S.grid.geometry = new THREE.BufferGeometry();
  S.grid.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const e = [];
  const edge = (i0, j0, i1, j1) => e.push(i0 - N / 2, hC(i0, j0) + 0.05, j0 - N / 2, i1 - N / 2, hC(i1, j1) + 0.05, j1 - N / 2);
  for (let i = 0; i < N; i++) { edge(i, 0, i + 1, 0); edge(i, N, i + 1, N); edge(0, i, 0, i + 1); edge(N, i, N, i + 1); }
  S.edge.geometry.dispose();
  S.edge.geometry = new THREE.BufferGeometry();
  S.edge.geometry.setAttribute('position', new THREE.Float32BufferAttribute(e, 3));
}

function mountain(r, cx, cz) {
  const rad = r.range(12, 26), h = r.range(16, 40);
  const g = new THREE.ConeGeometry(rad, h, 9, 5);
  const pos = g.attributes.position;
  const colors = [];
  const cLow = new THREE.Color('#5a8f48'), cMid = new THREE.Color('#6f8a55'), cTop = new THREE.Color('#8f9a8a');
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = (y + h / 2) / h;
    if (t > 0.02 && t < 0.98) {
      pos.setX(i, pos.getX(i) * (1 + (r() - 0.5) * 0.3));
      pos.setZ(i, pos.getZ(i) * (1 + (r() - 0.5) * 0.3));
      pos.setY(i, y + (r() - 0.5) * 2);
    }
    const c = t < 0.55 ? cLow.clone().lerp(cMid, t / 0.55) : cMid.clone().lerp(cTop, (t - 0.55) / 0.45);
    colors.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  m.position.set(cx, h / 2 - 2.5, cz);
  m.rotation.y = r() * 6;
  return m;
}

// ---------------- cielo ----------------
const SKY = {
  day: { top: new THREE.Color('#4f9fe0'), hor: new THREE.Color('#d6ecf6'), fog: new THREE.Color('#d2e7f2') },
  dusk: { top: new THREE.Color('#3b4d8a'), hor: new THREE.Color('#f2a66a'), fog: new THREE.Color('#c9a58c') },
  night: { top: new THREE.Color('#050a1c'), hor: new THREE.Color('#1b2a4a'), fog: new THREE.Color('#121c33') },
};
function makeSky() {
  const g = new THREE.SphereGeometry(900, 24, 12);
  g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3));
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  m.renderOrder = -10;
  return m;
}
function paintSky(top, hor) {
  const g = S.sky.geometry, p = g.attributes.position, c = g.attributes.color;
  const t = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) / 900;
    t.copy(hor).lerp(top, Math.min(1, Math.max(0, y * 2.2)));
    if (y < 0) t.copy(hor);
    c.setXYZ(i, t.r, t.g, t.b);
  }
  c.needsUpdate = true;
}

export function initScene(canvas) {
  S.canvas = canvas;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  S.renderer = renderer;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#d2e7f2', 160, 560);
  S.scene = scene;
  scene.add(S.root);
  S.sky = makeSky();
  scene.add(S.sky);

  S.camera = new THREE.PerspectiveCamera(45, 1, 0.5, 1600);

  S.hemi = new THREE.HemisphereLight('#ffffff', '#8aa070', 1.0);
  scene.add(S.hemi);
  const sun = new THREE.DirectionalLight('#fff4dd', 2.1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  const sc = sun.shadow.camera;
  sc.left = -N * 0.78; sc.right = N * 0.78; sc.top = N * 0.78; sc.bottom = -N * 0.78; sc.near = 5; sc.far = 400;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
  scene.add(sun.target);
  S.sun = sun;

  // terreno (ciudad + margen)
  const W = N + 2 * M;
  const geo = new THREE.PlaneGeometry(W, W, W, W);
  geo.rotateX(-Math.PI / 2);
  geo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 3), 3));
  const ground = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: grassTexture(), vertexColors: true }));
  ground.receiveShadow = true;
  scene.add(ground);
  S.ground = ground;

  // planicie lejana: cuatro franjas alrededor del terreno (sin cubrir el valle)
  const far = new THREE.Group();
  const E = N / 2 + M, F2 = 1500;
  const fm = new THREE.MeshLambertMaterial({ color: '#5f8f4c' });
  for (const [x0, z0, x1, z1] of [[-F2, -F2, F2, -E], [-F2, E, F2, F2], [-F2, -E, -E, E], [E, -E, F2, E]]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), fm);
    p.rotation.x = -Math.PI / 2;
    p.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2);
    far.add(p);
  }
  scene.add(far);
  S.far = far;

  S.grid = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.2, depthWrite: false }));
  S.grid.visible = false;
  scene.add(S.grid);
  S.edge = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#3d6b31' }));
  scene.add(S.edge);

  // cordillera
  const r = rng(2024);
  S.mountains = [];
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2 + r() * 0.1;
    const d = N / 2 + M + 8 + r() * 40;
    const m = mountain(r, Math.cos(a) * d, Math.sin(a) * d);
    S.mountains.push(m); scene.add(m);
  }
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2 + r() * 0.2;
    const d = N / 2 + M + 80 + r() * 60;
    const m = mountain(r, Math.cos(a) * d, Math.sin(a) * d);
    m.scale.setScalar(1.9);
    S.mountains.push(m); scene.add(m);
  }

  genTerrain(S.terrain);
  rebuildTerrainMesh();

  S.preview = new TileLayer(4096, 0.55, 0.07);
  S.preview.mesh.renderOrder = 5;
  scene.add(S.preview.mesh);

  resize();
  setTime(S.time);
  return S;
}

export function resize() {
  const w = S.canvas.clientWidth, h = S.canvas.clientHeight;
  S.renderer.setSize(w, h, false);
  S.camera.aspect = w / h;
  S.camera.updateProjectionMatrix();
}

// ---------------- día / noche ----------------
const _a = new THREE.Color(), _b = new THREE.Color(), _f = new THREE.Color();
export function setTime(t) {
  S.time = ((t % 24) + 24) % 24;
  const ang = ((S.time - 6) / 12) * Math.PI; // 6h amanecer, 18h atardecer
  const el = Math.sin(ang); // elevación del sol
  const day = Math.max(0, Math.min(1, (el + 0.08) / 0.35));
  const dusk = Math.max(0, 1 - Math.abs(el) / 0.3) * (el > -0.25 ? 1 : 0);
  S.night = 1 - day;
  // posición del sol (oriente -> occidente) o de la luna
  const sx = Math.cos(ang) * 120, sy = Math.max(24, Math.abs(el) * 140 + 24), sz = 50;
  S.sun.position.set(S.cam.x + sx, sy, S.cam.z + sz);
  S.sun.target.position.set(S.cam.x, 0, S.cam.z);
  S.sun.intensity = 0.25 + 1.95 * day;
  S.sun.color.set(day > 0.5 ? '#fff4dd' : day > 0 ? '#ffc48a' : '#9fb4ff');
  S.hemi.intensity = 0.28 + 0.8 * day;
  S.hemi.color.set(day > 0.3 ? '#ffffff' : '#8fa3d6');
  _a.copy(SKY.night.top).lerp(SKY.day.top, day);
  _b.copy(SKY.night.hor).lerp(SKY.day.hor, day);
  _f.copy(SKY.night.fog).lerp(SKY.day.fog, day);
  if (dusk > 0) { _b.lerp(SKY.dusk.hor, dusk * 0.8); _a.lerp(SKY.dusk.top, dusk * 0.4); _f.lerp(SKY.dusk.fog, dusk * 0.6); }
  paintSky(_a, _b);
  S.scene.fog.color.copy(_f);
  if (mats.solid) mats.solid.emissiveIntensity = Math.max(0, Math.min(1, (S.night - 0.25) * 1.6));
}

// ---------------- cámara ----------------
export function updateCamera() {
  const c = S.cam;
  c.dist = Math.min(220, Math.max(6, c.dist));
  c.pitch = Math.min(1.53, Math.max(0.22, c.pitch)); // de casi rasante (≈13°) a casi en planta (≈88°)
  const lim = N / 2 + 6;
  c.x = Math.max(-lim, Math.min(lim, c.x));
  c.z = Math.max(-lim, Math.min(lim, c.z));
  const target = heightAt(Math.max(-N / 2, Math.min(N / 2 - 0.01, c.x)), Math.max(-N / 2, Math.min(N / 2 - 0.01, c.z)));
  c.ty += (target - c.ty) * 0.15;
  const cp = Math.cos(c.pitch);
  S.camera.position.set(c.x + Math.sin(c.yaw) * cp * c.dist, c.ty + Math.sin(c.pitch) * c.dist, c.z + Math.cos(c.yaw) * cp * c.dist);
  const minY = heightAt(S.camera.position.x, S.camera.position.z) + 1.5;
  if (S.camera.position.y < minY) S.camera.position.y = minY;
  S.camera.lookAt(c.x, c.ty, c.z);
}

export function panCamera(dxScreen, dyScreen) {
  const c = S.cam;
  const sx = Math.cos(c.yaw), sz = -Math.sin(c.yaw);
  const fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw);
  c.x += sx * dxScreen + fx * dyScreen;
  c.z += sz * dxScreen + fz * dyScreen;
}

// ---------------- selección ----------------
const ray = new THREE.Raycaster();
export function pickPoint(clientX, clientY) {
  const rect = S.canvas.getBoundingClientRect();
  const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
  const ny = -((clientY - rect.top) / rect.height) * 2 + 1;
  ray.setFromCamera({ x: nx, y: ny }, S.camera);
  const o = ray.ray.origin, d = ray.ray.direction;
  let prev = 0, t = 0;
  const step = 0.35;
  for (let k = 0; k < 1500; k++) {
    t += step;
    const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t;
    if (y <= heightAt(x, z)) {
      // bisección
      let a = prev, b = t;
      for (let i = 0; i < 12; i++) {
        const m = (a + b) / 2;
        const mx = o.x + d.x * m, my = o.y + d.y * m, mz = o.z + d.z * m;
        if (my <= heightAt(mx, mz)) b = m; else a = m;
      }
      return { x: o.x + d.x * b, z: o.z + d.z * b };
    }
    prev = t;
    if (y < -20) break;
  }
  return null;
}
export function pickTile(clientX, clientY) {
  const p = pickPoint(clientX, clientY);
  if (!p) return null;
  const x = wt(p.x), y = wt(p.z);
  if (x < 0 || y < 0 || x >= N || y >= N) return null;
  return { x, y, wx: p.x, wz: p.z };
}

// ---------------- capa de casillas sobre el terreno ----------------
export class TileLayer {
  constructor(cap, opacity = 0.5, lift = 0.05) {
    this.cap = cap; this.lift = lift;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(cap * 18), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(cap * 18), 3));
    g.setDrawRange(0, 0);
    this.mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }));
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
    this.c = new THREE.Color();
  }
  set(list, inset = 0.03) {
    const n = Math.min(list.length, this.cap);
    const P = this.mesh.geometry.attributes.position.array, C = this.mesh.geometry.attributes.color.array;
    for (let k = 0; k < n; k++) {
      const t = list[k];
      const L = this.lift + (t.lift || 0);
      let v;
      if (t.ang !== undefined && t.ang !== null) {
        // cuadro girado (lote alineado con una vía diagonal)
        const cx = t.px - N / 2 + 0.5, cz = t.py - N / 2 + 0.5, hs = 0.5 - inset;
        const c = Math.cos(t.ang), sn = Math.sin(t.ang);
        const P = (a, b) => { const x = cx + a * c + b * sn, z = cz - a * sn + b * c; return [x, heightAt(x, z) + L, z]; };
        const A = P(-hs, hs), B = P(hs, hs), C = P(hs, -hs), D = P(-hs, -hs);
        v = [...A, ...B, ...C, ...A, ...C, ...D];
      } else {
        const x0 = t.x - N / 2 + inset, x1 = t.x + 1 - N / 2 - inset, z0 = t.y - N / 2 + inset, z1 = t.y + 1 - N / 2 - inset;
        const h00 = heightAt(x0, z0) + L, h10 = heightAt(x1, z0) + L, h01 = heightAt(x0, z1) + L, h11 = heightAt(x1, z1) + L;
        v = [x0, h01, z1, x1, h11, z1, x1, h10, z0, x0, h01, z1, x1, h10, z0, x0, h00, z0];
      }
      P.set(v, k * 18);
      this.c.set(t.color);
      for (let i = 0; i < 6; i++) { C[k * 18 + i * 3] = this.c.r; C[k * 18 + i * 3 + 1] = this.c.g; C[k * 18 + i * 3 + 2] = this.c.b; }
    }
    const g = this.mesh.geometry;
    g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true;
    g.setDrawRange(0, n * 6);
  }
}

const GREEN = '#37d67a', RED = '#ff4d5e', BLUE = '#4da3ff';
export function setPreview(tiles, mode) {
  S.preview.set(tiles.map((t) => ({ x: t.x, y: t.y, color: t.color || (t.ok ? (mode === 'info' ? BLUE : GREEN) : RED) })));
}

// ---------------- árboles decorativos ----------------
export const Trees = {
  items: [], meshes: [],
  init(grid) {
    const r = rng(99);
    const geos = [];
    const bt = new Builder(3); bt.tree(0, 0, 0.42); geos.push(bt.build());
    const bp = new Builder(4); bp.palm(0, 0, 0.7, false); geos.push(bp.build());
    const bw = new Builder(5); bw.palm(0, 0, 1.1, true); geos.push(bw.build());
    const bc = new Builder(6); bc.cone(0, 0, 0, 0.16, 0.7, '#2f6b35', 7); bc.cyl(0, 0, 0, 0.03, 0.15, '#6b4a2b', 5); geos.push(bc.build());
    const items = [];
    const counts = [0, 0, 0, 0];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const h = tileCenterH(x, y);
      const dens = 0.05 + Math.min(0.3, Math.max(0, h - 2) * 0.05);
      if (r() < dens) {
        const n = h > 4 ? 2 : 1;
        for (let k = 0; k < n; k++) {
          const type = h > 6 ? (r() < 0.5 ? 3 : 2) : r() < 0.65 ? 0 : 1;
          items.push({ x, y, type, ox: r.range(-0.35, 0.35), oz: r.range(-0.35, 0.35), s: r.range(0.8, 1.4), a: r() * 6 });
          counts[type]++;
        }
      }
    }
    // bosque fuera de la ciudad
    const out = [];
    for (let i = 0; i < 2200; i++) {
      const x = r.range(-N / 2 - M + 2, N / 2 + M - 2), z = r.range(-N / 2 - M + 2, N / 2 + M - 2);
      if (Math.abs(x) < N / 2 + 0.5 && Math.abs(z) < N / 2 + 0.5) continue;
      const type = r() < 0.5 ? 3 : r() < 0.6 ? 0 : 2;
      out.push({ wx: x, wz: z, type, s: r.range(1, 1.8), a: r() * 6 });
      counts[type]++;
    }
    this.items = items; this.out = out; this.grid = grid;
    this.meshes.forEach((m) => S.scene.remove(m));
    this.meshes = geos.map((g, i) => {
      const m = new THREE.InstancedMesh(g, mats.solid, Math.max(1, counts[i]));
      m.castShadow = true; m.receiveShadow = true;
      S.scene.add(m);
      return m;
    });
    this.refresh();
  },
  refresh() {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
    const idx = [0, 0, 0, 0];
    const up = new THREE.Vector3(0, 1, 0);
    for (const it of this.items) {
      const t = this.grid[it.y][it.x];
      const hidden = t.road || t.zone || t.bld || t.stop;
      q.setFromAxisAngle(up, it.a);
      const wx = tw(it.x) + it.ox, wz = tw(it.y) + it.oz;
      p.set(wx, heightAt(wx, wz), wz);
      s.setScalar(hidden ? 0.0001 : it.s);
      m.compose(p, q, s);
      this.meshes[it.type].setMatrixAt(idx[it.type]++, m);
    }
    for (const it of this.out) {
      q.setFromAxisAngle(up, it.a);
      p.set(it.wx, terrainFn(it.wx, it.wz), it.wz);
      s.setScalar(it.s);
      m.compose(p, q, s);
      this.meshes[it.type].setMatrixAt(idx[it.type]++, m);
    }
    this.meshes.forEach((mm) => { mm.instanceMatrix.needsUpdate = true; mm.computeBoundingSphere(); });
  },
};
