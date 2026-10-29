// Estado del juego, construcción (vías, zonas, edificios públicos) y simulación.
import * as THREE from '../vendor/three.module.min.js';
import { S, N, tw, Trees } from './scene.js';
import { makeMesh, rng } from './geom.js';
import {
  ESTRATOS, POP, POP_TOWER6, TAX, JOBS_COM, SERVICES, PUBLIC, COMERCIAL, buildPrivate, buildPublic,
} from './buildings.js';

export const COST = { road: 8000, zone: 1000, startMoney: 5_000_000 };
export const ZONE_COLORS = [null, ...ESTRATOS.map((e) => e.color), COMERCIAL.color];
const CATS = Object.keys(SERVICES);
const BIT = Object.fromEntries(CATS.map((c, i) => [c, 1 << i]));
export const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export const G = {
  grid: [],
  buildings: [],
  nextId: 1,
  money: COST.startMoney,
  month: 0,
  ticks: 0,
  speed: 1,
  acc: 0,
  cov: new Uint16Array(N * N),
  access: new Uint8Array(N * N),
  stats: { pop: 0, jobs: 0, emp: 1, happy: 50, income: 0, expense: 0, transit: 0, byE: [0, 0, 0, 0, 0, 0], bldCount: 0 },
  hooks: {
    roadsChanged() {}, removeStop() {}, transitCover: () => [], transitEconomy: () => ({ revenue: 0, upkeep: 0 }),
    stopsInTile: () => null,
  },
  onToast: () => {}, onStats: () => {}, onChange: () => {},
  growing: [],
  dirty: { roads: true, zones: true, cov: true },
};
const rand = rng(Date.now() & 0xffffff);

export const idx = (x, y) => y * N + x;
export const inb = (x, y) => x >= 0 && y >= 0 && x < N && y < N;
export const tile = (x, y) => (inb(x, y) ? G.grid[y][x] : null);
export const fmt = (n) => (n < 0 ? '-' : '') + '$' + Math.abs(Math.round(n)).toLocaleString('es-CO');

for (let y = 0; y < N; y++) {
  G.grid.push([]);
  for (let x = 0; x < N; x++) G.grid[y].push({ x, y, road: false, zone: 0, bld: null, stop: null });
}

// ---------- render de vías y zonas ----------
const unitBox = new THREE.BoxGeometry(1, 1, 1);
const asphalt = new THREE.InstancedMesh(unitBox, new THREE.MeshLambertMaterial({ color: '#3d4147' }), N * N);
const curbs = new THREE.InstancedMesh(unitBox, new THREE.MeshLambertMaterial({ color: '#c9c5ba' }), N * N * 4);
const marks = new THREE.InstancedMesh(unitBox, new THREE.MeshLambertMaterial({ color: '#f2c94c' }), N * N * 4);
[asphalt, curbs, marks].forEach((m) => { m.receiveShadow = true; m.frustumCulled = false; m.count = 0; });
const zoneGeo = new THREE.PlaneGeometry(0.98, 0.98).rotateX(-Math.PI / 2);
const zoneMesh = new THREE.InstancedMesh(zoneGeo, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.34, depthWrite: false }), N * N);
zoneMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * N * 3), 3);
zoneMesh.frustumCulled = false;
zoneMesh.count = 0;
zoneMesh.renderOrder = 2;
export const bldGroup = new THREE.Group();

