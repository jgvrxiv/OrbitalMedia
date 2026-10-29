// Modelos basados en las fotos de referencia (carpeta referencias/), casi todas de Bogotá:
// ladrillo a la vista, casas coloniales e inglesas, torres de ladrillo, torres curvas tipo Salmona,
// bodegas en bóveda y torres de oficinas emblemáticas.
import * as THREE from '../vendor/three.module.min.js';
import { CELL, shade } from './geom.js';
import { F, PAL, lot, fence, tank, parapet, balcony, car, pots, pergola, hvac, antenna, lamp, container } from './kit.js';

// ladrillo bogotano (naranja-rojizo) y acabados claros
const BRICK = ['#b5593a', '#c0643f', '#a9512f', '#bb6a45', '#c27150'];
const CREAM = ['#f1ede4', '#e9e0cc', '#ddd0b4', '#f5f1e8'];
const DARK = '#2b2b2b';

// muro curvo (polígono de n lados) con fachada de módulos; visible desde afuera
function ring(B, cx, cz, r, y0, h, floors, sides, color, pick) {
  for (let i = 0; i < sides; i++) {
    const a0 = (i / sides) * Math.PI * 2, a1 = ((i + 1) / sides) * Math.PI * 2;
    // de a1 a a0 (sentido horario) para que la cara mire hacia afuera
    const ax = cx + Math.cos(a1) * r, az = cz + Math.sin(a1) * r, bx = cx + Math.cos(a0) * r, bz = cz + Math.sin(a0) * r;
    B.wall(ax, az, bx, bz, y0, h, color, floors, 1, (f, c) => pick(f, i));
  }
  B.cyl(cx, y0 + h, cz, r * 0.995, 0.02, '#8f8b84', sides);
}

// viga recta entre dos puntos (aristas inclinadas)
function beam(B, a, b, t, color) {
  const dir = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  const eu = new THREE.Euler().setFromQuaternion(q);
  const g = new THREE.BoxGeometry(t, len, t);
  B.geo(g, color, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], [eu.x, eu.y, eu.z]);
  g.dispose();
}

// ======================= RESIDENCIAL =======================

// Hilera de 3 casas angostas (≈4 m de frente) de 2-3 pisos con portones y rejas (fotos 3-1, 3.webp).
function hileraLadrillo(B, e) {
  const r = B.r;
  lot(B, Math.max(2, e));
  B.plane(0, 0.014, 0.38, 0.99, 0.22, '#b9b4a8');
  for (let i = 0; i < 3; i++) {
    const x = -0.33 + i * 0.33, w = 0.33, d = 0.62, z = -0.1;
    const floors = r.int(2, 3);
    const brick = r() < 0.6;
    const col = brick ? r.pick(BRICK) : r.pick(CREAM);
    B.box(x, 0, z, w, floors * F, d, col, {
      fl: floors, cw: 0.165,
      pick: (f, c, Fn, C, side) => {
        if (side === 'front') {
          if (f === 0) return c === 0 ? [CELL.GARAGE, DARK] : [CELL.DOOR, DARK];
          return brick ? [CELL.WIN_BARS, col] : CELL.WIN_SLIDE;
        }
        if (side === 'back') return CELL.WIN_SLIDE;
        return brick ? CELL.BRICK : CELL.PLAIN;
      },
    });
    const H = floors * F;
    B.box(x, H, z, w + 0.005, 0.025, d, shade(col, 0.85));
    parapet(B, x, H + 0.025, z, w, d, 0.04, shade(col, 0.9));
    if (r() < 0.5) tank(B, x, H + 0.025, z - 0.15);
    if (floors === 3 && r() < 0.5) balcony(B, x, F * 2, z + d / 2, w * 0.7, 0.05, 'front', { rail: DARK });
    B.box(x, F * 0.82, z + d / 2 + 0.035, w * 0.8, 0.012, 0.07, '#a8442a');
  }
  B.bush(0.42, 0.42, 0.06, '#d94c6a');
}

