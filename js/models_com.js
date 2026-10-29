// Modelos comerciales. Densidad -> tipología; estrato -> categoría del comercio (popular, medio, exclusivo).
import { CELL, shade } from './geom.js';
import {
  F, PAL, lot, path, fence, tank, rebar, parapet, antenna, acUnit, hvac, awning, sign, blade, car, umbrella,
  pots, lamp, pergola, columns, pickW, laundry,
} from './kit.js';

const tierOf = (e) => (e <= 2 ? 1 : e <= 4 ? 2 : 3);

function paved(B, c = '#b9b5ab') { B.plane(0, 0.01, 0, 0.99, 0.99, c); }

function parking(B, x, z, w, d, n, axis = 'x') {
  B.plane(x, 0.014, z, w, d, '#55585c');
  for (let i = 0; i <= n; i++) {
    if (axis === 'x') B.plane(x - w / 2 + (w * i) / n, 0.016, z, 0.008, d * 0.8, '#e8e8e8');
    else B.plane(x, 0.016, z - d / 2 + (d * i) / n, w * 0.8, 0.008, '#e8e8e8');
  }
  for (let i = 0; i < n; i++) {
    if (B.r() < 0.35) continue;
    if (axis === 'x') car(B, x - w / 2 + (w * (i + 0.5)) / n, z, 1);
    else car(B, x, z - d / 2 + (d * (i + 0.5)) / n, 0);
  }
}

// ---------- BAJA ----------
// Tienda de barrio: casa con local, reja, toldo de zinc, canastas de gaseosa y mesas plásticas.
function tiendaBarrio(B, e) {
  const r = B.r;
  lot(B, Math.min(e, 2));
  const paint = r.pick(PAL.wall[2]);
  const two = r() < 0.6;
  const w = 0.8, d = 0.6, z = -0.1;
  B.box(0, 0, z, w, F, d, paint, {
    fl: 1, cw: 0.2,
    pick: (f, c, Fn, C, side) => (side === 'front' ? (c === C - 1 ? CELL.DOOR : CELL.SHOP_GRILL) : side === 'back' ? CELL.WIN_BARS : r() < 0.4 ? CELL.WIN_BARS : CELL.PLAIN),
  });
  if (two) {
    const p2 = r() < 0.5 ? paint : r.pick(PAL.brick);
    B.box(0, F, z, w, F, d, p2, { fl: 1, cw: 0.2, pick: (f, c, Fn, C, side) => (side === 'front' || side === 'back' ? CELL.WIN_BARS : p2 === paint ? CELL.PLAIN : CELL.BRICK) });
    B.box(0, 2 * F, z, w + 0.02, 0.02, d + 0.02, '#a7a39b');
    tank(B, -0.25, 2 * F + 0.02, z - 0.15);
    if (r() < 0.5) laundry(B, 0.1, 2 * F + 0.14, z, 0.4, 'x');
    balcony2(B, z + d / 2);
  } else {
    B.shed(0, F, z, w + 0.04, d + 0.04, 0.0, 0.07, r.pick(PAL.zinc), 'z-');
  }
  // alero de zinc sobre la acera del local
  B.shed(-0.08, F * 0.82, z + d / 2 + 0.08, 0.6, 0.16, 0.0, 0.03, r.pick(PAL.zinc), 'z-');
  columns(B, -0.36, 0.2, 0, z + d / 2 + 0.15, F * 0.82, 2, '#6b6b6b', 0.008);
  sign(B, -0.08, F * 0.88, z + d / 2 + 0.002, 0.5, 0.08, r.pick(PAL.bright), { text: '#fff' });
  // canastas y mesas
  for (let i = 0; i < 3; i++) B.box(0.3, 0.0 + i * 0.03, 0.32, 0.07, 0.028, 0.05, i % 2 ? '#d62828' : '#1d6fd1');
  B.cyl(-0.2, 0, 0.32, 0.05, 0.06, '#f2f2f2', 10);
  for (const [dx, dz] of [[-0.08, 0], [0.08, 0], [0, 0.08]]) B.box(-0.2 + dx, 0, 0.32 + dz, 0.035, 0.04, 0.035, '#f2f2f2');
  function balcony2(BB, zf) { BB.box(0, F, zf + 0.04, 0.4, 0.015, 0.08, '#a7a39b'); }
}

