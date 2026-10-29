// Catálogo de edificios: 6 estratos residenciales, comercio, servicios públicos y transporte.
import * as THREE from '../vendor/three.module.min.js';
import { Builder, rng } from './geom.js';

export const ESTRATOS = [
  { id: 1, name: 'Estrato 1', sub: 'Invasión / tugurio', color: '#e5484d', req: 0, cost: 800 },
  { id: 2, name: 'Estrato 2', sub: 'Casa popular', color: '#f08a24', req: 0, cost: 1000 },
  { id: 3, name: 'Estrato 3', sub: 'Barrio de clase media', color: '#f2d024', req: 1, cost: 1400 },
  { id: 4, name: 'Estrato 4', sub: 'Conjunto residencial', color: '#6cc04a', req: 2, cost: 1900 },
  { id: 5, name: 'Estrato 5', sub: 'Torres de apartamentos', color: '#2f9bd6', req: 3, cost: 2600 },
  { id: 6, name: 'Estrato 6', sub: 'Mansiones y rascacielos', color: '#9b5de5', req: 4, cost: 3800 },
];
export const COMERCIAL = { id: 'c', name: 'Comercio', sub: 'Tiendas, locales y centros comerciales', color: '#ff5ca8', cost: 1500 };

// población por [estrato][nivel]
export const POP = {
  1: [5, 9, 14], 2: [4, 7, 10], 3: [6, 12, 20], 4: [20, 36, 52], 5: [40, 66, 95], 6: [4, 7, 11],
};
export const POP_TOWER6 = [60, 120, 200];
export const TAX = { 1: -4, 2: 5, 3: 12, 4: 30, 5: 60, 6: 105 }; // COP por habitante por tick (estrato 1 recibe subsidio)
export const JOBS_COM = [15, 50, 160];

export const SERVICES = {
  seguridad: { name: 'Seguridad', icon: '🚓' },
  bomberos: { name: 'Bomberos', icon: '🚒' },
  educacion: { name: 'Educación', icon: '🎓' },
  salud: { name: 'Salud', icon: '🏥' },
  recreacion: { name: 'Recreación', icon: '⚽' },
  cultura: { name: 'Cultura', icon: '⛪' },
  mercado: { name: 'Mercado', icon: '🧺' },
  transporte: { name: 'Transporte', icon: '🚌' },
};

const PASTEL = ['#f4d35e', '#8fd694', '#f4a6b8', '#8ecae6', '#f7b267', '#e9c46a', '#cdb4db', '#ffd6a5', '#a8dadc', '#ef8354', '#f28482'];
const F = 0.28; // altura de piso

function shuffle(arr, r) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---------- ESTRATO 1: invasión ----------
function genE1(B, r, level) {
  B.plane(0, 0.012, 0, 0.98, 0.98, '#9b8a6a');
  const walls = ['#c97b4a', '#b8b2a3', '#a9744f', '#d9c4a0', '#6fa3b5', '#c46a6a', '#8fa86a', '#e0a458'];
  const zinc = ['#9aa0a6', '#a8602f', '#7d848b', '#b5b9bd'];
  const spots = shuffle([[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]], r);
  const n = [r.int(2, 3), 4, 4][level - 1];
  for (let i = 0; i < n; i++) {
    const [sx, sz] = spots[i];
    const w = r.range(0.34, 0.46), d = r.range(0.34, 0.46);
    const floors = level === 1 ? r.int(1, 2) : level === 2 ? r.int(1, 3) : r.int(2, 4);
    const h = floors * 0.25 + r.range(0, 0.04);
    const x = sx + r.range(-0.03, 0.03), z = sz + r.range(-0.03, 0.03);
    B.box(x, 0, z, w, h, d, r.pick(walls), { tex: r() < 0.6 ? 'brick' : 'win', fl: floors, cw: 0.28 });
    B.shed(x, h, z, w + 0.05, d + 0.05, 0, 0.07, r.pick(zinc), r.pick(['x+', 'x-', 'z+', 'z-']));
    if (level >= 2 && r() < 0.6) B.cyl(x + w * 0.2, h + 0.06, z, 0.055, 0.12, '#1c1c1c', 8);
    if (level === 3 && r() < 0.8) {
      for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B.box(x + a * w * 0.42, h, z + b * d * 0.42, 0.02, 0.13, 0.02, '#7a4a2a');
    }
  }
}

// ---------- ESTRATO 2: casa popular ----------
function genE2(B, r, level) {
  B.plane(0, 0.012, 0, 0.98, 0.98, '#b8b3a3');
  const paint = r.pick(PASTEL);
  const floors = [1, 2, 2][level - 1];
  const w = 0.7, d = 0.56, z = -0.08;
  B.box(0, 0, z, w, floors * F, d, paint, { tex: 'win', fl: floors, cw: 0.35 });
  B.box(0, 0, z + d / 2 + 0.006, 0.11, 0.18, 0.012, '#5a3a22');
  if (r() < 0.55) {
    B.gable(0, floors * F, z, w + 0.06, 0.15, d + 0.06, '#b5523b', r() < 0.5 ? 'x' : 'z', { gable: paint });
  } else {
    B.box(0, floors * F, z, w + 0.04, 0.03, d + 0.04, '#9a9a9a');
    B.cyl(-w * 0.25, floors * F + 0.03, z, 0.06, 0.13, '#1c1c1c', 8);
  }
  if (level >= 3) {
    B.box(0.3, 0, 0.32, 0.3, 0.22, 0.28, r.pick(PASTEL), { tex: 'win', fl: 1 });
    B.box(0.3, 0.22, 0.32, 0.34, 0.03, 0.32, '#8a8a8a');
    B.box(-0.28, 0, 0.35, 0.02, 0.1, 0.02, '#6b4a2b');
  }
  if (level >= 2) B.tree(-0.32, 0.36, 0.22);
}

