// Utilidades de geometría procedural: un Builder acumula caras en "cubetas"
// (sólido sin textura, y paredes con textura de ventanas/ladrillo/vidrio) y
// produce una única BufferGeometry con grupos => 1 mesh por edificio.
import * as THREE from '../vendor/three.module.min.js';

export function rng(seed) {
  let a = seed >>> 0;
  const f = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.pick = (arr) => arr[Math.floor(f() * arr.length)];
  f.range = (a0, b0) => a0 + f() * (b0 - a0);
  f.int = (a0, b0) => Math.floor(a0 + f() * (b0 - a0 + 1));
  return f;
}

const BUCKETS = ['solid', 'win', 'brick', 'glass', 'store'];
const _c = new THREE.Color();

export function col(c) {
  return _c.set(c).clone();
}

export class Builder {
  constructor() {
    this.b = {};
    for (const k of BUCKETS) this.b[k] = { p: [], n: [], c: [], u: [] };
  }

  // triángulo con normal plana
  tri(bucket, a, b, c, color, uvs) {
    const B = this.b[bucket];
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l; ny /= l; nz /= l;
    const cc = col(color);
    [a, b, c].forEach((v, i) => {
      B.p.push(v[0], v[1], v[2]);
      B.n.push(nx, ny, nz);
      B.c.push(cc.r, cc.g, cc.b);
      const uv = uvs ? uvs[i] : [0, 0];
      B.u.push(uv[0], uv[1]);
    });
  }

  quad(bucket, a, b, c, d, color, uvs) {
    this.tri(bucket, a, b, c, color, uvs && [uvs[0], uvs[1], uvs[2]]);
    this.tri(bucket, a, c, d, color, uvs && [uvs[0], uvs[2], uvs[3]]);
  }

  // Caja. (x,z) centro, y base. opts: tex ('win'|'brick'|'glass'|'store'), fl pisos, cw ancho de celda,
  // top color distinto para techo, noTop
  box(x, y, z, w, h, d, color, o = {}) {
    const x0 = x - w / 2, x1 = x + w / 2, y0 = y, y1 = y + h, z0 = z - d / 2, z1 = z + d / 2;
    const tex = o.tex || 'solid';
    const fl = o.fl || Math.max(1, Math.round(h / 0.28));
    const cw = o.cw || 0.3;
    const side = (a, b, c, dd, len) => {
      if (tex === 'solid') this.quad('solid', a, b, c, dd, color);
      else {
        const cu = Math.max(1, Math.round(len / cw));
        this.quad(tex, a, b, c, dd, color, [[0, 0], [cu, 0], [cu, fl], [0, fl]]);
      }
    };
    side([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], w);
    side([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], w);
    side([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], d);
    side([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], d);
    if (!o.noTop) this.quad('solid', [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], o.top || color);
  }

  // Techo a dos aguas. eje 'x' => cumbrera paralela a X.
  gable(x, y, z, w, h, d, color, axis = 'x', o = {}) {
    const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2, yt = y + h;
    if (axis === 'x') {
      const zm = z;
      this.quad('solid', [x0, y, z1], [x1, y, z1], [x1, yt, zm], [x0, yt, zm], color);
      this.quad('solid', [x1, y, z0], [x0, y, z0], [x0, yt, zm], [x1, yt, zm], color);
      this.tri('solid', [x1, y, z1], [x1, y, z0], [x1, yt, zm], o.gable || color);
      this.tri('solid', [x0, y, z0], [x0, y, z1], [x0, yt, zm], o.gable || color);
    } else {
      const xm = x;
      this.quad('solid', [x1, y, z1], [x1, y, z0], [xm, yt, z0], [xm, yt, z1], color);
      this.quad('solid', [x0, y, z0], [x0, y, z1], [xm, yt, z1], [xm, yt, z0], color);
      this.tri('solid', [x0, y, z1], [x1, y, z1], [xm, yt, z1], o.gable || color);
      this.tri('solid', [x1, y, z0], [x0, y, z0], [xm, yt, z0], o.gable || color);
    }
  }

