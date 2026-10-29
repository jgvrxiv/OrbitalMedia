// Tipos de vía (ancho, usos, densidad permitida) y malla de vías que sigue el relieve.
import { Builder, CELL, shade } from './geom.js';
import { N, heightAt } from './scene.js';

// dens: densidad máxima que permite en sus frentes (0 = sin acceso a lotes)
export const ROADS = {
  tierra: {
    name: 'Camino destapado', icon: '🟫', w: 1, cost: 2500, upkeep: 1, dens: 1, car: true, bus: false, truck: true, speed: 0.6,
    lv: -0.05, rank: 0, maxSlope: 1.4, color: '#9b7d57', desc: 'Barato, solo baja densidad; sin buses.',
  },
  peatonal: {
    name: 'Calle peatonal', icon: '🚶', w: 1, cost: 9000, upkeep: 3, dens: 2, car: false, bus: false, truck: false, speed: 0,
    lv: 0.06, rank: 1, maxSlope: 1.6, color: '#cdbfa3', desc: 'Sin carros; sube el valor del suelo. Hasta densidad media.',
  },
  calle: {
    name: 'Calle', icon: '🛣️', w: 1, cost: 8000, upkeep: 3, dens: 2, car: true, bus: true, truck: true, speed: 1,
    lv: 0, rank: 2, maxSlope: 1.1, color: '#3d4147', desc: 'Vía local de doble sentido. Hasta densidad media.',
  },
  avenida: {
    name: 'Avenida', icon: '🌴', w: 2, cost: 15000, upkeep: 6, dens: 3, car: true, bus: true, truck: true, speed: 1.5,
    lv: 0.03, rank: 3, maxSlope: 0.9, color: '#383c42', desc: '2 casillas con separador y palmas. Permite alta densidad.',
  },
  troncal: {
    name: 'Troncal de buses', icon: '🚍', w: 3, cost: 19000, upkeep: 8, dens: 3, car: true, bus: true, truck: true, speed: 1.5, busSpeed: 2.2,
    lv: 0.02, rank: 4, maxSlope: 0.8, color: '#3a3e44', desc: '3 casillas con carril exclusivo central (tipo BRT). Buses más rápidos.',
  },
  autopista: {
    name: 'Autopista', icon: '🛤️', w: 2, cost: 24000, upkeep: 10, dens: 0, car: true, bus: true, truck: true, speed: 2.4,
    lv: -0.08, rank: 5, maxSlope: 0.7, color: '#2f3237', desc: 'Rápida, sin acceso a lotes; ruido baja el valor del suelo.',
  },
};
export const ROAD_ORDER = ['tierra', 'peatonal', 'calle', 'avenida', 'troncal', 'autopista'];

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

// Plan de trazado: línea recta sobre el eje dominante, con el ancho del tipo de vía.
export function roadPlan(a, b, k) {
  const R = ROADS[k];
  const dx = b.x - a.x, dy = b.y - a.y;
  const ax = Math.abs(dx) >= Math.abs(dy) ? 0 : 1;
  const offs = R.w === 1 ? [0] : R.w === 2 ? [0, 1] : [-1, 0, 1];
  const out = [];
  if (ax === 0) {
    const s = Math.sign(dx) || 1;
    for (let x = a.x; x !== b.x + s; x += s) offs.forEach((o, li) => out.push({ x, y: a.y + o, ax, c: R.w === 3 && o === 0, li }));
  } else {
    const s = Math.sign(dy) || 1;
    for (let y = a.y; y !== b.y + s; y += s) offs.forEach((o, li) => out.push({ x: a.x + o, y, ax, c: R.w === 3 && o === 0, li }));
  }
  return out;
}

// ---------- malla ----------
const H = (x, z) => heightAt(x, z);
function flat(B, x0, z0, x1, z1, lift, color, cell = null) {
  const a = [x0, H(x0, z1) + lift, z1], b = [x1, H(x1, z1) + lift, z1], c = [x1, H(x1, z0) + lift, z0], d = [x0, H(x0, z0) + lift, z0];
  if (cell !== null) B.cellQuad(a, b, c, d, color, cell, null, false);
  else B.quad(a, b, c, d, color);
}
// cara vertical a lo largo de un borde (bordillo)
function curbFace(B, xa, za, xb, zb, lo, hi, color) {
  B.quad([xa, H(xa, za) + lo, za], [xb, H(xb, zb) + lo, zb], [xb, H(xb, zb) + hi, zb], [xa, H(xa, za) + hi, za], color);
}
// barra elevada a lo largo de un eje (separadores, barreras)
function rail(B, x0, z0, x1, z1, lift, h, color) {
  flat(B, x0, z0, x1, z1, lift + h, color);
  curbFace(B, x0, z1, x1, z1, lift, lift + h, shade(color, 0.8));
  curbFace(B, x1, z0, x0, z0, lift, lift + h, shade(color, 0.8));
  curbFace(B, x1, z1, x1, z0, lift, lift + h, shade(color, 0.8));
  curbFace(B, x0, z0, x0, z1, lift, lift + h, shade(color, 0.8));
}

