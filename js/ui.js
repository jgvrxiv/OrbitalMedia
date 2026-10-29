// Interfaz: barra de herramientas, paneles, entrada del ratón/teclado y vistas previas.
import * as THREE from '../vendor/three.module.min.js';
import { S, N, tw, setPreview, panCamera, pickTile, padOf, setTime } from './scene.js';
import { mats } from './geom.js';
import {
  G, COST, ZONES, MONTHS, DENS_NAME, ESTRATO_COLORS, CATS, fmt, coverageAt, rectTiles, zoneOk, paintZone,
  canPlacePublic, placePublic, bulldoze, removeBuilding, markDirty, flush, buildRoad, roadTileCheck,
  zoneProblem, estratoOf, buildingLabel, refreshOverlay, idx,
} from './game.js';
import { ROADS, ROAD_ORDER, roadPlan } from './roads.js';
import { PUBLIC, SERVICES, buildPublic } from './buildings.js';
import { tierOf } from './models_com.js';
import { IND_TYPES } from './models_ind.js';
import * as TR from './transit.js';

const $ = (s, r = document) => r.querySelector(s);
export const UI = { tool: { type: 'inspect' }, hover: null, drag: null, selection: null, lineStops: [], tab: 'city' };
const TIER_NAME = ['', 'popular', 'medio', 'exclusivo'];

// ---------- definición de herramientas ----------
const SECTIONS = [
  { title: 'Herramientas', items: [
    { icon: '🔍', name: 'Inspeccionar', sub: 'Ver edificios, lotes y paradas', tool: { type: 'inspect' }, key: 'v' },
    { icon: '🚧', name: 'Demoler', sub: 'Arrastra para borrar', tool: { type: 'bulldoze' }, key: 'b' },
  ] },
  { title: 'Vías', items: ROAD_ORDER.map((k, i) => ({
    icon: ROADS[k].icon, name: ROADS[k].name, sub: `${ROADS[k].w} casilla${ROADS[k].w > 1 ? 's' : ''} · ${ROADS[k].desc}`,
    price: fmt(ROADS[k].cost) + '/u', tool: { type: 'road', k }, key: i === 2 ? 'r' : undefined,
  })) },
  { title: 'Zonas', items: Object.entries(ZONES).map(([z, Z]) => ({
    swatch: Z.color, name: Z.name, sub: zoneSub(Z), price: fmt(COST.zone) + '/u', tool: { type: 'zone', z: +z },
  })) },
  { title: 'Servicios públicos', items: Object.entries(PUBLIC).map(([k, d]) => ({
    icon: d.icon, name: d.name, sub: SERVICES[d.cat].name + ' · radio ' + d.radius, price: fmt(d.cost), tool: { type: 'pub', key: k },
  })) },
  { title: 'Transporte público', items: [
    { icon: '🚏', name: 'Paradero de bus', sub: 'Sobre calle, avenida o troncal', price: fmt(TR.TRANSIT.bus.stopCost), tool: { type: 'stop', st: 'bus' } },
    { icon: '🚠', name: 'Estación Metrocable', sub: 'En un lote libre; ideal en laderas', price: fmt(TR.TRANSIT.cable.stopCost), tool: { type: 'stop', st: 'cable' } },
    { icon: '🚌', name: 'Crear línea de bus', sub: 'Une paraderos en orden', price: fmt(TR.TRANSIT.bus.vehCost), tool: { type: 'line', st: 'bus' } },
    { icon: '🚡', name: 'Crear línea Metrocable', sub: 'Une estaciones en orden', price: fmt(TR.TRANSIT.cable.vehCost), tool: { type: 'line', st: 'cable' } },
  ] },
];
function zoneSub(Z) {
  if (Z.k === 'r') return ['', 'Casas', 'Edificios de 3-6 pisos', 'Torres (requiere avenida)'][Z.d];
  if (Z.k === 'c') return ['', 'Tiendas y locales', 'Locales y oficinas', 'Centros comerciales y torres'][Z.d];
  return ['', 'Talleres, flores, ladrilleras', 'Bodegas y fábricas', 'Plantas y logística'][Z.d];
}
const OVERLAYS = [
  [null, 'Ninguna'], ['lv', 'Valor del suelo (estrato)'], ['svc', 'Servicios'], ['poll', 'Contaminación'], ['slope', 'Pendiente'],
];

const ghostMat = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.72, side: THREE.DoubleSide, depthWrite: false });
let ghost = null, ghostKey = null;
const geomCache = {};

export function toast(msg, kind = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + (kind === 'warn' ? 'warn' : kind === 'good' ? 'good' : '');
  el.textContent = msg;
  $('#toasts').appendChild(el);
  while ($('#toasts').children.length > 4) $('#toasts').firstChild.remove();
  setTimeout(() => el.remove(), 3400);
}

