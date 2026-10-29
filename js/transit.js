// Transporte público: paraderos de bus, estaciones de Metrocable, líneas, vehículos y tráfico ambiente.
import * as THREE from '../vendor/three.module.min.js';
import { S, N, tw } from './scene.js';
import { Builder, makeMesh, mats } from './geom.js';
import { buildBusStop, buildCableStation, buildPylon, buildBus, buildCabin, buildCar, CABLE_Y } from './buildings.js';
import { G, tile, isRoad, inb, spend, markDirty, flush } from './game.js';

export const TRANSIT = {
  bus: { stopCost: 25000, stopUpkeep: 60, vehCost: 80000, vehUpkeep: 400, cap: 60, fare: 40, speed: 2.4, name: 'Bus' },
  cable: { stopCost: 400000, stopUpkeep: 800, vehCost: 60000, vehUpkeep: 150, cap: 40, fare: 50, speed: 1.7, name: 'Metrocable' },
};
export const LINE_COLORS = ['#e63946', '#2a9d8f', '#f4a261', '#3a86ff', '#8338ec', '#06d6a0', '#ff006e', '#fb8500', '#118ab2', '#c77dff'];
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

export const T = { stops: [], lines: [], nextStop: 1, nextLine: 1, colorIdx: 0 };
export const grp = new THREE.Group();
const overlayGrp = new THREE.Group();
const vehGrp = new THREE.Group();
const stopGrp = new THREE.Group();
let previewGrp = null;

export function attachTransit() {
  S.root.add(grp);
  grp.add(overlayGrp, vehGrp, stopGrp);
  initCars();
}

// ---------- paradas ----------
export function stopOk(type, x, y) {
  const t = tile(x, y);
  if (!t || t.stop) return false;
  if (type === 'bus') return t.road;
  return !t.road && !t.bld;
}

export function addStop(type, x, y) {
  if (!stopOk(type, x, y)) {
    G.onToast(type === 'bus' ? 'El paradero va sobre una vía libre' : 'La estación necesita un lote libre', 'warn');
    return null;
  }
  if (!spend(TRANSIT[type].stopCost)) return null;
  const t = G.grid[y][x];
  let geom;
  if (type === 'bus') {
    const free = DIRS.find(([dx, dy]) => !isRoad(x + dx, y + dy)) || [0, -1];
    geom = buildBusStop(free);
  } else {
    geom = buildCableStation();
    if (t.zone) { t.zone = 0; markDirty('zones'); }
  }
  const mesh = makeMesh(geom);
  mesh.position.set(tw(x), 0, tw(y));
  const stop = { id: T.nextStop++, type, x, y };
  mesh.userData.stop = stop;
  stop.mesh = mesh;
  stopGrp.add(mesh);
  t.stop = stop;
  T.stops.push(stop);
  markDirty('zones'); markDirty('cov');
  flush();
  G.onChange();
  return stop;
}

export function removeStop(stop) {
  const t = G.grid[stop.y][stop.x];
  if (t.stop === stop) t.stop = null;
  stopGrp.remove(stop.mesh);
  stop.mesh.geometry.dispose();
  T.stops.splice(T.stops.indexOf(stop), 1);
  for (const line of [...T.lines]) {
    if (!line.stops.includes(stop)) continue;
    line.stops = line.stops.filter((s) => s !== stop);
    if (line.stops.length < 2) deleteLine(line, true);
    else computeRoute(line);
  }
  markDirty('zones'); markDirty('cov');
  G.onToast('Parada eliminada', 'info');
}

// ---------- rutas ----------
function findPath(ax, ay, bx, by) {
  if (ax === bx && ay === by) return [[ax, ay]];
  const prev = new Int32Array(N * N).fill(-1);
  const q = [ay * N + ax];
  prev[ay * N + ax] = ay * N + ax;
  for (let h = 0; h < q.length; h++) {
    const c = q[h], cx = c % N, cy = (c / N) | 0;
    if (cx === bx && cy === by) break;
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx, ny = cy + dy;
      if (!inb(nx, ny) || !G.grid[ny][nx].road) continue;
      const ni = ny * N + nx;
      if (prev[ni] !== -1) continue;
      prev[ni] = c;
      q.push(ni);
    }
  }
  const end = by * N + bx;
  if (prev[end] === -1) return null;
  const out = [];
  for (let c = end; c !== ay * N + ax; c = prev[c]) out.push([c % N, (c / N) | 0]);
  out.push([ax, ay]);
  return out.reverse();
}

