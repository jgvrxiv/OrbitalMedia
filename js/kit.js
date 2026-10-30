// Piezas reutilizables para los modelos: paletas por estrato, lotes, cercas, tanques, balcones, toldos…
// Convención: el lote ocupa [-0.5, 0.5] en X y Z; la fachada principal mira a +Z (hacia la vía).
import { m2u, FLOOR_M } from './units.js';
import { CELL, shade } from './geom.js';

export const F = m2u(FLOOR_M); // altura de piso residencial (3,1 m)

export const PAL = {
  // muros pintados / acabados por estrato
  wall: {
    1: ['#b8714f', '#a9a59c', '#c8b39a', '#a8a39a', '#b5afa3', '#9a958c', '#c98f7a', '#a8604a', '#bdb4a4', '#8f9a8c'],
    2: ['#e3d8c4', '#d6cdb9', '#cfc5b0', '#e9dfc9', '#d9c08a', '#a9c6b4', '#d8a597', '#9fbad0', '#d9b08a', '#c9bfa8', '#e0d2a8', '#b8c4a2'],
    3: ['#efe2c8', '#e3d0b0', '#d4e0d6', '#f0cfa5', '#c9d6e3', '#f0d9cf', '#e8e0a8', '#d8c3e0'],
    4: ['#f1ece2', '#dcd3c3', '#e9dccb', '#e2e7e8', '#d9cbb4', '#f3e7d3'],
    5: ['#f4f1ea', '#e7e2d8', '#d3cec3', '#ece6dc', '#f6f2e8'],
    6: ['#fbfaf6', '#efe9dc', '#e6dfd0', '#f7f4ee'],
  },
  brick: ['#b4553a', '#a14a35', '#c0643f', '#9c4a34', '#b8714f'],
  zinc: ['#8f969c', '#a2622f', '#b5babe', '#7d848b', '#9b5a33'],
  // láminas de techo de barrio: casi siempre gris, con retazos azules, naranjas y oxidados
  sheet: ['#8f969c', '#9aa0a5', '#a7adb1', '#7c838a', '#8f969c', '#9aa0a5', '#a7adb1', '#7c838a', '#8f969c', '#3f6fb5', '#d2643a', '#b8462f', '#9b5a33'],
  clay: ['#b5523b', '#a8442a', '#c0603f', '#9a4030', '#b9633f', '#a35540', '#8f5a48'],
  slate: ['#4a4f55', '#5a5f66', '#3f444a'],
  dark: ['#2e3a46', '#3b3f45', '#2b2b30', '#45403a'],
  wood: ['#9a6b3f', '#8a5a32', '#b07d4a', '#7a5230'],
  stone: ['#b8b1a4', '#a9a294', '#c7bfb0', '#8e8a82'],
  bright: ['#e63946', '#f7b801', '#2a9d8f', '#3a86ff', '#ff6b35', '#8338ec', '#06d6a0', '#ef476f', '#118ab2', '#ffd166'],
  glass: ['#a7cde3', '#8fb9d1', '#9fc6c9', '#b7c9dc', '#7fb3cf'],
};

// ---------- lote ----------
export function lot(B, e, o = {}) {
  const r = B.r;
  const s = o.size || 0.99;
  if (e <= 1) {
    B.plane(0, 0.01, 0, s, s, '#8f7f64');
    for (let i = 0; i < 5; i++) B.plane(r.range(-0.4, 0.4), 0.012, r.range(-0.4, 0.4), r.range(0.1, 0.25), r.range(0.1, 0.25), r.pick(['#7f8f5a', '#a08d6c', '#77885a']));
  } else if (e === 2) {
    B.plane(0, 0.01, 0, s, s, '#b3ae9f');
  } else if (e === 3) {
    B.plane(0, 0.01, 0, s, s, '#a9b59a');
  } else if (e === 4) {
    B.plane(0, 0.01, 0, s, s, '#86b36f');
  } else if (e === 5) {
    B.plane(0, 0.01, 0, s, s, '#76ad62');
  } else {
    B.plane(0, 0.01, 0, s, s, '#5e9f4f');
  }
}

