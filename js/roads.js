// Tipos de vía definidos por su PERFIL TRANSVERSAL en metros (andenes, carriles, separadores, ciclorrutas…).
// Cada vía reserva casillas enteras de 12 m (ancho redondeado hacia arriba); la sobra se dibuja como zona
// verde. La malla dibuja en cada casilla la franja del perfil que le corresponde.
import { Builder, CELL, shade } from './geom.js';
import { N, heightAt } from './scene.js';
import { METERS_PER_TILE as MPT } from './units.js';

// Franjas del perfil: t = tipo, w = ancho en metros, d = sentido de circulación (carriles)
//  walk andén · lane carril · bus carril exclusivo · median separador verde · sep separador bajo de concreto
//  bar barrera (autopista) · verge zona verde · bike ciclorruta · shoulder berma · dirt destapado · paver adoquín
const P = (t, w, d = 0) => ({ t, w, d });

// dens: densidad máxima que permite en sus frentes (0 = sin acceso a lotes). Cualquier calle pavimentada
// admite edificios altos; el camino destapado sólo casas.
export const ROADS = {
  tierra: {
    name: 'Camino destapado', icon: '🟫', cost: 2500, upkeep: 1, dens: 1, car: true, bus: false, truck: true, speed: 0.6,
    lv: -0.05, rank: 0, maxSlope: 0.28, color: '#9b7d57', desc: 'Barato; sólo baja densidad y sin buses.',
    profile: [P('verge', 1.5), P('dirt', 9), P('verge', 1.5)],
  },
  peatonal: {
    name: 'Calle peatonal', icon: '🚶', cost: 9000, upkeep: 3, dens: 3, car: false, bus: false, truck: false, speed: 0,
    lv: 0.06, rank: 1, maxSlope: 0.4, color: '#cdbfa3', desc: 'Sin carros; con escaleras sube pendientes de hasta 40 %. Sube el valor del suelo.',
    profile: [P('paver', 12)],
  },
  calle: {
    name: 'Calle', icon: '🛣️', cost: 8000, upkeep: 3, dens: 3, car: true, bus: true, truck: true, speed: 1,
    lv: 0, rank: 2, maxSlope: 0.2, color: '#3d4147', desc: '2 carriles en doble sentido.',
    profile: [P('walk', 2.5), P('lane', 3.5, -1), P('lane', 3.5, 1), P('walk', 2.5)],
  },
  calle1: {
    name: 'Calle de un sentido', icon: '➡️', cost: 8500, upkeep: 3, dens: 3, car: true, bus: true, truck: true, speed: 1.15,
    lv: 0, rank: 2.1, maxSlope: 0.2, color: '#3d4147', desc: '2 carriles en un solo sentido.',
    profile: [P('walk', 2.5), P('lane', 3.5, 1), P('lane', 3.5, 1), P('walk', 2.5)],
  },
  calle3: {
    name: 'Calle de 3 carriles', icon: '🚗', cost: 10000, upkeep: 4, dens: 3, car: true, bus: true, truck: true, speed: 1.25,
    lv: -0.01, rank: 2.5, maxSlope: 0.18, color: '#3b3f45', desc: '3 carriles con andenes angostos.',
    profile: [P('walk', 1.5), P('lane', 3, -1), P('lane', 3, 1), P('lane', 3, 1), P('walk', 1.5)],
  },
  avenida: {
    name: 'Avenida', icon: '🌴', cost: 15000, upkeep: 6, dens: 3, car: true, bus: true, truck: true, speed: 1.5,
    lv: 0.03, rank: 3, maxSlope: 0.12, color: '#383c42', desc: '4 carriles con separador y palmas. Permite alta densidad.',
    profile: [P('walk', 3), P('lane', 3.3, -1), P('lane', 3.3, -1), P('median', 4.8), P('lane', 3.3, 1), P('lane', 3.3, 1), P('walk', 3)],
  },
  avenida6: {
    name: 'Avenida de 6 carriles', icon: '🚙', cost: 17000, upkeep: 7, dens: 3, car: true, bus: true, truck: true, speed: 1.7,
    lv: 0, rank: 3.2, maxSlope: 0.1, color: '#383c42', desc: '6 carriles con separador angosto. Permite alta densidad.',
    profile: [P('walk', 2), P('lane', 3.2, -1), P('lane', 3.2, -1), P('lane', 3.2, -1), P('sep', 0.8), P('lane', 3.2, 1), P('lane', 3.2, 1), P('lane', 3.2, 1), P('walk', 2)],
  },
  bulevar: {
    name: 'Bulevar con ciclorruta', icon: '🚲', cost: 24000, upkeep: 9, dens: 3, car: true, bus: true, truck: true, speed: 1.4,
    lv: 0.07, rank: 3.5, maxSlope: 0.1, color: '#383c42', desc: 'Separador arborizado, ciclorrutas y andenes anchos. Sube el valor del suelo.',
    profile: [P('walk', 3), P('bike', 2), P('lane', 3.3, -1), P('lane', 3.3, -1), P('median', 6), P('lane', 3.3, 1), P('lane', 3.3, 1), P('bike', 2), P('walk', 3)],
  },
  troncal: {
    name: 'Troncal de buses', icon: '🚍', cost: 19000, upkeep: 8, dens: 3, car: true, bus: true, truck: true, speed: 1.5, busSpeed: 2.2,
    lv: 0.02, rank: 4, maxSlope: 0.08, color: '#3a3e44', desc: 'Carriles exclusivos centrales (tipo BRT). Buses más rápidos.',
    profile: [P('walk', 3), P('lane', 3.3, -1), P('lane', 3.3, -1), P('sep', 1), P('bus', 3.5, -1), P('median', 3), P('bus', 3.5, 1), P('sep', 1), P('lane', 3.3, 1), P('lane', 3.3, 1), P('walk', 3)],
  },
  autopista: {
    name: 'Autopista', icon: '🛤️', cost: 24000, upkeep: 10, dens: 0, car: true, bus: true, truck: true, speed: 2.4,
    lv: -0.08, rank: 5, maxSlope: 0.06, color: '#2f3237', desc: 'Rápida, sin acceso a lotes; el ruido baja el valor del suelo.',
    profile: [P('bar', 0.5), P('shoulder', 1.5), P('lane', 3.5, -1), P('lane', 3.5, -1), P('bar', 1), P('lane', 3.5, 1), P('lane', 3.5, 1), P('shoulder', 1.5), P('bar', 0.5)],
  },
};
export const ROAD_ORDER = ['tierra', 'peatonal', 'calle', 'calle1', 'calle3', 'avenida', 'avenida6', 'bulevar', 'troncal', 'autopista'];