function buildToolbar() {
  const host = $('#tools');
  host.innerHTML = '';
  for (const sec of SECTIONS) {
    const d = document.createElement('div');
    d.className = 'sec';
    d.innerHTML = `<h4><span>${sec.title}</span><span>▾</span></h4><div class="items"></div>`;
    d.querySelector('h4').onclick = () => d.classList.toggle('closed');
    const items = d.querySelector('.items');
    for (const it of sec.items) {
      const b = document.createElement('button');
      b.className = 'tb';
      b.dataset.tool = JSON.stringify(it.tool);
      b.title = it.sub || '';
      b.innerHTML = `${it.swatch ? `<span class="sw" style="background:${it.swatch}"></span>` : `<span class="ic">${it.icon}</span>`}
        <span class="nm">${it.name}<small>${it.sub || ''}</small></span><span class="pr">${it.price || ''}</span>`;
      b.onclick = () => setTool(it.tool);
      items.appendChild(b);
    }
    host.appendChild(d);
  }
  // capas
  const d = document.createElement('div');
  d.className = 'sec';
  d.innerHTML = '<h4><span>Capas de información</span><span>▾</span></h4><div class="items ovl"></div>';
  d.querySelector('h4').onclick = () => d.classList.toggle('closed');
  for (const [k, name] of OVERLAYS) {
    const b = document.createElement('button');
    b.className = 'tb ovb' + (G.overlay === k ? ' on' : '');
    b.dataset.ovl = k || '';
    b.innerHTML = `<span class="ic">${k === 'lv' ? '💎' : k === 'svc' ? '🏥' : k === 'poll' ? '🏭' : k === 'slope' ? '⛰️' : '🚫'}</span><span class="nm">${name}</span><span></span>`;
    b.onclick = () => setOverlay(k);
    d.querySelector('.items').appendChild(b);
  }
  host.appendChild(d);
}

export function setOverlay(k) {
  G.overlay = k;
  document.querySelectorAll('.ovb').forEach((b) => b.classList.toggle('on', (b.dataset.ovl || null) === k));
  refreshOverlay();
  const legend = $('#legend');
  if (k === 'lv') legend.innerHTML = '<b>Estrato según valor del suelo</b>' + ESTRATO_COLORS.map((c, i) => `<span><i style="background:${c}"></i>${i + 1}</span>`).join('');
  else if (k === 'poll') legend.innerHTML = '<b>Contaminación</b><span><i style="background:#fff3b0"></i>baja</span><span><i style="background:#ff9f1c"></i>media</span><span><i style="background:#7a2e0e"></i>alta</span>';
  else if (k === 'slope') legend.innerHTML = '<b>Pendiente</b><span><i style="background:#90be6d"></i>toda densidad</span><span><i style="background:#fcbf49"></i>≤ media</span><span><i style="background:#f77f00"></i>sólo baja</span><span><i style="background:#d62828"></i>muy empinado</span>';
  else if (k === 'svc') legend.innerHTML = '<b>Servicios cercanos</b><span><i style="background:#d62828"></i>pocos</span><span><i style="background:#fcbf49"></i>algunos</span><span><i style="background:#2a9d8f"></i>muchos</span>';
  legend.hidden = !k;
}

const sameTool = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function setTool(t) {
  cancelLine();
  UI.tool = t;
  UI.drag = null;
  document.querySelectorAll('.tb[data-tool]').forEach((b) => b.classList.toggle('on', sameTool(JSON.parse(b.dataset.tool), t)));
  S.grid.visible = t.type !== 'inspect';
  S.canvas.style.cursor = t.type === 'inspect' ? 'grab' : 'crosshair';
  setPreview([]);
  removeGhost();
  $('#tip').hidden = true;
  const msg = {
    inspect: 'Clic en un edificio, lote o parada para ver sus datos · arrastra para mover el mapa',
    bulldoze: 'Arrastra un rectángulo para demoler vías, zonas, edificios o paradas',
    road: () => `${ROADS[t.k].name}: arrastra para trazar en línea recta (${ROADS[t.k].w} casilla${ROADS[t.k].w > 1 ? 's' : ''} de ancho)`,
    zone: () => `Arrastra un rectángulo: ${ZONES[t.z].name}. El estrato lo define el valor del suelo.`,
    pub: () => `${PUBLIC[t.key].name}: debe quedar junto a una vía · ${PUBLIC[t.key].desc}`,
    stop: () => (t.st === 'bus' ? 'Haz clic en una calle, avenida o troncal para poner un paradero' : 'Haz clic en un lote libre para poner una estación de Metrocable'),
    line: () => 'Haz clic en las paradas en el orden del recorrido. Enter para terminar.',
  }[t.type];
  $('#banner').textContent = typeof msg === 'function' ? msg() : msg;
  if (t.type === 'line') startLine();
}