// devuelve puntos de un recorrido cerrado (ida y vuelta) o null si no hay conexión
export function computePoints(type, stops) {
  if (stops.length < 2) return null;
  const fwd = [];
  if (type === 'bus') {
    for (let i = 0; i < stops.length - 1; i++) {
      const p = findPath(stops[i].x, stops[i].y, stops[i + 1].x, stops[i + 1].y);
      if (!p) return null;
      p.forEach((pt, k) => {
        if (i > 0 && k === 0) return;
        fwd.push({ x: tw(pt[0]), z: tw(pt[1]), y: 0, dwell: false, tx: pt[0], ty: pt[1] });
      });
    }
    stops.forEach((s) => {
      const f = fwd.find((p) => p.tx === s.x && p.ty === s.y);
      if (f) f.dwell = true;
    });
    fwd[0].dwell = true;
    fwd[fwd.length - 1].dwell = true;
  } else {
    stops.forEach((s) => fwd.push({ x: tw(s.x), z: tw(s.y), y: 0.02, dwell: true, tx: s.x, ty: s.y }));
  }
  const back = fwd.slice(1, -1).reverse().map((p) => ({ ...p, dwell: type === 'cable' ? p.dwell : false }));
  // en el retorno sólo detenerse en paradas reales
  if (type === 'bus') back.forEach((p) => { p.dwell = stops.some((s) => s.x === p.tx && s.y === p.ty); });
  return { fwd, loop: fwd.concat(back) };
}

function finishRoute(line, pts) {
  const loop = pts.loop;
  const n = loop.length;
  const cum = [0];
  for (let i = 0; i < n; i++) {
    const a = loop[i], b = loop[(i + 1) % n];
    cum.push(cum[i] + Math.max(0.0001, Math.hypot(b.x - a.x, b.z - a.z)));
  }
  line.pts = loop; line.cum = cum; line.len = cum[n]; line.fwd = pts.fwd;
  line.ok = true;
}

function seg(p0, p1, r, color) {
  const dir = new THREE.Vector3(p1.x - p0.x, p1.y - p0.y, p1.z - p0.z);
  const len = dir.length();
  const g = new THREE.CylinderGeometry(r, r, len, 4);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color }));
  m.position.set((p0.x + p1.x) / 2, (p0.y + p1.y) / 2, (p0.z + p1.z) / 2);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return m;
}

export function routeOverlay(type, fwd, color, opacity = 1) {
  const g = new THREE.Group();
  if (type === 'bus') {
    const B = new Builder();
    for (let i = 0; i < fwd.length - 1; i++) {
      const a = fwd[i], b = fwd[i + 1];
      const cx = (a.x + b.x) / 2, cz = (a.z + b.z) / 2;
      const horiz = Math.abs(b.x - a.x) > 0.01;
      B.box(cx, 0.045, cz, horiz ? 1.04 : 0.11, 0.012, horiz ? 0.11 : 1.04, color, { noTop: false });
    }
    const m = new THREE.Mesh(B.build(), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: opacity < 1, opacity, depthWrite: false }));
    m.renderOrder = 3;
    g.add(m);
  } else {
    const pylon = buildPylon();
    for (let i = 0; i < fwd.length - 1; i++) {
      const a = { x: fwd[i].x, y: CABLE_Y - 0.05, z: fwd[i].z }, b = { x: fwd[i + 1].x, y: CABLE_Y - 0.05, z: fwd[i + 1].z };
      g.add(seg(a, b, 0.012, '#2b2b2b'));
      const L = Math.hypot(b.x - a.x, b.z - a.z);
      const k = Math.floor(L / 3.2);
      for (let j = 1; j <= k; j++) {
        const t = j / (k + 1);
        const p = makeMesh(pylon, false);
        p.position.set(a.x + (b.x - a.x) * t, 0, a.z + (b.z - a.z) * t);
        p.rotation.y = Math.atan2(-(b.z - a.z), b.x - a.x) + Math.PI / 2;
        g.add(p);
      }
    }
  }
  return g;
}

