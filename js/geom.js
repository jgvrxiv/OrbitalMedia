// Geometría procedural. Un Builder acumula triángulos con color de vértice y UV dentro del atlas
// (js/atlas.js) y produce una única BufferGeometry => un solo material y un draw call por modelo.
import * as THREE from '../vendor/three.module.min.js';
import { CELL, LIT, cellUV, hasLit, makeAtlas } from './atlas.js';

export { CELL };

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
  f.chance = (p) => f() < p;
  return f;
}

const _c = new THREE.Color();
const PLAIN_UV = (() => { const [u0, v0, u1, v1] = cellUV(CELL.PLAIN); return [(u0 + u1) / 2, (v0 + v1) / 2]; })();

// tono: multiplica un color por k (oclusión / variaciones)
export function shade(color, k) {
  _c.set(color);
  return [_c.r * k, _c.g * k, _c.b * k];
}
const rgb = (color) => (Array.isArray(color) ? color : shade(color, 1));

// oclusión ambiental falsa: oscurece la base de los muros
const ao = (y) => 0.74 + 0.26 * Math.min(1, Math.max(0, y) / 0.55);

// estilos de fachada heredados (tex) -> función de celda
const TEX = {
  win: () => CELL.WIN_SLIDE,
  brick: () => CELL.BRICK_WIN,
  glass: () => CELL.CURTAIN_SPAN,
  store: () => CELL.SHOP,
};

export class Builder {
  constructor(seed = 1) {
    this.p = []; this.n = []; this.c = []; this.u = [];
    this.r = rng(seed);
    this.litP = 0.32; // probabilidad de ventana encendida de noche
    this.sx = 1; this.sz = 1; // escala horizontal del modelo (lotes más grandes que 1×1)
    this._depth = 0;
  }