// ---------- creación de líneas ----------
function startLine() {
  UI.lineStops = [];
  $('#lineBar').hidden = false;
  updateLineBar();
}
function cancelLine() {
  UI.lineStops = [];
  $('#lineBar').hidden = true;
  TR.clearPreviewRoute();
}
function updateLineBar() {
  const st = UI.tool.st;
  $('#lineTitle').textContent = st === 'bus' ? '🚌 Nueva línea de bus' : '🚡 Nueva línea Metrocable';
  const n = UI.lineStops.length;
  const res = n < 2 ? true : TR.setPreviewRoute(st, UI.lineStops);
  const ok = res === true;
  $('#lineInfo').innerHTML = n < 2 ? `${n}/2+ paradas` : ok ? `${n} paradas · conectadas ✔` : `<span class="neg">${res}</span>`;
  $('#lineDone').disabled = n < 2 || !ok;
  refreshLinePreview();
}
function refreshLinePreview() {
  if (UI.tool.type !== 'line') return;
  setPreview(UI.lineStops.map((s, i) => ({ x: s.x, y: s.y, ok: true, color: i === 0 ? '#ffffff' : '#fcd116' })));
}
function finishLine() {
  if (UI.tool.type !== 'line') return;
  const line = TR.createLine(UI.tool.st, UI.lineStops);
  if (line) {
    toast(`${line.name} creada. Añade vehículos en la pestaña Rutas.`, 'good');
    cancelLine();
    startLine();
    showTab('lines');
  }
}

// ---------- fantasma de edificio público ----------
function removeGhost() {
  if (ghost) { S.root.remove(ghost); ghost = null; ghostKey = null; }
}
function showGhost(key, x, y, rot) {
  const d = PUBLIC[key];
  if (ghostKey !== key) {
    removeGhost();
    if (!geomCache[key]) geomCache[key] = buildPublic(key);
    ghost = new THREE.Mesh(geomCache[key], ghostMat);
    S.root.add(ghost);
    ghostKey = key;
  }
  ghost.position.set(tw(x) + (d.w - 1) / 2, padOf(x, y, d.w, d.h).top + 0.01, tw(y) + (d.h - 1) / 2);
  ghost.rotation.y = [Math.PI, Math.PI / 2, 0, -Math.PI / 2][rot] ?? 0;
}

// ---------- vista previa por herramienta ----------
function origin(t, key) {
  const d = PUBLIC[key];
  return { x: t.x - Math.floor((d.w - 1) / 2), y: t.y - Math.floor((d.h - 1) / 2) };
}

function updatePreview() {
  const T0 = UI.tool, h = UI.hover;
  const info = $('#banner');
  if (T0.type === 'line') { refreshLinePreview(); return; }
  if (!h) { setPreview([]); removeGhost(); return; }
  if (T0.type === 'road') {
    const plan = roadPlan(UI.drag ? UI.drag.start : h, h, T0.k);
    let cost = 0, bad = 0;
    const prev = plan.map((p) => {
      const c = roadTileCheck(p, T0.k);
      if (c.ok && !c.same) cost += c.cost;
      if (!c.ok) bad++;
      return { x: p.x, y: p.y, ok: c.ok, why: c.why };
    });
    setPreview(prev);
    if (UI.drag) info.textContent = `${ROADS[T0.k].name}: ${plan.length / ROADS[T0.k].w} de largo · costo ${fmt(cost)}` + (bad ? ` · ${bad} casillas bloqueadas (edificios o pendiente)` : '');
  } else if (T0.type === 'zone') {
    const tiles = UI.drag ? rectTiles(UI.drag.start, h) : [{ x: h.x, y: h.y }];
    const prev = tiles.map((p) => ({ ...p, ok: zoneOk(p.x, p.y, T0.z), color: zoneOk(p.x, p.y, T0.z) ? ZONES[T0.z].color : null }));
    setPreview(prev);
    if (UI.drag) info.textContent = `${ZONES[T0.z].name}: ${prev.filter((p) => p.ok).length} casillas · costo ${fmt(prev.filter((p) => p.ok).length * COST.zone)}`;
  } else if (T0.type === 'bulldoze') {
    const tiles = UI.drag ? rectTiles(UI.drag.start, h) : [{ x: h.x, y: h.y }];
    setPreview(tiles.map((p) => ({ ...p, ok: false })));
  } else if (T0.type === 'pub') {
    const o = origin(h, T0.key);
    const c = canPlacePublic(T0.key, o.x, o.y);
    setPreview(c.tiles.length ? c.tiles : [{ x: h.x, y: h.y, ok: false }]);
    if (c.tiles.length) showGhost(T0.key, o.x, o.y, c.rot); else removeGhost();
    info.textContent = `${PUBLIC[T0.key].name} · ${fmt(PUBLIC[T0.key].cost)}` + (c.noRoad ? ' · ¡necesita una vía al lado!' : c.steep ? ' · terreno muy inclinado' : '');
  } else if (T0.type === 'stop') {
    setPreview([{ x: h.x, y: h.y, ok: TR.stopOk(T0.st, h.x, h.y) }]);
  } else if (T0.type === 'inspect') {
    const sel = UI.selection;
    const list = [];
    if (sel && sel.kind === 'bld') for (let j = 0; j < sel.b.h; j++) for (let i = 0; i < sel.b.w; i++) list.push({ x: sel.b.x + i, y: sel.b.y + j, ok: true });
    else if (sel && sel.kind === 'tile') list.push({ x: sel.x, y: sel.y, ok: true });
    else if (sel && sel.kind === 'stop') list.push({ x: sel.stop.x, y: sel.stop.y, ok: true });
    setPreview(list, 'info');
  }
}