export function setPreviewRoute(type, stops) {
  if (previewGrp) { grp.remove(previewGrp); previewGrp = null; }
  if (!stops || stops.length < 2) return null;
  const pts = computePoints(type, stops);
  if (!pts) {
    // marcar los paraderos como no conectados
    return false;
  }
  previewGrp = routeOverlay(type, pts.fwd, '#ffffff', 0.9);
  grp.add(previewGrp);
  return true;
}
export function clearPreviewRoute() {
  if (previewGrp) { grp.remove(previewGrp); previewGrp = null; }
}

function computeRoute(line) {
  if (line.overlay) { overlayGrp.remove(line.overlay); line.overlay = null; }
  const pts = computePoints(line.type, line.stops);
  if (!pts) {
    line.ok = false;
    line.vehicles.forEach((v) => { v.mesh.visible = false; });
    return false;
  }
  finishRoute(line, pts);
  line.overlay = routeOverlay(line.type, pts.fwd, line.color);
  overlayGrp.add(line.overlay);
  line.vehicles.forEach((v) => { v.mesh.visible = true; });
  spreadVehicles(line);
  return true;
}

function spreadVehicles(line) {
  const n = line.vehicles.length;
  line.vehicles.forEach((v, i) => { v.s = (i / Math.max(1, n)) * line.len; v.k = segAt(line, v.s); v.dwell = 0; v.skip = null; });
}

function segAt(line, s) {
  const c = line.cum;
  let k = 0;
  while (k < line.pts.length - 1 && c[k + 1] <= s) k++;
  return k;
}

export function recomputeAll() {
  for (const line of [...T.lines]) computeRoute(line);
  ensureCars();
  markDirty('cov');
}

// ---------- líneas ----------
function makeVehicleMesh(line) {
  const geom = line.type === 'bus' ? buildBus(line.color) : buildCabin(line.color);
  const m = makeMesh(geom, true);
  vehGrp.add(m);
  return m;
}

export function addVehicle(line, free = false) {
  const c = TRANSIT[line.type];
  if (line.vehicles.length >= 12) { G.onToast('Máximo 12 vehículos por línea', 'warn'); return false; }
  if (!free && !spend(c.vehCost)) return false;
  line.vehicles.push({ mesh: makeVehicleMesh(line), s: 0, k: 0, dwell: 0, h: 0, skip: null });
  if (line.ok) spreadVehicles(line);
  markDirty('cov');
  G.onChange();
  return true;
}

export function removeVehicle(line) {
  const v = line.vehicles.pop();
  if (!v) return;
  vehGrp.remove(v.mesh);
  v.mesh.geometry.dispose();
  if (line.ok) spreadVehicles(line);
  markDirty('cov');
  G.onChange();
}

export function createLine(type, stops, opts = {}) {
  if (stops.length < 2) { G.onToast('Una línea necesita al menos 2 paradas', 'warn'); return null; }
  const pts = computePoints(type, stops);
  if (!pts) { G.onToast('Las paradas no están conectadas por vías', 'warn'); return null; }
  if (!opts.free && !spend(TRANSIT[type].vehCost)) return null;
  const id = T.nextLine++;
  const line = {
    id, type, stops: [...stops], color: opts.color || LINE_COLORS[T.colorIdx++ % LINE_COLORS.length],
    name: opts.name || (type === 'bus' ? 'Ruta B' : 'Metrocable L') + id,
    vehicles: [], ok: true, riders: 0, revenue: 0, demand: 0,
  };
  T.lines.push(line);
  computeRoute(line);
  addVehicle(line, true);
  const extra = opts.vehicles ? opts.vehicles - 1 : 0;
  for (let i = 0; i < extra; i++) addVehicle(line, true);
  markDirty('cov');
  G.onChange();
  return line;
}

export function deleteLine(line, quiet) {
  line.vehicles.forEach((v) => { vehGrp.remove(v.mesh); v.mesh.geometry.dispose(); });
  line.vehicles = [];
  if (line.overlay) overlayGrp.remove(line.overlay);
  T.lines.splice(T.lines.indexOf(line), 1);
  markDirty('cov');
  if (!quiet) G.onToast('Línea eliminada', 'info');
  G.onChange();
}

