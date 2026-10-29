// Modelos industriales por densidad: talleres, floricultura y ladrilleras; bodegas, textiles y
// agroindustria; plantas, tanques y centros logísticos.
import { CELL, shade } from './geom.js';
import { REF_IND, REF_IND_TABLE } from './models_ref.js';
import { PAL, tank, chimney, container, pallets, truck, hvac, sign, lamp, pickW } from './kit.js';

function yard(B, c = '#9a968e') {
  B.plane(0, 0.01, 0, 0.99, 0.99, c);
  for (let i = 0; i < 4; i++) B.plane(B.r.range(-0.4, 0.4), 0.012, B.r.range(-0.4, 0.4), B.r.range(0.08, 0.2), B.r.range(0.08, 0.2), shade(c, B.r.range(0.85, 0.95)));
}

// malla eslabonada (postes + panel translúcido gris)
function chainFence(B, s = 0.47, gate = 0.3) {
  const seg = (x0, z0, x1, z1) => {
    const w = Math.abs(x1 - x0) || 0.006, d = Math.abs(z1 - z0) || 0.006;
    B.box((x0 + x1) / 2, 0, (z0 + z1) / 2, w, 0.12, d, '#b9bec2', { pick: () => CELL.VENT, fl: 1, cw: Math.max(w, d) });
    const n = Math.max(2, Math.round(Math.max(w, d) / 0.12));
    for (let i = 0; i <= n; i++) B.box(x0 + ((x1 - x0) * i) / n, 0, z0 + ((z1 - z0) * i) / n, 0.01, 0.13, 0.01, '#666');
  };
  seg(-s, s, -gate / 2, s); seg(gate / 2, s, s, s);
  seg(-s, -s, s, -s); seg(-s, -s, -s, s); seg(s, -s, s, s);
}

// diente de sierra (sheds industriales)
function sawtooth(B, x, y, z, w, d, n, color) {
  const step = w / n;
  for (let i = 0; i < n; i++) {
    const x0 = x - w / 2 + i * step;
    const x1 = x0 + step;
    const z0 = z - d / 2, z1 = z + d / 2, yt = y + step * 0.55;
    B.cellQuad([x1, y, z1], [x1, y, z0], [x0, yt, z0], [x0, yt, z1], color, CELL.CORRUG, null, false);
    B.cellQuad([x0, y, z0], [x0, y, z1], [x0, yt, z1], [x0, yt, z0], '#cfd8dc', CELL.CLERESTORY, null, false);
    B.tri([x0, y, z1], [x1, y, z1], [x0, yt, z1], shade(color, 0.85));
    B.tri([x1, y, z0], [x0, y, z0], [x0, yt, z0], shade(color, 0.85));
  }
}

// ---------- BAJA ----------
function taller(B) {
  const r = B.r;
  yard(B);
  const wall = r.pick(['#d8d2c4', '#c9c2b0', '#b9c2c9', '#e0d7c3']);
  B.box(0, 0, -0.12, 0.78, 0.36, 0.56, wall, { fl: 1, cw: 0.26, pick: (f, c, Fn, C, side) => (side === 'front' ? (c === 1 ? CELL.ROLLER : CELL.CLERESTORY) : CELL.CORRUG) });
  B.gable(0, 0.36, -0.12, 0.82, 0.1, 0.6, r.pick(PAL.zinc), 'x', { cell: CELL.CORRUG, gable: wall });
  sign(B, 0, 0.27, 0.16 + 0.002, 0.3, 0.06, r.pick(PAL.bright), { text: '#fff' });
  pallets(B, 0.28, 0.3, 4);
  truck(B, -0.18, 0.32, 'x', r.pick(['#e8e8e8', '#1d6fd1', '#d62828']));
  chainFence(B);
}

