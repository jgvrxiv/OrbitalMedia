// Casas en lote de 1×2 casillas (12 × 24 m) de estratos 2 y 3: frente angosto sobre la calle, casa de 2-3 pisos,
// antejardín con reja (estrato 3), garaje y un patio trasero largo con árbol, ropa tendida o lavadero.
// Coordenadas locales: x de -0.5 a 0.5, z de -1 a 1; la fachada principal mira a +Z.
import { CELL, shade } from './geom.js';
import { PAL, lot, tank, laundry, balcony, car, pots, roofCover, dish, chimney, columns } from './kit.js';

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

// Estrato 4: casa de dos pisos con garaje doble de madera, antejardín cerrado por un muro bajo con teja, ventanas
// pequeñas y arcos, tejados de barro por tramos y un patio con palma.
function casa4(B, e, spec) {
  const r = B.r; const v = (spec && spec.v) || 0;
  const paint = r.pick(['#e8d58a', '#efe2b4', '#e9dcc0', '#f0e6cf']), clay = r.pick(PAL.clay), wood = '#4a3326';
  B.plane(0, 0.01, 0, 1, 2, '#a9a59a');
  B.plane(0, 0.013, 0.8, 0.96, 0.32, '#8fb87a'); // antejardín
  B.plane(-0.12, 0.016, 0.82, 0.62, 0.3, '#9a958a'); // entrada de vehículos
  B.plane(0, 0.013, -0.5, 0.98, 1.0, '#8fb87a'); // patio
  B.box(0, 0, -0.997, 1, 0.12, 0.012, '#cfc8b8');
  // planta baja: garaje a un lado y sala; segundo piso retrocedido
  const gw = 0.56;
  B.box(-0.2, 0, 0.5, gw + 0.2, F * 1.15, 0.5, paint, { fl: 1, cw: 0.2, pick: (f, c, Fn, CC, side) => (side === 'front' ? (c < 3 ? [CELL.GARAGE, wood] : CELL.WIN_BARS) : CELL.PLAIN) });
  B.box(0.32, 0, 0.2, 0.34, F * 2.1, 0.9, paint, { fl: 2, cw: 0.17, pick: (f, c, Fn, CC, side) => (side === 'front' ? (f === 0 ? CELL.WIN_BARS : CELL.WIN_ARCH) : r() < 0.5 ? CELL.WIN_SLIDE : CELL.PLAIN) });
  B.box(-0.12, F * 1.15, 0.0, 0.62, F * 1.05, 0.8, paint, { fl: 1, cw: 0.2, pick: (f, c, Fn, CC, side) => (side === 'front' ? (c === 1 ? CELL.WIN_ARCH : CELL.WIN_SLIDE) : r() < 0.4 ? CELL.WIN_SLIDE : CELL.PLAIN) });
  // tejados
  B.gable(-0.2, F * 1.15, 0.5, 0.78, 0.07, 0.62, clay, 'x', { gable: paint });
  B.gable(-0.12, F * 2.2, 0.0, 0.7, 0.13, 0.86, clay, v % 2 ? 'x' : 'z', { gable: paint });
  B.hip(0.32, F * 2.1, 0.2, 0.4, 0.12, 0.96, clay);
  chimney(B, -0.38, -0.2, F * 2.3, 0.04, false);
  // muro bajo con remate de teja y portón peatonal
  B.box(0.14, 0, 0.96, 0.7, 0.1, 0.04, paint); B.box(0.14, 0.1, 0.96, 0.72, 0.02, 0.06, clay);
  B.box(-0.45, 0, 0.96, 0.1, 0.1, 0.04, paint); B.box(-0.45, 0.1, 0.96, 0.12, 0.02, 0.06, clay);
  B.box(-0.3, 0, 0.965, 0.2, 0.08, 0.012, '#222');
  if (r() < 0.7) B.bush(0.1, 0.84, 0.06, '#3f8f3a');
  B.bush(-0.05, 0.88, 0.05, '#4d8f3f');
  B.palm(-0.3, -0.5, 0.8, false);
  B.tree(0.3, -0.7, 0.3, '#4f9a3c');
  B.box(0.0, 0.0, -0.1, 0.0, 0.0, 0.0, paint);
}

