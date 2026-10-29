// Estado del juego, construcción (vías, zonas, edificios públicos) y simulación agregada (sin agentes).
//
// - Las ZONAS definen uso (residencial / comercial / industrial) y DENSIDAD (baja / media / alta).
// - El ESTRATO (1-6) de cada edificio NO lo elige el jugador: sale del VALOR DEL SUELO, que depende de
//   la cobertura de servicios, el tipo de vía, el comercio cercano y la contaminación.
// - La demanda R/C/I equilibra vivienda, empleo y bienes (la industria produce, el comercio consume).
import * as THREE from '../vendor/three.module.min.js';
import { S, N, tw, Trees, TileLayer, padOf, tileCenterH, applyCornerLevels, hC0, setGridMask, setParcelLookup } from './scene.js';
import { mats, rng, Builder } from './geom.js';
import { InstPools } from './render.js';
import { ROADS, buildRoadMesh } from './roads.js';
import { buildParcels } from './parcels.js';
import { createNet, lanesOf, addSegment, removeCell, rasterize, netFromTiles, serializeNet, loadNet, crossLevels } from './roadnet.js';
import { buildModel, VARIANTS, typeName, hasModel } from './models.js';
import { pickResType, resPop } from './models_res.js';
import { pickComType, COM_JOBS, COM_TYPES, tierOf } from './models_com.js';
import { pickIndType, IND_JOBS, IND_TYPES } from './models_ind.js';
import { pickOffType, OFF_JOBS, OFF_TYPES } from './models_off.js';
import { PUBLIC, SERVICES, buildPublic } from './buildings.js';
import { pickBigType } from './models_big.js';

export const COST = { zone: 500, startMoney: 6_000_000 };
export const ZONES = {
  1: { k: 'r', d: 1, name: 'Residencial · baja', color: '#9be08f' },
  2: { k: 'r', d: 2, name: 'Residencial · media', color: '#45b956' },
  3: { k: 'r', d: 3, name: 'Residencial · alta', color: '#1d7f37' },
  4: { k: 'c', d: 1, name: 'Comercial · baja', color: '#9cc9ff' },
  5: { k: 'c', d: 2, name: 'Comercial · media', color: '#3d8bfd' },
  6: { k: 'c', d: 3, name: 'Comercial · alta', color: '#1c4fb8' },
  7: { k: 'i', d: 1, name: 'Industrial · baja', color: '#fff27a' },
  8: { k: 'i', d: 2, name: 'Industrial · media', color: '#f7d117' },
  9: { k: 'i', d: 3, name: 'Industrial · alta', color: '#d1ad00' },
  10: { k: 'o', d: 1, name: 'Oficinas · baja', color: '#d9c2f7' },
  11: { k: 'o', d: 2, name: 'Oficinas · media', color: '#a066e8' },
  12: { k: 'o', d: 3, name: 'Oficinas · alta', color: '#6b2fc4' },
};
export const DENS_NAME = ['', 'Baja', 'Media', 'Alta'];
export const ESTRATO_COLORS = ['#e5484d', '#f08a24', '#f2d024', '#6cc04a', '#2f9bd6', '#9b5de5'];
// la pendiente sólo limita las vías; los edificios se construyen en cualquier ladera sobre su plataforma
const TAX = [-3, 4, 8, 18, 35, 60];
const DMULT = { 1: 2.2, 2: 1.2, 3: 1 };
const TIER_MULT = { 1: 1, 2: 1.3, 3: 1.7 };

export const CATS = Object.keys(SERVICES);
export const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const emptyStats = () => ({
  pop: 0, jobs: 0, workers: 0, emp: 1, happy: 50, income: 0, expense: 0,
  byE: [0, 0, 0, 0, 0, 0], byD: [0, 0, 0], bldCount: 0, comJobs: 0, indJobs: 0, offJobs: 0, pubJobs: 0,
  goodsNeed: 0, goodsProd: 0, budget: {},
});

export const G = {
  grid: [],
  net: createNet(), // red vial (grafo); las casillas son su proyección
  buildings: [],
  nextId: 1,
  money: COST.startMoney,
  month: 0,
  ticks: 0,
  speed: 1,
  acc: 0,
  seed: 7,
  cov: CATS.map(() => new Float32Array(N * N)),
  lv: new Float32Array(N * N),
  poll: new Float32Array(N * N),
  access: new Uint8Array(N * N), // densidad máxima permitida por la vía de frente (0 = sin acceso)
  face: new Int8Array(N * N), // dirección hacia la vía
  dem: { r: 0.4, c: 0, i: 0, o: 0 },
  stats: emptyStats(),
  hooks: {
    roadsChanged() {}, removeStop() {}, transitCover: () => [], transitEconomy: () => ({ revenue: 0, upkeep: 0 }),
  },
  onToast: () => {}, onStats: () => {}, onChange: () => {},
  growing: [],
  dirty: { roads: true, zones: true, cov: true, pollLv: true },
  overlay: null,
};
let rand = rng(Date.now() & 0xffffff);

export const idx = (x, y) => y * N + x;
export const inb = (x, y) => x >= 0 && y >= 0 && x < N && y < N;
export const tile = (x, y) => (inb(x, y) ? G.grid[y][x] : null);
export const roadAt = (x, y) => (inb(x, y) ? G.grid[y][x].road : null);
export const isRoad = (x, y) => !!roadAt(x, y);
export const fmt = (n) => (n < 0 ? '-' : '') + '$' + Math.abs(Math.round(n)).toLocaleString('es-CO');
export const estratoOf = (lv) => 1 + Math.floor(Math.min(0.9999, Math.max(0, lv)) * 6);
export const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const ROT = [Math.PI, Math.PI / 2, 0, -Math.PI / 2];

for (let y = 0; y < N; y++) {
  G.grid.push([]);
  for (let x = 0; x < N; x++) G.grid[y].push({ x, y, road: null, zone: 0, bld: null, stop: null });
}