// Panadería / local con toldo de franjas y mesitas afuera.
function panaderia(B, e) {
  const r = B.r;
  paved(B, '#c7c2b6');
  const paint = r.pick(e <= 2 ? PAL.wall[2] : PAL.wall[3]);
  const c1 = r.pick(PAL.bright);
  const w = 0.82, d = 0.6, z = -0.12;
  const fl = r() < 0.5 ? 2 : 1;
  B.box(0, 0, z, w, F * 1.1, d, paint, { fl: 1, cw: 0.205, pick: (f, c, Fn, C, side) => (side === 'front' ? (c === 1 ? CELL.DOOR_GLASS : CELL.SHOP) : CELL.PLAIN) });
  if (fl === 2) {
    B.box(0, F * 1.1, z, w, F, d, shade(paint, 0.95), { fl: 1, cw: 0.205, pick: (f, c, Fn, C, side) => (side === 'side' ? CELL.PLAIN : CELL.WIN_SHUT) });
    B.gable(0, F * 2.1, z, w + 0.06, 0.14, d + 0.06, r.pick(PAL.clay), 'x', { gable: paint });
  } else {
    B.box(0, F * 1.1, z, w + 0.02, 0.02, d + 0.02, '#a7a39b');
    parapet(B, 0, F * 1.12, z, w, d, 0.06, paint);
    hvac(B, 0.15, F * 1.12, z - 0.1);
  }
  awning(B, 0, F * 0.95, z + d / 2, w, 0.14, [c1, '#ffffff']);
  sign(B, 0, F * 1.0, z + d / 2 + 0.003, 0.5, 0.06, '#ffffff', { text: c1 });
  for (const x of [-0.28, 0.0, 0.28]) {
    B.cyl(x, 0, 0.3, 0.04, 0.05, '#7a5230', 10);
    B.box(x - 0.06, 0, 0.3, 0.03, 0.035, 0.03, '#333'); B.box(x + 0.06, 0, 0.3, 0.03, 0.035, 0.03, '#333');
  }
  if (e >= 3) { pots(B, -0.42, 0.42, 3); B.tree(0.4, 0.42, 0.24); }
}

// Café / restaurante: vidrio y madera, terraza con parasoles y pérgola.
function cafe(B, e) {
  const r = B.r;
  lot(B, 5);
  const wood = r.pick(PAL.wood), dark = r.pick(PAL.dark);
  B.plane(0, 0.014, 0.18, 0.95, 0.6, '#cdbfa6', CELL.WOOD);
  B.box(0, 0, -0.18, 0.78, F * 1.25, 0.5, dark, { fl: 1, cw: 0.195, pick: (f, c, Fn, C, side) => (side === 'front' ? (c === 0 ? [CELL.WOOD, wood] : CELL.FLOORGLASS) : side === 'back' ? CELL.PANEL : [CELL.WOOD, wood]) });
  B.box(0, F * 1.25, -0.18, 0.84, 0.03, 0.56, '#e9e4d8');
  pergola(B, 0, 0, 0.18, 0.7, 0.36, wood);
  for (const [x, z] of [[-0.25, 0.12], [0.05, 0.25], [0.3, 0.1]]) umbrella(B, x, z, r.pick(['#f2f2f2', '#2a9d8f', '#e9c46a']));
  sign(B, 0, F * 1.05, 0.08, 0.36, 0.05, '#222', { text: '#f2d16b' });
  for (const x of [-0.44, 0.44]) { B.box(x, 0, 0.42, 0.06, 0.06, 0.06, '#8a8a8a'); B.bush(x, 0.42, 0.045, '#3f7f3a', 0.06); }
  B.tree(0.4, -0.4, 0.3);
}

