import { MODES, newLine, lineStats, validateState, encodeState, decodeState } from './lib.js';

const KEY = 'transit-planner-v1';
const $ = (s) => document.querySelector(s);
let state = { lines: [], headwayMin: 10 };
let activeId = null;
const layers = new Map(); // lineId -> { poly, markers }

const map = L.map('map').setView([4.711, -74.072], 12);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

function el(tag, props = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) k === 'class' ? (n.className = v) : n.setAttribute(k, v);
  n.append(...kids);
  return n;
}
const say = (t) => { $('#msg').textContent = t; };
const active = () => state.lines.find((l) => l.id === activeId);

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* modo privado o sin espacio */ }
}

function drawMap() {
  for (const { poly, markers } of layers.values()) { poly.remove(); markers.forEach((m) => m.remove()); }
  layers.clear();
  for (const line of state.lines) {
    const isActive = line.id === activeId;
    const poly = L.polyline(line.stops.map((s) => [s.lat, s.lng]), { color: line.color, weight: isActive ? 7 : 4, opacity: 0.9 }).addTo(map);
    const markers = line.stops.map((s, i) => (isActive ? draggableStop(line, i, () => markers, poly) : staticStop(line, s)));
    layers.set(line.id, { poly, markers });
  }
}

function staticStop(line, s) {
  return L.circleMarker([s.lat, s.lng], { radius: 6, color: line.color, fillColor: '#fff', fillOpacity: 1, weight: 3 }).addTo(map).bindTooltip(s.name);
}

// Solo la línea activa se edita: sus paradas se pueden arrastrar y renombrar (doble clic).
function draggableStop(line, i, getMarkers, poly) {
  const icon = L.divIcon({
    className: '',
    html: `<div style="width:18px;height:18px;border-radius:50%;background:#fff;border:4px solid ${line.color};box-shadow:0 0 0 1px #0004"></div>`,
    iconSize: [18, 18], iconAnchor: [9, 9],
  });
  const m = L.marker([line.stops[i].lat, line.stops[i].lng], { draggable: true, icon, title: line.stops[i].name }).addTo(map);
  m.on('drag', () => poly.setLatLngs(getMarkers().map((x) => x.getLatLng())));
  m.on('dragend', () => {
    const p = m.getLatLng();
    line.stops[i].lat = +p.lat.toFixed(6);
    line.stops[i].lng = +p.lng.toFixed(6);
    commit();
  });
  m.on('dblclick', (e) => {
    L.DomEvent.stop(e);
    const n = prompt('Nombre de la parada', line.stops[i].name);
    if (n?.trim()) { line.stops[i].name = n.trim().slice(0, 60); commit(); }
  });
  return m;
}

const fmt = (n, d = 1) => n.toLocaleString('es-CO', { maximumFractionDigits: d });