// ---------- render ----------
export const bldGroup = new THREE.Group();
let pools = null;
let roadMesh = null;
const zoneLayer = new TileLayer(N * N, 0.42, 0.045);
const overlayLayer = new TileLayer(N * N, 0.55, 0.06);
const padGeom = (() => { const B = new Builder(9); B.box(0, 0, 0, 1, 1, 1, '#aaa496', { top: '#9d978a' }); return B.build(); })();

export function attachWorld() {
  setParcelLookup((x, y) => (inb(x, y) ? G.parcels?.get(idx(x, y)) || null : null));
  pools = new InstPools(bldGroup, mats.solid);
  S.root.add(bldGroup, zoneLayer.mesh, overlayLayer.mesh);
  overlayLayer.mesh.visible = false;
  Trees.init(G.grid);
}

function rebuildRoads() {
  if (roadMesh) { S.root.remove(roadMesh); roadMesh.geometry.dispose(); }
  roadMesh = new THREE.Mesh(buildRoadMesh(G.grid, G.net), mats.solid);
  roadMesh.receiveShadow = true;
  roadMesh.castShadow = true;
  S.root.add(roadMesh);
}

function rebuildZones() {
  const list = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const t = G.grid[y][x];
    if (!t.zone || t.bld) continue;
    const pc = G.parcels?.get(idx(x, y));
    if (!pc && G.diagRegion?.[idx(x, y)] && !G.access[idx(x, y)]) continue;
    list.push(pc ? { x, y, px: pc.px, py: pc.py, ang: pc.ang, color: ZONES[t.zone].color } : { x, y, color: ZONES[t.zone].color });
  }
  zoneLayer.set(list, 0.04);
}

// capas de información: valor del suelo, contaminación, pendiente, servicios
const _ca = new THREE.Color(), _cb = new THREE.Color();
const ramp = (t, stops) => {
  t = Math.max(0, Math.min(0.9999, t));
  const k = t * (stops.length - 1), i = Math.floor(k);
  return '#' + _ca.set(stops[i]).lerp(_cb.set(stops[i + 1]), k - i).getHexString();
};
export function refreshOverlay() {
  const mode = G.overlay;
  overlayLayer.mesh.visible = !!mode;
  if (!mode) return;
  const list = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = idx(x, y);
    let c;
    if (mode === 'lv') c = ESTRATO_COLORS[estratoOf(G.lv[i]) - 1];
    else if (mode === 'poll') { if (G.poll[i] < 0.03) continue; c = ramp(G.poll[i], ['#fff3b0', '#ff9f1c', '#7a2e0e']); }
    else if (mode === 'slope') { const s = padOf(x, y).slope; c = s > 0.4 ? '#7a1010' : s > 0.2 ? '#d62828' : s > 0.12 ? '#f77f00' : s > 0.08 ? '#fcbf49' : '#90be6d'; }
    else if (mode === 'svc') { let s = 0; for (const a of G.cov) s += a[i]; c = ramp(s / 8, ['#d62828', '#fcbf49', '#2a9d8f']); }
    list.push({ x, y, color: c });
  }
  overlayLayer.set(list, 0.0);
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
// lote girado: los generados por una vía diagonal ocupan su propio cuadro de 12 m alineado con la vía;
// los antiguos (sin centro propio) se reducen para caber en la casilla
const DIAG_SCALE = 0.74;
function bldMatrix(b, sy = 1) {
  const diag = b.da !== undefined && b.da !== null;
  const own = diag && b.px !== null && b.px !== undefined;
  _q.setFromAxisAngle(_up, diag ? b.da : ROT[b.rot] ?? 0);
  if (own) _p.set(b.px - N / 2 + 0.5, b.top, b.py - N / 2 + 0.5);
  else _p.set(tw(b.x) + (b.w - 1) / 2, b.top, tw(b.y) + (b.h - 1) / 2);
  const k = own ? 0.97 : diag ? DIAG_SCALE : 1;
  _s.set(k, sy, k);
  return _m.compose(_p, _q, _s);
}

export const modelKey = (b) => (b.kind === 'pub' ? 'pub:' + b.key : `${b.kind}:${b.type}:${b.kind === 'ind' ? 3 : b.e}:${b.v}`);

// ---------- obra en construcción: andamio que sube con el edificio y grúa en los altos ----------
const siteGeom = (() => {
  const B = new Builder(13);
  B.plane(0, 0.014, 0, 0.98, 0.98, '#8d7a5c');
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]]) B.box(x * 0.45, 0, z * 0.45, 0.025, 1, 0.025, '#e0a020');
  for (let k = 1; k <= 5; k++) {
    const y = k / 5 - 0.012;
    B.box(0, y, 0.45, 0.92, 0.012, 0.03, '#c98a1a'); B.box(0, y, -0.45, 0.92, 0.012, 0.03, '#c98a1a');
    B.box(0.45, y, 0, 0.03, 0.012, 0.92, '#c98a1a'); B.box(-0.45, y, 0, 0.03, 0.012, 0.92, '#c98a1a');
  }
  // malla verde de obra en dos caras
  B.box(0, 0, 0.465, 0.92, 1, 0.004, '#3f7d4a', { noTop: true });
  B.box(-0.465, 0, 0, 0.004, 1, 0.92, '#3f7d4a', { noTop: true });
  // cerramiento de lámina y materiales
  B.box(0, 0, 0.495, 0.98, 0.09, 0.01, '#9aa0a6'); B.box(0.495, 0, 0, 0.01, 0.09, 0.98, '#9aa0a6');
  return B.build();
})();
const craneGeom = (() => {
  const B = new Builder(14);
  B.box(0.32, 0, -0.32, 0.06, 1, 0.06, '#f2c230');
  B.box(0.1, 0.97, -0.32, 0.9, 0.035, 0.05, '#f2c230');
  B.box(0.62, 0.9, -0.32, 0.12, 0.07, 0.1, '#555');
  B.box(-0.1, 0.62, -0.32, 0.004, 0.35, 0.004, '#333');
  return B.build();
})();
function siteMatrix(b, sy, crane = false) {
  const diag = b.da !== undefined && b.da !== null;
  _q.setFromAxisAngle(_up, diag ? b.da : ROT[b.rot] ?? 0);
  if (diag && b.px !== null && b.px !== undefined) _p.set(b.px - N / 2 + 0.5, b.top, b.py - N / 2 + 0.5);
  else _p.set(tw(b.x) + (b.w - 1) / 2, b.top, tw(b.y) + (b.h - 1) / 2);
  const h = crane ? b.mh * 1.25 + 0.4 : Math.max(0.05, sy);
  _s.set(b.w, h, b.h);
  return _m.compose(_p, _q, _s);
}
function endSite(b) {
  if (b.site_) { pools.remove(b.site_); b.site_ = null; }
  if (b.crane_) { pools.remove(b.crane_); b.crane_ = null; }
}
// tiempo de obra en segundos de juego: más alto, más demora
const buildTime = (b) => 4 + b.mh * 2.2;

