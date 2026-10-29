// Modelos de oficinas. Densidad -> tipología; estrato del lote -> categoría (popular, media, exclusiva).
import { CELL, shade } from './geom.js';
import { F, PAL, lot, fence, car, sign, hvac, pots, lamp } from './kit.js';
import { COM_TYPES, tierOf } from './models_com.js';
import { REF_COM } from './models_ref.js';

// Casa convertida en oficinas: dos o tres pisos, primer piso vidriado, placa con el nombre y parqueadero al frente.
function casaOficinas(B, e) {
  const r = B.r;
  lot(B, Math.max(3, e));
  const tier = tierOf(e);
  const wall = tier === 1 ? r.pick(PAL.wall[3]) : r.pick(['#efe9df', '#f4f1ea', '#e2ddd3', '#b5593a']);
  const floors = tier === 3 ? 3 : r.int(2, 3);
  const z = -0.14, w = 0.74, d = 0.5;
  B.box(0, 0, z, w, F * 1.1, d, '#3a4048', { fl: 1, cw: 0.185, pick: (f, c, Fn, C, side) => (side === 'front' ? (c === 1 ? CELL.DOOR_GLASS : CELL.FLOORGLASS) : CELL.PANEL) });
  B.box(0, F * 1.1, z, w, (floors - 1) * F, d, wall, {
    fl: floors - 1, cw: 0.185,
    pick: (f, c, Fn, C, side) => (side === 'front' || side === 'back' ? CELL.WIN_BIG : c % 2 ? CELL.WIN_SLIDE : CELL.PLAIN),
  });
  const H = F * 1.1 + (floors - 1) * F;
  B.box(0, H, z, w + 0.04, 0.03, d + 0.04, shade(wall, 0.8));
  hvac(B, 0.15, H + 0.03, z - 0.08);
  B.box(0, F * 1.1, z + d / 2 + 0.05, w + 0.04, 0.02, 0.1, '#2e3a46');
  sign(B, -0.2, F * 0.85, z + d / 2 + 0.006, 0.22, 0.05, r.pick(['#5b2a86', '#1d4e9a', '#2e3a46']), { text: '#ffffff' });
  B.plane(0, 0.014, 0.3, 0.96, 0.32, '#55585c');
  for (let i = 0; i < 4; i++) {
    B.plane(-0.36 + i * 0.24, 0.016, 0.3, 0.008, 0.26, '#e8e8e8');
    if (r() < 0.65) car(B, -0.24 + i * 0.24 - 0.12, 0.3, 1);
  }
  pots(B, 0.3, z + d / 2 + 0.04, 3);
  fence(B, 'seto', { sides: ['left', 'right'] });
}

// Centro empresarial de 4-5 pisos: vidrio y piedra alrededor de una plazoleta arborizada.
function centroEmpresarial(B, e) {
  const r = B.r;
  lot(B, Math.max(4, e));
  const stone = r.pick(PAL.stone);
  const tint = r.pick(PAL.glass);
  const floors = r.int(4, 5);
  B.plane(0, 0.014, 0.2, 0.95, 0.5, '#d6d0c4');
  B.box(0, 0, -0.28, 0.9, floors * F, 0.36, tint, {
    fl: floors, cw: 0.15,
    pick: (f, c, Fn, C, side) => (f === 0 && side === 'front' && (c === 2 || c === 3) ? CELL.DOOR_GLASS : side === 'front' ? CELL.CURTAIN_SPAN : c === 0 ? [CELL.PANEL, stone] : CELL.CURTAIN_SPAN),
  });
  B.box(-0.33, 0, 0.12, 0.24, floors * F * 0.75, 0.44, stone, {
    fl: Math.max(2, floors - 1), cw: 0.12,
    pick: (f, c, Fn, C, side) => (side === 'right' ? CELL.FLOORGLASS : side === 'front' ? CELL.WIN_BIG : CELL.PANEL),
  });
  B.box(0, floors * F, -0.28, 0.94, 0.04, 0.4, '#2e3a46');
  B.box(-0.33, floors * F * 0.75, 0.12, 0.28, 0.03, 0.48, '#2e3a46');
  sign(B, 0.15, floors * F - 0.12, -0.1 + 0.002, 0.34, 0.08, '#ffffff', { text: r.pick(['#5b2a86', '#1d4e9a']) });
  for (const [x, z] of [[0.1, 0.2], [0.32, 0.36], [0.32, 0.06]]) { B.box(x, 0, z, 0.1, 0.05, 0.1, '#9a958a', { top: '#6aa84f' }); B.tree(x, z, 0.26, '#3a8a35', 0.05); }
  lamp(B, -0.08, 0.42, 0.25); lamp(B, 0.42, 0.42, 0.25);
}

export const OFF_TYPES = {
  casaOficinas: { name: 'Casa de oficinas', fn: casaOficinas, jobs: 1 },
  centroEmpresarial: { name: 'Centro empresarial', fn: centroEmpresarial, jobs: 1.2 },
  edificioOficinas: { name: 'Edificio de oficinas', fn: COM_TYPES.oficinas.fn, jobs: 1 },
  torreOficinas: { name: 'Torre de oficinas', fn: COM_TYPES.torreOficinas.fn, jobs: 1.4 },
  torreCorona: { name: 'Torre de oficinas con corona', fn: REF_COM.torreCorona.fn, jobs: 1.8 },
  torreEsbelta: { name: 'Torre de oficinas esbelta', fn: REF_COM.torreEsbelta.fn, jobs: 1.7 },
};

// densidad -> categoría (1 popular, 2 media, 3 exclusiva) -> [tipo, peso]
const TABLE = {
  1: { 1: [['casaOficinas', 1]], 2: [['casaOficinas', 1]], 3: [['casaOficinas', 1]] },
  2: { 1: [['edificioOficinas', 1]], 2: [['edificioOficinas', 0.6], ['centroEmpresarial', 0.4]], 3: [['centroEmpresarial', 0.6], ['edificioOficinas', 0.4]] },
  3: { 1: [['torreOficinas', 1]], 2: [['torreOficinas', 0.7], ['torreEsbelta', 0.3]], 3: [['torreOficinas', 0.3], ['torreCorona', 0.35], ['torreEsbelta', 0.35]] },
};
export function pickOffType(d, e, r) {
  const list = TABLE[d][tierOf(e)];
  let t = r() * list.reduce((s, a) => s + a[1], 0);
  for (const [v, w] of list) { t -= w; if (t <= 0) return v; }
  return list[list.length - 1][0];
}
export const OFF_JOBS = { 1: 20, 2: 60, 3: 200 };