export function attachWorld() {
  S.root.add(asphalt, curbs, marks, zoneMesh, bldGroup);
  Trees.init(G.grid);
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
function put(mesh, i, x, y, z, sx, sy, sz) {
  _m.compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
  mesh.setMatrixAt(i, _m);
}

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
export const isRoad = (x, y) => inb(x, y) && G.grid[y][x].road;

function rebuildRoads() {
  let a = 0, c = 0, m = 0;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (!G.grid[y][x].road) continue;
      const wx = tw(x), wz = tw(y);
      put(asphalt, a++, wx, 0.02, wz, 1.0, 0.04, 1.0);
      const con = DIRS.map(([dx, dy]) => isRoad(x + dx, y + dy));
      con.forEach((has, d) => {
        const [dx, dy] = DIRS[d];
        if (!has) {
          const horiz = dx === 0;
          put(curbs, c++, wx + dx * 0.44, 0.04, wz + dy * 0.44, horiz ? 1.0 : 0.12, 0.07, horiz ? 0.12 : 1.0);
        }
      });
      const n = con.filter(Boolean).length;
      if (n <= 2) {
        if (n === 0) put(marks, m++, wx, 0.045, wz, 0.08, 0.006, 0.08);
        con.forEach((has, d) => {
          if (!has) return;
          const [dx, dy] = DIRS[d];
          const horiz = dx !== 0;
          put(marks, m++, wx + dx * 0.25, 0.045, wz + dy * 0.25, horiz ? 0.5 : 0.04, 0.006, horiz ? 0.04 : 0.5);
        });
      }
    }
  }
  asphalt.count = a; curbs.count = c; marks.count = m;
  [asphalt, curbs, marks].forEach((mm) => { mm.instanceMatrix.needsUpdate = true; });
}

const _col = new THREE.Color();
function rebuildZones() {
  let n = 0;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const t = G.grid[y][x];
      if (!t.zone || t.bld) continue;
      put(zoneMesh, n, tw(x), 0.035, tw(y), 1, 1, 1);
      zoneMesh.setColorAt(n, _col.set(ZONE_COLORS[t.zone]));
      n++;
    }
  }
  zoneMesh.count = n;
  zoneMesh.instanceMatrix.needsUpdate = true;
  if (zoneMesh.instanceColor) zoneMesh.instanceColor.needsUpdate = true;
}

function recomputeAccess() {
  G.access.fill(0);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (!G.grid[y][x].road) continue;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (Math.abs(dx) + Math.abs(dy) > 2) continue;
          const xx = x + dx, yy = y + dy;
          if (inb(xx, yy)) G.access[idx(xx, yy)] = 1;
        }
      }
    }
  }
}

export function recomputeCoverage() {
  G.cov.fill(0);
  for (const b of G.buildings) {
    if (b.kind !== 'pub') continue;
    const d = PUBLIC[b.key];
    const cx = b.x + (b.w - 1) / 2, cy = b.y + (b.h - 1) / 2, R = d.radius + b.w / 2;
    for (let y = Math.max(0, Math.floor(cy - R)); y <= Math.min(N - 1, Math.ceil(cy + R)); y++) {
      for (let x = Math.max(0, Math.floor(cx - R)); x <= Math.min(N - 1, Math.ceil(cx + R)); x++) {
        if (Math.hypot(x - cx, y - cy) <= R) G.cov[idx(x, y)] |= BIT[d.cat];
      }
    }
  }
  for (const c of G.hooks.transitCover()) {
    for (let y = Math.max(0, c.y - c.r); y <= Math.min(N - 1, c.y + c.r); y++) {
      for (let x = Math.max(0, c.x - c.r); x <= Math.min(N - 1, c.x + c.r); x++) {
        if (Math.hypot(x - c.x, y - c.y) <= c.r) G.cov[idx(x, y)] |= BIT.transporte;
      }
    }
  }
}

export function coverageAt(x, y) {
  const v = G.cov[idx(x, y)];
  const list = CATS.filter((c) => v & BIT[c]);
  return { list, score: list.length };
}

export function markDirty(what = 'all') {
  if (what === 'all' || what === 'roads') { G.dirty.roads = true; G.dirty.cov = true; }
  if (what === 'all' || what === 'zones') G.dirty.zones = true;
  if (what === 'cov') G.dirty.cov = true;
}