// ancho real (m), casillas reservadas y posición de cada franja dentro del ancho reservado
for (const R of Object.values(ROADS)) {
  R.meters = R.profile.reduce((s, p) => s + p.w, 0);
  R.w = Math.max(1, Math.ceil(R.meters / MPT - 1e-6));
  R.lanes = R.profile.filter((p) => p.t === 'lane').length;
  let u = (R.w * MPT - R.meters) / 2;
  R.strips = R.profile.map((p) => { const s = { ...p, u0: u, u1: u + p.w }; u += p.w; return s; });
}

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

// ¿Este tipo de vía admite tramos diagonales? Todas; las anchas ocupan una banda de varias líneas diagonales.
export const canDiag = () => true;
export const diagLines = (w) => Math.ceil(w * Math.SQRT2 - 1e-6);

// Plan de trazado. Recta sobre el eje dominante o, si el arrastre va cerca de 45° y la vía es de una
// casilla, una diagonal. Devuelve las casillas; las diagonales llevan además plan.diag = { line, dy, s0, s1 }.
export function roadPlan(a, b, k) {
  const R = ROADS[k];
  const dx = b.x - a.x, dy = b.y - a.y;
  const adx = Math.abs(dx), ady = Math.abs(dy);
  if (canDiag(k) && adx > 0 && ady > 0 && Math.min(adx, ady) / Math.max(adx, ady) >= 0.5) {
    const n = Math.round((adx + ady) / 2);
    const sx = Math.sign(dx), sy = Math.sign(dy);
    const p0 = { x: a.x, y: a.y }, p1 = { x: a.x + sx * n, y: a.y + sy * n };
    const [lo, hi] = p0.x <= p1.x ? [p0, p1] : [p1, p0];
    const ddy = sx * sy; // al avanzar en X, cuánto cambia Y
    const diag = { line: lo.x - ddy * lo.y, dy: ddy, s0: lo.x, s1: hi.x };
    const out = [];
    const m = diagLines(R.w) - 1;
    for (let k = 0; k <= m; k++) {
      for (let x = Math.ceil(lo.x + k / 2 - 1e-9); x <= Math.floor(hi.x + k / 2 + 1e-9); x++) {
        out.push({ x, y: ddy * (x - diag.line - k), ax: 3, li: k, s: x - k / 2, part: k ? 'r' : 'c' });
      }
    }
    out.diag = diag;
    return out;
  }
  const ax = adx >= ady ? 0 : 1;
  const offs = R.w === 1 ? [0] : R.w === 2 ? [0, 1] : [-1, 0, 1];
  const out = [];
  if (ax === 0) {
    const s = Math.sign(dx) || 1;
    for (let x = a.x; x !== b.x + s; x += s) offs.forEach((o, li) => out.push({ x, y: a.y + o, ax, c: R.w === 3 && o === 0, li }));
  } else {
    const s = Math.sign(dy) || 1;
    for (let y = a.y; y !== b.y + s; y += s) offs.forEach((o, li) => out.push({ x: a.x + o, y, ax, c: R.w === 3 && o === 0, li }));
  }
  return out;
}

// ---------- malla ----------
const H = (x, z) => heightAt(x, z);
function flat(B, x0, z0, x1, z1, lift, color, cell = null) {
  const a = [x0, H(x0, z1) + lift, z1], b = [x1, H(x1, z1) + lift, z1], c = [x1, H(x1, z0) + lift, z0], d = [x0, H(x0, z0) + lift, z0];
  if (cell !== null) B.cellQuad(a, b, c, d, color, cell, null, false);
  else B.quad(a, b, c, d, color);
}
// cara vertical a lo largo de un borde (bordillo)
function curbFace(B, xa, za, xb, zb, lo, hi, color) {
  B.quad([xa, H(xa, za) + lo, za], [xb, H(xb, zb) + lo, zb], [xb, H(xb, zb) + hi, zb], [xa, H(xa, za) + hi, za], color);
}
// bloque elevado (andenes, separadores, barreras)
function rail(B, x0, z0, x1, z1, lift, h, color, top = null) {
  flat(B, x0, z0, x1, z1, lift + h, top || color);
  const sc = shade(color, 0.8);
  curbFace(B, x0, z1, x1, z1, lift, lift + h, sc);
  curbFace(B, x1, z0, x0, z0, lift, lift + h, sc);
  curbFace(B, x1, z1, x1, z0, lift, lift + h, sc);
  curbFace(B, x0, z0, x0, z1, lift, lift + h, sc);
}

function lampPost(B, x, z, y0 = 0) {
  const y = H(x, z) + y0;
  B.box(x, y, z, 0.022, 0.42, 0.022, '#3a3a3a');
  B.box(x, y + 0.42, z, 0.09, 0.02, 0.03, '#3a3a3a');
  B.box(x, y + 0.405, z, 0.06, 0.015, 0.025, '#fff3c4', { pick: () => CELL.SIGN, fl: 1, cw: 0.06, lit: true });
}

