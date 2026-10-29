// Escena 3D: renderer, cámara orbital, terreno, montañas andinas, árboles decorativos y vistas previas.
import * as THREE from '../vendor/three.module.min.js';
import { Builder, rng, mats } from './geom.js';

export const N = 64;
export const tw = (i) => i - N / 2 + 0.5; // tile -> mundo
export const wt = (v) => Math.floor(v + N / 2); // mundo -> tile

export const S = {
  renderer: null, scene: null, camera: null, canvas: null, sun: null,
  cam: { x: 0, z: 0, yaw: Math.PI / 4, pitch: 0.95, dist: 38 },
  root: new THREE.Group(),
};

const ray = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const v3 = new THREE.Vector3();

function skyTexture() {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#5aa9e6');
  gr.addColorStop(0.6, '#a9d6f5');
  gr.addColorStop(1, '#e8f3f8');
  g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function grassTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#7cba5f'; g.fillRect(0, 0, 256, 256);
  const r = rng(7);
  for (let i = 0; i < 1800; i++) {
    const l = 40 + r() * 20;
    g.fillStyle = `hsl(${95 + r() * 25},${40 + r() * 20}%,${l}%)`;
    g.fillRect(r() * 256, r() * 256, 2 + r() * 3, 2 + r() * 3);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(N / 4, N / 4);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function mountain(r, cx, cz) {
  const rad = r.range(10, 22), h = r.range(14, 36);
  const g = new THREE.ConeGeometry(rad, h, 7, 4);
  const pos = g.attributes.position;
  const colors = [];
  const cLow = new THREE.Color('#5a9a4a'), cMid = new THREE.Color('#7a8f5a'), cHigh = new THREE.Color('#9aa08e');
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = (y + h / 2) / h;
    if (t > 0.02 && t < 0.98) {
      pos.setX(i, pos.getX(i) * (1 + (r() - 0.5) * 0.25));
      pos.setZ(i, pos.getZ(i) * (1 + (r() - 0.5) * 0.25));
      pos.setY(i, y + (r() - 0.5) * 1.5);
    }
    const c = t < 0.5 ? cLow.clone().lerp(cMid, t / 0.5) : cMid.clone().lerp(cHigh, (t - 0.5) / 0.5);
    colors.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  m.position.set(cx, h / 2 - 1.5, cz);
  m.rotation.y = r() * 6;
  return m;
}

export function initScene(canvas) {
  S.canvas = canvas;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  S.renderer = renderer;

  const scene = new THREE.Scene();
  scene.background = skyTexture();
  scene.fog = new THREE.Fog('#d8ebf4', 90, 260);
  S.scene = scene;
  scene.add(S.root);

  S.camera = new THREE.PerspectiveCamera(45, 1, 0.5, 600);

  scene.add(new THREE.HemisphereLight('#ffffff', '#8aa070', 1.05));
  const sun = new THREE.DirectionalLight('#fff4dd', 2.1);
  sun.position.set(34, 55, 22);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -48; sc.right = 48; sc.top = 48; sc.bottom = -48; sc.near = 5; sc.far = 140;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
  S.sun = sun;

  // terreno
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(N, N),
    new THREE.MeshLambertMaterial({ map: grassTexture() }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  S.ground = ground;

  const outer = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 900),
    new THREE.MeshLambertMaterial({ color: '#6ea558' }),
  );
  outer.rotation.x = -Math.PI / 2;
  outer.position.y = -0.05;
  scene.add(outer);

  // borde de la ciudad
  const edge = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.PlaneGeometry(N, N)),
    new THREE.LineBasicMaterial({ color: '#4d7f3e' }),
  );
  edge.rotation.x = -Math.PI / 2;
  edge.position.y = 0.02;
  scene.add(edge);

  // cordillera
  const r = rng(2024);
  for (let i = 0; i < 46; i++) {
    const a = (i / 46) * Math.PI * 2 + r() * 0.1;
    const d = 64 + r() * 40;
    scene.add(mountain(r, Math.cos(a) * d, Math.sin(a) * d));
  }
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2 + r() * 0.2;
    const d = 120 + r() * 50;
    const m = mountain(r, Math.cos(a) * d, Math.sin(a) * d);
    m.scale.setScalar(1.8);
    scene.add(m);
  }

  // cuadrícula
  const grid = new THREE.GridHelper(N, N, 0xffffff, 0xffffff);
  grid.position.y = 0.025;
  grid.material.transparent = true;
  grid.material.opacity = 0.22;
  grid.material.depthWrite = false;
  grid.visible = false;
  scene.add(grid);
  S.grid = grid;

  // vista previa: casillas
  const pg = new THREE.PlaneGeometry(0.96, 0.96);
  pg.rotateX(-Math.PI / 2);
  S.preview = new THREE.InstancedMesh(pg, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.6, depthWrite: false }), 1024);
  S.preview.count = 0;
  S.preview.frustumCulled = false;
  S.preview.renderOrder = 5;
  S.preview.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(1024 * 3), 3);
  scene.add(S.preview);

  resize();
  window.addEventListener('resize', resize);
  return S;
}