// ---------- ESTRATO 3: clase media ----------
function genE3(B, r, level) {
  B.plane(0, 0.012, 0, 0.98, 0.98, '#bdbdb5');
  const floors = [2, 3, 4][level - 1];
  const paint = r.pick(['#f2e3c9', '#e6d5b8', '#d9e4dd', '#f3cfa3', '#c9d6e3', '#f1d6c8']);
  const w = 0.78, d = 0.66, z = -0.06;
  B.box(0, 0, z, w, F, d, '#8b6f5a', { tex: 'store', fl: 1, cw: 0.4 });
  B.box(0, F, z, w, (floors - 1) * F, d, paint, { tex: 'win', fl: floors - 1, cw: 0.26 });
  for (let f = 1; f < floors; f++) {
    B.box(0, f * F - 0.02, z + d / 2 + 0.05, w * 0.55, 0.03, 0.1, '#a0a0a0');
    B.box(0, f * F + 0.01, z + d / 2 + 0.095, w * 0.55, 0.06, 0.01, '#5d6770');
  }
  if (level === 1) B.gable(0, floors * F, z, w + 0.04, 0.14, d + 0.04, '#b5523b', 'x', { gable: paint });
  else {
    B.box(0, floors * F, z, w + 0.04, 0.04, d + 0.04, '#8c8c8c');
    B.cyl(0.2, floors * F + 0.04, z - 0.1, 0.06, 0.14, '#1c1c1c', 8);
  }
}

// ---------- ESTRATO 4: conjunto residencial (ladrillo) ----------
function genE4(B, r, level) {
  B.plane(0, 0.012, 0, 0.98, 0.98, '#8fb67b');
  const floors = [5, 7, 9][level - 1];
  const brick = r.pick(['#b4553a', '#a14a35', '#c8844f']);
  B.box(0, 0, 0, 0.9, 0.12, 0.9, '#b9b9b0');
  const towers = level === 1 ? [[0, 0]] : [[-0.22, -0.1], [0.22, 0.1]];
  for (const [x, z] of towers) {
    const w = level === 1 ? 0.62 : 0.4, d = level === 1 ? 0.55 : 0.5;
    B.box(x, 0.12, z, w, floors * F, d, brick, { tex: 'win', fl: floors, cw: 0.22 });
    B.box(x, 0.12 + floors * F, z, w + 0.03, 0.04, d + 0.03, '#8a8a8a');
    B.box(x - w * 0.2, 0.16 + floors * F, z, 0.14, 0.12, 0.14, '#bdb7ab');
    B.cyl(x + w * 0.22, 0.16 + floors * F, z + 0.1, 0.05, 0.12, '#1c1c1c', 8);
    B.box(x, 0.12, z + d / 2 + 0.07, 0.26, 0.02, 0.14, '#4a4a4a');
  }
  B.tree(0.36, 0.38, 0.2);
  B.tree(-0.38, 0.38, 0.2);
}

// ---------- ESTRATO 5: torres ----------
function genE5(B, r, level) {
  B.plane(0, 0.012, 0, 0.98, 0.98, '#7fae6a');
  const floors = [9, 12, 16][level - 1];
  const body = r.pick(['#efe9df', '#dcd6cc', '#e8dccb']);
  B.box(0, 0, 0, 0.9, 0.2, 0.9, '#9a8f84', { tex: 'store', fl: 1, cw: 0.45 });
  const w = 0.62, d = 0.58, fh = 0.24;
  B.box(0, 0.2, 0, w, floors * fh, d, body, { tex: 'win', fl: floors, cw: 0.2 });
  for (let f = 2; f < floors; f += 2) {
    B.box(0, 0.2 + f * fh - 0.02, d / 2 + 0.05, w * 0.7, 0.025, 0.1, '#bfb9ae');
    B.box(0, 0.2 + f * fh - 0.02, -d / 2 - 0.05, w * 0.7, 0.025, 0.1, '#bfb9ae');
  }
  B.box(0, 0.2, d / 2 + 0.003, 0.12, floors * fh, 0.006, '#4f7f9a', { tex: 'glass', fl: floors, cw: 0.12 });
  const top = 0.2 + floors * fh;
  B.box(0, top, 0, w - 0.1, 0.12, d - 0.1, '#b0aaa0');
  B.box(0.05, top + 0.12, 0, 0.2, 0.08, 0.2, '#8a8a8a');
  B.cyl(-0.15, top + 0.12, 0, 0.04, 0.2, '#888', 6, 0.01);
  B.tree(-0.38, 0.4, 0.2);
  B.tree(0.38, 0.4, 0.2);
}