// ---------- economía y cobertura ----------
export function cover() {
  const out = [];
  const seen = new Set();
  for (const line of T.lines) {
    if (!line.ok || !line.vehicles.length) continue;
    for (const s of line.stops) if (!seen.has(s.id)) { seen.add(s.id); out.push({ x: s.x, y: s.y, r: 5 }); }
  }
  return out;
}

export function economy() {
  let revenue = 0, upkeep = 0;
  for (const s of T.stops) upkeep += TRANSIT[s.type].stopUpkeep;
  for (const line of T.lines) {
    const c = TRANSIT[line.type];
    upkeep += line.vehicles.length * c.vehUpkeep;
    line.riders = 0; line.revenue = 0; line.demand = 0;
    if (!line.ok || !line.vehicles.length) continue;
    const ids = new Set();
    let dem = 0;
    for (const b of G.buildings) {
      if (b.kind !== 'res' || ids.has(b.id)) continue;
      for (const s of line.stops) {
        if (Math.hypot(b.x - s.x, b.y - s.y) <= 5) { ids.add(b.id); dem += b.pop; break; }
      }
    }
    line.demand = dem;
    line.riders = Math.min(dem * 0.18, line.vehicles.length * c.cap);
    line.revenue = line.riders * c.fare;
    revenue += line.revenue;
  }
  return { revenue, upkeep };
}

// ---------- animación de vehículos ----------
const tmpA = new THREE.Vector3();
function updateVehicle(line, v, dt) {
  const c = TRANSIT[line.type];
  const n = line.pts.length;
  if (v.dwell > 0) v.dwell -= dt;
  else {
    v.s += c.speed * dt;
    // ¿cruzó un punto de parada?
    for (let guard = 0; guard < 4; guard++) {
      const endS = line.cum[v.k + 1];
      if (v.s < endS) break;
      const nk = (v.k + 1) % n;
      if (line.pts[nk].dwell) {
        v.s = endS;
        v.dwell = 1.4;
        v.k = nk;
        if (nk === 0) v.s = 0;
        break;
      }
      v.k = nk;
      if (nk === 0) v.s -= line.len;
    }
  }
  const a = line.pts[v.k], b = line.pts[(v.k + 1) % n];
  const sl = line.cum[v.k + 1] - line.cum[v.k];
  const t = Math.min(1, Math.max(0, (v.s - line.cum[v.k]) / sl));
  const dx = (b.x - a.x) / sl, dz = (b.z - a.z) / sl;
  const off = line.type === 'bus' ? 0.11 : 0.04;
  v.mesh.position.set(a.x + (b.x - a.x) * t - dz * off, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t + dx * off);
  const target = Math.atan2(-dz, dx);
  let d = target - v.h;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  v.h += d * Math.min(1, dt * 10);
  v.mesh.rotation.y = line.type === 'bus' ? v.h : 0;
  void tmpA;
}

// ---------- tráfico ambiente ----------
let carMesh = null;
const cars = [];
const MAXC = 70;
const carColors = ['#f7d117', '#f7d117', '#f7d117', '#d62828', '#2a6fdb', '#e8e8e8', '#2b2b2b', '#2a9d4a', '#f4a261', '#9aa0a6'];

function initCars() {
  carMesh = new THREE.InstancedMesh(buildCar('#ffffff'), mats.solid, MAXC);
  carMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAXC * 3), 3);
  carMesh.frustumCulled = false;
  carMesh.castShadow = true;
  carMesh.count = 0;
  grp.add(carMesh);
}

function roadTiles() {
  const out = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (G.grid[y][x].road) out.push(G.grid[y][x]);
  return out;
}

function nextTile(c) {
  const opts = DIRS.map(([dx, dy]) => [c.tx + dx, c.ty + dy]).filter(([x, y]) => isRoad(x, y));
  if (!opts.length) return null;
  const fwd = opts.filter(([x, y]) => !(x === c.px && y === c.py));
  const list = fwd.length ? fwd : opts;
  return list[Math.floor(Math.random() * list.length)];
}