export function flush() {
  if (G.dirty.roads) { rebuildRoads(); recomputeAccess(); G.dirty.roads = false; }
  if (G.dirty.zones) { rebuildZones(); Trees.refresh(); G.dirty.zones = false; }
  if (G.dirty.cov) { recomputeCoverage(); G.dirty.cov = false; }
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
function popOf(b) {
  if (b.kind === 'com') return 0;
  if (b.e === 6 && b.variant === 'tower') return POP_TOWER6[b.level - 1];
  return POP[b.e][b.level - 1];
}
export const taxMult = (b) => (b.e === 6 && b.variant === 'mansion' ? 8 : 1);

function attachMesh(b) {
  const geom = b.kind === 'pub' ? buildPublic(b.key) : buildPrivate(b.kind, b.e, b.level, b.seed, b.variant);
  const mesh = makeMesh(geom);
  mesh.position.set(tw(b.x) + (b.w - 1) / 2, 0, tw(b.y) + (b.h - 1) / 2);
  mesh.userData.b = b;
  mesh.scale.y = 0.02;
  bldGroup.add(mesh);
  b.mesh = mesh;
  mesh.userData.grow = 0;
  G.growing.push(mesh);
}

function detachMesh(b) {
  if (!b.mesh) return;
  bldGroup.remove(b.mesh);
  b.mesh.geometry.dispose();
  b.mesh = null;
}

export function addBuilding(o) {
  const b = {
    id: G.nextId++, kind: o.kind, e: o.e || 0, level: o.level || 1, x: o.x, y: o.y,
    w: o.w || 1, h: o.h || 1, seed: o.seed ?? Math.floor(rand() * 1e6), variant: o.variant || null, key: o.key || null,
    pop: 0, jobs: 0,
  };
  for (let j = 0; j < b.h; j++) for (let i = 0; i < b.w; i++) G.grid[b.y + j][b.x + i].bld = b;
  recalcBuilding(b);
  attachMesh(b);
  G.buildings.push(b);
  return b;
}

function recalcBuilding(b) {
  if (b.kind === 'res') { b.pop = popOf(b); b.jobs = 0; }
  else if (b.kind === 'com') { b.pop = 0; b.jobs = JOBS_COM[b.level - 1]; }
  else { b.pop = 0; b.jobs = PUBLIC[b.key].jobs; }
}

export function removeBuilding(b) {
  for (let j = 0; j < b.h; j++) for (let i = 0; i < b.w; i++) {
    const t = G.grid[b.y + j][b.x + i];
    if (t.bld === b) t.bld = null;
  }
  detachMesh(b);
  const k = G.buildings.indexOf(b);
  if (k >= 0) G.buildings.splice(k, 1);
}

function upgradeBuilding(b) {
  b.level++;
  recalcBuilding(b);
  detachMesh(b);
  attachMesh(b);
}

// ---------- operaciones de construcción ----------
export function roadLine(a, b) {
  // línea recta sobre el eje dominante
  const dx = b.x - a.x, dy = b.y - a.y;
  const out = [];
  if (Math.abs(dx) >= Math.abs(dy)) {
    const s = Math.sign(dx) || 1;
    for (let x = a.x; x !== b.x + s; x += s) out.push({ x, y: a.y });
  } else {
    const s = Math.sign(dy) || 1;
    for (let y = a.y; y !== b.y + s; y += s) out.push({ x: a.x, y });
  }
  return out;
}

export function roadOk(x, y) {
  const t = tile(x, y);
  return !!t && !t.bld && !(t.stop && t.stop.type === 'cable');
}

export function buildRoad(tiles) {
  const nw = tiles.filter((p) => roadOk(p.x, p.y) && !G.grid[p.y][p.x].road);
  if (!nw.length) return false;
  if (!spend(nw.length * COST.road)) return false;
  for (const p of nw) {
    const t = G.grid[p.y][p.x];
    t.road = true;
    t.zone = 0;
  }
  markDirty('all');
  flush();
  G.hooks.roadsChanged();
  G.onChange();
  return true;
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
  markDirty('cov');
  flush();
  G.onChange();
  return true;
}

export function canPlacePublic(key, x, y) {
  const d = PUBLIC[key];
  if (x < 0 || y < 0 || x + d.w > N || y + d.h > N) return { ok: false, tiles: [] };
  let ok = true, adj = false;
  const tiles = [];
  for (let j = 0; j < d.h; j++) {
    for (let i = 0; i < d.w; i++) {
      const t = G.grid[y + j][x + i];
      const bad = t.road || t.stop || (t.bld && t.bld.kind === 'pub');
      if (bad) ok = false;
      tiles.push({ x: x + i, y: y + j, ok: !bad });
    }
  }
  for (let j = 0; j < d.h; j++) for (let i = 0; i < d.w; i++) {
    for (const [dx, dy] of DIRS) {
      const ii = i + dx, jj = j + dy;
      if (ii >= 0 && jj >= 0 && ii < d.w && jj < d.h) continue;
      if (isRoad(x + ii, y + jj)) adj = true;
    }
  }
  if (!adj) { ok = false; tiles.forEach((t) => { t.ok = false; }); }
  return { ok, tiles, noRoad: !adj };
}

export function placePublic(key, x, y) {
  const c = canPlacePublic(key, x, y);
  if (!c.ok) {
    G.onToast(c.noRoad ? 'Debe estar junto a una vía' : 'No se puede construir aquí', 'warn');
    return false;
  }
  const d = PUBLIC[key];
  if (!spend(d.cost)) return false;
  for (let j = 0; j < d.h; j++) for (let i = 0; i < d.w; i++) {
    const t = G.grid[y + j][x + i];
    if (t.bld) removeBuilding(t.bld);
    t.zone = 0;
  }
  addBuilding({ kind: 'pub', key, x, y, w: d.w, h: d.h });
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
    else if (t.road) { t.road = false; n++; }
    else if (t.zone) { t.zone = 0; n++; }
  }
  if (!n) return false;
  markDirty('all');
  flush();
  G.hooks.roadsChanged();
  G.onChange();
  return true;
}

