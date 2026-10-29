// Modelos residenciales. La TIPOLOGÍA depende de la densidad (baja/media/alta) y el ESTRATO
// (1-6, según el valor del suelo) define acabados, materiales y entorno. Un conjunto puede ser estrato 2 o 6.
import { CELL, shade } from './geom.js';
import { ROW_TYPES, ROW_TABLE } from './models_row.js';
import { BIG_RES } from './models_big.js';
import { REF_RES, REF_RES_TABLE } from './models_ref.js';
import {
  F, PAL, lot, path, fence, tank, rebar, parapet, dish, antenna, acUnit, hvac, laundry, balcony, car, pool,
  umbrella, pots, lamp, playground, pergola, columns, plinth, sign, pickW,
} from './kit.js';

const WIN = {
  1: [CELL.WIN_HOLE, CELL.WIN_BARS, CELL.WIN_BARS],
  2: [CELL.WIN_BARS, CELL.WIN_SLIDE, CELL.WIN_BARS],
  3: [CELL.WIN_SLIDE, CELL.WIN_SHUT, CELL.WIN_BIG],
  4: [CELL.WIN_BIG, CELL.WIN_SHUT, CELL.WIN_SLIDE],
  5: [CELL.WIN_BIG, CELL.FLOORGLASS],
  6: [CELL.FLOORGLASS, CELL.FLOORGLASS, CELL.WIN_BIG],
};
const winOf = (r, e) => r.pick(WIN[e]);
const wallOf = (r, e) => r.pick(PAL.wall[e]);

function shuffle(arr, r) {
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}

// fachada genérica con puerta / garaje / planta baja especial
function facade(r, e, o = {}) {
  const win = o.win ?? winOf(r, e);
  const winUp = o.winUp ?? win;
  return (f, c, Fn, C, side) => {
    if (side === 'front') {
      if (f === 0) {
        if (o.doorCol !== undefined && c === (o.doorCol + C) % C) return o.doorCell ?? CELL.DOOR;
        if (o.garageCol !== undefined && c === (o.garageCol + C) % C) return CELL.GARAGE;
        if (o.ground !== undefined) return typeof o.ground === 'function' ? o.ground(c, C) : o.ground;
        return win;
      }
      if (o.upFront) return o.upFront(f, c, Fn, C);
      return winUp;
    }
    if (side === 'back') return r() < 0.8 ? (o.backWin ?? winUp) : CELL.PLAIN;
    if (o.party) return CELL.PLAIN;
    return C > 1 && (c % 2 === 1 || r() < 0.2) ? (o.sideWin ?? winUp) : (o.sideCell ?? CELL.PLAIN);
  };
}

// ======================= BAJA DENSIDAD =======================

// Vivienda de autoconstrucción: volúmenes apilados, ladrillo a la vista, zinc, tanques y ropa tendida.
function autoconstruccion(B, e) {
  const r = B.r;
  lot(B, 1);
  if (e <= 1) {
    const spots = shuffle([[-0.22, -0.21], [0.22, -0.21], [-0.22, 0.2], [0.22, 0.2]], r);
    const n = r.int(3, 4);
    for (let i = 0; i < n; i++) {
      const [sx, sz] = spots[i];
      const w = r.range(0.36, 0.46), d = r.range(0.34, 0.44);
      const floors = r.int(1, 3);
      const h = floors * F * 0.95;
      const x = sx + r.range(-0.02, 0.02), z = sz + r.range(-0.02, 0.02);
      const raw = r.pick([...PAL.brick, '#a9a59c', '#b8714f']);
      const paint = r.pick(PAL.wall[2]);
      const painted = r() < 0.55;
      const rawTex = r() < 0.5 ? CELL.BRICK : CELL.OBRA;
      B.box(x, 0, z, w, h, d, raw, {
        fl: floors, cw: 0.2, top: '#9a968e',
        pick: (f, c, Fn, C, side) => {
          if (side === 'front' && painted) {
            if (f === 0 && c === 0) return [CELL.DOOR, paint];
            return [r() < 0.7 ? CELL.WIN_BARS : CELL.WIN_HOLE, paint];
          }
          if (side === 'front' && f === 0 && c === 0) return CELL.DOOR;
          return r() < 0.35 ? CELL.BRICK_WIN : rawTex;
        },
      });
      if (r() < 0.6) {
        B.shed(x, h, z, w + 0.05, d + 0.05, 0.0, 0.06, r.pick(PAL.zinc), r.pick(['x+', 'x-', 'z+', 'z-']));
        if (r() < 0.6) { B.cyl(x - w * 0.15, h + 0.035, z, 0.028, 0.014, '#1a1a1a', 10); B.cyl(x + w * 0.2, h + 0.035, z + d * 0.1, 0.028, 0.014, '#1a1a1a', 10); }
      } else {
        B.box(x, h, z, w + 0.02, 0.02, d + 0.02, '#9e9a92');
        rebar(B, x, h + 0.02, z, w, d, 0.1);
        if (r() < 0.7) tank(B, x + w * 0.22, h + 0.02, z - d * 0.2);
        if (r() < 0.6) laundry(B, x, h + 0.13, z + d * 0.1, w * 0.75, 'x');
      }
      if (floors >= 2 && r() < 0.45) {
        const sx2 = x + (sx > 0 ? -1 : 1) * (w / 2 + 0.025);
        for (let k = 0; k < 6; k++) B.box(sx2, (k * h) / 6.5, z - d / 2 + 0.05 + k * 0.045, 0.04, 0.02, 0.04, '#9e9a92');
      }
    }
    if (r() < 0.5) B.cyl(r.range(-0.1, 0.1), 0.01, 0.42, 0.025, 0.05, '#2a5db0', 8);
  } else {
    // autoconstrucción consolidada: casa de 2-3 pisos con local en el primer piso
    const floors = r.int(2, 3);
    const w = 0.84, d = 0.66, z = -0.05;
    const paint = wallOf(r, 2), raw = r.pick(PAL.brick);
    const shopCol = r.int(0, 2);
    B.box(0, 0, z, w, (floors - 1) * F, d, raw, {
      fl: floors - 1, cw: 0.28,
      pick: (f, c, Fn, C, side) => {
        if (side === 'front') {
          if (f === 0) return c === shopCol ? [CELL.SHOP_GRILL, paint] : c === (shopCol + 1) % C ? [CELL.DOOR, paint] : [CELL.GARAGE, paint];
          return [CELL.WIN_BARS, paint];
        }
        return r() < 0.3 ? CELL.BRICK_WIN : CELL.BRICK;
      },
    });
    const y1 = (floors - 1) * F;
    B.box(0, y1, z, w + 0.02, 0.02, d + 0.02, '#a7a39b');
    balcony(B, 0, y1 - 0.0, z + d / 2, w * 0.6, 0.07, 'front', { rail: '#222' });
    // último piso a medio construir
    B.box(-0.12, y1 + 0.02, z - 0.08, w * 0.55, F * 0.95, d * 0.6, raw, { fl: 1, cw: 0.22, pick: () => (r() < 0.5 ? CELL.OBRA : CELL.BRICK), top: '#9e9a92' });
    rebar(B, 0.2, y1 + 0.02, z, 0.3, d * 0.8, 0.12);
    tank(B, -0.25, y1 + 0.02 + F * 0.95, z - 0.12);
    if (r() < 0.6) dish(B, 0.0, y1 + 0.02 + F * 0.95, z - 0.15);
    laundry(B, 0.22, y1 + 0.14, z + 0.05, 0.3, 'z');
    sign(B, (shopCol - 1) * 0.28, F * 0.86, z + d / 2, 0.24, 0.06, r.pick(PAL.bright), { text: '#fff' });
  }
}