function attach(b) {
  const pad = padOf(b.x, b.y, b.w, b.h);
  b.top = pad.top;
  const geomFn = b.kind === 'pub' ? () => buildPublic(b.key) : () => buildModel({ kind: b.kind, type: b.type, e: b.kind === 'ind' ? 3 : b.e, v: b.v });
  const geom = geomFn();
  b.mh = Math.max(0.15, geom.boundingBox ? geom.boundingBox.max.y : 0.5); // altura del modelo
  b.h_ = pools.add(modelKey(b), () => geom, bldMatrix(b, 0.001));
  b.site_ = pools.add('site', () => siteGeom, siteMatrix(b, 0.05));
  if (b.mh > 1.2) b.crane_ = pools.add('crane', () => craneGeom, siteMatrix(b, 1, true));
  if (pad.slope > 0.02) {
    _q.identity();
    _p.set(tw(b.x) + (b.w - 1) / 2, pad.bot - 0.06, tw(b.y) + (b.h - 1) / 2);
    _s.set(b.w * 0.998, pad.top - pad.bot + 0.06, b.h * 0.998);
    b.pad_ = pools.add('pad', () => padGeom, _m.compose(_p, _q, _s));
  }
  b.grow = 0;
  G.growing.push(b);
}

function detach(b) {
  if (b.h_) { pools.remove(b.h_); b.h_ = null; }
  if (b.pad_) { pools.remove(b.pad_); b.pad_ = null; }
  endSite(b);
  const k = G.growing.indexOf(b);
  if (k >= 0) G.growing.splice(k, 1);
}

// ---------- servicios, contaminación, valor del suelo, acceso ----------
function recomputeAccess() {
  G.access.fill(0);
  G.face.fill(-1);
  // todos los lotes salen de los segmentos de vía (rectos o diagonales) con una sola prioridad
  const pr = buildParcels(G.net, G.grid, N);
  G.parcels = new Map();
  G.diagRegion = pr.region;
  for (const [i, p] of pr.parcels) {
    G.access[i] = p.dens;
    G.face[i] = p.face;
    if (p.diag) G.parcels.set(i, p);
  }
  // cuadrícula visible: sólo lotes con frente a una vía; en la franja de una diagonal, sus lotes girados
  const mask = new Uint8Array(N * N);
  for (const [i, p] of pr.parcels) if (!p.diag) mask[i] = 1;
  setGridMask(mask, [...G.parcels.values()]);
}

export function recomputeCoverage() {
  for (const c of G.cov) c.fill(0);
  const stamp = (cat, cx, cy, R) => {
    const arr = G.cov[CATS.indexOf(cat)];
    for (let y = Math.max(0, Math.floor(cy - R)); y <= Math.min(N - 1, Math.ceil(cy + R)); y++) {
      for (let x = Math.max(0, Math.floor(cx - R)); x <= Math.min(N - 1, Math.ceil(cx + R)); x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d > R) continue;
        const s = Math.min(1, 2 * (1 - d / R));
        const i = idx(x, y);
        if (s > arr[i]) arr[i] = s;
      }
    }
  };
  for (const b of G.buildings) {
    if (b.kind !== 'pub') continue;
    const d = PUBLIC[b.key];
    stamp(d.cat, b.x + (b.w - 1) / 2, b.y + (b.h - 1) / 2, d.radius + b.w / 2);
  }
  for (const c of G.hooks.transitCover()) stamp('transporte', c.x, c.y, c.r);
  recomputeLandValue();
}

function recomputePollution() {
  G.poll.fill(0);
  for (const b of G.buildings) {
    if (b.kind !== 'ind') continue;
    const P = (IND_TYPES[b.type]?.poll ?? 1) * (0.35 + 0.3 * b.d);
    const R = 3 + 2 * b.d;
    for (let y = Math.max(0, b.y - R); y <= Math.min(N - 1, b.y + R); y++) {
      for (let x = Math.max(0, b.x - R); x <= Math.min(N - 1, b.x + R); x++) {
        const d = Math.hypot(x - b.x, y - b.y);
        if (d <= R) G.poll[idx(x, y)] += P * (1 - d / R) * 0.45;
      }
    }
  }
  // ruido de autopistas
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const r = G.grid[y][x].road;
    if (!r || r.k !== 'autopista') continue;
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0], [0, 0]]) if (inb(x + dx, y + dy)) G.poll[idx(x + dx, y + dy)] += 0.12;
  }
  for (let i = 0; i < N * N; i++) if (G.poll[i] > 1) G.poll[i] = 1;
}

function recomputeLandValue() {
  const com = new Float32Array(N * N);
  for (const b of G.buildings) {
    if (b.kind !== 'com' && b.kind !== 'off') continue;
    for (let y = Math.max(0, b.y - 4); y <= Math.min(N - 1, b.y + 4); y++)
      for (let x = Math.max(0, b.x - 4); x <= Math.min(N - 1, b.x + 4); x++) com[idx(x, y)] += 0.012 * b.d;
  }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = idx(x, y);
    let svc = 0;
    for (const c of G.cov) svc += c[i];
    let pos = 0, neg = 0;
    for (const [dx, dy] of DIRS) {
      const r = roadAt(x + dx, y + dy);
      if (!r) continue;
      const v = ROADS[r.k].lv;
      if (v > pos) pos = v;
      if (v < neg) neg = v;
    }
    // vista desde la loma: pequeño bono por altura
    const view = Math.min(0.04, Math.max(0, tileCenterH(x, y) - 2) * 0.006);
    G.lv[i] = Math.max(0, Math.min(1, 0.04 + 0.115 * svc + pos + neg + view + Math.min(0.06, com[i]) - 0.55 * G.poll[i]));
  }
}