const COL = {
  walk: '#cbc6ba', verge: '#7fae62', median: '#7aa65a', sep: '#d9d6ce', bar: '#c9c9c4', bike: '#4f9a6a',
  shoulder: '#45494f', bus: '#9c3b32', dirt: '#a08259', paver: '#d0c3a7',
};
const LIFT = { walk: 0.035, median: 0.04, sep: 0.05, bar: 0.08 };
const YEL = '#f2c94c', WHITE = '#f4f4f0';

export function buildRoadMesh(grid, net) {
  const B = new Builder(11);
  B.litP = 0;
  const roadAt = (x, y) => (x >= 0 && y >= 0 && x < N && y < N ? grid[y][x].road : null);
  const L = 0.03;
  const J = net ? planJunctions(net) : { list: [], covered: new Set(), trim: new Map() };
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const t = grid[y][x].road;
      if (!t) continue;
      if (J.covered.has(y * N + x)) continue; // lo dibuja el polígono del cruce
      const R = ROADS[t.k];
      const x0 = x - N / 2, x1 = x0 + 1, z0 = y - N / 2, z1 = z0 + 1;
      // las casillas en escalera de una diagonal no cuentan como vía vecina (la diagonal se dibuja aparte)
      const nb = DIRS.map(([dx, dy]) => { const r = roadAt(x + dx, y + dy); return r && r.ax === 3 ? null : r; });

      // ---- cruces: pavimento del tipo dominante y cebras en las bocas ----
      if (t.ax === 2) {
        if (t.k === 'peatonal') flat(B, x0, z0, x1, z1, L, COL.paver, CELL.BRICK);
        else if (t.k === 'tierra') flat(B, x0, z0, x1, z1, L - 0.01, COL.dirt);
        else {
          flat(B, x0, z0, x1, z1, L, R.color);
          nb.forEach((n, d) => {
            if (!n || n.k === 'peatonal' || n.k === 'tierra' || n.ax === 2) return;
            const [dx, dy] = DIRS[d];
            if (!(dx !== 0 ? n.ax === 0 : n.ax === 1)) return;
            for (let i = 0; i < 5; i++) {
              const s = 0.1 + i * 0.17;
              if (dx === 0) { const zz = dy < 0 ? z0 + 0.05 : z1 - 0.17; flat(B, x0 + s, zz, x0 + s + 0.09, zz + 0.12, L + 0.004, WHITE); }
              else { const xx = dx < 0 ? x0 + 0.05 : x1 - 0.17; flat(B, xx, z0 + s, xx + 0.12, z0 + s + 0.09, L + 0.004, WHITE); }
            }
          });
        }
        continue;
      }

      // ---- diagonales: la casilla de la escalera se rellena; la cinta se dibuja por segmento más abajo ----
      // diagonales: no se pinta la casilla de la escalera (se vería la cuadrícula); sólo la cinta continua
      if (t.ax === 3) continue;

      // ---- tramo: franja del perfil que cae en esta casilla ----
      const ax = t.ax;
      let li = t.li ?? 0;
      if (t.nl !== R.w) {
        // partidas antiguas (un segmento por carril): contar vecinos del mismo tipo hacia el lado negativo
        li = 0;
        for (let k = 1; k < R.w; k++) {
          const n = ax === 0 ? roadAt(x, y - k) : roadAt(x - k, y);
          if (n && n.k === t.k && n.ax === ax) li++; else break;
        }
      }
      const along = ax === 0 ? x : y;
      const base = li * MPT;
      // vecino lateral fuera del perfil (boca de una vía que llega de lado): ahí no hay andén ni zona verde
      const outNeg = li === 0 ? (ax === 0 ? nb[0] : nb[3]) : null;
      const outPos = li === R.w - 1 ? (ax === 0 ? nb[2] : nb[1]) : null;
      // rectángulo de la franja [ua, ub] (metros, dentro de la casilla)
      const lat = (ua, ub, lift, color, cell = null, raised = 0, top = null) => {
        const a = (ua - base) / MPT, b = (ub - base) / MPT;
        if (ax === 0) { if (raised) rail(B, x0, z0 + a, x1, z0 + b, lift, raised, color, top); else flat(B, x0, z0 + a, x1, z0 + b, lift, color, cell); }
        else if (raised) rail(B, x0 + a, z0, x0 + b, z1, lift, raised, color, top);
        else flat(B, x0 + a, z0, x0 + b, z1, lift, color, cell);
      };
      // punto a lo largo del eje (s en 0..1 de la casilla) y lateral u (metros)
      const pt = (s, u) => (ax === 0 ? [x0 + s, z0 + (u - base) / MPT] : [x0 + (u - base) / MPT, z0 + s]);
      const lineAlong = (u, w, color, dashed) => {
        if (u < base || u > base + MPT) return;
        const segs = dashed ? [[0.12, 0.38], [0.62, 0.88]] : [[0, 1]];
        for (const [s0, s1] of segs) {
          if (ax === 0) flat(B, x0 + s0, z0 + (u - base) / MPT - w / 2, x0 + s1, z0 + (u - base) / MPT + w / 2, L + 0.004, color);
          else flat(B, x0 + (u - base) / MPT - w / 2, z0 + s0, x0 + (u - base) / MPT + w / 2, z0 + s1, L + 0.004, color);
        }
      };

      // zona verde de relleno (sobra entre el perfil y las casillas reservadas)
      const first = R.strips[0].u0, last = R.strips[R.strips.length - 1].u1;
      const fill = (ua, ub, mouth) => {
        const a = Math.max(ua, base), b = Math.min(ub, base + MPT);
        if (b - a < 1e-3) return;
        if (mouth) lat(a, b, L, R.color);
        else lat(a, b, L - 0.005, COL.verge);
      };
      fill(0, first, !!outNeg);
      fill(last, R.w * MPT, !!outPos);

      const mouthAt = (s) => (s.u0 < MPT * 0.5 && outNeg) || (s.u1 > R.w * MPT - MPT * 0.5 && outPos);
      for (let i = 0; i < R.strips.length; i++) {
        const s = R.strips[i];
        const a = Math.max(s.u0, base), b = Math.min(s.u1, base + MPT);
        if (b - a < 1e-3) continue;
        const edge = (s.t === 'walk' || s.t === 'verge' || s.t === 'bike') && mouthAt(s);
        if (edge) { lat(a, b, L, R.color); continue; }
        switch (s.t) {
          case 'lane': case 'shoulder': lat(a, b, L, s.t === 'lane' ? R.color : COL.shoulder); break;
          case 'bus': lat(a, b, L, COL.bus); break;
          case 'dirt':
            lat(a, b, L - 0.01, (along * 7) % 5 > 2 ? '#a08259' : '#967652');
            for (const o of [0.3, 0.7]) lineAlong(s.u0 + s.w * o, 0.07, '#7d6342', false);
            break;
          case 'paver':
            for (let k = 0; k < 2; k++) {
              const ua = a + ((b - a) * k) / 2, ub = a + ((b - a) * (k + 1)) / 2;
              lat(ua, ub, L, (k + along) % 2 ? '#d6c9ad' : '#c4b597', CELL.BRICK);
            }
            break;
          case 'bike': lat(a, b, L + 0.002, COL.bike); break;
          case 'verge': lat(a, b, L - 0.005, COL.verge); break;
          default: lat(a, b, L, COL[s.t], null, LIFT[s.t], s.t === 'median' ? '#86b765' : null);
        }
      }

      // demarcación entre franjas contiguas
      for (let i = 0; i < R.strips.length - 1; i++) {
        const a = R.strips[i], b = R.strips[i + 1];
        const isRoad = (p) => p.t === 'lane' || p.t === 'bus';
        if (isRoad(a) && isRoad(b)) {
          if (a.t === 'bus' || b.t === 'bus') lineAlong(a.u1, 0.03, WHITE, false);
          else if (a.d === b.d) lineAlong(a.u1, 0.025, WHITE, true);
          else lineAlong(a.u1, R.lanes > 2 ? 0.05 : 0.03, YEL, R.lanes <= 2);
        }
        if (a.t === 'shoulder' && isRoad(b)) lineAlong(a.u1, 0.02, YEL, false);
        if (isRoad(a) && b.t === 'shoulder') lineAlong(a.u1, 0.02, YEL, false);
        if (a.t === 'bike') lineAlong(a.u1, 0.015, WHITE, false);
        if (b.t === 'bike') lineAlong(b.u0, 0.015, WHITE, false);
        if (a.t === 'bus' && b.t !== 'bus' && !isRoad(b)) lineAlong(a.u1, 0.03, WHITE, false);
        if (b.t === 'bus' && !isRoad(a)) lineAlong(b.u0, 0.03, WHITE, false);
      }

      // mobiliario: faroles en andenes, palmas y árboles en separadores y zonas verdes, bancas en peatonales
      for (const s of R.strips) {
        const mid = (s.u0 + s.u1) / 2;
        if (mid < base || mid >= base + MPT || mouthAt(s)) continue;
        if (s.t === 'walk' && along % 3 === 0) { const [px, pz] = pt(0.5, mid); lampPost(B, px, pz, L + 0.035); }
        if (s.t === 'median' && along % 2 === 0) {
          const [px, pz] = pt(0.5, mid);
          if (s.w >= 5) B.tree(px, pz, 0.34, '#3f8f3a', H(px, pz) + L + 0.04);
          else B.palm(px, pz, 0.75, false, H(px, pz) + L + 0.04);
        }
        if (s.t === 'walk' && s.w >= 3 && along % 3 === 1) { const [px, pz] = pt(0.5, mid); B.tree(px, pz, 0.26, '#4a9a40', H(px, pz) + L + 0.035); }
        if (s.t === 'paver' && along % 3 === 0) {
          const [px, pz] = pt(0.5, s.u0 + 1.8);
          const h = H(px, pz) + L;
          B.box(px, h, pz, 0.12, 0.08, 0.12, '#9a8f7c', { top: '#6aa84f' });
          B.bush(px, pz, 0.07, '#4d8f3f', h + 0.08);
          const [lx, lz] = pt(0.5, s.u1 - 1.2);
          lampPost(B, lx, lz, L);
        }
      }
      // árboles en el relleno verde ancho
      const gl = first - base, gr = base + MPT - last;
      if (along % 2 === 0) {
        if (li === 0 && first >= 2 && !outNeg) { const [px, pz] = pt(0.5, first / 2); B.tree(px, pz, 0.26, '#4a9a40', H(px, pz) + L); }
        if (li === R.w - 1 && R.w * MPT - last >= 2 && !outPos) { const [px, pz] = pt(0.5, (last + R.w * MPT) / 2); B.tree(px, pz, 0.26, '#4a9a40', H(px, pz) + L); }
      }
      void gl; void gr;
    }
  }
  for (const j of J.list) drawJunction(B, j);
  if (net) for (const seg of net.segs) if (seg.ax === 3) diagRibbon(B, seg, net, J.trim);
  return B.build();
}

