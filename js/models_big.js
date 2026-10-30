// Lotes grandes de 2×2 casillas (24 × 24 m). Coordenadas locales de -1 a 1; la fachada principal mira a +Z.
// Aparecen donde el valor del suelo es alto (casas y conjuntos de estratos 4-6), en comercio de alta densidad
// (centros comerciales) e industria media/alta (fábricas). Cada modelo tiene variantes (spec.v, 0-3).
import { CELL, shade } from './geom.js';
import { PAL, pool, umbrella, pergola, car, truck, container, pallets, chimney, tank, hvac, sign, lamp, columns, fence, antenna, parapet } from './kit.js';

const FL = 0.26;
const palmRow = (B, xs, z, h = 0.7, wax = false) => xs.forEach((x) => B.palm(x, z, h, wax));

function ground(B, color, size = 1.99) { B.plane(0, 0.01, 0, size, size, color); }

function wall(B, kind, color, gate = 0.5) { fence(B, kind, { size: 0.97, gate, color }); }

// ---------------- RESIDENCIAL BAJA DENSIDAD ----------------

// Casa de lujo en lote grande: casa principal con alas, garaje, piscina, cancha o jardín y muro perimetral.
function mansionGrande(B, e, spec) {
  const r = B.r; const v = (spec && spec.v) || 0;
  ground(B, '#5e9f4f');
  const modern = v % 2 === 1;
  const white = r.pick(PAL.wall[6]), clay = r.pick(PAL.clay), wood = r.pick(PAL.wood), stone = r.pick(PAL.stone);
  // vía de acceso desde el portón
  B.plane(0, 0.014, 0.78, 0.26, 0.45, '#9a958a'); B.plane(0.18, 0.014, 0.28, 0.9, 0.22, '#9a958a');
  // casa principal
  B.box(-0.1, 0, -0.42, 1.2, FL * 2.1, 0.62, white, { fl: 2, cw: 0.3, pick: (f, c, F, C, side) => (side === 'front' ? (f === 0 && c === 2 ? CELL.DOOR_GLASS : CELL.FLOORGLASS) : side === 'back' ? CELL.WIN_BIG : CELL.PLAIN) });
  if (modern) {
    B.box(-0.1, FL * 2.1, -0.42, 1.26, 0.025, 0.68, shade(stone, 0.6));
    B.box(0.1, FL * 2.125, -0.5, 0.7, FL * 0.95, 0.5, white, { fl: 1, cw: 0.2, pick: () => CELL.FLOORGLASS });
    B.box(0.1, FL * 3.075, -0.5, 0.76, 0.025, 0.56, shade(stone, 0.6));
  } else {
    B.hip(-0.1, FL * 2.1, -0.42, 1.32, 0.3, 0.74, clay);
    B.box(0.6, 0, -0.1, 0.34, FL * 1.1, 0.5, white, { fl: 1, cw: 0.17, pick: (f, c, F, C, side) => (side === 'front' ? CELL.GARAGE : CELL.PLAIN) });
    B.hip(0.6, FL * 1.1, -0.1, 0.4, 0.15, 0.56, clay);
  }
  // ala de un piso con terraza y pérgola
  B.box(-0.78, 0, -0.02, 0.5, FL * 1.1, 0.5, white, { fl: 1, cw: 0.17, pick: (f, c, F, C, side) => (side === 'front' || side === 'right' ? CELL.FLOORGLASS : CELL.PLAIN) });
  B.box(-0.78, FL * 1.1, -0.02, 0.56, 0.025, 0.56, shade(stone, 0.6));
  pergola(B, -0.1, 0, 0.1, 0.5, 0.3, wood);
  B.plane(-0.1, 0.02, 0.1, 0.5, 0.3, '#c9b08a');
  // piscina con deck, sombrillas y palmas
  pool(B, -0.25, 0.55, 0.8, 0.34, { water: '#2fb0e6' });
  B.plane(-0.25, 0.034, 0.8, 1.0, 0.18, r.pick(PAL.wood));
  umbrella(B, 0.35, 0.62, '#f2f2f2'); umbrella(B, 0.5, 0.5, '#2a9d8f');
  if (v >= 2) { B.plane(0.55, 0.016, 0.62, 0.7, 0.5, '#3f8f6a'); B.plane(0.55, 0.018, 0.62, 0.66, 0.46, '#4aa07a'); B.plane(0.55, 0.019, 0.62, 0.012, 0.46, '#fff'); }
  else { B.tree(0.62, 0.6, 0.45); B.tree(0.75, 0.42, 0.38); }
  palmRow(B, [-0.85, -0.55, 0.9], 0.88, 0.8, true);
  B.tree(0.85, -0.8, 0.5); B.tree(-0.85, -0.82, 0.5); B.bush(-0.5, -0.1, 0.08); B.bush(0.1, 0.2, 0.07);
  car(B, 0.18, 0.28, 1, r.pick(['#111', '#f2f2f2', '#7a0e14'])); car(B, 0.38, 0.28, 1, '#2b2b2b');
  wall(B, modern ? 'muro' : 'seto', stone, 0.28);
  lamp(B, -0.1, 0.92, 0.25); lamp(B, 0.1, 0.92, 0.25);
}