export function coverageAt(x, y) {
  const i = idx(x, y);
  const list = CATS.filter((c, k) => G.cov[k][i] > 0.05);
  const score = G.cov.reduce((s, c) => s + c[i], 0);
  return { list, score, lv: G.lv[i], poll: G.poll[i], e: estratoOf(G.lv[i]) };
}

export function markDirty(what = 'all') {
  if (what === 'all' || what === 'roads') { G.dirty.roads = true; G.dirty.cov = true; }
  if (what === 'all' || what === 'zones') G.dirty.zones = true;
  if (what === 'cov') G.dirty.cov = true;
}

export function flush() {
  if (G.dirty.roads) { rebuildRoads(); recomputeAccess(); recomputePollution(); G.dirty.roads = false; }
  if (G.dirty.zones) { rebuildZones(); Trees.refresh(); G.dirty.zones = false; }
  if (G.dirty.cov) { recomputeCoverage(); G.dirty.cov = false; if (G.overlay) refreshOverlay(); }
}

// ---------- dinero ----------
export function spend(cost) {
  if (G.money < cost) {
    G.onToast('Dinero insuficiente: necesitas ' + fmt(cost), 'warn');
    return false;
  }
  G.money -= cost;
  return true;
}

// ---------- edificios ----------
function recalc(b) {
  b.pop = 0; b.jobs = 0;
  if (b.kind === 'res') b.pop = resPop(b.d, b.e, b.type);
  else if (b.kind === 'com') b.jobs = Math.round(COM_JOBS[b.d] * (COM_TYPES[b.type]?.jobs ?? 1));
  else if (b.kind === 'off') b.jobs = Math.round(OFF_JOBS[b.d] * (OFF_TYPES[b.type]?.jobs ?? 1));
  else if (b.kind === 'ind') b.jobs = Math.round(IND_JOBS[b.d] * (IND_TYPES[b.type]?.jobs ?? 1));
  else b.jobs = PUBLIC[b.key].jobs;
}

export function addBuilding(o) {
  const b = {
    id: G.nextId++, kind: o.kind, d: o.d || 1, e: o.e || 1, type: o.type || null, v: o.v ?? Math.floor(rand() * VARIANTS),
    x: o.x, y: o.y, w: o.w || 1, h: o.h || 1, rot: o.rot ?? 2, da: o.da ?? null, px: o.px ?? null, py: o.py ?? null, key: o.key || null, pop: 0, jobs: 0,
  };
  for (let j = 0; j < b.h; j++) for (let i = 0; i < b.w; i++) G.grid[b.y + j][b.x + i].bld = b;
  recalc(b);
  attach(b);
  G.buildings.push(b);
  return b;
}

export function removeBuilding(b) {
  for (let j = 0; j < b.h; j++) for (let i = 0; i < b.w; i++) {
    const t = G.grid[b.y + j][b.x + i];
    if (t.bld === b) t.bld = null;
  }
  detach(b);
  const k = G.buildings.indexOf(b);
  if (k >= 0) G.buildings.splice(k, 1);
  if (b.kind === 'ind' || b.kind === 'com' || b.kind === 'off') G.dirty.pollLv = true;
  if (b.kind === 'pub') markDirty('cov');
}

function restyle(b, e) {
  b.e = e;
  if (b.w > 1) { /* lote grande: conserva su tipo y sólo cambia el acabado */ }
  else if (b.kind === 'res') b.type = pickResType(b.d, e, rand);
  else if (b.kind === 'com') b.type = pickComType(b.d, e, rand);
  else if (b.kind === 'off') b.type = pickOffType(b.d, e, rand);
  recalc(b);
  detach(b);
  attach(b);
}

export function buildingLabel(b) {
  if (b.kind === 'pub') return PUBLIC[b.key].name;
  return typeName(b.kind, b.type);
}

// ---------- operaciones de construcción ----------
export function roadTileCheck(p, k) {
  const t = tile(p.x, p.y);
  if (!t) return { ok: false };
  if (t.bld || (t.stop && t.stop.type === 'cable')) return { ok: false, why: 'ocupado' };
  const R = ROADS[k];
  if (padOf(p.x, p.y).slope > R.maxSlope) return { ok: false, why: 'pendiente' };
  const cur = t.road;
  if (!cur) return { ok: true, cost: R.cost };
  if (cur.k === k && (cur.ax === p.ax || cur.ax === 2)) return { ok: true, cost: 0, same: true };
  if (cur.ax !== p.ax) return { ok: true, cost: ROADS[cur.k].rank >= R.rank ? 0 : R.cost, cross: true };
  if (ROADS[cur.k].rank > R.rank) return { ok: true, cost: 0, same: true };
  return { ok: true, cost: R.cost };
}

export function buildRoad(plan, k) {
  if (plan.diag) return buildDiag(plan, k);
  // agrupar el plan por posición a lo largo del eje: una posición sólo se construye si todos sus carriles caben
  const byPos = new Map();
  for (const p of plan) {
    const along = p.ax === 0 ? p.x : p.y;
    if (!byPos.has(along)) byPos.set(along, []);
    byPos.get(along).push(p);
  }
  const ax = plan[0]?.ax ?? 0;
  // línea central = coordenada lateral del carril menos su desplazamiento
  const p0 = plan[0];
  const line = p0 ? (ax === 0 ? p0.y : p0.x) - lanesOf(k).offs[p0.li] : 0;
  let cost = 0, changes = 0;
  const valid = [];
  for (const [along, lanes] of [...byPos.entries()].sort((a, b) => a[0] - b[0])) {
    const checks = lanes.map((p) => roadTileCheck(p, k));
    if (checks.some((c) => !c.ok)) continue;
    for (const c of checks) if (!c.same) { cost += c.cost; changes++; }
    valid.push(along);
  }
  if (!changes) return false;
  if (valid.length) {
    const dir = ax === 0 ? [1, 0] : [0, 1];
    const at = (s) => (ax === 0 ? { x: s, y: line } : { x: line, y: s });
    const bad = junctionRule(at(valid[0]), dir) || junctionRule(at(valid[valid.length - 1]), [-dir[0], -dir[1]]);
    if (bad) { G.onToast(bad, 'warn'); return false; }
  }
  if (!spend(cost)) return false;
  // tramos continuos de posiciones válidas -> segmentos del grafo
  const { offs, cIdx } = lanesOf(k);
  let start = null, prev = null;
  const flushRun = () => { if (start !== null) addSegment(G.net, { k, ax, line, s0: start, s1: prev, offs, cIdx }); };
  for (const a of valid) {
    if (prev === null || a !== prev + 1) { flushRun(); start = a; }
    prev = a;
  }
  flushRun();
  applyNet();
  return true;
}

