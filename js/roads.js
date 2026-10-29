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

// dens: densidad máxima que permite en sus frentes (0 = sin acceso a lotes)
export const ROADS = {
  tierra: {
    name: 'Camino destapado', icon: '🟫', cost: 2500, upkeep: 1, dens: 1, car: true, bus: false, truck: true, speed: 0.6,
    lv: -0.05, rank: 0, maxSlope: 1.4, color: '#9b7d57', desc: 'Barato; sólo baja densidad y sin buses.',
    profile: [P('verge', 1.5), P('dirt', 9), P('verge', 1.5)],
  },
  peatonal: {
    name: 'Calle peatonal', icon: '🚶', cost: 9000, upkeep: 3, dens: 2, car: false, bus: false, truck: false, speed: 0,
    lv: 0.06, rank: 1, maxSlope: 1.6, color: '#cdbfa3', desc: 'Sin carros; sube el valor del suelo. Hasta densidad media.',
    profile: [P('paver', 12)],
  },
  calle: {
    name: 'Calle', icon: '🛣️', cost: 8000, upkeep: 3, dens: 2, car: true, bus: true, truck: true, speed: 1,
    lv: 0, rank: 2, maxSlope: 1.1, color: '#3d4147', desc: '2 carriles en doble sentido. Hasta densidad media.',
    profile: [P('walk', 2.5), P('lane', 3.5, -1), P('lane', 3.5, 1), P('walk', 2.5)],
  },
  calle1: {
    name: 'Calle de un sentido', icon: '➡️', cost: 8500, upkeep: 3, dens: 2, car: true, bus: true, truck: true, speed: 1.15,
    lv: 0, rank: 2.1, maxSlope: 1.1, color: '#3d4147', desc: '2 carriles en un solo sentido. Hasta densidad media.',
    profile: [P('walk', 2.5), P('lane', 3.5, 1), P('lane', 3.5, 1), P('walk', 2.5)],
  },
  calle3: {
    name: 'Calle de 3 carriles', icon: '🚗', cost: 10000, upkeep: 4, dens: 2, car: true, bus: true, truck: true, speed: 1.25,
    lv: -0.01, rank: 2.5, maxSlope: 1.0, color: '#3b3f45', desc: '3 carriles con andenes angostos. Hasta densidad media.',
    profile: [P('walk', 1.5), P('lane', 3, -1), P('lane', 3, 1), P('lane', 3, 1), P('walk', 1.5)],
  },
  avenida: {
    name: 'Avenida', icon: '🌴', cost: 15000, upkeep: 6, dens: 3, car: true, bus: true, truck: true, speed: 1.5,
    lv: 0.03, rank: 3, maxSlope: 0.9, color: '#383c42', desc: '4 carriles con separador y palmas. Permite alta densidad.',
    profile: [P('walk', 3), P('lane', 3.3, -1), P('lane', 3.3, -1), P('median', 4.8), P('lane', 3.3, 1), P('lane', 3.3, 1), P('walk', 3)],
  },
  avenida6: {
    name: 'Avenida de 6 carriles', icon: '🚙', cost: 17000, upkeep: 7, dens: 3, car: true, bus: true, truck: true, speed: 1.7,
    lv: 0, rank: 3.2, maxSlope: 0.85, color: '#383c42', desc: '6 carriles con separador angosto. Permite alta densidad.',
    profile: [P('walk', 2), P('lane', 3.2, -1), P('lane', 3.2, -1), P('lane', 3.2, -1), P('sep', 0.8), P('lane', 3.2, 1), P('lane', 3.2, 1), P('lane', 3.2, 1), P('walk', 2)],
  },
  bulevar: {
    name: 'Bulevar con ciclorruta', icon: '🚲', cost: 24000, upkeep: 9, dens: 3, car: true, bus: true, truck: true, speed: 1.4,
    lv: 0.07, rank: 3.5, maxSlope: 0.85, color: '#383c42', desc: 'Separador arborizado, ciclorrutas y andenes anchos. Sube el valor del suelo.',
    profile: [P('walk', 3), P('bike', 2), P('lane', 3.3, -1), P('lane', 3.3, -1), P('median', 6), P('lane', 3.3, 1), P('lane', 3.3, 1), P('bike', 2), P('walk', 3)],
  },
  troncal: {
    name: 'Troncal de buses', icon: '🚍', cost: 19000, upkeep: 8, dens: 3, car: true, bus: true, truck: true, speed: 1.5, busSpeed: 2.2,
    lv: 0.02, rank: 4, maxSlope: 0.8, color: '#3a3e44', desc: 'Carriles exclusivos centrales (tipo BRT). Buses más rápidos.',
    profile: [P('walk', 3), P('lane', 3.3, -1), P('lane', 3.3, -1), P('sep', 1), P('bus', 3.5, -1), P('median', 3), P('bus', 3.5, 1), P('sep', 1), P('lane', 3.3, 1), P('lane', 3.3, 1), P('walk', 3)],
  },
  autopista: {
    name: 'Autopista', icon: '🛤️', cost: 24000, upkeep: 10, dens: 0, car: true, bus: true, truck: true, speed: 2.4,
    lv: -0.08, rank: 5, maxSlope: 0.7, color: '#2f3237', desc: 'Rápida, sin acceso a lotes; el ruido baja el valor del suelo.',
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
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const t = grid[y][x].road;
      if (!t) continue;
      const R = ROADS[t.k];
      const x0 = x - N / 2, x1 = x0 + 1, z0 = y - N / 2, z1 = z0 + 1;
      const nb = DIRS.map(([dx, dy]) => roadAt(x + dx, y + dy));

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
      if (t.ax === 3) {
        if (t.k === 'tierra') flat(B, x0, z0, x1, z1, L - 0.012, COL.verge);
        else if (t.k === 'peatonal') flat(B, x0, z0, x1, z1, L - 0.002, COL.paver, CELL.BRICK);
        else flat(B, x0, z0, x1, z1, L - 0.012, COL.verge);
        continue;
      }

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
  if (net) for (const seg of net.segs) if (seg.ax === 3) diagRibbon(B, seg, net);
  return B.build();
}

// Cinta continua a 45° con el perfil de la vía. Se recorta media casilla en los extremos que son cruces
// para que el pavimento cuadrado del cruce no se superponga.
function diagRibbon(B, seg, net) {
  const R = ROADS[seg.k];
  const W = R.meters;
  const L = 0.03;
  const node = (s) => net.nodes.get(s + ',' + seg.dy * (s - seg.line));
  const trim0 = (node(seg.s0)?.segs.length || 0) > 1 ? 0.5 : 0;
  const trim1 = (node(seg.s1)?.segs.length || 0) > 1 ? 0.5 : 0;
  const sA = seg.s0 + trim0, sB = seg.s1 - trim1;
  if (sB - sA < 0.05) return;
  // dirección y normal en el plano (x, z) del mundo
  const dl = Math.SQRT1_2;
  const nx = -seg.dy * dl, nz = dl;
  const m = diagLines(R.w) - 1;
  const P = (s, u) => {
    // eje de la banda: a medio camino entre la primera y la última línea diagonal
    const cx = s + m / 4 - N / 2 + 0.5, cz = seg.dy * (s - seg.line - m / 4) - N / 2 + 0.5;
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
    if (idx % 4 === 2) {
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