// Casa de barrio: 1-2 pisos, antejardín con reja, techo de teja o terraza con tanque.
function casaBarrio(B, e) {
  const r = B.r;
  lot(B, e);
  const paint = wallOf(r, Math.min(e, 4));
  const floors = e === 2 ? r.int(1, 2) : 2;
  const w = r.range(0.66, 0.78), d = r.range(0.46, 0.54), z = -0.1;
  const H = floors * F;
  const doorCol = r.int(0, 2);
  const garage = e >= 3 && r() < 0.55 ? (doorCol === 0 ? 2 : 0) : undefined;
  plinth(B, 0, z, w, d, shade(paint, 0.72));
  B.box(0, 0, z, w, H, d, paint, { fl: floors, cw: 0.24, pick: facade(r, e, { doorCol, garageCol: garage }) });
  const roof = r();
  const clay = r.pick(PAL.clay);
  if (roof < 0.4) B.gable(0, H, z, w + 0.08, 0.16, d + 0.08, clay, 'x', { gable: paint });
  else if (roof < 0.7) B.hip(0, H, z, w + 0.08, 0.15, d + 0.08, clay);
  else {
    B.box(0, H, z, w + 0.02, 0.025, d + 0.02, '#a7a39b');
    parapet(B, 0, H + 0.025, z, w, d, 0.05, paint);
    tank(B, -w * 0.28, H + 0.025, z - d * 0.2);
    if (e === 2) laundry(B, 0.1, H + 0.14, z, w * 0.5, 'x');
  }
  if (floors === 2 && r() < 0.6) balcony(B, 0, F, z + d / 2, w * 0.45, 0.08, 'front', { rail: '#2a2a2a' });
  if (e >= 3) B.box((doorCol - 1) * 0.24, F * 0.82, z + d / 2 + 0.045, 0.18, 0.018, 0.09, '#9e9a92');
  fence(B, e <= 2 ? 'reja' : r() < 0.5 ? 'reja' : 'muro', { sides: ['front'], color: shade(paint, 0.9) });
  pots(B, -0.4, 0.3, 3);
  if (e >= 3) B.tree(0.36, 0.3, 0.26);
  if (garage !== undefined) car(B, (garage - 1) * 0.24, 0.3, 1);
  if (r() < 0.4 && e <= 3) dish(B, w * 0.3, H, z);
}

// Casas adosadas (pareadas): dos unidades con muro medianero.
function casasAdosadas(B, e) {
  const r = B.r;
  lot(B, e);
  const clay = r.pick(PAL.clay);
  for (const s of [-1, 1]) {
    const x = s * 0.225, w = 0.44, d = 0.55, z = -0.08;
    const paint = wallOf(r, Math.min(e, 4));
    const floors = e >= 4 && r() < 0.4 ? 3 : 2;
    const H = floors * F;
    plinth(B, x, z, w, d, shade(paint, 0.72));
    B.box(x, 0, z, w, H, d, paint, {
      fl: floors, cw: 0.22,
      pick: facade(r, e, { doorCol: s < 0 ? 0 : 1, garageCol: s < 0 ? 1 : 0, party: true }),
    });
    if (r() < 0.6) B.gable(x, H, z, w + 0.04, 0.17, d + 0.08, clay, 'z', { gable: paint });
    else { B.box(x, H, z, w, 0.02, d, '#a7a39b'); parapet(B, x, H + 0.02, z, w, d, 0.05, paint); tank(B, x, H + 0.02, z - 0.12); }
    balcony(B, x + s * 0.06, F, z + d / 2, w * 0.4, 0.07, 'front', { rail: '#2a2a2a' });
    car(B, x + (s < 0 ? 0.11 : -0.11), 0.32, 1);
  }
  B.box(0, 0, 0.32, 0.01, 0.1, 0.3, '#e8e2d6');
  fence(B, e <= 3 ? 'reja' : 'seto', { sides: ['front'], gate: 0.5 });
  pots(B, -0.42, 0.42, 2);
}

