// Rascacielos emblemáticos de Colombia, a escala real (1 casilla = 12 m): el edificio Coltejer (Medellín, 1972,
// 175 m) con su fachada de lamas oscuras, la torre de vidrio con exoesqueleto naranja de Bogotá y el complejo
// BD Bacatá (Bogotá, 216 m) con sus terrazas escalonadas. Son únicos: sólo puede existir uno de cada uno.
// Coordenadas locales en unidades de casilla, centradas en el lote; la fachada principal mira a +Z.
import * as THREE from '../vendor/three.module.min.js';
import { CELL, shade } from './geom.js';
import { m2u } from './units.js';

const M = m2u;

// barra entre dos puntos (diagonales del exoesqueleto)
function strut(B, a, b, t, color) {
  const dir = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  const eu = new THREE.Euler().setFromQuaternion(q);
  const g = new THREE.BoxGeometry(t, len, t);
  B.geo(g, color, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], [eu.x, eu.y, eu.z]);
  g.dispose();
}

function flag(B, x, y, z, colors, h = M(2.4), w = M(3.6)) {
  B.box(x, y, z, M(0.25), M(14), M(0.25), '#d9d9d9');
  colors.forEach((c, i) => B.box(x + w / 2 + M(0.12), y + M(14) - (i + 1) * (h / colors.length), z, w, h / colors.length, M(0.1), c));
}

// ---------------- Edificio Coltejer ----------------
function coltejer(B) {
  const FT = M(3.7), floors = 36, H = floors * FT;
  const W = M(27), D = M(17), z0 = -M(3);
  const white = '#eeece6', dark = '#3a342f';
  B.plane(0, 0.012, 0, 2.9, 2.9, '#bdb9ae');
  B.plane(0, 0.014, M(13), 2.2, M(8), '#9fb88a');
  // basamento de tres pisos acristalado y plaza al frente
  B.box(0, 0, z0 + M(2), M(32), FT * 3, M(26), '#d7d2c6', { fl: 3, cw: M(4), pick: (f, c, F, C, side) => (side === 'front' ? (f === 0 ? CELL.SHOP : CELL.FLOORGLASS) : CELL.PLAIN) });
  B.box(0, FT * 3, z0 + M(2), M(33), 0.02, M(27), '#a7a39b');
  const y0 = FT * 3 + 0.02, h = (floors - 3) * FT;
  // torre: lado ancho mitad blanco con ventanas y mitad lamas oscuras
  B.box(0, y0, z0, W, h, D, white, {
    fl: floors - 3, cw: M(1.8),
    pick: (f, c, F, C, side) => {
      if (side === 'front' || side === 'back') return c < Math.round(C * 0.33) ? CELL.WIN_SLIDE : [CELL.PLAIN, dark];
      return CELL.WIN_SLIDE;
    },
  });
  // lamas verticales (franjas) sobre la fachada oscura
  const x0 = -W / 2 + W * 0.33, x1 = W / 2;
  for (const s of [1, -1]) {
    const zf = z0 + s * (D / 2 + 0.004);
    for (let x = x0 + M(0.3); x < x1 - M(0.2); x += M(0.9)) B.box(x, y0, zf, M(0.45), h, 0.008, x % 2 > 1 ? '#5c4d42' : '#262120');
  }
  B.box(-W / 2 + W * 0.33, y0, z0 + D / 2 + 0.006, 0.012, h, 0.012, '#cfcac0');
  // remate: cuerpo más angosto, cúpula oscura inclinada y aguja con banderas
  const yT = y0 + h;
  B.box(0, yT, z0, W - M(3), M(7), D - M(2), white, { fl: 2, cw: M(2.5), pick: () => CELL.WIN_SLIDE });
  B.hip(0, yT + M(7), z0, W - M(3), M(14), D - M(2), '#9b978f', CELL.PANEL);
  B.box(0, yT + M(7), z0, M(1.2), M(20), D - M(1), dark);
  B.cyl(0, yT + M(21), z0, M(0.5), M(27), '#d9d9d9', 6, M(0.12));
  B.sphere(0, yT + M(48.5), z0, M(0.5), '#ff3b30');
  flag(B, -W / 2 + M(3), yT + M(7), z0 + D / 2 - M(2), ['#fcd116', '#003893', '#ce1126']);
  flag(B, W / 2 - M(3), yT + M(7), z0 + D / 2 - M(2), ['#2e8b3e', '#ffffff']);
  B.tree(-1.2, 1.0, 0.3); B.tree(1.2, 1.0, 0.3); B.palm(-0.5, 1.15, 0.8, true); B.palm(0.5, 1.15, 0.8, true);
}