function lampPost(B, x, z) {
  const y = H(x, z);
  B.box(x, y, z, 0.022, 0.42, 0.022, '#3a3a3a');
  B.box(x, y + 0.42, z, 0.09, 0.02, 0.03, '#3a3a3a');
  B.box(x, y + 0.405, z, 0.06, 0.015, 0.025, '#fff3c4', { pick: () => CELL.SIGN, fl: 1, cw: 0.06, lit: true });
}

export function buildRoadMesh(grid) {
  const B = new Builder(11);
  B.litP = 0;
  const roadAt = (x, y) => (x >= 0 && y >= 0 && x < N && y < N ? grid[y][x].road : null);
  const SIDE = '#cbc6ba', CURB = '#9d9a92', YEL = '#f2c94c', WHITE = '#f4f4f0';
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const t = grid[y][x].road;
      if (!t) continue;
      const R = ROADS[t.k];
      const x0 = x - N / 2, x1 = x0 + 1, z0 = y - N / 2, z1 = z0 + 1, cx = x0 + 0.5, cz = z0 + 0.5;
      const nb = DIRS.map(([dx, dy]) => roadAt(x + dx, y + dy));
      const L = 0.03;
      // superficie
      let base = R.color;
      if (t.k === 'troncal' && t.c && t.ax !== 2) base = '#9c3b32';
      if (t.k === 'peatonal') {
        for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) flat(B, x0 + i / 2, z0 + j / 2, x0 + (i + 1) / 2, z0 + (j + 1) / 2, L, (i + j + x + y) % 2 ? '#d6c9ad' : '#c4b597', CELL.BRICK);
      } else if (t.k === 'tierra') {
        flat(B, x0, z0, x1, z1, L - 0.01, ((x * 7 + y * 3) % 5) / 40 > 0.05 ? '#a08259' : '#967652');
      } else flat(B, x0, z0, x1, z1, L, base);

      // andenes y bordillos donde no hay vía al lado
      const walk = t.k === 'calle' || t.k === 'avenida' || t.k === 'troncal';
      nb.forEach((n, d) => {
        if (n) return;
        const [dx, dy] = DIRS[d];
        const w = 0.15;
        let ex0, ez0, ex1, ez1;
        if (dx === 0) { ex0 = x0; ex1 = x1; ez0 = dy < 0 ? z0 : z1 - w; ez1 = dy < 0 ? z0 + w : z1; }
        else { ez0 = z0; ez1 = z1; ex0 = dx < 0 ? x0 : x1 - w; ex1 = dx < 0 ? x0 + w : x1; }
        if (walk) {
          flat(B, ex0, ez0, ex1, ez1, L + 0.035, SIDE);
          if (dx === 0) curbFace(B, ex0, dy < 0 ? ez1 : ez0, ex1, dy < 0 ? ez1 : ez0, L, L + 0.035, CURB);
          else curbFace(B, dx < 0 ? ex1 : ex0, ez0, dx < 0 ? ex1 : ex0, ez1, L, L + 0.035, CURB);
          if ((x * 3 + y * 5 + d) % 4 === 0) lampPost(B, (ex0 + ex1) / 2, (ez0 + ez1) / 2);
        } else if (t.k === 'autopista') {
          const gx0 = dx === 0 ? x0 : (dx < 0 ? x0 + 0.02 : x1 - 0.05), gx1 = dx === 0 ? x1 : gx0 + 0.03;
          const gz0 = dy === 0 ? z0 : (dy < 0 ? z0 + 0.02 : z1 - 0.05), gz1 = dy === 0 ? z1 : gz0 + 0.03;
          rail(B, gx0, gz0, gx1, gz1, L, 0.06, '#b8bcc0');
          // línea de borde amarilla
          const lx0 = dx === 0 ? x0 : (dx < 0 ? x0 + 0.08 : x1 - 0.1), lz0 = dy === 0 ? z0 : (dy < 0 ? z0 + 0.08 : z1 - 0.1);
          flat(B, lx0, lz0, dx === 0 ? x1 : lx0 + 0.02, dy === 0 ? z1 : lz0 + 0.02, L + 0.004, YEL);
        }
      });

      // demarcación
      const dash = (along, color, off = 0, wid = 0.035) => {
        // dos guiones a lo largo del eje, desplazados 'off' del centro
        for (const s of [0.12, 0.62]) {
          if (along === 0) flat(B, x0 + s, cz + off - wid / 2, x0 + s + 0.26, cz + off + wid / 2, L + 0.004, color);
          else flat(B, cx + off - wid / 2, z0 + s, cx + off + wid / 2, z0 + s + 0.26, L + 0.004, color);
        }
      };
      if (t.ax === 2) {
        // cruce: cebras en bordes que reciben una vía
        if (t.k !== 'tierra' && t.k !== 'peatonal') {
          nb.forEach((n, d) => {
            if (!n || n.k === 'peatonal' || n.k === 'tierra') return;
            const [dx, dy] = DIRS[d];
            const goes = dx !== 0 ? n.ax === 0 : n.ax === 1;
            if (!goes) return;
            for (let i = 0; i < 5; i++) {
              const s = 0.1 + i * 0.17;
              if (dx === 0) { const zz = dy < 0 ? z0 + 0.05 : z1 - 0.17; flat(B, x0 + s, zz, x0 + s + 0.09, zz + 0.12, L + 0.004, WHITE); }
              else { const xx = dx < 0 ? x0 + 0.05 : x1 - 0.17; flat(B, xx, z0 + s, xx + 0.12, z0 + s + 0.09, L + 0.004, WHITE); }
            }
          });
        }
      } else {
        const along = t.ax;
        // vecinos perpendiculares de la misma vía (carriles internos)
        const perp = along === 0 ? [nb[0], nb[2]] : [nb[3], nb[1]];
        const same = perp.map((n) => n && n.k === t.k && n.ax === t.ax);
        if (t.k === 'calle') dash(along, YEL);
        else if (t.k === 'tierra') {
          const c = '#7d6342';
          for (const o of [-0.18, 0.18]) {
            if (along === 0) flat(B, x0, cz + o - 0.04, x1, cz + o + 0.04, L - 0.005, c);
            else flat(B, cx + o - 0.04, z0, cx + o + 0.04, z1, L - 0.005, c);
          }
        } else if (t.k === 'avenida' || t.k === 'autopista') {
          dash(along, WHITE, 0);
          // separador en el borde compartido (se dibuja desde la casilla "menor")
          if (same[1]) {
            const isAv = t.k === 'avenida';
            const wd = isAv ? 0.11 : 0.04;
            if (along === 0) rail(B, x0, z1 - wd, x1, z1 + wd, L, isAv ? 0.04 : 0.08, isAv ? '#7aa65a' : '#c9c9c4');
            else rail(B, x1 - wd, z0, x1 + wd, z1, L, isAv ? 0.04 : 0.08, isAv ? '#7aa65a' : '#c9c9c4');
            if (isAv && (x + y) % 2 === 0) {
              const px = along === 0 ? cx : x1, pz = along === 0 ? z1 : cz;
              B.palm(px, pz, 0.75, false, H(px, pz) + L + 0.04);
            }
          }
        } else if (t.k === 'troncal') {
          if (t.c) {
            // carril exclusivo: bordes blancos y separadores
            for (const o of [-0.46, 0.46]) {
              if (along === 0) flat(B, x0, cz + o - 0.015, x1, cz + o + 0.015, L + 0.004, WHITE);
              else flat(B, cx + o - 0.015, z0, cx + o + 0.015, z1, L + 0.004, WHITE);
            }
            for (const side of [0, 1]) {
              if (!same[side]) continue;
              if (along === 0) { const zz = side ? z1 : z0; rail(B, x0 + 0.05, zz - 0.03, x1 - 0.05, zz + 0.03, L, 0.05, '#e0ddd5'); }
              else { const xx = side ? x1 : x0; rail(B, xx - 0.03, z0 + 0.05, xx + 0.03, z1 - 0.05, L, 0.05, '#e0ddd5'); }
            }
          } else dash(along, WHITE, 0);
        } else if (t.k === 'peatonal' && (x + y) % 3 === 0) {
          // bancas y materas
          const px = along === 0 ? cx : x0 + 0.18, pz = along === 0 ? z0 + 0.18 : cz;
          const h = H(px, pz) + L;
          B.box(px, h, pz, 0.12, 0.08, 0.12, '#9a8f7c', { top: '#6aa84f' });
          B.bush(px, pz, 0.07, '#4d8f3f', h + 0.08);
          lampPost(B, along === 0 ? cx : x1 - 0.12, along === 0 ? z1 - 0.12 : cz);
        }
      }
    }
  }
  return B.build();
}