// Casas VIS de 2 pisos pareadas: blancas con paños de ladrillo y rejas (foto 3).
function visPareadas(B, e) {
  const r = B.r;
  lot(B, 2);
  B.plane(0, 0.014, 0.3, 0.99, 0.36, '#a8a497');
  const brick = r.pick(BRICK);
  for (const s of [-1, 1]) {
    const x = s * 0.2475, w = 0.495, d = 0.56, z = -0.12;
    B.box(x, 0, z, w, 2 * F, d, '#f3f1ec', {
      fl: 2, cw: 0.16,
      pick: (f, c, Fn, C, side) => {
        if (side === 'front') {
          const brickCol = s < 0 ? c === C - 1 : c === 0;
          if (brickCol) return [f === 0 ? CELL.DOOR : CELL.BRICK, f === 0 ? DARK : brick];
          return [CELL.WIN_BARS, '#f3f1ec'];
        }
        return side === 'back' ? CELL.WIN_SLIDE : CELL.PLAIN;
      },
    });
    B.box(x, 2 * F, z, w, 0.03, d, '#dedbd3');
    parapet(B, x, 2 * F + 0.03, z, w, d, 0.05, '#f3f1ec');
    B.box(x + s * 0.17, 0, z + d / 2 + 0.01, 0.12, 2 * F + 0.08, 0.02, brick, { pick: () => CELL.BRICK, fl: 2, cw: 0.12 });
  }
  B.box(0, 0, 0.3, 0.01, 0.12, 0.36, '#c9c4b8');
  fence(B, 'reja', { sides: ['front'], gate: 0.5, color: '#bdb9ae' });
}

// Casa moderna blanca con muro de ladrillo, garaje y ventanas con celosía (foto 3-2b).
function casaModernaLadrillo(B, e) {
  const r = B.r;
  lot(B, Math.max(3, e));
  const brick = r.pick(BRICK);
  const z = -0.1;
  B.box(-0.04, 0, z, 0.6, 2 * F, 0.5, '#efe9df', {
    fl: 2, cw: 0.2,
    pick: (f, c, Fn, C, side) => {
      if (side === 'front') return f === 0 ? (c === 0 ? [CELL.GARAGE, DARK] : c === 1 ? [CELL.DOOR, DARK] : [CELL.VENT, '#3a3a3a']) : c === 1 ? CELL.BALCONY : [CELL.VENT, '#3a3a3a'];
      return side === 'back' ? CELL.WIN_BIG : CELL.PLAIN;
    },
  });
  B.box(0.3, 0, z - 0.02, 0.1, 2 * F + 0.06, 0.56, brick, { pick: () => CELL.BRICK, fl: 3, cw: 0.15, top: shade(brick, 0.9) });
  B.box(-0.04, 2 * F, z, 0.62, 0.03, 0.52, shade(brick, 0.95));
  B.box(-0.04, 2 * F, z + 0.25, 0.62, 0.05, 0.02, brick);
  balcony(B, -0.04, F, z + 0.25, 0.18, 0.05, 'front', { rail: DARK });
  B.plane(-0.2, 0.016, 0.3, 0.2, 0.36, '#c9c4b8');
  for (let i = 0; i < 5; i++) B.bush(0.05 + i * 0.07, 0.25 + (i % 2) * 0.05, 0.035, r.pick(['#e63946', '#f4a261', '#3f8f3a', '#ff8fab']));
  B.tree(0.4, 0.4, 0.24);
}

