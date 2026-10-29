// Lotes generados a partir de la vía (fase 3, primer paso). En vez de usar las casillas fijas de la
// cuadrícula, cada segmento diagonal genera a cada lado una fila de lotes de 12 m de frente alineados con
// la vía (girados 45°). Cada lote se asocia a la casilla que contiene su centro, para que la simulación
// (zonas, valor del suelo, servicios) siga funcionando por casillas.
//
// Las vías ortogonales ya coinciden con la cuadrícula, así que sus lotes son las casillas vecinas.
import { ROADS } from './roads.js';
import { DIAG, diagLines } from './roadnet.js';

// Devuelve Map(índiceDeCasilla -> { px, py, ang, depth, dens }) con px, py en coordenadas de casilla
// (el centro de la casilla i está en i) y ang el giro del modelo para que su fachada (+Z) mire a la vía.
export function diagParcels(net, grid, N, maxDepth = 2) {
  const out = new Map();
  const cand = [];
  for (const seg of net.segs) {
    if (seg.ax !== DIAG) continue;
    const R = ROADS[seg.k];
    if (!R.dens) continue;
    const m = diagLines(R.w) - 1;
    const ux = Math.SQRT1_2, uy = seg.dy * Math.SQRT1_2; // dirección de la vía
    const nx = -seg.dy * Math.SQRT1_2, ny = Math.SQRT1_2; // normal
    const half = (m + 1) / (2 * Math.SQRT2); // medio ancho de la banda de la vía, en casillas
    const ox = seg.s0 + m / 4, oy = seg.dy * (seg.s0 - seg.line - m / 4); // eje en el inicio
    const L = (seg.s1 - seg.s0) * Math.SQRT2;
    for (const side of [-1, 1]) {
      for (let k = 1; k <= maxDepth; k++) {
        const off = side * (half + k - 0.5);
        for (let t = 0.5; t < L; t += 1) {
          const px = ox + ux * t + nx * off, py = oy + uy * t + ny * off;
          const tx = Math.round(px), ty = Math.round(py);
          if (tx < 0 || ty < 0 || tx >= N || ty >= N) continue;
          // fachada hacia la vía: dirección -side·n
          const fx = -side * nx, fz = -side * ny;
          cand.push({ i: ty * N + tx, px, py, ang: Math.atan2(fx, fz), depth: k, dens: k === 1 ? R.dens : 1, rank: R.rank });
        }
      }
    }
  }
  // cada casilla queda con un solo lote: primero los más cercanos a la vía y de la vía de mayor rango
  cand.sort((a, b) => a.depth - b.depth || b.rank - a.rank);
  for (const c of cand) {
    if (out.has(c.i)) continue;
    const t = grid[(c.i / N) | 0][c.i % N];
    if (t.road) continue;
    out.set(c.i, c);
  }
  return out;
}
