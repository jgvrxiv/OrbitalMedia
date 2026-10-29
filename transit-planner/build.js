// Genera index.html autocontenido (un solo archivo, funciona con doble clic).
// Fuentes: index.src.html + lib.js + app.js. Ejecutar: node build.js
import { readFileSync, writeFileSync } from 'node:fs';

const read = (f) => readFileSync(new URL(f, import.meta.url), 'utf8');
const lib = read('lib.js').replace(/^export /gm, '');
const app = read('app.js').replace(/^import .*;\s*$/m, '');
const script = `<script>\n(() => {\n'use strict';\n${lib}\n${app}\n})();\n</script>`;

const html = read('index.src.html').replace('<!--APP-->', () => script);
if (/^\s*(import|export)\s/m.test(script)) throw new Error('Quedaron import/export en el bundle');
writeFileSync(new URL('index.html', import.meta.url), html);
console.log(`index.html generado (${Math.round(html.length / 1024)} KB)`);