// ---------- MEDIA ----------
// Edificio de locales: primer piso con 3-4 locales, avisos por todas partes, oficinas arriba.
function locales(B, e) {
  const r = B.r;
  paved(B, e <= 2 ? '#b3ae9f' : '#c3beb2');
  const floors = r.int(2, 3) + (e >= 3 ? 1 : 0);
  const paint = r.pick(e <= 2 ? [...PAL.wall[2], ...PAL.brick] : PAL.wall[3]);
  const w = 0.9, d = 0.74, z = -0.06;
  const cols = 4;
  B.box(0, 0, z, w, F * 1.15, d, shade(paint, 0.9), { fl: 1, cw: w / cols, pick: (f, c, Fn, C, side) => (side === 'front' ? (e <= 2 ? CELL.SHOP_GRILL : CELL.SHOP) : CELL.PLAIN) });
  B.box(0, F * 1.15, z, w, (floors - 1) * F, d, paint, {
    fl: floors - 1, cw: 0.18,
    pick: (f, c, Fn, C, side) => (side === 'front' ? (e <= 2 ? CELL.WIN_BARS : CELL.WIN_BIG) : side === 'back' ? CELL.WIN_SLIDE : c % 2 ? CELL.WIN_SLIDE : CELL.PLAIN),
  });
  const H = F * 1.15 + (floors - 1) * F;
  B.box(0, H, z, w + 0.02, 0.025, d + 0.02, '#9e9a92');
  for (let i = 0; i < cols; i++) {
    const x = -w / 2 + (i + 0.5) * (w / cols);
    const c = r.pick(PAL.bright);
    if (r() < 0.6) awning(B, x, F * 1.02, z + d / 2, w / cols - 0.01, 0.1, [c, '#ffffff']);
    sign(B, x, F * 1.05, z + d / 2 + 0.002, w / cols - 0.03, 0.07, c, { text: '#fff' });
    if (e <= 2 && r() < 0.5) blade(B, x + 0.08, F * 1.3 + r() * 0.2, z + d / 2, 0.16, r.pick(PAL.bright));
  }
  if (e <= 2) { tank(B, -0.3, H + 0.025, z - 0.2); tank(B, -0.18, H + 0.025, z - 0.2); rebar(B, 0.2, H + 0.025, z, 0.4, 0.5, 0.12); }
  else { hvac(B, 0.2, H + 0.025, z - 0.1); parapet(B, 0, H + 0.025, z, w, d, 0.05, paint); }
  for (let f = 1; f < floors; f++) if (r() < 0.5) acUnit(B, r.range(-0.35, 0.35), F * 1.15 + (f - 1) * F + 0.12, z + d / 2);
  lamp(B, -0.45, 0.45); lamp(B, 0.45, 0.45);
}

// Plazoleta comercial: locales en L con marquesina y parqueadero.
function plazoleta(B, e) {
  const r = B.r;
  paved(B, '#c3beb2');
  const paint = r.pick(PAL.wall[4]);
  const accent = r.pick(PAL.bright);
  B.box(0, 0, -0.32, 0.92, F * 1.2, 0.3, paint, { fl: 1, cw: 0.184, pick: (f, c, Fn, C, side) => (side === 'front' ? CELL.SHOP : CELL.PLAIN) });
  B.box(-0.33, 0, 0.1, 0.26, F * 1.2, 0.54, paint, { fl: 1, cw: 0.18, pick: (f, c, Fn, C, side) => (side === 'right' ? CELL.SHOP : CELL.PLAIN) });
  B.box(0, F * 1.2, -0.32, 0.94, 0.04, 0.32, accent);
  B.box(-0.33, F * 1.2, 0.1, 0.28, 0.04, 0.56, accent);
  B.box(0.12, F * 0.95, -0.12, 0.7, 0.02, 0.1, '#e6e6e6');
  columns(B, -0.18, 0.44, 0, -0.07, F * 0.95, 4, '#cfcfcf', 0.01);
  for (let i = 0; i < 5; i++) sign(B, -0.37 + i * 0.184, F * 1.2 + 0.04, -0.17 + 0.002, 0.15, 0.06, r.pick(PAL.bright), { text: '#fff' });
  parking(B, 0.15, 0.2, 0.6, 0.4, 5);
  hvac(B, 0.2, F * 1.24, -0.35); hvac(B, -0.2, F * 1.24, -0.35);
  B.cyl(0.45, 0, 0.45, 0.01, 0.5, '#555', 5);
  B.box(0.45, 0.5, 0.45, 0.02, 0.14, 0.12, accent, { pick: () => CELL.SIGN, fl: 1, cw: 0.12 });
}