// Cinta continua a 45° con el perfil de la vía. Se recorta media casilla en los extremos que son cruces
// para que el pavimento cuadrado del cruce no se superponga.
function diagRibbon(B, seg, net, junctions) {
  const R = ROADS[seg.k];
  const W = R.meters;
  const L = 0.03;
  // recorte en los extremos: hasta donde empieza el polígono del cruce (en unidades de s: √2 casillas)
  const jr = (s) => junctions.get(s + ',' + seg.dy * (s - seg.line) + ':' + seg.id);
  const trim0 = jr(seg.s0) !== undefined ? jr(seg.s0) / Math.SQRT2 : 0;
  const trim1 = jr(seg.s1) !== undefined ? jr(seg.s1) / Math.SQRT2 : 0;
  const sA = seg.s0 + trim0, sB = seg.s1 - trim1;
  if (sB - sA < 0.05) return;
  // dirección y normal en el plano (x, z) del mundo
  const dl = Math.SQRT1_2;
  const nx = -seg.dy * dl, nz = dl;
  const m = diagLines(R.w) - 1;
  const P = (s, u) => {
    // eje de la banda: a medio camino entre la primera y la última línea diagonal
    const cx = s - N / 2 + 0.5, cz = seg.dy * (s - seg.line) - N / 2 + 0.5; void m;
    const o = (u - W / 2) / MPT;
    return [cx + nx * o, cz + nz * o];
  };
  const step = 0.5;
  const quad = (s0, s1, ua, ub, lift, color, raised = 0, top = null) => {
    const [ax0, az0] = P(s0, ua), [bx0, bz0] = P(s1, ua), [bx1, bz1] = P(s1, ub), [ax1, az1] = P(s0, ub);
    const y = (x, z, k) => H(x, z) + lift + k;
    const r = raised;
    B.quad([ax0, y(ax0, az0, r), az0], [bx0, y(bx0, bz0, r), bz0], [bx1, y(bx1, bz1, r), bz1], [ax1, y(ax1, az1, r), az1], top || color);
    if (r) {
      const sc = shade(color, 0.8);
      B.quad([ax0, y(ax0, az0, 0), az0], [bx0, y(bx0, bz0, 0), bz0], [bx0, y(bx0, bz0, r), bz0], [ax0, y(ax0, az0, r), az0], sc);
      B.quad([bx1, y(bx1, bz1, 0), bz1], [ax1, y(ax1, az1, 0), az1], [ax1, y(ax1, az1, r), az1], [bx1, y(bx1, bz1, r), bz1], sc);
    }
  };
  for (let s = sA; s < sB - 1e-6; s += step) {
    const s1 = Math.min(sB, s + step);
    const idx = Math.round(s * 2);
    for (const st of R.strips.map((x) => ({ ...x, u0: x.u0 - (R.w * MPT - W) / 2, u1: x.u1 - (R.w * MPT - W) / 2 }))) {
      switch (st.t) {
        case 'lane': quad(s, s1, st.u0, st.u1, L + 0.004, R.color); break;
        case 'walk': quad(s, s1, st.u0, st.u1, L + 0.004, COL.walk, LIFT.walk); break;
        case 'dirt': quad(s, s1, st.u0, st.u1, L, idx % 4 < 2 ? '#a08259' : '#967652'); break;
        case 'paver': quad(s, s1, st.u0, st.u1, L + 0.004, idx % 2 ? '#d6c9ad' : '#c4b597'); break;
        case 'verge': quad(s, s1, st.u0, st.u1, L, COL.verge); break;
        default: quad(s, s1, st.u0, st.u1, L + 0.004, COL[st.t] || R.color, LIFT[st.t] || 0);
      }
    }
    // demarcación entre carriles (guiones de 1/4 de paso)
    const lanes = R.strips.map((x) => ({ ...x, u0: x.u0 - (R.w * MPT - W) / 2, u1: x.u1 - (R.w * MPT - W) / 2 }));
    for (let i = 0; i < lanes.length - 1; i++) {
      const a = lanes[i], b = lanes[i + 1];
      if (a.t !== 'lane' || b.t !== 'lane') continue;
      const col = a.d === b.d ? WHITE : YEL;
      const w = 0.25;
      if (idx % 2 === 0) quad(s + 0.05, s + 0.3, a.u1 - w, a.u1 + w, L + 0.008, col);
    }
    if (seg.k === 'tierra') for (const o of [0.3, 0.7]) quad(s, s1, W * o - 0.4, W * o + 0.4, L + 0.002, '#7d6342');
    // palmas o árboles en los separadores
    if (idx % 4 === 2 && s > sA + 0.8 && s < sB - 0.8) {
      for (const st of lanes) {
        if (st.t !== 'median') continue;
        const [px, pz] = P(s + 0.25, (st.u0 + st.u1) / 2);
        if (st.w >= 5) B.tree(px, pz, 0.34, '#3f8f3a', H(px, pz) + L + 0.04);
        else B.palm(px, pz, 0.75, false, H(px, pz) + L + 0.04);
      }
    }
    // faroles en los andenes cada dos pasos
    if (idx % 4 === 0) {
      for (const st of lanes) {
        if (st.t !== 'walk') continue;
        const [px, pz] = P(s + 0.25, (st.u0 + st.u1) / 2);
        lampPost(B, px, pz, L + 0.04);
      }
    }
  }
}