// Casa colonial blanca de dos pisos: teja de barro, aleros con canecillos de madera, rejas y escalinata (fotos 4-1 y 4).
function casaColonialBlanca(B, e) {
  const r = B.r;
  lot(B, Math.max(4, e));
  const white = r.pick(['#fbfaf6', '#f6f2ea']);
  const wood = r.pick(['#5a3a22', '#4a2f1c', '#6b4a2b']);
  const clay = r.pick(PAL.clay);
  const z = -0.1, w = 0.8, d = 0.5;
  B.box(0, 0, z, w, F * 1.05, d, white, {
    fl: 1, cw: 0.2,
    pick: (f, c, Fn, C, side) => (side === 'front' ? (c === 1 || c === 2 ? [CELL.DOOR, wood] : [CELL.WIN_BARS, white]) : side === 'back' ? CELL.WIN_SHUT : CELL.PLAIN),
  });
  // tejaroz del primer piso con canecillos
  B.shed(0, F * 1.05, z + d / 2 + 0.06, w + 0.06, 0.12, 0.0, 0.04, clay, 'z-', CELL.ROOFTILE);
  for (let i = 0; i < 9; i++) B.box(-w / 2 + 0.04 + i * (w - 0.08) / 8, F * 1.03, z + d / 2 + 0.05, 0.014, 0.014, 0.1, wood);
  B.box(0.05, F * 1.05, z - 0.03, w * 0.72, F, d * 0.85, white, {
    fl: 1, cw: 0.19,
    pick: (f, c, Fn, C, side) => (side === 'front' ? [CELL.WIN_BARS, white] : side === 'back' ? CELL.WIN_SHUT : CELL.PLAIN),
  });
  B.hip(0.05, F * 2.05, z - 0.03, w * 0.72 + 0.12, 0.13, d * 0.85 + 0.12, clay);
  for (let i = 0; i < 7; i++) B.box(0.05 - w * 0.36 + 0.03 + i * (w * 0.72 - 0.06) / 6, F * 2.02, z - 0.03 + d * 0.425 + 0.04, 0.012, 0.012, 0.09, wood);
  // escalinata y patio de baldosa de barro
  for (let k = 0; k < 3; k++) B.box(0, 0, z + d / 2 + 0.05 + k * 0.04, 0.24, 0.05 - k * 0.015, 0.05, '#b5523b');
  B.plane(0, 0.016, 0.36, 0.3, 0.2, '#c46a4a');
  B.box(-0.3, 0, 0.36, 0.12, 0.05, 0.12, '#9a9a9a');
  B.bush(-0.38, 0.3, 0.05, '#e63946');
  fence(B, 'reja', { sides: ['front'], gate: 0.3, color: white });
}

// Casa inglesa de ladrillo (Teusaquillo): hastiales empinados, ventanas blancas cuadriculadas, chimenea (foto 4-2b).
function casaInglesa(B, e) {
  const r = B.r;
  lot(B, Math.max(4, e));
  const brick = r.pick(BRICK);
  const roof = r.pick(['#a8442a', '#8a3a2a', '#5d4a44']);
  const z = -0.1, w = 0.8, d = 0.52;
  B.box(0, 0, z, w, 2 * F, d, brick, {
    fl: 2, cw: 0.2,
    pick: (f, c, Fn, C, side) => {
      if (side === 'front') return f === 0 && c === 2 ? [CELL.WIN_ARCH, '#f4f4f4'] : f === 0 && c === 0 ? [CELL.GARAGE, '#f4f4f4'] : [CELL.WIN_BIG, brick];
      return side === 'back' ? CELL.WIN_BIG : CELL.BRICK;
    },
  });
  B.gable(0, 2 * F, z, w + 0.06, 0.22, d + 0.06, roof, 'x', { gable: brick });
  // dos hastiales hacia la calle, uno más alto y agudo
  B.box(0.24, 2 * F, z + d / 2 - 0.08, 0.24, 0.02, 0.16, brick);
  B.gable(0.24, 2 * F, z + d / 2 - 0.08, 0.26, 0.34, 0.2, roof, 'z', { gable: brick });
  B.gable(-0.26, 2 * F, z + d / 2 - 0.06, 0.2, 0.18, 0.14, roof, 'z', { gable: brick });
  B.box(-0.3, 2 * F, z - 0.12, 0.08, 0.34, 0.08, brick, { pick: () => CELL.BRICK, fl: 2, cw: 0.08, top: '#555' });
  B.box(0, 0, z + d / 2 + 0.01, w + 0.01, 0.06, 0.012, shade(brick, 0.8));
  fence(B, 'seto', { sides: ['front'], gate: 0.2 });
  B.bush(0.3, 0.3, 0.06, '#3f7f3a');
  B.tree(-0.4, 0.38, 0.3);
}

