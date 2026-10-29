// Interfaz: barra de herramientas, paneles, entrada del ratón/teclado y vistas previas.
import * as THREE from '../vendor/three.module.min.js';
import { S, N, tw, setPreview, updateCamera, panCamera, pickTile, resize } from './scene.js';
import { mats } from './geom.js';
import {
  G, COST, ZONE_COLORS, MONTHS, fmt, tile, coverageAt, roadLine, roadOk, buildRoad, rectTiles, zoneOk, paintZone,
  canPlacePublic, placePublic, bulldoze, removeBuilding, markDirty, flush, levelReq,
} from './game.js';
import { ESTRATOS, COMERCIAL, PUBLIC, SERVICES, buildPublic } from './buildings.js';
import * as TR from './transit.js';

const $ = (s, r = document) => r.querySelector(s);
export const UI = { tool: { type: 'inspect' }, hover: null, drag: null, selection: null, lineStops: [], tab: 'city' };

// ---------- definición de herramientas ----------
const SECTIONS = [
  { title: 'Herramientas', items: [
    { icon: '🔍', name: 'Inspeccionar', sub: 'Ver edificios y paradas', tool: { type: 'inspect' }, key: 'v' },
    { icon: '🚧', name: 'Demoler', sub: 'Arrastra para borrar', tool: { type: 'bulldoze' }, key: 'b' },
  ] },
  { title: 'Vías', items: [
    { icon: '🛣️', name: 'Calle', sub: 'Arrastra para trazar', price: fmt(COST.road) + '/u', tool: { type: 'road' }, key: 'r' },
  ] },
  { title: 'Zonas por estrato', items: [
    ...ESTRATOS.map((e) => ({ swatch: e.color, name: e.name, sub: e.sub, price: fmt(COST.zone) + '/u', tool: { type: 'zone', z: e.id } })),
    { swatch: COMERCIAL.color, name: COMERCIAL.name, sub: COMERCIAL.sub, price: fmt(COST.zone) + '/u', tool: { type: 'zone', z: 7 } },
  ] },
  { title: 'Servicios públicos', items: Object.entries(PUBLIC).map(([k, d]) => ({
    icon: d.icon, name: d.name, sub: SERVICES[d.cat].name + ' · radio ' + d.radius, price: fmt(d.cost), tool: { type: 'pub', key: k },
  })) },
  { title: 'Transporte público', items: [
    { icon: '🚏', name: 'Paradero de bus', sub: 'Sobre una calle', price: fmt(TR.TRANSIT.bus.stopCost), tool: { type: 'stop', st: 'bus' } },
    { icon: '🚠', name: 'Estación Metrocable', sub: 'En un lote libre', price: fmt(TR.TRANSIT.cable.stopCost), tool: { type: 'stop', st: 'cable' } },
    { icon: '🚌', name: 'Crear línea de bus', sub: 'Une paraderos en orden', price: fmt(TR.TRANSIT.bus.vehCost), tool: { type: 'line', st: 'bus' } },
    { icon: '🚡', name: 'Crear línea Metrocable', sub: 'Une estaciones en orden', price: fmt(TR.TRANSIT.cable.vehCost), tool: { type: 'line', st: 'cable' } },
  ] },
];

const ghostMat = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.72, side: THREE.DoubleSide, depthWrite: false });
let ghost = null, ghostKey = null;
const geomCache = {};

export function toast(msg, kind = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + (kind === 'warn' ? 'warn' : kind === 'good' ? 'good' : '');
  el.textContent = msg;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), 3200);
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
}