// ---------- acciones ----------
function commitDrag(a, b) {
  const T0 = UI.tool;
  if (T0.type === 'road') { if (!buildRoad(roadPlan(a, b, T0.k), T0.k)) toast('Nada que construir (ocupado, muy empinado o ya existe)', 'warn'); }
  else if (T0.type === 'zone') paintZone(rectTiles(a, b), T0.z);
  else if (T0.type === 'bulldoze') { if (!bulldoze(rectTiles(a, b))) toast('No hay nada que demoler ahí', 'warn'); }
}

function clickTile(t) {
  const T0 = UI.tool;
  if (T0.type === 'pub') {
    const o = origin(t, T0.key);
    placePublic(T0.key, o.x, o.y);
  } else if (T0.type === 'stop') {
    TR.addStop(T0.st, t.x, t.y);
  } else if (T0.type === 'line') {
    const tl = G.grid[t.y][t.x];
    if (!tl.stop || tl.stop.type !== T0.st) { toast(T0.st === 'bus' ? 'Haz clic sobre un paradero de bus' : 'Haz clic sobre una estación de Metrocable', 'warn'); return; }
    if (UI.lineStops[UI.lineStops.length - 1] === tl.stop) return;
    UI.lineStops.push(tl.stop);
    updateLineBar();
  } else if (T0.type === 'inspect') {
    const tl = G.grid[t.y][t.x];
    if (tl.stop) UI.selection = { kind: 'stop', stop: tl.stop };
    else if (tl.bld) UI.selection = { kind: 'bld', b: tl.bld };
    else UI.selection = { kind: 'tile', x: t.x, y: t.y };
    showTab('info');
    updatePreview();
  }
}

// ---------- entrada ----------
const keys = new Set();
function bindInput() {
  const cv = S.canvas;
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  cv.addEventListener('pointerdown', (e) => {
    cv.setPointerCapture(e.pointerId);
    const t = pickTile(e.clientX, e.clientY);
    const d = { x0: e.clientX, y0: e.clientY, lx: e.clientX, ly: e.clientY, moved: false, button: e.button, start: t };
    UI.drag = null;
    if (e.button === 2) d.mode = 'orbit';
    else if (e.button === 1 || e.shiftKey) d.mode = 'pan';
    else if (['road', 'zone', 'bulldoze'].includes(UI.tool.type) && t) { d.mode = 'build'; UI.drag = { start: { x: t.x, y: t.y } }; }
    else d.mode = 'click';
    UI.pd = d;
    if (d.mode === 'click' || d.mode === 'pan') cv.style.cursor = 'grabbing';
    updatePreview();
  });
  cv.addEventListener('pointermove', (e) => {
    const d = UI.pd;
    if (!d || d.mode === 'build' || !d.moved) {
      const t = pickTile(e.clientX, e.clientY);
      UI.hover = t ? { x: t.x, y: t.y } : null;
    }
    if (d) {
      const dx = e.clientX - d.lx, dy = e.clientY - d.ly;
      d.lx = e.clientX; d.ly = e.clientY;
      if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) > 5) d.moved = true;
      if (d.mode === 'orbit') { S.cam.yaw -= dx * 0.006; S.cam.pitch += dy * 0.004; }
      else if (d.mode === 'pan' || (d.mode === 'click' && d.moved)) {
        const k = (2 * S.cam.dist * Math.tan(THREE.MathUtils.degToRad(22.5))) / S.canvas.clientHeight;
        panCamera(-dx * k, (dy * k) / Math.sin(S.cam.pitch));
      }
    }
    updatePreview();
    updateTip(e);
  });
  const up = (e) => {
    const d = UI.pd;
    UI.pd = null;
    cv.style.cursor = UI.tool.type === 'inspect' ? 'grab' : 'crosshair';
    if (!d) return;
    const t = pickTile(e.clientX, e.clientY);
    if (d.mode === 'build' && d.start) {
      const end = t || UI.hover;
      if (end) commitDrag(d.start, { x: end.x, y: end.y });
      UI.drag = null;
      updatePreview();
      return;
    }
    if (d.mode === 'click' && !d.moved && d.button === 0 && t) clickTile(t);
    UI.drag = null;
    updatePreview();
  };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', () => { UI.pd = null; UI.drag = null; });
  cv.addEventListener('pointerleave', () => { if (!UI.pd) { UI.hover = null; $('#tip').hidden = true; updatePreview(); } });
  cv.addEventListener('wheel', (e) => {
    e.preventDefault();
    S.cam.dist *= Math.exp(e.deltaY * 0.0012);
  }, { passive: false });

  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    const k = e.key.toLowerCase();
    keys.add(k);
    if (k === 'escape') {
      if (UI.tool.type === 'line' && UI.lineStops.length) { cancelLine(); startLine(); } else setTool({ type: 'inspect' });
    } else if (k === 'enter') finishLine();
    else if (k === ' ') { e.preventDefault(); setSpeed(G.speed === 0 ? 1 : 0); }
    else if (k === 'g') S.grid.visible = !S.grid.visible;
    else if (k === 'n') toggleCycle();
    else if (k >= '1' && k <= '9' && !e.ctrlKey) setTool({ type: 'zone', z: +k });
    else for (const sec of SECTIONS) for (const it of sec.items) if (it.key === k && !e.ctrlKey && !e.metaKey) setTool(it.tool);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => keys.clear());
}