// ---------- cruces con diagonales ----------
// En cada nodo donde llega al menos una diagonal se dibuja un polígono de cruce: la envolvente convexa de los
// bordes de todos los brazos a una distancia r del nodo (andén y calzada por separado), con cebras en los
// brazos diagonales. Devuelve Map(nodo -> r) para recortar las cintas diagonales.
function hull(pts) {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.reverse()) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
const halfWidths = (k) => {
  const R = ROADS[k];
  const edge = (arr) => { let w = 0; for (const s of arr) { if (s.t === 'walk' || s.t === 'verge' || s.t === 'bar') w += s.w; else break; } return w; };
  const side = Math.max(edge(R.strips), edge([...R.strips].reverse()));
  return { full: R.meters / 2 / MPT, cw: (R.meters / 2 - side) / MPT };
};

// Planifica los cruces donde llega una diagonal. Cada brazo se corta a una distancia del nodo; las esquinas
// del andén y de la calzada salen de cruzar el borde de un brazo con el del brazo siguiente (como un cordón
// de esquina), en vez de rellenar con la envolvente. Las casillas de los brazos rectos dentro del cruce no
// se dibujan por casilla.
export function planJunctions(net) {
  const list = [], covered = new Set(), trim = new Map();
  for (const [key, node] of net.nodes) {
    const segs = node.segs.map((id) => net.byId.get(id)).filter(Boolean);
    // cruces (y esquinas en L) de cualquier tipo de vía: se dibujan como polígono con esquinas curvas
    if (segs.length < 2) continue;
    if (segs.length === 2 && !segs.some((s) => s.ax === 3) && segs[0].ax === segs[1].ax) continue; // tramo recto o cambio de tipo
    if (segs.every((s) => s.k === 'tierra' || s.k === 'peatonal')) continue;
    const arms = segs.map((seg) => {
      const atStart = seg.ax === 1 ? seg.s0 === node.y : seg.s0 === node.x;
      const sgn = atStart ? 1 : -1;
      const hw = halfWidths(seg.k);
      if (seg.ax === 3) {
        const m = diagLines(ROADS[seg.k].w) - 1;
        return { seg, d: [sgn * Math.SQRT1_2, sgn * seg.dy * Math.SQRT1_2], o: [node.x, node.y], hw, diag: true }; void m;
      }
      const mid = (seg.offs[0] + seg.offs[seg.offs.length - 1]) / 2;
      const o = seg.ax === 0 ? [node.x, node.y + mid] : [node.x + mid, node.y];
      return { seg, d: seg.ax === 0 ? [sgn, 0] : [0, sgn], o, hw, diag: false };
    });
    // cada brazo se corta en su esquina: donde su borde cruza el borde del brazo vecino (orden angular)
    arms.sort((p, q) => Math.atan2(p.d[1], p.d[0]) - Math.atan2(q.d[1], q.d[0]));
    const n = arms.length;
    for (const a of arms) a.raw = 0.5;
    // glorieta: el cruce se convierte en un anillo; cada brazo se corta donde su borde toca el andén del anillo
    let round = null;
    if (net.rounds && net.rounds.has(key) && n >= 3) {
      const c = [arms.reduce((s, a) => s + a.o[0], 0) / n, arms.reduce((s, a) => s + a.o[1], 0) / n];
      const maxhw = Math.max(...arms.map((a) => a.hw.full));
      const Rs = Math.max(1.7, maxhw + 0.95); // radio exterior del andén
      const Ro = Rs - 0.2; // borde exterior de la calzada del anillo
      const Ri = Math.max(0.35, Ro - 0.85); // isla central
      round = { c, Rs, Ro, Ri };
      for (const a of arms) {
        const proj = (c[0] - a.o[0]) * a.d[0] + (c[1] - a.o[1]) * a.d[1];
        const lat = (c[0] - a.o[0]) * -a.d[1] + (c[1] - a.o[1]) * a.d[0];
        const edge = (e, R) => proj + Math.sqrt(Math.max(0, R * R - (lat - e) * (lat - e)));
        // los dos bordes del brazo (andén) deben quedar fuera del círculo de radio Rs
        a.raw = Math.max(edge(a.hw.full, Rs), edge(-a.hw.full, Rs)) - 0.05;
        a.tin = Math.min(edge(a.hw.cw, Ro - 0.12), edge(-a.hw.cw, Ro - 0.12)) - 0.08; // inicio de la calzada del brazo
        a.lat = lat; a.proj = proj;
      }
    }
    for (let i = 0; i < (round ? 0 : n); i++) {
      const a = arms[i], b = arms[(i + 1) % n];
      const na = [-a.d[1], a.d[0]], nb = [-b.d[1], b.d[0]];
      const c = isect([a.o[0] + na[0] * a.hw.full, a.o[1] + na[1] * a.hw.full], a.d, [b.o[0] - nb[0] * b.hw.full, b.o[1] - nb[1] * b.hw.full], b.d);
      if (!c) continue;
      const ta = (c[0] - a.o[0]) * a.d[0] + (c[1] - a.o[1]) * a.d[1];
      const tb = (c[0] - b.o[0]) * b.d[0] + (c[1] - b.o[1]) * b.d[1];
      if (ta > 0 && tb > 0 && ta < 4 && tb < 4) { a.raw = Math.max(a.raw, ta); b.raw = Math.max(b.raw, tb); }
    }
    for (const a of arms) {
      if (a.diag) a.cut = a.raw + (round ? 0.05 : 0.45); // espacio para la curva de la esquina
      else {
        // las casillas rectas se dibujan enteras: el corte se lleva al borde de casilla siguiente
        const kmax = Math.max(0, Math.ceil(a.raw + (round ? 0.05 : 0.3) - 0.5 - 1e-6));
        a.cut = kmax + 0.5;
        for (let k = 0; k <= kmax; k++) for (const off of a.seg.offs) {
          const s0 = (a.seg.ax === 0 ? node.x : node.y) + k * a.d[a.seg.ax === 0 ? 0 : 1];
          const [x, y] = a.seg.ax === 0 ? [s0, a.seg.line + off] : [a.seg.line + off, s0];
          covered.add(y * N + x);
        }
      }
    }
    for (const a of arms) if (a.diag) trim.set(key + ':' + a.seg.id, a.cut);
    list.push({ node, arms, round });
  }
  return { list, covered, trim };
}

