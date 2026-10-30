// Ciudad de ejemplo sobre el valle: troncal y autopista por el fondo, avenidas, calles en las laderas,
// caminos destapados en la ladera occidental, servicios concentrados al oriente y Metrocable al occidente.
import { N } from './scene.js';
import {
  G, buildRoad, paintZone, canPlacePublic, placePublic, flush, step, markDirty, zoneProblem, tile,
} from './game.js';
import { roadPlan } from './roads.js';
import * as TR from './transit.js';

function spiral(tx, ty, fn, R = 10) {
  for (let r = 0; r <= R; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const v = fn(tx + dx, ty + dy);
        if (v) return v;
      }
    }
  }
  return null;
}
// la ciudad de ejemplo se diseñó en 64 × 64 casillas; se centra en el mapa
const O = Math.floor((N - 64) / 2);
const place = (key, tx, ty) => spiral(tx + O, ty + O, (x, y) => canPlacePublic(key, x, y).ok && placePublic(key, x, y));
const stopNear = (type, tx, ty, R = 6) => spiral(tx + O, ty + O, (x, y) => TR.stopOk(type, x, y) && TR.addStop(type, x, y), R);

export function buildDemo() {
  G.money = 1e12;
  const R = (k, ax, ay, bx, by) => buildRoad(roadPlan({ x: ax + O, y: ay + O }, { x: bx + O, y: by + O }, k), k);
  // fondo del valle
  R('troncal', 34, 3, 34, 60);
  R('autopista', 24, 1, 24, 62);
  R('avenida', 8, 30, 58, 30);
  R('avenida', 12, 46, 54, 46);
  R('avenida', 14, 16, 54, 16);
  // calles
  // manzanas de al menos 4 × 7 casillas libres (48 × 84 m) entre vías
  for (const x of [44, 52, 60]) R('calle', x, 5, x, 58);
  for (const y of [9, 24, 39, 55]) R('calle', 18, y, 58, y);
  // laderas occidentales: caminos destapados
  for (const x of [3, 11]) R('tierra', x, 12, x, 54);
  for (const y of [24, 38, 52]) R('tierra', 2, y, 19, y);
  flush();

  // servicios: más al oriente (zona rica) y algunos en el centro
  const pubs = [
    ['plaza', 36, 32], ['escuela', 42, 26], ['clinica', 42, 34], ['cai', 37, 35], ['parque', 48, 26],
    ['biblioteca', 48, 34], ['mercado', 30, 33], ['bomberos', 30, 19], ['universidad', 49, 19], ['hospital', 49, 40],
    ['parque', 54, 33], ['cai', 54, 26], ['escuela', 54, 40], ['cancha', 42, 42], ['estadio', 43, 49],
    ['cai', 30, 40], ['clinica', 30, 49], ['escuela', 22, 40], ['cancha', 22, 26], ['biblioteca', 7, 30], ['parque', 37, 20],
    ['mercado', 51, 30], ['bomberos', 52, 21], ['plaza', 52, 36], ['cai', 48, 44], ['parque', 57, 44], ['biblioteca', 57, 25],
  ];
  pubs.forEach(([k, x, y]) => place(k, x, y));

  // zonas
  for (let y = 1; y < 63; y++) {
    for (let x = 1; x < 63; x++) {
      const t = tile(x + O, y + O);
      if (t.road || t.bld || t.stop) continue;
      let z = 0;
      if (y <= 14 && x >= 22 && x <= 33) z = y < 7 ? 9 : 8; // industria al norte, junto a la autopista
      else if (x < 20) z = 1; // ladera occidental
      else if (x >= 28 && x <= 38 && y >= 26 && y <= 34) z = (x === 35 || x === 33) ? 12 : (y === 31 || y === 29) ? 6 : 3;
      else if (x >= 22 && x <= 44 && y >= 17 && y <= 48) z = (y === 31 || y === 29 || y === 47 || y === 45 || y === 17 || y === 15) ? 5 : (x >= 28 && x <= 40 ? 2 : (x + y) % 9 === 0 ? 4 : 2);
      else if (x > 44) z = (y === 31 || y === 29) ? ((x % 3) ? 11 : 5) : (x + y) % 13 === 0 ? 4 : 1;
      else if (y > 48) z = (x + y) % 7 === 0 ? 7 : 1;
      else z = 1;
      if (z) paintZone([{ x: x + O, y: y + O }], z);
    }
  }
  // bajar la densidad donde la vía o la pendiente no la permiten; quitar lo que no podría crecer
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const t = tile(x, y);
    while (t.zone && zoneProblem(x, y, true)) {
      const d = (t.zone - 1) % 3;
      t.zone = d > 0 ? t.zone - 1 : 0;
    }
  }
  markDirty('zones');
  flush();

  // transporte
  const trunk = [8, 16, 24, 31, 38, 46, 54].map((y) => stopNear('bus', 34, y, 2)).filter(Boolean);
  TR.createLine('bus', trunk, { free: true, vehicles: 4, name: 'Troncal T1' });
  const av = [10, 20, 30, 40, 50, 57].map((x) => stopNear('bus', x, 30, 2)).filter(Boolean);
  TR.createLine('bus', av, { free: true, vehicles: 3, name: 'Ruta B2 Avenida' });
  const c1 = stopNear('cable', 23, 36, 4), c2 = stopNear('cable', 13, 38, 4), c3 = stopNear('cable', 6, 39, 4);
  const cs = [c1, c2, c3].filter(Boolean);
  if (cs.length >= 2) TR.createLine('cable', cs, { free: true, vehicles: 4, name: 'Metrocable K' });

  markDirty('all');
  flush();
  G.money = 3_000_000;
  step(140);
  flush();
  G.money = 3_500_000;
  G.onChange();
}