function renderList() {
  const box = $('#lines');
  box.replaceChildren();
  if (!state.lines.length) box.append(el('p', { class: 'hint' }, 'Crea una línea para empezar.'));
  for (const line of state.lines) {
    const st = lineStats(line, { headwayMin: state.headwayMin });
    const name = el('input', { type: 'text', class: 'name', value: line.name });
    name.onclick = (e) => e.stopPropagation();
    name.onchange = () => { line.name = name.value.trim().slice(0, 60) || line.name; commit(); };
    const color = el('input', { type: 'color', value: line.color });
    color.onclick = (e) => e.stopPropagation();
    color.oninput = () => { line.color = color.value; commit(); };
    const mode = el('select', {}, ...Object.entries(MODES).map(([k, m]) => { const o = el('option', { value: k }, m.label); o.selected = k === line.mode; return o; }));
    mode.onclick = (e) => e.stopPropagation();
    mode.onchange = () => { line.mode = mode.value; commit(); };
    const del = el('button', { class: 'danger', title: 'Eliminar línea' }, '✕');
    del.onclick = (e) => {
      e.stopPropagation();
      if (!confirm(`¿Eliminar "${line.name}"?`)) return;
      state.lines = state.lines.filter((l) => l.id !== line.id);
      if (activeId === line.id) activeId = state.lines[0]?.id ?? null;
      commit();
    };
    const card = el('div', { class: 'card line' + (line.id === activeId ? ' active' : '') }, el('div', { class: 'row' }, color, name, mode, del));
    card.style.setProperty('--c', line.color);
    card.onclick = () => { activeId = line.id; commit(); };

    const stats = el('div', { class: 'stats' });
    const add = (k, v) => stats.append(el('span', {}, k + ' '), el('b', {}, v));
    add('Paradas', String(st.stops));
    add('Longitud', st.valid ? fmt(st.km) + ' km' : '—');
    add('Viaje (ida)', st.valid ? fmt(st.oneWayMin, 0) + ' min' : '—');
    add('Vehículos', st.valid ? String(st.vehicles) : '—');
    add('Costo aprox.', st.valid ? fmt(st.cost) + ' M USD' : '—');
    card.append(stats);

    if (line.id === activeId && line.stops.length) {
      const list = el('div', { style: 'margin-top:8px' });
      line.stops.forEach((s, i) => {
        const rm = el('button', { title: 'Quitar parada' }, '✕');
        rm.onclick = (e) => { e.stopPropagation(); line.stops.splice(i, 1); commit(); };
        list.append(el('div', { class: 'stop' }, el('span', {}, `${i + 1}. ${s.name}`), rm));
      });
      card.append(list);
    }
    box.append(card);
  }
}

function commit() {
  save();
  drawMap();
  renderList();
}

map.on('click', (e) => {
  const line = active();
  if (!line) { say('Primero crea una línea.'); return; }
  line.stops.push({ lat: +e.latlng.lat.toFixed(6), lng: +e.latlng.lng.toFixed(6), name: `Parada ${line.stops.length + 1}` });
  commit();
});
map.doubleClickZoom.disable();

$('#addLine').onclick = () => {
  const l = newLine(state.lines.length);
  state.lines.push(l);
  activeId = l.id;
  commit();
};
$('#headway').onchange = (e) => {
  state.headwayMin = Math.min(120, Math.max(1, Number(e.target.value) || 10));
  e.target.value = state.headwayMin;
  commit();
};
$('#clear').onclick = () => {
  if (!state.lines.length || !confirm('¿Borrar todas las líneas?')) return;
  state.lines = []; activeId = null; commit(); say('Plan borrado.');
};
$('#export').onclick = () => {
  const a = el('a', { href: URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })), download: 'plan-transporte.json' });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
$('#import').onclick = () => $('#file').click();
$('#file').onchange = async (e) => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f || f.size > 2_000_000) return say('Archivo no válido o demasiado grande.');
  try {
    state = validateState(JSON.parse(await f.text()));
    activeId = state.lines[0]?.id ?? null;
    $('#headway').value = state.headwayMin;
    commit(); fitAll(); say('Plan importado.');
  } catch { say('No se pudo leer ese archivo.'); }
};
$('#share').onclick = async () => {
  const url = location.origin + location.pathname + '#p=' + encodeState(state);
  history.replaceState(null, '', url);
  try { await navigator.clipboard.writeText(url); say('Enlace copiado. Quien lo abra verá tu plan.'); }
  catch { say('Copia el enlace desde la barra del navegador.'); }
};

function fitAll() {
  const pts = state.lines.flatMap((l) => l.stops.map((s) => [s.lat, s.lng]));
  if (pts.length > 1) map.fitBounds(pts, { padding: [40, 40] });
  else if (pts.length === 1) map.setView(pts[0], 14);
}

// Carga: primero el enlace compartido, si no, lo guardado en este navegador.
try {
  const m = location.hash.match(/^#p=(.+)$/);
  if (m) state = decodeState(m[1]);
  else { const raw = localStorage.getItem(KEY); if (raw) state = validateState(JSON.parse(raw)); }
} catch { say('No se pudo cargar el plan guardado; se empieza de cero.'); }
activeId = state.lines[0]?.id ?? null;
$('#headway').value = state.headwayMin;
commit();
fitAll();
