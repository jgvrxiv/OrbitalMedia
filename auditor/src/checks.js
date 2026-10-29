import * as cheerio from 'cheerio';
import { safeFetch } from './safe-fetch.js';

const f = (id, category, status, title, evidence = '', fix = '') => ({ id, category, status, title, evidence, fix });

export function analyzeHtml(html, finalUrl) {
  const $ = cheerio.load(html);
  const out = [];
  const origin = finalUrl.origin;

  // ---- SEO on-page ----
  const title = $('head > title').first().text().trim();
  if (!title) out.push(f('title', 'seo', 'fail', 'Falta la etiqueta <title>', '', 'Añade un título único de 30 a 60 caracteres con la palabra clave principal.'));
  else if (title.length < 30 || title.length > 65)
    out.push(f('title', 'seo', 'warn', `Título con ${title.length} caracteres`, `"${title}"`, 'Lo ideal es entre 30 y 60 caracteres para que Google no lo corte.'));
  else out.push(f('title', 'seo', 'pass', 'Título bien dimensionado', `"${title}" (${title.length})`));

  const desc = $('meta[name="description"]').attr('content')?.trim() || '';
  if (!desc) out.push(f('desc', 'seo', 'fail', 'Falta la meta descripción', '', 'Escribe una descripción de 70 a 160 caracteres que invite al clic.'));
  else if (desc.length < 70 || desc.length > 170)
    out.push(f('desc', 'seo', 'warn', `Meta descripción con ${desc.length} caracteres`, `"${desc}"`, 'Ajusta entre 70 y 160 caracteres.'));
  else out.push(f('desc', 'seo', 'pass', 'Meta descripción correcta', `${desc.length} caracteres`));

  const h1s = $('h1');
  if (h1s.length === 0) out.push(f('h1', 'seo', 'fail', 'No hay ningún H1', '', 'Cada página debe tener un único H1 que describa el tema.'));
  else if (h1s.length > 1) out.push(f('h1', 'seo', 'warn', `Hay ${h1s.length} H1 en la página`, h1s.map((_, e) => $(e).text().trim()).get().slice(0, 3).join(' | '), 'Deja un solo H1 y usa H2/H3 para el resto.'));
  else out.push(f('h1', 'seo', 'pass', 'Un único H1', $(h1s[0]).text().trim().slice(0, 100)));

  const imgs = $('img');
  const noAlt = imgs.filter((_, e) => $(e).attr('alt') === undefined).length;
  if (imgs.length === 0) out.push(f('alt', 'seo', 'info', 'No se encontraron imágenes <img>'));
  else if (noAlt > 0) out.push(f('alt', 'seo', noAlt / imgs.length > 0.3 ? 'fail' : 'warn', `${noAlt} de ${imgs.length} imágenes sin atributo alt`, '', 'Describe cada imagen relevante; mejora SEO y accesibilidad.'));
  else out.push(f('alt', 'seo', 'pass', `Las ${imgs.length} imágenes tienen alt`));

  const canonical = $('link[rel="canonical"]').attr('href');
  out.push(canonical
    ? f('canonical', 'seo', 'pass', 'Tiene URL canónica', canonical)
    : f('canonical', 'seo', 'warn', 'Sin URL canónica', '', 'Añade <link rel="canonical"> para evitar contenido duplicado.'));

  const robotsMeta = $('meta[name="robots"]').attr('content') || '';
  if (/noindex/i.test(robotsMeta)) out.push(f('noindex', 'seo', 'fail', 'La página está marcada como noindex', robotsMeta, 'Google no la mostrará. Quítalo si quieres que aparezca en resultados.'));

  const lang = $('html').attr('lang');
  out.push(lang
    ? f('lang', 'seo', 'pass', 'Idioma declarado', lang)
    : f('lang', 'seo', 'warn', 'Falta el atributo lang en <html>', '', 'Declara el idioma, por ejemplo lang="es".'));

  const ld = $('script[type="application/ld+json"]').length;
  out.push(ld
    ? f('schema', 'seo', 'pass', 'Tiene datos estructurados (JSON-LD)', `${ld} bloque(s)`)
    : f('schema', 'seo', 'info', 'Sin datos estructurados', '', 'Schema.org (Organization, LocalBusiness) ayuda a aparecer con resultados enriquecidos.'));

  // ---- Móvil / técnico ----
  const vp = $('meta[name="viewport"]').attr('content');
  out.push(vp
    ? f('viewport', 'tech', 'pass', 'Viewport móvil configurado', vp)
    : f('viewport', 'tech', 'fail', 'Falta meta viewport', '', 'Sin ella el sitio no se adapta bien a celulares.'));
  const favicon = $('link[rel~="icon"]').length > 0;
  out.push(favicon ? f('favicon', 'tech', 'pass', 'Tiene favicon') : f('favicon', 'tech', 'info', 'No se detectó favicon en el HTML'));

  // ---- Redes sociales ----
  const og = ['og:title', 'og:description', 'og:image'].filter((p) => $(`meta[property="${p}"]`).attr('content'));
  if (og.length === 3) out.push(f('og', 'social', 'pass', 'Open Graph completo', 'og:title, og:description, og:image'));
  else out.push(f('og', 'social', og.length ? 'warn' : 'fail', `Open Graph incompleto (${og.length}/3)`, `Presentes: ${og.join(', ') || 'ninguno'}`, 'Define og:title, og:description y og:image para que al compartir el enlace se vea bien.'));
  out.push($('meta[name="twitter:card"]').attr('content')
    ? f('twcard', 'social', 'pass', 'Twitter/X Card definida')
    : f('twcard', 'social', 'info', 'Sin Twitter/X Card'));
  const socials = {};
  $('a[href]').each((_, e) => {
    const h = $(e).attr('href') || '';
    for (const [name, re] of [['Instagram', /instagram\.com/i], ['Facebook', /facebook\.com/i], ['TikTok', /tiktok\.com/i], ['LinkedIn', /linkedin\.com/i], ['YouTube', /youtube\.com|youtu\.be/i], ['X', /(twitter|x)\.com/i]])
      if (re.test(h)) socials[name] = h;
  });
  const names = Object.keys(socials);
  out.push(names.length
    ? f('social-links', 'social', 'pass', `Enlaza a ${names.length} red(es) social(es)`, names.join(', '))
    : f('social-links', 'social', 'warn', 'No enlaza a ninguna red social', '', 'Añade enlaces a tus perfiles en cabecera o pie.'));

  // ---- Medición y conversión ----
  const raw = html;
  const has = (re) => re.test(raw);
  const pixel = has(/connect\.facebook\.net\/[^"']*fbevents\.js|fbq\s*\(/i);
  const ga4 = has(/googletagmanager\.com\/gtag\/js\?id=G-|gtag\s*\(\s*['"]config['"]\s*,\s*['"]G-/i);
  const gtm = has(/googletagmanager\.com\/gtm\.js|GTM-[A-Z0-9]+/i);
  const ua = has(/google-analytics\.com\/(analytics|ga)\.js|UA-\d{4,}-\d/i);
  out.push(pixel
    ? f('pixel', 'tracking', 'pass', 'Píxel de Meta detectado')
    : f('pixel', 'tracking', 'warn', 'No se detectó el píxel de Meta', 'Puede estar cargado vía Tag Manager (no visible en el HTML).', 'Sin píxel no puedes medir conversiones ni hacer remarketing en Meta Ads.'));
  out.push(ga4 || gtm
    ? f('analytics', 'tracking', 'pass', 'Analítica detectada', [ga4 && 'GA4', gtm && 'Tag Manager'].filter(Boolean).join(', '))
    : f('analytics', 'tracking', ua ? 'warn' : 'fail', ua ? 'Solo Universal Analytics (obsoleto)' : 'No se detectó Google Analytics ni Tag Manager', '', 'Instala GA4 para medir visitas y conversiones.'));

  const wa = $('a[href*="wa.me"], a[href*="api.whatsapp.com"], a[href*="whatsapp.com/send"]').length > 0;
  const tel = $('a[href^="tel:"]').length > 0;
  const mail = $('a[href^="mailto:"]').length > 0;
  const forms = $('form').length;
  const contact = [wa && 'WhatsApp', tel && 'teléfono', mail && 'correo', forms && `${forms} formulario(s)`].filter(Boolean);
  out.push(contact.length
    ? f('contact', 'conversion', 'pass', 'Vías de contacto visibles', contact.join(', '))
    : f('contact', 'conversion', 'fail', 'No se detectó ninguna vía de contacto', '', 'Añade botón de WhatsApp, teléfono o formulario bien visible.'));
  if (!wa) out.push(f('whatsapp', 'conversion', 'info', 'Sin botón de WhatsApp', '', 'En Latinoamérica suele ser el canal de contacto que más convierte.'));

  // ---- Posible sitio renderizado por JS ----
  const scripts = $('script').length;
  $('script, style, noscript').remove();
  const textLen = $('body').text().replace(/\s+/g, ' ').trim().length;
  const jsRendered = textLen < 250 && (scripts > 0 || /id=["'](root|__next|app)["']/.test(raw));
  return { findings: out, meta: { title, textLen, jsRendered, links: collectLinks(cheerio.load(html), finalUrl) } };
}

function collectLinks($, finalUrl) {
  const set = new Set();
  $('a[href]').each((_, e) => {
    try {
      const u = new URL($(e).attr('href'), finalUrl);
      if (u.origin === finalUrl.origin && /^https?:$/.test(u.protocol)) { u.hash = ''; set.add(u.href); }
    } catch { /* href inválido */ }
  });
  set.delete(finalUrl.href);
  return [...set];
}

export function analyzeHeaders(res, requestedUrl) {
  const out = [];
  const https = res.finalUrl.protocol === 'https:';
  out.push(https
    ? f('https', 'tech', 'pass', 'El sitio usa HTTPS')
    : f('https', 'tech', 'fail', 'El sitio no usa HTTPS', res.finalUrl.href, 'Instala un certificado SSL; Google y los navegadores penalizan los sitios sin él.'));
  if (requestedUrl.protocol === 'http:' && https) out.push(f('redirect', 'tech', 'pass', 'Redirige de HTTP a HTTPS'));
  if (res.redirects.length > 2) out.push(f('chain', 'tech', 'warn', `Cadena de ${res.redirects.length} redirecciones`, res.redirects.map((r) => r.url).join(' → '), 'Reduce a una sola redirección para ganar velocidad.'));

  if (res.status >= 400) out.push(f('status', 'tech', 'fail', `La página responde con error ${res.status}`));
  out.push(res.ms > 2500
    ? f('ttfb', 'speed', 'fail', `Respuesta del servidor lenta (${res.ms} ms)`, '', 'Revisa hosting, caché y plugins.')
    : res.ms > 1000
      ? f('ttfb', 'speed', 'warn', `Respuesta del servidor mejorable (${res.ms} ms)`, '', 'Una caché o mejor hosting ayuda.')
      : f('ttfb', 'speed', 'pass', `Respuesta rápida del servidor (${res.ms} ms)`, 'Incluye descarga del HTML; es una medición desde nuestro servidor.'));

  const kb = Math.round(Buffer.byteLength(res.body) / 1024);
  if (kb > 500) out.push(f('htmlsize', 'speed', 'warn', `HTML pesado (${kb} KB)`, '', 'Considera minificar y cargar scripts bajo demanda.'));
  const enc = res.headers.get('content-encoding');
  out.push(enc
    ? f('compress', 'speed', 'pass', 'Compresión activada', enc)
    : f('compress', 'speed', 'warn', 'Sin compresión gzip/brotli', '', 'Activa compresión en el servidor.'));

  const sec = [
    ['strict-transport-security', 'HSTS'],
    ['x-content-type-options', 'X-Content-Type-Options'],
    ['content-security-policy', 'CSP'],
    ['x-frame-options', 'X-Frame-Options'],
  ];
  const missing = sec.filter(([h]) => !res.headers.get(h) && !(h === 'x-frame-options' && /frame-ancestors/.test(res.headers.get('content-security-policy') || ''))).map(([, n]) => n);
  out.push(missing.length === 0
    ? f('secheaders', 'security', 'pass', 'Cabeceras de seguridad presentes')
    : f('secheaders', 'security', missing.length > 2 ? 'warn' : 'info', `Faltan cabeceras de seguridad: ${missing.join(', ')}`, '', 'Se configuran en el servidor o CDN; bajo impacto en marketing pero suma confianza.'));
  return out;
}

export async function checkSiteFiles(origin) {
  const out = [];
  const get = async (p) => {
    try { return await safeFetch(new URL(p, origin), { timeoutMs: 8000 }); } catch { return null; }
  };
  const [robots, sitemap] = await Promise.all([get('/robots.txt'), get('/sitemap.xml')]);
  const robotsOk = robots && robots.status === 200 && !/<html/i.test(robots.body.slice(0, 200));
  if (!robotsOk) out.push(f('robots', 'seo', 'warn', 'No se encontró robots.txt', '', 'Crea un robots.txt e indica la ubicación del sitemap.'));
  else if (/^\s*disallow:\s*\/\s*$/im.test(robots.body) && /user-agent:\s*\*/i.test(robots.body))
    out.push(f('robots', 'seo', 'fail', 'robots.txt bloquea todo el sitio', 'Disallow: /', 'Puede estar impidiendo que Google lo indexe.'));
  else out.push(f('robots', 'seo', 'pass', 'robots.txt presente'));

  let smOk = sitemap && sitemap.status === 200 && /<(urlset|sitemapindex)/i.test(sitemap.body);
  if (!smOk && robotsOk) {
    const m = robots.body.match(/^\s*sitemap:\s*(\S+)/im);
    if (m) { const s = await get(m[1]); smOk = s && s.status === 200 && /<(urlset|sitemapindex)/i.test(s.body); }
  }
  out.push(smOk
    ? f('sitemap', 'seo', 'pass', 'Sitemap XML encontrado')
    : f('sitemap', 'seo', 'warn', 'No se encontró sitemap.xml', '', 'Genera uno y envíalo a Google Search Console.'));
  return out;
}

export async function checkBrokenLinks(links, limit = 12) {
  const sample = links.slice(0, limit);
  if (!sample.length) return [];
  const results = await Promise.all(sample.map(async (href) => {
    try {
      let r = await safeFetch(href, { method: 'HEAD', timeoutMs: 7000, readBody: false });
      if (r.status === 405 || r.status === 403) r = await safeFetch(href, { timeoutMs: 7000 });
      return { href, status: r.status };
    } catch { return { href, status: 0 }; }
  }));
  const broken = results.filter((r) => r.status === 404 || r.status === 410 || r.status >= 500);
  return [broken.length
    ? f('broken', 'seo', 'fail', `${broken.length} enlace(s) interno(s) roto(s) de ${sample.length} revisados`, broken.map((b) => `${b.status || 'sin respuesta'} → ${b.href}`).join('\n'), 'Corrige o redirige estos enlaces.')
    : f('broken', 'seo', 'pass', `Sin enlaces internos rotos (${sample.length} revisados)`, 'Es una muestra, no un rastreo completo.')];
}

export async function pageSpeed(url, { key = process.env.PAGESPEED_API_KEY } = {}) {
  const api = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
  api.searchParams.set('url', url);
  api.searchParams.set('strategy', 'mobile');
  api.searchParams.set('category', 'performance');
  if (key) api.searchParams.set('key', key);
  try {
    const res = await fetch(api, { signal: AbortSignal.timeout(60000) });
    if (!res.ok) return { available: false, reason: `PageSpeed respondió ${res.status}`, findings: [] };
    const j = await res.json();
    const lh = j.lighthouseResult;
    const a = lh.audits;
    const score = Math.round(lh.categories.performance.score * 100);
    const m = (id) => a[id]?.displayValue;
    const ev = `LCP ${m('largest-contentful-paint')}, CLS ${m('cumulative-layout-shift')}, TBT ${m('total-blocking-time')}`;
    const status = score >= 90 ? 'pass' : score >= 50 ? 'warn' : 'fail';
    return {
      available: true,
      score,
      findings: [f('psi', 'speed', status, `Rendimiento móvil (Lighthouse): ${score}/100`, ev, status === 'pass' ? '' : 'Optimiza imágenes, reduce JavaScript y usa caché.')],
    };
  } catch (e) {
    return { available: false, reason: 'No se pudo consultar PageSpeed', findings: [] };
  }
}