export function path(B, x, z, w, d, c = '#cfc6b4') {
  B.plane(x, 0.016, z, w, d, c);
}

// ---------- cercas y muros ----------
// tipo: 'reja' (muro bajo + reja), 'muro', 'seto', 'piedra'
export function fence(B, kind, o = {}) {
  const s = o.size || 0.47;
  const gate = o.gate ?? 0.18;
  const sides = o.sides || ['front', 'left', 'right', 'back'];
  const seg = (x0, z0, x1, z1) => {
    const w = Math.abs(x1 - x0) || 0.03, d = Math.abs(z1 - z0) || 0.03;
    const x = (x0 + x1) / 2, z = (z0 + z1) / 2;
    if (kind === 'seto') B.box(x, 0, z, w + 0.02, 0.09, d + 0.02, '#3f7f3a', { top: '#4c9445' });
    else if (kind === 'piedra') B.box(x, 0, z, w, 0.11, d, '#c9bfae', { top: '#b5ab9a' });
    else if (kind === 'muro') B.box(x, 0, z, w, 0.12, d, o.color || '#e8e2d6', { top: '#c8c2b6' });
    else {
      B.box(x, 0, z, w, 0.045, d, o.color || '#e8e2d6');
      const n = Math.max(2, Math.round(Math.max(w, d) / 0.04));
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        B.box(x0 + (x1 - x0) * t, 0.045, z0 + (z1 - z0) * t, 0.007, 0.075, 0.007, '#222');
      }
      B.box(x, 0.118, z, w + 0.005, 0.008, d + 0.005, '#222');
    }
  };
  if (sides.includes('front')) { seg(-s, s, -gate / 2, s); seg(gate / 2, s, s, s); }
  if (sides.includes('back')) seg(-s, -s, s, -s);
  if (sides.includes('left')) seg(-s, -s, -s, s);
  if (sides.includes('right')) seg(s, -s, s, s);
}

// ---------- techo / azotea ----------
export function tank(B, x, y, z, o = {}) {
  const c = o.color || B.r.pick(['#1d1d1d', '#1d1d1d', '#2a5db0', '#1d1d1d']);
  const s = o.s || 1;
  B.cyl(x, y, z, 0.05 * s, 0.1 * s, c, 10);
  B.cyl(x, y + 0.1 * s, z, 0.052 * s, 0.015 * s, shade(c, 1.3), 10, 0.03 * s);
}

export function rebar(B, x, y, z, w, d, h = 0.12) {
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    for (let k = 0; k < 2; k++) B.box(x + a * (w / 2 - 0.02) + k * 0.012, y, z + b * (d / 2 - 0.02), 0.006, h, 0.006, '#6b4a33');
  }
}

export function parapet(B, x, y, z, w, d, h, color, t = 0.025) {
  B.box(x, y, z + d / 2 - t / 2, w, h, t, color);
  B.box(x, y, z - d / 2 + t / 2, w, h, t, color);
  B.box(x + w / 2 - t / 2, y, z, t, h, d - 2 * t, color);
  B.box(x - w / 2 + t / 2, y, z, t, h, d - 2 * t, color);
}

export function dish(B, x, y, z) {
  B.box(x, y, z, 0.008, 0.04, 0.008, '#888');
  B.sphere(x, y + 0.05, z + 0.01, 0.03, '#e8e8e8', 1, 1, 0.35);
}

export function antenna(B, x, y, z, h = 0.18) {
  B.box(x, y, z, 0.008, h, 0.008, '#777');
  B.box(x, y + h * 0.7, z, 0.08, 0.005, 0.005, '#777');
  B.box(x, y + h * 0.85, z, 0.05, 0.005, 0.005, '#777');
}

