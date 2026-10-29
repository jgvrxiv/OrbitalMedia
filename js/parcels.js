// Lotes generados a partir de la vía (fase 3). Cada segmento genera filas de lotes de 12 m de frente a cada
// lado, alineadas con la vía: en las ortogonales coinciden con las casillas, en las diagonales quedan girados
// 45°. Todos compiten por las casillas con la misma prioridad (más cerca de la vía primero, luego la vía de
// mayor rango), así no se superponen lotes rectos y girados. Cada lote se asocia a la casilla que contiene su
// centro, para que la simulación (zonas, valor del suelo, servicios) siga funcionando por casillas.
import { ROADS } from './roads.js';
import { DIAG, diagLines } from './roadnet.js';

const ORTHO_DEPTH = 2, DIAG_DEPTH = 3;

// Devuelve { parcels, region }:
//  parcels: Map(índice -> { px, py, ang, face, dens, depth, diag }) con px, py en coordenadas de casilla
//   (el centro de la casilla i está en i). Diagonales: ang = giro del modelo para mirar la vía.
//   Ortogonales: face = dirección hacia la vía (índice en [[0,-1],[1,0],[0,1],[-1,0]]).
//  region: casillas reservadas por las diagonales (sin lote girado no se usan).
export function buildParcels(net, grid, N) {
  const region = new Uint8Array(N * N);
  const cand = [];
  for (const seg of net.segs) {
    const R = ROADS[seg.k];
    if (!R.dens) continue;
    if (seg.ax === DIAG) diagCandidates(seg, R, N, region, cand);
    else orthoCandidates(seg, R, N, grid, cand);
  }
  cand.sort((a, b) => a.depth - b.depth || b.rank - a.rank || (a.diag ? 1 : 0) - (b.diag ? 1 : 0));
  const out = new Map();
  const free = (i) => i >= 0 && i < N * N && !out.has(i) && !grid[(i / N) | 0][i % N].road;
  for (const c of cand) {
    let i = c.i;
    if (!free(i)) {
      if (!c.diag) continue;
      // lote girado: si su casilla ya tiene lote, usa la casilla libre de la franja más cercana a su centro
      const cx = i % N, cy = (i / N) | 0;
      let best = -1, bd = 0.9;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
        const ni = ny * N + nx, d = Math.hypot(c.px - nx, c.py - ny);
        if (region[ni] && free(ni) && d < bd) { bd = d; best = ni; }
      }
      if (best < 0) continue;
      i = best;
    }
    out.set(i, { ...c, i });
  }
  return { parcels: out, region };
}

function orthoCandidates(seg, R, N, grid, cand) {
  const lo = seg.line + seg.offs[0], hi = seg.line + seg.offs[seg.offs.length - 1];
  for (let s = seg.s0; s <= seg.s1; s++) {
    for (const side of [-1, 1]) {
      for (let k = 1; k <= ORTHO_DEPTH; k++) {
        const lat = side < 0 ? lo - k : hi + k;
        const [x, y] = seg.ax === 0 ? [s, lat] : [lat, s];
        if (x < 0 || y < 0 || x >= N || y >= N) break;
        // el fondo sólo llega si la casilla de adelante no es vía
        if (k > 1) {
          const [fx, fy] = seg.ax === 0 ? [s, side < 0 ? lo - 1 : hi + 1] : [side < 0 ? lo - 1 : hi + 1, s];
          if (grid[fy][fx].road) break;
        }
        const face = seg.ax === 0 ? (side < 0 ? 2 : 0) : (side < 0 ? 1 : 3);
        cand.push({ i: y * N + x, px: x, py: y, ang: null, face, depth: k, dens: k === 1 ? R.dens : 1, rank: R.rank, diag: false });
      }
    }
  }
}

function diagCandidates(seg, R, N, region, cand) {
  const m = diagLines(R.w) - 1;
  const ux = Math.SQRT1_2, uy = seg.dy * Math.SQRT1_2; // dirección de la vía
  const nx = -seg.dy * Math.SQRT1_2, ny = Math.SQRT1_2; // normal
  const half = R.meters / 2 / 12 + 0.05; // medio ancho real de la vía, en casillas
  const ox = seg.s0, oy = seg.dy * (seg.s0 - seg.line); // eje en el inicio (pasa por los nodos)
  const L = (seg.s1 - seg.s0) * Math.SQRT2;
  const reach = half + DIAG_DEPTH;
  const x0 = Math.floor(Math.min(seg.s0, seg.s1) - reach - 2), x1 = Math.ceil(Math.max(seg.s0, seg.s1) + reach + 2);
  for (let tx = Math.max(0, x0); tx <= Math.min(N - 1, x1); tx++) {
    for (let ty = 0; ty < N; ty++) {
      const dx = tx - ox, dy = ty - oy;
      const t = dx * ux + dy * uy, d = dx * nx + dy * ny;
      if (t >= 0 && t <= L && Math.abs(d) <= reach) region[ty * N + tx] = 1;
    }
  }
  for (const side of [-1, 1]) {
    for (let k = 1; k <= DIAG_DEPTH; k++) {
      const off = side * (half + k - 0.5);
      for (let t = 0.5; t < L; t += 1) {
        const px = ox + ux * t + nx * off, py = oy + uy * t + ny * off;
        const tx = Math.round(px), ty = Math.round(py);
        if (tx < 0 || ty < 0 || tx >= N || ty >= N) continue;
        const fx = -side * nx, fz = -side * ny; // fachada hacia la vía
        cand.push({ i: ty * N + tx, px, py, ang: Math.atan2(fx, fz), face: -1, depth: k, dens: k === 1 ? R.dens : 1, rank: R.rank, diag: true });
      }
    }
  }
}