// Casa de lujo de ladrillo y vidrio con hastial vidriado, pérgola de madera y terraza (foto 6).
function casaLadrilloVidrio(B, e) {
  const r = B.r;
  lot(B, 6);
  const brick = r.pick(BRICK);
  const wood = r.pick(PAL.wood);
  const z = -0.12;
  B.box(0.08, 0, z, 0.5, 2 * F, 0.44, brick, {
    fl: 2, cw: 0.125,
    pick: (f, c, Fn, C, side) => (side === 'front' ? (c === 1 || c === 2 ? CELL.FLOORGLASS : CELL.BRICK) : side === 'left' ? CELL.FLOORGLASS : CELL.BRICK_WIN),
  });
  B.gable(0.08, 2 * F, z, 0.54, 0.26, 0.48, '#4a4e54', 'z', { cell: CELL.PANEL, gable: '#9fc6dc' });
  B.box(0.08, 2 * F, z + 0.235, 0.36, 0.2, 0.01, '#9fc6dc', { pick: () => CELL.CURTAIN, fl: 1, cw: 0.12 });
  // terraza con pérgola
  B.plane(-0.25, 0.04, 0.02, 0.42, 0.5, '#9a958a');
  B.box(-0.25, 0, 0.02, 0.44, 0.04, 0.52, '#8f8b84');
  pergola(B, -0.25, 0.04, 0.02, 0.38, 0.44, wood);
  B.box(-0.25, 0.04, 0.05, 0.16, 0.05, 0.1, '#2b2b2b');
  B.box(-0.12, 0.04, 0.1, 0.1, 0.04, 0.06, '#3a7a6a');
  for (let k = 0; k < 3; k++) B.box(-0.05 + k * 0.03, 0, 0.3, 0.03, 0.04 - k * 0.012, 0.12, '#bcb6a8');
  B.plane(0.15, 0.016, 0.36, 0.6, 0.22, '#6aa84f');
  fence(B, 'seto', { gate: 0.16 });
  B.tree(0.42, 0.4, 0.32);
}

// Bloque de ladrillo de 6 pisos con balcones (conjuntos bogotanos, foto 4-3b). La versión alta tiene 9-11.
function bloqueLadrillo(B, e, spec, tall = false) {
  const r = B.r;
  lot(B, Math.max(3, e));
  const brick = r.pick(BRICK);
  const floors = tall ? r.int(9, 11) : r.int(5, 6);
  const FT = 0.24;
  const w = 0.82, d = 0.5, z = -0.06;
  B.box(0, 0, z, w, floors * FT, d, brick, {
    fl: floors, cw: 0.164,
    pick: (f, c, Fn, C, side) => {
      if (side === 'front' || side === 'back') {
        if (f === 0 && side === 'front' && c === 2) return CELL.DOOR_GLASS;
        return c === 1 || c === 3 ? CELL.BALCONY : CELL.BRICK_WIN;
      }
      return c % 2 ? CELL.BRICK_WIN : CELL.BRICK;
    },
  });
  for (let f = 1; f < floors; f++) {
    for (const x of [-0.164, 0.164]) {
      balcony(B, x, f * FT, z + d / 2, 0.15, 0.06, 'front', { rail: '#3a3a3a', slab: shade(brick, 0.9) });
      balcony(B, x, f * FT, z - d / 2, 0.15, 0.06, 'back', { rail: '#3a3a3a', slab: shade(brick, 0.9) });
    }
  }
  const H = floors * FT;
  B.box(0, H, z, w + 0.02, 0.03, d + 0.02, shade(brick, 0.85));
  B.box(0, H + 0.03, z, 0.16, 0.12, 0.16, brick, { pick: () => CELL.BRICK, fl: 1, cw: 0.16 });
  B.plane(0, 0.014, 0.36, 0.95, 0.24, '#7fae62');
  for (const x of [-0.3, 0, 0.3]) B.box(x, 0, 0.36, 0.14, 0.05, 0.1, '#a9512f', { top: '#6aa84f' });
  B.tree(-0.42, 0.42, 0.24); B.tree(0.42, 0.42, 0.24);
}

