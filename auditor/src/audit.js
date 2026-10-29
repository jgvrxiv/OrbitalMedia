import { safeFetch, normalizeUrl } from './safe-fetch.js';
import { analyzeHtml, analyzeHeaders, checkSiteFiles, checkBrokenLinks, pageSpeed } from './checks.js';

export const CATEGORIES = {
  seo: 'SEO',
  tech: 'Técnico',
  speed: 'Velocidad',
  social: 'Redes sociales',
  tracking: 'Medición',
  conversion: 'Conversión',
  security: 'Seguridad',
};

const WEIGHT = { pass: 1, info: 1, warn: 0.5, fail: 0 };

export function scoreFindings(findings) {
  const byCat = {};
  for (const x of findings) {
    if (x.status === 'info') continue; // informativo: no puntúa
    (byCat[x.category] ||= []).push(WEIGHT[x.status]);
  }
  const categories = Object.entries(byCat).map(([id, arr]) => ({
    id, name: CATEGORIES[id] || id, score: Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100),
  }));
  const total = categories.length
    ? Math.round(categories.reduce((a, c) => a + c.score, 0) / categories.length)
    : 0;
  return { total, categories };
}

export async function runAudit(input, { usePageSpeed = true } = {}) {
  const requested = normalizeUrl(input);
  const res = await safeFetch(requested);
  const notes = [];

  if (!/html/i.test(res.headers.get('content-type') || '')) {
    throw new Error('La URL no devuelve una página HTML');
  }
  if (res.truncated) notes.push('La página es muy grande: se analizaron solo los primeros 2 MB.');

  const { findings: pageFindings, meta } = analyzeHtml(res.body, res.finalUrl);
  if (meta.jsRendered) {
    notes.push('Este sitio parece construirse con JavaScript (casi no hay texto en el HTML inicial). Los resultados de SEO y contenido pueden ser incompletos o inexactos.');
  }

  const [siteFiles, broken, psi] = await Promise.all([
    checkSiteFiles(res.finalUrl.origin),
    checkBrokenLinks(meta.links),
    usePageSpeed ? pageSpeed(res.finalUrl.href) : { available: false, reason: 'Desactivado', findings: [] },
  ]);
  if (!psi.available) notes.push(`Puntaje de rendimiento (Lighthouse) no disponible: ${psi.reason}.`);

  const findings = [...analyzeHeaders(res, requested), ...pageFindings, ...siteFiles, ...broken, ...psi.findings];
  return {
    url: res.finalUrl.href,
    auditedAt: new Date().toISOString(),
    pageTitle: meta.title,
    score: scoreFindings(findings),
    findings,
    notes,
  };
}