// ---------- simulación ----------
function popNear(x, y, r) {
  let s = 0;
  for (const b of G.buildings) {
    if (b.kind === 'res' && Math.abs(b.x - x) <= r && Math.abs(b.y - y) <= r) s += b.pop;
  }
  return s;
}

export function levelReq(e, lvl) {
  return Math.max(0, ESTRATOS[e - 1].req + lvl - 2);
}

function simulate() {
  G.ticks++;
  const st = G.stats;
  // empleo
  let pop = 0, jobs = 0;
  for (const b of G.buildings) { pop += b.pop; jobs += b.jobs; }
  const workers = pop * 0.4;
  const emp = workers > 0 ? Math.min(1, jobs / workers) : 1;

  // crecimiento
  const cands = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const t = G.grid[y][x];
    if (t.zone && !t.bld && !t.road && G.access[idx(x, y)]) cands.push(t);
  }
  let spawned = 0;
  const maxSpawn = 7;
  for (let i = cands.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [cands[i], cands[j]] = [cands[j], cands[i]]; }
  for (const t of cands) {
    if (spawned >= maxSpawn) break;
    if (t.zone <= 6) {
      const e = t.zone;
      const score = coverageAt(t.x, t.y).score;
      if (score < ESTRATOS[e - 1].req) continue;
      let p = 0.2;
      if (emp < 0.5 && e > 1) p *= 0.35;
      if (rand() < p) {
        addBuilding({ kind: 'res', e, x: t.x, y: t.y, variant: e === 6 ? (rand() < 0.5 ? 'mansion' : 'tower') : null });
        spawned++;
      }
    } else {
      const near = popNear(t.x, t.y, 6);
      const p = near >= 8 ? 0.2 : 0.015;
      if (rand() < p) { addBuilding({ kind: 'com', x: t.x, y: t.y }); spawned++; }
    }
  }

  if (spawned) markDirty('zones');

  // mejoras de nivel
  const priv = G.buildings.filter((b) => b.kind !== 'pub' && b.level < 3);
  for (let k = 0; k < Math.min(3, priv.length); k++) {
    const b = priv[Math.floor(rand() * priv.length)];
    if (!b || b.level >= 3) continue;
    const score = coverageAt(b.x, b.y).score;
    if (b.kind === 'res') {
      if (score >= levelReq(b.e, b.level + 1) && rand() < 0.25 && emp > 0.35) upgradeBuilding(b);
    } else if (popNear(b.x, b.y, 7) >= 25 * b.level && rand() < 0.25) upgradeBuilding(b);
  }

  // economía
  let tax = 0, upkeep = 0, comJobs = 0, hw = 0, hs = 0;
  const byE = [0, 0, 0, 0, 0, 0];
  for (const b of G.buildings) if (b.kind === 'com') comJobs += b.jobs;
  const demand = Math.min(1, pop / (comJobs * 3 + 1));
  pop = 0; jobs = 0;
  for (const b of G.buildings) {
    pop += b.pop; jobs += b.jobs;
    if (b.kind === 'res') {
      tax += b.pop * TAX[b.e] * taxMult(b) * (0.6 + 0.4 * emp);
      byE[b.e - 1] += b.pop;
      const sc = coverageAt(b.x, b.y).score;
      const h = Math.max(5, Math.min(100, 32 + 9 * sc + (emp - 0.7) * 30 - (b.e === 1 ? 6 : 0)));
      hw += h * b.pop; hs += b.pop;
    } else if (b.kind === 'com') tax += b.jobs * 25 * (0.4 + 0.6 * demand);
    else upkeep += PUBLIC[b.key].upkeep;
  }
  const tr = G.hooks.transitEconomy();
  const income = tax + tr.revenue, expense = upkeep + tr.upkeep;
  G.money += income - expense;
  Object.assign(st, {
    pop, jobs, emp: pop > 0 ? Math.min(1, jobs / (pop * 0.4)) : 1, happy: hs ? hw / hs : 50, income, expense,
    transit: tr.revenue, byE, bldCount: G.buildings.length,
  });
  if (G.ticks % 10 === 0) G.month++;
  if (spawned || G.ticks % 5 === 0) G.onChange();
  G.onStats();
}