// ---------- ESTRATO 6: mansiones y rascacielos ----------
function genE6(B, r, level, variant) {
  if (variant === 'mansion') {
    B.plane(0, 0.012, 0, 0.98, 0.98, '#6fae5a');
    B.box(0, 0, 0, 0.98, 0.04, 0.02, '#e6e0d2', { noTop: false });
    B.box(0, 0, 0.48, 0.98, 0.07, 0.02, '#e6e0d2');
    B.box(0, 0, -0.48, 0.98, 0.07, 0.02, '#e6e0d2');
    B.box(-0.48, 0, 0, 0.02, 0.07, 0.98, '#e6e0d2');
    B.box(0.48, 0, 0, 0.02, 0.07, 0.98, '#e6e0d2');
    const fl = level === 1 ? 2 : 2;
    B.box(-0.1, 0, -0.1, 0.5, fl * F, 0.34, '#f7f3ea', { tex: 'win', fl, cw: 0.28 });
    B.gable(-0.1, fl * F, -0.1, 0.56, 0.17, 0.4, '#b5523b', 'x', { gable: '#f7f3ea' });
    B.box(-0.1, 0, 0.1, 0.5, 0.025, 0.1, '#d6cfbf');
    if (level >= 2) {
      B.box(0.24, 0, -0.14, 0.26, 0.28, 0.3, '#e9e1d2', { tex: 'glass', fl: 1, cw: 0.13 });
      B.box(0.24, 0.28, -0.14, 0.3, 0.03, 0.34, '#4a4a4a');
      B.box(0.12, 0.014, 0.28, 0.4, 0.014, 0.22, '#dfe6e8');
      B.plane(0.12, 0.03, 0.28, 0.34, 0.16, '#38b6e6');
    }
    if (level >= 3) {
      B.box(-0.1, fl * F, -0.1, 0.3, F, 0.26, '#f7f3ea', { tex: 'glass', fl: 1, cw: 0.15 });
      B.box(-0.1, (fl + 1) * F, -0.1, 0.36, 0.03, 0.32, '#4a4a4a');
      B.palm(-0.38, 0.32, 0.5);
      B.palm(0.38, 0.38, 0.45);
    }
    B.tree(-0.36, -0.38, 0.3);
    B.palm(0.4, -0.38, 0.42);
    B.palm(-0.38, 0.1, 0.4);
  } else {
    B.plane(0, 0.012, 0, 0.98, 0.98, '#8a8f93');
    const floors = [18, 24, 32][level - 1];
    const fh = 0.2;
    const tint = r.pick(['#5fa8c9', '#7fb7d4', '#6fb0b8', '#88aac2']);
    B.box(0, 0, 0, 0.9, 0.22, 0.9, '#4f5b66', { tex: 'glass', fl: 1, cw: 0.15 });
    const w = 0.58;
    B.box(0, 0.22, 0, w, floors * fh, w, tint, { tex: 'glass', fl: floors, cw: 0.1 });
    const top = 0.22 + floors * fh;
    B.box(0, top, 0, w - 0.1, 0.1, w - 0.1, '#33414d');
    B.box(0, top + 0.1, 0, w - 0.25, 0.12, w - 0.25, '#2a3640');
    B.cyl(0, top + 0.22, 0, 0.012, 0.5, '#d33', 4, 0.004);
    // aristas doradas
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B.box(a * w / 2, 0.22, b * w / 2, 0.025, floors * fh, 0.025, '#2f3d49');
    B.tree(-0.4, 0.4, 0.22, '#3a8a35');
    B.tree(0.4, 0.4, 0.22, '#3a8a35');
  }
}

// ---------- COMERCIO ----------
function genCom(B, r, level) {
  B.plane(0, 0.012, 0, 0.98, 0.98, '#a9a9a1');
  const paint = r.pick(PASTEL);
  if (level === 1) {
    B.box(0, 0, -0.05, 0.72, 0.3, 0.55, paint, { tex: 'store', fl: 1, cw: 0.36 });
    B.box(0, 0.3, -0.05, 0.76, 0.03, 0.59, '#8a8a8a');
    const c1 = r.pick(['#d62828', '#1d6fd1', '#2a9d4a', '#f4a300']);
    for (let i = 0; i < 6; i++) B.box(-0.3 + i * 0.12, 0.24, 0.3, 0.12, 0.02, 0.16, i % 2 ? '#ffffff' : c1);
    B.box(0, 0.33, 0.2, 0.5, 0.14, 0.03, c1);
    B.box(0.3, 0, 0.36, 0.1, 0.08, 0.1, '#c9a66b');
  } else if (level === 2) {
    B.box(0, 0, 0, 0.84, F, 0.7, paint, { tex: 'store', fl: 1, cw: 0.4 });
    B.box(0, F, 0, 0.84, F * 2, 0.7, r.pick(PASTEL), { tex: 'win', fl: 2, cw: 0.28 });
    const c1 = r.pick(['#d62828', '#1d6fd1', '#2a9d4a', '#f4a300']);
    B.box(0, F - 0.07, 0.37, 0.7, 0.1, 0.03, c1);
    B.box(0, F * 3, 0, 0.88, 0.03, 0.74, '#8a8a8a');
    B.box(0.25, F * 3 + 0.03, 0, 0.34, 0.3, 0.03, r.pick(['#ffd23f', '#ee4266', '#3bceac']));
  } else {
    B.plane(0, 0.014, 0.0, 0.96, 0.96, '#6e6e68');
    B.box(-0.1, 0, 0.12, 0.74, 0.5, 0.6, '#ece6da', { tex: 'glass', fl: 2, cw: 0.16 });
    B.box(-0.1, 0.5, 0.12, 0.78, 0.04, 0.64, '#3a3a3a');
    B.box(0.28, 0, -0.26, 0.36, 8 * 0.24, 0.36, '#6aa7c4', { tex: 'glass', fl: 8, cw: 0.1 });
    B.box(0.28, 8 * 0.24, -0.26, 0.4, 0.04, 0.4, '#2b3640');
    B.box(-0.1, 0.55, 0.36, 0.5, 0.12, 0.03, '#ee4266');
    B.box(-0.1, 0.55, 0.375, 0.4, 0.05, 0.01, '#ffffff');
  }
}