// ---------------- Torre de vidrio con exoesqueleto naranja ----------------
function torreNaranja(B) {
  const FT = M(3.9), floors = 44, W = M(21), orange = '#d8662b';
  const tint = '#6f93ad';
  B.plane(0, 0.012, 0, 1.96, 1.96, '#b4b0a6');
  // podio de vidrio
  B.box(0, 0, 0, M(23), FT * 3, M(23), '#40596b', { fl: 3, cw: M(3), pick: (f, c, F, C, side) => (side === 'front' && f === 0 && c === Math.floor(C / 2) ? CELL.DOOR_GLASS : CELL.FLOORGLASS) });
  B.box(0, FT * 3, 0, M(23.4), 0.02, M(23.4), '#2e3a46');
  const y0 = FT * 3 + 0.02, h = (floors - 3) * FT;
  B.box(0, y0, 0, W, h, W, tint, { fl: floors - 3, cw: M(1.5), pick: () => CELL.CURTAIN });
  // montante naranja central en las cuatro caras y esquinas de acero
  const e = W / 2 + 0.006;
  for (const [x, z, w, d] of [[0, e, M(1), 0.012], [0, -e, M(1), 0.012], [e, 0, 0.012, M(1)], [-e, 0, 0.012, M(1)]]) B.box(x, y0, z, w, h, d, orange);
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B.box(a * W / 2, y0, b * W / 2, M(0.7), h, M(0.7), '#2b3a46');
  // corona: cuerpo de vidrio más angosto con el logo y exoesqueleto en V
  const yC = y0 + h, cH = M(24), cw = M(17);
  B.box(0, yC, 0, cw, cH, cw, '#5b7f9a', { fl: 6, cw: M(1.5), pick: () => CELL.CURTAIN });
  B.box(0, yC + cH, 0, cw + M(0.8), M(0.8), cw + M(0.8), '#2b3a46');
  const top = yC + cH + M(16), ap = [0, top, 0];
  for (const s of [-1, 1]) {
    strut(B, [s * W / 2, yC, W / 2 + 0.01], [0, yC - M(24), W / 2 + 0.01], M(0.8), orange); // V de la fachada
    strut(B, [0, yC - M(24), W / 2 + 0.01], [0, y0, W / 2 + 0.01], M(0.9), orange);
  }
  B.box(0, yC + cH * 0.45, W * 0.0 + cw / 2 + 0.01, M(5), M(5), 0.012, '#26303a'); // logo
  // corona en pentágono: techo a dos aguas de vidrio con el exoesqueleto naranja siguiendo sus aristas, y mástil
  const yR = yC + cH + M(0.8), rh = M(15);
  B.gable(0, yR, 0, cw - M(1), rh, cw - M(1), '#7fa3bd', 'x', { gable: '#5b7f9a', cell: CELL.PANEL });
  for (const sz of [1, -1]) for (const sx of [-1, 1]) strut(B, [sx * (cw - M(1)) / 2, yR, sz * (cw - M(1)) / 2 + sz * 0.006], [0, yR + rh, sz * (cw - M(1)) / 2 + sz * 0.006], M(0.8), orange);
  B.cyl(0, yR + rh, 0, M(0.5), M(14), '#d9d9d9', 6, M(0.1));
  void ap;
  B.tree(-0.9, 0.9, 0.3); B.tree(0.9, 0.9, 0.3);
}

