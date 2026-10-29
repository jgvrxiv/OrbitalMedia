import * as THREE from '../vendor/three.module.min.js';
import { initMaterials } from './geom.js';
import { N, initScene, S, updateCamera, resize, genTerrain, setTime, Trees, heightAt } from './scene.js';
import {
  G, attachWorld, update as updateGame, serialize, load as loadGame, clearAll as clearGame, flush, COST, markDirty, renderStats,
} from './game.js';
import * as TR from './transit.js';
import {
  initUI, updateTop, renderCity, renderInfo, renderLines, cameraKeys, toast, showTab, setTool, updateClock, setOverlay,
} from './ui.js';
import { buildDemo } from './demo.js';

const SAVE_KEY = 'ciudad-tricolor-v2';
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
};
// confirmación dentro de la página (el navegador del visor puede bloquear confirm())
function ask(msg, onYes) {
  const box = document.getElementById('ask');
  document.getElementById('askMsg').textContent = msg;
  box.hidden = false;
  document.getElementById('askYes').onclick = () => { box.hidden = true; onYes(); };
  document.getElementById('askNo').onclick = () => { box.hidden = true; };
}

initMaterials();
initScene(document.getElementById('c'));
attachWorld();
TR.attachTransit();

G.hooks.roadsChanged = TR.recomputeAll;
G.hooks.removeStop = TR.removeStop;
G.hooks.transitCover = TR.cover;
G.hooks.transitEconomy = TR.economy;

let refreshQueued = false;
function refresh() {
  if (refreshQueued) return;
  refreshQueued = true;
  requestAnimationFrame(() => {
    refreshQueued = false;
    updateTop();
    renderCity();
    renderInfo();
    renderLines();
  });
}
G.onStats = refresh;
G.onChange = refresh;

initUI();

function save(silent) {
  const ok = store.set(SAVE_KEY, JSON.stringify({ game: serialize(), transit: TR.serialize() }));
  if (!silent) toast(ok ? 'Ciudad guardada 💾' : 'No se pudo guardar en este navegador', ok ? 'good' : 'warn');
}
function setTerrain(kind, seed) {
  genTerrain(kind, seed);
  G.seed = seed;
  Trees.init(G.grid);
}
function loadSave(silent) {
  try {
    const raw = store.get(SAVE_KEY);
    if (!raw) { if (!silent) toast('No hay partida guardada', 'warn'); return false; }
    const d = JSON.parse(raw);
    TR.clearAll();
    clearGame();
    setTerrain(d.game.terrain || 'valle', d.game.seed || 7);
    loadGame(d.game);
    TR.load(d.transit);
    TR.recomputeAll();
    flush();
    refresh();
    if (!silent) toast('Partida cargada 📂', 'good');
    return true;
  } catch (e) { console.error(e); if (!silent) toast('Partida corrupta', 'warn'); return false; }
}
function newCity(kind = 'valle', seed = 7) {
  TR.clearAll();
  clearGame();
  setTerrain(kind, seed);
  G.money = COST.startMoney;
  markDirty('all');
  flush();
  TR.recomputeAll();
  S.cam.x = 0; S.cam.z = 0; S.cam.dist = 70;
  refresh();
}
function demo() {
  newCity('valle', 7);
  buildDemo();
  TR.recomputeAll();
  S.cam.x = 2; S.cam.z = 2; S.cam.dist = 40; S.cam.yaw = 0.6; S.cam.pitch = 0.75;
  refresh();
  toast('Ciudad de ejemplo generada: centro en el valle, laderas populares al occidente y zona exclusiva al oriente.', 'good');
}

const $ = (s) => document.querySelector(s);
$('#bSave').onclick = () => save(false);
$('#bLoad').onclick = () => loadSave(false);
$('#bNew').onclick = () => { $('#help').hidden = false; };
$('#bDemo').onclick = () => { if (!G.buildings.length) demo(); else ask('Esto reemplazará tu ciudad actual por la ciudad de ejemplo.', demo); };
$('#bHelp').onclick = () => { $('#help').hidden = false; };
$('#helpClose').onclick = () => { $('#help').hidden = true; store.set('ct-seen', '1'); };
$('#helpDemo').onclick = () => { $('#help').hidden = true; store.set('ct-seen', '1'); demo(); };
$('#helpNew').onclick = () => {
  const go = () => {
    $('#help').hidden = true;
    store.set('ct-seen', '1');
    newCity($('#terrSel').value, Math.floor(Math.random() * 1e6));
  };
  if (G.buildings.length) ask('¿Empezar una ciudad nueva? Se perderá lo que no hayas guardado.', go); else go();
};

if (!loadSave(true)) {
  newCity('valle', 7);
  if (!store.get('ct-seen')) $('#help').hidden = false;
}
refresh();

let last = performance.now(), clockT = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  cameraKeys(dt);
  if (S.dayCycle && G.speed > 0) S.time += dt * G.speed * (24 / 300);
  clockT += dt;
  if (clockT > 0.2) { clockT = 0; setTime(S.time); updateClock(); }
  updateCamera();
  updateGame(dt);
  TR.update(dt * G.speed);
  S.renderer.render(S.scene, S.camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
setInterval(() => save(true), 45000);
window.addEventListener('resize', resize);

const _v = new THREE.Vector3();
const proj = (x, y) => {
  _v.set(x - N / 2 + 0.5, 0, y - N / 2 + 0.5);
  _v.y = heightAt(_v.x, _v.z);
  _v.project(S.camera);
  const r = S.canvas.getBoundingClientRect();
  return [r.left + ((_v.x + 1) / 2) * r.width, r.top + ((1 - _v.y) / 2) * r.height];
};
window.__game = { proj, G, TR, S, demo, newCity, showTab, setTool, setOverlay, save, loadSave, setTime, renderStats };
