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
  cai: { name: 'CAI de Policía', icon: '🚓', w: 1, h: 1, cost: 150000, upkeep: 1500, cat: 'seguridad', radius: 9, jobs: 12, gen: genCAI, desc: 'Seguridad en el barrio.' },
  bomberos: { name: 'Estación de Bomberos', icon: '🚒', w: 2, h: 2, cost: 300000, upkeep: 2500, cat: 'bomberos', radius: 13, jobs: 24, gen: genBomberos, desc: 'Protección contra incendios.' },
  escuela: { name: 'Colegio', icon: '🏫', w: 2, h: 2, cost: 350000, upkeep: 2250, cat: 'educacion', radius: 11, jobs: 30, gen: genEscuela, desc: 'Educación básica y media.' },
  universidad: { name: 'Universidad', icon: '🎓', w: 3, h: 3, cost: 1500000, upkeep: 8750, cat: 'educacion', radius: 18, jobs: 90, gen: genUniversidad, desc: 'Educación superior; gran radio.' },
  clinica: { name: 'Centro de Salud', icon: '🏥', w: 2, h: 2, cost: 450000, upkeep: 3000, cat: 'salud', radius: 12, jobs: 30, gen: genClinica, desc: 'Atención primaria.' },
  hospital: { name: 'Hospital', icon: '🚑', w: 3, h: 3, cost: 1800000, upkeep: 11250, cat: 'salud', radius: 18, jobs: 110, gen: genHospital, desc: 'Atención de alta complejidad.' },
  parque: { name: 'Parque', icon: '🌳', w: 2, h: 2, cost: 120000, upkeep: 500, cat: 'recreacion', radius: 9, jobs: 4, gen: genParque, desc: 'Palmas de cera y zonas verdes.' },
  cancha: { name: 'Cancha de Fútbol', icon: '⚽', w: 2, h: 2, cost: 150000, upkeep: 375, cat: 'recreacion', radius: 8, jobs: 2, gen: genCancha, desc: 'El potrero del barrio.' },
  estadio: { name: 'Estadio', icon: '🏟️', w: 3, h: 3, cost: 1600000, upkeep: 7500, cat: 'recreacion', radius: 15, jobs: 60, gen: genEstadio, desc: 'Fútbol para toda la ciudad.' },
  plaza: { name: 'Plaza e Iglesia', icon: '⛪', w: 3, h: 3, cost: 400000, upkeep: 750, cat: 'cultura', radius: 12, jobs: 10, gen: genPlaza, desc: 'Plaza principal con iglesia.' },
  biblioteca: { name: 'Biblioteca Parque', icon: '📚', w: 2, h: 2, cost: 500000, upkeep: 1500, cat: 'cultura', radius: 12, jobs: 15, gen: genBiblioteca, desc: 'Inspirada en las bibliotecas de Medellín.' },
  mercado: { name: 'Plaza de Mercado', icon: '🧺', w: 2, h: 2, cost: 350000, upkeep: 1250, cat: 'mercado', radius: 12, jobs: 40, gen: genMercado, desc: 'Frutas, verduras y empleo local.' },
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
