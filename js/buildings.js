// Servicios públicos (con su cobertura) y modelos de transporte.
import * as THREE from '../vendor/three.module.min.js';
import { Builder, CELL } from './geom.js';

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

// ---------- SERVICIOS PÚBLICOS ----------
function genCAI(B) {
  B.plane(0, 0.012, 0, 0.98, 0.98, '#b9bcb5');
  B.plane(0, 0.014, 0.3, 0.98, 0.3, '#6f9f5a');
  B.box(0, 0, -0.08, 0.6, 0.34, 0.46, '#f4f1ea', { pick: (f, c, F, C, side) => (side === 'front' && c === 1 ? CELL.DOOR_GLASS : CELL.WIN_BIG), fl: 1, cw: 0.2 });
  B.box(0, 0.0, -0.08, 0.62, 0.06, 0.48, '#2e7d4f', { noTop: true });
  B.box(0, 0.34, -0.08, 0.7, 0.05, 0.56, '#2e7d4f');
  B.box(0, 0.39, -0.08, 0.5, 0.02, 0.4, '#e8e8e8');
  B.box(0, 0.24, 0.155, 0.4, 0.07, 0.012, '#2e7d4f', { pick: () => CELL.SIGN, fl: 1, cw: 0.4, lit: true });
  B.cyl(0.22, 0.41, -0.2, 0.03, 0.05, '#222', 8);
  B.sphere(0.2, 0.47, -0.2, 0.022, '#e63946');
  B.sphere(0.24, 0.47, -0.2, 0.022, '#3a86ff');
  for (const x of [-0.24, 0.12]) {
    B.box(x, 0.02, 0.3, 0.2, 0.05, 0.1, '#f2f2f2');
    B.box(x, 0.035, 0.3, 0.202, 0.02, 0.102, '#2e7d4f', { noTop: true });
    B.box(x - 0.01, 0.07, 0.3, 0.1, 0.04, 0.09, '#22303c');
  }
  B.cyl(-0.42, 0, -0.38, 0.006, 0.5, '#ccc', 4);
  B.box(-0.38, 0.42, -0.38, 0.08, 0.025, 0.004, '#f7d117');
  B.box(-0.38, 0.4075, -0.38, 0.08, 0.0125, 0.004, '#1d4e9a');
  B.box(-0.38, 0.395, -0.38, 0.08, 0.0125, 0.004, '#d62828');
}

