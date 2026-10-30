// Casas en lote de 1×2 casillas (12 × 24 m) de estratos 2 y 3: frente angosto sobre la calle, casa de 2-3 pisos,
// antejardín con reja (estrato 3), garaje y un patio trasero largo con árbol, ropa tendida o lavadero.
// Coordenadas locales: x de -0.5 a 0.5, z de -1 a 1; la fachada principal mira a +Z.
import { CELL, shade } from './geom.js';
import { PAL, lot, tank, laundry, balcony, car, pots, roofCover, dish } from './kit.js';

const F = 0.26;

function casaFondo(B, e, spec) {
  const r = B.r; const v = (spec && spec.v) || 0;
  const paletteSrc = PAL.wall[Math.min(Math.max(e, 2), 4)];
  const paint = r.pick(paletteSrc), trim = shade(paint, 0.78);
  const floors = e <= 2 ? [2, 3, 2, 3][v % 4] : [2, 2, 3, 2][v % 4];
  const w = e <= 2 ? 0.9 : 0.8, d = [0.62, 0.7, 0.58, 0.74][v % 4];
  const fp = e <= 2 ? 0.0 : 0.16; // antejardín
  const zf = 1 - fp - 0.04, zc = zf - d / 2;
  // piso continuo: acera de la casa, antejardín y patio trasero largo
  B.plane(0, 0.01, 0, 1, 2, e <= 2 ? '#a39e92' : '#a9a59a');
  if (fp > 0) B.plane(0, 0.013, 1 - fp / 2 - 0.02, 0.96, fp, '#7fae62');
  B.plane(0, 0.013, (zf - d - 1) / 2, 0.98, zf - d + 1, e <= 2 ? '#a89d82' : '#8fb87a');
  B.box(0, 0, -0.997, 1, 0.1, 0.012, '#cfc8b8'); // muro del fondo
  const H = floors * F;
  const doorCol = r.int(0, 3), C = 4;
  const garage = e >= 3 && v % 2 === 0 ? (doorCol === 0 ? C - 1 : 0) : -1;
  B.box(0, 0, zc, w, H, d, paint, {
    fl: floors, cw: w / C,
    pick: (f, c, Fn, CC, side) => {
      if (side === 'front') {
        if (f === 0) return c === doorCol ? [CELL.DOOR, r.pick(['#3a3a3a', '#5a3a22', '#2b4a6b'])] : c === garage ? [CELL.GARAGE, shade(paint, 0.8)] : (e <= 2 ? CELL.WIN_BARS : CELL.WIN_SHUT);
        return r() < 0.5 ? CELL.WIN_SLIDE : e <= 2 ? CELL.WIN_BARS : CELL.BALCONY;
      }
      if (side === 'back') return r() < 0.7 ? CELL.WIN_SLIDE : CELL.PLAIN;
      return r() < 0.15 ? CELL.WIN_SLIDE : CELL.PLAIN;
    },
  });
  roofCover(B, e, 0, H, zc, w - 0.01, d, { paint, ridge: v % 2 ? 'z' : 'x' });
  if (floors >= 2 && r() < 0.6) balcony(B, 0, F, zf, w * 0.4, 0.07, 'front', { rail: '#2a2a2a' });
  if (e <= 2) { if (r() < 0.5) B.box(0, F * 0.95, zf + 0.03, w, 0.02, 0.07, trim); } // volado de la losa
  if (fp > 0) {
    B.box(0, 0, 0.975, 0.96, 0.045, 0.012, '#e0dacd');
    for (let i = 0; i <= 24; i++) { const x = -0.48 + (0.96 * i) / 24; if (Math.abs(x - (doorCol - 1.5) * (w / C)) > 0.07) B.box(x, 0.045, 0.975, 0.007, 0.07, 0.007, '#222'); }
    B.box(0, 0.115, 0.975, 0.96, 0.008, 0.008, '#222');
  }
  pots(B, -0.3, zf + 0.06, 2);
  if (garage >= 0) car(B, -0.5 + (garage + 0.5) * (w / C) - (1 - w) / 2 * 0, zf + 0.12, 1);
  // patio trasero
  const pz = (zf - d - 1) / 2;
  if (e <= 2) {
    laundry(B, 0, 0.1, pz, 0.5, 'x');
    B.box(-0.3, 0, pz - 0.15, 0.1, 0.06, 0.07, '#bdbdb5');
    if (r() < 0.6) B.shed(0.25, 0.0, pz - 0.1, 0.4, 0.28, 0.05, 0.1, r.pick(PAL.sheet), 'z-');
    if (r() < 0.5) B.tree(0.38, pz + 0.18, 0.2, '#4f9a3c');
  } else {
    B.tree(-0.28, pz, 0.28, '#3f8f3a');
    B.tree(0.3, pz - 0.1, 0.24, '#4f9a3c');
    if (r() < 0.5) B.box(0, 0.012, pz + 0.12, 0.4, 0.012, 0.22, '#9fa8ad');
    B.bush(0.05, zf - d - 0.06, 0.05, '#4d8f3f');
  }
  if (r() < 0.4 && e <= 3) dish(B, w * 0.3, H, zc);
  void tank;
}

export const DEEP_TYPES = {
  casaFondo: { name: 'Casa con patio largo (1×2)', fn: casaFondo, pop: 1.5, size: 2 },
};
export const DEEP_TABLE = { // probabilidad de intentar 1×2 por densidad y estrato (sólo baja y media-baja)
  1: { 2: 0.35, 3: 0.4 },
};
export function pickDeepType(d, e, rand) {
  const p = DEEP_TABLE[d]?.[e];
  return p && rand() < p ? 'casaFondo' : null;
}
void lot;