// Casa moderna: volúmenes cúbicos en voladizo, madera, vidrio y terraza.
function casaModerna(B, e) {
  const r = B.r;
  lot(B, e);
  const white = wallOf(r, Math.max(4, e));
  const wood = r.pick(PAL.wood);
  const dark = r.pick(PAL.dark);
  const z = -0.08;
  B.box(-0.04, 0, z, 0.72, F * 1.05, 0.46, white, {
    fl: 1, cw: 0.24,
    pick: (f, c, Fn, C, side) => side === 'front' ? (c === C - 1 ? CELL.GARAGE : c === 0 ? CELL.DOOR_GLASS : CELL.FLOORGLASS) : side === 'back' ? CELL.FLOORGLASS : CELL.PLAIN,
  });
  B.box(-0.04, F * 1.05, z, 0.74, 0.02, 0.48, dark);
  const ux = r() < 0.5 ? -0.12 : 0.06;
  B.box(ux, F * 1.07, z + 0.04, 0.5, F, 0.46, white, {
    fl: 1, cw: 0.16,
    pick: (f, c, Fn, C, side) => side === 'front' ? (c <= 1 ? [CELL.WOOD, wood] : CELL.FLOORGLASS) : side === 'back' ? CELL.WIN_BIG : (c === 0 ? [CELL.WOOD, wood] : CELL.PLAIN),
  });
  B.box(ux, F * 2.07, z + 0.04, 0.54, 0.02, 0.5, dark);
  if (e >= 4) pergola(B, ux > 0 ? -0.28 : 0.24, F * 1.07, z - 0.08, 0.2, 0.22, wood);
  B.box(ux > 0 ? -0.28 : 0.24, F * 1.07, z - 0.08, 0.2, 0.02, 0.22, '#c9b08a');
  path(B, -0.2, 0.32, 0.1, 0.3);
  B.plane(0.25, 0.016, 0.32, 0.2, 0.3, '#8e8e88');
  car(B, 0.25, 0.32, 1, r.pick(['#2b2b2b', '#e8e8e8', '#9aa0a6']));
  fence(B, e >= 5 ? 'seto' : 'muro', { sides: ['front', 'left', 'right'], gate: 0.5 });
  B.tree(-0.38, 0.38, 0.3);
  B.bush(0.0, 0.4, 0.05);
  if (e >= 5) B.palm(0.4, -0.38, 0.5);
}

// Casa campestre / colonial: muros blancos, teja, corredor con columnas, piscina.
function casaCampestre(B, e) {
  const r = B.r;
  lot(B, e);
  const white = r.pick(['#fbfaf6', '#f6f0e2', '#f3ede0']);
  const clay = r.pick(PAL.clay);
  const wood = r.pick(PAL.wood);
  const fl = e >= 6 && r() < 0.5 ? 2 : 1;
  const H = fl * F * 1.1;
  const pickC = (f, c, Fn, C, side) => (side === 'front' && f === 0 && c === 1 ? [CELL.DOOR, wood] : side === 'front' || side === 'back' ? CELL.WIN_ARCH : c % 2 ? CELL.WIN_SHUT : CELL.PLAIN);
  plinth(B, -0.1, -0.16, 0.6, 0.3, '#9a6b3f', 0.05);
  B.box(-0.1, 0, -0.16, 0.6, H, 0.3, white, { fl, cw: 0.15, pick: pickC });
  B.hip(-0.1, H, -0.16, 0.7, 0.17, 0.42, clay);
  B.box(0.27, 0, 0.02, 0.26, F * 1.1, 0.36, white, { fl: 1, cw: 0.13, pick: pickC });
  B.hip(0.27, F * 1.1, 0.02, 0.34, 0.14, 0.44, clay);
  // corredor
  columns(B, -0.38, 0.12, 0, 0.04, F * 1.02, 5, '#fbfaf6', 0.013);
  B.shed(-0.13, F * 1.02, 0.0, 0.54, 0.1, 0.0, 0.04, clay, 'z-', CELL.ROOFTILE);
  B.plane(-0.13, 0.02, 0.0, 0.54, 0.1, '#b5523b');
  if (e >= 6 || r() < 0.5) { pool(B, -0.12, 0.3, 0.36, 0.14); umbrella(B, 0.18, 0.33, '#f2f2f2'); }
  else { path(B, -0.1, 0.3, 0.1, 0.3); B.tree(-0.32, 0.32, 0.3); }
  B.palm(-0.42, 0.42, 0.62, e >= 6);
  B.palm(0.42, 0.42, 0.55);
  B.tree(0.4, -0.38, 0.32);
  B.bush(-0.42, -0.4, 0.06);
  fence(B, r() < 0.5 ? 'piedra' : 'seto', { gate: 0.16 });
}

// Residencia de lujo contemporánea: volúmenes en piedra y vidrio, piscina infinita.
function residenciaLujo(B, e) {
  const r = B.r;
  lot(B, 6);
  const stone = r.pick(PAL.stone);
  const white = '#f7f4ee';
  const dark = r.pick(PAL.dark);
  B.box(0.0, 0, -0.14, 0.76, F * 1.1, 0.4, stone, {
    fl: 1, cw: 0.19,
    pick: (f, c, Fn, C, side) => side === 'front' ? (c === 0 ? CELL.DOOR_GLASS : CELL.FLOORGLASS) : side === 'back' ? CELL.BRICK : CELL.PLAIN,
  });
  B.box(0, F * 1.1, -0.14, 0.8, 0.02, 0.44, dark);
  B.box(-0.1, F * 1.12, -0.06, 0.54, F, 0.46, white, {
    fl: 1, cw: 0.135,
    pick: (f, c, Fn, C, side) => side === 'front' ? CELL.FLOORGLASS : side === 'back' ? CELL.WIN_BIG : c === 0 ? CELL.PANEL : CELL.FLOORGLASS,
  });
  B.box(-0.1, F * 2.12, -0.06, 0.6, 0.025, 0.52, dark);
  balcony(B, -0.1, F * 1.12, 0.17, 0.5, 0.06, 'front', { glass: true });
  B.plane(0.05, 0.02, 0.2, 0.86, 0.12, r.pick(PAL.wood));
  pool(B, 0.05, 0.33, 0.62, 0.1, { water: '#2fb0e6' });
  for (const x of [-0.38, 0.38]) B.palm(x, 0.43, 0.6, true);
  B.tree(0.4, -0.4, 0.3, '#3a8a35');
  B.tree(-0.4, -0.4, 0.28, '#3a8a35');
  car(B, 0.36, -0.06, 1, r.pick(['#111', '#f2f2f2', '#7a0e14']));
  fence(B, 'muro', { color: stone, gate: 0.2 });
  lamp(B, -0.44, 0.1, 0.2);
}