// Edificio de oficinas de 5-6 pisos con franjas de vidrio.
function oficinas(B, e) {
  const r = B.r;
  lot(B, Math.max(4, e));
  const floors = r.int(5, 7);
  const panel = r.pick(['#e9e6df', '#d7d3cb', '#2e3a46', '#b8b1a4']);
  const tint = r.pick(PAL.glass);
  B.plane(0, 0.014, 0.36, 0.95, 0.24, '#d6d0c4');
  B.box(0, 0, -0.06, 0.82, F * 1.3, 0.64, '#2e3a46', { fl: 1, cw: 0.205, pick: (f, c, Fn, C, side) => (side === 'front' && c === 1 ? CELL.DOOR_GLASS : CELL.FLOORGLASS) });
  B.box(0, F * 1.3, -0.06, 0.84, (floors - 1) * F, 0.66, tint, {
    fl: floors - 1, cw: 0.14,
    pick: (f, c, Fn, C, side) => (c === 0 || c === C - 1 ? [CELL.PANEL, panel] : CELL.CURTAIN_SPAN),
  });
  const H = F * 1.3 + (floors - 1) * F;
  B.box(0, H, -0.06, 0.86, 0.04, 0.68, panel);
  B.box(0, H + 0.04, -0.1, 0.4, 0.12, 0.3, panel, { pick: () => CELL.VENT, fl: 1, cw: 0.13 });
  sign(B, 0, H - 0.1, 0.27 + 0.006, 0.36, 0.07, r.pick(['#1d4e9a', '#d62828', '#2a9d8f']), { text: '#fff' });
  B.box(0, F * 1.0, 0.31, 0.4, 0.02, 0.12, panel);
  for (const x of [-0.38, 0.38]) B.tree(x, 0.4, 0.24);
}

// ---------- ALTA ----------
// "San Andresito": centro de comercio popular de varios pisos, lleno de avisos y pendones.
function sanandresito(B, e) {
  const r = B.r;
  paved(B, '#a9a59a');
  const floors = r.int(4, 5);
  const base = r.pick(['#e0d7c3', '#cfc6b0', '#d9cfba']);
  const w = 0.94, d = 0.9;
  B.box(0, 0, 0, w, floors * F, d, base, {
    fl: floors, cw: 0.157,
    pick: (f, c, Fn, C, side) => (f === 0 ? CELL.SHOP_GRILL : side === 'front' ? (r() < 0.5 ? [CELL.SIGN, r.pick(PAL.bright)] : CELL.WIN_SLIDE) : r() < 0.4 ? CELL.WIN_SLIDE : CELL.STAIN),
  });
  const H = floors * F;
  B.box(0, H, 0, w + 0.02, 0.03, d + 0.02, '#9e9a92');
  for (let i = 0; i < 6; i++) blade(B, -0.4 + i * 0.16, F + r() * F * (floors - 2), d / 2, F * r.range(0.8, 1.6), r.pick(PAL.bright));
  // valla publicitaria en la azotea
  B.box(0.0, H + 0.03, -0.1, 0.02, 0.18, 0.02, '#555');
  B.box(-0.2, H + 0.03, -0.1, 0.02, 0.18, 0.02, '#555');
  B.box(0.2, H + 0.03, -0.1, 0.02, 0.18, 0.02, '#555');
  sign(B, 0, H + 0.2, -0.1, 0.7, 0.2, r.pick(PAL.bright), { text: '#fff' });
  for (const x of [-0.35, 0.35]) tank(B, x, H + 0.03, -0.3, { s: 1.4 });
  awning(B, 0, F * 0.95, d / 2, w, 0.08, [r.pick(PAL.bright), '#fff', r.pick(PAL.bright)]);
}

