// Red vial como grafo: SEGMENTOS (tramos rectos con tipo y carriles) unidos por NODOS (cruces, puntas,
// cambios de tipo). Las casillas de la cuadrícula son una proyección ("rasterización") del grafo; la
// simulación sigue leyendo casillas, pero la fuente de verdad de las vías es esta red.
//
// Fase 1: los segmentos son ortogonales (eje X o Z). La estructura está pensada para que en la fase 2
// un segmento pueda ser diagonal y en la fase 3 curvo, sin tocar a quien consume el grafo.
import { ROADS } from './roads.js';

// Segmento: { id, k, ax, line, s0, s1, offs, cIdx }
//  ax: 0 = a lo largo de X (line = fila y), 1 = a lo largo de Z (line = columna x)
//  s0..s1: rango inclusivo de posiciones a lo largo del eje (casillas de la línea central)
//  offs: desplazamientos laterales de cada carril respecto a la línea central (p. ej. [0,1] avenida)
//  cIdx: índice del carril central exclusivo (troncal) o -1
export function createNet() {
  return { segs: [], nodes: new Map(), nextId: 1 };
}

export function lanesOf(k) {
  const w = ROADS[k].w;
  const offs = w === 1 ? [0] : w === 2 ? [0, 1] : [-1, 0, 1];
  return { offs, cIdx: w === 3 ? 1 : -1 };
}

// casilla de la posición s, carril o
export const cellOf = (seg, s, o) => (seg.ax === 0 ? { x: s, y: seg.line + o } : { x: seg.line + o, y: s });
// punto de la línea central (lo que usan los nodos)
const centerOf = (seg, s) => (seg.ax === 0 ? { x: s, y: seg.line } : { x: seg.line, y: s });

function newSeg(net, o) {
  return { id: net.nextId++, k: o.k, ax: o.ax, line: o.line, s0: o.s0, s1: o.s1, offs: o.offs, cIdx: o.cIdx };
}

// Quita del segmento el tramo [a,b]; devuelve las piezas que sobreviven. Con share = true las piezas
// conservan la casilla del borde (la comparten con el tramo que las reemplaza, así quedan conectadas).
function cut(net, seg, a, b, share = false) {
  const out = [];
  const d = share ? 0 : 1;
  if (a > seg.s0) out.push(newSeg(net, { ...seg, s1: Math.min(seg.s1, a - d) }));
  if (b < seg.s1) out.push(newSeg(net, { ...seg, s0: Math.max(seg.s0, b + d) }));
  return out;
}

// Agrega un tramo. Sobre la misma línea central y eje, el tipo de mayor rango gana el tramo compartido.
export function addSegment(net, o) {
  const add = newSeg(net, o);
  let pieces = [add];
  const keep = [];
  for (const seg of net.segs) {
    const colinear = seg.ax === add.ax && seg.line === add.line && seg.s1 >= add.s0 && seg.s0 <= add.s1;
    if (!colinear) { keep.push(seg); continue; }
    const a = Math.max(seg.s0, add.s0), b = Math.min(seg.s1, add.s1);
    if (ROADS[seg.k].rank > ROADS[add.k].rank) {
      // el existente es mejor: el nuevo pierde ese tramo
      keep.push(seg);
      pieces = pieces.flatMap((p) => (p.s1 >= a && p.s0 <= b ? cut(net, p, a, b, true) : [p]));
    } else keep.push(...cut(net, seg, a, b, true));
  }
  net.segs = keep.concat(pieces);
  normalize(net);
}

// Quita de la red todo lo que pasa por la casilla (x, y): corta los segmentos en esa posición.
export function removeCell(net, x, y) {
  let hit = false;
  const keep = [];
  for (const seg of net.segs) {
    const s = seg.ax === 0 ? x : y;
    const lat = (seg.ax === 0 ? y : x) - seg.line;
    if (s < seg.s0 || s > seg.s1 || !seg.offs.includes(lat)) { keep.push(seg); continue; }
    hit = true;
    keep.push(...cut(net, seg, s, s));
  }
  net.segs = keep;
  if (hit) normalize(net);
  return hit;
}

