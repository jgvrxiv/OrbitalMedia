// Atlas de texturas procedural (fachadas, ventanas, tejas, rejas…) + mapa emisivo de ventanas encendidas.
// Cada celda es blanca/neutra para que el color de vértice la tiñe. Las celdas +32 son la versión "encendida".
import * as THREE from '../vendor/three.module.min.js';

export const CELL = {
  PLAIN: 0, STAIN: 1, BRICK: 2, BRICK_WIN: 3, WIN_HOLE: 4, WIN_BARS: 5, WIN_SLIDE: 6, WIN_BIG: 7,
  WIN_SHUT: 8, BALCONY: 9, BALCONY_GLASS: 10, FLOORGLASS: 11, CURTAIN: 12, CURTAIN_SPAN: 13, DOOR: 14,
  DOOR_GLASS: 15, GARAGE: 16, SHOP: 17, SHOP_GRILL: 18, ROLLER: 19, CLERESTORY: 20, CORRUG: 21,
  ROOFTILE: 22, VENT: 23, BAND: 24, SIGN: 25, WIN_ARCH: 26, GREEN: 27, OBRA: 28, PANEL: 29,
  GLASS_ROOF: 30, WOOD: 31,
};
export const LIT = 32;
const WINDOWED = new Set([3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 17, 18, 20, 25, 26, 28]);
export const hasLit = (c) => WINDOWED.has(c);

const S = 128, COLS = 8;

export function cellUV(id) {
  const col = id % COLS, row = Math.floor(id / COLS);
  const e = 0.9 / (S * COLS); // pequeño margen contra el sangrado
  const u0 = col / COLS + e * 2, u1 = (col + 1) / COLS - e * 2;
  const v1 = 1 - row / COLS - e * 2, v0 = 1 - (row + 1) / COLS + e * 2;
  return [u0, v0, u1, v1];
}