export function ensureCars() {
  const rt = roadTiles();
  const want = Math.min(MAXC, Math.floor(rt.length / 2.2));
  while (cars.length > want) cars.pop();
  while (cars.length < want && rt.length) {
    const t = rt[Math.floor(Math.random() * rt.length)];
    cars.push({ tx: t.x, ty: t.y, px: -1, py: -1, nx: t.x, ny: t.y, t: 1, colorIdx: Math.floor(Math.random() * carColors.length), h: 0, speed: 1.6 + Math.random() * 0.8 });
  }
  const col = new THREE.Color();
  cars.forEach((c, i) => { carMesh.setColorAt(i, col.set(carColors[c.colorIdx])); });
  if (carMesh.instanceColor) carMesh.instanceColor.needsUpdate = true;
  carMesh.count = cars.length;
}

const _m4 = new THREE.Matrix4(), _q4 = new THREE.Quaternion(), _p4 = new THREE.Vector3(), _s4 = new THREE.Vector3(1, 1, 1), _up = new THREE.Vector3(0, 1, 0);
function updateCars(dt) {
  for (let i = 0; i < cars.length; i++) {
    const c = cars[i];
    if (!isRoad(c.tx, c.ty)) {
      const rt = roadTiles();
      if (!rt.length) { cars.length = 0; ensureCars(); return; }
      const t = rt[Math.floor(Math.random() * rt.length)];
      Object.assign(c, { tx: t.x, ty: t.y, px: -1, py: -1, nx: t.x, ny: t.y, t: 1 });
    }
    c.t += c.speed * dt;
    while (c.t >= 1) {
      c.t -= 1;
      c.px = c.tx; c.py = c.ty;
      c.tx = c.nx; c.ty = c.ny;
      const nx = nextTile({ tx: c.tx, ty: c.ty, px: c.px, py: c.py });
      if (!nx) { c.nx = c.tx; c.ny = c.ty; c.t = 0.5; break; }
      c.nx = nx[0]; c.ny = nx[1];
    }
    const dx = c.nx - c.tx, dz = c.ny - c.ty;
    const px = tw(c.tx) + dx * c.t, pz = tw(c.ty) + dz * c.t;
    const lane = 0.13;
    const ox = -dz * lane, oz = dx * lane;
    const target = dx || dz ? Math.atan2(-dz, dx) : c.h;
    let d = target - c.h;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    c.h += d * Math.min(1, dt * 12);
    _q4.setFromAxisAngle(_up, c.h);
    _p4.set(px + ox, 0.02, pz + oz);
    _m4.compose(_p4, _q4, _s4);
    carMesh.setMatrixAt(i, _m4);
  }
  carMesh.instanceMatrix.needsUpdate = true;
}

export function update(dt) {
  for (const line of T.lines) {
    if (!line.ok) continue;
    for (const v of line.vehicles) updateVehicle(line, v, dt);
  }
  updateCars(dt);
}

// ---------- guardado ----------
export function serialize() {
  return {
    stops: T.stops.map((s) => ({ type: s.type, x: s.x, y: s.y })),
    lines: T.lines.map((l) => ({ type: l.type, color: l.color, name: l.name, vehicles: l.vehicles.length, stops: l.stops.map((s) => T.stops.indexOf(s)) })),
  };
}

export function clearAll() {
  for (const l of [...T.lines]) deleteLine(l, true);
  for (const s of [...T.stops]) {
    const t = G.grid[s.y][s.x];
    if (t.stop === s) t.stop = null;
    stopGrp.remove(s.mesh);
    s.mesh.geometry.dispose();
  }
  T.stops = [];
  clearPreviewRoute();
}

export function load(d) {
  clearAll();
  const free = G.money;
  const made = d.stops.map((s) => {
    const prev = G.money; G.money = 1e12;
    const st = addStop(s.type, s.x, s.y);
    G.money = prev;
    return st;
  });
  G.money = free;
  for (const l of d.lines) {
    const stops = l.stops.map((i) => made[i]).filter(Boolean);
    createLine(l.type, stops, { free: true, color: l.color, name: l.name, vehicles: l.vehicles });
  }
  ensureCars();
}