// Torre de ladrillo con balcones corridos y punto fijo vidriado (fotos 5-2b y 5-3b).
function torreLadrillo(B, e) {
  const r = B.r;
  lot(B, Math.max(4, e));
  const brick = r.pick(BRICK);
  const floors = r.int(12, 15);
  const FT = 0.23;
  const w = 0.6, d = 0.52, z = -0.04;
  B.box(0, 0, z, w, floors * FT, d, brick, {
    fl: floors, cw: 0.12,
    pick: (f, c, Fn, C, side) => {
      if (c === 2 && (side === 'front' || side === 'back')) return f === 0 ? CELL.DOOR_GLASS : CELL.CURTAIN;
      if (side === 'front' || side === 'back') return CELL.BALCONY;
      return c % 2 ? CELL.BRICK_WIN : CELL.BRICK;
    },
  });
  for (let f = 1; f < floors; f++) {
    for (const x of [-0.18, 0.18]) {
      balcony(B, x, f * FT, z + d / 2, 0.2, 0.06, 'front', { rail: '#2b2b2b', slab: '#cfc6b4' });
      balcony(B, x, f * FT, z - d / 2, 0.2, 0.06, 'back', { rail: '#2b2b2b', slab: '#cfc6b4' });
    }
  }
  const H = floors * FT;
  B.box(0, H, z, w + 0.02, 0.03, d + 0.02, shade(brick, 0.85));
  B.box(0, H + 0.03, z, 0.14, 0.2, 0.14, '#cfe3ee', { pick: () => CELL.CURTAIN, fl: 1, cw: 0.14 });
  // cerramiento de reja con columnas de ladrillo y palmas (como en la foto)
  for (let i = -4; i <= 4; i++) B.box(i * 0.11, 0, 0.47, 0.03, 0.14, 0.03, brick);
  B.box(0, 0.11, 0.47, 0.9, 0.006, 0.006, '#222');
  for (let i = -20; i <= 20; i++) B.box(i * 0.022, 0.03, 0.47, 0.004, 0.08, 0.004, '#222');
  B.palm(-0.35, 0.36, 0.55); B.palm(0.35, 0.36, 0.55);
}

// Edificio de ladrillo de 7 pisos con miradores en voladizo y garaje en el primer piso (foto 5).
function edificioMiradores(B, e) {
  const r = B.r;
  lot(B, Math.max(4, e));
  const brick = r.pick(BRICK);
  const floors = r.int(6, 7);
  const FT = 0.24;
  const w = 0.84, d = 0.62, z = -0.06;
  B.box(0, 0, z, w, FT, d, '#3a3a3a', { fl: 1, cw: 0.21, pick: (f, c, Fn, C, side) => (side === 'front' ? (c === 0 ? CELL.DOOR_GLASS : CELL.GARAGE) : CELL.PLAIN) });
  B.box(0, FT, z, w, (floors - 1) * FT, d, brick, {
    fl: floors - 1, cw: 0.14,
    pick: (f, c, Fn, C, side) => (side === 'front' || side === 'back' ? (c % 2 ? CELL.BRICK_WIN : CELL.BRICK) : c % 2 ? CELL.BRICK_WIN : CELL.BRICK),
  });
  // miradores: cajas de ladrillo con ventana en tres caras, salientes del plano de fachada
  for (let f = 1; f < floors; f++) {
    for (const x of [-0.28, 0, 0.28]) {
      B.box(x, f * FT + 0.02, z + d / 2 + 0.035, 0.16, FT - 0.04, 0.07, brick, {
        fl: 1, cw: 0.08, top: shade(brick, 0.9),
        pick: (ff, c, Fn, C, side) => (side === 'back' ? CELL.BRICK : CELL.WIN_BIG),
      });
    }
  }
  const H = floors * FT;
  B.box(0, H, z, w + 0.02, 0.03, d + 0.02, shade(brick, 0.85));
  B.box(-0.2, H + 0.03, z - 0.1, 0.2, 0.12, 0.2, brick, { pick: () => CELL.BRICK, fl: 1, cw: 0.2 });
  hvac(B, 0.2, H + 0.03, z - 0.1);
  B.box(0, 0, 0.4, 0.94, 0.08, 0.06, brick, { pick: () => CELL.BRICK, fl: 1, cw: 0.2 });
  B.tree(0.42, 0.42, 0.24);
}

