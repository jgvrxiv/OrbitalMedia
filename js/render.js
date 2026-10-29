// Grupos de InstancedMesh por geometría: una llamada de dibujo por modelo distinto, sin importar cuántos edificios lo usen.
import * as THREE from '../vendor/three.module.min.js';

export class InstPools {
  constructor(parent, material) {
    this.parent = parent;
    this.material = material;
    this.pools = new Map();
    this.dirty = new Set();
  }

  _mk(p) {
    const m = new THREE.InstancedMesh(p.geom, this.material, p.cap);
    m.count = p.n;
    m.castShadow = p.shadow;
    m.receiveShadow = true;
    m.frustumCulled = false;
    this.parent.add(m);
    return m;
  }

  add(key, geomFn, matrix, shadow = true) {
    let p = this.pools.get(key);
    if (!p) {
      p = { key, geom: geomFn(), cap: 8, n: 0, items: [], shadow };
      p.mesh = this._mk(p);
      this.pools.set(key, p);
    }
    if (p.n >= p.cap) {
      const old = p.mesh;
      p.cap *= 2;
      p.mesh = this._mk(p);
      for (let i = 0; i < p.n; i++) p.mesh.setMatrixAt(i, p.items[i].m);
      this.parent.remove(old);
      old.dispose();
    }
    const h = { p, i: p.n++, m: matrix.clone() };
    p.items[h.i] = h;
    p.mesh.setMatrixAt(h.i, matrix);
    p.mesh.count = p.n;
    this.dirty.add(p);
    return h;
  }

  set(h, matrix) {
    h.m.copy(matrix);
    h.p.mesh.setMatrixAt(h.i, matrix);
    this.dirty.add(h.p);
  }

  remove(h) {
    const p = h.p;
    const last = p.items[p.n - 1];
    if (last !== h) {
      p.items[h.i] = last;
      last.i = h.i;
      p.mesh.setMatrixAt(last.i, last.m);
    }
    p.items[p.n - 1] = undefined;
    p.n--;
    p.mesh.count = p.n;
    this.dirty.add(p);
  }

  clear() {
    for (const p of this.pools.values()) { this.parent.remove(p.mesh); p.mesh.dispose(); }
    this.pools.clear();
    this.dirty.clear();
  }

  flush() {
    for (const p of this.dirty) p.mesh.instanceMatrix.needsUpdate = true;
    this.dirty.clear();
  }

  stats() {
    let draws = 0, inst = 0;
    for (const p of this.pools.values()) if (p.n) { draws++; inst += p.n; }
    return { draws, inst };
  }
}
