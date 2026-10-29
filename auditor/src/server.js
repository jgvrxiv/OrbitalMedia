import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runAudit } from './audit.js';
import { summarize } from './ai.js';

const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript' };

// Límite sencillo por IP para no agotar créditos de API ni PageSpeed
const hits = new Map();
function limited(ip, max = 6, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > max;
}

async function readJson(req) {
  let size = 0;
  const chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > 10_000) throw new Error('Solicitud demasiado grande');
    chunks.push(c);
  }
  return JSON.parse(Buffer.concat(chunks).toString() || '{}');
}

export function createServer() {
  return http.createServer(async (req, res) => {
    const send = (code, body, type = 'application/json') => {
      res.writeHead(code, { 'content-type': type, 'x-content-type-options': 'nosniff' });
      res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
    };
    try {
      if (req.method === 'POST' && req.url === '/api/audit') {
        if (limited(req.socket.remoteAddress)) return send(429, { error: 'Demasiadas auditorías seguidas. Intenta en unos minutos.' });
        const { url, ai = true } = await readJson(req);
        const report = await runAudit(url);
        report.ai = ai ? await summarize(report) : null;
        return send(200, report);
      }
      if (req.method === 'GET') {
        const file = req.url === '/' ? 'index.html' : path.basename(req.url.split('?')[0]);
        const data = await readFile(path.join(PUBLIC, file)).catch(() => null);
        if (!data) return send(404, 'No encontrado', 'text/plain');
        return send(200, data, TYPES[path.extname(file)] || 'application/octet-stream');
      }
      send(405, { error: 'Método no permitido' });
    } catch (e) {
      const known = /URL|pública|http|HTML|redirecciones|Solicitud|fetch failed|aborted|timeout|ENOTFOUND/i.test(e.message || e.cause?.code || '');
      send(known ? 400 : 500, { error: known ? friendly(e) : 'Error interno al auditar el sitio' });
    }
  });
}

function friendly(e) {
  const m = e.message || '';
  if (/ENOTFOUND|fetch failed/i.test(m + (e.cause?.code || ''))) return 'No se pudo conectar con ese sitio. Revisa que la URL exista.';
  if (/timeout|aborted/i.test(m)) return 'El sitio tardó demasiado en responder.';
  return m;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = process.env.PORT || 3000;
  createServer().listen(port, () => console.log(`Auditor en http://localhost:${port}`));
}