function invernadero(B) {
  const r = B.r;
  B.plane(0, 0.01, 0, 0.99, 0.99, '#8a7a5a');
  for (let i = 0; i < 3; i++) {
    const x = -0.3 + i * 0.3;
    B.box(x, 0, -0.04, 0.28, 0.1, 0.8, '#e8f0ee', { fl: 1, cw: 0.2, pick: () => CELL.GLASS_ROOF });
    B.vault(x, 0.1, -0.04, 0.28, 0.8, 0.1, '#eef6f4', 'z', CELL.GLASS_ROOF, 8);
    for (let k = 0; k < 5; k++) B.plane(x, 0.012, -0.36 + k * 0.16, 0.2, 0.1, r.pick(['#e63946', '#f7b801', '#ff8fab', '#ffffff', '#c77dff']));
  }
  B.box(0.32, 0, 0.42, 0.2, 0.14, 0.1, '#f2f2f2', { fl: 1, cw: 0.1, pick: (f, c, Fn, C, side) => (side === 'front' ? CELL.WIN_SLIDE : CELL.PLAIN) });
  truck(B, -0.2, 0.42, 'x', '#ffffff');
}

function ladrillera(B) {
  const r = B.r;
  B.plane(0, 0.01, 0, 0.99, 0.99, '#a9785a');
  // horno en bóveda
  B.vault(-0.12, 0, -0.18, 0.5, 0.42, 0.22, '#b4553a', 'x', CELL.BRICK, 10);
  chimney(B, 0.25, -0.3, 0.9, 0.05, false);
  chimney(B, -0.4, -0.38, 0.6, 0.035, false);
  // pilas de ladrillos
  for (let i = 0; i < 6; i++) {
    const x = -0.36 + (i % 3) * 0.16, z = 0.16 + Math.floor(i / 3) * 0.16;
    B.box(x, 0, z, 0.12, r.range(0.06, 0.12), 0.1, r.pick(PAL.brick), { pick: () => CELL.BRICK, fl: 1, cw: 0.12 });
  }
  B.box(0.3, 0, 0.25, 0.26, 0.16, 0.3, '#c9c2b0', { fl: 1, cw: 0.13, pick: () => CELL.CORRUG });
  B.shed(0.3, 0.16, 0.25, 0.3, 0.34, 0, 0.05, r.pick(PAL.zinc));
}

// ---------- MEDIA ----------
function bodega(B) {
  const r = B.r;
  yard(B, '#8e8a82');
  const wall = r.pick(['#e2ddd2', '#cfd6dc', '#d8cfbd']);
  const band = r.pick(['#1d4e9a', '#d62828', '#2a9d8f', '#f4a261']);
  B.box(0, 0, -0.14, 0.92, 0.46, 0.6, wall, {
    fl: 2, cw: 0.184,
    pick: (f, c, Fn, C, side) => (side === 'front' ? (f === 0 ? (c % 2 ? CELL.ROLLER : CELL.PANEL) : [CELL.BAND, band]) : f === 1 ? CELL.CLERESTORY : CELL.PANEL),
  });
  B.box(0, 0.46, -0.14, 0.94, 0.03, 0.62, '#b9bec2', { roofCell: CELL.CORRUG });
  B.box(0, 0.0, 0.2, 0.92, 0.06, 0.08, '#8a8a8a');
  truck(B, -0.27, 0.36, 'z', r.pick(['#e8e8e8', band]));
  truck(B, 0.1, 0.36, 'z', '#e8e8e8');
  for (const x of [-0.3, 0, 0.3]) hvac(B, x, 0.49, -0.2);
  sign(B, 0.32, 0.36, 0.16 + 0.002, 0.24, 0.07, band, { text: '#fff' });
}