  // triángulo con normal plana. cols: color único o array de 3 colores [r,g,b]
  tri(a, b, c, color, uvs, cols) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l; ny /= l; nz /= l;
    const cc = rgb(color);
    [a, b, c].forEach((v, i) => {
      this.p.push(v[0], v[1], v[2]);
      this.n.push(nx, ny, nz);
      const k = cols ? cols[i] : cc;
      this.c.push(k[0], k[1], k[2]);
      const uv = uvs ? uvs[i] : PLAIN_UV;
      this.u.push(uv[0], uv[1]);
    });
  }

  // compatibilidad: quad(bucket, a,b,c,d,color) o quad(a,b,c,d,color)
  quad(...args) {
    if (typeof args[0] === 'string') args.shift();
    const [a, b, c, d, color, uvs, cols] = args;
    this.tri(a, b, c, color, uvs && [uvs[0], uvs[1], uvs[2]], cols && [cols[0], cols[1], cols[2]]);
    this.tri(a, c, d, color, uvs && [uvs[0], uvs[2], uvs[3]], cols && [cols[0], cols[2], cols[3]]);
  }

  // quad texturizado con una celda del atlas (a=abajo-izq, b=abajo-der, c=arriba-der, d=arriba-izq)
  cellQuad(a, b, c, d, color, cell, cols, lit) {
    let id = cell;
    // cada paño de techo (teja o lámina) envejece distinto
    if (cell === CELL.ROOFTILE || cell === CELL.CORRUG) color = shade(color, 0.86 + this.r() * 0.2);
    if (lit === undefined) lit = hasLit(cell) && this.r() < this.litP;
    if (lit && hasLit(cell)) id += LIT;
    const [u0, v0, u1, v1] = cellUV(id);
    this.quad(a, b, c, d, color, [[u0, v0], [u1, v0], [u1, v1], [u0, v1]], cols);
  }

  // Muro vertical de a(ax,az) a b(bx,bz): visible desde el lado (-ez, ex). Rejilla de pisos×columnas.
  // pick(f, c, floors, cols) -> celda | [celda, color]
  wall(ax, az, bx, bz, y0, h, color, floors, cols, pick, lit) {
    const fh = h / floors;
    for (let f = 0; f < floors; f++) {
      const ya = y0 + f * fh, yb = ya + fh;
      for (let c = 0; c < cols; c++) {
        const t0 = c / cols, t1 = (c + 1) / cols;
        const x0 = ax + (bx - ax) * t0, z0 = az + (bz - az) * t0;
        const x1 = ax + (bx - ax) * t1, z1 = az + (bz - az) * t1;
        let cell = pick ? pick(f, c, floors, cols) : CELL.PLAIN;
        let col = color;
        if (Array.isArray(cell)) { col = cell[1]; cell = cell[0]; }
        if (cell === null || cell === undefined) continue;
        const kb = ao(ya), kt = ao(yb);
        const cb = shade(col, kb), ct = shade(col, kt);
        this.cellQuad([x0, ya, z0], [x1, ya, z1], [x1, yb, z1], [x0, yb, z0], col, cell, [cb, cb, ct, ct], lit);
      }
    }
  }

  // Caja con fachadas. (x,z) centro, y base. opts:
  //  tex: estilo heredado | pick(f,c,F,C,side) | sides: {front,back,left,right} -> pick
  //  fl: pisos, cw: ancho de módulo, top: color del techo, noTop, roofCell
  box(x, y, z, w, h, d, color, o = {}) {
    const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2, y1 = y + h;
    const fl = o.fl || Math.max(1, Math.round(h / 0.28));
    const cw = o.cw || 0.3;
    const basePick = o.pick || (o.tex && TEX[o.tex]) || null;
    const side = (name, ax, az, bx, bz, len) => {
      const sp = (o.sides && o.sides[name]) !== undefined ? o.sides[name] : basePick;
      const cols = sp ? Math.max(1, Math.round(len / cw)) : 1;
      const floors = sp ? fl : 1;
      this.wall(ax, az, bx, bz, y, h, color, floors, cols, sp ? (f, c, F, C) => sp(f, c, F, C, name) : null, o.lit);
    };
    side('front', x0, z1, x1, z1, w);
    side('back', x1, z0, x0, z0, w);
    side('right', x1, z1, x1, z0, d);
    side('left', x0, z0, x0, z1, d);
    if (!o.noTop) {
      const tc = o.top || color;
      if (o.roofCell !== undefined) this.cellQuad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], tc, o.roofCell, null, false);
      else this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], tc);
    }
  }

  // caja lisa simple (sin módulos)
  slab(x, y, z, w, h, d, color, top) {
    this.box(x, y, z, w, h, d, color, { top });
  }

  // Techo a dos aguas; cell opcional (ROOFTILE, CORRUG) para las pendientes
  gable(x, y, z, w, h, d, color, axis = 'x', o = {}) {
    const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2, yt = y + h;
    const cell = o.cell ?? CELL.ROOFTILE;
    const gc = o.gable || color;
    if (axis === 'x') {
      this.cellQuad([x0, y, z1], [x1, y, z1], [x1, yt, z], [x0, yt, z], color, cell, null, false);
      this.cellQuad([x1, y, z0], [x0, y, z0], [x0, yt, z], [x1, yt, z], color, cell, null, false);
      this.tri([x1, y, z1], [x1, y, z0], [x1, yt, z], gc);
      this.tri([x0, y, z0], [x0, y, z1], [x0, yt, z], gc);
    } else {
      this.cellQuad([x1, y, z1], [x1, y, z0], [x, yt, z0], [x, yt, z1], color, cell, null, false);
      this.cellQuad([x0, y, z0], [x0, y, z1], [x, yt, z1], [x, yt, z0], color, cell, null, false);
      this.tri([x0, y, z1], [x1, y, z1], [x, yt, z1], gc);
      this.tri([x1, y, z0], [x0, y, z0], [x, yt, z0], gc);
    }
  }

  // Techo a cuatro aguas (hip). Cumbrera a lo largo del eje mayor.
  hip(x, y, z, w, h, d, color, cell = CELL.ROOFTILE) {
    const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2, yt = y + h;
    if (w >= d) {
      const r = (w - d) / 2;
      const A = [x - r, yt, z], Bp = [x + r, yt, z];
      this.cellQuad([x0, y, z1], [x1, y, z1], Bp, A, color, cell, null, false);
      this.cellQuad([x1, y, z0], [x0, y, z0], A, Bp, color, cell, null, false);
      this.tri([x1, y, z1], [x1, y, z0], Bp, color);
      this.tri([x0, y, z0], [x0, y, z1], A, color);
    } else {
      const r = (d - w) / 2;
      const A = [x, yt, z - r], Bp = [x, yt, z + r];
      this.cellQuad([x1, y, z1], [x1, y, z0], A, Bp, color, cell, null, false);
      this.cellQuad([x0, y, z0], [x0, y, z1], Bp, A, color, cell, null, false);
      this.tri([x0, y, z1], [x1, y, z1], Bp, color);
      this.tri([x1, y, z0], [x0, y, z0], A, color);
    }
    // alero
    this.quad([x0 - 0.02, y, z1 + 0.02], [x1 + 0.02, y, z1 + 0.02], [x1 + 0.02, y - 0.015, z1 + 0.02], [x0 - 0.02, y - 0.015, z1 + 0.02], shade(color, 0.7));
  }

  // Techo de una agua (zinc). La parte alta mira hacia dir: 'x+','x-','z+','z-'
  shed(x, y, z, w, d, hLow, hHigh, color, dir = 'z-', cell = CELL.CORRUG) {
    const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2;
    const H = { x0z0: hLow, x1z0: hLow, x0z1: hLow, x1z1: hLow };
    if (dir === 'z-') { H.x0z0 = hHigh; H.x1z0 = hHigh; }
    if (dir === 'z+') { H.x0z1 = hHigh; H.x1z1 = hHigh; }
    if (dir === 'x-') { H.x0z0 = hHigh; H.x0z1 = hHigh; }
    if (dir === 'x+') { H.x1z0 = hHigh; H.x1z1 = hHigh; }
    const A = [x0, y + H.x0z1, z1], B = [x1, y + H.x1z1, z1], C = [x1, y + H.x1z0, z0], D = [x0, y + H.x0z0, z0];
    this.cellQuad(A, B, C, D, color, cell, null, false);
    const sc = shade(color, 0.78);
    this.quad([x0, y, z1], [x1, y, z1], B, A, sc);
    this.quad([x1, y, z0], [x0, y, z0], D, C, sc);
    this.quad([x1, y, z1], [x1, y, z0], C, B, sc);
    this.quad([x0, y, z0], [x0, y, z1], A, D, sc);
  }

  // Caja rotada alrededor de Y (y = base)
  rbox(x, y, z, w, h, d, color, rotY = 0) {
    const g = new THREE.BoxGeometry(w, h, d);
    this.geo(g, color, [x, y + h / 2, z], [0, rotY, 0]);
    g.dispose();
  }

  // Añade cualquier THREE.BufferGeometry (cilindro, cono, esfera…) transformada (UV = celda lisa)
  geo(g, color, pos = [0, 0, 0], rot = [0, 0, 0], scl = [1, 1, 1], cell = null) {
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(...pos),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)),
      new THREE.Vector3(...scl),
    );
    const nm = new THREE.Matrix3().getNormalMatrix(m);
    const P = g.attributes.position, Nn = g.attributes.normal, U = g.attributes.uv;
    const idx = g.index ? g.index.array : null;
    const cnt = idx ? idx.length : P.count;
    const cc = rgb(color);
    const v = new THREE.Vector3(), n = new THREE.Vector3();
    const uvr = cell !== null ? cellUV(cell) : null;
    for (let i = 0; i < cnt; i++) {
      const k = idx ? idx[i] : i;
      v.fromBufferAttribute(P, k).applyMatrix4(m);
      n.fromBufferAttribute(Nn, k).applyMatrix3(nm).normalize();
      this.p.push(v.x, v.y, v.z);
      this.n.push(n.x, n.y, n.z);
      const kk = ao(v.y) * 0.25 + 0.75;
      this.c.push(cc[0] * kk, cc[1] * kk, cc[2] * kk);
      if (uvr && U) this.u.push(uvr[0] + U.getX(k) * (uvr[2] - uvr[0]), uvr[1] + U.getY(k) * (uvr[3] - uvr[1]));
      else this.u.push(PLAIN_UV[0], PLAIN_UV[1]);
    }
  }

  cyl(x, y, z, r, h, color, seg = 10, rTop = null, cell = null) {
    const g = new THREE.CylinderGeometry(rTop ?? r, r, h, seg, 1, cell === null);
    this.geo(g, color, [x, y + h / 2, z], [0, 0, 0], [1, 1, 1], cell);
    g.dispose();
  }

  // cilindro horizontal a lo largo de X o Z
  hcyl(x, y, z, r, len, color, axis = 'x', seg = 10) {
    const g = new THREE.CylinderGeometry(r, r, len, seg);
    this.geo(g, color, [x, y, z], axis === 'x' ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0]);
    g.dispose();
  }

  cone(x, y, z, r, h, color, seg = 8) {
    const g = new THREE.ConeGeometry(r, h, seg);
    this.geo(g, color, [x, y + h / 2, z]);
    g.dispose();
  }

  sphere(x, y, z, r, color, sx = 1, sy = 1, sz = 1, seg = 8) {
    const g = new THREE.SphereGeometry(r, seg, Math.max(4, seg - 2));
    this.geo(g, color, [x, y, z], [0, 0, 0], [sx, sy, sz]);
    g.dispose();
  }

  // bóveda semicilíndrica (invernaderos, hangares). len a lo largo de axis, w = luz, h = flecha.
  vault(x, y, z, w, len, h, color, axis = 'x', cell = null, seg = 10, caps = true) {
    const P = (along, across, up) => (axis === 'x' ? [x + along, y + up, z + across] : [x + across, y + up, z + along]);
    const L = len / 2;
    for (let i = 0; i < seg; i++) {
      const t0 = (i / seg) * Math.PI, t1 = ((i + 1) / seg) * Math.PI;
      const c0 = Math.cos(t0) * w / 2, s0 = Math.sin(t0) * h, c1 = Math.cos(t1) * w / 2, s1 = Math.sin(t1) * h;
      const q = [P(-L, c0, s0), P(L, c0, s0), P(L, c1, s1), P(-L, c1, s1)];
      if (cell !== null) this.cellQuad(q[0], q[1], q[2], q[3], color, cell, null, false);
      else this.quad(q[0], q[1], q[2], q[3], color);
      if (caps) {
        const cc = shade(color, 0.85);
        this.tri(P(-L, 0, 0), P(-L, c0, s0), P(-L, c1, s1), cc);
        this.tri(P(L, 0, 0), P(L, c1, s1), P(L, c0, s0), cc);
      }
    }
  }

  // plano horizontal (piscina, césped…)
  plane(x, y, z, w, d, color, cell = null) {
    const a = [x - w / 2, y, z + d / 2], b = [x + w / 2, y, z + d / 2], c = [x + w / 2, y, z - d / 2], dd = [x - w / 2, y, z - d / 2];
    if (cell !== null) this.cellQuad(a, b, c, dd, color, cell, null, false);
    else this.quad(a, b, c, dd, color);
  }

  // Palma de cera (árbol nacional) o palma común
  palm(x, z, h = 0.6, wax = false, y = 0) {
    this.cyl(x, y, z, 0.02, h, wax ? '#d8cdb8' : '#8a6a46', 6, 0.013);
    const leaf = wax ? '#3f8f3a' : '#4aa043';
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const g = new THREE.ConeGeometry(0.035, 0.3, 4);
      this.geo(g, i % 2 ? leaf : shade(leaf, 0.85), [x + Math.cos(a) * 0.11, y + h - 0.02, z + Math.sin(a) * 0.11], [Math.sin(a) * 1.25, 0, -Math.cos(a) * 1.25]);
      g.dispose();
    }
    this.sphere(x, y + h, z, 0.03, '#6b8f3a');
  }

  tree(x, z, h = 0.3, c = '#3f8f3a', y = 0) {
    this.cyl(x, y, z, 0.025, h * 0.5, '#6b4a2b', 6);
    this.sphere(x, y + h * 0.66, z, h * 0.34, c, 1, 0.92, 1, 7);
    this.sphere(x + h * 0.12, y + h * 0.82, z - h * 0.08, h * 0.22, shade(c, 1.12), 1, 0.9, 1, 6);
  }

  // arbusto
  bush(x, z, s = 0.08, c = '#4d8f3f', y = 0) {
    this.sphere(x, y + s * 0.6, z, s, c, 1.2, 0.8, 1.2, 6);
  }

  build() {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    geom.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    geom.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
    geom.computeBoundingSphere();
    geom.computeBoundingBox();
    return geom;
  }
}