export function acUnit(B, x, y, z, face = 'front') {
  const dz = face === 'front' ? 0.02 : face === 'back' ? -0.02 : 0;
  const dx = face === 'right' ? 0.02 : face === 'left' ? -0.02 : 0;
  const w = face === 'front' || face === 'back' ? 0.07 : 0.04;
  const d = face === 'front' || face === 'back' ? 0.04 : 0.07;
  B.box(x + dx, y, z + dz, w, 0.045, d, '#e4e4e4', { top: '#d0d0d0' });
}

export function hvac(B, x, y, z) {
  B.box(x, y, z, 0.12, 0.06, 0.08, '#bfc3c7', { top: '#9aa0a6' });
  B.cyl(x + 0.02, y + 0.06, z, 0.025, 0.006, '#555', 8);
}

export function laundry(B, x, y, z, len, axis = 'x') {
  const cs = ['#e63946', '#f7b801', '#3a86ff', '#ffffff', '#06d6a0', '#ff8fab', '#8338ec'];
  if (axis === 'x') B.box(x, y, z, len, 0.004, 0.004, '#666');
  else B.box(x, y, z, 0.004, 0.004, len, '#666');
  const n = Math.max(2, Math.floor(len / 0.06));
  for (let i = 0; i < n; i++) {
    const t = -len / 2 + (i + 0.5) * (len / n);
    const h = B.r.range(0.03, 0.06);
    if (axis === 'x') B.box(x + t, y - h, z, 0.035, h, 0.004, B.r.pick(cs));
    else B.box(x, y - h, z + t, 0.004, h, 0.035, B.r.pick(cs));
  }
}

// losa de balcón en voladizo con baranda; face: 'front'|'back'
export function balcony(B, x, y, z, w, depth, face = 'front', o = {}) {
  const s = face === 'front' ? 1 : -1;
  const zc = z + s * depth / 2;
  B.box(x, y - 0.02, zc, w, 0.02, depth, o.slab || '#c9c4bb');
  const rc = o.rail || '#3a3a3a';
  if (o.glass) {
    B.box(x, y, z + s * (depth - 0.004), w, 0.07, 0.006, '#a9d3e6', { top: '#8fb9cc' });
  } else if (o.solid) {
    B.box(x, y, z + s * (depth - 0.006), w, 0.07, 0.012, o.solid);
  } else if (rc) {
    B.box(x, y + 0.065, z + s * (depth - 0.004), w, 0.008, 0.008, rc);
    const n = Math.max(2, Math.round(w / 0.035));
    for (let i = 0; i <= n; i++) B.box(x - w / 2 + (w * i) / n, y, z + s * (depth - 0.004), 0.005, 0.065, 0.005, rc);
  }
}

// toldo inclinado con franjas (sobre la fachada +z por defecto)
export function awning(B, x, y, z, w, depth, colors, o = {}) {
  const n = Math.max(2, Math.round(w / 0.06));
  const drop = o.drop ?? 0.05;
  for (let i = 0; i < n; i++) {
    const x0 = x - w / 2 + (w * i) / n, x1 = x0 + w / n;
    const c = colors[i % colors.length];
    B.quad([x0, y - drop, z + depth], [x1, y - drop, z + depth], [x1, y, z], [x0, y, z], c);
    B.quad([x0, y - drop - 0.025, z + depth], [x1, y - drop - 0.025, z + depth], [x1, y - drop, z + depth], [x0, y - drop, z + depth], shade(c, 0.85));
  }
}

// letrero plano (celda SIGN) sobre la fachada +z
export function sign(B, x, y, z, w, h, color, o = {}) {
  const t = 0.012;
  B.box(x, y, z + t / 2, w, h, t, color, { pick: () => CELL.SIGN, fl: 1, cw: w, lit: o.lit ?? true });
  if (o.text) {
    // "letras" como pequeñas barras
    const n = Math.max(3, Math.floor(w / 0.035));
    for (let i = 0; i < n; i++) {
      if (B.r() < 0.18) continue;
      B.box(x - w * 0.38 + (w * 0.76 * i) / n, y + h * 0.32, z + t + 0.002, (w * 0.6) / n, h * 0.36, 0.003, o.text);
    }
  }
}

