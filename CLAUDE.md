# Ciudad Tricolor — guía de trabajo (para Claude Code local)

City builder 3D colombiano. Three.js r170 vendorizado, ES modules, **sin build step**. Rama de trabajo: `claude/happy-lamport-yxwbnv`.
Ver también `README.md` (descripción) y `docs/ANALISIS_CUADRICULA_Y_RELIEVE.md`.

## Reglas de trabajo
- Responder al usuario en **español**.
- No crear PRs salvo que se pidan. Commits terminan con `Co-Authored-By: Claude <noreply@anthropic.com>`.
- Antes de subir: `node dev/regression.js` (22 verificaciones, ~2-4 min; necesita Playwright). No hacer commit con checks en rojo.
- Servir: `python3 -m http.server 8123` y abrir `index.html` (botón **Ejemplo** genera la ciudad demo).
- Galería de modelos: `dev/gallery.html?set=res1|res2|res3|com|ind|pub|ref|row|big|icon`.
- Validar sintaxis de un módulo: `node --input-type=module --check < js/archivo.js`.

## Reglas de diseño (decididas por el usuario)
- 1 casilla = 12 m; mapa 128×128. Colombia realista.
- Estrato (1–6) **derivado del valor del suelo**, nunca elegido. Zonas: residencial / comercial / oficinas / industrial × densidad baja/media/alta.
- Vías: perfil transversal horizontal en ladera; pendiente limita solo vías; cuadrícula solo donde las vías dan frente a lotes. Diagonales a 45°.
- Lotes generados por geometría de las vías, nunca superpuestos; **el frente de cada edificio mira a la vía más cercana** (también diagonales, girado al ángulo real). Casas solo sobre la calle; filas traseras solo las usan lotes más profundos.
- **Lote mínimo 1×2 en todo** (excepto vías diagonales, que quedan en 1×1). Media densidad ≥1×2, alta ≥2×2 (hasta 3×4), industria ≥2×3. Estratos 5–6: casas 2×3. Mansiones solo estrato 6. Estrato 1: filas con 2 (a veces 3) frentes de 5–7 m.
- Hacienda colonial: guardada en código para un futuro "edificio especial"; no va en la ciudad.
- Ciudad demo: manzanas ≥4×7 casillas (48×84 m); oriente (clase alta) ~8×16 casillas.
- Colores sobrios; techos detallados por estrato (lámina/zinc e1, corrugada/terraza e2, teja de barro e3, paños cruzados e4–5, teja rota/pizarra e6).

## Arquitectura
- `js/game.js` — estado `G`, crecimiento, lotes: `footprintOptions`, `findLot`, `spawnSized`, `tryBig`, `tryDeep`, `tryIcon`, `ensureIcons`.
- `js/parcels.js` — lotes por segmento de vía (`ORTHO_DEPTH=4`, `DIAG_DEPTH=3`, solape SAT con cuadrados orientados). `G.depth/face/access/parcels`.
- `js/roadnet.js`, `roads.js`, `netpath.js` — grafo vial, perfiles `ROADS`, caminatas de carros ambiente.
- `js/transit.js` — paraderos, líneas, vehículos y carros ambiente (solo animación, caminata aleatoria).
- `js/geom.js` — `Builder` (colores por vértice, UVs al atlas, ventanas emisivas de noche) y capa de escala (`sx/sz`).
- `js/models*.js` — modelos procedurales: `models_res`, `_com`, `_off`, `_ind`, `_row`, `_deep`, `_big`, `_ref`, `_icon`. `models.js` indexa y escala (`native: [w,d]`, `lot: [w,d]`, `scaleOf`, `lotOf`).
- `js/kit.js` (paletas `PAL`, `roofCover`), `js/atlas.js` (texturas), `js/demo.js` (ciudad de ejemplo), `js/ui.js`, `js/scene.js`, `js/render.js`.
- Modelos de edificio: una función `fn(B)` en coordenadas de casilla (`m2u(m)` convierte metros), fachada principal a +Z. Se dibujan con `InstancedMesh`.

## Rascacielos emblemáticos (`js/models_icon.js`)
Únicos (solo uno de cada uno), solo en oficinas de alta densidad. `ensureIcons()` los coloca en la demo, los lotes grandes primero.
- `coltejer` (Medellín) — lote 3×3, el usuario lo aprobó.
- `torreNaranja` — torre de vidrio con exoesqueleto naranja; sin identificar por nombre.
- `bdBacata` — según planos del usuario: torre alta de 7 módulos que retroceden **solo por el frente**, espina blanca al fondo, torre baja ~150 m con pilón de concreto, núcleo + 2 puentes. Huella real medida 50×70 m → lote `[6,4]` (modelo dibujado en `[4,3]` y estirado). Demo: manzana de oficinas en el oriente (x47–59, y32–37) reservada para él.

## Pendientes
- **Lógica de carros** (propuesta): carros por población/estrato y garajes, viajes origen→destino por hora, congestión por capacidad de vía, parqueo en frente de lote (e4–6) o calle (e1–3), parte de viajes pasa a bus. Hoy son solo animación.
- Corregir edificios emblemáticos con las observaciones del usuario (torre naranja, corona del Bacatá).
- Lotes en vías diagonales siguen 1×1. Casas e1→e2 mejoradas conservan su tamaño.
- Recalibrar economía; población y empleos solo al terminar la obra.
- Parques/canchas en interiores de manzanas grandes: decisión urbanística del usuario, no de desarrollo.
- Edificio especial para la hacienda colonial.