// Reglas de empalme (como en Cities): una vía no puede llegar a un nodo formando menos de MIN_ANGLE con otra
// vía de ese nodo, ni terminar a una casilla de un cruce donde llega una diagonal (dos cruces casi encimados).
// p = extremo de la vía nueva; dir = dirección en que la vía sale de ese extremo.
export const MIN_ANGLE = 40;
function junctionRule(p, dir) {
  const net = G.net;
  const node = net.nodes.get(p.x + ',' + p.y);
  const dl = Math.hypot(dir[0], dir[1]);
  if (node) {
    for (const id of node.segs) {
      const seg = net.byId.get(id);
      if (!seg) continue;
      const atStart = seg.ax === 1 ? seg.s0 === p.y : seg.s0 === p.x;
      const sd = seg.ax === 0 ? [1, 0] : seg.ax === 1 ? [0, 1] : [1, seg.dy];
      const out = atStart ? sd : [-sd[0], -sd[1]];
      const cos = (out[0] * dir[0] + out[1] * dir[1]) / (Math.hypot(out[0], out[1]) * dl);
      const ang = (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
      if (ang > 1 && ang < MIN_ANGLE) return `Ángulo muy cerrado con otra vía (${Math.round(ang)}°; mínimo ${MIN_ANGLE}°)`;
    }
    return null;
  }
  for (const n of net.nodes.values()) {
    if (Math.max(Math.abs(n.x - p.x), Math.abs(n.y - p.y)) !== 1) continue;
    const hasDiag = n.segs.some((id) => net.byId.get(id)?.ax === 3);
    if (hasDiag || dir[0] && dir[1]) return 'Muy cerca de otro cruce: empalma en el mismo nodo o aléjate al menos 2 casillas';
  }
  return null;
}

// ---------- glorietas ----------
export const ROUND_COST = 30000;
// nodo de la red más cercano a una casilla (cruce de 3 o más vías), o null
export function junctionNear(tx, ty) {
  let best = null, bd = 3.1;
  for (const n of G.net.nodes.values()) {
    if (n.segs.length < 3) continue;
    const d = Math.hypot(n.x - tx, n.y - ty);
    if (d < bd) { bd = d; best = n; }
  }
  return best;
}
export const isRound = (n) => !!n && G.net.rounds.has(n.x + ',' + n.y);

// Pone o quita la glorieta del cruce más cercano a la casilla. Devuelve un texto de aviso o null si todo salió bien.
export function toggleRound(tx, ty) {
  const n = junctionNear(tx, ty);
  if (!n) return 'Haz clic sobre un cruce de 3 o más vías';
  const key = n.x + ',' + n.y;
  if (G.net.rounds.has(key)) G.net.rounds.delete(key);
  else {
    if (!spend(ROUND_COST)) return 'Dinero insuficiente';
    G.net.rounds.add(key);
  }
  applyNet();
  return null;
}

// Diagonal a 45°: se construyen los tramos continuos de pasos cuyas casillas (centro y unión) caben.
function buildDiag(plan, k) {
  const { line, dy, s0, s1 } = plan.diag;
  // posición a lo largo -> ¿todas las casillas de la banda en esa posición caben?
  const okAt = new Map();
  let cost = 0, changes = 0;
  for (const p of plan) {
    const c = roadTileCheck(p, k);
    const key = Math.round(p.s * 2);
    okAt.set(key, (okAt.get(key) ?? true) && c.ok);
    if (c.ok && !c.same) { cost += c.cost; changes++; }
  }
  if (!changes) return false;
  const fits = (h) => okAt.get(h) !== false; // h = posición × 2
  const runs = [];
  let start = null;
  for (let x = s0; x <= s1; x++) {
    const good = fits(2 * x) && (x === s1 || (fits(2 * x + 1) && fits(2 * x + 2)));
    if (fits(2 * x) && start === null) start = x;
    if (!good) { if (start !== null) runs.push([start, x]); start = null; }
  }
  if (start !== null) runs.push([start, s1]);
  const real = runs.filter(([a, b]) => b > a);
  if (!real.length) return false;
  for (const [a, b] of real) {
    const bad = junctionRule({ x: a, y: dy * (a - line) }, [1, dy]) || junctionRule({ x: b, y: dy * (b - line) }, [-1, -dy]);
    if (bad) { G.onToast(bad, 'warn'); return false; }
  }
  if (!spend(cost)) return false;
  for (const [a, b] of real) addSegment(G.net, { k, ax: 3, dy, line, s0: a, s1: b, offs: [0], cIdx: -1 });
  applyNet();
  return true;
}

// nivela el terreno bajo las vías (perfil transversal horizontal) y reacomoda los edificios vecinos
function levelTerrain() {
  applyCornerLevels(crossLevels(G.net, N, hC0));
  for (const b of G.buildings) {
    const top = padOf(b.x, b.y, b.w, b.h).top;
    if (Math.abs(top - b.top) > 1e-4) { detach(b); attach(b); b.grow = 0.999; }
  }
}

// proyecta la red sobre las casillas y actualiza todo lo que depende de las vías
function applyNet() {
  rasterize(G.net, G.grid, N);
  levelTerrain();
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const t = G.grid[y][x]; if (t.road) t.zone = 0; }
  markDirty('all');
  flush();
  G.hooks.roadsChanged();
  G.onChange();
}