// Torre curva escalonada de ladrillo, inspirada en las Torres del Parque de Rogelio Salmona (foto 6-1).
function torreCurva(B, e) {
  const r = B.r;
  lot(B, 6);
  const brick = r.pick(BRICK);
  const FT = 0.23;
  const tiers = [[0.46, r.int(4, 5)], [0.4, r.int(3, 4)], [0.33, r.int(3, 4)], [0.26, r.int(2, 3)], [0.19, 2]];
  // plaza de ladrillo con jardineras
  B.plane(0, 0.014, 0, 0.98, 0.98, '#b8704f', CELL.BRICK);
  let y = 0;
  for (const [rad, fl] of tiers) {
    ring(B, 0, -0.04, rad, y, fl * FT, fl, 20, brick, (f, i) => (i % 3 === 0 ? CELL.BRICK : i % 3 === 1 ? CELL.BRICK_WIN : CELL.BALCONY));
    y += fl * FT;
    // terraza de remate con jardinera
    B.cyl(0, y, -0.04, rad + 0.01, 0.025, shade(brick, 0.85), 20);
    B.cyl(0, y + 0.025, -0.04, rad - 0.02, 0.02, '#6aa84f', 20, rad - 0.04);
  }
  for (const [x, z] of [[-0.4, 0.4], [0.4, 0.4], [0.4, -0.42], [-0.42, -0.4]]) {
    B.cyl(x, 0, z, 0.06, 0.06, brick, 12);
    B.tree(x, z, 0.24, '#3a8a35', 0.06);
  }
}

// ======================= COMERCIO / OFICINAS =======================

// Torre de vidrio con corona en punta y marco metálico en las aristas (inspirada en BD Bacatá, foto off-2b).
function torreCorona(B, e) {
  const r = B.r;
  lot(B, 6);
  const FT = 0.22;
  const floors = r.int(30, 36);
  const w = 0.5;
  const frame = r.pick(['#c86b3c', '#d9dde0', '#b8b8b8']);
  B.box(0, 0, 0, 0.86, FT * 3, 0.86, '#2e3a46', { fl: 3, cw: 0.215, pick: (f, c, Fn, C, side) => (f === 0 && side === 'front' && c === 1 ? CELL.DOOR_GLASS : CELL.CURTAIN_SPAN) });
  B.box(0, FT * 3, 0, 0.88, 0.03, 0.88, '#d9dde0', { roofCell: CELL.GREEN });
  const y0 = FT * 3 + 0.03, H = y0 + floors * FT;
  B.box(0, y0, 0, w, floors * FT, w, '#5f8fb0', { fl: floors, cw: 0.083, pick: () => CELL.CURTAIN });
  // marco en las aristas y diagonales del frente
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B.box(a * w / 2, y0, b * w / 2, 0.03, floors * FT, 0.03, frame);
  // corona: pirámide de cuatro aristas que terminan en una aguja
  const top = H + 0.9;
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) beam(B, [a * w / 2, H, b * w / 2], [0, top, 0], 0.03, frame);
  // diagonales del marco en el frente, como la "V" de la fachada
  beam(B, [-w / 2, y0 + floors * FT * 0.55, w / 2 + 0.012], [0, H, w / 2 + 0.012], 0.025, frame);
  beam(B, [w / 2, y0 + floors * FT * 0.55, w / 2 + 0.012], [0, H, w / 2 + 0.012], 0.025, frame);
  B.box(0, H, 0, w * 0.7, 0.5, w * 0.7, '#7fa8c4', { fl: 2, cw: 0.1, pick: () => CELL.CURTAIN });
  B.cyl(0, H + 0.5, 0, 0.03, top - H - 0.5, frame, 6, 0.01);
  B.cyl(0, top, 0, 0.008, 0.4, '#d9dde0', 4, 0.003);
  B.sphere(0, top + 0.42, 0, 0.015, '#ff3b30');
}