function textil(B) {
  const r = B.r;
  yard(B, '#9a968e');
  const wall = r.pick(['#c0643f', '#b4553a', '#d8d2c4']);
  B.box(0, 0, -0.08, 0.9, 0.3, 0.7, wall, { fl: 1, cw: 0.15, pick: (f, c, Fn, C, side) => (side === 'front' && c === 2 ? CELL.ROLLER : wall === '#d8d2c4' ? CELL.CLERESTORY : CELL.BRICK_WIN) });
  sawtooth(B, 0, 0.3, -0.08, 0.9, 0.7, 5, '#c7ccd0');
  B.box(-0.28, 0, 0.36, 0.34, 0.26, 0.2, '#efe9dc', { fl: 2, cw: 0.11, pick: (f, c, Fn, C, side) => (side === 'front' && f === 0 && c === 1 ? CELL.DOOR_GLASS : CELL.WIN_SLIDE) });
  chimney(B, 0.36, 0.34, 0.95, 0.045, true);
  pallets(B, 0.1, 0.35, 3);
}

function agroindustria(B) {
  const r = B.r;
  yard(B, '#a29a86');
  for (let i = 0; i < 3; i++) {
    const x = -0.32 + i * 0.2;
    B.cyl(x, 0, -0.28, 0.09, 0.75, '#dfe3e6', 14, null, CELL.CORRUG);
    B.cone(x, 0.75, -0.28, 0.095, 0.1, '#c9ced2', 14);
  }
  B.box(0.3, 0, -0.18, 0.32, 0.38, 0.5, '#e7d8b0', { fl: 2, cw: 0.16, pick: () => CELL.CORRUG });
  B.gable(0.3, 0.38, -0.18, 0.36, 0.1, 0.54, '#2a9d4a', 'z', { cell: CELL.CORRUG, gable: '#e7d8b0' });
  // banda transportadora
  B.rbox(-0.05, 0.5, -0.28, 0.4, 0.03, 0.04, '#666', 0);
  B.box(0.06, 0, -0.28, 0.02, 0.5, 0.02, '#555');
  truck(B, 0.0, 0.3, 'x', '#2a9d4a');
  pallets(B, 0.3, 0.32, 4);
  chainFence(B);
}

// ---------- ALTA ----------
function planta(B) {
  const r = B.r;
  yard(B, '#8a867e');
  const wall = r.pick(['#d6d9db', '#c8c2b4', '#bfc8cf']);
  B.box(-0.12, 0, -0.2, 0.7, 0.62, 0.52, wall, { fl: 3, cw: 0.175, pick: (f, c, Fn, C, side) => (f === 0 && side === 'front' ? CELL.ROLLER : f === 2 ? CELL.CLERESTORY : CELL.PANEL) });
  sawtooth(B, -0.12, 0.62, -0.2, 0.7, 0.52, 4, '#aab3b9');
  B.box(0.3, 0, 0.2, 0.32, 0.36, 0.44, wall, { fl: 2, cw: 0.16, pick: (f, c, Fn, C, side) => (f === 1 ? CELL.CLERESTORY : CELL.PANEL) });
  chimney(B, 0.32, -0.32, 1.6, 0.06, true);
  chimney(B, 0.42, -0.12, 1.3, 0.05, true);
  for (const x of [-0.36, -0.2]) { B.cyl(x, 0, 0.3, 0.07, 0.3, '#e8e8e8', 14); B.cyl(x, 0.3, 0.3, 0.071, 0.02, '#c0c0c0', 14); }
  // tuberías
  B.hcyl(0.05, 0.4, 0.06, 0.018, 0.7, '#c49a3a', 'x', 8);
  B.hcyl(0.05, 0.34, 0.06, 0.014, 0.7, '#7a8a96', 'x', 8);
  for (const x of [-0.25, 0.05, 0.35]) B.box(x, 0, 0.06, 0.02, 0.42, 0.02, '#555');
  truck(B, -0.1, 0.42, 'x', '#e8e8e8');
}