export function rectTiles(a, b) {
  const out = [];
  for (let y = Math.min(a.y, b.y); y <= Math.max(a.y, b.y); y++)
    for (let x = Math.min(a.x, b.x); x <= Math.max(a.x, b.x); x++) out.push({ x, y });
  return out;
}

export function zoneOk(x, y, z) {
  const t = tile(x, y);
  return !!t && !t.road && !t.stop && !(t.bld && t.bld.kind === 'pub') && t.zone !== z;
}

// motivo por el que una casilla zonificada no crece (para la interfaz)
export function zoneProblem(x, y, ignoreDemand = false) {
  const t = tile(x, y);
  if (!t || !t.zone || t.bld) return null;
  const Z = ZONES[t.zone];
  const a = G.access[idx(x, y)];
  if (!a) return 'Sin vía cercana';
  if (a < Z.d) return a === 1 ? 'Sobre camino destapado sólo crecen casas: pavimenta la vía' : 'Lote de fondo (sin frente a la vía): sólo crecen casas';
  if (!ignoreDemand && G.dem[Z.k] < -0.2) return 'Poca demanda de ' + ({ r: 'vivienda', c: 'comercio', o: 'oficinas', i: 'industria' }[Z.k]);
  return null;
}

export function paintZone(tiles, z) {
  const list = tiles.filter((p) => zoneOk(p.x, p.y, z));
  if (!list.length) return false;
  if (!spend(list.length * COST.zone)) return false;
  for (const p of list) {
    const t = G.grid[p.y][p.x];
    if (t.bld) removeBuilding(t.bld);
    t.zone = z;
  }
  markDirty('zones');
  G.dirty.pollLv = true;
  flush();
  G.onChange();
  return true;
}

export function canPlacePublic(key, x, y) {
  const d = PUBLIC[key];
  if (x < 0 || y < 0 || x + d.w > N || y + d.h > N) return { ok: false, tiles: [] };
  let ok = true;
  const tiles = [];
  for (let j = 0; j < d.h; j++) for (let i = 0; i < d.w; i++) {
    const t = G.grid[y + j][x + i];
    const bad = t.road || t.stop || (t.bld && t.bld.kind === 'pub');
    if (bad) ok = false;
    tiles.push({ x: x + i, y: y + j, ok: !bad });
  }
  // lado con más vía al frente
  const sides = [0, 0, 0, 0];
  for (let i = 0; i < d.w; i++) { if (isRoad(x + i, y - 1)) sides[0]++; if (isRoad(x + i, y + d.h)) sides[2]++; }
  for (let j = 0; j < d.h; j++) { if (isRoad(x - 1, y + j)) sides[3]++; if (isRoad(x + d.w, y + j)) sides[1]++; }
  const best = sides.indexOf(Math.max(...sides));
  const noRoad = sides[best] === 0;
  const steep = false; // los edificios se apoyan en plataformas: la pendiente sólo limita las vías
  if (noRoad || steep) { ok = false; tiles.forEach((t) => { t.ok = false; }); }
  return { ok, tiles, noRoad, steep, rot: best };
}

export function placePublic(key, x, y) {
  const c = canPlacePublic(key, x, y);
  if (!c.ok) {
    G.onToast(c.noRoad ? 'Debe estar junto a una vía' : c.steep ? 'Terreno demasiado inclinado' : 'No se puede construir aquí', 'warn');
    return false;
  }
  const d = PUBLIC[key];
  if (!spend(d.cost)) return false;
  for (let j = 0; j < d.h; j++) for (let i = 0; i < d.w; i++) {
    const t = G.grid[y + j][x + i];
    if (t.bld) removeBuilding(t.bld);
    t.zone = 0;
  }
  addBuilding({ kind: 'pub', key, x, y, w: d.w, h: d.h, rot: c.rot });
  markDirty('zones'); markDirty('cov');
  flush();
  G.onChange();
  return true;
}

export function bulldoze(tiles) {
  let n = 0;
  for (const p of tiles) {
    const t = tile(p.x, p.y);
    if (!t) continue;
    if (t.stop) { G.hooks.removeStop(t.stop); n++; }
    else if (t.bld) { removeBuilding(t.bld); n++; }
    else if (t.road) { removeCell(G.net, p.x, p.y); n++; }
    else if (t.zone) { t.zone = 0; n++; }
  }
  if (!n) return false;
  G.dirty.pollLv = true;
  applyNet();
  return true;
}

// ---------- simulación ----------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Lote grande de 2×2: busca un bloque libre de la misma zona con la fila delantera frente a la misma vía.
function tryBig(t, k, e) {
  const Z = ZONES[t.zone];
  const type = pickBigType(k, Z.d, e, rand);
  if (!type) return false;
  const i0 = idx(t.x, t.y);
  if (G.parcels?.has(i0)) return false; // junto a diagonales los lotes ya son girados
  const f = G.face[i0];
  if (f < 0) return false;
  const fw = DIRS[f], lat = DIRS[(f + 1) % 4];
  for (const side of [1, -1]) {
    const cells = [];
    let ok = true;
    for (let a = 0; a < 2 && ok; a++) for (let b = 0; b < 2 && ok; b++) {
      const x = t.x + lat[0] * side * a - fw[0] * b, y = t.y + lat[1] * side * a - fw[1] * b;
      const c = tile(x, y);
      if (!c || c.road || c.stop || c.bld || c.zone !== t.zone || G.parcels?.has(idx(x, y))) { ok = false; break; }
      if (b === 0 && (G.face[idx(x, y)] !== f || G.access[idx(x, y)] < Z.d)) { ok = false; break; }
      cells.push([x, y]);
    }
    if (!ok) continue;
    const ox = Math.min(...cells.map((c) => c[0])), oy = Math.min(...cells.map((c) => c[1]));
    addBuilding({ kind: { r: 'res', c: 'com', i: 'ind' }[k], d: Z.d, e, type, x: ox, y: oy, w: 2, h: 2, rot: f });
    return true;
  }
  return false;
}

