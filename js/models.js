// Despachador de modelos: construye (y cachea) la geometría de cada combinación tipología/estrato/variante.
import { Builder } from './geom.js';
import { RES_TYPES } from './models_res.js';
import { COM_TYPES } from './models_com.js';
import { IND_TYPES } from './models_ind.js';
import { PUBLIC, buildPublic } from './buildings.js';

export const VARIANTS = 4; // variantes por combinación (paletas/disposición)
const cache = new Map();

export const keyOf = (s) => `${s.kind}:${s.type}:${s.e || 0}:${s.v || 0}`;

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function buildModel(spec) {
  const key = keyOf(spec);
  if (cache.has(key)) return cache.get(key);
  if (spec.kind === 'pub') { const g = buildPublic(spec.type); cache.set(key, g); return g; }
  const B = new Builder(hash(key));
  const T = spec.kind === 'res' ? RES_TYPES : spec.kind === 'com' ? COM_TYPES : IND_TYPES;
  T[spec.type].fn(B, spec.e || 1, spec);
  const g = B.build();
  g.userData.key = key;
  cache.set(key, g);
  return g;
}

export function typeName(kind, type) {
  const T = kind === 'res' ? RES_TYPES : kind === 'com' ? COM_TYPES : IND_TYPES;
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
  pub: () => Object.keys(PUBLIC).map((t) => ({ kind: 'pub', type: t, w: PUBLIC[t].w, label: PUBLIC[t].name })),
  ind: () => Object.keys(IND_TYPES).flatMap((t) => [0, 1].map((v) => ({ kind: 'ind', type: t, e: 3, v, label: `${t} v${v}` }))),
};