function genBomberos(B) {
  B.plane(0, 0.012, 0, 1.98, 1.98, '#8e9399');
  const red = '#c62828';
  B.box(-0.1, 0, -0.35, 1.5, 0.52, 1.0, red, {
    fl: 2, cw: 0.3,
    pick: (f, c, F, C, side) => (side === 'front' && f === 0 ? (c === C - 1 ? CELL.DOOR : CELL.ROLLER) : side === 'front' ? CELL.WIN_BIG : CELL.WIN_SLIDE),
  });
  B.box(-0.1, 0.52, -0.35, 1.56, 0.05, 1.06, '#eeeeee');
  B.box(-0.1, 0.4, 0.155, 1.0, 0.08, 0.012, '#eeeeee', { pick: () => CELL.SIGN, fl: 1, cw: 1, lit: true });
  B.box(0.78, 0, -0.55, 0.36, 1.1, 0.36, red, { pick: () => CELL.WIN_SLIDE, fl: 4, cw: 0.18 });
  B.box(0.78, 1.1, -0.55, 0.42, 0.05, 0.42, '#eeeeee');
  B.cyl(0.78, 1.15, -0.55, 0.012, 0.3, '#ccc', 4);
  for (const x of [-0.6, -0.15, 0.3]) {
    B.box(x, 0.02, 0.5, 0.34, 0.16, 0.16, red);
    B.box(x - 0.1, 0.1, 0.5, 0.12, 0.08, 0.162, '#22303c', { noTop: true });
    B.box(x + 0.04, 0.18, 0.5, 0.26, 0.02, 0.04, '#d8d8d8');
  }
  B.tree(0.8, 0.8, 0.3);
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
  B.rbox(0, 0.012, 0, 2.5, 0.006, 0.16, '#e0d3a8', Math.PI / 4);
  B.rbox(0, 0.013, 0, 2.5, 0.006, 0.16, '#e0d3a8', -Math.PI / 4);
  B.cyl(0, 0.012, 0, 0.36, 0.008, '#e0d3a8', 20);
  // kiosco
  B.cyl(0, 0.02, 0, 0.2, 0.03, '#d6cfbf', 12);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; B.cyl(Math.cos(a) * 0.16, 0.05, Math.sin(a) * 0.16, 0.01, 0.2, '#f4f1ea', 6); }
  B.cone(0, 0.25, 0, 0.24, 0.12, '#b5523b', 12);
  // jardineras con flores
  for (const [x, z, c] of [[-0.6, 0, '#e63946'], [0.6, 0, '#f7b801'], [0, -0.6, '#ff8fab'], [0, 0.6, '#c77dff']]) {
    B.cyl(x, 0.012, z, 0.14, 0.04, '#9a8f7c', 12);
    B.cyl(x, 0.052, z, 0.12, 0.006, c, 12);
  }
  B.palm(-0.55, -0.55, 1.0, true); B.palm(0.55, 0.55, 1.0, true); B.palm(-0.7, 0.62, 0.9, true);
  for (const [x, z, h] of [[0.6, -0.6, 0.42], [0.8, -0.25, 0.34], [-0.8, 0.25, 0.36], [-0.3, -0.82, 0.3], [0.3, 0.82, 0.32], [0.85, 0.3, 0.3]]) B.tree(x, z, h);
  for (const [x, z, ax] of [[-0.3, 0.12, 'x'], [0.3, -0.12, 'x'], [0.12, 0.3, 'z'], [-0.12, -0.3, 'z']]) {
    if (ax === 'x') { B.box(x, 0.03, z, 0.18, 0.02, 0.05, '#7a5230'); B.box(x, 0.0, z, 0.15, 0.03, 0.03, '#555'); }
    else { B.box(x, 0.03, z, 0.05, 0.02, 0.18, '#7a5230'); B.box(x, 0.0, z, 0.03, 0.03, 0.15, '#555'); }
  }
  // juegos infantiles
  B.plane(-0.62, 0.016, -0.25, 0.4, 0.3, '#d9a066');
  B.box(-0.72, 0, -0.25, 0.015, 0.16, 0.015, '#e63946'); B.box(-0.52, 0, -0.25, 0.015, 0.16, 0.015, '#e63946');
  B.box(-0.62, 0.16, -0.25, 0.22, 0.012, 0.015, '#e63946');
  B.shed(-0.62, 0.0, -0.12, 0.08, 0.2, 0.0, 0.14, '#f7b801', 'z-', CELL.PLAIN);
  for (const [x, z] of [[-0.95, -0.95], [0.95, 0.95], [0.95, -0.95], [-0.95, 0.95]]) {
    B.cyl(x * 0.4, 0, z * 0.4, 0.006, 0.28, '#3a3a3a', 5);
    B.box(x * 0.4, 0.28, z * 0.4, 0.03, 0.015, 0.03, '#fff3c4', { pick: () => CELL.SIGN, fl: 1, cw: 0.03, lit: true });
  }
}