function spawn(t) {
  const Z = ZONES[t.zone];
  const i = idx(t.x, t.y);
  const pc = G.parcels?.get(i);
  const base = { x: t.x, y: t.y, d: Z.d, rot: G.face[i] >= 0 ? G.face[i] : 2, da: pc ? pc.ang : null, px: pc ? pc.px : null, py: pc ? pc.py : null };
  if (Z.k === 'r') {
    let e = estratoOf(G.lv[i]);
    if (e > 1 && rand() < 0.2) e--;
    if (tryBig(t, 'r', e)) return;
    addBuilding({ ...base, kind: 'res', e, type: pickResType(Z.d, e, rand) });
  } else if (Z.k === 'o') {
    const e = estratoOf(G.lv[i]);
    addBuilding({ ...base, kind: 'off', e, type: pickOffType(Z.d, e, rand) });
  } else if (Z.k === 'c') {
    const e = estratoOf(G.lv[i]);
    if (tryBig(t, 'c', e)) return;
    addBuilding({ ...base, kind: 'com', e, type: pickComType(Z.d, e, rand) });
  } else if (!tryBig(t, 'i', 3)) addBuilding({ ...base, kind: 'ind', e: 3, type: pickIndType(Z.d, rand) });
}

function simulate() {
  G.ticks++;
  const st = G.stats;
  if (G.dirty.pollLv || G.ticks % 5 === 0) { recomputePollution(); recomputeLandValue(); G.dirty.pollLv = false; if (G.overlay) refreshOverlay(); }

  // --- totales y demanda ---
  let pop = 0, comJobs = 0, indJobs = 0, offJobs = 0, pubJobs = 0, educated = 0;
  for (const b of G.buildings) {
    pop += b.pop;
    if (b.kind === 'com') comJobs += b.jobs;
    else if (b.kind === 'off') offJobs += b.jobs;
    if (b.kind === 'res' && b.e >= 3) educated += b.pop;
    else if (b.kind === 'ind') indJobs += b.jobs;
    else if (b.kind === 'pub') pubJobs += b.jobs;
  }
  const jobs = comJobs + indJobs + offJobs + pubJobs;
  const workers = pop * 0.5;
  const emp = workers > 0 ? Math.min(1, jobs / workers) : 1;
  const unemp = workers > 0 ? Math.max(0, 1 - jobs / workers) : 0;
  const goodsNeed = comJobs * 0.8 + pop * 0.04;
  const goodsProd = indJobs * 0.9;
  G.dem.r = clamp(0.35 + (jobs - workers) / Math.max(30, workers * 0.5) + (st.happy - 50) / 150, -1, 1);
  G.dem.c = clamp((pop * 0.12 - comJobs) / Math.max(25, comJobs * 0.6 + 25), -1, 1);
  // oficinas: crecen con la población, sobre todo la de estratos 3-6 (más educación formal)
  G.dem.o = clamp((pop * 0.04 + educated * 0.1 - offJobs) / Math.max(30, offJobs * 0.6 + 30), -1, 1);
  G.dem.i = clamp((goodsNeed - goodsProd) / Math.max(25, goodsNeed) + unemp * 1.2 - 0.1, -1, 1);

  // --- crecimiento ---
  const cands = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const t = G.grid[y][x];
    if (t.zone && !t.bld && !t.road && !t.stop && !zoneProblem(x, y, true)) cands.push(t);
  }
  for (let i = cands.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [cands[i], cands[j]] = [cands[j], cands[i]]; }
  let spawned = 0;
  const maxSpawn = 5 + Math.floor(pop / 500);
  for (const t of cands) {
    if (spawned >= maxSpawn) break;
    const k = ZONES[t.zone].k;
    const p = G.dem[k] < -0.2 ? 0.005 : 0.05 + 0.45 * Math.max(0, G.dem[k]);
    if (rand() < p) { spawn(t); spawned++; }
  }
  if (spawned) { markDirty('zones'); G.dirty.pollLv = true; }

  // --- evolución del estrato según el valor del suelo ---
  const priv = G.buildings.filter((b) => b.kind === 'res' || b.kind === 'com' || b.kind === 'off');
  const K = Math.min(priv.length, 4 + Math.floor(priv.length / 40));
  for (let k = 0; k < K; k++) {
    const b = priv[Math.floor(rand() * priv.length)];
    const lv = G.lv[idx(b.x, b.y)];
    const target = estratoOf(lv);
    if (target > b.e && rand() < 0.18) restyle(b, b.e + 1);
    else if (target < b.e && lv < (b.e - 1) / 6 - 0.04 && rand() < 0.1) restyle(b, b.e - 1);
  }

  // --- economía ---
  const goodsRatio = goodsNeed > 0 ? Math.min(1, goodsProd / goodsNeed) : 1;
  const bud = { resTax: 0, comTax: 0, offTax: 0, indTax: 0, exports: 0, imports: 0, services: 0, roads: 0, transitRev: 0, transitCost: 0 };
  let hw = 0, hs = 0;
  const byE = [0, 0, 0, 0, 0, 0], byD = [0, 0, 0];
  for (const b of G.buildings) {
    if (b.kind === 'res') {
      bud.resTax += b.pop * TAX[b.e - 1] * DMULT[b.d] * (0.55 + 0.45 * emp);
      byE[b.e - 1] += b.pop; byD[b.d - 1] += b.pop;
      const i = idx(b.x, b.y);
      let sc = 0;
      for (const c of G.cov) sc += c[i];
      const h = clamp(28 + 7 * sc + (emp - 0.75) * 30 - G.poll[i] * 35, 3, 100);
      hw += h * b.pop; hs += b.pop;
    } else if (b.kind === 'off') bud.offTax += b.jobs * 26 * TIER_MULT[tierOf(b.e)];
    else if (b.kind === 'com') bud.comTax += b.jobs * 16 * TIER_MULT[tierOf(b.e)] * (0.5 + 0.5 * goodsRatio) * (0.6 + 0.4 * clamp(G.dem.c + 1, 0, 1));
    else if (b.kind === 'ind') bud.indTax += b.jobs * 14;
    else bud.services += PUBLIC[b.key].upkeep;
  }
  if (comJobs > 0) bud.imports = Math.max(0, goodsNeed - goodsProd) * 4;
  bud.exports = Math.max(0, goodsProd - goodsNeed) * 6;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const r = G.grid[y][x].road; if (r) bud.roads += ROADS[r.k].upkeep; }
  const tr = G.hooks.transitEconomy();
  bud.transitRev = tr.revenue; bud.transitCost = tr.upkeep;
  const income = bud.resTax + bud.comTax + bud.offTax + bud.indTax + bud.exports + bud.transitRev;
  const expense = bud.imports + bud.services + bud.roads + bud.transitCost;
  G.money += income - expense;
  Object.assign(st, {
    pop, jobs, workers, emp, happy: hs ? hw / hs : 50, income, expense, byE, byD, bldCount: G.buildings.length,
    comJobs, indJobs, offJobs, pubJobs, goodsNeed, goodsProd, budget: bud,
  });
  if (G.ticks % 10 === 0) G.month++;
  if (spawned || G.ticks % 5 === 0) G.onChange();
  G.onStats();
}

