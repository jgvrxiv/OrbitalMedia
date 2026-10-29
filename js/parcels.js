// Lotes generados a partir de la vía (fase 3, primer paso). En vez de usar las casillas fijas de la
// cuadrícula, cada segmento diagonal genera a cada lado una fila de lotes de 12 m de frente alineados con
// la vía (girados 45°). Cada lote se asocia a la casilla que contiene su centro, para que la simulación
// (zonas, valor del suelo, servicios) siga funcionando por casillas.
//
// Las vías ortogonales ya coinciden con la cuadrícula, así que sus lotes son las casillas vecinas.
import { ROADS } from './roads.js';
import { DIAG, diagLines } from './roadnet.js';

// Devuelve { parcels: Map(índiceDeCasilla -> { px, py, ang, depth, dens }), region } donde region marca las
// casillas reservadas por las diagonales;  con px, py en coordenadas de casilla
// (el centro de la casilla i está en i) y ang el giro del modelo para que su fachada (+Z) mire a la vía.
export function diagParcels(net, grid, N, maxDepth = 3) {
  const out = new Map();
  // franja de cada diagonal: casillas cuyo centro cae dentro del ancho de la vía más el fondo de los lotes
  const region = new Uint8Array(N * N);
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
    const reach = half + maxDepth;
    const x0 = Math.floor(Math.min(seg.s0, seg.s1) - reach - 2), x1 = Math.ceil(Math.max(seg.s0, seg.s1) + reach + 2);
    for (let tx = Math.max(0, x0); tx <= Math.min(N - 1, x1); tx++) {
      for (let ty = 0; ty < N; ty++) {
        const dx = tx - ox, dy = ty - oy;
        const t = dx * ux + dy * uy, d = dx * nx + dy * ny;
        if (t >= 0 && t <= L && Math.abs(d) <= reach) region[ty * N + tx] = 1;
      }
    }
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
  const free = (i) => i >= 0 && i < N * N && region[i] && !out.has(i) && !grid[(i / N) | 0][i % N].road;
  for (const c of cand) {
    let i = c.i;
    if (!free(i)) {
      // la casilla ya tiene lote: se usa la casilla libre más cercana al centro del lote
      const cx = i % N, cy = (i / N) | 0;
      let best = -1, bd = 0.9;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
        const ni = ny * N + nx, d = Math.hypot(c.px - nx, c.py - ny);
        if (free(ni) && d < bd) { bd = d; best = ni; }
      }
      if (best < 0) continue;
      i = best;
    }
    out.set(i, { ...c, i });
  }
  return { parcels: out, region };
}