export function buildPrivate(kind, e, level, seed, variant) {
  const B = new Builder();
  const r = rng(seed * 7919 + e * 31 + level);
  if (kind === 'com') genCom(B, r, level);
  else if (e === 1) genE1(B, r, level);
  else if (e === 2) genE2(B, r, level);
  else if (e === 3) genE3(B, r, level);
  else if (e === 4) genE4(B, r, level);
  else if (e === 5) genE5(B, r, level);
  else genE6(B, r, level, variant);
  return B.build();
}

// ---------- SERVICIOS PÚBLICOS ----------
function genCAI(B) {
  B.plane(0, 0.012, 0, 0.98, 0.98, '#9aa59f');
  B.box(0, 0, 0, 0.6, 0.34, 0.5, '#f0e6d2', { tex: 'win', fl: 1, cw: 0.3 });
  B.box(0, 0.34, 0, 0.66, 0.04, 0.56, '#2e6f4e');
  B.box(0, 0.19, 0, 0.62, 0.035, 0.52, '#1d4e9a');
  B.cyl(0.2, 0.38, 0.1, 0.04, 0.06, '#222', 6);
  B.sphere(0.2, 0.47, 0.1, 0.035, '#e63946');
  B.sphere(0.2, 0.47, 0.1, 0.02, '#3a86ff', 1.2, 1, 1);
  B.box(-0.3, 0, 0.36, 0.2, 0.07, 0.08, '#2c2c2c');
  B.box(-0.32, 0.07, 0.36, 0.1, 0.05, 0.06, '#2c2c2c');
}

function genBomberos(B) {
  B.plane(0, 0.012, 0, 1.98, 1.98, '#8e9399');
  B.box(-0.1, 0, -0.4, 1.5, 0.5, 0.9, '#c62828', { tex: 'win', fl: 2, cw: 0.34 });
  B.box(-0.1, 0.5, -0.4, 1.56, 0.04, 0.96, '#e8e8e8');
  for (let i = 0; i < 3; i++) B.box(-0.55 + i * 0.45, 0, 0.055, 0.34, 0.3, 0.012, '#2b2b2b');
  B.box(0.75, 0, -0.5, 0.4, 1.0, 0.4, '#b02020', { tex: 'win', fl: 4, cw: 0.2 });
  B.box(0.75, 1.0, -0.5, 0.46, 0.05, 0.46, '#e8e8e8');
  B.box(-0.3, 0.014, 0.55, 0.7, 0.2, 0.3, '#d62828');
  B.box(-0.3, 0.214, 0.55, 0.7, 0.03, 0.12, '#ffffff');
  B.box(-0.1, 0.5, 0.15, 0.4, 0.02, 0.02, '#e8e8e8');
}

function genEscuela(B) {
  B.plane(0, 0.012, 0, 1.98, 1.98, '#b7b9a8');
  const y = '#f5cf47';
  B.box(0, 0, -0.65, 1.7, 0.56, 0.5, y, { tex: 'win', fl: 2, cw: 0.3 });
  B.box(-0.7, 0, 0.1, 0.4, 0.56, 1.0, y, { tex: 'win', fl: 2, cw: 0.3 });
  B.box(0.7, 0, 0.1, 0.4, 0.56, 1.0, y, { tex: 'win', fl: 2, cw: 0.3 });
  for (const [x, z, w, d] of [[0, -0.65, 1.76, 0.56], [-0.7, 0.1, 0.46, 1.06], [0.7, 0.1, 0.46, 1.06]]) B.box(x, 0.56, z, w, 0.04, d, '#2a5db0');
  B.box(0, 0.5, -0.38, 1.7, 0.03, 0.02, '#d62828');
  B.plane(0, 0.02, 0.12, 0.7, 0.8, '#d8864a');
  B.box(0, 0.02, 0.5, 0.01, 0.3, 0.01, '#fff');
  B.cyl(0, 0, 0.8, 0.012, 0.8, '#ddd', 4);
  B.box(0.06, 0.62, 0.8, 0.1, 0.025, 0.01, '#f7d117');
  B.box(0.06, 0.595, 0.8, 0.1, 0.0125, 0.01, '#1d4e9a');
  B.box(0.06, 0.5825, 0.8, 0.1, 0.0125, 0.01, '#d62828');
  B.tree(-0.3, 0.75, 0.3);
}