  // Techo de una agua (zinc). La parte alta mira hacia dir: 'x+','x-','z+','z-'
  shed(x, y, z, w, d, hLow, hHigh, color, dir = 'z-') {
    const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2;
    const H = { x0z0: hLow, x1z0: hLow, x0z1: hLow, x1z1: hLow };
    if (dir === 'z-') { H.x0z0 = hHigh; H.x1z0 = hHigh; }
    if (dir === 'z+') { H.x0z1 = hHigh; H.x1z1 = hHigh; }
    if (dir === 'x-') { H.x0z0 = hHigh; H.x0z1 = hHigh; }
    if (dir === 'x+') { H.x1z0 = hHigh; H.x1z1 = hHigh; }
    const A = [x0, y + H.x0z1, z1], B = [x1, y + H.x1z1, z1], C = [x1, y + H.x1z0, z0], D = [x0, y + H.x0z0, z0];
    this.quad('solid', A, B, C, D, color);
    this.quad('solid', [x0, y, z1], [x1, y, z1], B, A, color);
    this.quad('solid', [x1, y, z0], [x0, y, z0], D, C, color);
    this.quad('solid', [x1, y, z1], [x1, y, z0], C, B, color);
    this.quad('solid', [x0, y, z0], [x0, y, z1], A, D, color);
  }

  // Caja rotada alrededor de Y (y = base)
  rbox(x, y, z, w, h, d, color, rotY = 0) {
    const g = new THREE.BoxGeometry(w, h, d);
    this.geo(g, color, [x, y + h / 2, z], [0, rotY, 0]);
    g.dispose();
  }

  // Añade cualquier THREE.BufferGeometry (cilindro, cono, esfera…) transformada.
  geo(g, color, pos = [0, 0, 0], rot = [0, 0, 0], scl = [1, 1, 1], bucket = 'solid') {
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(...pos),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)),
      new THREE.Vector3(...scl),
    );
    const nm = new THREE.Matrix3().getNormalMatrix(m);
    const P = g.attributes.position, N = g.attributes.normal;
    const idx = g.index ? g.index.array : null;
    const cnt = idx ? idx.length : P.count;
    const cc = col(color);
    const v = new THREE.Vector3(), n = new THREE.Vector3();
    const B = this.b[bucket];
    for (let i = 0; i < cnt; i++) {
      const k = idx ? idx[i] : i;
      v.fromBufferAttribute(P, k).applyMatrix4(m);
      n.fromBufferAttribute(N, k).applyMatrix3(nm).normalize();
      B.p.push(v.x, v.y, v.z);
      B.n.push(n.x, n.y, n.z);
      B.c.push(cc.r, cc.g, cc.b);
      B.u.push(0, 0);
    }
  }

  cyl(x, y, z, r, h, color, seg = 8, rTop = null) {
    const g = new THREE.CylinderGeometry(rTop ?? r, r, h, seg);
    this.geo(g, color, [x, y + h / 2, z]);
    g.dispose();
  }

  cone(x, y, z, r, h, color, seg = 8) {
    const g = new THREE.ConeGeometry(r, h, seg);
    this.geo(g, color, [x, y + h / 2, z]);
    g.dispose();
  }

  sphere(x, y, z, r, color, sx = 1, sy = 1, sz = 1) {
    const g = new THREE.SphereGeometry(r, 8, 6);
    this.geo(g, color, [x, y, z], [0, 0, 0], [sx, sy, sz]);
    g.dispose();
  }

  // plano horizontal (piscina, césped…)
  plane(x, y, z, w, d, color) {
    this.quad('solid', [x - w / 2, y, z + d / 2], [x + w / 2, y, z + d / 2], [x + w / 2, y, z - d / 2], [x - w / 2, y, z - d / 2], color);
  }

  // Palma de cera (árbol nacional) o palma común
  palm(x, z, h = 0.6, wax = false) {
    this.cyl(x, 0, z, 0.018, h, wax ? '#d8cdb8' : '#8a6a46', 5, 0.012);
    const leaf = wax ? '#3f8f3a' : '#4aa043';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      this.geo(new THREE.ConeGeometry(0.03, 0.26, 4), leaf, [x + Math.cos(a) * 0.1, h + 0.0, z + Math.sin(a) * 0.1], [Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2]);
    }
  }

  tree(x, z, h = 0.3, c = '#3f8f3a') {
    this.cyl(x, 0, z, 0.03, h * 0.55, '#6b4a2b', 5);
    this.sphere(x, h * 0.7, z, h * 0.38, c, 1, 0.9, 1);
  }

  build() {
    const pos = [], nor = [], colr = [], uv = [];
    const geom = new THREE.BufferGeometry();
    const order = [];
    let start = 0;
    BUCKETS.forEach((k, i) => {
      const B = this.b[k];
      const count = B.p.length / 3;
      if (!count) return;
      pos.push(...B.p); nor.push(...B.n); colr.push(...B.c); uv.push(...B.u);
      geom.addGroup(start, count, order.length);
      order.push(k);
      start += count;
    });
    geom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geom.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    geom.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geom.computeBoundingSphere();
    geom.userData.order = order;
    return geom;
  }
}

