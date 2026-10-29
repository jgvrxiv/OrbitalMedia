import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

process.env.ALLOW_PRIVATE = '1'; // el servidor de prueba vive en localhost
const { runAudit, scoreFindings } = await import('../src/audit.js');
const { normalizeUrl, safeFetch } = await import('../src/safe-fetch.js');

const GOOD = `<!doctype html><html lang="es"><head><title>Orbital Media: agencia de marketing en Colombia</title>
<meta name="description" content="Agencia de marketing digital en Colombia: páginas web, tiendas online, Meta Ads y contenido para hacer crecer tu negocio.">
<meta name="viewport" content="width=device-width"><link rel="canonical" href="/"><link rel="icon" href="/f.ico">
<meta property="og:title" content="a"><meta property="og:description" content="b"><meta property="og:image" content="c">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-ABC123"></script>
<script>fbq('init','1')</script></head><body><h1>Hola</h1>
<p>${'Texto de ejemplo con contenido suficiente. '.repeat(10)}</p>
<img src="a.png" alt="a"><a href="https://wa.me/573000000000">WhatsApp</a>
<a href="https://instagram.com/orbital">ig</a><a href="/ok">ok</a><a href="/roto">roto</a></body></html>`;
const BAD = `<html><head></head><body><img src="a.png"><img src="b.png"><p>${'x'.repeat(300)}</p></body></html>`;

const server = http.createServer((req, res) => {
  const html = (b) => { res.writeHead(200, { 'content-type': 'text/html' }); res.end(b); };
  if (req.url === '/good') return html(GOOD);
  if (req.url === '/bad') return html(BAD);
  if (req.url === '/spa') return html('<html><body><div id="root"></div><script src="a.js"></script></body></html>');
  if (req.url === '/ok') return html('ok');
  if (req.url === '/loop') { res.writeHead(302, { location: '/loop' }); return res.end(); }
  res.writeHead(404); res.end('no');
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;
test.after(() => server.close());

const byId = (r, id) => r.findings.find((f) => f.id === id);

test('sitio bien armado puntúa alto y detecta píxel, GA4 y WhatsApp', async () => {
  const r = await runAudit(base + '/good', { usePageSpeed: false });
  assert.equal(byId(r, 'pixel').status, 'pass');
  assert.equal(byId(r, 'analytics').status, 'pass');
  assert.equal(byId(r, 'contact').status, 'pass');
  assert.equal(byId(r, 'title').status, 'pass');
  assert.equal(byId(r, 'broken').status, 'fail', 'detecta /roto como 404');
  assert.ok(r.score.total > 55);
});

test('sitio vacío acumula fallos y no inventa datos', async () => {
  const r = await runAudit(base + '/bad', { usePageSpeed: false });
  for (const id of ['title', 'desc', 'h1', 'viewport', 'analytics', 'contact']) assert.equal(byId(r, id).status, 'fail', id);
  assert.equal(byId(r, 'alt').status, 'fail');
  assert.ok(r.score.total < 40);
});

test('avisa cuando el sitio se renderiza con JavaScript', async () => {
  const r = await runAudit(base + '/spa', { usePageSpeed: false });
  assert.ok(r.notes.some((n) => /JavaScript/.test(n)));
});

test('rechaza URLs privadas cuando ALLOW_PRIVATE no está activo', async () => {
  process.env.ALLOW_PRIVATE = '0';
  await assert.rejects(() => safeFetch(new URL('http://127.0.0.1/')), /no es pública/);
  await assert.rejects(() => safeFetch(new URL('http://169.254.169.254/')), /no es pública/);
  process.env.ALLOW_PRIVATE = '1';
});

test('corta bucles de redirección y valida el esquema', async () => {
  await assert.rejects(() => safeFetch(new URL(base + '/loop')), /redirecciones/);
  assert.throws(() => normalizeUrl('ftp://x.com'), /http/);
  assert.equal(normalizeUrl('orbitalmediaco.com').protocol, 'https:');
});

test('puntaje: info no puntúa y warn vale la mitad', () => {
  const s = scoreFindings([
    { category: 'seo', status: 'pass' }, { category: 'seo', status: 'warn' }, { category: 'seo', status: 'info' },
  ]);
  assert.equal(s.total, 75);
});