function genUniversidad(B) {
  B.plane(0, 0.012, 0, 2.98, 2.98, '#7fb36a');
  B.plane(0, 0.02, 0.4, 0.3, 2.2, '#d9d2c0');
  B.box(-0.8, 0, -0.8, 1.1, 0.7, 0.7, '#e6e0d2', { tex: 'glass', fl: 3, cw: 0.2 });
  B.box(0.55, 0, -0.85, 1.7, 0.5, 0.6, '#cfc9bb', { tex: 'win', fl: 2, cw: 0.3 });
  B.box(-0.9, 0, 0.55, 0.8, 0.9, 0.8, '#b86a4a', { tex: 'win', fl: 3, cw: 0.26 });
  B.box(0.95, 0, 0.6, 0.8, 0.5, 1.2, '#e6e0d2', { tex: 'win', fl: 2, cw: 0.3 });
  B.box(0, 0, -1.1, 0.4, 1.5, 0.4, '#a85a3a', { tex: 'win', fl: 5, cw: 0.2 });
  B.gable(0, 1.5, -1.1, 0.5, 0.25, 0.5, '#2d4a6b', 'x');
  B.sphere(0, 1.2, -0.89, 0.07, '#f5f5f5', 1, 1, 0.2);
  for (let i = 0; i < 6; i++) B.tree(-1.3 + i * 0.52, 1.25, 0.28);
  B.palm(0.3, 0.2, 0.7, true);
  B.palm(-0.3, 0.2, 0.7, true);
}

function genClinica(B) {
  B.plane(0, 0.012, 0, 1.98, 1.98, '#b9c0c4');
  B.box(0, 0, -0.2, 1.5, 0.84, 0.9, '#f4f6f7', { tex: 'win', fl: 3, cw: 0.26 });
  B.box(0, 0.84, -0.2, 1.56, 0.04, 0.96, '#3a86ff');
  B.box(0, 0.5, 0.26, 1.5, 0.04, 0.02, '#3a86ff');
  B.box(0, 0.55, 0.27, 0.34, 0.1, 0.02, '#d62828');
  B.box(0, 0.5, 0.27, 0.1, 0.34, 0.02, '#d62828');
  B.box(0.5, 0, 0.62, 0.5, 0.2, 0.28, '#fff');
  B.box(0.5, 0.2, 0.62, 0.5, 0.03, 0.12, '#d62828');
  B.tree(-0.7, 0.7, 0.26);
  B.tree(-0.4, 0.75, 0.22);
}

function genHospital(B) {
  B.plane(0, 0.012, 0, 2.98, 2.98, '#b9c0c4');
  B.box(0, 0, -0.55, 2.4, 0.7, 0.9, '#f4f6f7', { tex: 'win', fl: 3, cw: 0.26 });
  B.box(0, 0, 0.35, 0.9, 1.7, 0.9, '#f4f6f7', { tex: 'win', fl: 7, cw: 0.22 });
  B.box(0, 1.7, 0.35, 0.96, 0.04, 0.96, '#3a86ff');
  B.cyl(0, 1.74, 0.35, 0.3, 0.03, '#f7d117', 16);
  B.box(0, 1.775, 0.35, 0.05, 0.003, 0.22, '#222');
  B.box(0.0, 1.775, 0.35, 0.18, 0.003, 0.04, '#222');
  B.box(0, 1.2, 0.82, 0.4, 0.1, 0.02, '#d62828');
  B.box(0, 1.08, 0.82, 0.1, 0.34, 0.02, '#d62828');
  B.box(-1.0, 0, 0.7, 0.8, 0.45, 0.6, '#e8eef2', { tex: 'win', fl: 2, cw: 0.25 });
  B.box(1.0, 0, 0.7, 0.8, 0.45, 0.6, '#e8eef2', { tex: 'win', fl: 2, cw: 0.25 });
  B.box(1.0, 0.014, 1.2, 0.5, 0.18, 0.26, '#fff');
}

function genParque(B) {
  B.plane(0, 0.012, 0, 1.98, 1.98, '#6fbf5a');
  B.plane(0, 0.02, 0, 0.18, 1.9, '#e0d3a8');
  B.plane(0, 0.021, 0, 1.9, 0.18, '#e0d3a8');
  B.cyl(0, 0.02, 0, 0.3, 0.02, '#e0d3a8', 16);
  B.cyl(0, 0.04, 0, 0.1, 0.08, '#9aa', 10);
  B.cyl(0, 0.12, 0, 0.07, 0.01, '#4bb3e6', 10);
  B.palm(-0.55, -0.55, 0.9, true);
  B.palm(0.55, 0.55, 0.9, true);
  B.tree(0.6, -0.6, 0.4);
  B.tree(-0.6, 0.6, 0.4);
  B.tree(0.8, -0.2, 0.34);
  B.tree(-0.8, 0.2, 0.34);
  B.box(-0.3, 0.02, -0.12, 0.2, 0.06, 0.06, '#7a5230');
  B.box(0.3, 0.02, 0.12, 0.2, 0.06, 0.06, '#7a5230');
  // toboganes
  B.box(0.55, 0.02, -0.55, 0.04, 0.2, 0.04, '#e63946');
  B.shed(0.65, 0.02, -0.55, 0.2, 0.06, 0.02, 0.2, '#ffd23f', 'x-');
}