// Torre esbelta con aletas verticales y corona iluminada (inspirada en la Torre Colpatria, foto off).
function torreEsbelta(B, e) {
  const r = B.r;
  lot(B, 6);
  const FT = 0.22;
  const floors = r.int(36, 42);
  const w = 0.42;
  B.plane(0, 0.014, 0, 0.95, 0.95, '#c9c4b8');
  B.box(0, 0, 0, 0.8, FT * 2, 0.6, '#3a4048', { fl: 2, cw: 0.2, pick: (f, c, Fn, C, side) => (f === 0 && side === 'front' && c === 1 ? CELL.DOOR_GLASS : CELL.FLOORGLASS) });
  const y0 = FT * 2;
  B.box(0, y0, 0, w, floors * FT, w, '#d6d0c2', { fl: floors, cw: 0.07, pick: (f, c) => (c % 2 ? CELL.CURTAIN_SPAN : CELL.PANEL) });
  for (let i = -3; i <= 3; i++) {
    for (const s of [-1, 1]) {
      B.box(i * 0.06, y0, s * (w / 2 + 0.01), 0.012, floors * FT, 0.02, '#ece8de');
      B.box(s * (w / 2 + 0.01), y0, i * 0.06, 0.02, floors * FT, 0.012, '#ece8de');
    }
  }
  const H = y0 + floors * FT;
  // corona con franja que se ilumina de noche
  B.box(0, H, 0, w + 0.04, 0.12, w + 0.04, '#f5f1e8', { pick: () => CELL.SIGN, fl: 1, cw: 0.11, lit: true });
  B.box(0, H + 0.12, 0, w - 0.06, 0.1, w - 0.06, '#8a8a8a');
  antenna(B, 0, H + 0.22, 0, 0.4);
}

// ======================= INDUSTRIA =======================

// Bodegas en bóveda con fachada negra y franjas rojas, muelles y parqueadero (fotos ind-1 e ind).
function bodegasBoveda(B, e) {
  const r = B.r;
  B.plane(0, 0.01, 0, 0.99, 0.99, '#8e8a82');
  const accent = r.pick(['#c62828', '#b71c1c', '#1d4e9a']);
  for (let i = 0; i < 3; i++) {
    const x = -0.31 + i * 0.31;
    B.box(x, 0, -0.16, 0.3, 0.3, 0.6, '#2f3237', {
      fl: 2, cw: 0.1,
      pick: (f, c, Fn, C, side) => (side === 'front' ? (c === 1 ? (f === 0 ? CELL.ROLLER : [CELL.SIGN, '#ffffff']) : [CELL.PANEL, accent]) : f === 1 ? CELL.CLERESTORY : CELL.PANEL),
    });
    B.vault(x, 0.3, -0.16, 0.3, 0.6, 0.1, '#d9dde0', 'z', CELL.CORRUG, 10);
    B.box(x + 0.13, 0, 0.14, 0.025, 0.32, 0.012, accent);
    B.box(x - 0.13, 0, 0.14, 0.025, 0.32, 0.012, accent);
  }
  // parqueadero con carros y un contenedor
  B.plane(0, 0.014, 0.34, 0.96, 0.3, '#55585c');
  for (let i = 0; i < 6; i++) if (r() < 0.75) car(B, -0.38 + i * 0.15, 0.34, 1);
  container(B, 0.4, 0, -0.42, 'z');
  lamp(B, -0.46, 0.46, 0.35); lamp(B, 0.46, 0.46, 0.35);
}

