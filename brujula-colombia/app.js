// Brújula Colombia: test ideológico + test de candidatos.
// Todo el contenido vive en data/. Para una nueva elección solo hay que
// agregar un JSON en data/elecciones/ y apuntar "activa" en index.json.

const OPCIONES = [
  { v: 2, t: "Muy de acuerdo" },
  { v: 1, t: "De acuerdo" },
  { v: 0, t: "Neutral" },
  { v: -1, t: "En desacuerdo" },
  { v: -2, t: "Muy en desacuerdo" },
];
const NO_SE = { v: null, t: "No sé / prefiero no responder" };

const $ = (id) => document.getElementById(id);
const estado = { ideologia: null, eleccion: null, modo: null, i: 0, resp: [] };

async function cargar() {
  const [ideo, idx] = await Promise.all([
    fetch("data/ideologia.json").then((r) => r.json()),
    fetch("data/elecciones/index.json").then((r) => r.json()),
  ]);
  estado.ideologia = ideo;
  const meta = idx.elecciones.find((e) => e.id === idx.activa);
  estado.eleccion = await fetch("data/elecciones/" + meta.archivo).then((r) => r.json());
  const e = estado.eleccion;
  $("eleccion-resumen").textContent =
    `${e.cargo} · ${e.preguntas.length} preguntas · ${e.candidatos.length} candidatos`;
}

function mostrar(vista) {
  for (const s of document.querySelectorAll(".vista")) s.hidden = s.id !== vista;
  window.scrollTo(0, 0);
}

function preguntasActuales() {
  return estado.modo === "ideologia" ? estado.ideologia.preguntas : estado.eleccion.preguntas;
}

function iniciar(modo) {
  estado.modo = modo;
  estado.i = 0;
  estado.resp = [];
  mostrar("test");
  pintarPregunta();
}

function pintarPregunta() {
  const ps = preguntasActuales();
  const p = ps[estado.i];
  $("barra").style.width = (estado.i / ps.length) * 100 + "%";
  $("contador").textContent = `Pregunta ${estado.i + 1} de ${ps.length}`;
  $("tema").textContent =
    estado.modo === "ideologia"
      ? estado.ideologia.ejes.find((e) => e.id === p.eje).nombre
      : p.tema;
  $("pregunta").textContent = p.texto;
  const ops = estado.modo === "elecciones" ? [...OPCIONES, NO_SE] : OPCIONES;
  const cont = $("opciones");
  cont.innerHTML = "";
  for (const o of ops) {
    const b = document.createElement("button");
    b.textContent = o.t;
    if (estado.resp[estado.i] === o.v && estado.i < estado.resp.length) b.classList.add("elegida");
    b.onclick = () => responder(o.v);
    cont.appendChild(b);
  }
  $("atras").style.visibility = estado.i === 0 ? "hidden" : "visible";
}

function responder(v) {
  estado.resp[estado.i] = v;
  estado.i++;
  if (estado.i >= preguntasActuales().length) {
    estado.modo === "ideologia" ? resultadoIdeologia() : resultadoEleccion();
  } else {
    pintarPregunta();
  }
}

// ---------- Test ideológico ----------

// Devuelve por eje un valor de -100 (polo izquierdo) a +100 (polo derecho).
function puntajesEjes(preguntas, resp) {
  const acc = {};
  preguntas.forEach((p, i) => {
    acc[p.eje] ??= { s: 0, n: 0 };
    acc[p.eje].s += resp[i] * p.dir;
    acc[p.eje].n += 1;
  });
  const out = {};
  for (const [eje, { s, n }] of Object.entries(acc)) out[eje] = Math.round((-100 * s) / (2 * n));
  return out;
}

function ideologiasCercanas(puntos, ideologias) {
  const ejes = Object.keys(puntos);
  const max = 200 * Math.sqrt(ejes.length);
  return ideologias
    .map((ideo) => {
      const d = Math.sqrt(ejes.reduce((s, e) => s + (puntos[e] - (ideo.v[e] ?? 0)) ** 2, 0));
      return { ...ideo, afinidad: Math.round(100 * (1 - d / max)) };
    })
    .sort((a, b) => b.afinidad - a.afinidad);
}

function htmlEje(eje, valor) {
  const pct = (valor + 100) / 2;
  const izq = 100 - Math.round(pct);
  return `<div class="eje">
    <div class="eje-nombre">${eje.nombre}</div>
    <div class="eje-top"><span>${eje.izq} ${izq}%</span><span>${100 - izq}% ${eje.der}</span></div>
    <div class="pista"><div class="marca" style="left:${pct}%;background:${eje.color}"></div></div>
  </div>`;
}