// Hacienda colonial en U alrededor de un patio con fuente: alas blancas de teja, corredores con columnas.
function haciendaGrande(B, e, spec) {
  const r = B.r;
  ground(B, '#6aa650');
  const white = r.pick(['#fbfaf6', '#f6f0e2', '#f3ede0']), clay = r.pick(PAL.clay), wood = r.pick(PAL.wood);
  B.plane(0, 0.014, 0.0, 1.0, 0.95, '#c46a4a', CELL.BRICK); // patio
  const wing = (x, z, w, d) => {
    B.box(x, 0, z, w, FL * 1.15, d, white, { fl: 1, cw: 0.2, pick: (f, c, F, C, side) => (side === 'front' || side === 'back' ? (c % 2 ? [CELL.DOOR, wood] : CELL.WIN_ARCH) : c % 2 ? CELL.WIN_SHUT : CELL.PLAIN) });
    B.hip(x, FL * 1.15, z, w + 0.12, 0.2, d + 0.12, clay);
  };
  wing(0, -0.78, 1.7, 0.44);      // ala del fondo
  wing(-0.82, -0.05, 0.42, 1.2);  // ala izquierda
  wing(0.82, -0.05, 0.42, 1.2);   // ala derecha
  // corredores con columnas al patio
  columns(B, -0.55, 0.55, 0, -0.5, FL * 1.05, 7, '#fbfaf6', 0.014);
  B.shed(0, FL * 1.05, -0.58, 1.2, 0.2, 0.0, 0.05, clay, 'z-', CELL.ROOFTILE);
  // fuente central y jardineras
  B.cyl(0, 0.014, 0.0, 0.2, 0.08, '#9aa', 16); B.cyl(0, 0.09, 0.0, 0.17, 0.015, '#4bb3e6', 16); B.cyl(0, 0.014, 0, 0.04, 0.22, '#9aa', 8, 0.025);
  for (const [x, z] of [[-0.45, 0.3], [0.45, 0.3], [-0.45, -0.25], [0.45, -0.25]]) { B.box(x, 0.014, z, 0.2, 0.05, 0.2, '#9a8f7c', { top: '#6aa84f' }); B.bush(x, z, 0.08, r.pick(['#e63946', '#f7b801', '#ff8fab'])); }
  // portón de entrada en el frente y jardín
  B.box(0, 0, 0.93, 0.34, 0.2, 0.05, white, { pick: () => CELL.WIN_ARCH, fl: 1, cw: 0.17 });
  B.gable(0, 0.2, 0.93, 0.4, 0.1, 0.08, clay, 'x');
  wall(B, 'piedra', '#c9bfae', 0.4);
  palmRow(B, [-0.8, -0.5, 0.5, 0.8], 0.75, 0.9, true);
  B.tree(-0.85, 0.35, 0.5); B.tree(0.85, 0.35, 0.5); B.tree(-0.9, -0.9, 0.55); B.tree(0.9, -0.9, 0.55);
  car(B, -0.15, 0.78, 1, '#e8e8e8');
}

// ---------------- RESIDENCIAL MEDIA / ALTA DENSIDAD ----------------