const isect = (p, d, q, e) => {
  const den = d[0] * e[1] - d[1] * e[0];
  if (Math.abs(den) < 1e-6) return null;
  const t = ((q[0] - p[0]) * e[1] - (q[1] - p[1]) * e[0]) / den;
  return [p[0] + d[0] * t, p[1] + d[1] * t];
};

// radio de las esquinas (en casillas): el del andén es menor que el de la calzada para que queden paralelos
const RADIUS = { full: 0.22, cw: 0.42 };

export function junctionPoly(arms, which) {
  const poly = [];
  for (let i = 0; i < arms.length; i++) {
    const a = arms[i], b = arms[(i + 1) % arms.length];
    const w = a.hw[which], wb = b.hw[which];
    const na = [-a.d[1], a.d[0]], nb = [-b.d[1], b.d[0]];
    const cut = (arm, nn, ww, sg) => [arm.o[0] + arm.d[0] * arm.cut + nn[0] * ww * sg, arm.o[1] + arm.d[1] * arm.cut + nn[1] * ww * sg];
    poly.push(cut(a, na, w, -1), cut(a, na, w, 1));
    // esquina entre el borde izquierdo de a y el derecho de b
    const pa = [a.o[0] + na[0] * w, a.o[1] + na[1] * w], pb = [b.o[0] - nb[0] * wb, b.o[1] - nb[1] * wb];
    const c = isect(pa, a.d, pb, b.d);
    const lim = Math.max(a.cut, b.cut);
    const cx = arms.reduce((s, x) => s + x.o[0], 0) / arms.length, cy = arms.reduce((s, x) => s + x.o[1], 0) / arms.length;
    if (c && Math.hypot(c[0] - cx, c[1] - cy) < lim * 1.05) {
      // la esquina sólo sirve si queda entre los dos cortes (si no, se unen los cortes directamente)
      const ta = (c[0] - a.o[0]) * a.d[0] + (c[1] - a.o[1]) * a.d[1];
      const tb = (c[0] - b.o[0]) * b.d[0] + (c[1] - b.o[1]) * b.d[1];
      if (ta < a.cut && tb < b.cut) {
        // esquina redondeada: curva entre el borde de a y el de b (radio por tipo de polígono)
        const R = Math.max(0, Math.min(RADIUS[which], a.cut - ta - 0.02, b.cut - tb - 0.02));
        if (R < 0.02) poly.push(c);
        else {
          const pA = [c[0] + a.d[0] * R, c[1] + a.d[1] * R], pB = [c[0] + b.d[0] * R, c[1] + b.d[1] * R];
          for (let k = 0; k <= 6; k++) {
            const t = k / 6, u = 1 - t;
            poly.push([u * u * pA[0] + 2 * u * t * c[0] + t * t * pB[0], u * u * pA[1] + 2 * u * t * c[1] + t * t * pB[1]]);
          }
        }
      }
    }
  }
  return poly;
}