function genPlaza(B) {
  B.plane(0, 0.012, 0, 2.98, 2.98, '#d8cdb8');
  for (let i = -3; i <= 3; i++) B.plane(i * 0.4, 0.014, 0.4, 0.2, 2.0, i % 2 ? '#cbbf9f' : '#d8cdb8');
  // iglesia
  B.box(0, 0, -0.95, 1.1, 0.7, 0.9, '#f7f2e6', { tex: 'win', fl: 1, cw: 0.9 });
  B.gable(0, 0.7, -0.95, 1.2, 0.3, 1.0, '#a8442a', 'x', { gable: '#f7f2e6' });
  B.box(-0.55, 0, -0.45, 0.4, 1.3, 0.4, '#f7f2e6', { tex: 'win', fl: 3, cw: 0.4 });
  B.cone(-0.55, 1.3, -0.45, 0.3, 0.4, '#a8442a', 4);
  B.box(-0.55, 1.7, -0.45, 0.02, 0.14, 0.02, '#222');
  B.box(-0.55, 1.76, -0.45, 0.08, 0.02, 0.02, '#222');
  B.box(0.55, 0, -0.45, 0.4, 0.9, 0.4, '#f7f2e6', { tex: 'win', fl: 2, cw: 0.4 });
  B.cone(0.55, 0.9, -0.45, 0.3, 0.3, '#a8442a', 4);
  B.box(0, 0, -0.49, 0.26, 0.4, 0.02, '#5a3a22');
  // fuente
  B.cyl(0, 0.014, 0.4, 0.36, 0.1, '#9aa', 16);
  B.cyl(0, 0.1, 0.4, 0.32, 0.02, '#4bb3e6', 16);
  B.cyl(0, 0.014, 0.4, 0.06, 0.34, '#9aa', 8, 0.04);
  B.palm(-1.2, 0.2, 1.0, true);
  B.palm(1.2, 0.2, 1.0, true);
  B.palm(-1.2, 1.2, 0.9, true);
  B.palm(1.2, 1.2, 0.9, true);
  B.tree(-0.7, 1.2, 0.35);
  B.tree(0.7, 1.2, 0.35);
}

function genBiblioteca(B) {
  B.plane(0, 0.012, 0, 1.98, 1.98, '#b5b8b0');
  B.box(0, 0, 0, 1.6, 0.1, 1.6, '#8c8c88');
  B.rbox(-0.35, 0.1, -0.3, 0.7, 0.9, 0.7, '#2b2b30', 0.4);
  B.rbox(0.4, 0.1, -0.15, 0.6, 0.65, 0.6, '#35353b', -0.3);
  B.rbox(0.0, 0.1, 0.5, 0.65, 0.5, 0.5, '#2f2f35', 0.15);
  B.rbox(-0.35, 0.5, -0.3, 0.72, 0.03, 0.2, '#9fd0e8', 0.4);
  B.rbox(0.4, 0.4, -0.15, 0.62, 0.03, 0.2, '#9fd0e8', -0.3);
  B.tree(-0.85, 0.8, 0.3);
}

function genCancha(B) {
  B.plane(0, 0.012, 0, 1.98, 1.98, '#9aa59a');
  const W = 1.7, D = 1.0;
  for (let i = 0; i < 6; i++) B.plane(-W / 2 + (i + 0.5) * W / 6, 0.02, 0, W / 6, D, i % 2 ? '#4caf50' : '#43a047');
  const L = '#ffffff';
  B.plane(0, 0.022, -D / 2, W, 0.02, L); B.plane(0, 0.022, D / 2, W, 0.02, L);
  B.plane(-W / 2, 0.022, 0, 0.02, D, L); B.plane(W / 2, 0.022, 0, 0.02, D, L);
  B.plane(0, 0.022, 0, 0.02, D, L);
  B.cyl(0, 0.022, 0, 0.14, 0.002, L, 14);
  B.cyl(0, 0.0225, 0, 0.12, 0.002, '#4caf50', 14);
  for (const s of [-1, 1]) {
    B.box(s * W / 2, 0, 0, 0.03, 0.14, 0.24, '#fff', { noTop: false });
    B.box(s * (W / 2 + 0.05), 0, 0, 0.02, 0.14, 0.24, '#ddd');
    B.cyl(s * 0.5, 0, D / 2 + 0.15, 0.01, 0.6, '#555', 4);
    B.cyl(s * 0.5, 0, -D / 2 - 0.15, 0.01, 0.6, '#555', 4);
  }
  B.box(0, 0.02, 0.78, 1.2, 0.08, 0.08, '#c9a66b');
}