export function step(n = 1) {
  for (let i = 0; i < n; i++) { flush(); simulate(); }
  for (const b of G.growing) b.grow = 0.999;
}

export function update(dt) {
  flush();
  // obras: excavación (andamio bajo), estructura que sube dentro del andamio y retiro del andamio
  const gdt = dt * G.speed;
  for (let i = G.growing.length - 1; i >= 0; i--) {
    const b = G.growing[i];
    if (b.grow < 0.999) b.grow = Math.min(1, b.grow + gdt / buildTime(b));
    else b.grow = 1;
    const t = b.grow;
    const rise = Math.min(1, Math.max(0, (t - 0.12) / 0.8));
    const sy = t >= 1 ? 1 : Math.max(0.001, rise * rise * (3 - 2 * rise));
    if (b.h_) pools.set(b.h_, bldMatrix(b, sy));
    if (b.site_) pools.set(b.site_, siteMatrix(b, Math.min(b.mh + 0.05, b.mh * sy + 0.12)));
    if (t >= 1) { endSite(b); G.growing.splice(i, 1); }
  }
  pools.flush();
  if (G.speed > 0) {
    G.acc += dt * G.speed;
    let guard = 0;
    while (G.acc >= 1 && guard++ < 8) { G.acc -= 1; simulate(); }
    if (guard >= 8) G.acc = 0;
  }
}

export function renderStats() { return pools ? pools.stats() : { draws: 0, inst: 0 }; }

// ---------- guardado ----------
// Versión del formato de guardado. 3: grafo vial · 4: glorietas y versión explícita.
export const SAVE_VERSION = 4;

export function serialize() {
  const zones = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const t = G.grid[y][x];
    if (!t.road && t.zone) zones.push([x, y, t.zone]);
  }
  return {
    v: SAVE_VERSION, rounds: [...(G.net.rounds || [])], terrain: S.terrain, seed: G.seed, money: G.money, month: G.month, ticks: G.ticks, net: serializeNet(G.net), zones,
    blds: G.buildings.map((b) => ({ kind: b.kind, d: b.d, e: b.e, type: b.type, v: b.v, x: b.x, y: b.y, w: b.w, h: b.h, rot: b.rot, da: b.da, px: b.px, py: b.py, key: b.key })),
  };
}

export function clearAll() {
  for (const b of [...G.buildings]) removeBuilding(b);
  if (pools) pools.clear();
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const t = G.grid[y][x];
    t.road = null; t.zone = 0; t.bld = null;
  }
  G.net = createNet();
  applyCornerLevels(new Map());
  G.growing.length = 0;
  G.month = 0; G.ticks = 0; G.acc = 0;
  G.dem = { r: 0.4, c: 0, i: 0, o: 0 };
  G.stats = emptyStats();
  rand = rng(Date.now() & 0xffffff);
  markDirty('all');
}

// Carga una partida; devuelve { skipped } con los edificios que ya no existen. Lanza Error si la partida es de
// una versión más nueva que este juego.
export function load(d) {
  if ((d.v || 2) > SAVE_VERSION) throw new Error('La partida es de una versión más nueva del juego');
  clearAll();
  G.money = d.money; G.month = d.month; G.ticks = d.ticks || 0;
  // v3 guarda el grafo; las partidas v2 guardaban casillas sueltas y se convierten
  G.net = d.net ? loadNet(d.net) : netFromTiles(d.roads || []);
  rasterize(G.net, G.grid, N);
  applyCornerLevels(crossLevels(G.net, N, hC0));
  G.net.rounds = new Set(d.rounds || []);
  rasterize(G.net, G.grid, N);
  for (const [x, y, z] of d.zones) if (inb(x, y) && !G.grid[y][x].road) G.grid[y][x].zone = z;
  let skipped = 0;
  for (const b of d.blds) {
    // edificios de una versión anterior pueden usar modelos que ya no existen: se omiten (la zona vuelve a crecer)
    if (!inb(b.x, b.y) || (b.kind !== 'pub' && !hasModel(b.kind, b.type)) || (b.kind === 'pub' && !PUBLIC[b.key])) { skipped++; continue; }
    addBuilding(b);
  }
  for (const b of G.buildings) b.grow = 0.999;
  markDirty('all');
  flush();
  quickStats();
  return { skipped };
}

// población y empleo sin avanzar la simulación (para que el panel no quede en cero tras cargar en pausa)
function quickStats() {
  const st = G.stats;
  const byE = [0, 0, 0, 0, 0, 0], byD = [0, 0, 0];
  let pop = 0, jobs = 0;
  for (const b of G.buildings) {
    jobs += b.jobs;
    if (b.kind !== 'res') continue;
    pop += b.pop; byE[b.e - 1] += b.pop; byD[b.d - 1] += b.pop;
  }
  Object.assign(st, { pop, jobs, workers: pop * 0.5, emp: pop ? Math.min(1, jobs / (pop * 0.5)) : 1, byE, byD, bldCount: G.buildings.length });
}