// ======================= DENSIDAD MEDIA =======================

// Edificio multifamiliar popular: 3-4 pisos, locales abajo, cada piso de un color, último piso en obra.
function multifamiliar(B, e) {
  const r = B.r;
  lot(B, Math.max(1, e - 1));
  const floors = r.int(3, 4);
  const w = 0.99, d = 0.72, z = -0.04;
  const raw = r.pick(PAL.brick);
  const floorCol = Array.from({ length: floors }, () => (r() < (e <= 1 ? 0.45 : 0.75) ? wallOf(r, 2) : raw));
  B.box(0, 0, z, w, floors * F, d, raw, {
    fl: floors, cw: 0.215,
    pick: (f, c, Fn, C, side) => {
      if (side === 'front') {
        if (f === 0) return [c === 1 ? CELL.DOOR : c === C - 1 ? CELL.GARAGE : CELL.SHOP_GRILL, floorCol[0]];
        const cl = floorCol[f];
        if (cl === raw) return e <= 1 ? CELL.OBRA : CELL.BRICK_WIN;
        return [r() < 0.6 ? CELL.WIN_BARS : CELL.WIN_SLIDE, cl];
      }
      return r() < 0.35 ? CELL.BRICK_WIN : CELL.BRICK;
    },
  });
  for (let f = 1; f < floors; f++) {
    if (r() < 0.6) {
      balcony(B, r.range(-0.2, 0.2), f * F, z + d / 2, 0.3, 0.07, 'front', { rail: '#222' });
      if (r() < 0.6) laundry(B, 0, f * F + 0.18, z + d / 2 + 0.05, 0.3, 'x');
    }
    if (r() < 0.4) acUnit(B, r.range(-0.35, 0.35), f * F + 0.1, z + d / 2);
  }
  const H = floors * F;
  B.box(0, H, z, w + 0.02, 0.02, d + 0.02, '#9e9a92');
  B.box(0.18, H + 0.02, z - 0.1, 0.4, F * 0.95, 0.4, raw, { fl: 1, cw: 0.2, pick: () => CELL.OBRA, top: '#9e9a92' });
  rebar(B, -0.2, H + 0.02, z + 0.05, 0.36, 0.5, 0.13);
  tank(B, -0.3, H + 0.02, z - 0.22);
  tank(B, -0.16, H + 0.02, z - 0.22);
  antenna(B, 0.3, H + 0.02 + F * 0.95, z - 0.2);
  sign(B, -0.2, F * 0.88, z + d / 2, 0.36, 0.07, r.pick(PAL.bright), { text: '#fff' });
  if (r() < 0.5) sign(B, 0.25, F * 0.88, z + d / 2, 0.26, 0.07, r.pick(PAL.bright), { text: '#222' });
}

// Bloques de apartamentos: dos bloques de 4-5 pisos con punto fijo vidriado.
function bloques(B, e) {
  const r = B.r;
  lot(B, e);
  const floors = r.int(4, 5);
  const isBrick = e <= 3 && r() < 0.7;
  const base = isBrick ? r.pick(PAL.brick) : wallOf(r, Math.min(6, e + 1));
  for (const s of [-1, 1]) {
    const x = s * 0.225, w = 0.36, d = 0.62, z = -0.06;
    B.box(x, 0, z, w, floors * F, d, base, {
      fl: floors, cw: 0.12,
      pick: (f, c, Fn, C, side) => {
        if (side === 'front') return c === 1 ? (f === 0 ? CELL.DOOR_GLASS : CELL.CURTAIN) : winOf(r, Math.min(e, 3));
        if (side === 'back') return winOf(r, Math.min(e, 3));
        return c % 2 ? winOf(r, Math.min(e, 3)) : (isBrick ? CELL.BRICK : CELL.PLAIN);
      },
    });
    const H = floors * F;
    B.box(x, H, z, w + 0.02, 0.025, d + 0.02, '#8f8b84');
    parapet(B, x, H + 0.025, z, w, d, 0.04, shade(base, 0.9));
    tank(B, x - 0.08, H + 0.025, z - 0.18, { s: 1.2 });
    tank(B, x + 0.06, H + 0.025, z - 0.18, { s: 1.2 });
    B.box(x, H + 0.025, z + 0.1, 0.12, 0.1, 0.12, shade(base, 0.85));
  }
  B.plane(0, 0.015, 0.0, 0.08, 0.9, '#cfc6b4');
  playground(B, 0, 0.36);
  fence(B, 'reja', { sides: ['front'] });
  B.tree(-0.4, 0.4, 0.24);
  B.tree(0.4, 0.4, 0.24);
}

