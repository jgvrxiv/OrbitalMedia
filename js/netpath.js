// Recorridos sobre el grafo vial: rutas de bus (Dijkstra entre nodos) y caminatas de carros ambiente.
// Trabaja en coordenadas de casilla (x, y con decimales); quien dibuja las convierte al mundo.
import { ROADS } from './roads.js';
import { DIAG, centerOf, segLength } from './roadnet.js';
import { METERS_PER_TILE as MPT } from './units.js';

const key = (p) => p.x + ',' + p.y;

// Punto del eje geométrico del segmento en la posición s. En vías anchas el eje está entre casillas; cerca
// de los nodos se acerca al centro de la casilla del nodo para que los empalmes no salten.
export function segPoint(seg, s) {
  if (seg.ax === DIAG) return { x: s, y: seg.dy * (s - seg.line) };
  const mid = (seg.offs[0] + seg.offs[seg.offs.length - 1]) / 2;
  const blend = Math.min(1, Math.max(0, Math.min(s - seg.s0, seg.s1 - s)));
  const lat = seg.line + mid * blend;
  return seg.ax === 0 ? { x: s, y: lat } : { x: lat, y: s };
}

// dirección unitaria del segmento al avanzar en s (en casillas)
export function segDir(seg) {
  if (seg.ax === 0) return { x: 1, y: 0 };
  if (seg.ax === 1) return { x: 0, y: 1 };
  return { x: Math.SQRT1_2, y: seg.dy * Math.SQRT1_2 };
}

// desplazamiento lateral (en casillas, hacia la derecha del sentido de marcha) del carril que usa cada vehículo
const offCache = new Map();
export function laneOffset(k, kind = 'car', pick = 0) {
  const ck = k + ':' + kind + ':' + pick;
  if (offCache.has(ck)) return offCache.get(ck);
  const R = ROADS[k];
  const W = R.w * MPT;
  const mid = W / 2;
  let lanes = R.strips.filter((s) => (s.t === 'lane' || s.t === 'dirt' || s.t === 'paver') && (s.d >= 0));
  if (kind === 'bus') {
    const bus = R.strips.filter((s) => s.t === 'bus' && s.d > 0);
    if (bus.length) lanes = bus;
    else lanes = lanes.slice(-1); // carril exterior
  }
  let off;
  if (!lanes.length) off = 0.18;
  else {
    const s = lanes[pick % lanes.length];
    const c = (s.u0 + s.u1) / 2;
    off = (s.t === 'dirt' || s.t === 'paver') ? 0.18 : Math.max(0.1, (c - mid) / MPT);
  }
  offCache.set(ck, off);
  return off;
}

// segmento y posición s de una casilla de vía
export function locate(net, grid, x, y) {
  const t = grid[y]?.[x]?.road;
  if (!t) return null;
  const seg = net.byId?.get(t.seg);
  if (!seg) return null;
  let s;
  if (seg.ax === 0) s = x;
  else if (seg.ax === 1) s = y;
  else s = t.part === 'r' ? x - 0.5 : x;
  return { seg, s: Math.max(seg.s0, Math.min(seg.s1, s)) };
}

const stepLen = (seg) => (seg.ax === DIAG ? Math.SQRT2 : 1);
// vía de un solo sentido (ningún carril hacia s decreciente): sólo se recorre de s0 a s1
export const oneWay = (k) => ROADS[k].strips.some((p) => p.t === 'lane') && !ROADS[k].strips.some((p) => p.t === 'lane' && p.d < 0);
const canGo = (seg, from, to) => !(oneWay(seg.k) && to < from);

