// Vivienda continua de estratos 1 a 3: la casilla (12 m) se divide en 2-4 frentes angostos (≈3-6 m) que comparten
// medianeras y ocupan todo el ancho del lote, de modo que las manzanas forman un frente continuo de calle sin
// "islas". Cada unidad tiene su propia altura, color, puerta o garaje, antejardín (según estrato) y patio trasero.
//   baja densidad  -> casas de 1-3 pisos (hileraPopular)
//   media densidad -> edificios de apartamentos de 3-5 pisos con locales abajo (hileraAlta)
// La variante (spec.v, 0-3) cambia el número de frentes, la profundidad y la altura (tamaños distintos).
import { CELL, shade } from './geom.js';
import { PAL, awning, sign, balcony, tank, rebar, laundry, acUnit, antenna, dish, parapet } from './kit.js';

const F = 0.26;

function widths(r, n, total, min) {
  let w = Array.from({ length: n }, () => r.range(0.75, 1.3));
  let s = w.reduce((a, b) => a + b, 0);
  w = w.map((x) => Math.max(min, (x / s) * total));
  s = w.reduce((a, b) => a + b, 0);
  return w.map((x) => (x / s) * total);
}

function reja(B, x0, x1, z, gateX, color = '#2a2a2a') {
  const w = x1 - x0;
  B.box((x0 + x1) / 2, 0, z, w, 0.04, 0.012, '#e0dacd');
  const n = Math.max(3, Math.round(w / 0.04));
  for (let i = 0; i <= n; i++) {
    const x = x0 + (w * i) / n;
    if (gateX !== null && Math.abs(x - gateX) < 0.05) continue;
    B.box(x, 0.04, z, 0.006, 0.07, 0.006, color);
  }
  B.box((x0 + x1) / 2, 0.11, z, w, 0.006, 0.008, color);
}