// Edificio de apartamentos: 5-6 pisos, balcones, lobby y garaje.
function edificio(B, e) {
  const r = B.r;
  lot(B, e);
  const floors = r.int(5, 6);
  const w = 0.8, d = 0.68, z = -0.06;
  const paint = wallOf(r, e);
  const accent = e <= 4 ? r.pick(PAL.brick) : r.pick(PAL.dark);
  const win = winOf(r, e);
  B.box(0, 0, z, w, floors * F, d, paint, {
    fl: floors, cw: 0.2,
    pick: (f, c, Fn, C, side) => {
      const edge = c === 0 || c === C - 1;
      if (side === 'front') {
        if (f === 0) return c === 1 ? CELL.DOOR_GLASS : c === C - 1 ? [CELL.GARAGE, accent] : [CELL.WIN_BIG, accent];
        if (edge) return [CELL.WIN_SLIDE, accent];
        return e >= 5 ? CELL.BALCONY_GLASS : CELL.BALCONY;
      }
      if (edge) return [side === 'back' ? win : CELL.PLAIN, accent];
      return side === 'back' || c % 2 ? win : CELL.PLAIN;
    },
  });
  for (let f = 1; f < floors; f++) balcony(B, 0, f * F, z + d / 2, w * 0.5, 0.08, 'front', e >= 5 ? { glass: true } : { rail: '#333' });
  const H = floors * F;
  B.box(0, H, z, w + 0.03, 0.025, d + 0.03, shade(accent, 0.9));
  B.box(-0.18, H + 0.025, z - 0.12, 0.2, 0.12, 0.2, paint);
  tank(B, 0.2, H + 0.025, z - 0.15);
  if (e >= 5) { pergola(B, 0.12, H + 0.025, z + 0.12, 0.3, 0.2, r.pick(PAL.wood)); hvac(B, -0.2, H + 0.145, z - 0.12); }
  else antenna(B, 0.25, H + 0.025, z + 0.1);
  B.box(0, 0, z + d / 2 + 0.06, 0.24, 0.015, 0.12, accent);
  fence(B, e >= 4 ? 'seto' : 'reja', { sides: ['front'], gate: 0.3 });
  B.tree(-0.38, 0.4, 0.26);
  if (e >= 4) B.tree(0.38, 0.4, 0.26);
}

// Conjunto residencial cerrado: bloques en L alrededor de zona común (de VIS a lujo).
function conjunto(B, e) {
  const r = B.r;
  lot(B, Math.max(2, e));
  const floors = e <= 2 ? 4 : e <= 4 ? r.int(4, 5) : r.int(3, 5);
  const isBrick = e <= 3 ? r() < 0.75 : e === 4 ? r() < 0.4 : false;
  const base = isBrick ? r.pick(PAL.brick) : wallOf(r, e);
  const trim = e >= 5 ? r.pick(PAL.dark) : isBrick ? '#e8e2d6' : shade(base, 0.8);
  const win = e <= 2 ? CELL.WIN_SLIDE : winOf(r, e);
  const pick = (f, c, Fn, C, side) => {
    if (side === 'front' || side === 'back') return e >= 5 && f > 0 && c % 2 ? CELL.BALCONY_GLASS : win;
    return c % 2 ? win : isBrick ? CELL.BRICK : CELL.PLAIN;
  };
  const H = floors * F;
  B.box(0, 0, -0.3, 0.88, H, 0.28, base, { fl: floors, cw: 0.176, pick });
  B.box(-0.3, 0, 0.12, 0.28, H, 0.5, base, { fl: floors, cw: 0.167, pick: (f, c, Fn, C, side) => pick(f, c, Fn, C, side === 'right' ? 'front' : side) });
  for (const [x, z, w, d] of [[0, -0.3, 0.88, 0.28], [-0.3, 0.12, 0.28, 0.5]]) {
    B.box(x, H, z, w + 0.02, 0.025, d + 0.02, trim);
    tank(B, x + w * 0.3, H + 0.025, z, { color: e <= 3 ? '#1d1d1d' : '#d8d8d8' });
  }
  if (e >= 5) for (let f = 1; f < floors; f++) balcony(B, 0.1, f * F, -0.16, 0.6, 0.06, 'front', { glass: true });
  // zona común
  if (e >= 4) {
    pool(B, 0.17, 0.08, 0.3, 0.18);
    B.plane(0.17, 0.014, 0.08, 0.48, 0.34, '#d9d2c0');
    if (e >= 5) { B.palm(0.4, -0.06, 0.55); B.palm(0.4, 0.3, 0.5); umbrella(B, 0.0, 0.22, '#ffffff'); }
    else B.tree(0.4, 0.3, 0.28);
  } else {
    playground(B, 0.16, 0.1);
    B.tree(0.38, -0.05, 0.26);
    B.plane(0.16, 0.014, 0.38, 0.5, 0.1, '#bdbdb5');
    car(B, 0.05, 0.38, 0); car(B, 0.3, 0.38, 0);
  }
  fence(B, e >= 4 ? 'seto' : 'reja', { gate: 0.14 });
  // portería
  B.box(-0.05, 0, 0.42, 0.1, 0.12, 0.08, e >= 5 ? '#f4f1ea' : '#e8e2d6', { pick: () => CELL.WIN_BIG, fl: 1, cw: 0.1, top: trim });
}