export function cameraKeys(dt) {
  const sp = S.cam.dist * 0.9 * dt;
  let dx = 0, dy = 0;
  if (keys.has('w') || keys.has('arrowup')) dy += 1;
  if (keys.has('s') || keys.has('arrowdown')) dy -= 1;
  if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
  if (keys.has('d') || keys.has('arrowright')) dx += 1;
  if (dx || dy) panCamera(dx * sp, dy * sp);
  if (keys.has('q')) S.cam.yaw += dt * 1.6;
  if (keys.has('e')) S.cam.yaw -= dt * 1.6;
  if (keys.has('z') || keys.has('+') || keys.has('=')) S.cam.dist *= Math.exp(-dt * 1.2);
  if (keys.has('x') || keys.has('-')) S.cam.dist *= Math.exp(dt * 1.2);
}

// ---------- tooltip ----------
function updateTip(e) {
  const tip = $('#tip');
  const h = UI.hover;
  const T0 = UI.tool;
  if (!h || UI.pd || !['inspect', 'zone', 'road'].includes(T0.type)) { tip.hidden = true; return; }
  const t = G.grid[h.y][h.x];
  const cov = coverageAt(h.x, h.y);
  let html = '';
  if (t.bld) html = bldTitle(t.bld);
  else if (t.stop) html = t.stop.type === 'bus' ? '🚏 Paradero de bus' : '🚠 Estación Metrocable';
  else if (t.road) html = `${ROADS[t.road.k].icon} ${ROADS[t.road.k].name}`;
  else if (t.zone) {
    const Z = ZONES[t.zone];
    const prob = zoneProblem(h.x, h.y);
    html = `<b>${Z.name}</b><br>` + (Z.k === 'i' ? 'Industria' : `Crecería como <span class="estr" style="background:${ESTRATO_COLORS[cov.e - 1]}">Estrato ${cov.e}</span>`);
    if (prob) html += `<br><span class="neg">${prob}</span>`;
  } else if (T0.type === 'zone' || T0.type === 'inspect') {
    html = `Lote libre · valor del suelo → <span class="estr" style="background:${ESTRATO_COLORS[cov.e - 1]}">Estrato ${cov.e}</span>`;
    const a = G.access[idx(h.x, h.y)];
    html += `<br>${a ? `Acceso a vía: hasta densidad ${DENS_NAME[a].toLowerCase()}` : '<span class="neg">Sin vía cercana</span>'} · pendiente ${padOf(h.x, h.y).slope.toFixed(2)}`;
  } else { tip.hidden = true; return; }
  tip.innerHTML = html;
  tip.hidden = false;
  tip.style.left = Math.min(window.innerWidth - 280, e.clientX + 16) + 'px';
  tip.style.top = e.clientY + 16 + 'px';
}

function bldTitle(b) {
  if (b.kind === 'pub') return `<b>${PUBLIC[b.key].icon} ${PUBLIC[b.key].name}</b>`;
  const name = buildingLabel(b);
  if (b.kind === 'ind') return `<b>🏭 ${name}</b><br>Densidad ${DENS_NAME[b.d].toLowerCase()} · ${b.jobs} empleos`;
  if (b.kind === 'com') return `<b>🏪 ${name}</b><br>Comercio ${TIER_NAME[tierOf(b.e)]} · ${b.jobs} empleos`;
  return `<b>${name}</b><br><span class="estr" style="background:${ESTRATO_COLORS[b.e - 1]}">Estrato ${b.e}</span> · densidad ${DENS_NAME[b.d].toLowerCase()} · ${b.pop} hab.`;
}

// ---------- paneles ----------
export function showTab(name) {
  UI.tab = name;
  document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === name));
  document.querySelectorAll('.tab').forEach((t) => { t.hidden = t.id !== 'tab-' + name; });
  if (name === 'lines') renderLines();
  if (name === 'info') renderInfo();
  if (name === 'city') renderCity();
}

function bar(label, pct, color, val) {
  return `<div class="bar"><span>${label}</span><div class="t"><i style="width:${Math.max(0, Math.min(100, pct))}%;background:${color}"></i></div><span>${val}</span></div>`;
}
function dbar(label, v, color) {
  // barra de demanda -1..1 centrada
  const w = Math.abs(v) * 50;
  return `<div class="bar"><span>${label}</span><div class="t dem"><i style="${v >= 0 ? 'left:50%' : `left:${50 - w}%`};width:${w}%;background:${v >= 0 ? color : '#ff6b78'}"></i></div><span>${v >= 0 ? '+' : ''}${Math.round(v * 100)}</span></div>`;
}