const sameTool = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function setTool(t) {
  cancelLine();
  UI.tool = t;
  UI.drag = null;
  document.querySelectorAll('.tb').forEach((b) => b.classList.toggle('on', sameTool(JSON.parse(b.dataset.tool), t)));
  S.grid.visible = t.type !== 'inspect';
  S.canvas.style.cursor = t.type === 'inspect' ? 'grab' : 'crosshair';
  setPreview([]);
  removeGhost();
  $('#tip').hidden = true;
  const msg = {
    inspect: 'Clic en un edificio o parada para ver sus datos · arrastra para mover el mapa',
    bulldoze: 'Arrastra un rectángulo para demoler vías, zonas, edificios o paradas',
    road: 'Arrastra para trazar una calle (línea recta)',
    zone: () => 'Arrastra un rectángulo para zonificar: ' + (t.z === 7 ? 'Comercio' : ESTRATOS[t.z - 1].name),
    pub: () => `${PUBLIC[t.key].name}: debe quedar junto a una vía · ${PUBLIC[t.key].desc}`,
    stop: () => (t.st === 'bus' ? 'Haz clic en una calle para poner un paradero' : 'Haz clic en un lote libre para poner una estación de Metrocable'),
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
  const connected = n < 2 || TR.setPreviewRoute(st, UI.lineStops);
  $('#lineInfo').innerHTML = n < 2
    ? `${n}/2+ paradas`
    : connected ? `${n} paradas · conectadas ✔` : `<span class="neg">${n} paradas · ¡sin conexión por vías!</span>`;
  $('#lineDone').disabled = n < 2 || !connected;
  refreshLinePreview();
}
function refreshLinePreview() {
  if (UI.tool.type !== 'line') return;
  const tiles = UI.lineStops.map((s, i) => ({ x: s.x, y: s.y, ok: true, color: i === 0 ? '#ffffff' : '#fcd116' }));
  setPreview(tiles);
}
function finishLine() {
  if (UI.tool.type !== 'line') return;
  const st = UI.tool.st;
  const line = TR.createLine(st, UI.lineStops);
  if (line) {
    toast(`${line.name} creada. Añade más vehículos en la pestaña Rutas.`, 'good');
    cancelLine();
    startLine();
    showTab('lines');
  }
}

// ---------- fantasma de edificio ----------
function removeGhost() {
  if (ghost) { S.root.remove(ghost); ghost = null; ghostKey = null; }
}
function showGhost(key, x, y) {
  const d = PUBLIC[key];
  if (ghostKey !== key) {
    removeGhost();
    if (!geomCache[key]) geomCache[key] = buildPublic(key);
    ghost = new THREE.Mesh(geomCache[key], ghostMat);
    S.root.add(ghost);
    ghostKey = key;
  }
  ghost.position.set(tw(x) + (d.w - 1) / 2, 0, tw(y) + (d.h - 1) / 2);
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
    const tiles = UI.drag ? roadLine(UI.drag.start, h) : [{ x: h.x, y: h.y }];
    const prev = tiles.map((p) => ({ ...p, ok: roadOk(p.x, p.y) }));
    setPreview(prev);
    if (UI.drag) {
      const n = prev.filter((p) => p.ok && !G.grid[p.y][p.x].road).length;
      info.textContent = `Calle: ${tiles.length} casillas · costo ${fmt(n * COST.road)}`;
    }
  } else if (T0.type === 'zone') {
    const tiles = UI.drag ? rectTiles(UI.drag.start, h) : [{ x: h.x, y: h.y }];
    const prev = tiles.map((p) => ({ ...p, ok: zoneOk(p.x, p.y, T0.z), color: zoneOk(p.x, p.y, T0.z) ? ZONE_COLORS[T0.z] : null }));
    setPreview(prev);
    if (UI.drag) info.textContent = `Zona: ${prev.filter((p) => p.ok).length} casillas · costo ${fmt(prev.filter((p) => p.ok).length * COST.zone)}`;
  } else if (T0.type === 'bulldoze') {
    const tiles = UI.drag ? rectTiles(UI.drag.start, h) : [{ x: h.x, y: h.y }];
    setPreview(tiles.map((p) => ({ ...p, ok: false })));
  } else if (T0.type === 'pub') {
    const o = origin(h, T0.key);
    const c = canPlacePublic(T0.key, o.x, o.y);
    setPreview(c.tiles.length ? c.tiles : [{ x: h.x, y: h.y, ok: false }]);
    if (c.tiles.length) showGhost(T0.key, o.x, o.y); else removeGhost();
    info.textContent = `${PUBLIC[T0.key].name} · ${fmt(PUBLIC[T0.key].cost)}` + (c.noRoad ? ' · ¡necesita una vía al lado!' : '');
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

// ---------- acciones por clic ----------
function commitDrag(a, b) {
  const T0 = UI.tool;
  if (T0.type === 'road') buildRoad(roadLine(a, b));
  else if (T0.type === 'zone') paintZone(rectTiles(a, b), T0.z);
  else if (T0.type === 'bulldoze') {
    const tiles = rectTiles(a, b);
    if (!bulldoze(tiles)) toast('No hay nada que demoler ahí', 'warn');
  }
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
    renderInfo();
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
    const t = pickTile(e.clientX, e.clientY);
    UI.hover = t ? { x: t.x, y: t.y } : null;
    const d = UI.pd;
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
    if (d.mode === 'build' && t && d.start) { commitDrag(d.start, { x: t.x, y: t.y }); UI.drag = null; setTool(UI.tool); return; }
    if (d.mode === 'click' && !d.moved && d.button === 0 && t) clickTile(t);
    UI.drag = null;
    updatePreview();
  };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', () => { UI.pd = null; UI.drag = null; });
  cv.addEventListener('pointerleave', () => { UI.hover = null; $('#tip').hidden = true; if (!UI.pd) updatePreview(); });
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
    else {
      for (const sec of SECTIONS) for (const it of sec.items) if (it.key === k && !e.ctrlKey && !e.metaKey) setTool(it.tool);
    }
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
  if (!h || UI.pd || !['inspect', 'zone'].includes(T0.type)) { tip.hidden = true; return; }
  const t = G.grid[h.y][h.x];
  let html = '';
  if (t.bld) html = bldTitle(t.bld);
  else if (t.stop) html = (t.stop.type === 'bus' ? '🚏 Paradero de bus' : '🚠 Estación Metrocable');
  else if (t.road) html = '🛣️ Calle';
  else if (t.zone) {
    const cov = coverageAt(h.x, h.y);
    if (t.zone === 7) html = `<b>Zona comercial</b><br>Crece cerca de zonas residenciales`;
    else {
      const need = ESTRATOS[t.zone - 1].req;
      html = `<b>Zona ${ESTRATOS[t.zone - 1].name}</b><br>Servicios: ${cov.score}/${need} requeridos ${cov.score >= need ? '✔' : '✖'}`;
      if (!G.access[h.y * N + h.x]) html += '<br><span class="neg">Sin vía cercana</span>';
    }
  } else if (T0.type === 'zone') {
    html = G.access[h.y * N + h.x] ? 'Con acceso a vía ✔' : '<span class="neg">Lejos de una vía</span>';
  } else { tip.hidden = true; return; }
  tip.innerHTML = html;
  tip.hidden = false;
  tip.style.left = Math.min(window.innerWidth - 270, e.clientX + 16) + 'px';
  tip.style.top = e.clientY + 16 + 'px';
}

function bldTitle(b) {
  if (b.kind === 'pub') return `<b>${PUBLIC[b.key].icon} ${PUBLIC[b.key].name}</b>`;
  if (b.kind === 'com') return `<b>🏪 Comercio · nivel ${b.level}</b><br>Empleos: ${b.jobs}`;
  return `<b>${ESTRATOS[b.e - 1].name} · nivel ${b.level}${b.e === 6 ? (b.variant === 'mansion' ? ' · mansión' : ' · rascacielos') : ''}</b><br>Habitantes: ${b.pop}`;
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

export function renderCity() {
  if (UI.tab !== 'city') return;
  const st = G.stats;
  const tot = Math.max(1, st.pop);
  let html = '<h3>Población por estrato</h3>';
  ESTRATOS.forEach((e, i) => { html += bar(e.name, (st.byE[i] / tot) * 100, e.color, st.byE[i]); });
  // cobertura de servicios
  const cov = Object.fromEntries(Object.keys(SERVICES).map((k) => [k, 0]));
  for (const b of G.buildings) {
    if (b.kind !== 'res') continue;
    for (const k of coverageAt(b.x, b.y).list) cov[k] += b.pop;
  }
  html += '<h3>Cobertura de servicios</h3>';
  for (const [k, s] of Object.entries(SERVICES)) {
    const p = (cov[k] / tot) * 100;
    html += bar(`${s.icon} ${s.name}`, p, p > 66 ? '#37d67a' : p > 33 ? '#fcd116' : '#ff6b78', Math.round(p) + '%');
  }
  const net = st.income - st.expense;
  html += `<h3>Presupuesto (por mes)</h3>
    <div class="kv"><span>Ingresos</span><b class="pos">${fmt(st.income * 10)}</b></div>
    <div class="kv"><span>· del transporte</span><span>${fmt(st.transit * 10)}</span></div>
    <div class="kv"><span>Gastos</span><b class="neg">${fmt(-st.expense * 10)}</b></div>
    <div class="kv"><span>Balance</span><b class="${net >= 0 ? 'pos' : 'neg'}">${fmt(net * 10)}</b></div>
    <h3>Ciudad</h3>
    <div class="kv"><span>Edificios</span><b>${st.bldCount}</b></div>
    <div class="kv"><span>Empleos</span><b>${st.jobs}</b></div>
    <p class="hint">Los estratos altos piden más servicios cerca. Estrato 1 recibe subsidio; 5 y 6 pagan contribución.</p>`;
  $('#tab-city').innerHTML = html;
}

export function renderInfo() {
  if (UI.tab !== 'info') return;
  const el = $('#tab-info');
  const sel = UI.selection;
  if (!sel) { el.innerHTML = '<p class="hint">Usa <b>Inspeccionar</b> y haz clic en un edificio, parada o lote.</p>'; return; }
  let html = '';
  if (sel.kind === 'bld') {
    const b = sel.b;
    if (!G.buildings.includes(b)) { UI.selection = null; renderInfo(); return; }
    const cov = coverageAt(b.x, b.y);
    const chips = Object.entries(SERVICES).map(([k, s]) => `<span class="chip ${cov.list.includes(k) ? 'ok' : 'no'}">${s.icon} ${s.name}</span>`).join('');
    if (b.kind === 'pub') {
      const d = PUBLIC[b.key];
      html = `<h3>${d.icon} ${d.name}</h3><p class="hint">${d.desc}</p>
        <div class="kv"><span>Servicio</span><b>${SERVICES[d.cat].name}</b></div>
        <div class="kv"><span>Radio</span><b>${d.radius} casillas</b></div>
        <div class="kv"><span>Empleos</span><b>${d.jobs}</b></div>
        <div class="kv"><span>Mantenimiento</span><b>${fmt(d.upkeep * 10)}/mes</b></div>`;
    } else if (b.kind === 'com') {
      html = `<h3>🏪 Comercio</h3><div class="kv"><span>Nivel</span><b>${b.level}/3</b></div><div class="kv"><span>Empleos</span><b>${b.jobs}</b></div>
        <h3>Servicios cercanos (${cov.score}/8)</h3><div class="chips">${chips}</div>`;
    } else {
      const e = ESTRATOS[b.e - 1];
      const nextReq = b.level < 3 ? levelReq(b.e, b.level + 1) : null;
      html = `<h3><span class="estr" style="background:${e.color}">${e.name}</span> ${e.sub}</h3>
        <div class="kv"><span>Tipo</span><b>${b.e === 6 ? (b.variant === 'mansion' ? 'Mansión' : 'Rascacielos') : 'Vivienda'}</b></div>
        <div class="kv"><span>Nivel</span><b>${b.level}/3</b></div>
        <div class="kv"><span>Habitantes</span><b>${b.pop}</b></div>
        <h3>Servicios cercanos (${cov.score}/8)</h3><div class="chips">${chips}</div>
        <p class="hint">${nextReq === null ? 'Nivel máximo.' : `Para subir de nivel necesita ${nextReq}+ servicios cercanos.`}</p>`;
    }
    html += '<button id="selDel" style="margin-top:8px">🚧 Demoler</button>';
  } else if (sel.kind === 'stop') {
    const s = sel.stop;
    const lines = TR.T.lines.filter((l) => l.stops.includes(s));
    html = `<h3>${s.type === 'bus' ? '🚏 Paradero de bus' : '🚠 Estación Metrocable'}</h3>
      <div class="kv"><span>Líneas</span><b>${lines.length}</b></div>` + lines.map((l) => `<div class="chip" style="border-color:${l.color}">${l.name}</div>`).join(' ') +
      `<p class="hint">Cobertura de transporte: radio 5 (necesita línea con vehículos).</p>`;
  } else {
    const t = G.grid[sel.y][sel.x];
    const cov = coverageAt(sel.x, sel.y);
    html = `<h3>Casilla ${sel.x},${sel.y}</h3>
      <div class="kv"><span>Uso</span><b>${t.road ? 'Calle' : t.zone ? (t.zone === 7 ? 'Zona comercial' : ESTRATOS[t.zone - 1].name) : 'Lote libre'}</b></div>
      <div class="kv"><span>Acceso a vía</span><b>${G.access[sel.y * N + sel.x] ? 'Sí' : 'No'}</b></div>
      <h3>Servicios (${cov.score}/8)</h3><div class="chips">${Object.entries(SERVICES).map(([k, s]) => `<span class="chip ${cov.list.includes(k) ? 'ok' : 'no'}">${s.icon} ${s.name}</span>`).join('')}</div>`;
  }
  el.innerHTML = html;
  const del = $('#selDel');
  if (del) del.onclick = () => { removeBuilding(sel.b); markDirty('all'); flush(); G.hooks.roadsChanged(); UI.selection = null; renderInfo(); updatePreview(); G.onChange(); };
}

export function renderLines() {
  if (UI.tab !== 'lines') return;
  const el = $('#tab-lines');
  if (!TR.T.lines.length) {
    el.innerHTML = '<p class="hint">Aún no hay rutas. Coloca paraderos de bus (en calles) o estaciones de Metrocable, y usa <b>Crear línea</b>.</p>';
    return;
  }
  el.innerHTML = TR.T.lines.map((l) => {
    const c = TR.TRANSIT[l.type];
    return `<div class="line" data-id="${l.id}">
      <div class="hd"><i style="background:${l.color}"></i>${l.name}<span class="hint" style="margin-left:auto">${c.name}</span></div>
      ${l.ok ? '' : '<div class="bad">⚠ Paradas desconectadas: reconstruye las vías</div>'}
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
  G.onToast = toast;
  setTool({ type: 'inspect' });
  showTab('city');
  void mats; void resize; void updateCamera; void tile;
}
