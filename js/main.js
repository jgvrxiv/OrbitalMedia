import * as THREE from '../vendor/three.module.min.js';
import { initMaterials } from './geom.js';
import { initScene, S, updateCamera, resize } from './scene.js';
import { G, attachWorld, update as updateGame, serialize, load as loadGame, clearAll as clearGame, flush, COST, markDirty } from './game.js';
import * as TR from './transit.js';
import { initUI, updateTop, renderCity, renderInfo, renderLines, cameraKeys, toast, showTab, setTool } from './ui.js';
import { buildDemo } from './demo.js';

const SAVE_KEY = 'ciudad-tricolor-v1';

initMaterials();
initScene(document.getElementById('c'));
attachWorld();
TR.attachTransit();

G.hooks.roadsChanged = TR.recomputeAll;
G.hooks.removeStop = TR.removeStop;
G.hooks.transitCover = TR.cover;
G.hooks.transitEconomy = TR.economy;

function refresh() {
  updateTop();
  renderCity();
  renderInfo();
  renderLines();
}
G.onStats = refresh;
G.onChange = refresh;

initUI();

function save(silent) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ game: serialize(), transit: TR.serialize() }));
    if (!silent) toast('Ciudad guardada 💾', 'good');
  } catch (e) { if (!silent) toast('No se pudo guardar', 'warn'); }
}
function loadSave(silent) {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) { if (!silent) toast('No hay partida guardada', 'warn'); return false; }
    const d = JSON.parse(raw);
    TR.clearAll();
    loadGame(d.game);
    TR.load(d.transit);
    TR.recomputeAll();
    flush();
    refresh();
    if (!silent) toast('Partida cargada 📂', 'good');
    return true;
  } catch (e) { console.error(e); if (!silent) toast('Partida corrupta', 'warn'); return false; }
}
function newCity() {
  TR.clearAll();
  clearGame();
  G.money = COST.startMoney;
  G.stats = { pop: 0, jobs: 0, emp: 1, happy: 50, income: 0, expense: 0, transit: 0, byE: [0, 0, 0, 0, 0, 0], bldCount: 0 };
  markDirty('all');
  flush();
  TR.recomputeAll();
  refresh();
}
function demo() {
  newCity();
  buildDemo();
  TR.recomputeAll();
  S.cam.x = 0; S.cam.z = 0; S.cam.dist = 42;
  refresh();
  toast('Ciudad de ejemplo generada. ¡Sigue creciendo!', 'good');
}

const $ = (s) => document.querySelector(s);
$('#bSave').onclick = () => save(false);
$('#bLoad').onclick = () => loadSave(false);
$('#bNew').onclick = () => { if (confirm('¿Empezar una ciudad nueva? Se perderá el progreso no guardado.')) newCity(); };
$('#bDemo').onclick = () => { if (!G.buildings.length || confirm('Esto reemplazará tu ciudad actual. ¿Continuar?')) demo(); };
$('#bHelp').onclick = () => { $('#help').hidden = false; };
$('#helpClose').onclick = () => { $('#help').hidden = true; localStorage.setItem('ct-seen', '1'); };
$('#helpDemo').onclick = () => { $('#help').hidden = true; localStorage.setItem('ct-seen', '1'); demo(); };

if (!loadSave(true)) {
  if (!localStorage.getItem('ct-seen')) $('#help').hidden = false;
}
refresh();

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  cameraKeys(dt);
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
const proj = (x, y) => { _v.set(x - 32 + 0.5, 0, y - 32 + 0.5).project(S.camera); const r = S.canvas.getBoundingClientRect(); return [r.left + (_v.x + 1) / 2 * r.width, r.top + (1 - _v.y) / 2 * r.height]; };
window.__game = { proj, G, TR, S, demo, showTab, setTool, save, loadSave };