// letrero vertical (bandera) perpendicular a la fachada
export function blade(B, x, y, z, h, color) {
  B.box(x, y, z + 0.05, 0.012, h, 0.08, color, { pick: () => CELL.SIGN, fl: 1, cw: 0.08, lit: true });
}

export function car(B, x, z, rot = 0, color) {
  const c = color || B.r.pick(['#d62828', '#e8e8e8', '#2b2b2b', '#2a6fdb', '#9aa0a6', '#f7d117', '#1d6f42']);
  B.rbox(x, 0.02, z, rot ? 0.09 : 0.18, 0.05, rot ? 0.18 : 0.09, c, 0);
  B.rbox(x, 0.07, z, rot ? 0.08 : 0.09, 0.035, rot ? 0.09 : 0.08, '#2b3a4a', 0);
}

export function truck(B, x, z, axis = 'x', color = '#e8e8e8') {
  if (axis === 'x') {
    B.box(x - 0.11, 0.02, z, 0.08, 0.09, 0.1, color, { top: shade(color, 0.9) });
    B.box(x - 0.11, 0.07, z, 0.081, 0.03, 0.101, '#2b3a4a');
    B.box(x + 0.04, 0.02, z, 0.22, 0.12, 0.11, '#f2f2f2', { pick: () => CELL.PANEL, fl: 1, cw: 0.22 });
  } else {
    B.box(x, 0.02, z - 0.11, 0.1, 0.09, 0.08, color);
    B.box(x, 0.07, z - 0.11, 0.101, 0.03, 0.081, '#2b3a4a');
    B.box(x, 0.02, z + 0.04, 0.11, 0.12, 0.22, '#f2f2f2', { pick: () => CELL.PANEL, fl: 1, cw: 0.22 });
  }
}

export function pool(B, x, z, w, d, o = {}) {
  B.box(x, 0.0, z, w + 0.05, 0.03, d + 0.05, o.border || '#e9ecef');
  B.plane(x, 0.032, z, w, d, o.water || '#3fb8e8');
  B.plane(x, 0.033, z - d * 0.25, w * 0.9, d * 0.08, '#7fd4f2');
}

export function umbrella(B, x, z, color) {
  B.cyl(x, 0, z, 0.006, 0.12, '#666', 4);
  B.cone(x, 0.1, z, 0.07, 0.04, color, 8);
  B.cyl(x, 0.0, z, 0.035, 0.05, '#fff', 8);
}

export function bench(B, x, z, axis = 'x') {
  if (axis === 'x') { B.box(x, 0.02, z, 0.1, 0.02, 0.03, '#7a5230'); B.box(x, 0.0, z, 0.08, 0.02, 0.02, '#555'); }
  else { B.box(x, 0.02, z, 0.03, 0.02, 0.1, '#7a5230'); B.box(x, 0.0, z, 0.02, 0.02, 0.08, '#555'); }
}

export function pots(B, x, z, n = 3) {
  for (let i = 0; i < n; i++) {
    B.cyl(x + i * 0.035, 0, z, 0.012, 0.025, '#b5523b', 6);
    B.sphere(x + i * 0.035, 0.035, z, 0.016, B.r.pick(['#3f8f3a', '#e63946', '#f7b801', '#ff8fab']));
  }
}

export function lamp(B, x, z, h = 0.25) {
  B.cyl(x, 0, z, 0.006, h, '#3a3a3a', 5);
  B.box(x, h, z, 0.03, 0.012, 0.03, '#fff3c4');
}

export function playground(B, x, z) {
  B.plane(x, 0.017, z, 0.24, 0.2, '#d9a066');
  B.box(x - 0.06, 0, z, 0.012, 0.09, 0.012, '#e63946');
  B.box(x + 0.02, 0, z, 0.012, 0.09, 0.012, '#e63946');
  B.box(x - 0.02, 0.09, z, 0.1, 0.008, 0.012, '#e63946');
  B.shed(x + 0.07, 0, z - 0.05, 0.04, 0.12, 0.0, 0.08, '#f7b801', 'z-', CELL.PLAIN);
}

