# OrbitalMedia

Para los Proyectos de Orbital en Claude Code.

## 🇨🇴 Ciudad Tricolor — city builder 3D colombiano

City builder en 3D (Three.js, sin build step) con temática colombiana. Escala: 1 casilla = 12 m; el mapa tiene 128 × 128 casillas (≈ 1,5 km).

**Jugar:** sirve la carpeta con cualquier servidor estático y abre `index.html`:

```bash
python3 -m http.server 8000
```

Luego visita http://localhost:8000. El botón **🏙️ Ejemplo** genera una ciudad completa sobre un valle andino.

### Cómo funciona

- **Zonas por uso y densidad** (como en otros city builders): residencial (verde), comercial (azul) e
  industrial (amarillo), cada una en densidad **baja, media o alta** (teclas 1-9).
- **El estrato (1-6) no se elige**: sale del **valor del suelo** de cada lote, que depende de los servicios
  cercanos, el tipo de vía, el comercio cercano y la contaminación. Un barrio nuevo puede nacer en estrato
  1 o en estrato 5 según las condiciones, y los edificios suben o bajan de estrato con el tiempo.
- **Tipología independiente del estrato**: una casa, un edificio, un conjunto residencial o una torre
  existen en varios estratos; el estrato define acabados (ladrillo a la vista y zinc, rejas, pintura,
  balcones, vidrio, piscinas…).
- **10 perfiles de vía definidos en metros** (andenes, carriles, separadores, ciclorrutas): camino
  destapado, peatonal, calle de 2 carriles, calle de un sentido, calle de 3 carriles, avenida de 4 carriles
  con separador, avenida de 6 carriles, bulevar con ciclorruta, troncal de buses y autopista. Cada vía
  reserva casillas enteras de 12 m; la sobra se dibuja como zona verde. El perfil transversal siempre es
  horizontal: en ladera el terreno se nivela bajo la vía y sólo sube a lo largo de ella. Las vías de
  12 m pueden trazarse en **diagonal a 45°** (arrastrando cerca de esa inclinación)
  (sin acceso a lotes). La vía define qué densidad puede crecer al frente y cuánta pendiente admite.
- **Industria**: talleres, cultivos de flores, ladrilleras, bodegas, fábricas textiles, agroindustria,
  plantas y centros logísticos. Produce bienes para el comercio (si faltan se importan, si sobran se
  exportan), da empleo y contamina (baja el valor del suelo alrededor).
- **Demanda R/C/I** agregada (empleo, bienes, felicidad). No hay simulación individual de personas: los
  carros y buses son sólo animación.
- **12 servicios públicos** con radio de cobertura: CAI, bomberos, colegio, universidad, centro de salud,
  hospital, parque, cancha, estadio, plaza con catedral, biblioteca parque y plaza de mercado.
- **Transporte público**: paraderos de bus, estaciones de troncal, Metrocable con torres que se adaptan
  al terreno (si el cable choca con la montaña pide una estación intermedia).
- **Relieve** tipo valle andino o llano: las vías siguen el terreno, los lotes en ladera se apoyan en
  plataformas con muro de contención y las laderas empinadas sólo admiten baja densidad.
- **Ciclo día/noche** con ventanas iluminadas, avisos y faroles.
- **Capas de información**: valor del suelo (estrato), servicios, contaminación y pendiente.

### Controles

Clic derecho + arrastrar = girar · rueda = zoom · WASD/flechas o arrastrar con *Inspeccionar* = mover ·
Q/E = girar · Espacio = pausa · N = día/noche · G = cuadrícula · 1-9 = zonas · Esc = cancelar ·
Enter = terminar línea.

### Estructura

| Archivo | Contenido |
|---|---|
| `js/atlas.js` | Texturas procedurales de fachada (ventanas, rejas, ladrillo, teja, vidrio) y mapa emisivo nocturno. |
| `js/geom.js` | `Builder`: geometría procedural con un solo material por modelo. |
| `js/kit.js` | Piezas reutilizables (tanques, rejas, balcones, toldos, ropa tendida, carros…). |
| `js/models_res.js`, `models_com.js`, `models_ind.js` | Tipologías residenciales, comerciales e industriales. |
| `js/buildings.js` | Servicios públicos y modelos de transporte. |
| `js/roads.js` | Tipos de vía y malla de vías sobre el relieve. |
| `js/roadnet.js` | Red vial como grafo (segmentos ortogonales y diagonales, nodos) proyectada sobre la cuadrícula. |
| `js/netpath.js` | Rutas de bus y caminatas de carros sobre el grafo. |
| `js/scene.js` | Escena, relieve, cielo día/noche, cámara y selección. |
| `js/game.js` | Estado, construcción y simulación (valor del suelo, demanda, economía). |
| `js/transit.js` | Paradas, líneas, vehículos y tráfico ambiente. |
| `js/ui.js`, `js/main.js`, `js/demo.js` | Interfaz, arranque y ciudad de ejemplo. |
| `dev/gallery.html` | Galería de desarrollo de modelos (`?set=res1|res2|res3|com|ind|pub`, `&night=1`). |
| `docs/ANALISIS_CUADRICULA_Y_RELIEVE.md` | Análisis de salir de la cuadrícula y del relieve. |
