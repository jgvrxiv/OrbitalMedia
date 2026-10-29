// Estado del juego, construcción (vías, zonas, edificios públicos) y simulación agregada (sin agentes).
//
// - Las ZONAS definen uso (residencial / comercial / industrial) y DENSIDAD (baja / media / alta).
// - El ESTRATO (1-6) de cada edificio NO lo elige el jugador: sale del VALOR DEL SUELO, que depende de
//   la cobertura de servicios, el tipo de vía, el comercio cercano y la contaminación.
// - La demanda R/C/I equilibra vivienda, empleo y bienes (la industria produce, el comercio consume).
import * as THREE from '../vendor/three.module.min.js';
import { S, N, tw, Trees, TileLayer, padOf, tileCenterH, applyCornerLevels, hC0 } from './scene.js';
import { mats, rng, Builder } from './geom.js';
import { InstPools } from './render.js';
import { ROADS, buildRoadMesh } from './roads.js';
import { createNet, lanesOf, addSegment, removeCell, rasterize, netFromTiles, serializeNet, loadNet, crossLevels } from './roadnet.js';
import { buildModel, VARIANTS, typeName } from './models.js';
import { pickResType, resPop } from './models_res.js';
import { pickComType, COM_JOBS, COM_TYPES, tierOf } from './models_com.js';
import { pickIndType, IND_JOBS, IND_TYPES } from './models_ind.js';
import { PUBLIC, SERVICES, buildPublic } from './buildings.js';

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
};
export const DENS_NAME = ['', 'Baja', 'Media', 'Alta'];
export const ESTRATO_COLORS = ['#e5484d', '#f08a24', '#f2d024', '#6cc04a', '#2f9bd6', '#9b5de5'];
export const MAX_SLOPE = { 1: 0.75, 2: 0.55, 3: 0.45 };
const TAX = [-3, 4, 8, 18, 35, 60];
const DMULT = { 1: 2.2, 2: 1.2, 3: 1 };
const TIER_MULT = { 1: 1, 2: 1.3, 3: 1.7 };

export const CATS = Object.keys(SERVICES);
export const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const emptyStats = () => ({
  pop: 0, jobs: 0, workers: 0, emp: 1, happy: 50, income: 0, expense: 0,
  byE: [0, 0, 0, 0, 0, 0], byD: [0, 0, 0], bldCount: 0, comJobs: 0, indJobs: 0, pubJobs: 0,
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
  dem: { r: 0.4, c: 0, i: 0 },
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
    if (t.zone && !t.bld) list.push({ x, y, color: ZONES[t.zone].color });
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
    else if (mode === 'slope') { const s = padOf(x, y).slope; c = s > MAX_SLOPE[1] ? '#d62828' : s > MAX_SLOPE[2] ? '#f77f00' : s > MAX_SLOPE[3] ? '#fcbf49' : '#90be6d'; }
    else if (mode === 'svc') { let s = 0; for (const a of G.cov) s += a[i]; c = ramp(s / 8, ['#d62828', '#fcbf49', '#2a9d8f']); }
    list.push({ x, y, color: c });
  }
  overlayLayer.set(list, 0.0);
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
const DIAG_SCALE = 0.74; // un lote girado 45° debe caber en su casilla
function bldMatrix(b, sy = 1) {
  const diag = b.da !== undefined && b.da !== null;
  _q.setFromAxisAngle(_up, diag ? b.da : ROT[b.rot] ?? 0);
  _p.set(tw(b.x) + (b.w - 1) / 2, b.top, tw(b.y) + (b.h - 1) / 2);
  _s.set(diag ? DIAG_SCALE : 1, sy, diag ? DIAG_SCALE : 1);
  return _m.compose(_p, _q, _s);
}

export const modelKey = (b) => (b.kind === 'pub' ? 'pub:' + b.key : `${b.kind}:${b.type}:${b.kind === 'ind' ? 3 : b.e}:${b.v}`);

function attach(b) {
  const pad = padOf(b.x, b.y, b.w, b.h);
  b.top = pad.top;
  const geomFn = b.kind === 'pub' ? () => buildPublic(b.key) : () => buildModel({ kind: b.kind, type: b.type, e: b.kind === 'ind' ? 3 : b.e, v: b.v });
  b.h_ = pools.add(modelKey(b), geomFn, bldMatrix(b, 0.02));
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
  const k = G.growing.indexOf(b);
  if (k >= 0) G.growing.splice(k, 1);
}

// ---------- servicios, contaminación, valor del suelo, acceso ----------
function recomputeAccess() {
  G.access.fill(0);
  G.face.fill(-1);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (G.grid[y][x].road) continue;
    let best = 0, dir = -1;
    DIRS.forEach(([dx, dy], d) => {
      const r = roadAt(x + dx, y + dy);
      if (r && ROADS[r.k].dens > best) { best = ROADS[r.k].dens; dir = d; }
    });
    if (!best) {
      DIRS.forEach(([dx, dy], d) => {
        if (best) return;
        const r = roadAt(x + 2 * dx, y + 2 * dy);
        const mid = tile(x + dx, y + dy);
        if (r && ROADS[r.k].dens > 0 && mid && !mid.road) { best = 1; dir = d; }
      });
    }
    G.access[idx(x, y)] = best;
    G.face[idx(x, y)] = dir;
  }
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
    if (b.kind !== 'com') continue;
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
  else if (b.kind === 'ind') b.jobs = Math.round(IND_JOBS[b.d] * (IND_TYPES[b.type]?.jobs ?? 1));
  else b.jobs = PUBLIC[b.key].jobs;
}