export function resize() {
  const w = S.canvas.clientWidth, h = S.canvas.clientHeight;
  S.renderer.setSize(w, h, false);
  S.camera.aspect = w / h;
  S.camera.updateProjectionMatrix();
}

const GREEN = new THREE.Color('#37d67a'), RED = new THREE.Color('#ff4d5e'), BLUE = new THREE.Color('#4da3ff');
const _m = new THREE.Matrix4();
export function setPreview(tiles, mode) {
  // tiles: [{x,y,ok}]
  const n = Math.min(tiles.length, 1024);
  for (let i = 0; i < n; i++) {
    const t = tiles[i];
    _m.makeTranslation(tw(t.x), 0.05, tw(t.y));
    S.preview.setMatrixAt(i, _m);
    S.preview.setColorAt(i, t.color ? new THREE.Color(t.color) : t.ok ? (mode === 'info' ? BLUE : GREEN) : RED);
  }
  S.preview.count = n;
  S.preview.instanceMatrix.needsUpdate = true;
  if (S.preview.instanceColor) S.preview.instanceColor.needsUpdate = true;
}

export function updateCamera() {
  const c = S.cam;
  c.dist = Math.min(90, Math.max(8, c.dist));
  c.pitch = Math.min(1.35, Math.max(0.35, c.pitch));
  const lim = N / 2 + 6;
  c.x = Math.max(-lim, Math.min(lim, c.x));
  c.z = Math.max(-lim, Math.min(lim, c.z));
  const cp = Math.cos(c.pitch);
  S.camera.position.set(c.x + Math.sin(c.yaw) * cp * c.dist, Math.sin(c.pitch) * c.dist, c.z + Math.cos(c.yaw) * cp * c.dist);
  S.camera.lookAt(c.x, 0, c.z);
}

export function panCamera(dxScreen, dyScreen) {
  // desplazamiento en el plano relativo a la cámara
  const c = S.cam;
  const sx = Math.cos(c.yaw), sz = -Math.sin(c.yaw);
  const fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw);
  c.x += sx * dxScreen + fx * dyScreen;
  c.z += sz * dxScreen + fz * dyScreen;
}

export function pickTile(clientX, clientY) {
  const rect = S.canvas.getBoundingClientRect();
  const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
  const ny = -((clientY - rect.top) / rect.height) * 2 + 1;
  ray.setFromCamera({ x: nx, y: ny }, S.camera);
  const hit = ray.ray.intersectPlane(groundPlane, v3);
  if (!hit) return null;
  const x = wt(hit.x), y = wt(hit.z);
  if (x < 0 || y < 0 || x >= N || y >= N) return null;
  return { x, y, wx: hit.x, wz: hit.z };
}

// raycast contra objetos (para elegir edificios/paradas)
export function pickObjects(clientX, clientY, objects) {
  const rect = S.canvas.getBoundingClientRect();
  const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
  const ny = -((clientY - rect.top) / rect.height) * 2 + 1;
  ray.setFromCamera({ x: nx, y: ny }, S.camera);
  const hits = ray.intersectObjects(objects, false);
  return hits[0] || null;
}

// ---------- árboles decorativos ----------
export const Trees = {
  list: [], meshes: [],
  init(grid) {
    const r = rng(99);
    const bt = new Builder();
    bt.tree(0, 0, 0.42);
    const bp = new Builder();
    bp.palm(0, 0, 0.7, false);
    const geos = [bt.build(), bp.build()];
    const counts = [0, 0];
    const items = [];
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        if (r() < 0.07) {
          const type = r() < 0.7 ? 0 : 1;
          items.push({ x, y, type, ox: r.range(-0.3, 0.3), oz: r.range(-0.3, 0.3), s: r.range(0.8, 1.4), a: r() * 6 });
          counts[type]++;
        }
      }
    }
    // algunos árboles fuera de la ciudad
    this.items = items;
    this.meshes = geos.map((g, i) => {
      const m = new THREE.InstancedMesh(g, mats.solid, Math.max(1, counts[i]));
      m.castShadow = true;
      m.receiveShadow = true;
      S.scene.add(m);
      return m;
    });
    this.grid = grid;
    this.refresh();
  },
  refresh() {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
    const idx = [0, 0];
    for (const it of this.items) {
      const t = this.grid[it.y][it.x];
      const hidden = t.road || t.zone || t.bld || t.stop;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), it.a);
      p.set(tw(it.x) + it.ox, 0, tw(it.y) + it.oz);
      s.setScalar(hidden ? 0.0001 : it.s);
      m.compose(p, q, s);
      this.meshes[it.type].setMatrixAt(idx[it.type]++, m);
    }
    this.meshes.forEach((mm) => { mm.instanceMatrix.needsUpdate = true; });
  },
};