function genPlaza(B) {
  B.plane(0, 0.012, 0, 2.98, 2.98, '#d8cdb8');
  for (let i = -3; i <= 3; i++) for (let j = -1; j <= 3; j++) if ((i + j) % 2 === 0) B.plane(i * 0.4, 0.014, j * 0.3 + 0.15, 0.4, 0.3, '#cbbf9f');
  const W = '#f8f4ea', clay = '#a8442a';
  // catedral: nave + crucero + dos torres
  B.box(0, 0, -0.9, 1.0, 0.8, 1.1, W, { pick: (f, c, F, C, side) => (side === 'front' ? CELL.PLAIN : CELL.WIN_ARCH), fl: 1, cw: 0.25 });
  B.gable(0, 0.8, -0.9, 1.08, 0.32, 1.16, clay, 'z', { gable: W });
  B.box(0, 0, -1.05, 1.5, 0.62, 0.4, W, { pick: () => CELL.WIN_ARCH, fl: 1, cw: 0.25 });
  B.gable(0, 0.62, -1.05, 1.56, 0.26, 0.46, clay, 'x', { gable: W });
  B.cyl(0, 0.8, -1.05, 0.2, 0.25, W, 12);
  B.sphere(0, 1.05, -1.05, 0.2, clay, 1, 0.8, 1, 12);
  B.box(0, 1.2, -1.05, 0.015, 0.14, 0.015, '#c9a24d');
  for (const s of [-1, 1]) {
    const x = s * 0.42;
    B.box(x, 0, -0.4, 0.3, 1.25, 0.3, W, { pick: (f, c, F, C) => (f >= F - 1 ? CELL.WIN_ARCH : f === 0 ? CELL.PLAIN : CELL.WIN_SHUT), fl: 4, cw: 0.15 });
    B.box(x, 1.25, -0.4, 0.34, 0.04, 0.34, '#e6dfcf');
    B.box(x, 1.29, -0.4, 0.24, 0.22, 0.24, W, { pick: () => CELL.WIN_ARCH, fl: 1, cw: 0.12 });
    B.cone(x, 1.51, -0.4, 0.17, 0.28, clay, 8);
    B.box(x, 1.79, -0.4, 0.012, 0.12, 0.012, '#c9a24d');
    B.box(x, 1.85, -0.4, 0.06, 0.012, 0.012, '#c9a24d');
  }
  // fachada central con frontón y puerta
  B.box(0, 0, -0.36, 0.54, 0.9, 0.06, W, { pick: (f, c) => (c === 1 ? CELL.PLAIN : CELL.PLAIN), fl: 1, cw: 0.54 });
  B.box(0, 0, -0.325, 0.2, 0.36, 0.01, '#6b4a2b');
  B.cyl(0, 0.62, -0.33, 0.09, 0.01, '#8fb0cc', 12);
  B.gable(0, 0.9, -0.36, 0.6, 0.18, 0.07, W, 'z', { cell: CELL.PLAIN });
  B.box(0, 1.0, -0.33, 0.012, 0.16, 0.012, '#c9a24d');
  // estatua ecuestre
  B.box(0, 0.012, 0.45, 0.26, 0.24, 0.26, '#cfc6b4');
  B.box(0, 0.252, 0.45, 0.2, 0.06, 0.08, '#3f5b4a');
  B.box(0.06, 0.31, 0.45, 0.04, 0.08, 0.04, '#3f5b4a');
  B.sphere(0.06, 0.4, 0.45, 0.025, '#3f5b4a');
  B.box(-0.1, 0.28, 0.45, 0.06, 0.06, 0.04, '#3f5b4a');
  // palmas, bancas y faroles
  for (const [x, z] of [[-1.2, 0.0], [1.2, 0.0], [-1.2, 1.2], [1.2, 1.2], [-0.6, 1.25], [0.6, 1.25]]) B.palm(x, z, 1.1, true);
  for (const [x, z] of [[-0.5, 0.45], [0.5, 0.45], [-0.5, 0.9], [0.5, 0.9]]) { B.box(x, 0.03, z, 0.2, 0.02, 0.06, '#7a5230'); B.box(x, 0.0, z, 0.16, 0.03, 0.03, '#444'); }
  for (const [x, z] of [[-0.85, 0.3], [0.85, 0.3], [-0.85, 1.0], [0.85, 1.0]]) { B.cyl(x, 0, z, 0.008, 0.32, '#2b2b2b', 5); B.sphere(x, 0.33, z, 0.025, '#fff3c4'); }
  B.tree(-1.2, -1.2, 0.36); B.tree(1.2, -1.2, 0.36);
}