export function addBuilding(o) {
  const b = {
    id: G.nextId++, kind: o.kind, d: o.d || 1, e: o.e || 1, type: o.type || null, v: o.v ?? Math.floor(rand() * VARIANTS),
    x: o.x, y: o.y, w: o.w || 1, h: o.h || 1, rot: o.rot ?? 2, da: o.da ?? null, key: o.key || null, pop: 0, jobs: 0,
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
  if (b.kind === 'ind' || b.kind === 'com') G.dirty.pollLv = true;
  if (b.kind === 'pub') markDirty('cov');
}

function restyle(b, e) {
  b.e = e;
  if (b.kind === 'res') b.type = pickResType(b.d, e, rand);
  else if (b.kind === 'com') b.type = pickComType(b.d, e, rand);
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
  if (a < Z.d) return Z.d === 3 ? 'Alta densidad requiere avenida o troncal al frente' : 'Densidad media requiere una calle (no destapada) al frente';
  const s = padOf(x, y).slope;
  if (s > MAX_SLOPE[Z.d] + (Z.k === 'r' && Z.d === 1 ? 0.25 : 0)) return 'Terreno muy inclinado para esta densidad';
  if (!ignoreDemand && G.dem[Z.k] < -0.2) return 'Poca demanda de ' + (Z.k === 'r' ? 'vivienda' : Z.k === 'c' ? 'comercio' : 'industria');
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
  const steep = padOf(x, y, d.w, d.h).slope > 1.0;
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

// Si el frente del lote da a una vía diagonal, ángulo para que la fachada (+Z del modelo) la mire a 45°.
function diagFacing(x, y) {
  const d = G.face[idx(x, y)];
  if (d < 0) return null;
  const [dx, dy] = DIRS[d];
  const r = roadAt(x + dx, y + dy);
  if (!r || r.ax !== 3) return null;
  // normales posibles de la diagonal (dirección (1, dy)): (-dy, 1) y (dy, -1); se elige la que apunta a la vía
  let nx = -r.dy, nz = 1;
  if (nx * dx + nz * dy < 0) { nx = -nx; nz = -nz; }
  return Math.atan2(nx, nz);
}

function spawn(t) {
  const Z = ZONES[t.zone];
  const i = idx(t.x, t.y);
  const base = { x: t.x, y: t.y, d: Z.d, rot: G.face[i] >= 0 ? G.face[i] : 2, da: diagFacing(t.x, t.y) };
  if (Z.k === 'r') {
    let e = estratoOf(G.lv[i]);
    if (e > 1 && rand() < 0.2) e--;
    addBuilding({ ...base, kind: 'res', e, type: pickResType(Z.d, e, rand) });
  } else if (Z.k === 'c') {
    const e = estratoOf(G.lv[i]);
    addBuilding({ ...base, kind: 'com', e, type: pickComType(Z.d, e, rand) });
  } else addBuilding({ ...base, kind: 'ind', e: 3, type: pickIndType(Z.d, rand) });
}

function simulate() {
  G.ticks++;
  const st = G.stats;
  if (G.dirty.pollLv || G.ticks % 5 === 0) { recomputePollution(); recomputeLandValue(); G.dirty.pollLv = false; if (G.overlay) refreshOverlay(); }

  // --- totales y demanda ---
  let pop = 0, comJobs = 0, indJobs = 0, pubJobs = 0;
  for (const b of G.buildings) {
    pop += b.pop;
    if (b.kind === 'com') comJobs += b.jobs;
    else if (b.kind === 'ind') indJobs += b.jobs;
    else if (b.kind === 'pub') pubJobs += b.jobs;
  }
  const jobs = comJobs + indJobs + pubJobs;
  const workers = pop * 0.5;
  const emp = workers > 0 ? Math.min(1, jobs / workers) : 1;
  const unemp = workers > 0 ? Math.max(0, 1 - jobs / workers) : 0;
  const goodsNeed = comJobs * 0.8 + pop * 0.04;
  const goodsProd = indJobs * 0.9;
  G.dem.r = clamp(0.35 + (jobs - workers) / Math.max(30, workers * 0.5) + (st.happy - 50) / 150, -1, 1);
  G.dem.c = clamp((pop * 0.12 - comJobs) / Math.max(25, comJobs * 0.6 + 25), -1, 1);
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
  const priv = G.buildings.filter((b) => b.kind === 'res' || b.kind === 'com');
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
  const bud = { resTax: 0, comTax: 0, indTax: 0, exports: 0, imports: 0, services: 0, roads: 0, transitRev: 0, transitCost: 0 };
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
    } else if (b.kind === 'com') bud.comTax += b.jobs * 16 * TIER_MULT[tierOf(b.e)] * (0.5 + 0.5 * goodsRatio) * (0.6 + 0.4 * clamp(G.dem.c + 1, 0, 1));
    else if (b.kind === 'ind') bud.indTax += b.jobs * 14;
    else bud.services += PUBLIC[b.key].upkeep;
  }
  if (comJobs > 0) bud.imports = Math.max(0, goodsNeed - goodsProd) * 4;
  bud.exports = Math.max(0, goodsProd - goodsNeed) * 6;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const r = G.grid[y][x].road; if (r) bud.roads += ROADS[r.k].upkeep; }
  const tr = G.hooks.transitEconomy();
  bud.transitRev = tr.revenue; bud.transitCost = tr.upkeep;
  const income = bud.resTax + bud.comTax + bud.indTax + bud.exports + bud.transitRev;
  const expense = bud.imports + bud.services + bud.roads + bud.transitCost;
  G.money += income - expense;
  Object.assign(st, {
    pop, jobs, workers, emp, happy: hs ? hw / hs : 50, income, expense, byE, byD, bldCount: G.buildings.length,
    comJobs, indJobs, pubJobs, goodsNeed, goodsProd, budget: bud,
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
  for (let i = G.growing.length - 1; i >= 0; i--) {
    const b = G.growing[i];
    b.grow = Math.min(1, b.grow + dt * 2.2);
    const t = b.grow;
    const sy = t >= 1 ? 1 : Math.max(0.02, 1 - Math.pow(1 - t, 3) * (1 + 0.15 * Math.sin(t * 6)));
    if (b.h_) pools.set(b.h_, bldMatrix(b, sy));
    if (t >= 1) G.growing.splice(i, 1);
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
export function serialize() {
  const zones = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const t = G.grid[y][x];
    if (!t.road && t.zone) zones.push([x, y, t.zone]);
  }
  return {
    v: 3, terrain: S.terrain, seed: G.seed, money: G.money, month: G.month, ticks: G.ticks, net: serializeNet(G.net), zones,
    blds: G.buildings.map((b) => ({ kind: b.kind, d: b.d, e: b.e, type: b.type, v: b.v, x: b.x, y: b.y, w: b.w, h: b.h, rot: b.rot, da: b.da, key: b.key })),
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
  G.dem = { r: 0.4, c: 0, i: 0 };
  G.stats = emptyStats();
  rand = rng(Date.now() & 0xffffff);
  markDirty('all');
}

export function load(d) {
  clearAll();
  G.money = d.money; G.month = d.month; G.ticks = d.ticks || 0;
  // v3 guarda el grafo; las partidas v2 guardaban casillas sueltas y se convierten
  G.net = d.net ? loadNet(d.net) : netFromTiles(d.roads || []);
  rasterize(G.net, G.grid, N);
  applyCornerLevels(crossLevels(G.net, N, hC0));
  for (const [x, y, z] of d.zones) G.grid[y][x].zone = z;
  for (const b of d.blds) addBuilding(b);
  for (const b of G.buildings) b.grow = 0.999;
  markDirty('all');
  flush();
  quickStats();
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