// pseudo-aleatorio determinista para las texturas
function mk(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function speckle(g, r, n, a, x0 = 0, y0 = 0, w = S, h = S) {
  for (let i = 0; i < n; i++) {
    const v = r() < 0.5 ? 0 : 255;
    g.fillStyle = `rgba(${v},${v},${v},${a * r()})`;
    g.fillRect(x0 + r() * w, y0 + r() * h, 1 + r() * 3, 1 + r() * 3);
  }
}

function pane(g, em, lit, x, y, w, h, o = {}) {
  if (em) {
    if (lit) { g.fillStyle = o.glow || '#ffcf70'; g.fillRect(x, y, w, h); }
    return;
  }
  if (!o.noFrame) {
    g.fillStyle = '#8c8c8c'; g.fillRect(x - 4, y - 4, w + 8, h + 8);
    g.fillStyle = '#f4f4f4'; g.fillRect(x - 2, y - 2, w + 4, h + 4);
  }
  if (lit) {
    const gr = g.createLinearGradient(x, y, x, y + h);
    gr.addColorStop(0, '#ffe7a8'); gr.addColorStop(1, '#f3b95a');
    g.fillStyle = gr;
  } else {
    const gr = g.createLinearGradient(x, y, x + w, y + h);
    const c = o.glass || ['#8fb0cc', '#2b3a4d'];
    gr.addColorStop(0, c[0]); gr.addColorStop(1, c[1]);
    g.fillStyle = gr;
  }
  g.fillRect(x, y, w, h);
  if (!lit) {
    g.fillStyle = 'rgba(255,255,255,0.22)';
    g.beginPath(); g.moveTo(x, y + h * 0.6); g.lineTo(x + w * 0.5, y); g.lineTo(x + w * 0.75, y); g.lineTo(x, y + h * 0.95); g.fill();
  }
  if (o.sill !== false && !o.noFrame) { g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(x - 5, y + h + 3, w + 10, 5); }
}

function mull(g, em, x, y, w, h, cross = true) {
  g.fillStyle = em ? '#000' : '#f0f0f0';
  if (cross) {
    g.fillRect(x + w / 2 - 1.5, y, 3, h);
    g.fillRect(x, y + h / 2 - 1.5, w, 3);
  } else g.fillRect(x + w / 2 - 1.5, y, 3, h);
}

function bars(g, em, x, y, w, h) {
  if (em) return;
  g.fillStyle = '#1c1c1c';
  for (let i = 1; i < 5; i++) g.fillRect(x + (w * i) / 5 - 1, y, 2.5, h);
  g.fillRect(x, y + h / 2 - 1, w, 2.5);
  g.fillRect(x - 3, y - 3, w + 6, 3); g.fillRect(x - 3, y + h, w + 6, 3);
}

function brickFill(g, r, x0, y0, w, h, base = 1) {
  const bh = 8, bw = 20;
  for (let row = 0; row * bh < h; row++) {
    const off = row % 2 ? bw / 2 : 0;
    for (let bx = -off; bx < w; bx += bw) {
      const v = Math.floor(236 + (r() - 0.5) * 30) * base;
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(x0 + Math.max(0, bx), y0 + row * bh, Math.min(bw, w - Math.max(0, bx)) - 1.5, bh - 1.5);
    }
  }
}

const DRAW = {
  [CELL.PLAIN]: (g) => { g.fillStyle = '#fff'; g.fillRect(0, 0, S, S); },
  [CELL.STAIN]: (g, em, lit, r) => {
    g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, S, S);
    speckle(g, r, 260, 0.1);
    for (let i = 0; i < 7; i++) {
      const x = r() * S; const gr = g.createLinearGradient(x, 0, x, S * (0.4 + r() * 0.5));
      gr.addColorStop(0, 'rgba(60,50,40,0.28)'); gr.addColorStop(1, 'rgba(60,50,40,0)');
      g.fillStyle = gr; g.fillRect(x, 0, 4 + r() * 6, S);
    }
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, S - 6, S, 6);
  },
  [CELL.BRICK]: (g, em, lit, r) => {
    g.fillStyle = '#b9b1a8'; g.fillRect(0, 0, S, S);
    brickFill(g, r, 0, 0, S, S);
  },
  [CELL.BRICK_WIN]: (g, em, lit, r) => {
    if (!em) { g.fillStyle = '#b9b1a8'; g.fillRect(0, 0, S, S); brickFill(g, r, 0, 0, S, S); }
    pane(g, em, lit, 44, 40, 40, 44, { noFrame: false });
    if (!em) mull(g, em, 44, 40, 40, 44, false);
  },
  [CELL.WIN_HOLE]: (g, em, lit, r) => {
    if (!em) { g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, S, S); speckle(g, r, 120, 0.1); }
    if (em) { if (lit) { g.fillStyle = '#e8a64a'; g.fillRect(46, 44, 36, 36); } return; }
    g.fillStyle = '#222'; g.fillRect(44, 42, 40, 40);
    g.fillStyle = lit ? '#c98a3a' : '#3a4350'; g.fillRect(47, 45, 34, 34);
  },
  [CELL.WIN_BARS]: (g, em, lit) => {
    if (!em) { g.fillStyle = '#fff'; g.fillRect(0, 0, S, S); }
    pane(g, em, lit, 30, 28, 68, 66);
    mull(g, em, 30, 28, 68, 66);
    bars(g, em, 30, 28, 68, 66);
  },
  [CELL.WIN_SLIDE]: (g, em, lit) => {
    if (!em) { g.fillStyle = '#fff'; g.fillRect(0, 0, S, S); }
    pane(g, em, lit, 18, 36, 92, 52);
    mull(g, em, 18, 36, 92, 52, false);
  },
  [CELL.WIN_BIG]: (g, em, lit) => {
    if (!em) { g.fillStyle = '#fff'; g.fillRect(0, 0, S, S); }
    pane(g, em, lit, 20, 20, 88, 78);
    mull(g, em, 20, 20, 88, 78, true);
  },
  [CELL.WIN_SHUT]: (g, em, lit) => {
    if (!em) { g.fillStyle = '#fff'; g.fillRect(0, 0, S, S); }
    pane(g, em, lit, 36, 28, 56, 64);
    mull(g, em, 36, 28, 56, 64, false);
    if (!em) {
      for (const sx of [14, 94]) {
        g.fillStyle = '#9a9a9a'; g.fillRect(sx, 26, 22, 68);
        g.fillStyle = '#dcdcdc'; for (let y = 30; y < 90; y += 6) g.fillRect(sx + 2, y, 18, 3);
      }
    }
  },
  [CELL.BALCONY]: (g, em, lit) => {
    if (!em) { g.fillStyle = '#fff'; g.fillRect(0, 0, S, S); }
    pane(g, em, lit, 34, 14, 60, 90, { sill: false });
    mull(g, em, 34, 14, 60, 90, false);
    if (!em) {
      g.fillStyle = '#6a6a6a'; g.fillRect(14, 76, 100, 4); g.fillRect(14, 104, 100, 5);
      for (let x = 16; x < 114; x += 9) g.fillRect(x, 76, 2, 30);
    }
  },
  [CELL.BALCONY_GLASS]: (g, em, lit) => {
    if (!em) { g.fillStyle = '#fff'; g.fillRect(0, 0, S, S); }
    pane(g, em, lit, 14, 10, 100, 86, { noFrame: false, sill: false });
    mull(g, em, 14, 10, 100, 86, false);
    if (!em) { g.fillStyle = 'rgba(190,225,240,0.55)'; g.fillRect(6, 70, 116, 40); g.fillStyle = '#555'; g.fillRect(6, 68, 116, 3); g.fillRect(0, 112, S, 8); }
  },
  [CELL.FLOORGLASS]: (g, em, lit) => {
    if (!em) { g.fillStyle = '#e8e8e8'; g.fillRect(0, 0, S, S); }
    pane(g, em, lit, 6, 8, 116, 104, { noFrame: true });
    if (!em) { mull(g, em, 6, 8, 116, 104, false); g.fillStyle = '#fff'; g.fillRect(0, 114, S, 14); g.fillRect(0, 0, S, 6); }
  },
  [CELL.CURTAIN]: (g, em, lit) => {
    if (!em) { g.fillStyle = '#d0d0d0'; g.fillRect(0, 0, S, S); }
    pane(g, em, lit, 4, 4, 120, 120, { noFrame: true, glass: ['#b6d6ea', '#4f7a9c'] });
    if (!em) { g.fillStyle = 'rgba(230,240,248,0.9)'; g.fillRect(0, 0, S, 4); g.fillRect(0, 0, 4, S); g.fillRect(62, 4, 3, 120); }
  },
  [CELL.CURTAIN_SPAN]: (g, em, lit) => {
    if (!em) { g.fillStyle = '#c8c8c8'; g.fillRect(0, 0, S, S); }
    pane(g, em, lit, 4, 4, 120, 84, { noFrame: true, glass: ['#bcdcef', '#4a7699'] });
    if (!em) {
      g.fillStyle = '#5f6b75'; g.fillRect(0, 92, S, 36);
      g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(0, 0, 4, S); g.fillRect(62, 4, 3, 86);
    }
  },
  [CELL.DOOR]: (g, em) => {
    if (em) return;
    g.fillStyle = '#fff'; g.fillRect(0, 0, S, S);
    g.fillStyle = '#7a7a7a'; g.fillRect(36, 18, 56, 110);
    g.fillStyle = '#585858'; g.fillRect(40, 22, 48, 106);
    g.fillStyle = '#6c6c6c'; g.fillRect(46, 30, 15, 36); g.fillRect(67, 30, 15, 36); g.fillRect(46, 74, 15, 40); g.fillRect(67, 74, 15, 40);
    g.fillStyle = '#e0c060'; g.fillRect(80, 76, 4, 8);
  },
  [CELL.DOOR_GLASS]: (g, em, lit) => {
    if (!em) { g.fillStyle = '#e2e2e2'; g.fillRect(0, 0, S, S); }
    pane(g, em, lit, 18, 18, 92, 110, { noFrame: true, glass: ['#9ec3da', '#35566f'] });
    if (!em) { mull(g, em, 18, 18, 92, 110, false); g.fillStyle = '#444'; g.fillRect(0, 8, S, 6); }
  },
  [CELL.GARAGE]: (g, em) => {
    if (em) return;
    g.fillStyle = '#fff'; g.fillRect(0, 0, S, S);
    g.fillStyle = '#7c7c7c'; g.fillRect(14, 30, 100, 98);
    g.fillStyle = '#d6d6d6'; g.fillRect(17, 33, 94, 95);
    g.fillStyle = '#9a9a9a'; for (let y = 40; y < 128; y += 14) g.fillRect(17, y, 94, 2.5);
  },
  [CELL.SHOP]: (g, em, lit) => {
    if (!em) { g.fillStyle = '#fff'; g.fillRect(0, 0, S, S); g.fillStyle = '#eee'; g.fillRect(0, 0, S, 28); g.fillStyle = '#bbb'; g.fillRect(0, 26, S, 3); }
    pane(g, em, lit, 10, 40, 108, 66, { noFrame: true, glass: ['#a9c9dd', '#37516a'] });
    if (!em) { mull(g, em, 10, 40, 108, 66, false); g.fillStyle = '#9a9a9a'; g.fillRect(0, 108, S, 20); }
  },
  [CELL.SHOP_GRILL]: (g, em, lit) => {
    if (!em) { g.fillStyle = '#fff'; g.fillRect(0, 0, S, S); g.fillStyle = '#eee'; g.fillRect(0, 0, S, 24); }
    pane(g, em, lit, 10, 36, 108, 72, { noFrame: true });
    if (!em) {
      g.fillStyle = '#7d7d7d'; g.fillRect(8, 34, 112, 40);
      g.fillStyle = '#b5b5b5'; for (let y = 36; y < 72; y += 5) g.fillRect(8, y, 112, 2.5);
      g.fillStyle = '#909090'; g.fillRect(0, 110, S, 18);
    }
  },
  [CELL.ROLLER]: (g, em) => {
    if (em) return;
    g.fillStyle = '#f0f0f0'; g.fillRect(0, 0, S, S);
    g.fillStyle = '#6e6e6e'; g.fillRect(6, 14, 116, 114);
    g.fillStyle = '#bdbdbd'; for (let y = 18; y < 126; y += 6) g.fillRect(8, y, 112, 3);
    g.fillStyle = '#e0b000'; g.fillRect(6, 8, 116, 6);
  },
  [CELL.CLERESTORY]: (g, em, lit) => {
    if (!em) { g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, S, S); speckle(g, mk(5), 80, 0.08); }
    pane(g, em, lit, 4, 22, 120, 40, { noFrame: true, glass: ['#a5c0d4', '#4a6579'] });
    if (!em) { g.fillStyle = '#d8d8d8'; for (let x = 34; x < 124; x += 30) g.fillRect(x, 22, 3, 40); g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(0, S - 5, S, 5); }
  },
  [CELL.CORRUG]: (g, em, lit, r) => {
    for (let x = 0; x < S; x += 8) {
      const gr = g.createLinearGradient(x, 0, x + 8, 0);
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.5, '#c4c4c4'); gr.addColorStop(1, '#efefef');
      g.fillStyle = gr; g.fillRect(x, 0, 8, S);
    }
    // traslapes, óxido y manchas de agua que escurren por las canaletas
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(0, S * 0.5 - 1, S, 3);
    for (let i = 0; i < 9; i++) {
      const x = Math.floor(r() * 16) * 8, y = r() * S * 0.8, h = 14 + r() * 50;
      g.fillStyle = `rgba(90,50,25,${0.1 + r() * 0.18})`; g.fillRect(x + 1, y, 5, h);
    }
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(60,40,30,${0.1 + r() * 0.2})`; g.fillRect(r() * S, r() * S, 2 + r() * 3, 2 + r() * 3); }
    g.fillStyle = 'rgba(255,255,255,0.28)'; g.fillRect(0, 0, S, 3);
  },
  [CELL.ROOFTILE]: (g, em, lit, r) => {
    g.fillStyle = '#8c8c8c'; g.fillRect(0, 0, S, S);
    for (let row = 0; row < 10; row++) {
      const h = S / 10;
      for (let x = row % 2 ? -9 : 0; x < S; x += 18) {
        const v = 205 + Math.floor(r() * 50);
        const gr = g.createLinearGradient(0, row * h, 0, row * h + h);
        gr.addColorStop(0, `rgb(${v},${v},${v})`); gr.addColorStop(1, `rgb(${v - 85},${v - 85},${v - 85})`);
        g.fillStyle = gr; g.fillRect(x, row * h, 17, h - 1);
        g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x + 16, row * h, 1.5, h - 1);
      }
    }
    // tejas desteñidas, musgo y hollín
    for (let i = 0; i < 18; i++) { g.fillStyle = r() < 0.5 ? `rgba(40,60,30,${0.12 + r() * 0.18})` : `rgba(255,255,255,${0.1 + r() * 0.16})`; g.fillRect(r() * S, r() * S, 8 + r() * 22, 6 + r() * 12); }
  },
  [CELL.VENT]: (g, em) => {
    if (em) return;
    g.fillStyle = '#fff'; g.fillRect(0, 0, S, S);
    g.fillStyle = '#7a7a7a'; g.fillRect(12, 20, 104, 88);
    g.fillStyle = '#c8c8c8'; for (let y = 24; y < 106; y += 9) g.fillRect(14, y, 100, 5);
  },
  [CELL.BAND]: (g) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, S, S);
    g.fillStyle = '#c4c4c4'; g.fillRect(0, 0, S, 30); g.fillRect(0, S - 22, S, 22);
  },
  [CELL.SIGN]: (g, em, lit) => {
    if (em) { if (lit) { g.fillStyle = '#fff6dc'; g.fillRect(8, 20, 112, 88); } return; }
    g.fillStyle = '#fff'; g.fillRect(0, 0, S, S);
    g.fillStyle = '#d6d6d6'; g.fillRect(8, 20, 112, 88);
    g.fillStyle = '#fff'; g.fillRect(14, 26, 100, 76);
  },
  [CELL.WIN_ARCH]: (g, em, lit) => {
    if (!em) { g.fillStyle = '#fff'; g.fillRect(0, 0, S, S); }
    const x = 36, y = 24, w = 56, h = 78;
    if (em) { if (lit) { g.fillStyle = '#ffcf70'; g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + 24); g.arc(x + w / 2, y + 24, w / 2, Math.PI, 0); g.lineTo(x + w, y + h); g.fill(); } return; }
    g.fillStyle = '#8c8c8c'; g.beginPath(); g.moveTo(x - 4, y + h + 4); g.lineTo(x - 4, y + 24); g.arc(x + w / 2, y + 24, w / 2 + 4, Math.PI, 0); g.lineTo(x + w + 4, y + h + 4); g.fill();
    const gr = g.createLinearGradient(x, y, x + w, y + h);
    gr.addColorStop(0, lit ? '#ffe7a8' : '#8fb0cc'); gr.addColorStop(1, lit ? '#f3b95a' : '#2b3a4d');
    g.fillStyle = gr; g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + 24); g.arc(x + w / 2, y + 24, w / 2, Math.PI, 0); g.lineTo(x + w, y + h); g.fill();
    g.fillStyle = '#f0f0f0'; g.fillRect(x + w / 2 - 1.5, y, 3, h); g.fillRect(x, y + 44, w, 3);
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x - 6, y + h + 3, w + 12, 5);
  },
  [CELL.GREEN]: (g, em, lit, r) => {
    g.fillStyle = '#9ccc7a'; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 520; i++) {
      const v = r();
      g.fillStyle = v < 0.33 ? '#5a9a45' : v < 0.66 ? '#7cb85d' : '#3f7d36';
      g.beginPath(); g.arc(r() * S, r() * S, 3 + r() * 5, 0, 7); g.fill();
    }
  },
  [CELL.OBRA]: (g, em, lit, r) => {
    // estructura de concreto + muro de ladrillo/bloque sin pañetar
    if (!em) {
      g.fillStyle = '#c9c9c4'; g.fillRect(0, 0, S, S);
      brickFill(g, r, 14, 12, 100, 100, 0.95);
      g.fillStyle = '#d7d7d2'; g.fillRect(0, 0, 14, S); g.fillRect(114, 0, 14, S); g.fillRect(0, 0, S, 12); g.fillRect(0, 112, S, 16);
      speckle(g, r, 140, 0.12);
    }
    pane(g, em, lit, 44, 42, 38, 42, { noFrame: true, glass: ['#55606c', '#262d36'] });
    if (!em) { g.fillStyle = '#222'; g.fillRect(41, 39, 44, 3); }
  },
  [CELL.PANEL]: (g, em, lit, r) => {
    g.fillStyle = '#f3f3f3'; g.fillRect(0, 0, S, S);
    g.fillStyle = 'rgba(0,0,0,0.16)'; g.fillRect(0, 0, S, 2.5); g.fillRect(0, 0, 2.5, S); g.fillRect(S / 2 - 1, 0, 2, S);
    speckle(g, r, 90, 0.07);
  },
  [CELL.GLASS_ROOF]: (g) => {
    g.fillStyle = '#e8f2f0'; g.fillRect(0, 0, S, S);
    g.fillStyle = 'rgba(120,150,140,0.5)';
    for (let x = 0; x < S; x += 32) g.fillRect(x, 0, 2.5, S);
    for (let y = 0; y < S; y += 64) g.fillRect(0, y, S, 2.5);
    g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(6, 0, 10, S);
  },
  [CELL.WOOD]: (g, em, lit, r) => {
    g.fillStyle = '#e2e2e2'; g.fillRect(0, 0, S, S);
    for (let x = 0; x < S; x += 10) {
      const v = 205 + Math.floor(r() * 40);
      g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, 0, 8, S);
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x + 8, 0, 2, S);
    }
    speckle(g, r, 80, 0.08);
  },
};

export function makeAtlas() {
  const make = (em) => {
    const c = document.createElement('canvas');
    c.width = c.height = S * COLS;
    const g = c.getContext('2d');
    g.fillStyle = em ? '#000' : '#fff';
    g.fillRect(0, 0, c.width, c.height);
    for (let id = 0; id < 64; id++) {
      const base = id % 32, lit = id >= 32;
      const fn = DRAW[base];
      if (!fn) continue;
      if (em && !lit) continue;
      g.save();
      g.translate((id % COLS) * S, Math.floor(id / COLS) * S);
      g.beginPath(); g.rect(0, 0, S, S); g.clip();
      fn(g, em, lit && em, mk(1000 + base));
      g.restore();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    return t;
  };
  return { map: make(false), emissive: make(true) };
}