export function renderCity() {
  if (UI.tab !== 'city') return;
  const st = G.stats;
  const tot = Math.max(1, st.pop);
  let html = '<h3>Demanda</h3>';
  html += dbar('Residencial', G.dem.r, '#45b956') + dbar('Comercial', G.dem.c, '#3d8bfd') + dbar('Industrial', G.dem.i, '#f7d117');
  html += '<h3>Población por estrato</h3>';
  ESTRATO_COLORS.forEach((c, i) => { html += bar(`Estrato ${i + 1}`, (st.byE[i] / tot) * 100, c, st.byE[i].toLocaleString('es-CO')); });
  html += '<h3>Por densidad</h3>';
  ['Baja', 'Media', 'Alta'].forEach((n, i) => { html += bar(n, (st.byD[i] / tot) * 100, ['#9be08f', '#45b956', '#1d7f37'][i], st.byD[i].toLocaleString('es-CO')); });
  const cov = Object.fromEntries(CATS.map((k) => [k, 0]));
  for (const b of G.buildings) {
    if (b.kind !== 'res') continue;
    for (const k of coverageAt(b.x, b.y).list) cov[k] += b.pop;
  }
  html += '<h3>Cobertura de servicios</h3>';
  for (const [k, s] of Object.entries(SERVICES)) {
    const p = (cov[k] / tot) * 100;
    html += bar(`${s.icon} ${s.name}`, p, p > 66 ? '#37d67a' : p > 33 ? '#fcd116' : '#ff6b78', Math.round(p) + '%');
  }
  html += `<h3>Empleo e industria</h3>
    <div class="kv"><span>Trabajadores / empleos</span><b>${Math.round(st.workers).toLocaleString('es-CO')} / ${st.jobs.toLocaleString('es-CO')}</b></div>
    <div class="kv"><span>· comercio · industria · público</span><span>${st.comJobs} · ${st.indJobs} · ${st.pubJobs}</span></div>
    <div class="kv"><span>Bienes producidos / consumidos</span><b>${Math.round(st.goodsProd)} / ${Math.round(st.goodsNeed)}</b></div>`;
  const b = st.budget || {};
  const m = (v) => fmt((v || 0) * 10);
  const net = st.income - st.expense;
  html += `<h3>Presupuesto (por mes)</h3>
    <div class="kv"><span>Impuesto residencial</span><span class="${(b.resTax || 0) >= 0 ? 'pos' : 'neg'}">${m(b.resTax)}</span></div>
    <div class="kv"><span>Comercio</span><span class="pos">${m(b.comTax)}</span></div>
    <div class="kv"><span>Industria</span><span class="pos">${m(b.indTax)}</span></div>
    <div class="kv"><span>Exportaciones</span><span class="pos">${m(b.exports)}</span></div>
    <div class="kv"><span>Pasajes de transporte</span><span class="pos">${m(b.transitRev)}</span></div>
    <div class="kv"><span>Importaciones de bienes</span><span class="neg">${m(-(b.imports || 0))}</span></div>
    <div class="kv"><span>Servicios públicos</span><span class="neg">${m(-(b.services || 0))}</span></div>
    <div class="kv"><span>Mantenimiento vial</span><span class="neg">${m(-(b.roads || 0))}</span></div>
    <div class="kv"><span>Operación transporte</span><span class="neg">${m(-(b.transitCost || 0))}</span></div>
    <div class="kv"><span>Balance</span><b class="${net >= 0 ? 'pos' : 'neg'}">${fmt(net * 10)}</b></div>
    <p class="hint">El estrato de cada edificio depende del valor del suelo: servicios cercanos, tipo de vía, comercio y contaminación. Estrato 1 recibe subsidio; 5 y 6 aportan contribución.</p>`;
  $('#tab-city').innerHTML = html;
}

function serviceChips(x, y) {
  const i = idx(x, y);
  return Object.entries(SERVICES).map(([k, s], c) => {
    const v = G.cov[c][i];
    return `<span class="chip ${v > 0.05 ? 'ok' : 'no'}" style="${v > 0.05 ? `opacity:${0.55 + v * 0.45}` : ''}">${s.icon} ${s.name}</span>`;
  }).join('');
}