// ---------- texturas procedurales ----------
function canvasTex(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  draw(g, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const texWin = () => canvasTex(64, (g, s) => {
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, s, s);
  g.fillStyle = '#d6d6d6'; g.fillRect(0, s - 6, s, 6); // losa
  g.fillStyle = '#e9e9e9'; g.fillRect(14, 10, 36, 38);
  g.fillStyle = '#35465c'; g.fillRect(17, 13, 30, 32);
  g.fillStyle = '#5d7a99'; g.fillRect(17, 13, 30, 12);
  g.fillStyle = '#e9e9e9'; g.fillRect(31, 13, 2, 32);
});

const texBrick = () => canvasTex(64, (g, s) => {
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, s, s);
  g.fillStyle = 'rgba(0,0,0,0.16)';
  for (let r = 0; r < 8; r++) {
    g.fillRect(0, r * 8, s, 1);
    const off = r % 2 ? 0 : 8;
    for (let x = off; x < s; x += 16) g.fillRect(x, r * 8, 1, 8);
  }
  g.fillStyle = '#3a3a3a'; g.fillRect(24, 24, 16, 20); // ventanita
  g.fillStyle = '#6c7f93'; g.fillRect(25, 25, 14, 8);
});

const texGlass = () => canvasTex(32, (g, s) => {
  g.fillStyle = '#d9ecf7'; g.fillRect(0, 0, s, s);
  const gr = g.createLinearGradient(0, 0, s, s);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#8fb4d0');
  g.fillStyle = gr; g.fillRect(1, 1, s - 2, s - 7);
  g.fillStyle = '#3b4a58'; g.fillRect(0, s - 5, s, 5);
});

const texStore = () => canvasTex(64, (g, s) => {
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, s, s);
  g.fillStyle = '#3c4a5a'; g.fillRect(6, 20, 52, 38);
  g.fillStyle = '#9fd0e8'; g.fillRect(8, 22, 48, 20);
  g.fillStyle = '#ffffff'; g.fillRect(0, 4, s, 12);
});

export const mats = {};
export function initMaterials() {
  const common = { vertexColors: true, side: THREE.DoubleSide };
  mats.solid = new THREE.MeshLambertMaterial({ ...common });
  mats.win = new THREE.MeshLambertMaterial({ ...common, map: texWin() });
  mats.brick = new THREE.MeshLambertMaterial({ ...common, map: texBrick() });
  mats.glass = new THREE.MeshLambertMaterial({ ...common, map: texGlass() });
  mats.store = new THREE.MeshLambertMaterial({ ...common, map: texStore() });
}

export function makeMesh(geom, shadow = true) {
  const arr = geom.userData.order.map((k) => mats[k]);
  const m = new THREE.Mesh(geom, arr);
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}