function genBiblioteca(B) {
  B.plane(0, 0.012, 0, 1.98, 1.98, '#b5b8b0');
  B.box(0, 0, -0.1, 1.7, 0.12, 1.5, '#9a958a', { top: '#a8a397' });
  for (let i = 0; i < 4; i++) B.box(0, 0, 0.66 + i * 0.05, 0.8, 0.12 - i * 0.03, 0.05, '#a8a397');
  const rocks = [[-0.4, -0.35, 0.72, 1.0, 0.68, 0.38, 0.06], [0.42, -0.25, 0.62, 0.78, 0.6, -0.32, -0.05], [0.0, 0.32, 0.6, 0.62, 0.5, 0.16, 0.04]];
  for (const [x, z, w, h, d, ry, tilt] of rocks) {
    const g = new THREE.BoxGeometry(w, h, d);
    B.geo(g, '#2b2b30', [x, 0.12 + h / 2 - 0.04, z], [tilt, ry, -tilt]);
    g.dispose();
    const s = new THREE.BoxGeometry(w * 1.01, 0.03, d * 0.4);
    B.geo(s, '#c8d7e0', [x, 0.12 + h * 0.55, z], [tilt, ry, -tilt]);
    s.dispose();
  }
  B.rbox(0.02, 0.12, 0.0, 0.9, 0.22, 0.3, '#a9cfe0', 0.1);
  for (const [x, z] of [[-0.85, 0.8], [0.85, 0.8], [0.85, -0.85], [-0.85, -0.85]]) B.tree(x, z, 0.32);
}

function genCancha(B) {
  B.plane(0, 0.012, 0, 1.98, 1.98, '#7fae6a');
  const W = 1.6, D = 1.0;
  for (let i = 0; i < 8; i++) B.plane(-W / 2 + (i + 0.5) * (W / 8), 0.02, 0, W / 8, D, i % 2 ? '#4caf50' : '#43a047');
  const L = '#ffffff';
  B.plane(0, 0.022, -D / 2, W, 0.018, L); B.plane(0, 0.022, D / 2, W, 0.018, L);
  B.plane(-W / 2, 0.022, 0, 0.018, D, L); B.plane(W / 2, 0.022, 0, 0.018, D, L);
  B.plane(0, 0.022, 0, 0.018, D, L);
  B.cyl(0, 0.022, 0, 0.13, 0.002, L, 16);
  B.cyl(0, 0.0225, 0, 0.115, 0.002, '#4caf50', 16);
  for (const s of [-1, 1]) {
    B.plane(s * (W / 2 - 0.12), 0.0221, 0, 0.018, 0.44, L);
    B.plane(s * (W / 2 - 0.06), 0.0221, -0.22, 0.12, 0.018, L);
    B.plane(s * (W / 2 - 0.06), 0.0221, 0.22, 0.12, 0.018, L);
    B.box(s * W / 2, 0, -0.11, 0.012, 0.12, 0.012, '#fff'); B.box(s * W / 2, 0, 0.11, 0.012, 0.12, 0.012, '#fff');
    B.box(s * W / 2, 0.12, 0, 0.012, 0.012, 0.23, '#fff');
  }
  // malla perimetral
  const fence = (x, z, w, d) => B.box(x, 0, z, w, 0.2, d, '#9aa3a8', { pick: () => CELL.VENT, fl: 1, cw: 0.3 });
  fence(0, -0.62, 1.84, 0.008); fence(-0.92, 0, 0.008, 1.24); fence(0.92, 0, 0.008, 1.24);
  // gradería techada
  for (let i = 0; i < 3; i++) B.box(0, i * 0.05, 0.68 + i * 0.07, 1.2, 0.05, 0.08, ['#d62828', '#f7d117', '#1d4e9a'][i]);
  B.box(0, 0.32, 0.75, 1.3, 0.02, 0.3, '#cfd2d6');
  for (const x of [-0.6, 0.6]) B.box(x, 0, 0.88, 0.02, 0.32, 0.02, '#777');
  for (const [x, z] of [[-0.95, -0.85], [0.95, -0.85]]) { B.cyl(x, 0, z, 0.012, 0.75, '#666', 5); B.box(x, 0.75, z, 0.1, 0.06, 0.03, '#fff3c4', { pick: () => CELL.SIGN, fl: 1, cw: 0.1, lit: true }); }
}