function lvBlock(x, y, e) {
  const c = coverageAt(x, y);
  const next = e < 6 ? e / 6 : null;
  return `<h3>Valor del suelo</h3>${bar('Valor', c.lv * 100, ESTRATO_COLORS[c.e - 1], c.lv.toFixed(2))}
    <div class="kv"><span>Estrato que soporta este lote</span><b><span class="estr" style="background:${ESTRATO_COLORS[c.e - 1]}">${c.e}</span></b></div>
    ${c.poll > 0.03 ? `<div class="kv"><span>Contaminación</span><b class="neg">${Math.round(c.poll * 100)}%</b></div>` : ''}
    ${next !== null && e !== undefined ? `<p class="hint">Para pasar a estrato ${e + 1} el valor debe superar ${next.toFixed(2)}: más servicios cercanos, una mejor vía o menos contaminación.</p>` : ''}
    <h3>Servicios cercanos (${c.list.length}/8)</h3><div class="chips">${serviceChips(x, y)}</div>`;
}

export function renderInfo() {
  if (UI.tab !== 'info') return;
  const el = $('#tab-info');
  const sel = UI.selection;
  if (!sel) { el.innerHTML = '<p class="hint">Usa <b>Inspeccionar</b> y haz clic en un edificio, lote o parada.</p>'; return; }
  let html = '';
  if (sel.kind === 'bld') {
    const b = sel.b;
    if (!G.buildings.includes(b)) { UI.selection = null; renderInfo(); return; }
    if (b.kind === 'pub') {
      const d = PUBLIC[b.key];
      html = `<h3>${d.icon} ${d.name}</h3><p class="hint">${d.desc}</p>
        <div class="kv"><span>Servicio</span><b>${SERVICES[d.cat].name}</b></div>
        <div class="kv"><span>Radio</span><b>${d.radius} casillas</b></div>
        <div class="kv"><span>Empleos</span><b>${d.jobs}</b></div>
        <div class="kv"><span>Mantenimiento</span><b>${fmt(d.upkeep * 10)}/mes</b></div>`;
    } else if (b.kind === 'com') {
      html = `<h3>🏪 ${buildingLabel(b)}</h3>
        <div class="kv"><span>Categoría</span><b>Comercio ${TIER_NAME[tierOf(b.e)]}</b></div>
        <div class="kv"><span>Densidad</span><b>${DENS_NAME[b.d]}</b></div>
        <div class="kv"><span>Empleos</span><b>${b.jobs}</b></div>` + lvBlock(b.x, b.y);
    } else if (b.kind === 'ind') {
      const T = IND_TYPES[b.type];
      html = `<h3>🏭 ${buildingLabel(b)}</h3>
        <div class="kv"><span>Densidad</span><b>${DENS_NAME[b.d]}</b></div>
        <div class="kv"><span>Empleos</span><b>${b.jobs}</b></div>
        <div class="kv"><span>Producción de bienes</span><b>${Math.round(b.jobs * 0.9)}</b></div>
        <div class="kv"><span>Contamina</span><b class="neg">${T.poll >= 1.2 ? 'mucho' : T.poll >= 0.7 ? 'moderado' : 'poco'} · radio ${3 + 2 * b.d}</b></div>
        <p class="hint">La industria abastece al comercio. Si falta, la ciudad importa bienes (gasto); si sobra, exporta (ingreso).</p>`;
    } else {
      html = `<h3>${buildingLabel(b)}</h3>
        <div class="kv"><span>Estrato</span><b><span class="estr" style="background:${ESTRATO_COLORS[b.e - 1]}">Estrato ${b.e}</span></b></div>
        <div class="kv"><span>Densidad</span><b>${DENS_NAME[b.d]}</b></div>
        <div class="kv"><span>Habitantes</span><b>${b.pop}</b></div>` + lvBlock(b.x, b.y, b.e);
    }
    html += '<button id="selDel" style="margin-top:10px">🚧 Demoler</button>';
  } else if (sel.kind === 'stop') {
    const s = sel.stop;
    const lines = TR.T.lines.filter((l) => l.stops.includes(s));
    html = `<h3>${s.type === 'bus' ? '🚏 Paradero de bus' : '🚠 Estación Metrocable'}</h3>
      <div class="kv"><span>Líneas</span><b>${lines.length}</b></div>` + lines.map((l) => `<span class="chip" style="border-color:${l.color}">${l.name}</span>`).join(' ') +
      `<p class="hint">Cobertura de transporte: radio ${s.type === 'cable' ? 6 : 5} (necesita una línea con vehículos).</p>`;
  } else {
    const t = G.grid[sel.y][sel.x];
    const a = G.access[idx(sel.x, sel.y)];
    html = `<h3>Lote ${sel.x},${sel.y}</h3>
      <div class="kv"><span>Uso</span><b>${t.road ? ROADS[t.road.k].name : t.zone ? ZONES[t.zone].name : 'Libre'}</b></div>
      <div class="kv"><span>Acceso</span><b>${a ? 'densidad ' + DENS_NAME[a].toLowerCase() : 'sin vía'}</b></div>
      <div class="kv"><span>Pendiente</span><b>${padOf(sel.x, sel.y).slope.toFixed(2)}</b></div>` +
      (t.zone && zoneProblem(sel.x, sel.y) ? `<p class="neg">${zoneProblem(sel.x, sel.y)}</p>` : '') + lvBlock(sel.x, sel.y);
  }
  el.innerHTML = html;
  const del = $('#selDel');
  if (del) del.onclick = () => { removeBuilding(sel.b); markDirty('all'); flush(); G.hooks.roadsChanged(); UI.selection = null; renderInfo(); updatePreview(); G.onChange(); };
}

