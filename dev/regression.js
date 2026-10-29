// Regresión automática de Ciudad Tricolor.
//   node dev/regression.js [carpeta-de-salida]      (por defecto dev/out)
// Levanta un servidor estático, abre el juego en Chromium (Playwright) y ejecuta escenarios con verificaciones
// numéricas y capturas: ciudad de ejemplo, cruces de cada tipo en llano y en ladera, diagonales de cada ancho,
// glorietas, obras, guardado/carga (formatos actuales y antiguos) y modelos de la galería.
// Termina con código 1 si alguna verificación falla o hay errores en consola.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('@playwright/test')); }

const root = path.resolve(__dirname, '..');
const outDir = path.resolve(process.argv[2] || path.join(__dirname, 'out'));
fs.mkdirSync(outDir, { recursive: true });
const PORT = 8123 + Math.floor(Math.random() * 500);

const results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok, extra }); console.log(`${ok ? '✔' : '✘'} ${name}${extra ? ' · ' + extra : ''}`); };

(async () => {
  const srv = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: root, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 1200));
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1200, height: 760 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERR ' + e.message));
  const shot = async (name, cam) => {
    if (cam) await page.evaluate((c) => { Object.assign(window.__game.S.cam, c); }, cam);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(outDir, name + '.png'), timeout: 240000 });
  };
  const run = (fn, arg) => page.evaluate(fn, arg);

  await page.goto(`http://localhost:${PORT}/index.html`);
  await page.waitForTimeout(1000);
  await run(() => { document.querySelector('#help').hidden = true; });

  // 1) ciudad de ejemplo
  const demo = await run(async () => {
    const g = window.__game; const m = await import('/js/game.js');
    g.demo(); m.G.speed = 0;
    return { pop: m.G.stats.pop, bld: m.G.buildings.length, lines: g.TR.T.lines.map((l) => l.ok), segs: m.G.net.segs.length, draws: g.renderStats().draws };
  });
  check('ciudad de ejemplo genera población y edificios', demo.pop > 5000 && demo.bld > 800, `${demo.pop} hab., ${demo.bld} edificios`);
  check('las 3 líneas de transporte funcionan', demo.lines.length === 3 && demo.lines.every(Boolean));
  check('llamadas de dibujo razonables', demo.draws < 400, `${demo.draws}`);
  await shot('01_ejemplo_centro', { x: 3, z: 0, dist: 30, pitch: 0.8, yaw: 0.6 });
  await shot('02_ejemplo_ladera', { x: -14, z: 4, dist: 20, pitch: 1.3, yaw: 0.0 });

  // 2) guardado/carga: formato actual, formato v2 (casillas) y versión futura
  const sl = await run(async () => {
    const m = await import('/js/game.js'); const tr = await import('/js/transit.js');
    const sig = () => { const a = []; for (const row of m.G.grid) for (const t of row) if (t.road) a.push([t.x, t.y, t.road.k, t.road.ax].join()); return a.sort().join(';'); };
    const before = sig(), nb = m.G.buildings.length;
    const d = JSON.parse(JSON.stringify(m.serialize()));
    const r1 = m.load(d);
    const same = sig() === before, nb2 = m.G.buildings.length;
    const legacy = JSON.parse(JSON.stringify(d)); delete legacy.net; delete legacy.rounds; legacy.v = 2;
    legacy.roads = []; for (const row of m.G.grid) for (const t of row) if (t.road) legacy.roads.push([t.x, t.y, t.road.k, t.road.ax, t.road.c ? 1 : 0]);
    m.load(legacy); const sameLegacy = sig() === before;
    let future = false; try { m.load({ ...d, v: 999 }); } catch (e) { future = true; }
    m.load(d); tr.recomputeAll();
    return { same, nb, nb2, sameLegacy, future, skipped: r1.skipped };
  });
  check('guardar y cargar conserva vías y edificios', sl.same && sl.nb === sl.nb2, `${sl.nb} → ${sl.nb2}`);
  check('partidas v2 (casillas) se convierten al grafo', sl.sameLegacy);
  check('una partida de versión futura se rechaza', sl.future);

  // 3) cruces de cada combinación, en llano y en ladera
  for (const terrain of ['llano', 'valle']) {
    const j = await run(async (terrain) => {
      const g = window.__game; const m = await import('/js/game.js'); const rd = await import('/js/roads.js'); const sc = await import('/js/scene.js');
      g.newCity(terrain, 7); m.G.money = 1e12; m.G.speed = 0;
      const B = (k, ax, ay, bx, by) => m.buildRoad(rd.roadPlan({ x: ax, y: ay }, { x: bx, y: by }, k), k);
      const base = terrain === 'valle' ? 78 : 50;           // en el valle: pie de la ladera oriental (pendiente real)
      const kinds = terrain === 'valle'
        ? [['calle', 'calle'], ['calle', 'calle3'], ['calle3', 'calle'], ['calle1', 'calle'], ['calle3', 'calle3']]
        : [['calle', 'calle'], ['avenida', 'calle'], ['avenida', 'avenida'], ['troncal', 'calle'], ['calle3', 'bulevar']];
      let y = 40; const info = [];
      const span = terrain === 'valle' ? 8 : 22;
      for (const [a, b] of kinds) {
        B(a, base - span, y, base + span, y); B(b, base, y - 8, base, y + 8);
        const J = rd.planJunctions(m.G.net);
        const jn = J.list.find((q) => q.node.x === base && q.node.y === y);
        let dev = 0;
        if (jn) { const poly = rd.junctionPoly(jn.arms, 'full'); for (const p of poly) dev = Math.max(dev, Math.abs(sc.heightAt(p[0] - 64 + 0.5, p[1] - 64 + 0.5) - sc.heightAt(jn.node.x - 64 + 0.5, jn.node.y - 64 + 0.5))); }
        info.push({ k: `${a}×${b}`, found: !!jn, polyOk: jn ? rd.junctionPoly(jn.arms, 'full').length >= 8 : false, relief: +dev.toFixed(2) });
        y += 18;
      }
      return info;
    }, terrain);
    check(`cruces ${terrain}: todos generan polígono`, j.every((q) => q.found && q.polyOk), j.map((q) => q.k + ' relieve ' + q.relief).join(' · '));
    await shot(`03_cruces_${terrain}_a`, { x: terrain === 'valle' ? 14 : -14, z: -24, dist: 14, pitch: 1.0, yaw: 0.4 });
    await shot(`03_cruces_${terrain}_b`, { x: terrain === 'valle' ? 14 : -14, z: -6, dist: 14, pitch: 1.0, yaw: 0.4 });
  }

  // 4) diagonales de cada ancho y cruces con diagonales
  const dg = await run(async () => {
    const g = window.__game; const m = await import('/js/game.js'); const rd = await import('/js/roads.js');
    g.newCity('llano', 7); m.G.money = 1e12; m.G.speed = 0;
    const B = (k, ax, ay, bx, by) => m.buildRoad(rd.roadPlan({ x: ax, y: ay }, { x: bx, y: by }, k), k);
    B('calle', 40, 60, 100, 60); B('calle', 64, 50, 64, 60);
    const ok = [];
    ok.push(B('calle', 64, 60, 52, 72)); ok.push(B('avenida', 68, 60, 84, 76)); ok.push(B('troncal', 88, 60, 100, 72)); ok.push(B('bulevar', 40, 62, 50, 72));
    const tiles = []; for (let y = 56; y < 90; y++) for (let x = 40; x < 100; x++) tiles.push({ x, y }); m.paintZone(tiles, 2);
    m.step(40);
    return { ok, parcels: m.G.parcels.size, bld: m.G.buildings.length };
  });
  check('diagonales de calle, avenida, troncal y bulevar se construyen', dg.ok.every(Boolean), JSON.stringify(dg.ok));
  check('las diagonales generan lotes y edificios', dg.parcels > 50 && dg.bld > 5, `${dg.parcels} lotes, ${dg.bld} edificios`);
  await shot('04_diagonales', { x: 0, z: 14, dist: 30, pitch: 1.2, yaw: 0.2 });

  // 5) glorietas y reglas de empalme
  const rr = await run(async () => {
    const g = window.__game; const m = await import('/js/game.js'); const rd = await import('/js/roads.js');
    g.newCity('llano', 7); m.G.money = 1e12;
    const B = (k, ax, ay, bx, by) => m.buildRoad(rd.roadPlan({ x: ax, y: ay }, { x: bx, y: by }, k), k);
    B('avenida', 40, 64, 90, 64); B('calle', 64, 50, 64, 80); B('calle', 64, 64, 78, 78);
    const msg = m.toggleRound(64, 64); const had = m.G.net.rounds.size;
    const d = JSON.parse(JSON.stringify(m.serialize())); m.load(d);
    const kept = m.G.net.rounds.size;
    const bad = m.buildRoad(rd.roadPlan({ x: 65, y: 66 }, { x: 70, y: 66 }, 'calle'), 'calle'); // sale de un nodo a 0° pero a una casilla
    return { msg, had, kept, bad };
  });
  check('glorieta se crea y se conserva al guardar', rr.msg === null && rr.had === 1 && rr.kept === 1);
  await shot('05_glorieta', { x: 0, z: 0, dist: 10, pitch: 1.1, yaw: 0 });

  // 6) obras: un edificio nuevo empieza en obra y termina
  const ob = await run(async () => {
    const g = window.__game; const m = await import('/js/game.js'); const rd = await import('/js/roads.js');
    g.newCity('llano', 7); m.G.money = 1e12;
    m.buildRoad(rd.roadPlan({ x: 50, y: 64 }, { x: 80, y: 64 }, 'calle'), 'calle');
    const t = []; for (let x = 52; x < 60; x++) { t.push({ x, y: 65 }); } m.paintZone(t, 3);
    m.G.speed = 4; await new Promise((r) => setTimeout(r, 4000));
    const growing = m.G.growing.length, total = m.G.buildings.length;
    await new Promise((r) => setTimeout(r, 12000));
    return { growing, total, after: m.G.growing.length };
  });
  check('las obras empiezan como obra y terminan', ob.total > 0 && ob.growing > 0, `${ob.growing}/${ob.total} en obra → ${ob.after} tras 12 s`);

  // 7) galería de modelos: ningún modelo falla al construirse
  for (const set of ['res1', 'res2', 'res3', 'com', 'ind', 'pub', 'ref', 'row', 'big']) {
    const gp = await browser.newPage({ viewport: { width: 1500, height: 900 } });
    const gerr = [];
    gp.on('pageerror', (e) => gerr.push(e.message));
    gp.on('console', (m) => { if (m.type() === 'error') gerr.push(m.text()); });
    await gp.goto(`http://localhost:${PORT}/dev/gallery.html?set=${set}&cols=6&gap=4`);
    const ready = await gp.waitForFunction(() => window.__ready, null, { timeout: 120000 }).then(() => true).catch(() => false);
    if (ready) await gp.screenshot({ path: path.join(outDir, `06_galeria_${set}.png`), timeout: 240000 });
    check(`galería ${set} se construye sin errores`, ready && gerr.length === 0, gerr[0] || '');
    await gp.close();
  }

  check('sin errores en la consola', errors.length === 0, errors.slice(0, 3).join(' | '));
  await browser.close();
  srv.kill();
  const failed = results.filter((r) => !r.ok);
  fs.writeFileSync(path.join(outDir, 'resultado.json'), JSON.stringify({ fecha: new Date().toISOString(), results }, null, 1));
  console.log(`\n${results.length - failed.length}/${results.length} verificaciones correctas · capturas en ${outDir}`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