export const REF_RES = {
  hileraLadrillo: { name: 'Hilera de casas de ladrillo', fn: hileraLadrillo, pop: 1.6 },
  visPareadas: { name: 'Casas VIS pareadas', fn: visPareadas, pop: 1.4 },
  casaModernaLadrillo: { name: 'Casa moderna con ladrillo', fn: casaModernaLadrillo, pop: 1 },
  casaColonialBlanca: { name: 'Casa colonial', fn: casaColonialBlanca, pop: 1 },
  casaInglesa: { name: 'Casa inglesa de ladrillo', fn: casaInglesa, pop: 1 },
  casaLadrilloVidrio: { name: 'Casa de ladrillo y vidrio', fn: casaLadrilloVidrio, pop: 0.8 },
  bloqueLadrillo: { name: 'Bloque de ladrillo', fn: (B, e, s) => bloqueLadrillo(B, e, s, false), pop: 1.1 },
  bloqueLadrilloAlto: { name: 'Bloque alto de ladrillo', fn: (B, e, s) => bloqueLadrillo(B, e, s, true), pop: 0.9 },
  torreLadrillo: { name: 'Torre de ladrillo con balcones', fn: torreLadrillo, pop: 1.1 },
  edificioMiradores: { name: 'Edificio de ladrillo con miradores', fn: edificioMiradores, pop: 1 },
  torreCurva: { name: 'Torre curva de ladrillo', fn: torreCurva, pop: 1 },
};
export const REF_COM = {
  torreCorona: { name: 'Torre de oficinas con corona', fn: torreCorona, jobs: 1.8 },
  torreEsbelta: { name: 'Torre de oficinas esbelta', fn: torreEsbelta, jobs: 1.7 },
};
export const REF_IND = {
  bodegasBoveda: { name: 'Bodegas en bóveda', fn: bodegasBoveda, jobs: 1, poll: 0.5 },
};

// pesos que se agregan a las tablas de tipología (densidad -> estrato -> [tipo, peso])
export const REF_RES_TABLE = {
  1: {
    2: [['visPareadas', 0.3], ['hileraLadrillo', 0.25]],
    3: [['hileraLadrillo', 0.3], ['visPareadas', 0.2], ['casaModernaLadrillo', 0.3]],
    4: [['casaColonialBlanca', 0.3], ['casaInglesa', 0.25], ['casaModernaLadrillo', 0.15]],
    5: [['casaInglesa', 0.3], ['casaLadrilloVidrio', 0.25]],
    6: [['casaLadrilloVidrio', 0.4]],
  },
  2: {
    3: [['bloqueLadrillo', 0.3]],
    4: [['bloqueLadrillo', 0.35], ['edificioMiradores', 0.3]],
    5: [['edificioMiradores', 0.4]],
    6: [['edificioMiradores', 0.25]],
  },
  3: {
    3: [['bloqueLadrilloAlto', 0.3]],
    4: [['bloqueLadrilloAlto', 0.35], ['torreLadrillo', 0.3]],
    5: [['torreLadrillo', 0.4], ['torreCurva', 0.3]],
    6: [['torreCurva', 0.35]],
  },
};
// las torres de oficinas se usan en la zona de oficinas (models_off.js)
export const REF_COM_TABLE = {};
export const REF_IND_TABLE = { 2: [['bodegasBoveda', 0.35]], 3: [['bodegasBoveda', 0.15]] };

void tank; void pots; void fence;
