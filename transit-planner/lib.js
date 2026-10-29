// Lógica pura (sin DOM) para poder probarla con node:test.

export const MODES = {
  bus:   { label: 'Bus',   speedKmh: 18, dwellSec: 25, costPerKm: 1.5,  costPerStop: 0.05 },
  tram:  { label: 'Tranvía', speedKmh: 22, dwellSec: 25, costPerKm: 25,  costPerStop: 1 },
  metro: { label: 'Metro', speedKmh: 35, dwellSec: 30, costPerKm: 120, costPerStop: 25 },
};

export const PALETTE = ['#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4', '#008080', '#9a6324', '#f032e6'];

const R = 6371.0088;
const rad = (d) => (d * Math.PI) / 180;

export function haversineKm(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function lengthKm(stops) {
  let t = 0;
  for (let i = 1; i < stops.length; i++) t += haversineKm(stops[i - 1], stops[i]);
  return t;
}

/**
 * Estimaciones simples y editables. La longitud es en línea recta entre paradas
 * (la fase 2 la ajustará a las calles), así que es un mínimo, no un valor real.
 */
export function lineStats(line, { headwayMin = 10, detour = 1 } = {}) {
  const m = MODES[line.mode] || MODES.bus;
  const km = lengthKm(line.stops) * detour;
  const n = line.stops.length;
  if (n < 2) return { km, stops: n, oneWayMin: 0, roundTripMin: 0, vehicles: 0, cost: 0, valid: false };
  const oneWayMin = (km / m.speedKmh) * 60 + (n * m.dwellSec) / 60;
  const roundTripMin = oneWayMin * 2;
  return {
    km,
    stops: n,
    oneWayMin,
    roundTripMin,
    vehicles: Math.ceil(roundTripMin / Math.max(1, headwayMin)),
    cost: km * m.costPerKm + n * m.costPerStop,
    valid: true,
  };
}

export function newLine(index) {
  return { id: 'l' + Date.now().toString(36) + index, name: `Línea ${index + 1}`, color: PALETTE[index % PALETTE.length], mode: 'bus', stops: [] };
}

// ---- Serialización (guardado, exportar, compartir por enlace) ----

export function validateState(s) {
  if (!s || typeof s !== 'object' || !Array.isArray(s.lines)) throw new Error('Archivo no válido');
  const lines = s.lines.slice(0, 50).map((l, i) => ({
    id: String(l.id || 'l' + i).slice(0, 40),
    name: String(l.name || `Línea ${i + 1}`).slice(0, 60),
    color: /^#[0-9a-f]{6}$/i.test(l.color) ? l.color : PALETTE[i % PALETTE.length],
    mode: MODES[l.mode] ? l.mode : 'bus',
    stops: (Array.isArray(l.stops) ? l.stops : []).slice(0, 500)
      .filter((p) => Number.isFinite(p?.lat) && Number.isFinite(p?.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180)
      .map((p, j) => ({ lat: +p.lat.toFixed(6), lng: +p.lng.toFixed(6), name: String(p.name || `Parada ${j + 1}`).slice(0, 60) })),
  }));
  const headwayMin = Number.isFinite(s.headwayMin) ? Math.min(120, Math.max(1, s.headwayMin)) : 10;
  return { lines, headwayMin };
}

const b64 = {
  enc: (str) => btoa(String.fromCharCode(...new TextEncoder().encode(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  dec: (s) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))),
};

export const encodeState = (state) => b64.enc(JSON.stringify(state));
export const decodeState = (str) => validateState(JSON.parse(b64.dec(str)));