// Conjunto cerrado: 3-4 bloques alrededor de una zona común con piscina, juegos y quiosco; portería y reja.
function conjuntoCerrado(B, e, spec) {
  const r = B.r; const v = (spec && spec.v) || 0;
  ground(B, e >= 4 ? '#7fb36a' : '#8fb67b');
  const brick = e <= 4 ? r.pick(PAL.brick) : null;
  const paint = r.pick(PAL.wall[Math.min(6, e)]);
  const floors = e <= 2 ? r.int(4, 5) : e === 3 ? r.int(5, 6) : e === 4 ? r.int(6, 8) : r.int(8, 12);
  const FT = e >= 5 ? 0.23 : 0.25;
  const glassy = e >= 6;
  const blocks = v % 2 ? [[-0.5, -0.55], [0.5, -0.55], [-0.55, 0.15]] : [[-0.5, -0.6], [0.5, -0.6], [-0.7, 0.05], [0.7, 0.05]];
  for (const [x, z] of blocks) {
    const w = 0.62, d = 0.42;
    const hgt = floors * FT;
    if (glassy) B.box(x, 0, z, w, hgt, d, r.pick(PAL.glass), { fl: floors, cw: 0.1, pick: () => CELL.CURTAIN });
    else B.box(x, 0, z, w, hgt, d, brick || paint, { fl: floors, cw: 0.155, pick: (f, c, F, C, side) => (side === 'front' || side === 'back' ? (e >= 4 && c % 2 ? CELL.BALCONY : CELL.WIN_SLIDE) : c % 2 ? CELL.WIN_SLIDE : brick ? CELL.BRICK : CELL.PLAIN) });
    B.box(x, hgt, z, w + 0.03, 0.03, d + 0.03, '#8f8b84');
    tank(B, x - 0.15, hgt + 0.03, z, { s: 1.2 }); tank(B, x + 0.12, hgt + 0.03, z, { s: 1.2 });
    B.box(x, hgt + 0.03, z + 0.1, 0.14, 0.1, 0.12, shade(brick || paint, 0.85));
  }
  // zona común: piscina (estratos 4+), cancha o juegos, quiosco y senderos
  const cz = 0.55;
  B.plane(0, 0.014, 0.25, 0.4, 1.1, '#d9d2c0');
  if (e >= 4) { pool(B, 0.0, 0.2, 0.55, 0.3); umbrella(B, 0.4, 0.28, '#f2f2f2'); }
  else { B.plane(0.0, 0.016, 0.2, 0.55, 0.4, '#d9a066'); B.box(-0.15, 0, 0.2, 0.012, 0.12, 0.012, '#e63946'); B.box(0.15, 0, 0.2, 0.012, 0.12, 0.012, '#e63946'); B.box(0, 0.12, 0.2, 0.3, 0.012, 0.012, '#e63946'); }
  B.cone(-0.7, 0.14, 0.55, 0.12, 0.08, '#a8442a', 8); B.cyl(-0.7, 0.014, 0.55, 0.012, 0.14, '#fbfaf6', 6);
  // parqueadero y portería
  B.plane(0.65, 0.014, 0.62, 0.55, 0.45, '#55585c');
  for (let i = 0; i < 4; i++) { B.plane(0.42 + i * 0.14, 0.016, 0.62, 0.006, 0.34, '#e8e8e8'); if (r() < 0.7) car(B, 0.49 + i * 0.14, 0.62, 0); }
  B.box(-0.12, 0, 0.9, 0.2, 0.14, 0.12, '#f4f1ea', { pick: () => CELL.WIN_BIG, fl: 1, cw: 0.1, top: shade(brick || paint, 0.8) });
  B.box(0.25, 0.1, 0.94, 0.4, 0.01, 0.01, '#d62828');
  wall(B, e >= 4 ? 'seto' : 'reja', '#cfc8b8', 0.34);
  for (const [x, z] of [[-0.9, 0.5], [0.9, -0.9], [-0.9, -0.9]]) B.tree(x, z, 0.3);
  palmRow(B, [-0.3, 0.3], 0.88, 0.5);
}

// Dos o tres torres sobre un podio comunal con piscina y jardín.
function torresPodio(B, e, spec) {
  const r = B.r; const v = (spec && spec.v) || 0;
  ground(B, '#8a8f93');
  const FT = 0.22;
  const n = v % 2 ? 3 : 2;
  const floors = r.int(16, 24);
  const tint = r.pick(PAL.glass), frame = r.pick(['#d9dde0', '#2e3a46']);
  B.box(0, 0, -0.1, 1.92, FT * 2, 1.7, '#3a4048', { fl: 2, cw: 0.24, pick: (f, c, F, C, side) => (f === 0 && side === 'front' && c === 4 ? CELL.DOOR_GLASS : CELL.FLOORGLASS) });
  B.box(0, FT * 2, -0.1, 1.94, 0.03, 1.72, '#d9d3c6', { roofCell: CELL.GREEN });
  const y0 = FT * 2 + 0.03;
  const xs = n === 3 ? [-0.62, 0, 0.62] : [-0.45, 0.45];
  xs.forEach((x, i) => {
    const w = 0.44, hgt = floors * FT + (i % 2) * 0.5;
    B.box(x, y0, -0.55, w, hgt, w, tint, { fl: floors + (i % 2 ? 2 : 0), cw: 0.075, pick: () => CELL.CURTAIN });
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B.box(x + (a * w) / 2, y0, -0.55 + (b * w) / 2, 0.025, hgt, 0.025, frame);
    B.box(x, y0 + hgt, -0.55, w - 0.08, 0.1, w - 0.08, '#33414d');
  });
  pool(B, 0, 0.35, 0.8, 0.28, { water: '#2fb0e6' });
  B.box(0, y0, 0.35, 1.1, 0.0, 0.5, '#e9ecef');
  for (const x of [-0.7, 0.7]) B.tree(x, 0.4, 0.25, '#3a8a35', y0);
  // acceso con marquesina
  B.box(0, FT * 1.1, 0.88, 0.5, 0.025, 0.2, '#2e3a46'); columns(B, -0.2, 0.2, 0, 0.94, FT * 1.1, 2, '#e8e8e8', 0.014);
  palmRow(B, [-0.85, -0.45, 0.45, 0.85], 0.96, 0.75, true);
}