function genEstadio(B) {
  B.plane(0, 0.012, 0, 2.98, 2.98, '#9aa59a');
  const PW = 1.3, PD = 1.8;
  for (let i = 0; i < 9; i++) B.plane(0, 0.03, -PD / 2 + (i + 0.5) * (PD / 9), PW, PD / 9, i % 2 ? '#4caf50' : '#43a047');
  B.plane(0, 0.032, 0, PW, 0.02, '#fff');
  B.cyl(0, 0.032, 0, 0.17, 0.002, '#fff', 16);
  B.cyl(0, 0.0325, 0, 0.15, 0.002, '#4caf50', 16);
  const seat = ['#d62828', '#f7d117', '#1d4e9a', '#d62828', '#f7d117'];
  // graderías escalonadas en los 4 lados
  for (let k = 0; k < 5; k++) {
    const h = 0.08 + k * 0.1, o = k * 0.1;
    B.box(-(PW / 2 + 0.06 + o), 0, 0, 0.1, h, PD + 0.12 + 2 * o, seat[k], { top: seat[k] });
    B.box(PW / 2 + 0.06 + o, 0, 0, 0.1, h, PD + 0.12 + 2 * o, seat[k], { top: seat[k] });
    B.box(0, 0, -(PD / 2 + 0.06 + o), PW + 0.12 + 2 * o, h, 0.1, seat[k], { top: seat[k] });
    B.box(0, 0, PD / 2 + 0.06 + o, PW + 0.12 + 2 * o, h, 0.1, seat[k], { top: seat[k] });
  }
  // fachada exterior
  const ow = PW + 1.2, od = PD + 1.2;
  const wall = (x, z, w, d) => B.box(x, 0, z, w, 0.58, d, '#e6e1d6', { pick: (f, c) => (c % 2 ? CELL.PANEL : CELL.VENT), fl: 2, cw: 0.25 });
  wall(0, -od / 2, ow, 0.05); wall(0, od / 2, ow, 0.05); wall(-ow / 2, 0, 0.05, od); wall(ow / 2, 0, 0.05, od);
  // cubiertas sobre las tribunas laterales
  for (const s of [-1, 1]) {
    B.box(s * (ow / 2 - 0.3), 0.66, 0, 0.7, 0.03, od - 0.2, '#f2f2f2');
    for (const z of [-0.8, 0, 0.8]) B.box(s * (ow / 2 - 0.03), 0.58, z, 0.03, 0.1, 0.03, '#999');
  }
  for (const [x, z] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) {
    B.box(x, 0, z, 0.05, 1.5, 0.05, '#8a8a8a');
    B.rbox(x, 1.5, z, 0.22, 0.14, 0.03, '#fff3c4', Math.atan2(x, z));
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
  cai: { name: 'CAI de Policía', icon: '🚓', w: 1, h: 1, cost: 150000, upkeep: 2250, cat: 'seguridad', radius: 9, jobs: 12, gen: genCAI, desc: 'Seguridad en el barrio.' },
  bomberos: { name: 'Estación de Bomberos', icon: '🚒', w: 2, h: 2, cost: 300000, upkeep: 3750, cat: 'bomberos', radius: 13, jobs: 24, gen: genBomberos, desc: 'Protección contra incendios.' },
  escuela: { name: 'Colegio', icon: '🏫', w: 2, h: 2, cost: 350000, upkeep: 3375, cat: 'educacion', radius: 11, jobs: 30, gen: genEscuela, desc: 'Educación básica y media.' },
  universidad: { name: 'Universidad', icon: '🎓', w: 3, h: 3, cost: 1500000, upkeep: 13125, cat: 'educacion', radius: 18, jobs: 90, gen: genUniversidad, desc: 'Educación superior; gran radio.' },
  clinica: { name: 'Centro de Salud', icon: '🏥', w: 2, h: 2, cost: 450000, upkeep: 4500, cat: 'salud', radius: 12, jobs: 30, gen: genClinica, desc: 'Atención primaria.' },
  hospital: { name: 'Hospital', icon: '🚑', w: 3, h: 3, cost: 1800000, upkeep: 16875, cat: 'salud', radius: 18, jobs: 110, gen: genHospital, desc: 'Atención de alta complejidad.' },
  parque: { name: 'Parque', icon: '🌳', w: 2, h: 2, cost: 120000, upkeep: 750, cat: 'recreacion', radius: 9, jobs: 4, gen: genParque, desc: 'Palmas de cera y zonas verdes.' },
  cancha: { name: 'Cancha de Fútbol', icon: '⚽', w: 2, h: 2, cost: 150000, upkeep: 562, cat: 'recreacion', radius: 8, jobs: 2, gen: genCancha, desc: 'El potrero del barrio.' },
  estadio: { name: 'Estadio', icon: '🏟️', w: 3, h: 3, cost: 1600000, upkeep: 11250, cat: 'recreacion', radius: 15, jobs: 60, gen: genEstadio, desc: 'Fútbol para toda la ciudad.' },
  plaza: { name: 'Plaza e Iglesia', icon: '⛪', w: 3, h: 3, cost: 400000, upkeep: 1125, cat: 'cultura', radius: 12, jobs: 10, gen: genPlaza, desc: 'Plaza principal con iglesia.' },
  biblioteca: { name: 'Biblioteca Parque', icon: '📚', w: 2, h: 2, cost: 500000, upkeep: 2250, cat: 'cultura', radius: 12, jobs: 15, gen: genBiblioteca, desc: 'Inspirada en las bibliotecas de Medellín.' },
  mercado: { name: 'Plaza de Mercado', icon: '🧺', w: 2, h: 2, cost: 350000, upkeep: 1875, cat: 'mercado', radius: 12, jobs: 40, gen: genMercado, desc: 'Frutas, verduras y empleo local.' },
};

export function buildPublic(key) {
  const B = new Builder();
  PUBLIC[key].gen(B);
  return B.build();
}

// ---------- TRANSPORTE ----------
export const CABLE_Y = 1.25; // altura del cable sobre la base de la estación

// paradero: caseta con techo junto al andén. dir = lado libre de la vía [dx, dz]
export function buildBusStop(dir) {
  const B = new Builder(31);
  const along = dir[0] !== 0 ? 'z' : 'x';
  const ox = dir[0] * 0.4, oz = dir[1] * 0.4;
  const W = along === 'x' ? 0.42 : 0.12, D = along === 'x' ? 0.12 : 0.42;
  B.box(ox, 0.06, oz, W, 0.2, D, '#bfe3f2', { pick: () => CELL.CURTAIN, fl: 1, cw: 0.14 });
  B.box(ox, 0.26, oz, W + 0.06, 0.025, D + 0.06, '#2a9d4a');
  B.box(ox, 0.06, oz, along === 'x' ? W * 0.9 : 0.04, 0.03, along === 'x' ? 0.04 : D * 0.9, '#7a5230');
  const px = ox + (along === 'x' ? W / 2 + 0.06 : 0), pz = oz + (along === 'x' ? 0 : D / 2 + 0.06);
  B.cyl(px, 0.06, pz, 0.008, 0.36, '#555', 6);
  B.box(px, 0.36, pz, 0.08, 0.08, 0.012, '#2a9d4a', { pick: () => CELL.SIGN, fl: 1, cw: 0.08, lit: true });
  return B.build();
}

// estación de troncal (carril central): plataforma larga con vidrio y techo rojo
export function buildBRTStation(ax) {
  const B = new Builder(32);
  const L = 0.98, W = 0.34;
  const w = ax === 0 ? L : W, d = ax === 0 ? W : L;
  B.box(0, 0.03, 0, w, 0.06, d, '#cfcac0');
  B.box(0, 0.09, 0, ax === 0 ? L * 0.96 : W * 0.7, 0.2, ax === 0 ? W * 0.7 : L * 0.96, '#c8e6f2', { pick: () => CELL.CURTAIN, fl: 1, cw: 0.12 });
  B.box(0, 0.29, 0, w + 0.04, 0.03, d + 0.04, '#c62828');
  B.box(0, 0.32, 0, ax === 0 ? L * 0.7 : 0.06, 0.03, ax === 0 ? 0.06 : L * 0.7, '#e0e0e0');
  for (const s of [-1, 1]) B.box(ax === 0 ? s * 0.4 : 0, 0.09, ax === 0 ? 0 : s * 0.4, 0.03, 0.2, 0.03, '#888');
  return B.build();
}

export function buildCableStation() {
  const B = new Builder(33);
  B.box(0, -1, 0, 0.98, 1.012, 0.98, '#b5b0a4', { top: '#bfc2c5' });
  B.box(0, 0, 0, 0.8, 0.32, 0.8, '#cfd2d6', { pick: (f, c, F, C, side) => (side === 'front' && c === 1 ? CELL.DOOR_GLASS : CELL.CURTAIN_SPAN), fl: 1, cw: 0.2 });
  B.box(0, 0.32, 0, 0.86, 0.04, 0.86, '#d62828');
  B.box(0, 0.36, 0, 0.3, CABLE_Y - 0.36 - 0.12, 0.3, '#f0f0f0', { pick: () => CELL.PANEL, fl: 3, cw: 0.15 });
  B.box(0, CABLE_Y - 0.14, 0, 0.62, 0.06, 0.2, '#d62828');
  B.cyl(0, CABLE_Y - 0.08, 0, 0.2, 0.05, '#33414d', 16);
  B.cyl(0, CABLE_Y - 0.03, 0, 0.06, 0.04, '#d62828', 10);
  B.box(0.36, 0.36, 0.36, 0.02, 0.3, 0.02, '#999');
  B.box(0.36, 0.62, 0.38, 0.12, 0.08, 0.01, '#d62828', { pick: () => CELL.SIGN, fl: 1, cw: 0.12, lit: true });
  return B.build();
}

export function buildBus(color) {
  const B = new Builder(34);
  B.litP = 0.6;
  const L = 0.56, W = 0.2;
  B.box(0, 0.04, 0, L, 0.15, W, color, { pick: (f, c, F, C, side) => (side === 'front' || side === 'back' ? CELL.WIN_SLIDE : CELL.PLAIN), fl: 1, cw: 0.09, top: '#f2f2f2' });
  B.box(0, 0.09, 0, L + 0.004, 0.06, W + 0.004, '#22303c', { noTop: true });
  B.box(L / 2, 0.06, 0, 0.004, 0.11, W * 0.9, '#22303c');
  B.box(0, 0.19, 0, L * 0.5, 0.025, W * 0.6, '#d8d8d8');
  for (const x of [-0.17, 0.17]) for (const z of [-W / 2, W / 2]) B.hcyl(x, 0.035, z, 0.035, 0.025, '#1c1c1c', 'z', 10);
  return B.build();
}

export function buildCabin(color) {
  const B = new Builder(35);
  B.box(0, 0.86, 0, 0.012, 0.32, 0.012, '#333');
  B.box(0, 0.84, 0, 0.06, 0.03, 0.03, '#333');
  B.box(0, 0.52, 0, 0.2, 0.24, 0.2, color, { top: '#333' });
  B.box(0, 0.6, 0, 0.204, 0.11, 0.204, '#9fd0e8', { noTop: true });
  B.box(0, 0.76, 0, 0.16, 0.03, 0.16, '#555');
  return B.build();
}

export function buildCar(color) {
  const B = new Builder(36);
  B.box(0, 0.03, 0, 0.2, 0.05, 0.1, color);
  B.box(-0.01, 0.08, 0, 0.11, 0.045, 0.09, color);
  B.box(-0.01, 0.087, 0, 0.112, 0.03, 0.092, '#22303c', { noTop: true });
  for (const x of [-0.06, 0.06]) for (const z of [-0.05, 0.05]) B.hcyl(x, 0.025, z, 0.022, 0.015, '#1c1c1c', 'z', 8);
  return B.build();
}