// Edificio boutique: terrazas escalonadas con jardineras, madera y vidrio.
function boutique(B, e) {
  const r = B.r;
  lot(B, e);
  const floors = r.int(5, 6);
  const white = wallOf(r, e), wood = r.pick(PAL.wood), dark = r.pick(PAL.dark);
  B.box(0, 0, -0.04, 0.82, F, 0.72, dark, { fl: 1, cw: 0.2, pick: (f, c, Fn, C, side) => side === 'front' ? (c === 1 ? CELL.DOOR_GLASS : CELL.FLOORGLASS) : CELL.PANEL });
  for (let f = 1; f < floors; f++) {
    const d = 0.72 - f * 0.05;
    const z = -0.04 - (0.72 - d) / 2;
    B.box(0, f * F, z, 0.8, F, d, white, {
      fl: 1, cw: 0.16,
      pick: (ff, c, Fn, C, side) => side === 'front' ? (c === 0 || c === C - 1 ? [CELL.WOOD, wood] : CELL.FLOORGLASS) : side === 'back' ? CELL.WIN_BIG : c % 2 ? CELL.FLOORGLASS : [CELL.WOOD, wood],
    });
    B.box(0, f * F, z + d / 2 + 0.025, 0.8, 0.05, 0.05, '#e6e0d4', { roofCell: CELL.GREEN, top: '#7cb85d' });
    B.box(0, f * F + 0.05, z + d / 2 + 0.024, 0.8, 0.03, 0.004, '#a9d3e6');
  }
  const H = floors * F;
  const dt = 0.72 - (floors - 1) * 0.05;
  B.box(0, H, -0.04 - (0.72 - dt) / 2, 0.82, 0.02, dt + 0.02, dark);
  roofPool(B, 0.15, H + 0.02, -0.2, 0.3, 0.14);
  pergola(B, -0.22, H + 0.02, -0.2, 0.26, 0.22, wood);
  B.tree(-0.38, 0.42, 0.28, '#3a8a35');
  B.tree(0.38, 0.42, 0.28, '#3a8a35');
  fence(B, 'seto', { sides: ['front'], gate: 0.3 });
}
// pool() del techo a la altura correcta
function roofPool(B, x, y, z, w, d) {
  B.box(x, y, z, w + 0.04, 0.025, d + 0.04, '#e9ecef');
  B.plane(x, y + 0.027, z, w, d, '#3fb8e8');
}

// ======================= ALTA DENSIDAD =======================
const FT = 0.23; // piso en torres

// Torre popular: bloque laminar de concreto, tanques, aires acondicionados y ropa en balcones.
function torrePopular(B, e) {
  const r = B.r;
  lot(B, Math.max(2, e));
  const floors = r.int(10, 13);
  const w = 0.78, d = 0.5, z = -0.04;
  const base = e <= 1 ? r.pick(['#b8b0a2', '#a9a59c', '#c4b49a']) : wallOf(r, Math.min(e + 1, 4));
  const stripe = e <= 2 ? r.pick(PAL.bright) : shade(base, 0.82);
  const cellBase = e <= 1 ? CELL.STAIN : CELL.PANEL;
  B.box(0, 0, z, w, floors * FT, d, base, {
    fl: floors, cw: 0.13,
    pick: (f, c, Fn, C, side) => {
      if (side === 'front' || side === 'back') {
        if (f === 0) return side === 'front' && c === 3 ? CELL.DOOR_GLASS : CELL.SHOP_GRILL;
        if (c === 0 || c === C - 1) return [cellBase, stripe];
        return e <= 1 ? (r() < 0.6 ? CELL.WIN_BARS : CELL.OBRA) : r() < 0.8 ? CELL.WIN_SLIDE : CELL.BALCONY;
      }
      return c === 1 ? CELL.WIN_SLIDE : cellBase;
    },
  });
  for (let f = 1; f < floors; f++) {
    if (r() < 0.45) acUnit(B, r.range(-0.3, 0.3), f * FT + 0.08, z + d / 2);
    if (r() < 0.3) laundry(B, r.range(-0.2, 0.2), f * FT + 0.17, z + d / 2 + 0.03, 0.2, 'x');
    if (r() < 0.3) acUnit(B, r.range(-0.3, 0.3), f * FT + 0.08, z - d / 2, 'back');
  }
  const H = floors * FT;
  B.box(0, H, z, w + 0.02, 0.03, d + 0.02, '#8f8b84');
  for (const x of [-0.25, 0.25]) { B.box(x, H + 0.03, z, 0.18, 0.12, 0.18, '#bdb7ab'); tank(B, x, H + 0.15, z, { s: 1.4 }); }
  antenna(B, 0, H + 0.03, z - 0.1, 0.3);
  dish(B, 0.05, H + 0.03, z + 0.15);
  B.plane(0, 0.015, 0.36, 0.9, 0.2, '#9a968e');
  car(B, -0.25, 0.37, 0); car(B, 0.2, 0.37, 0);
}

// Torre con balcones corridos y podio comercial.
function torreBalcones(B, e) {
  const r = B.r;
  lot(B, e);
  const floors = r.int(14, 18);
  const w = 0.6, d = 0.56;
  const body = wallOf(r, e);
  const dark = r.pick(PAL.dark);
  B.box(0, 0, 0, 0.88, FT * 2, 0.86, dark, { fl: 2, cw: 0.22, pick: (f, c, Fn, C, side) => (f === 0 ? (side === 'front' && c === 1 ? CELL.DOOR_GLASS : CELL.SHOP) : CELL.CURTAIN_SPAN) });
  B.box(0, FT * 2, 0, 0.9, 0.02, 0.88, '#d6d0c4', { roofCell: CELL.PANEL });
  const y0 = FT * 2 + 0.02;
  B.box(0, y0, 0, w, floors * FT, d, body, {
    fl: floors, cw: 0.15,
    pick: (f, c, Fn, C, side) => (side === 'front' || side === 'back' ? (e >= 5 ? CELL.BALCONY_GLASS : CELL.BALCONY) : c === 0 || c === C - 1 ? CELL.PLAIN : CELL.WIN_BIG),
  });
  for (let f = 1; f <= floors; f++) {
    const y = y0 + f * FT - 0.005;
    B.box(0, y - 0.015, d / 2 + 0.035, w + 0.04, 0.015, 0.07, '#e0dbd2');
    B.box(0, y - 0.015, -d / 2 - 0.035, w + 0.04, 0.015, 0.07, '#e0dbd2');
    if (e >= 5) { B.box(0, y, d / 2 + 0.068, w + 0.04, 0.06, 0.004, '#a9d3e6'); B.box(0, y, -d / 2 - 0.068, w + 0.04, 0.06, 0.004, '#a9d3e6'); }
  }
  const H = y0 + floors * FT;
  B.box(0, H, 0, w - 0.12, 0.14, d - 0.12, body, { pick: () => CELL.VENT, fl: 1, cw: 0.16, top: '#8f8b84' });
  hvac(B, 0.1, H + 0.14, 0);
  antenna(B, -0.12, H + 0.14, 0.05, 0.25);
  B.tree(-0.38, 0.4, 0.26); B.tree(0.38, 0.4, 0.26);
}

