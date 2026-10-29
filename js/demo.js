// Ciudad de ejemplo: avenidas, servicios, zonas por estrato (centro rico -> periferia popular) y transporte.
import { N } from './scene.js';
import { G, roadLine, buildRoad, paintZone, canPlacePublic, placePublic, flush, step, markDirty } from './game.js';
import { PUBLIC } from './buildings.js';
import * as TR from './transit.js';

function place(key, tx, ty) {
  for (let r = 0; r <= 10; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = tx + dx, y = ty + dy;
        if (canPlacePublic(key, x, y).ok) return placePublic(key, x, y);
      }
    }
  }
  return false;
}

function spiralStop(type, tx, ty) {
  for (let r = 0; r <= 10; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        if (TR.stopOk(type, tx + dx, ty + dy)) return TR.addStop(type, tx + dx, ty + dy);
      }
    }
  }
  return null;
}

export function buildDemo() {
  const real = G.money;
  G.money = 1e12;
  const R = (ax, ay, bx, by) => buildRoad(roadLine({ x: ax, y: ay }, { x: bx, y: by }));
  // avenidas y malla vial
  R(4, 32, 60, 32); R(32, 4, 32, 60);
  for (const v of [8, 18, 25, 39, 46, 56]) { R(v, 8, v, 56); R(8, v, 56, v); }
  // servicios
  const pubs = [
    ['plaza', 28, 28], ['escuela', 37, 27], ['clinica', 27, 37], ['cai', 36, 36], ['parque', 21, 29],
    ['biblioteca', 40, 40], ['mercado', 29, 44], ['bomberos', 44, 29], ['cancha', 13, 38], ['estadio', 50, 50],
    ['universidad', 45, 14], ['hospital', 14, 48], ['parque', 46, 37], ['cai', 22, 21], ['escuela', 21, 44],
    ['clinica', 50, 22], ['cai', 14, 28], ['cancha', 52, 38], ['bomberos', 20, 12], ['parque', 33, 51], ['cai', 50, 12], ['mercado', 12, 20],
  ];
  pubs.forEach(([k, x, y]) => place(k, x, y));
  // transporte
  const stopsH = [8, 16, 24, 32, 40, 48, 56].map((x) => TR.addStop('bus', x, 32));
  const stopsV = [8, 18, 25, 32, 39, 46, 56].map((y) => TR.addStop('bus', 32, y));
  TR.createLine('bus', stopsH.filter(Boolean), { free: true, vehicles: 3, name: 'Ruta B1 Troncal' });
  TR.createLine('bus', stopsV.filter(Boolean), { free: true, vehicles: 3, name: 'Ruta B2 Norte-Sur' });
  const st = [spiralStop('cable', 10, 54), spiralStop('cable', 18, 44), spiralStop('cable', 26, 36)].filter(Boolean);
  TR.createLine('cable', st, { free: true, vehicles: 3, name: 'Metrocable K1' });
  // zonas
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const t = G.grid[y][x];
      if (t.road || t.bld || t.stop) continue;
      const d = Math.hypot(x - 32, y - 32);
      if (d > 31) continue;
      let z = d < 9 ? 6 : d < 15 ? 5 : d < 21 ? 4 : d < 26 ? 3 : d < 30 ? 2 : 1;
      if ((Math.abs(x - 32) <= 2 || Math.abs(y - 32) <= 2) && d < 26) z = 7;
      // las lomas del extremo sur-oeste: barrios de invasión
      if (x < 22 && y > 40) z = Math.random() < 0.7 ? 1 : 2;
      paintZone([{ x, y }], z);
    }
  }
  markDirty('all');
  flush();
  G.money = 3_000_000;
  step(110);
  flush();
  G.money = 2_500_000;
  G.onChange();
  return real;
}