export function pergola(B, x, y, z, w, d, c = '#8a5a32') {
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B.box(x + a * (w / 2 - 0.01), y, z + b * (d / 2 - 0.01), 0.015, 0.12, 0.015, c);
  const n = Math.max(3, Math.round(w / 0.04));
  for (let i = 0; i <= n; i++) B.box(x - w / 2 + (w * i) / n, y + 0.12, z, 0.008, 0.01, d, c);
}

export function columns(B, x0, x1, y, z, h, n, c = '#f4f1ea', r = 0.012) {
  for (let i = 0; i < n; i++) B.cyl(x0 + ((x1 - x0) * i) / Math.max(1, n - 1), y, z, r, h, c, 8);
}

export function chimney(B, x, z, h, r = 0.05, stripes = true) {
  const n = 6;
  for (let i = 0; i < n; i++) {
    const c = stripes ? (i % 2 ? '#d62828' : '#f2f2f2') : '#8a8580';
    B.cyl(x, (h * i) / n, z, r * (1 - (0.25 * i) / n), h / n, c, 12, r * (1 - (0.25 * (i + 1)) / n));
  }
}

export function container(B, x, y, z, axis = 'x', color) {
  const c = color || B.r.pick(['#c0392b', '#2e86c1', '#27ae60', '#d68910', '#7d3c98', '#5d6d7e']);
  const w = axis === 'x' ? 0.24 : 0.09, d = axis === 'x' ? 0.09 : 0.24;
  B.box(x, y, z, w, 0.09, d, c, { pick: () => CELL.CORRUG, fl: 1, cw: 0.24, top: shade(c, 0.9) });
}

export function pallets(B, x, z, n = 3) {
  for (let i = 0; i < n; i++) B.box(x + (i % 2) * 0.06, 0, z + Math.floor(i / 2) * 0.06, 0.05, 0.02 + (i % 3) * 0.02, 0.05, i % 2 ? '#b08850' : '#c8a46a');
}

// zócalo (franja inferior de otro color) alrededor de una caja
export function plinth(B, x, z, w, d, color, h = 0.07) {
  B.box(x, 0, z, w + 0.012, h, d + 0.012, color, { noTop: true });
}

export const pickW = (arr) => {
  // arr = [[valor, peso], ...]
  return (r) => {
    let t = r() * arr.reduce((s, a) => s + a[1], 0);
    for (const [v, w] of arr) { t -= w; if (t <= 0) return v; }
    return arr[arr.length - 1][0];
  };
};