export function renderLines() {
  if (UI.tab !== 'lines') return;
  const el = $('#tab-lines');
  if (!TR.T.lines.length) {
    el.innerHTML = '<p class="hint">Aún no hay rutas. Coloca paraderos de bus (en calles, avenidas o troncales) o estaciones de Metrocable, y usa <b>Crear línea</b>. En la troncal los buses van más rápido por el carril exclusivo.</p>';
    return;
  }
  el.innerHTML = TR.T.lines.map((l) => {
    const c = TR.TRANSIT[l.type];
    return `<div class="line" data-id="${l.id}">
      <div class="hd"><i style="background:${l.color}"></i>${l.name}<span class="hint" style="margin-left:auto">${c.name}</span></div>
      ${l.ok ? '' : `<div class="bad">⚠ ${l.err || 'Ruta interrumpida'}</div>`}
      <div class="kv"><span>Paradas</span><b>${l.stops.length}</b></div>
      <div class="kv"><span>Pasajeros/ciclo</span><b>${Math.round(l.riders)} <small class="hint">de ${Math.round(l.demand * 0.18)}</small></b></div>
      <div class="kv"><span>Ingresos/mes</span><b class="pos">${fmt(l.revenue * 10)}</b></div>
      <div class="ops"><span>${l.type === 'bus' ? 'Buses' : 'Cabinas'}: <b>${l.vehicles.length}</b></span><span class="grow"></span>
        <button data-act="less">−</button><button data-act="more" title="${fmt(c.vehCost)}">＋ ${fmt(c.vehCost)}</button><button data-act="del">🗑️</button></div>
    </div>`;
  }).join('');
  el.querySelectorAll('.line').forEach((n) => {
    const line = TR.T.lines.find((l) => l.id === +n.dataset.id);
    n.querySelector('[data-act=more]').onclick = () => { TR.addVehicle(line); renderLines(); };
    n.querySelector('[data-act=less]').onclick = () => { TR.removeVehicle(line); renderLines(); };
    n.querySelector('[data-act=del]').onclick = () => { TR.deleteLine(line); renderLines(); };
  });
}

export function updateTop() {
  const st = G.stats;
  $('#sMoney').textContent = fmt(G.money);
  const net = (st.income - st.expense) * 10;
  const sn = $('#sNet');
  sn.textContent = (net >= 0 ? '+' : '') + fmt(net) + '/mes';
  sn.className = net >= 0 ? 'pos' : 'neg';
  $('#sPop').textContent = st.pop.toLocaleString('es-CO');
  $('#sHappy').textContent = Math.round(st.happy) + '%';
  $('#sFace').textContent = st.happy > 75 ? '😄' : st.happy > 55 ? '🙂' : st.happy > 35 ? '😐' : '😠';
  $('#sEmp').textContent = Math.round(st.emp * 100) + '%';
  $('#sDate').textContent = `${MONTHS[G.month % 12]} · año ${Math.floor(G.month / 12) + 1}`;
  for (const k of ['r', 'c', 'i']) {
    const v = G.dem[k];
    const el = $('#d' + k);
    el.style.height = Math.abs(v) * 50 + '%';
    el.style.bottom = v >= 0 ? '50%' : 50 - Math.abs(v) * 50 + '%';
    el.classList.toggle('negd', v < 0);
  }
}

export function updateClock() {
  const h = Math.floor(S.time), m = Math.floor((S.time - h) * 60);
  $('#sClock').textContent = `${S.night > 0.5 ? '🌙' : '☀️'} ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function toggleCycle() {
  S.dayCycle = !S.dayCycle;
  if (!S.dayCycle) setTime(10.5);
  $('#bCycle').classList.toggle('on', S.dayCycle);
  toast(S.dayCycle ? 'Ciclo día/noche activado' : 'Siempre de día', 'info');
}

export function setSpeed(s) {
  G.speed = s;
  document.querySelectorAll('.speed button').forEach((b) => b.classList.toggle('on', +b.dataset.speed === s));
}

export function initUI() {
  buildToolbar();
  bindInput();
  document.querySelectorAll('.tabs button').forEach((b) => { b.onclick = () => showTab(b.dataset.tab); });
  document.querySelectorAll('.speed button').forEach((b) => { b.onclick = () => setSpeed(+b.dataset.speed); });
  $('#lineDone').onclick = finishLine;
  $('#lineUndo').onclick = () => { UI.lineStops.pop(); updateLineBar(); };
  $('#lineCancel').onclick = () => { cancelLine(); startLine(); };
  $('#bCycle').onclick = toggleCycle;
  $('#bCycle').classList.toggle('on', S.dayCycle);
  G.onToast = toast;
  setTool({ type: 'inspect' });
  showTab('city');
  void mats; void N; void estratoOf;
}