// plano que mejor se ajusta al terreno bajo el cruce (mínimos cuadrados); las placas del cruce lo comparten
function fitPlane(pts) {
  // h = a + b·x + c·z
  let n = 0, sx = 0, sz = 0, sh = 0, sxx = 0, szz = 0, sxz = 0, sxh = 0, szh = 0;
  for (const [x, z] of pts) {
    const h = H(x, z);
    n++; sx += x; sz += z; sh += h; sxx += x * x; szz += z * z; sxz += x * z; sxh += x * h; szh += z * h;
  }
  // resolver el sistema normal 3x3 por Cramer
  const M = [[n, sx, sz], [sx, sxx, sxz], [sz, sxz, szz]], v = [sh, sxh, szh];
  const det = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const D = det(M);
  if (Math.abs(D) < 1e-9) return { a: sh / n, b: 0, c: 0 };
  const col = (k) => M.map((row, i) => row.map((val, j) => (j === k ? v[i] : val)));
  return { a: det(col(0)) / D, b: det(col(1)) / D, c: det(col(2)) / D };
}

function drawJunction(B, j) {
  if (j.round) return drawRound(B, j);
  const L = 0.03;
  const W = (p) => [p[0] - N / 2 + 0.5, p[1] - N / 2 + 0.5];
  const cx = j.arms.reduce((s, a) => s + a.o[0], 0) / j.arms.length, cy = j.arms.reduce((s, a) => s + a.o[1], 0) / j.arms.length;
  const outer = junctionPoly(j.arms, 'full');
  const po = outer.map(W);
  const pl = fitPlane([...po, W([cx, cy])]);
  const hp = (x, z, lift) => pl.a + pl.b * x + pl.c * z + lift; // altura sobre el plano del cruce
  const fan = (poly, lift, color) => {
    const [wx, wz] = W([cx, cy]);
    const ps = poly.map(W);
    for (let i = 0; i < ps.length; i++) {
      const a = ps[i], b = ps[(i + 1) % ps.length];
      B.tri([wx, hp(wx, wz, lift), wz], [b[0], hp(b[0], b[1], lift), b[1]], [a[0], hp(a[0], a[1], lift), a[1]], color);
    }
  };
  const k = j.arms.reduce((best, a) => (ROADS[a.seg.k].rank > ROADS[best.seg.k].rank ? a : best)).seg.k;
  fan(outer, L + 0.035, COL.walk);
  // bordillo alrededor del andén
  for (let i = 0; i < po.length; i++) {
    const a = po[i], b = po[(i + 1) % po.length];
    B.quad([a[0], hp(a[0], a[1], L), a[1]], [b[0], hp(b[0], b[1], L), b[1]], [b[0], hp(b[0], b[1], L + 0.035), b[1]], [a[0], hp(a[0], a[1], L + 0.035), a[1]], '#9d9a92');
  }
  fan(junctionPoly(j.arms, 'cw'), L + 0.04, ROADS[k].color);
  // cebras en cada brazo, justo antes del corte
  for (const a of j.arms) {
    if (a.seg.k === 'tierra' || a.seg.k === 'peatonal') continue;
    const n = [-a.d[1], a.d[0]];
    const cnt = Math.max(3, Math.round((a.hw.cw * 2) / 0.17));
    for (let i = 0; i < cnt; i++) {
      const t0 = -a.hw.cw + (i + 0.2) * ((2 * a.hw.cw) / cnt), t1 = t0 + 0.6 * ((2 * a.hw.cw) / cnt);
      const q = (u, v) => W([a.o[0] + a.d[0] * u + n[0] * v, a.o[1] + a.d[1] * u + n[1] * v]);
      const y = (p) => [p[0], hp(p[0], p[1], L + 0.047), p[1]];
      B.quad(y(q(a.raw + 0.22, t0)), y(q(a.raw + 0.22, t1)), y(q(a.raw + 0.38, t1)), y(q(a.raw + 0.38, t0)), WHITE);
    }
  }
}