// Ruta más rápida de la casilla a a la b por segmentos que cumplen allow(k).
// speed(k, seg) da la velocidad relativa. Devuelve [{ seg, s }] o null.
export function route(net, grid, a, b, allow, speed) {
  const A = locate(net, grid, a.x, a.y), Bt = locate(net, grid, b.x, b.y);
  if (!A || !Bt || !allow(A.seg.k) || !allow(Bt.seg.k)) return null;
  const cost = (seg, s0, s1) => (Math.abs(s1 - s0) * stepLen(seg)) / Math.max(0.3, speed(seg.k, seg));
  // mismo segmento: directo
  let best = null;
  if (A.seg === Bt.seg && canGo(A.seg, A.s, Bt.s)) best = { c: cost(A.seg, A.s, Bt.s), path: [[A.seg, A.s, Bt.s]] };
  // Dijkstra entre nodos, partiendo de los dos extremos del segmento de salida
  const dist = new Map(), prev = new Map();
  const heap = [];
  const push = (d, k) => {
    heap.push([d, k]);
    let i = heap.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; }
  };
  const pop = () => {
    const top = heap[0], last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]]; i = m;
      }
    }
    return top;
  };
  for (const end of [A.seg.s0, A.seg.s1]) {
    if (!canGo(A.seg, A.s, end)) continue;
    const k = key(centerOf(A.seg, end));
    const d = cost(A.seg, A.s, end);
    if (d < (dist.get(k) ?? Infinity)) { dist.set(k, d); prev.set(k, [null, A.seg, A.s, end]); push(d, k); }
  }
  while (heap.length) {
    const [d, k] = pop();
    if (d > (dist.get(k) ?? Infinity)) continue;
    const node = net.nodes.get(k);
    if (!node) continue;
    for (const id of node.segs) {
      const seg = net.byId.get(id);
      if (!seg || !allow(seg.k)) continue;
      const here = key(centerOf(seg, seg.s0)) === k ? seg.s0 : seg.s1;
      const there = here === seg.s0 ? seg.s1 : seg.s0;
      if (!canGo(seg, here, there)) continue;
      const nk = key(centerOf(seg, there));
      const nd = d + cost(seg, here, there);
      if (nd < (dist.get(nk) ?? Infinity)) { dist.set(nk, nd); prev.set(nk, [k, seg, here, there]); push(nd, nk); }
    }
  }
  // llegar desde un extremo del segmento de destino
  for (const end of [Bt.seg.s0, Bt.seg.s1]) {
    if (!canGo(Bt.seg, end, Bt.s)) continue;
    const k = key(centerOf(Bt.seg, end));
    if (!dist.has(k)) continue;
    const c = dist.get(k) + cost(Bt.seg, end, Bt.s);
    if (!best || c < best.c) {
      const path = [[Bt.seg, end, Bt.s]];
      let cur = k;
      for (let guard = 0; guard < 10000 && cur; guard++) {
        const p = prev.get(cur);
        if (!p) break;
        path.unshift([p[1], p[2], p[3]]);
        cur = p[0];
      }
      best = { c, path };
    }
  }
  if (!best) return null;
  // muestrear cada tramo en sus posiciones enteras
  const out = [];
  for (const [seg, s0, s1] of best.path) {
    const dir = Math.sign(s1 - s0);
    const pts = [s0];
    if (dir) {
      let s = dir > 0 ? Math.floor(s0) + 1 : Math.ceil(s0) - 1;
      for (; dir > 0 ? s < s1 : s > s1; s += dir) pts.push(s);
      pts.push(s1);
    }
    for (const s of pts) {
      const last = out[out.length - 1];
      const p = segPoint(seg, s);
      if (last && Math.abs(last.x - p.x) < 1e-6 && Math.abs(last.y - p.y) < 1e-6) { last.seg = seg; continue; }
      out.push({ x: p.x, y: p.y, seg, dir: dir || 1 });
    }
  }
  return out;
}

// ---------- carros ambiente: caminata aleatoria por segmentos ----------
export function spawnWalker(net, allow, rnd = Math.random) {
  const segs = net.segs.filter((s) => allow(s.k) && s.s1 > s.s0);
  if (!segs.length) return null;
  // probabilidad proporcional al largo
  const total = segs.reduce((a, s) => a + segLength(s), 0);
  let t = rnd() * total;
  let seg = segs[0];
  for (const s of segs) { t -= segLength(s); if (t <= 0) { seg = s; break; } }
  const dir = oneWay(seg.k) || rnd() < 0.5 ? 1 : -1;
  return { seg, s: seg.s0 + rnd() * (seg.s1 - seg.s0), dir, pick: Math.floor(rnd() * 3) };
}

// avanza dist casillas; en los nodos elige otro segmento al azar (evita devolverse salvo en calles ciegas)
export function stepWalker(net, w, dist, allow, rnd = Math.random) {
  for (let guard = 0; guard < 8 && dist > 1e-6; guard++) {
    const seg = w.seg;
    const L = stepLen(seg);
    const end = w.dir > 0 ? seg.s1 : seg.s0;
    const room = Math.abs(end - w.s) * L;
    if (dist < room) { w.s += (w.dir * dist) / L; return true; }
    dist -= room;
    w.s = end;
    const node = net.nodes.get(key(centerOf(seg, end)));
    const nk = key(centerOf(seg, end));
    const opts = (node ? node.segs : []).map((id) => net.byId.get(id)).filter((s) => {
      if (!s || s === seg || !allow(s.k) || s.s1 <= s.s0) return false;
      // en un sentido único sólo se entra por su inicio
      return !oneWay(s.k) || key(centerOf(s, s.s0)) === nk;
    });
    const next = opts.length ? opts[Math.floor(rnd() * opts.length)] : seg;
    if (next === seg) {
      if (oneWay(seg.k)) { const r = spawnWalker(net, allow, rnd); if (r) Object.assign(w, r); return true; }
      w.dir = -w.dir; continue;
    }
    const atStart = key(centerOf(next, next.s0)) === nk;
    w.seg = next;
    w.s = atStart ? next.s0 : next.s1;
    w.dir = atStart ? 1 : -1;
  }
  return true;
}