// Escala horizontal: un modelo pensado para 1×1 se "estira" a 1×2 o 2×2 casillas. Se escalan las posiciones y las
// dimensiones horizontales de los volúmenes (> 0,2) y de los suelos planos; los detalles pequeños (tanques,
// rejas, barandas) conservan su tamaño, y los muros más largos reciben más columnas de ventanas.
{
  const P = Builder.prototype;
  // nombre: [índices de x, z, ancho, fondo] en la lista de argumentos
  const SPEC = {
    box: [0, 2, 3, 5], slab: [0, 2, 3, 5], gable: [0, 2, 3, 5], hip: [0, 2, 3, 5], rbox: [0, 2, 3, 5],
    shed: [0, 2, 3, 4], plane: [0, 2, 3, 4], cyl: [0, 2], hcyl: [0, 2], cone: [0, 2], sphere: [0, 2], vault: [0, 2],
    palm: [0, 1], tree: [0, 1], bush: [0, 1],
  };
  for (const [name, [ix, iz, iw, id]] of Object.entries(SPEC)) {
    const orig = P[name];
    P[name] = function (...a) {
      if (this._depth || (this.sx === 1 && this.sz === 1)) { this._depth++; try { return orig.apply(this, a); } finally { this._depth--; } }
      a[ix] *= this.sx; a[iz] *= this.sz;
      const flat = name === 'plane' || (name === 'box' && a[4] < 0.03);
      if (iw !== undefined && (flat || a[iw] > 0.2)) a[iw] *= this.sx;
      if (id !== undefined && (flat || a[id] > 0.2)) a[id] *= this.sz;
      this._depth++;
      try { return orig.apply(this, a); } finally { this._depth--; }
    };
  }
}

export const mats = {};
export function initMaterials() {
  const atlas = makeAtlas();
  mats.atlas = atlas;
  mats.solid = new THREE.MeshLambertMaterial({
    vertexColors: true, side: THREE.DoubleSide, map: atlas.map,
    emissive: new THREE.Color('#ffffff'), emissiveMap: atlas.emissive, emissiveIntensity: 0,
  });
  mats.plain = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
}

export function makeMesh(geom, shadow = true) {
  const m = new THREE.Mesh(geom, mats.solid);
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}