function row(B, e, spec, high) {
  const r = B.r;
  const v = (spec && spec.v) || 0;
  // cuántos frentes caben en 12 m según el estrato: 1 → 3 o 4 pequeños (muy distintos), 2 → hasta 3, 3 → máximo 2 (parejos)
  const N_UNITS = high
    ? { 1: [3, 4, 3, 4], 2: [2, 3, 2, 2], 3: [2, 2, 2, 2] }
    : { 1: [3, 4, 3, 4], 2: [3, 2, 3, 2], 3: [2, 2, 2, 2] };
  const n = N_UNITS[Math.min(3, e)][v % 4];
  const D = high ? [0.72, 0.8, 0.62, 0.88][v % 4] : [0.62, 0.74, 0.54, 0.82][v % 4];
  const FL = high ? 0.24 : F;
  const fp = high ? (e >= 3 ? 0.06 : 0) : e <= 1 ? 0 : e === 2 ? r.pick([0, 0.05, 0.08]) : r.pick([0.08, 0.1, 0.12]);
  const zf = 0.5 - fp, zb = zf - D, zc = (zf + zb) / 2;
  // suelo continuo: acera de la casa, antejardín y patio trasero
  B.plane(0, 0.01, 0, 1, 1, e <= 1 ? '#9a9488' : '#a9a59a');
  if (fp > 0.02) B.plane(0, 0.013, (zf + 0.5) / 2, 1, fp, e >= 3 ? '#7fae62' : '#bdb8ab');
  const ry = zb + 0.5;
  if (ry > 0.04) B.plane(0, 0.013, (zb - 0.5) / 2, 1, ry, e <= 1 ? '#a89d82' : e === 2 ? '#b3a68a' : '#8fb87a');
  B.box(0, 0, -0.497, 1, 0.09, 0.012, '#cfc8b8'); // muro del fondo del lote (continuo)

  const ws = e >= 3 ? Array.from({ length: n }, () => 0.992 / n) : widths(r, n, 0.992, high ? 0.32 : 0.22);
  // decisiones compartidas: en estrato 3 las unidades son casi iguales (mismos pisos, color, techo y toldos);
  // en estrato 2 se alternan dos colores; en estrato 1 cada unidad es distinta
  const paletteSrc = e <= 2 ? PAL.wall[2] : PAL.wall[3];
  const sh = {
    floors: high ? r.int(3, 5) : r.int(2, 3), paint: r.pick(paletteSrc), roof: r(), awn: r.pick(PAL.bright),
    two: [r.pick(paletteSrc), r.pick(paletteSrc)],
  };
  let x0 = -0.496;
  ws.forEach((w, i) => {
    const cx = x0 + w / 2;
    const floors = e >= 3 ? sh.floors
      : high ? r.int(3, e <= 1 ? 4 : 5) + (v % 4 === 1 ? 1 : 0)
        : e <= 1 ? r.int(1, 3 + (v >= 2 ? 1 : 0)) : Math.max(1, sh.floors + r.int(-1, 0));
    const raw = !high && e <= 1 && r() < 0.55 || (high && e <= 1 && r() < 0.5);
    const rawCol = r.pick(PAL.brick);
    const paint = e >= 3 ? sh.paint : e === 2 ? sh.two[i % 2] : r.pick(paletteSrc);
    const base = raw ? rawCol : paint;
    const shop = high ? e >= 2 || r() < 0.4 : e <= 2 && r() < 0.14 && w > 0.26;
    const garageAll = e >= 3 && !high && sh.roof < 0.5; // en estrato 3 ambas casas comparten el mismo esquema
    const cw = Math.min(0.2, Math.max(0.1, w / 2));
    const C = Math.max(1, Math.round((w - 0.004) / cw));
    const doorCol = e >= 3 ? (i % 2 ? C - 1 : 0) : r() < 0.5 ? 0 : C - 1; // estrato 3: casas pareadas en espejo
    const garageCol = !shop && e >= 3 && C >= 2 && (garageAll || r() < 0.45) ? C - 1 - doorCol : -1;
    const topRaw = !high && e <= 1 && floors >= 2 && r() < 0.4; // último piso a medio construir
    const darkDoor = r.pick(['#3a3a3a', '#5a3a22', '#2b4a6b']);
    const H = floors * FL;
    B.box(cx, 0, zc, w - 0.004, H, D, base, {
      fl: floors, cw,
      pick: (f, c, Fn, CC, side) => {
        if (side === 'front') {
          if (f === 0) {
            if (shop) return c === doorCol && CC > 1 ? [CELL.DOOR, darkDoor] : [high && e >= 3 ? CELL.SHOP : CELL.SHOP_GRILL, paint];
            if (c === garageCol) return [CELL.GARAGE, shade(base, 0.8)];
            if (c === doorCol) return [CELL.DOOR, darkDoor];
            return raw ? [CELL.WIN_BARS, paint] : e <= 2 ? [CELL.WIN_BARS, base] : [r() < 0.5 ? CELL.WIN_SHUT : CELL.WIN_SLIDE, base];
          }
          if (topRaw && f === Fn - 1) return [CELL.OBRA, rawCol];
          if (e <= 1) return raw ? [r() < 0.35 ? CELL.BRICK_WIN : CELL.WIN_BARS, r() < 0.5 ? paint : rawCol] : [r() < 0.6 ? CELL.WIN_BARS : CELL.WIN_HOLE, base];
          if (e === 2) return r() < 0.5 ? CELL.WIN_BARS : r() < 0.7 ? CELL.WIN_SLIDE : CELL.BALCONY;
          return r() < 0.4 ? CELL.WIN_SHUT : r() < 0.7 ? CELL.WIN_SLIDE : CELL.BALCONY;
        }
        if (side === 'back') return r() < 0.8 ? CELL.WIN_SLIDE : CELL.PLAIN;
        return raw ? CELL.BRICK : CELL.PLAIN; // medianeras
      },
    });
    // medianera vista: si esta unidad es más baja que la vecina el muro de la vecina ya se ve; si es más alta se ve el suyo
    // techo
    const roof = e >= 3 ? sh.roof : r();
    if (!high && e <= 1 && roof < 0.45) {
      B.shed(cx, H, zc, w - 0.004, D, 0.0, 0.07, r.pick(PAL.zinc), 'z-');
    } else if (!high && e >= 3 && roof < 0.45) {
      B.gable(cx, H, zc, w + 0.0, 0.14, D + 0.06, r.pick(PAL.clay), 'x', { gable: base });
    } else {
      B.box(cx, H, zc, w - 0.004, 0.025, D + 0.02, shade(base, 0.8));
      parapet(B, cx, H + 0.025, zc, w - 0.004, D, 0.045, shade(base, 0.92));
      if (raw || (e <= 2 && r() < 0.5)) rebar(B, cx, H + 0.025, zc - D * 0.2, w * 0.7, D * 0.4, 0.1);
      if (r() < 0.8) tank(B, cx + w * 0.15, H + 0.025, zc - D * 0.15, { s: high ? 1.2 : 1 });
      if (e <= 2 && r() < 0.35) laundry(B, cx, H + 0.14, zc, Math.min(w * 0.8, 0.3), 'x');
      if (r() < 0.2) antenna(B, cx - w * 0.2, H + 0.025, zc + D * 0.1, 0.15);
      else if (r() < 0.2) dish(B, cx - w * 0.2, H + 0.025, zc + D * 0.2);
    }
    // frente: balcones, aire acondicionado, toldos y avisos de locales
    if (floors >= 2 && e >= 2 && !raw) {
      for (let f = 1; f < floors; f++) if (r() < 0.35) balcony(B, cx, f * FL, zf, w * 0.6, 0.05, 'front', { rail: '#2a2a2a' });
    }
    if (e >= 3 && r() < 0.3 && floors >= 2) acUnit(B, cx + w * 0.2, FL * 1.5, zf);
    if (shop) {
      awning(B, cx, FL * 0.92, zf, w - 0.02, 0.07, [e >= 3 ? sh.awn : r.pick(PAL.bright), '#ffffff']);
      sign(B, cx, FL * 0.98 + 0.03, zf + 0.002, Math.max(0.12, w - 0.06), 0.05, e >= 3 ? sh.awn : r.pick(PAL.bright), { text: '#fff' });
    }
    // antejardín: reja con portón a la altura de la puerta
    if (fp > 0.03 && !shop) {
      const gx = x0 + ((doorCol + 0.5) * w) / C;
      reja(B, x0 + 0.004, x0 + w - 0.004, 0.495, gx);
      if (e >= 3 && r() < 0.6) B.bush(cx + (r() < 0.5 ? -1 : 1) * w * 0.3, zf + fp / 2, 0.035, r.pick(['#3f8f3a', '#e63946', '#ff8fab']));
    }
    // patio trasero de cada unidad
    if (ry > 0.1) {
      const pz = (zb - 0.5) / 2;
      if (e <= 2) {
        if (r() < 0.6) laundry(B, cx, 0.1, pz, Math.min(w * 0.8, 0.28), 'x');
        if (r() < 0.5) B.box(cx - w * 0.2, 0.0, pz - 0.05, 0.07, 0.05, 0.05, '#bdbdb5'); // lavadero
        if (r() < 0.3) B.shed(cx + w * 0.15, 0.0, pz, w * 0.4, 0.14, 0.05, 0.1, r.pick(PAL.zinc), 'z-');
      } else {
        B.tree(cx + (r() < 0.5 ? -1 : 1) * w * 0.15, pz, 0.2 + r() * 0.08, '#3f8f3a');
        if (r() < 0.4) B.bush(cx, zb - 0.05, 0.04, '#4d8f3f');
      }
    }
    x0 += w;
  });
}

export const ROW_TYPES = {
  hileraPopular: { name: 'Casas continuas', fn: (B, e, s) => row(B, e, s, false), pop: 1.6 },
  hileraAlta: { name: 'Edificios continuos con locales', fn: (B, e, s) => row(B, e, s, true), pop: 1.15 },
};

// pesos para las tablas por densidad y estrato (se suman en models_res.js)
export const ROW_TABLE = {
  1: { 1: [['hileraPopular', 3]], 2: [['hileraPopular', 3]], 3: [['hileraPopular', 1.2]] },
  2: { 1: [['hileraAlta', 3]], 2: [['hileraAlta', 2]], 3: [['hileraAlta', 0.8]] },
};
void antenna;