function tanques(B) {
  const r = B.r;
  yard(B, '#8f8b80');
  const tank1 = r.pick(['#f2f2f2', '#e6e2d8']);
  for (const [x, z, rr, h] of [[-0.26, -0.24, 0.17, 0.34], [0.14, -0.26, 0.15, 0.3], [-0.26, 0.2, 0.13, 0.26]]) {
    B.cyl(x, 0, z, rr, h, tank1, 18);
    B.cyl(x, h, z, rr, 0.03, '#cfcfcf', 18, rr * 0.7);
    B.cyl(x, 0, z, rr + 0.03, 0.025, '#777', 18);
  }
  B.sphere(0.3, 0.2, 0.22, 0.12, '#e8e8e8', 1, 1, 1, 12);
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B.box(0.3 + a * 0.08, 0, 0.22 + b * 0.08, 0.015, 0.14, 0.015, '#777');
  // torre de antorcha
  B.box(0.4, 0, -0.38, 0.03, 1.1, 0.03, '#888');
  B.sphere(0.4, 1.12, -0.38, 0.025, '#ff7a1a');
  B.hcyl(0.0, 0.12, 0.02, 0.016, 0.8, '#c49a3a', 'x', 8);
  B.hcyl(0.0, 0.12, -0.02, 0.016, 0.8, '#7a8a96', 'x', 8);
  B.hcyl(0.0, 0.08, 0.0, 0.014, 0.8, '#c49a3a', 'z', 8);
  lamp(B, -0.45, 0.45, 0.4); lamp(B, 0.45, 0.45, 0.4);
}

function logistica(B) {
  const r = B.r;
  yard(B, '#7f7b73');
  B.box(0, 0, -0.24, 0.94, 0.5, 0.46, '#e4e1d8', {
    fl: 2, cw: 0.157,
    pick: (f, c, Fn, C, side) => (side === 'front' ? (f === 0 ? CELL.ROLLER : [CELL.BAND, '#1d4e9a']) : CELL.PANEL),
  });
  B.box(0, 0.5, -0.24, 0.96, 0.03, 0.48, '#b9bec2', { roofCell: CELL.CORRUG });
  for (let i = 0; i < 9; i++) {
    const x = -0.36 + (i % 3) * 0.26, z = 0.12 + Math.floor(i / 3) * 0.11;
    const h = r.int(1, 3);
    for (let k = 0; k < h; k++) container(B, x, k * 0.09, z, 'x');
  }
  // grúa pórtico
  for (const x of [-0.46, 0.46]) B.box(x, 0, 0.23, 0.03, 0.42, 0.03, '#f4b400');
  B.box(0, 0.42, 0.23, 0.95, 0.04, 0.05, '#f4b400');
  B.box(0.1, 0.32, 0.23, 0.06, 0.1, 0.06, '#333');
}

export const IND_TYPES = {
  taller: { name: 'Taller y bodega', fn: taller, jobs: 1, poll: 0.6 },
  invernadero: { name: 'Cultivo de flores', fn: invernadero, jobs: 1.2, poll: 0.2 },
  ladrillera: { name: 'Ladrillera', fn: ladrillera, jobs: 1, poll: 1.3 },
  bodega: { name: 'Bodegas', fn: bodega, jobs: 0.9, poll: 0.5 },
  textil: { name: 'Fábrica textil', fn: textil, jobs: 1.3, poll: 1 },
  agroindustria: { name: 'Agroindustria', fn: agroindustria, jobs: 1, poll: 0.8 },
  planta: { name: 'Planta industrial', fn: planta, jobs: 1.2, poll: 1.4 },
  tanques: { name: 'Planta química', fn: tanques, jobs: 0.9, poll: 1.6 },
  logistica: { name: 'Centro logístico', fn: logistica, jobs: 1, poll: 0.6 },
};

const TABLE = {
  1: [['taller', 0.45], ['invernadero', 0.35], ['ladrillera', 0.2]],
  2: [['bodega', 0.4], ['textil', 0.35], ['agroindustria', 0.25]],
  3: [['planta', 0.4], ['tanques', 0.25], ['logistica', 0.35]],
};
// modelos basados en las fotos de referencia
Object.assign(IND_TYPES, REF_IND);
for (const [d, list] of Object.entries(REF_IND_TABLE)) TABLE[d] = [...(TABLE[d] || []), ...list];

export function pickIndType(d, r) { return pickW(TABLE[d])(r); }
export const IND_JOBS = { 1: 14, 2: 45, 3: 130 };