// Centro comercial: gran volumen con fachada de paneles, atrio de vidrio abovedado y parqueadero.
function centroComercial(B, e) {
  const r = B.r;
  paved(B, '#c3beb2');
  const panel = r.pick(['#e9e6df', '#d9d4c8', '#cfd6dc']);
  const accent = r.pick(['#d62828', '#1d4e9a', '#2a9d8f', '#f4a261', '#8338ec']);
  B.box(0, 0, -0.16, 0.92, F * 3, 0.62, panel, {
    fl: 3, cw: 0.23,
    pick: (f, c, Fn, C, side) => (side === 'front' ? (f === 0 ? CELL.SHOP : CELL.PANEL) : f === 0 && side !== 'back' ? CELL.SHOP : CELL.PANEL),
  });
  B.box(0, F * 3, -0.16, 0.94, 0.03, 0.64, '#9e9a92');
  // atrio
  B.box(0, 0, 0.15, 0.32, F * 2.4, 0.06, '#9fc6dc', { fl: 2, cw: 0.08, pick: () => CELL.CURTAIN });
  B.vault(0, F * 2.4, 0.15, 0.32, 0.08, 0.1, '#bfe0f0', 'z', CELL.GLASS_ROOF, 8);
  B.box(0, F * 2.4 + 0.1, 0.17, 0.5, 0.12, 0.02, accent, { pick: () => CELL.SIGN, fl: 1, cw: 0.5 });
  for (const x of [-0.3, 0.3]) sign(B, x, F * 2.1, 0.15, 0.2, 0.08, '#fff', { text: accent });
  hvac(B, -0.25, F * 3 + 0.03, -0.25); hvac(B, 0.0, F * 3 + 0.03, -0.3); hvac(B, 0.28, F * 3 + 0.03, -0.25);
  parking(B, 0, 0.36, 0.9, 0.22, 7);
  lamp(B, -0.45, 0.25, 0.3); lamp(B, 0.45, 0.25, 0.3);
}

// Torre de oficinas de vidrio con podio y corona con aviso.
function torreOficinas(B, e) {
  const r = B.r;
  lot(B, 6);
  const floors = r.int(18, 26);
  const FT = 0.23;
  const tint = r.pick(['#7fa8c4', '#6f9fb2', '#8fb4c9', '#5f8096']);
  const fin = r.pick(['#2e3a46', '#d9dde0']);
  B.plane(0, 0.014, 0, 0.95, 0.95, '#c9c4b8');
  B.box(0, 0, 0, 0.82, FT * 2, 0.82, '#2e3a46', { fl: 2, cw: 0.205, pick: (f, c, Fn, C, side) => (f === 0 && side === 'front' && c === 1 ? CELL.DOOR_GLASS : CELL.FLOORGLASS) });
  B.box(0, FT * 2, 0, 0.84, 0.03, 0.84, fin);
  const y0 = FT * 2 + 0.03;
  B.box(0, y0, 0, 0.6, floors * FT, 0.6, tint, { fl: floors, cw: 0.1, pick: () => CELL.CURTAIN_SPAN });
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B.box(a * 0.3, y0, b * 0.3, 0.035, floors * FT + 0.1, 0.035, fin);
  const H = y0 + floors * FT;
  B.box(0, H, 0, 0.62, 0.05, 0.62, fin);
  B.box(0, H + 0.05, 0, 0.5, 0.22, 0.5, '#33414d', { pick: () => CELL.VENT, fl: 1, cw: 0.125 });
  sign(B, 0, H + 0.08, 0.25, 0.34, 0.12, r.pick(['#1d4e9a', '#d62828', '#ffffff']), { text: '#ffd166' });
  B.palm(-0.43, 0.43, 0.6, true); B.palm(0.43, 0.43, 0.6, true);
}