// Recalcula la red: 1) une tramos idénticos que se tocan o se solapan, 2) busca nodos (puntas, cruces,
// "T" y cambios de tipo), 3) parte cada segmento en los nodos que caen en su interior.
export function normalize(net) {
  const key = (p) => p.x + ',' + p.y;
  // 1) unión por forma (tipo, eje, línea, carriles)
  const groups = new Map();
  for (const s of net.segs) {
    const g = [s.k, s.ax, s.line, s.offs.join(':'), s.cIdx].join('|');
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(s);
  }
  let segs = [];
  for (const list of groups.values()) {
    list.sort((a, b) => a.s0 - b.s0);
    let cur = null;
    for (const s of list) {
      if (cur && s.s0 <= cur.s1 + 1) cur.s1 = Math.max(cur.s1, s.s1);
      else { if (cur) segs.push(cur); cur = newSeg(net, s); }
    }
    if (cur) segs.push(cur);
  }
  // 2) puntos de nodo
  const pts = new Map();
  const mark = (p) => pts.set(key(p), p);
  for (const s of segs) { mark(centerOf(s, s.s0)); mark(centerOf(s, s.s1)); }
  const hs = segs.filter((s) => s.ax === 0), vs = segs.filter((s) => s.ax === 1);
  for (const a of hs) {
    for (const b of vs) {
      if (b.line >= a.s0 && b.line <= a.s1 && a.line >= b.s0 && a.line <= b.s1) mark({ x: b.line, y: a.line });
    }
  }
  // 3) partir en los nodos interiores (las piezas comparten la casilla del nodo)
  const byLine = new Map();
  for (const p of pts.values()) {
    for (const [ax, line, along] of [[0, p.y, p.x], [1, p.x, p.y]]) {
      const k = ax + ':' + line;
      if (!byLine.has(k)) byLine.set(k, []);
      byLine.get(k).push(along);
    }
  }
  const out = [];
  for (const s of segs) {
    const cuts = (byLine.get(s.ax + ':' + s.line) || []).filter((c) => c > s.s0 && c < s.s1).sort((a, b) => a - b);
    let start = s.s0;
    for (const c of cuts) { out.push(newSeg(net, { ...s, s0: start, s1: c })); start = c; }
    out.push(newSeg(net, { ...s, s0: start, s1: s.s1 }));
  }
  net.segs = out;
  // 4) nodos con los segmentos que llegan a cada uno
  const nodes = new Map();
  for (const s of out) {
    for (const p of [centerOf(s, s.s0), centerOf(s, s.s1)]) {
      const k = key(p);
      if (!nodes.has(k)) nodes.set(k, { x: p.x, y: p.y, segs: [] });
      const n = nodes.get(k);
      if (!n.segs.includes(s.id)) n.segs.push(s.id);
    }
  }
  // un cruce también es nodo de los segmentos que lo atraviesan justo en su extremo
  net.nodes = nodes;
}

// Proyecta el grafo sobre la cuadrícula: escribe tile.road = { k, ax, c, seg, li, nl } en cada casilla
// (li = carril/casilla dentro del perfil, nl = casillas del segmento).
// Donde se cruzan ejes distintos la casilla es un cruce (ax = 2) y gana el tipo de mayor rango.
export function rasterize(net, grid, N) {
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) grid[y][x].road = null;
  const order = [...net.segs].sort((a, b) => ROADS[a.k].rank - ROADS[b.k].rank);
  for (const seg of order) {
    for (let s = seg.s0; s <= seg.s1; s++) {
      seg.offs.forEach((o, li) => {
        const { x, y } = cellOf(seg, s, o);
        if (x < 0 || y < 0 || x >= N || y >= N) return;
        const t = grid[y][x];
        const c = li === seg.cIdx;
        const nl = seg.offs.length;
        if (!t.road) t.road = { k: seg.k, ax: seg.ax, c, seg: seg.id, li, nl };
        else if (t.road.ax !== seg.ax) t.road = { k: ROADS[t.road.k].rank >= ROADS[seg.k].rank ? t.road.k : seg.k, ax: 2, c: false, seg: seg.id, li: 0, nl: 1 };
        else if (ROADS[seg.k].rank >= ROADS[t.road.k].rank) t.road = { k: seg.k, ax: seg.ax, c, seg: seg.id, li, nl };
      });
    }
  }
}

// Reconstruye la red a partir de casillas sueltas (partidas guardadas antes del grafo).
export function netFromTiles(tiles) {
  const net = createNet();
  for (const [x, y, k, ax, c] of tiles) {
    const axes = ax === 2 ? [0, 1] : [ax];
    for (const a of axes) {
      net.segs.push(newSeg(net, { k, ax: a, line: a === 0 ? y : x, s0: a === 0 ? x : y, s1: a === 0 ? x : y, offs: [0], cIdx: c && ax !== 2 ? 0 : -1 }));
    }
  }
  normalize(net);
  return net;
}

export function serializeNet(net) {
  return net.segs.map((s) => [s.k, s.ax, s.line, s.s0, s.s1, s.offs, s.cIdx]);
}

export function loadNet(arr) {
  const net = createNet();
  for (const [k, ax, line, s0, s1, offs, cIdx] of arr) net.segs.push(newSeg(net, { k, ax, line, s0, s1, offs, cIdx }));
  normalize(net);
  return net;
}

// Nivelación transversal: bajo cada vía el terreno queda horizontal de lado a lado (sigue la pendiente
// sólo a lo largo de la vía). Devuelve alturas para las esquinas de casilla afectadas: Map(índice -> altura).
// base(i, j) es la altura original del terreno en la esquina (i, j).
export function crossLevels(net, N, base) {
  const acc = new Map();
  const add = (i, j, h) => {
    if (i < 0 || j < 0 || i > N || j > N) return;
    const k = j * (N + 1) + i;
    const a = acc.get(k);
    if (a) { a[0] += h; a[1]++; } else acc.set(k, [h, 1]);
  };
  for (const seg of net.segs) {
    const lat0 = seg.line + seg.offs[0], lat1 = seg.line + seg.offs[seg.offs.length - 1] + 1;
    for (let b = seg.s0; b <= seg.s1 + 1; b++) {
      let sum = 0, n = 0;
      for (let l = lat0; l <= lat1; l++) {
        const [i, j] = seg.ax === 0 ? [b, l] : [l, b];
        if (i < 0 || j < 0 || i > N || j > N) continue;
        sum += base(i, j); n++;
      }
      if (!n) continue;
      const h = sum / n;
      for (let l = lat0; l <= lat1; l++) {
        const [i, j] = seg.ax === 0 ? [b, l] : [l, b];
        add(i, j, h);
      }
    }
  }
  const out = new Map();
  for (const [k, [s, n]] of acc) out.set(k, s / n);
  return out;
}