function genEstadio(B) {
  B.plane(0, 0.012, 0, 2.98, 2.98, '#9aa59a');
  B.plane(0, 0.03, 0, 1.2, 1.7, '#43a047');
  B.plane(0, 0.032, 0, 1.2, 0.02, '#fff');
  B.cyl(0, 0.032, 0, 0.18, 0.002, '#fff', 14);
  const seat = ['#f7d117', '#1d4e9a', '#d62828'];
  // gradas
  B.box(-1.1, 0, 0, 0.5, 0.7, 2.6, '#cfc9bb');
  B.box(1.1, 0, 0, 0.5, 0.7, 2.6, '#cfc9bb');
  B.box(0, 0, -1.1, 1.8, 0.7, 0.5, '#cfc9bb');
  B.box(0, 0, 1.1, 1.8, 0.7, 0.5, '#cfc9bb');
  for (let i = 0; i < 3; i++) {
    const h = 0.2 + i * 0.2;
    B.box(-0.85 + 0.0, 0.0, 0, 0.04, 0.22 + i * 0.16, 2.0, seat[i]);
    B.box(0.85, 0, 0, 0.04, 0.22 + i * 0.16, 2.0, seat[i]);
    void h;
  }
  B.box(-1.18, 0.7, 0, 0.7, 0.05, 2.7, '#e8e8e8');
  B.box(1.18, 0.7, 0, 0.7, 0.05, 2.7, '#e8e8e8');
  for (const [x, z] of [[-1.35, -1.35], [1.35, -1.35], [-1.35, 1.35], [1.35, 1.35]]) {
    B.cyl(x, 0, z, 0.03, 1.2, '#999', 5);
    B.box(x, 1.2, z, 0.16, 0.1, 0.16, '#fffbd0');
  }
}

function genMercado(B) {
  B.plane(0, 0.012, 0, 1.98, 1.98, '#c9bda5');
  for (const [x, z] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8], [0, -0.8], [0, 0.8]]) B.box(x, 0, z, 0.06, 0.5, 0.06, '#7a5230');
  B.gable(0, 0.5, 0, 1.9, 0.3, 1.9, '#d9792b', 'x', { gable: '#c9bda5' });
  const cs = ['#d62828', '#f7d117', '#2a9d4a', '#1d6fd1', '#ff7a1a', '#c77dff'];
  for (let i = 0; i < 6; i++) {
    const x = -0.75 + (i % 3) * 0.75, z = i < 3 ? -0.45 : 0.45;
    B.box(x, 0.014, z, 0.5, 0.14, 0.3, '#8a5a32');
    B.box(x, 0.16, z, 0.54, 0.02, 0.34, cs[i]);
    for (let k = 0; k < 4; k++) B.sphere(x - 0.15 + k * 0.1, 0.18, z, 0.05, ['#e63946', '#ff9f1c', '#6bbf59', '#ffd23f'][k]);
  }
}

export const PUBLIC = {
  cai: { name: 'CAI de Policía', icon: '🚓', w: 1, h: 1, cost: 150000, upkeep: 1500, cat: 'seguridad', radius: 7, jobs: 12, gen: genCAI, desc: 'Seguridad en el barrio.' },
  bomberos: { name: 'Estación de Bomberos', icon: '🚒', w: 2, h: 2, cost: 300000, upkeep: 2500, cat: 'bomberos', radius: 10, jobs: 24, gen: genBomberos, desc: 'Protección contra incendios.' },
  escuela: { name: 'Colegio', icon: '🏫', w: 2, h: 2, cost: 350000, upkeep: 2250, cat: 'educacion', radius: 8, jobs: 30, gen: genEscuela, desc: 'Educación básica y media.' },
  universidad: { name: 'Universidad', icon: '🎓', w: 3, h: 3, cost: 1500000, upkeep: 8750, cat: 'educacion', radius: 15, jobs: 90, gen: genUniversidad, desc: 'Educación superior; gran radio.' },
  clinica: { name: 'Centro de Salud', icon: '🏥', w: 2, h: 2, cost: 450000, upkeep: 3000, cat: 'salud', radius: 9, jobs: 30, gen: genClinica, desc: 'Atención primaria.' },
  hospital: { name: 'Hospital', icon: '🚑', w: 3, h: 3, cost: 1800000, upkeep: 11250, cat: 'salud', radius: 15, jobs: 110, gen: genHospital, desc: 'Atención de alta complejidad.' },
  parque: { name: 'Parque', icon: '🌳', w: 2, h: 2, cost: 120000, upkeep: 500, cat: 'recreacion', radius: 7, jobs: 4, gen: genParque, desc: 'Palmas de cera y zonas verdes.' },
  cancha: { name: 'Cancha de Fútbol', icon: '⚽', w: 2, h: 2, cost: 150000, upkeep: 375, cat: 'recreacion', radius: 6, jobs: 2, gen: genCancha, desc: 'El potrero del barrio.' },
  estadio: { name: 'Estadio', icon: '🏟️', w: 3, h: 3, cost: 1600000, upkeep: 7500, cat: 'recreacion', radius: 13, jobs: 60, gen: genEstadio, desc: 'Fútbol para toda la ciudad.' },
  plaza: { name: 'Plaza e Iglesia', icon: '⛪', w: 3, h: 3, cost: 400000, upkeep: 750, cat: 'cultura', radius: 10, jobs: 10, gen: genPlaza, desc: 'Plaza principal con iglesia.' },
  biblioteca: { name: 'Biblioteca Parque', icon: '📚', w: 2, h: 2, cost: 500000, upkeep: 1500, cat: 'cultura', radius: 9, jobs: 15, gen: genBiblioteca, desc: 'Inspirada en las bibliotecas de Medellín.' },
  mercado: { name: 'Plaza de Mercado', icon: '🧺', w: 2, h: 2, cost: 350000, upkeep: 1250, cat: 'mercado', radius: 9, jobs: 40, gen: genMercado, desc: 'Frutas, verduras y empleo local.' },
};