export function step(n = 1) {
  for (let i = 0; i < n; i++) simulate();
}

export function update(dt) {
  flush();
  // animación de aparición
  for (let i = G.growing.length - 1; i >= 0; i--) {
    const m = G.growing[i];
    m.userData.grow = Math.min(1, m.userData.grow + dt * 2.2);
    const t = m.userData.grow;
    m.scale.y = Math.max(0.02, 1 - Math.pow(1 - t, 3) * (1 + 0.15 * Math.sin(t * 6)));
    if (t >= 1) { m.scale.y = 1; G.growing.splice(i, 1); }
  }
  if (G.speed > 0) {
    G.acc += dt * G.speed;
    let guard = 0;
    while (G.acc >= 1 && guard++ < 8) { G.acc -= 1; simulate(); }
    if (guard >= 8) G.acc = 0;
  }
}

// ---------- guardado ----------
export function serialize() {
  const roads = [], zones = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const t = G.grid[y][x];
    if (t.road) roads.push(x, y);
    else if (t.zone) zones.push([x, y, t.zone]);
  }
  return {
    v: 1, money: G.money, month: G.month, ticks: G.ticks, roads, zones,
    blds: G.buildings.map((b) => ({ kind: b.kind, e: b.e, level: b.level, x: b.x, y: b.y, w: b.w, h: b.h, seed: b.seed, variant: b.variant, key: b.key })),
  };
}

export function clearAll() {
  for (const b of [...G.buildings]) removeBuilding(b);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const t = G.grid[y][x];
    t.road = false; t.zone = 0; t.bld = null;
  }
  G.growing.length = 0;
  G.month = 0; G.ticks = 0; G.acc = 0;
  markDirty('all');
}

export function load(d) {
  clearAll();
  G.money = d.money; G.month = d.month; G.ticks = d.ticks || 0;
  for (let i = 0; i < d.roads.length; i += 2) G.grid[d.roads[i + 1]][d.roads[i]].road = true;
  for (const [x, y, z] of d.zones) G.grid[y][x].zone = z;
  for (const b of d.blds) addBuilding(b);
  for (const m of G.growing) m.userData.grow = 1;
  G.growing.length = 0;
  for (const b of G.buildings) b.mesh.scale.y = 1;
  markDirty('all');
  flush();
}
