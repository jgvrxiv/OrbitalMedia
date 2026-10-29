import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('index.html es autocontenido: sin módulos ni scripts locales', () => {
  assert.ok(!/type="module"/.test(html));
  assert.ok(!/src="(app|lib)\.js"/.test(html));
  assert.ok(!/<!--APP-->/.test(html));
});

test('el script incrustado es JavaScript clásico válido', () => {
  const code = html.match(/<script>\n([\s\S]*?)<\/script>/)[1];
  assert.doesNotThrow(() => new vm.Script(code));
});