// Hotel: torre con balcones, aviso vertical, marquesina de llegada y piscina.
function hotel(B, e) {
  const r = B.r;
  lot(B, Math.max(4, e));
  const floors = r.int(12, 16);
  const FT = 0.23;
  const body = r.pick(['#f1ece2', '#e9dccb', '#d9e4e8']);
  const accent = r.pick(['#1d4e9a', '#7a0e14', '#2a9d8f', '#c9a24d']);
  B.box(0, 0, -0.12, 0.86, FT * 2, 0.66, '#2e3a46', { fl: 2, cw: 0.215, pick: (f, c, Fn, C, side) => (f === 0 && side === 'front' && (c === 1 || c === 2) ? CELL.DOOR_GLASS : CELL.FLOORGLASS) });
  B.box(0, FT * 2, -0.12, 0.88, 0.03, 0.68, '#d6d0c4');
  const y0 = FT * 2 + 0.03;
  B.box(-0.08, y0, -0.18, 0.62, floors * FT, 0.42, body, {
    fl: floors, cw: 0.124,
    pick: (f, c, Fn, C, side) => (side === 'front' || side === 'back' ? CELL.BALCONY : c === 1 ? [CELL.PLAIN, accent] : CELL.WIN_BIG),
  });
  const H = y0 + floors * FT;
  B.box(-0.08, H, -0.18, 0.66, 0.05, 0.46, accent);
  B.box(-0.08, H + 0.05, -0.18, 0.3, 0.12, 0.2, body);
  B.box(0.25, y0 + FT, 0.03, 0.03, FT * (floors - 2), 0.1, accent, { pick: () => CELL.SIGN, fl: floors - 2, cw: 0.1 });
  B.box(0, FT * 1.1, 0.3, 0.4, 0.025, 0.2, accent);
  columns(B, -0.18, 0.18, 0, 0.38, FT * 1.1, 2, '#e8e8e8', 0.012);
  B.plane(0, 0.014, 0.33, 0.6, 0.28, '#d6d0c4');
  B.box(0.3, FT * 2 + 0.03, -0.1, 0.24, 0.025, 0.2, '#e9ecef');
  B.plane(0.3, FT * 2 + 0.057, -0.1, 0.2, 0.16, '#3fb8e8');
  B.palm(-0.43, 0.43, 0.55); B.palm(0.43, 0.43, 0.55);
}

export const COM_TYPES = {
  tiendaBarrio: { name: 'Tienda de barrio', fn: tiendaBarrio, jobs: 1 },
  panaderia: { name: 'Panadería y local', fn: panaderia, jobs: 1.1 },
  cafe: { name: 'Café restaurante', fn: cafe, jobs: 1.2 },
  locales: { name: 'Edificio de locales', fn: locales, jobs: 1 },
  plazoleta: { name: 'Plazoleta comercial', fn: plazoleta, jobs: 1 },
  oficinas: { name: 'Edificio de oficinas', fn: oficinas, jobs: 1.3 },
  sanandresito: { name: 'Centro de comercio popular', fn: sanandresito, jobs: 1.1 },
  centroComercial: { name: 'Centro comercial', fn: centroComercial, jobs: 1.2 },
  torreOficinas: { name: 'Torre de oficinas', fn: torreOficinas, jobs: 1.5 },
  hotel: { name: 'Hotel', fn: hotel, jobs: 0.9 },
};

const TABLE = {
  1: { 1: [['tiendaBarrio', 1]], 2: [['tiendaBarrio', 0.45], ['panaderia', 0.55]], 3: [['cafe', 0.65], ['panaderia', 0.35]] },
  2: { 1: [['locales', 1]], 2: [['locales', 0.4], ['plazoleta', 0.4], ['oficinas', 0.2]], 3: [['oficinas', 0.6], ['plazoleta', 0.4]] },
  3: { 1: [['sanandresito', 1]], 2: [['centroComercial', 0.6], ['hotel', 0.4]], 3: [['torreOficinas', 0.6], ['hotel', 0.2], ['centroComercial', 0.2]] },
};
export function pickComType(d, e, r) { return pickW(TABLE[d][tierOf(e)])(r); }
export const COM_JOBS = { 1: 10, 2: 40, 3: 140 };
export { tierOf };

void path; void antenna; void tank;