// Estrato 5: casa grande de ladrillo a la vista con volúmenes acristalados, frontones con vidrio, techos verdes
// o de barro, reja de forja entre pilares de ladrillo, jardín y carro en el antejardín.
function casa5(B, e, spec) {
  const r = B.r; const v = (spec && spec.v) || 0;
  const brick = r.pick(PAL.brick), brickD = shade(brick, 0.85), roof = r() < 0.5 ? '#5f8f6a' : r.pick(PAL.clay);
  B.plane(0, 0.01, 0, 1, 2, '#9a958a');
  B.plane(0, 0.013, 0.74, 0.96, 0.46, '#76ad62'); // antejardín
  B.plane(0, 0.016, 0.74, 0.5, 0.46, '#9a958a'); // entrada
  B.plane(0, 0.013, -0.5, 0.98, 1.0, '#76ad62');
  B.box(0, 0, -0.997, 1, 0.14, 0.012, '#a9a294');
  // volúmenes de ladrillo con frontones y grandes ventanales
  const glass = (f, c, Fn, CC, side) => (side === 'front' ? (f === 0 && c === 1 && CC === 3 ? CELL.DOOR_GLASS : CELL.FLOORGLASS) : side === 'back' ? CELL.WIN_BIG : CELL.PLAIN);
  B.box(-0.22, 0, 0.3, 0.48, F * 2.1, 0.9, brick, { fl: 2, cw: 0.16, pick: glass });
  B.box(0.26, 0, -0.05, 0.46, F * 2.4, 0.95, brick, { fl: 2, cw: 0.15, pick: glass });
  B.box(0.0, 0, -0.5, 0.9, F * 1.2, 0.8, brickD, { fl: 1, cw: 0.2, pick: (f, c, Fn, CC, side) => (side === 'back' ? CELL.WIN_BIG : CELL.PLAIN) });
  B.gable(-0.22, F * 2.1, 0.3, 0.5, 0.16, 0.92, roof, 'z', { gable: brick, cell: CELL.ROOFTILE });
  B.gable(0.26, F * 2.4, -0.05, 0.48, 0.18, 0.96, roof, 'x', { gable: brick, cell: CELL.ROOFTILE });
  B.box(0.26, F * 2.4 + 0.02, 0.43, 0.2, 0.1, 0.01, '#9fc3d6'); // frontón de vidrio
  chimney(B, -0.42, -0.1, F * 2.9, 0.05, false);
  B.box(-0.1, F * 1.1, 0.78, 0.4, 0.02, 0.1, '#8a8780'); // alero de la entrada
  // reja de forja entre pilares de ladrillo y portón de carros
  const zw = 0.97;
  for (const x of [-0.46, -0.1, 0.46]) B.box(x, 0, zw, 0.07, 0.15, 0.07, brick, { top: shade(brick, 0.7) });
  B.box(-0.28, 0.0, zw, 0.28, 0.02, 0.012, '#222'); B.box(0.18, 0.0, zw, 0.56, 0.02, 0.012, '#222');
  for (let i = 0; i <= 20; i++) { const x = -0.42 + i * 0.0225; if (x > -0.4) B.box(x, 0.02, zw, 0.006, 0.12, 0.006, '#1c1c1c'); }
  for (let i = 0; i <= 26; i++) { const x = -0.06 + i * 0.0205; if (x < 0.43) B.box(x, 0.02, zw, 0.006, 0.12, 0.006, '#1c1c1c'); }
  B.box(-0.28, 0.14, zw, 0.28, 0.008, 0.008, '#1c1c1c'); B.box(0.18, 0.14, zw, 0.56, 0.008, 0.008, '#1c1c1c');
  car(B, 0.0, 0.76, 1, r.pick(['#8a8d90', '#2b2b2b', '#e8e8e8']));
  B.tree(-0.38, 0.82, 0.3, '#4f9a3c'); B.bush(0.36, 0.85, 0.06, '#3f8f3a'); B.bush(-0.22, 0.86, 0.05, '#4d8f3f');
  B.tree(0.3, -0.75, 0.34, '#3f8f3a'); B.palm(-0.35, -0.65, 0.7, false);
  void v; void columns;
}

export const DEEP_TYPES = {
  casaFondo: { name: 'Casa con patio largo (1×2)', fn: casaFondo, pop: 1.5, size: 2 },
  casa4: { name: 'Casa de dos pisos con garaje', fn: casa4, pop: 1.7, size: 2 },
  casa5: { name: 'Casa de ladrillo y vidrio', fn: casa5, pop: 1.9, size: 2 },
};
export const DEEP_TABLE = { // [tipo, probabilidad] por densidad y estrato (baja densidad)
  1: { 2: [['casaFondo', 0.35]], 3: [['casaFondo', 0.4]], 4: [['casa4', 0.55]], 5: [['casa5', 0.6]] },
};
export function pickDeepType(d, e, rand) {
  for (const [t, p] of DEEP_TABLE[d]?.[e] || []) if (rand() < p) return t;
  return null;
}
void lot;