// Techo de una casa por estrato (y = parte alta de los muros, w×d = huella). Es lo más visible desde arriba:
//  1: losa de concreto con retazos de lámina (gris, azul, naranja), tanques y varillas
//  2: lámina corrugada a una agua o terraza con parapeto y lámina parcial
//  3: teja de barro a dos aguas / cuatro aguas o terraza con parapeto
//  4-5: teja de barro con paños cruzados, buhardillas y chimenea
//  6: techos quebrados de teja o pizarra con claraboyas, chimeneas y partes planas modernas
export function roofCover(B, e, cx, y, cz, w, d, o = {}) {
  const r = B.r;
  const paint = o.paint || '#e3d8c4';
  const ridge = o.ridge || (w >= d ? 'x' : 'z');
  const clay = r.pick(PAL.clay);
  const sheetAt = (x, z, sw, sd, h = 0.03) => {
    const c = r.pick(PAL.sheet);
    B.shed(x, y + 0.03, z, sw, sd, 0.0, h, c, r.pick(['z-', 'z+', 'x-', 'x+']), CELL.CORRUG);
  };
  const flat = (col = '#a7a39b', pr = 0.05) => {
    B.box(cx, y, cz, w + 0.02, 0.025, d + 0.02, col);
    parapet(B, cx, y + 0.025, cz, w, d, pr, o.parapet || shade(paint, 0.9));
  };
  const tanks = (p = 0.7) => { if (r() < p) tank(B, cx + (r() < 0.5 ? -1 : 1) * w * 0.22, y + 0.025, cz + d * 0.12, { s: o.s || 1 }); };
  if (e <= 1) {
    flat('#9b978f', 0.025);
    const n = r.int(2, 4), cols = Math.min(n, w > 0.5 ? 3 : 2);
    for (let i = 0; i < n; i++) {
      const sw = Math.max(0.1, (w * 0.8) / cols), sd = d * r.range(0.3, 0.5);
      const px = cx - w * 0.4 + sw / 2 + (i % cols) * (sw + 0.01), pz = cz + (i < cols ? -1 : 1) * d * 0.22;
      sheetAt(px, pz, sw - 0.01, sd);
    }
    if (o.raw !== false && r() < 0.6) rebar(B, cx, y + 0.025, cz - d * 0.3, w * 0.7, d * 0.3, 0.1);
    tanks(0.75);
    if (r() < 0.35) B.box(cx + w * 0.25, y + 0.025, cz + d * 0.3, 0.07, 0.04, 0.05, '#3a3a3a');
  } else if (e === 2) {
    const k = r();
    if (k < 0.45) {
      B.shed(cx, y, cz, w + 0.03, d + 0.03, 0.0, 0.09, r.pick(PAL.sheet), r.pick(['z-', 'z+']), CELL.CORRUG);
      tanks(0.4);
    } else if (k < 0.75) {
      flat();
      if (r() < 0.7) sheetAt(cx, cz - d * 0.2, w * 0.7, d * 0.4, 0.04);
      tanks(0.8);
    } else {
      B.gable(cx, y, cz, ridge === 'x' ? w + 0.05 : w + 0.03, 0.13, ridge === 'x' ? d + 0.05 : d + 0.03, r() < 0.5 ? clay : r.pick(PAL.sheet), ridge, { gable: paint, cell: CELL.ROOFTILE });
    }
  } else if (e === 3) {
    const k = r();
    if (k < 0.55) {
      B.gable(cx, y, cz, w + 0.06, 0.15, d + 0.06, clay, ridge, { gable: paint });
      if (r() < 0.3) chimney(B, cx + w * 0.25, cz, y + 0.14, 0.04, false);
    } else if (k < 0.75) B.hip(cx, y, cz, w + 0.06, 0.14, d + 0.06, clay);
    else { flat(); tanks(0.7); if (r() < 0.4) pergola(B, cx, y + 0.025, cz + d * 0.15, w * 0.5, d * 0.3); }
  } else if (e <= 5) {
    B.gable(cx, y, cz, w + 0.08, 0.17, d + 0.08, clay, ridge, { gable: paint });
    if (w > 0.4 && d > 0.4) {
      // paño cruzado hacia el frente y buhardilla
      const cw = w * 0.38;
      B.gable(cx + w * (r() < 0.5 ? -0.2 : 0.2), y, cz + d * 0.18, ridge === 'x' ? cw : d * 0.5, 0.12, ridge === 'x' ? d * 0.5 : cw, clay, ridge === 'x' ? 'z' : 'x', { gable: paint });
    }
    if (r() < 0.5) chimney(B, cx - w * 0.28, cz - d * 0.1, y + 0.16, 0.04, false);
  } else {
    const col = r() < 0.45 ? r.pick(PAL.slate) : clay;
    B.hip(cx, y, cz, w + 0.1, 0.2, d + 0.1, col);
    if (w > 0.5) B.gable(cx + w * 0.22, y, cz + d * 0.22, w * 0.32, 0.12, d * 0.4, col, 'z', { gable: paint });
    B.box(cx - w * 0.2, y + 0.16, cz, 0.12, 0.012, 0.09, '#a9d3e6'); // claraboya
    if (r() < 0.6) chimney(B, cx - w * 0.3, cz - d * 0.15, y + 0.2, 0.045, false);
  }
}