export function buildPublic(key) {
  const B = new Builder();
  PUBLIC[key].gen(B);
  return B.build();
}

// ---------- TRANSPORTE ----------
export const CABLE_Y = 1.25; // altura del cable

export function buildBusStop(dir) {
  const B = new Builder();
  // dir: [dx,dz] hacia donde está el andén (borde del tile)
  const ox = dir[0] * 0.38, oz = dir[1] * 0.38;
  const rot = dir[0] !== 0 ? 0 : Math.PI / 2;
  B.rbox(ox, 0.02, oz, dir[0] !== 0 ? 0.1 : 0.4, 0.02, dir[0] !== 0 ? 0.4 : 0.1, '#bdbdbd', 0);
  B.rbox(ox, 0.04, oz, dir[0] !== 0 ? 0.08 : 0.32, 0.22, dir[0] !== 0 ? 0.32 : 0.08, '#2a9df4', 0);
  B.rbox(ox, 0.26, oz, dir[0] !== 0 ? 0.14 : 0.38, 0.025, dir[0] !== 0 ? 0.38 : 0.14, '#f7d117', 0);
  B.cyl(ox + (dir[0] !== 0 ? -dir[0] * 0.09 : 0.14), 0.02, oz + (dir[1] !== 0 ? -dir[1] * 0.09 : 0.14), 0.012, 0.36, '#555', 5);
  B.box(ox + (dir[0] !== 0 ? -dir[0] * 0.09 : 0.14), 0.36, oz + (dir[1] !== 0 ? -dir[1] * 0.09 : 0.14), 0.07, 0.07, 0.015, '#d62828');
  void rot;
  return B.build();
}

export function buildCableStation() {
  const B = new Builder();
  B.plane(0, 0.012, 0, 0.98, 0.98, '#bfc2c5');
  B.box(0, 0, 0, 0.8, 0.3, 0.8, '#cfd2d6', { tex: 'glass', fl: 1, cw: 0.2 });
  B.box(0, 0.3, 0, 0.84, 0.04, 0.84, '#d62828');
  B.box(0, 0.34, 0, 0.3, CABLE_Y - 0.34 - 0.05, 0.3, '#f0f0f0');
  B.box(0, 0.5, 0, 0.32, 0.05, 0.32, '#d62828');
  B.box(0, CABLE_Y - 0.12, 0, 0.5, 0.05, 0.12, '#d62828');
  B.cyl(0, CABLE_Y - 0.05, 0, 0.18, 0.06, '#33414d', 14);
  B.box(0.34, 0, 0.34, 0.02, 0.4, 0.02, '#999');
  return B.build();
}

export function buildPylon() {
  const B = new Builder();
  B.box(0, 0, 0, 0.1, CABLE_Y - 0.06, 0.1, '#e8e8e8');
  B.box(0, CABLE_Y - 0.1, 0, 0.5, 0.04, 0.06, '#d62828');
  return B.build();
}

export function buildBus(color, big = true) {
  const B = new Builder();
  B.box(0, 0.035, 0, 0.62, 0.17, 0.24, color);
  B.box(0, 0.2, 0, 0.62, 0.02, 0.24, '#f0f0f0');
  B.box(0, 0.12, 0, 0.6, 0.06, 0.245, '#2b3a4a');
  B.box(0.31, 0.12, 0, 0.01, 0.06, 0.2, '#2b3a4a');
  B.box(0.31, 0.06, 0, 0.012, 0.03, 0.24, '#222');
  B.cyl(-0.18, 0.0, 0.12, 0.04, 0.03, '#222', 8);
  B.cyl(0.18, 0.0, 0.12, 0.04, 0.03, '#222', 8);
  B.cyl(-0.18, 0.0, -0.12, 0.04, 0.03, '#222', 8);
  B.cyl(0.18, 0.0, -0.12, 0.04, 0.03, '#222', 8);
  void big;
  return B.build();
}

export function buildCabin(color) {
  const B = new Builder();
  B.box(0, 0.78, 0, 0.012, 0.4, 0.012, '#333');
  B.box(0, 0.5, 0, 0.2, 0.2, 0.2, color);
  B.box(0, 0.54, 0, 0.202, 0.1, 0.202, '#9fd0e8');
  B.box(0, 0.7, 0, 0.22, 0.02, 0.22, '#333');
  return B.build();
}

export function buildCar(color) {
  const B = new Builder();
  B.box(0, 0.025, 0, 0.2, 0.06, 0.1, color);
  B.box(-0.01, 0.085, 0, 0.1, 0.045, 0.09, color);
  B.box(-0.01, 0.092, 0, 0.102, 0.03, 0.092, '#2b3a4a');
  return B.build();
}

void THREE;