function resultadoIdeologia() {
  const { preguntas, ejes, ideologias } = estado.ideologia;
  const puntos = puntajesEjes(preguntas, estado.resp);
  const top = ideologiasCercanas(puntos, ideologias);
  const [primera, ...resto] = top;
  $("resultado").innerHTML = `
    <p class="tema">Tu resultado</p>
    <h1>${primera.nombre}</h1>
    <p class="lead">${primera.desc}</p>
    <div class="caja">${ejes.map((e) => htmlEje(e, puntos[e.id])).join("")}</div>
    <div class="caja">
      <h3>También te pareces a</h3>
      ${resto.slice(0, 3).map((r) => `<p><strong>${r.nombre}</strong> · ${r.afinidad}% de afinidad<br><small>${r.desc}</small></p>`).join("")}
    </div>
    <div class="acciones">
      <button class="btn" data-ir="elecciones">Ahora compárate con los candidatos →</button>
      <button class="sec" data-compartir="${encodeURIComponent(`Mi resultado en Brújula Colombia: ${primera.nombre} (${primera.afinidad}%).`)}">Copiar resultado</button>
      <button class="sec" data-ir="inicio">Volver al inicio</button>
    </div>`;
  mostrar("resultado");
}

// ---------- Test de candidatos ----------

// Afinidad = 100% si responden igual, 0% si están en extremos opuestos.
// Las preguntas que el usuario salta ("No sé") o que el candidato no
// ha respondido no cuentan.
function afinidadCandidato(preguntas, resp, cand) {
  let dif = 0, n = 0;
  preguntas.forEach((p, i) => {
    const c = cand.respuestas[p.id];
    if (resp[i] == null || c == null) return;
    dif += Math.abs(resp[i] - c);
    n++;
  });
  return n ? Math.round(100 * (1 - dif / (4 * n))) : 0;
}

const etiqueta = (v) => (v == null ? "—" : OPCIONES.find((o) => o.v === v).t);

function resultadoEleccion() {
  const e = estado.eleccion;
  const ranking = e.candidatos
    .map((c) => ({ ...c, afinidad: afinidadCandidato(e.preguntas, estado.resp, c) }))
    .sort((a, b) => b.afinidad - a.afinidad);
  const respondidas = estado.resp.filter((v) => v != null).length;

  const tabla = (c) => `<details><summary>Ver pregunta por pregunta</summary><table>
    <tr><th>Tema</th><th>Tú</th><th>${c.nombre}</th></tr>
    ${e.preguntas.map((p, i) => {
      const f = c.fuentes?.[p.id];
      const cv = etiqueta(c.respuestas[p.id]);
      return `<tr><td>${p.tema}</td><td>${etiqueta(estado.resp[i])}</td><td>${f ? `<a href="${f}" target="_blank" rel="noopener">${cv}</a>` : cv}</td></tr>`;
    }).join("")}
  </table></details>`;

  $("resultado").innerHTML = `
    ${e.aviso ? `<p class="aviso">${e.aviso}</p>` : ""}
    <p class="tema">${e.cargo} · ${e.nombre}</p>
    <h1>Coincides más con ${ranking[0].nombre}</h1>
    <p class="nota">Basado en ${respondidas} de ${e.preguntas.length} preguntas respondidas. Datos actualizados el ${e.actualizado}.</p>
    <div class="caja">
      ${ranking.map((c) => `<div class="cand">
        <div><strong>${c.nombre}</strong><br><small>${c.partido}</small></div>
        <div class="pct">${c.afinidad}%</div>
        <div class="barra"><div style="width:${c.afinidad}%;background:${c.color}"></div></div>
        <div style="grid-column:1/-1">${tabla(c)}</div>
      </div>`).join("")}
    </div>
    <p class="nota">Esto mide coincidencia de posiciones, no es una recomendación de voto. Revisa los programas completos.</p>
    <div class="acciones">
      <button class="btn" data-ir="ideologia">Hacer el test ideológico</button>
      <button class="sec" data-compartir="${encodeURIComponent(`Coincido ${ranking[0].afinidad}% con ${ranking[0].nombre} en Brújula Colombia.`)}">Copiar resultado</button>
      <button class="sec" data-ir="inicio">Volver al inicio</button>
    </div>`;
  mostrar("resultado");
}

// ---------- Eventos ----------

document.addEventListener("click", async (ev) => {
  const ir = ev.target.closest("[data-ir]");
  if (ir) {
    const d = ir.dataset.ir;
    d === "inicio" ? mostrar("inicio") : iniciar(d);
    return;
  }
  const comp = ev.target.closest("[data-compartir]");
  if (comp) {
    const texto = decodeURIComponent(comp.dataset.compartir) + " " + location.href.split("#")[0];
    try {
      if (navigator.share) await navigator.share({ text: texto });
      else { await navigator.clipboard.writeText(texto); comp.textContent = "¡Copiado!"; }
    } catch {}
  }
});
$("atras").onclick = () => { if (estado.i > 0) { estado.i--; pintarPregunta(); } };

cargar().catch(() => { $("eleccion-resumen").textContent = "No se pudo cargar la elección."; });