// ---------------- BD Bacatá ----------------
// Dos torres unidas por un núcleo claro sobre un basamento comercial. La torre alta (216 m) es una pirámide escalonada:
// el borde izquierdo y el fondo quedan a plomo y el lado derecho y el frente retroceden en cada nivel, dejando terrazas de
// vidrio con jardineras; remata en una corona de vidrio con mástil. La torre izquierda es gris, de ventanas en franja.
function bdBacata(B) {
  const glass = '#9fb9cc';
  B.plane(0, 0.012, 0, 2.95, 2.95, '#bcb8ad');
  // basamento comercial
  B.box(0, 0, M(2), M(35), M(12), M(31), '#b9a894', { fl: 3, cw: M(4), pick: (f, c, F, C, side) => (side === 'front' ? (f === 0 ? CELL.SHOP : CELL.FLOORGLASS) : CELL.PLAIN) });
  B.box(0, M(12), M(2), M(35.6), 0.02, M(31.6), '#8f8a80');
  const yb = M(12) + 0.02, zb = -M(14); // fondo común de las torres
  // torre izquierda: gris, 44 pisos, con retranqueo superior
  const FT = M(3.7);
  B.box(-M(11.5), yb, zb, M(11), 32 * FT, M(20), '#7a8187', { fl: 32, cw: M(1.7), pick: () => CELL.CURTAIN });
  B.box(-M(11.5), yb + 32 * FT, zb, M(9), 12 * FT, M(17), '#6c7379', { fl: 12, cw: M(1.7), pick: () => CELL.CURTAIN });
  B.box(-M(11.5), yb + 44 * FT, zb, M(9.4), M(1.2), M(17.4), '#454b50');
  B.box(-M(16.8), yb, zb, M(4), M(70), M(16), '#8d949a', { fl: 18, cw: M(1.7), pick: () => CELL.WIN_SLIDE }); // cuerpo bajo al borde
  // núcleo claro que une las dos torres
  B.box(-M(4.5), yb, zb, M(4), M(150), M(12), '#d6d6d2', { fl: 40, cw: M(1.4), pick: () => CELL.WIN_SLIDE });
  // torre alta: base de concreto y 9 niveles de vidrio que retroceden hacia la derecha y el frente
  const xl = -M(2.5);
  const baseW = M(19), baseD = M(17);
  B.box(xl + baseW / 2, yb, zb + baseD / 2, baseW, M(24), baseD, '#8d949a', { fl: 6, cw: M(1.6), pick: () => CELL.CURTAIN });
  let y = yb + M(24), pw = baseW, pd = baseD;
  B.box(xl + pw / 2, y, zb + pd / 2, pw + M(0.6), M(0.9), pd + M(0.6), '#ececec');
  y += M(0.9);
  for (let k = 0; k < 9; k++) {
    const w = baseW - (k + 1) * M(1.4), d = baseD, hh = M(17); // sólo retrocede el lado derecho
    B.box(xl + w / 2, y, zb + d / 2, w, hh, d, glass, { fl: 4, cw: M(1.5), pick: () => CELL.CURTAIN });
    // terraza que deja el nivel de abajo: losa blanca y jardinera al borde
    B.box(xl + pw / 2, y - M(0.05), zb + pd / 2, pw + M(0.5), M(0.5), pd + M(0.5), '#ececec');
    if (k % 2 === 0) B.box(xl + w + (pw - w) / 2, y + M(0.45), zb + pd / 2, M(0.9), M(0.9), pd - M(2), '#4d8f3f');
    y += hh;
    pw = w; pd = d;
  }
  // corona de vidrio y mástil
  B.box(xl + pw / 2, y, zb + pd / 2, pw + M(0.4), M(0.8), pd + M(0.4), '#ececec');
  B.box(xl + pw / 2, y + M(0.8), zb + pd / 2, pw - M(1), M(28), pd - M(1), '#bcd6e6', { fl: 8, cw: M(1.3), pick: () => CELL.FLOORGLASS, top: '#33414d' });
  B.box(xl + pw / 2, y + M(28.8), zb + pd / 2, pw - M(2), M(2), pd - M(2), '#33414d');
  B.cyl(xl + pw / 2, y + M(30.8), zb + pd / 2, M(0.5), M(14), '#d9d9d9', 6, M(0.1));
  // columna estructural blanca en el borde izquierdo (todo el alto, hasta la corona) y columna delgada en el derecho
  B.box(xl + M(1.6), yb, zb + baseD / 2, M(3.2), M(216) - M(12), baseD + M(0.4), '#e8e8e4');
  B.box(xl + baseW - M(1.2), yb, zb + baseD / 2, M(2.4), M(120), baseD, '#d6d6d2', { fl: 33, cw: M(1.2), pick: () => CELL.WIN_SLIDE });
  // bloque bajo de ladrillo al frente (la "casona" del conjunto)
  B.box(M(12), yb, M(11), M(14), M(18), M(10), '#8c6a52', { fl: 5, cw: M(2), pick: () => CELL.WIN_SLIDE });
  B.tree(-1.2, 1.2, 0.3); B.tree(0.2, 1.3, 0.3); B.palm(-0.6, 1.35, 0.7, true);
  void shade;
}

export const ICON_TYPES = {
  coltejer: { name: 'Edificio Coltejer', fn: coltejer, jobs: 3, native: [3, 3], icon: true },
  torreNaranja: { name: 'Torre de vidrio con exoesqueleto naranja', fn: torreNaranja, jobs: 3.2, native: [2, 2], icon: true },
  bdBacata: { name: 'Complejo BD Bacatá', fn: bdBacata, jobs: 4.5, native: [3, 3], icon: true },
};