// Torre de vidrio: muro cortina, aletas verticales, corona iluminada y aguja.
function torreVidrio(B, e) {
  const r = B.r;
  lot(B, 6);
  const floors = r.int(22, 30);
  const tint = r.pick(PAL.glass);
  const fin = r.pick(['#d9dde0', '#2e3a46', '#c9a24d']);
  const w = 0.56;
  B.plane(0, 0.016, 0, 0.92, 0.92, '#bfc3c7');
  B.box(0, 0, 0, 0.8, FT * 1.5, 0.8, '#2e3a46', { fl: 1, cw: 0.2, pick: (f, c, Fn, C, side) => (side === 'front' && c === 1 ? CELL.DOOR_GLASS : CELL.FLOORGLASS) });
  B.box(0, FT * 1.5, 0, 0.84, 0.03, 0.84, '#d9dde0', { roofCell: CELL.GREEN });
  const y0 = FT * 1.5 + 0.03;
  B.box(0, y0, 0, w, floors * FT, w, tint, { fl: floors, cw: 0.093, pick: () => CELL.CURTAIN });
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B.box(a * (w / 2), y0, b * (w / 2), 0.03, floors * FT + 0.06, 0.03, fin);
  for (let i = -2; i <= 2; i++) { B.box(i * 0.11, y0, w / 2 + 0.008, 0.008, floors * FT, 0.016, fin); B.box(i * 0.11, y0, -w / 2 - 0.008, 0.008, floors * FT, 0.016, fin); }
  const H = y0 + floors * FT;
  B.box(0, H, 0, w - 0.06, 0.2, w - 0.06, tint, { fl: 1, cw: 0.1, pick: () => CELL.FLOORGLASS, top: '#33414d' });
  B.box(0, H + 0.2, 0, w - 0.2, 0.15, w - 0.2, '#33414d');
  B.cyl(0, H + 0.35, 0, 0.018, 0.7, '#d9dde0', 6, 0.004);
  B.sphere(0, H + 1.05, 0, 0.012, '#ff3b30');
  B.palm(-0.43, 0.43, 0.6, true); B.palm(0.43, 0.43, 0.6, true);
  B.palm(-0.43, -0.43, 0.6, true); B.palm(0.43, -0.43, 0.6, true);
}

// Torres gemelas sobre podio común.
function torresGemelas(B, e) {
  const r = B.r;
  lot(B, Math.max(2, e));
  const floors = e <= 2 ? r.int(12, 14) : r.int(14, 20);
  const body = e <= 2 ? r.pick(PAL.brick) : wallOf(r, e);
  const isBrick = e <= 2;
  const accent = e >= 5 ? r.pick(PAL.dark) : e >= 3 ? r.pick(PAL.brick) : '#e8e2d6';
  B.box(0, 0, 0, 0.9, FT * 2, 0.9, e >= 4 ? '#3b3f45' : '#9a968e', {
    fl: 2, cw: 0.225, pick: (f, c, Fn, C, side) => (f === 0 && side === 'front' ? (c === 1 || c === 2 ? CELL.DOOR_GLASS : CELL.GARAGE) : CELL.VENT),
  });
  B.box(0, FT * 2, 0, 0.92, 0.02, 0.92, '#cfc9bd');
  const y0 = FT * 2 + 0.02;
  for (const s of [-1, 1]) {
    const x = s * 0.22, z = -s * 0.04;
    B.box(x, y0, z, 0.34, floors * FT, 0.4, body, {
      fl: floors, cw: 0.113,
      pick: (f, c, Fn, C, side) => {
        if (c === 1 && (side === 'left' || side === 'right')) return [CELL.PLAIN, accent];
        if (e >= 5) return side === 'front' || side === 'back' ? CELL.BALCONY_GLASS : CELL.FLOORGLASS;
        return isBrick ? (c % 2 ? CELL.WIN_SLIDE : CELL.BRICK_WIN) : winOf(r, Math.min(e, 4));
      },
    });
    const H = y0 + floors * FT;
    B.box(x, H, z, 0.36, 0.025, 0.42, accent);
    B.box(x, H + 0.025, z, 0.16, 0.12, 0.16, shade(body, 0.85));
    if (e <= 3) tank(B, x + 0.1, H + 0.025, z + 0.1, { s: 1.3 });
  }
  if (e >= 4) { roofPool(B, 0.0, y0, 0.3, 0.3, 0.14); B.palm(-0.38, 0.36, 0.4, false, y0); }
  else playground(B, 0.0, 0.0);
  B.tree(0.4, 0.42, 0.22);
}

// Torre escalonada con terrazas ajardinadas.
function torreEscalonada(B, e) {
  const r = B.r;
  lot(B, e);
  const body = wallOf(r, e), dark = r.pick(PAL.dark), wood = r.pick(PAL.wood);
  const tiers = [[0.76, 0.7, r.int(6, 9)], [0.6, 0.56, r.int(5, 7)], [0.44, 0.42, r.int(4, 6)]];
  let y = 0;
  tiers.forEach(([w, d, fl], i) => {
    B.box(0, y, -0.02, w, fl * FT, d, i === 0 ? body : i === 1 ? body : dark, {
      fl, cw: 0.13,
      pick: (f, c, Fn, C, side) => (i === 0 && f === 0 && side === 'front' ? (c === 2 ? CELL.DOOR_GLASS : CELL.SHOP) : i === 2 ? CELL.CURTAIN : side === 'front' || side === 'back' ? CELL.BALCONY_GLASS : c % 3 === 0 ? [CELL.WOOD, wood] : CELL.FLOORGLASS),
    });
    y += fl * FT;
    B.box(0, y, -0.02, w + 0.02, 0.02, d + 0.02, '#d6d0c4');
    if (i < 2) {
      const nw = tiers[i + 1][0], nd = tiers[i + 1][1];
      B.box(0, y + 0.02, -0.02 + nd / 2 + (d - nd) / 4, w - 0.02, 0.04, (d - nd) / 2 - 0.02, '#e6e0d4', { roofCell: CELL.GREEN, top: '#7cb85d' });
      B.tree(-w / 2 + 0.06, -0.02 + d / 2 - 0.04, 0.16, '#3a8a35', y + 0.02);
      B.tree(w / 2 - 0.06, -0.02 + d / 2 - 0.04, 0.16, '#3a8a35', y + 0.02);
      void nw;
    }
    y += 0.02;
  });
  B.box(0, y, -0.02, 0.24, 0.16, 0.24, dark, { pick: () => CELL.VENT, fl: 1, cw: 0.12 });
  B.cyl(0, y + 0.16, -0.02, 0.012, 0.4, '#d9dde0', 6, 0.004);
  B.tree(-0.4, 0.42, 0.26, '#3a8a35'); B.tree(0.4, 0.42, 0.26, '#3a8a35');
}