// ---------------- COMERCIO E INDUSTRIA ----------------

// Centro comercial grande: volumen de tres pisos con paneles, atrio de vidrio abovedado, torre de cine y parqueadero.
function centroComercialGrande(B, e, spec) {
  const r = B.r;
  ground(B, '#c3beb2');
  const panel = r.pick(['#e9e6df', '#d9d4c8', '#cfd6dc']);
  const accent = r.pick(['#d62828', '#1d4e9a', '#2a9d8f', '#f4a261', '#8338ec']);
  B.box(-0.1, 0, -0.55, 1.65, FL * 3.2, 0.78, panel, { fl: 3, cw: 0.2, pick: (f, c, F, C, side) => (side === 'front' ? (f === 0 ? CELL.SHOP : CELL.PANEL) : CELL.PANEL) });
  B.box(-0.1, FL * 3.2, -0.55, 1.69, 0.03, 0.82, '#9e9a92');
  B.box(0.72, 0, -0.55, 0.5, FL * 5.5, 0.6, shade(accent, 0.9), { fl: 5, cw: 0.125, pick: (f, c) => (c % 2 ? CELL.PANEL : CELL.CURTAIN_SPAN) });
  B.box(-0.1, 0, -0.1, 0.6, FL * 2.6, 0.12, '#9fc6dc', { fl: 2, cw: 0.1, pick: () => CELL.CURTAIN });
  B.vault(-0.1, FL * 2.6, -0.1, 0.6, 0.14, 0.14, '#bfe0f0', 'z', CELL.GLASS_ROOF, 8);
  sign(B, -0.1, FL * 3.1, -0.14 + 0.002, 0.8, 0.12, accent, { text: '#fff' });
  sign(B, 0.72, FL * 4.6, -0.24 + 0.002, 0.4, 0.14, '#ffffff', { text: accent });
  for (const x of [-0.7, -0.3, 0.1, 0.5]) hvac(B, x, FL * 3.23, -0.7);
  // parqueadero
  B.plane(0, 0.014, 0.55, 1.9, 0.78, '#55585c');
  for (let rw = 0; rw < 2; rw++) for (let i = 0; i < 12; i++) {
    B.plane(-0.88 + i * 0.16, 0.016, 0.38 + rw * 0.35, 0.006, 0.26, '#e8e8e8');
    if (r() < 0.6) car(B, -0.8 + i * 0.16, 0.38 + rw * 0.35, 0);
  }
  for (const x of [-0.8, -0.2, 0.4, 0.9]) { lamp(B, x, 0.55, 0.3); B.tree(x, 0.93, 0.25); }
  B.box(0.0, 0, 0.1, 0.9, 0.012, 0.25, '#d6d0c4');
}

