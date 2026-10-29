import test from 'node:test';
import assert from 'node:assert/strict';
import { haversineKm, lengthKm, lineStats, validateState, encodeState, decodeState, MODES } from '../lib.js';

const BOG = { lat: 4.711, lng: -74.072 };

test('haversine: Bogotá–Medellín ≈ 240 km y distancia a sí mismo = 0', () => {
  const d = haversineKm(BOG, { lat: 6.2442, lng: -75.5812 });
  assert.ok(d > 235 && d < 245, String(d));
  assert.equal(haversineKm(BOG, BOG), 0);
});

test('1° de latitud ≈ 111 km', () => {
  const d = haversineKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
  assert.ok(Math.abs(d - 111.2) < 0.3);
});

test('línea con menos de 2 paradas no es válida y no cuesta nada', () => {
  const s = lineStats({ mode: 'bus', stops: [BOG] });
  assert.equal(s.valid, false);
  assert.equal(s.cost, 0);
  assert.equal(lengthKm([]), 0);
});

test('estadísticas: tiempo, vehículos y costo coherentes', () => {
  const stops = [BOG, { lat: 4.811, lng: -74.072 }, { lat: 4.911, lng: -74.072 }]; // ~22.2 km
  const s = lineStats({ mode: 'metro', stops }, { headwayMin: 10 });
  const m = MODES.metro;
  const km = lengthKm(stops);
  assert.ok(Math.abs(s.oneWayMin - ((km / m.speedKmh) * 60 + (3 * m.dwellSec) / 60)) < 1e-9);
  assert.equal(s.vehicles, Math.ceil(s.roundTripMin / 10));
  assert.ok(Math.abs(s.cost - (km * m.costPerKm + 3 * m.costPerStop)) < 1e-9);
});

test('un modo desconocido cae en bus y la frecuencia nunca divide por 0', () => {
  const s = lineStats({ mode: 'cohete', stops: [BOG, { lat: 4.8, lng: -74 }] }, { headwayMin: 0 });
  assert.ok(Number.isFinite(s.vehicles) && s.vehicles > 0);
});

test('ida y vuelta por enlace conserva el estado (incluye tildes y emojis)', () => {
  const st = { headwayMin: 8, lines: [{ id: 'a', name: 'Línea Ñandú 🚇', color: '#112233', mode: 'tram', stops: [{ lat: 4.7, lng: -74.1, name: 'Estación Núñez' }] }] };
  assert.deepEqual(decodeState(encodeState(st)), st);
});

test('validateState descarta datos malos y limita valores', () => {
  const v = validateState({ headwayMin: 9999, lines: [{ name: 5, color: 'rojo', mode: 'x', stops: [{ lat: 'a', lng: 1 }, { lat: 91, lng: 0 }, { lat: 1, lng: 2 }] }] });
  assert.equal(v.headwayMin, 120);
  assert.equal(v.lines[0].mode, 'bus');
  assert.match(v.lines[0].color, /^#[0-9a-f]{6}$/i);
  assert.equal(v.lines[0].stops.length, 1);
  assert.throws(() => validateState(null));
  assert.throws(() => validateState({ lines: 'x' }));
});
