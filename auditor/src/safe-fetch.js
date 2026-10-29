import dns from 'node:dns/promises';
import net from 'node:net';

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 5;

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return (
      a === 10 || a === 127 || a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    );
  }
  const v = ip.toLowerCase();
  if (v.startsWith('::ffff:')) return isPrivateIp(v.slice(7));
  return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80');
}

export function normalizeUrl(input) {
  let raw = String(input || '').trim();
  if (!raw) throw new Error('Escribe una URL');
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) && !/^https?:\/\//i.test(raw)) throw new Error('Solo se permiten URLs http(s)');
  if (!/^https?:\/\//i.test(raw)) raw = 'https://' + raw;
  const u = new URL(raw);
  if (!['http:', 'https:'].includes(u.protocol)) throw new Error('Solo se permiten URLs http(s)');
  return u;
}

async function assertPublic(url) {
  if (process.env.ALLOW_PRIVATE === '1') return;
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const ips = net.isIP(host) ? [host] : (await dns.lookup(host, { all: true })).map((r) => r.address);
  if (ips.some(isPrivateIp)) throw new Error('Esa dirección no es pública y no se puede auditar');
}

/** Descarga con protección SSRF, límite de tamaño, timeout y redirecciones validadas. */
export async function safeFetch(startUrl, { method = 'GET', timeoutMs = 12000, readBody = true } = {}) {
  let url = startUrl instanceof URL ? startUrl : new URL(startUrl);
  const chain = [];
  const t0 = performance.now();
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    await assertPublic(url);
    const res = await fetch(url, {
      method,
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        'user-agent': 'OrbitalAuditor/0.1 (+https://orbitalmediaco.com)',
        accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
        'accept-language': 'es,en;q=0.7',
      },
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      chain.push({ url: url.href, status: res.status });
      url = new URL(res.headers.get('location'), url);
      continue;
    }
    let body = '';
    let truncated = false;
    if (readBody && method !== 'HEAD') {
      const reader = res.body.getReader();
      const chunks = [];
      let size = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > MAX_BYTES) { truncated = true; await reader.cancel(); break; }
        chunks.push(value);
      }
      body = Buffer.concat(chunks).toString('utf8');
    } else {
      await res.body?.cancel();
    }
    return {
      url: url.href, finalUrl: url, status: res.status, headers: res.headers,
      body, truncated, redirects: chain, ms: Math.round(performance.now() - t0),
    };
  }
  throw new Error('Demasiadas redirecciones');
}