// Fábrica grande: nave con diente de sierra, silos, chimeneas, tanques, patio de camiones y cerramiento.
function fabricaGrande(B, e, spec) {
  const r = B.r;
  ground(B, '#8a867e');
  const wall = r.pick(['#d6d9db', '#c8c2b4', '#bfc8cf']);
  B.box(-0.3, 0, -0.5, 1.2, 0.5, 0.8, wall, { fl: 2, cw: 0.24, pick: (f, c, F, C, side) => (f === 0 && side === 'front' ? (c % 2 ? CELL.ROLLER : CELL.PANEL) : f === 1 ? CELL.CLERESTORY : CELL.PANEL) });
  // diente de sierra
  const n = 5, step = 1.2 / n;
  for (let i = 0; i < n; i++) {
    const x0 = -0.9 + i * step, x1 = x0 + step, yt = 0.5 + step * 0.5;
    B.cellQuad([x1, 0.5, -0.1], [x1, 0.5, -0.9], [x0, yt, -0.9], [x0, yt, -0.1], '#aab3b9', CELL.CORRUG, null, false);
    B.cellQuad([x0, 0.5, -0.9], [x0, 0.5, -0.1], [x0, yt, -0.1], [x0, yt, -0.9], '#cfd8dc', CELL.CLERESTORY, null, false);
  }
  B.box(0.65, 0, -0.55, 0.5, 0.36, 0.55, wall, { fl: 2, cw: 0.25, pick: (f) => (f === 1 ? CELL.CLERESTORY : CELL.PANEL) });
  chimney(B, 0.82, -0.82, 1.7, 0.06, true); chimney(B, 0.62, -0.84, 1.35, 0.05, true);
  for (let i = 0; i < 3; i++) { B.cyl(-0.8 + i * 0.25, 0, -0.97 + 0.0, 0.1, 0.8, '#dfe3e6', 14, null, CELL.CORRUG); B.cone(-0.8 + i * 0.25, 0.8, -0.97, 0.105, 0.1, '#c9ced2', 14); }
  B.hcyl(0.1, 0.3, 0.0, 0.016, 0.9, '#c49a3a', 'x', 8);
  // patio de camiones, contenedores y bodega de almacenamiento
  B.plane(0, 0.014, 0.5, 1.9, 0.9, '#7f7b73');
  truck(B, -0.5, 0.35, 'x', '#e8e8e8'); truck(B, 0.0, 0.55, 'x', r.pick(['#1d4e9a', '#d62828'])); truck(B, 0.5, 0.35, 'x', '#e8e8e8');
  for (let i = 0; i < 6; i++) container(B, -0.8 + (i % 3) * 0.28, (i > 2 ? 0.09 : 0), 0.8, 'x');
  pallets(B, 0.7, 0.8, 5);
  fence(B, 'reja', { size: 0.97, gate: 0.4, color: '#bdb9ae' });
  sign(B, 0.2, 0.34, -0.1 + 0.002, 0.5, 0.1, '#d62828', { text: '#fff' });
  antenna(B, -0.6, 0.5, -0.3, 0.3);
}

export const BIG_RES = {
  mansionGrande: { name: 'Mansión en lote grande', fn: mansionGrande, pop: 3.2, size: 2, lot: [2, 3] },
  haciendaGrande: { name: 'Hacienda colonial', fn: haciendaGrande, pop: 3, size: 2 },
  conjuntoCerrado: { name: 'Conjunto cerrado', fn: conjuntoCerrado, pop: 4.5, size: 2 },
  torresPodio: { name: 'Torres sobre podio', fn: torresPodio, pop: 5, size: 2 },
};
export const BIG_COM = {
  centroComercialGrande: { name: 'Centro comercial grande', fn: centroComercialGrande, jobs: 4.2, size: 2 },
};
export const BIG_IND = {
  fabricaGrande: { name: 'Fábrica grande', fn: fabricaGrande, jobs: 4, poll: 1.5, size: 2 },
};

// probabilidad de intentar un lote grande y tipo a elegir: BIG[tipo de zona][densidad][estrato] = [prob, [[tipo, peso]]]
export const BIG_TABLE = {
  r: {
    1: { 6: [0.6, [['mansionGrande', 1]]] }, // mansiones sólo en estrato 6; la hacienda colonial queda reservada como edificio especial
    2: { 2: [0.3, [['conjuntoCerrado', 1]]], 3: [0.35, [['conjuntoCerrado', 1]]], 4: [0.4, [['conjuntoCerrado', 1]]], 5: [0.45, [['conjuntoCerrado', 1]]], 6: [0.5, [['conjuntoCerrado', 1]]] },
    3: { 5: [0.35, [['torresPodio', 1]]], 6: [0.5, [['torresPodio', 1]]] },
  },
  c: { 3: { 1: [0.4, [['centroComercialGrande', 1]]], 2: [0.5, [['centroComercialGrande', 1]]], 3: [0.55, [['centroComercialGrande', 1]]], 4: [0.55, [['centroComercialGrande', 1]]], 5: [0.55, [['centroComercialGrande', 1]]], 6: [0.55, [['centroComercialGrande', 1]]] } },
  i: {}, // la industria ahora usa lotes de 2×3 con modelos estirados
};

// Devuelve el tipo de lote grande a intentar (o null) para una zona k ('r', 'c', 'i'), densidad d y estrato e.
export function pickBigType(k, d, e, rand) {
  const ent = BIG_TABLE[k]?.[d]?.[e];
  if (!ent || rand() > ent[0]) return null;
  const list = ent[1];
  let t = rand() * list.reduce((s, a) => s + a[1], 0);
  for (const [v, w] of list) { t -= w; if (t <= 0) return v; }
  return list[0][0];
}
void parapet;
