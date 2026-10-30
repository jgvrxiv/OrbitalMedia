// Despachador de modelos: construye (y cachea) la geometría de cada combinación tipología/estrato/variante.
import { Builder } from './geom.js';
import { RES_TYPES } from './models_res.js';
import { COM_TYPES } from './models_com.js';
import { IND_TYPES } from './models_ind.js';
import { OFF_TYPES } from './models_off.js';
import { PUBLIC, buildPublic } from './buildings.js';
import { BIG_RES, BIG_COM, BIG_IND } from './models_big.js';

export const VARIANTS = 4; // variantes por combinación (paletas/disposición)
const cache = new Map();

export const keyOf = (s) => `${s.kind}:${s.type}:${s.e || 0}:${s.v || 0}` + ((s.sw || 1) * (s.sd || 1) > 1 ? `:${s.sw}x${s.sd}` : '');

const tableOf = (kind) => (kind === 'res' ? RES_TYPES : kind === 'com' ? COM_TYPES : kind === 'off' ? OFF_TYPES : IND_TYPES);
// ancho (sobre la calle) y fondo, en casillas, con que hay que estirar el modelo de un edificio; 1×1 si su modelo ya es del tamaño del lote
export function scaleOf(b) {
  if (b.kind === 'pub' || b.w * b.h <= 1 || tableOf(b.kind)[b.type]?.size) return [1, 1];
  return b.rot % 2 ? [b.h, b.w] : [b.w, b.h];
}

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const T0 = (spec) => tableOf(spec.kind)[spec.type] || {};
export function buildModel(spec) {
  const key = keyOf(spec);
  if (cache.has(key)) return cache.get(key);
  if (spec.kind === 'pub') { const g = buildPublic(spec.type); cache.set(key, g); return g; }
  const B = new Builder(hash(key));
  if (!T0(spec).size) { B.sx = spec.sw || 1; B.sz = spec.sd || 1; }
  const T = spec.kind === 'res' ? RES_TYPES : spec.kind === 'com' ? COM_TYPES : spec.kind === 'off' ? OFF_TYPES : IND_TYPES;
  T[spec.type].fn(B, spec.e || 1, spec);
  const g = B.build();
  g.userData.key = key;
  cache.set(key, g);
  return g;
}

export function hasModel(kind, type) {
  const T = kind === 'res' ? RES_TYPES : kind === 'com' ? COM_TYPES : kind === 'off' ? OFF_TYPES : IND_TYPES;
  return !!T[type];
}

export function typeName(kind, type) {
  const T = kind === 'res' ? RES_TYPES : kind === 'com' ? COM_TYPES : kind === 'off' ? OFF_TYPES : IND_TYPES;
  return T[type]?.name || type;
}

// conjuntos para la galería de desarrollo
const resSet = (types, es) => () => {
  const out = [];
  for (const t of types) for (const e of es[t]) out.push({ kind: 'res', type: t, e, v: 0, label: `${t} E${e}` });
  return out;
};
export const MODEL_SETS = {
  res1: resSet(['autoconstruccion', 'casaBarrio', 'casasAdosadas', 'casaModerna', 'casaCampestre', 'residenciaLujo'], {
    autoconstruccion: [1, 1, 2], casaBarrio: [2, 3, 4], casasAdosadas: [3, 4], casaModerna: [3, 4, 5], casaCampestre: [5, 6], residenciaLujo: [6, 6],
  }),
  res2: resSet(['multifamiliar', 'bloques', 'edificio', 'conjunto', 'boutique'], {
    multifamiliar: [1, 2], bloques: [2, 3], edificio: [3, 4, 5], conjunto: [2, 4, 6], boutique: [5, 6],
  }),
  res3: resSet(['torrePopular', 'torreBalcones', 'torreVidrio', 'torresGemelas', 'torreEscalonada'], {
    torrePopular: [1, 2, 3], torreBalcones: [3, 5], torreVidrio: [6], torresGemelas: [2, 4, 6], torreEscalonada: [5],
  }),
  com: () => Object.keys(COM_TYPES).flatMap((t) => [1, 3, 6].map((e) => ({ kind: 'com', type: t, e, v: 0, label: `${t} E${e}` }))),
  ref: () => [
    ...[['hileraLadrillo', 3], ['visPareadas', 2], ['casaModernaLadrillo', 3], ['casaColonialBlanca', 4], ['casaInglesa', 4], ['casaLadrilloVidrio', 6],
      ['bloqueLadrillo', 4], ['edificioMiradores', 5], ['bloqueLadrilloAlto', 4], ['torreLadrillo', 5], ['torreCurva', 6]].map(([t, e]) => ({ kind: 'res', type: t, e, v: 0, label: `${t} E${e}` })),
    { kind: 'off', type: 'torreCorona', e: 6, v: 0, label: 'torreCorona' }, { kind: 'off', type: 'torreEsbelta', e: 6, v: 0, label: 'torreEsbelta' },
    { kind: 'off', type: 'casaOficinas', e: 4, v: 0, label: 'casaOficinas' }, { kind: 'off', type: 'centroEmpresarial', e: 5, v: 0, label: 'centroEmpresarial' },
    { kind: 'ind', type: 'bodegasBoveda', e: 3, v: 0, label: 'bodegasBoveda' },
  ],
  row: () => ['hileraPopular', 'hileraAlta'].flatMap((t) => [1, 2, 3].flatMap((e) => [0, 1, 2, 3].map((v) => ({ kind: 'res', type: t, e, v, label: `${t} E${e} v${v}` })))),
  big: () => [
    ...[2, 3].flatMap((e) => [0, 1, 2, 3].map((v) => ({ kind: 'res', type: 'casaFondo', e, v, w: 1.5, label: `casaFondo E${e} v${v}` }))),
    ...Object.keys(BIG_RES).flatMap((t) => [4, 6].flatMap((e) => [0, 1].map((v) => ({ kind: 'res', type: t, e, v, w: 2, label: `${t} E${e} v${v}` })))),
    ...[0, 1].map((v) => ({ kind: 'com', type: 'centroComercialGrande', e: 4, v, w: 2, label: `centroComercialGrande v${v}` })),
    ...[0, 1].map((v) => ({ kind: 'ind', type: 'fabricaGrande', e: 3, v, w: 2, label: `fabricaGrande v${v}` })),
  ],
  pub: () => Object.keys(PUBLIC).map((t) => ({ kind: 'pub', type: t, w: PUBLIC[t].w, label: PUBLIC[t].name })),
  ind: () => Object.keys(IND_TYPES).flatMap((t) => [0, 1].map((v) => ({ kind: 'ind', type: t, e: 3, v, label: `${t} v${v}` }))),
};