// ---------- glorieta ----------
function drawRound(B, j) {
  const L = 0.03;
  const { c, Rs, Ro, Ri } = j.round;
  const W = (p) => [p[0] - N / 2 + 0.5, p[1] - N / 2 + 0.5];
  const [cx, cz] = W(c);
  // plano ajustado al terreno bajo el círculo (como en los cruces)
  const sample = [];
  for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; sample.push([cx + Math.cos(a) * Rs, cz + Math.sin(a) * Rs]); }
  const pl = fitPlane([...sample, [cx, cz]]);
  const hp = (x, z, lift) => pl.a + pl.b * x + pl.c * z + lift;
  const SEG = 36;
  const disc = (r, lift, color) => {
    for (let k = 0; k < SEG; k++) {
      const a0 = (k / SEG) * Math.PI * 2, a1 = ((k + 1) / SEG) * Math.PI * 2;
      const p0 = [cx + Math.cos(a0) * r, cz + Math.sin(a0) * r], p1 = [cx + Math.cos(a1) * r, cz + Math.sin(a1) * r];
      B.tri([cx, hp(cx, cz, lift), cz], [p1[0], hp(p1[0], p1[1], lift), p1[1]], [p0[0], hp(p0[0], p0[1], lift), p0[1]], color);
    }
  };
  const wall = (r, lo, hi, color) => {
    for (let k = 0; k < SEG; k++) {
      const a0 = (k / SEG) * Math.PI * 2, a1 = ((k + 1) / SEG) * Math.PI * 2;
      const p0 = [cx + Math.cos(a0) * r, cz + Math.sin(a0) * r], p1 = [cx + Math.cos(a1) * r, cz + Math.sin(a1) * r];
      B.quad([p0[0], hp(p0[0], p0[1], lo), p0[1]], [p1[0], hp(p1[0], p1[1], lo), p1[1]], [p1[0], hp(p1[0], p1[1], hi), p1[1]], [p0[0], hp(p0[0], p0[1], hi), p0[1]], color);
    }
  };
  const k = j.arms.reduce((best, a) => (ROADS[a.seg.k].rank > ROADS[best.seg.k].rank ? a : best)).seg.k;
  // andén exterior, calzada del anillo, bordillo de la isla, isla con césped
  disc(Rs, L + 0.035, COL.walk);
  // brazos: andén y calzada desde el anillo hasta el corte
  for (const a of j.arms) {
    const n = [-a.d[1], a.d[0]];
    const seg = (hw, lift, color) => {
      const t0 = Math.max(0, (a.tin ?? 0)), t1 = a.cut + 0.02;
      const P = (t, v) => W([a.o[0] + a.d[0] * t + n[0] * v, a.o[1] + a.d[1] * t + n[1] * v]);
      const A = P(t0, -hw), Bp = P(t0, hw), C = P(t1, hw), D = P(t1, -hw);
      const y = (p) => [p[0], hp(p[0], p[1], lift), p[1]];
      B.quad(y(A), y(Bp), y(C), y(D), color);
    };
    seg(a.hw.full, L + 0.035, COL.walk);
    seg(a.hw.cw, L + 0.04, ROADS[a.seg.k].color);
  }
  disc(Ro, L + 0.042, ROADS[k].color);
  // marcas del anillo: línea discontinua
  for (let q = 0; q < 24; q++) {
    if (q % 2) continue;
    const a0 = (q / 24) * Math.PI * 2, a1 = ((q + 1) / 24) * Math.PI * 2, rm = (Ro + Ri) / 2;
    const pts = [[rm - 0.015, a0], [rm + 0.015, a0], [rm + 0.015, a1], [rm - 0.015, a1]].map(([r, a]) => [cx + Math.cos(a) * r, cz + Math.sin(a) * r]);
    const y = (p) => [p[0], hp(p[0], p[1], L + 0.046), p[1]];
    B.quad(y(pts[0]), y(pts[1]), y(pts[2]), y(pts[3]), WHITE);
  }
  // isla central: bordillo, césped, árboles y palmas
  disc(Ri + 0.07, L + 0.05, COL.walk);
  wall(Ri + 0.07, L + 0.042, L + 0.05, '#9d9a92');
  disc(Ri, L + 0.056, '#6aa84f');
  const cnt = Math.max(3, Math.round(Ri * 6));
  for (let q = 0; q < cnt; q++) {
    const a = (q / cnt) * Math.PI * 2 + 0.4, rr = Ri * 0.55;
    const px = cx + Math.cos(a) * rr, pz = cz + Math.sin(a) * rr;
    B.palm(px, pz, 0.55, false, hp(px, pz, L + 0.056));
  }
  B.bush(cx, cz, 0.1, '#3f8f3a', hp(cx, cz, L + 0.056));
  // cebras en cada brazo, justo antes del anillo
  for (const a of j.arms) {
    if (a.seg.k === 'tierra' || a.seg.k === 'peatonal') continue;
    const n = [-a.d[1], a.d[0]];
    const cn = Math.max(3, Math.round((a.hw.cw * 2) / 0.17));
    for (let i = 0; i < cn; i++) {
      const t0 = -a.hw.cw + (i + 0.2) * ((2 * a.hw.cw) / cn), t1 = t0 + 0.6 * ((2 * a.hw.cw) / cn);
      const q = (u, v) => W([a.o[0] + a.d[0] * u + n[0] * v, a.o[1] + a.d[1] * u + n[1] * v]);
      const y = (p) => [p[0], hp(p[0], p[1], L + 0.048), p[1]];
      B.quad(y(q(a.raw + 0.07, t0)), y(q(a.raw + 0.07, t1)), y(q(a.raw + 0.23, t1)), y(q(a.raw + 0.23, t0)), WHITE);
    }
  }
}
