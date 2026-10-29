const $ = (s) => document.querySelector(s);
const out = $('#out');
const COLOR = (n) => (n >= 80 ? 'var(--pass)' : n >= 55 ? 'var(--warn)' : 'var(--fail)');
const ORDER = { fail: 0, warn: 1, info: 2, pass: 3 };
const LABEL = { fail: 'Problema', warn: 'Mejorable', info: 'Info', pass: 'Bien' };

// Todo el texto de sitios ajenos entra por textContent, nunca como HTML.
function el(tag, props = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) k === 'class' ? (n.className = v) : n.setAttribute(k, v);
  for (const k of kids) n.append(k);
  return n;
}

function render(r) {
  out.replaceChildren();
  const head = el('div', { class: 'card' },
    el('div', { class: 'head' },
      Object.assign(el('div', { class: 'big' }, String(r.score.total)), {}),
      el('div', {}, el('h2', {}, r.url), el('div', { class: 'e sub' }, r.pageTitle || ''),
        el('div', { class: 'sub' }, 'Auditado: ' + new Date(r.auditedAt).toLocaleString('es-CO')))));
  head.querySelector('.big').style.setProperty('--c', COLOR(r.score.total));
  const cats = el('div', { class: 'cats' });
  for (const c of r.score.categories) {
    const b = el('b', {}, String(c.score));
    b.style.color = COLOR(c.score);
    cats.append(el('div', { class: 'cat' }, b, c.name));
  }
  head.append(cats);
  for (const n of r.notes) head.append(el('div', { class: 'note' }, n));
  out.append(head);

  if (r.ai) {
    const box = el('div', { class: 'card ai-box' }, el('h3', { style: 'margin-top:0' }, 'Resumen y prioridades ', el('span', { class: 'tag' }, 'opinión IA')), el('p', {}, r.ai.resumen));
    const ol = el('ol');
    for (const p of r.ai.prioridades) ol.append(el('li', {}, el('b', {}, p.accion), ' — ' + p.motivo));
    if (r.ai.prioridades.length) box.append(ol);
    out.append(box);
  }

  const names = Object.fromEntries(r.score.categories.map((c) => [c.id, c.name]));
  const groups = {};
  for (const f of r.findings) (groups[f.category] ||= []).push(f);
  const card = el('div', { class: 'card' });
  for (const [cat, list] of Object.entries(groups)) {
    card.append(el('h3', {}, names[cat] || cat));
    list.sort((a, b) => ORDER[a.status] - ORDER[b.status]);
    for (const f of list) {
      const body = el('div', {}, el('div', { class: 't' }, f.title, el('span', { class: 'tag' }, LABEL[f.status] + ' · medido')));
      if (f.evidence) body.append(el('div', { class: 'e' }, f.evidence));
      if (f.fix && f.status !== 'pass') body.append(el('div', { class: 'x' }, '→ ' + f.fix));
      card.append(el('div', { class: 'f ' + f.status }, el('div', { class: 'dot' }), body));
    }
  }
  out.append(card);
  const act = el('div', { class: 'actions' }, el('button', { type: 'button' }, 'Imprimir / guardar PDF'));
  act.firstChild.onclick = () => window.print();
  out.append(act);
}

$('#f').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('#go');
  btn.disabled = true; btn.textContent = 'Analizando…';
  out.replaceChildren(el('div', { class: 'card' }, 'Analizando el sitio, puede tardar hasta un minuto…'));
  try {
    const res = await fetch('/api/audit', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: $('#url').value, ai: $('#ai').checked }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error desconocido');
    render(data);
  } catch (err) {
    out.replaceChildren(el('div', { class: 'card err' }, err.message));
  } finally {
    btn.disabled = false; btn.textContent = 'Auditar';
  }
});
