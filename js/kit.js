// Piezas reutilizables para los modelos: paletas por estrato, lotes, cercas, tanques, balcones, toldos…
// Convención: el lote ocupa [-0.5, 0.5] en X y Z; la fachada principal mira a +Z (hacia la vía).
import { CELL, shade } from './geom.js';

export const F = 0.26; // altura de piso residencial

export const PAL = {
  // muros pintados / acabados por estrato
  wall: {
    1: ['#b8714f', '#a9a59c', '#c8b39a', '#7f98a8', '#c98f7a', '#8ea07a', '#d6c38d', '#a8604a'],
    2: ['#f2c14e', '#7fc8a9', '#f28f8f', '#7cb6e0', '#f4a259', '#c8a2d8', '#e8d6a0', '#9fd18b', '#ff9e7a', '#5fbfbf'],
    3: ['#efe2c8', '#e3d0b0', '#d4e0d6', '#f0cfa5', '#c9d6e3', '#f0d9cf', '#e8e0a8', '#d8c3e0'],
    4: ['#f1ece2', '#dcd3c3', '#e9dccb', '#e2e7e8', '#d9cbb4', '#f3e7d3'],
    5: ['#f4f1ea', '#e7e2d8', '#d3cec3', '#ece6dc', '#f6f2e8'],
    6: ['#fbfaf6', '#efe9dc', '#e6dfd0', '#f7f4ee'],
  },
  brick: ['#b4553a', '#a14a35', '#c0643f', '#9c4a34', '#b8714f'],
  zinc: ['#8f969c', '#a2622f', '#b5babe', '#7d848b', '#9b5a33'],
  clay: ['#b5523b', '#a8442a', '#c0603f', '#9a4030'],
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