// ======================= CATÁLOGO =======================
export const RES_TYPES = {
  autoconstruccion: { name: 'Vivienda de autoconstrucción', fn: autoconstruccion, pop: 1.2 },
  casaBarrio: { name: 'Casa de barrio', fn: casaBarrio, pop: 1 },
  casasAdosadas: { name: 'Casas adosadas', fn: casasAdosadas, pop: 1.5 },
  casaModerna: { name: 'Casa moderna', fn: casaModerna, pop: 0.9 },
  casaCampestre: { name: 'Casa campestre', fn: casaCampestre, pop: 0.8 },
  residenciaLujo: { name: 'Residencia contemporánea', fn: residenciaLujo, pop: 0.7 },
  multifamiliar: { name: 'Edificio multifamiliar', fn: multifamiliar, pop: 1.1 },
  bloques: { name: 'Bloques de apartamentos', fn: bloques, pop: 1.2 },
  edificio: { name: 'Edificio de apartamentos', fn: edificio, pop: 1 },
  conjunto: { name: 'Conjunto residencial', fn: conjunto, pop: 1.1 },
  boutique: { name: 'Edificio boutique', fn: boutique, pop: 0.7 },
  torrePopular: { name: 'Torre de apartamentos', fn: torrePopular, pop: 1 },
  torreBalcones: { name: 'Torre con balcones', fn: torreBalcones, pop: 1.1 },
  torreVidrio: { name: 'Torre de vidrio', fn: torreVidrio, pop: 1.2 },
  torresGemelas: { name: 'Torres gemelas', fn: torresGemelas, pop: 1.5 },
  torreEscalonada: { name: 'Torre escalonada', fn: torreEscalonada, pop: 1 },
};

// tipología por densidad y estrato (pesos)
const TABLE = {
  1: {
    1: [['autoconstruccion', 1]],
    2: [['autoconstruccion', 0.4], ['casaBarrio', 0.6]],
    3: [['casaBarrio', 0.5], ['casasAdosadas', 0.35], ['casaModerna', 0.15]],
    4: [['casasAdosadas', 0.3], ['casaModerna', 0.45], ['casaBarrio', 0.25]],
    5: [['casaModerna', 0.5], ['casaCampestre', 0.5]],
    6: [['casaCampestre', 0.45], ['residenciaLujo', 0.55]],
  },
  2: {
    1: [['multifamiliar', 1]],
    2: [['multifamiliar', 0.4], ['bloques', 0.3], ['conjunto', 0.3]],
    3: [['bloques', 0.3], ['edificio', 0.35], ['conjunto', 0.35]],
    4: [['edificio', 0.5], ['conjunto', 0.5]],
    5: [['edificio', 0.35], ['conjunto', 0.35], ['boutique', 0.3]],
    6: [['boutique', 0.5], ['conjunto', 0.5]],
  },
  3: {
    1: [['torrePopular', 1]],
    2: [['torrePopular', 0.6], ['torresGemelas', 0.4]],
    3: [['torreBalcones', 0.45], ['torresGemelas', 0.3], ['torrePopular', 0.25]],
    4: [['torreBalcones', 0.5], ['torresGemelas', 0.3], ['torreEscalonada', 0.2]],
    5: [['torreBalcones', 0.3], ['torreVidrio', 0.35], ['torreEscalonada', 0.35]],
    6: [['torreVidrio', 0.5], ['torreEscalonada', 0.3], ['torresGemelas', 0.2]],
  },
};

// vivienda continua de estratos 1-3 (models_row.js): reemplaza a las casas aisladas en los estratos bajos
Object.assign(RES_TYPES, ROW_TYPES, BIG_RES); // BIG_RES: lotes de 2×2 (se eligen aparte, ver game.js)
for (const [d, byE] of Object.entries(ROW_TABLE)) {
  for (const [e, list] of Object.entries(byE)) {
    const replace = (d === '1' && e <= 2) || (d === '2' && e === '1');
    TABLE[d][e] = replace ? list : [...(TABLE[d][e] || []), ...list];
  }
}

// modelos basados en las fotos de referencia
Object.assign(RES_TYPES, REF_RES);
for (const [d, byE] of Object.entries(REF_RES_TABLE)) for (const [e, list] of Object.entries(byE)) TABLE[d][e] = [...(TABLE[d][e] || []), ...list];

export function pickResType(d, e, r) {
  return pickW(TABLE[d][e])(r);
}

// habitantes base por densidad y estrato
const POP = {
  1: [7, 6, 5, 4, 4, 4],
  2: [30, 28, 26, 22, 18, 14],
  3: [120, 110, 100, 90, 75, 60],
};
export function resPop(d, e, type) {
  return Math.round(POP[d][e - 1] * (RES_TYPES[type]?.pop ?? 1));
}

void hvac; void sign; void roofPool; void umbrella;
