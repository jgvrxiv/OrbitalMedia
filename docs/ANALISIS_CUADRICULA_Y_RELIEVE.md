# Análisis: salir de la cuadrícula X/Y y relieve

Este documento revisa qué tan complejo es pasar de la cuadrícula ortogonal actual a vías libres
(diagonales y curvas) y cómo se resolvió el relieve en Ciudad Tricolor.

## 1. Estado actual (cuadrícula)

Todo el juego descansa sobre una malla de 64 × 64 casillas:

| Sistema | Depende de la cuadrícula porque… |
|---|---|
| Vías (`js/roads.js`) | Cada casilla guarda `{tipo, eje, carril central}`. Ancho = nº de casillas. Cruces = casilla con `eje = 2`. |
| Zonas y lotes (`js/game.js`) | Un lote = una casilla; el frente se busca en las 4 vecinas. |
| Edificios | Modelos de 1×1 (privados) o N×N (públicos) girados en múltiplos de 90°. |
| Valor del suelo, servicios, contaminación | Mapas `Float32Array(N*N)` por casilla. |
| Rutas de bus y tráfico | Dijkstra/caminata sobre casillas vecinas (4 direcciones). |
| Selección | Rayo → casilla. |

La cuadrícula es lo que permite que la simulación sea barata y sin agentes.

## 2. ¿Qué tan complejo es salir del eje X/Y?

Hay tres niveles posibles. El esfuerzo está estimado para una persona que conoce el código.

### Nivel A: diagonales a 45° sobre la misma cuadrícula (dificultad media, ~3-5 días)

- Las vías diagonales ocupan casillas en "escalera"; se dibujan como cintas continuas a 45° en vez de
  cuadrados.
- Los lotes junto a una diagonal quedan triangulares; la forma práctica es dejar sólo casillas completas
  y rellenar los triángulos con andén o zona verde.
- La simulación casi no cambia: conectividad en 8 direcciones y costo √2 en Dijkstra.
- Lo difícil: intersecciones diagonal–ortogonal (geometría de cruces) y la orientación de los edificios
  (girarlos 45° deja esquinas fuera del lote).

### Nivel B: vías libres (curvas Bézier) con lotes generados a lo largo de la vía (difícil, ~3-6 semanas)

Es el modelo de *Cities: Skylines*:

1. **Grafo de vías**: nodos (cruces) y segmentos (curvas con ancho y tipo), en lugar de casillas.
2. **Malla de vía procedural**: extruir el perfil (calzada, andenes, separador) a lo largo de la curva y
   generar intersecciones recortando segmentos y rellenando el polígono del cruce. Es la parte que más
   tiempo consume.
3. **Lotes a lo largo de la vía**: cada segmento genera celdas de zonificación rectangulares a cada lado
   (p. ej. 1 casilla de frente × 1-4 de fondo), orientadas con la tangente. Hay que resolver solapes
   entre celdas de segmentos cercanos y en curvas cerradas.
4. **Simulación**: los mapas de servicios y contaminación pueden seguir siendo una rejilla de muestreo
   (no hay que tocarlos); el acceso, el frente y las rutas pasan a usar el grafo.
5. **Selección y edición**: ajustar a nodos existentes, cortar segmentos al cruzar, ángulos mínimos.

### Nivel C: híbrido recomendado

Mantener la rejilla para todo lo que es simulación (valor del suelo, servicios, demanda) y usar un grafo
sólo para vías y lotes. Es el camino de menor riesgo hacia curvas:

1. Primero, diagonales a 45° (Nivel A) para validar intersecciones y lotes no ortogonales.
2. Después, segmentos curvos que **rasterizan** su huella sobre la rejilla para la simulación, mientras
   la malla visual y los lotes siguen la curva.

**Conclusión:** salir de la cuadrícula es viable, pero es el cambio más caro del proyecto. La
recomendación es hacer el Nivel A cuando el juego ya esté maduro y dejar las curvas libres para una fase
posterior.

## 2b. Fase 1 implementada: red vial como grafo

`js/roadnet.js` guarda las vías como **segmentos** (tramos rectos con tipo, eje, línea central, rango y
carriles) unidos por **nodos** (puntas, cruces, uniones en "T" y cambios de tipo). Las casillas son una
proyección del grafo (`rasterize`), así que todo lo demás (valor del suelo, acceso de lotes, malla de
vías, buses y carros) sigue leyendo casillas y se ve igual que antes.

- Construir agrega un segmento: si se superpone con otro sobre la misma línea, gana el tipo de mayor
  rango y el de menor rango conserva la casilla del borde para quedar conectado.
- Demoler corta los segmentos en la casilla demolida.
- `normalize` une tramos idénticos contiguos y parte cada segmento en sus nodos.
- Las partidas guardan el grafo (formato v3); las partidas v2, que guardaban casillas, se convierten al
  cargar.

## 2c. Fase 2 implementada: diagonales a 45° y recorridos sobre el grafo

- Un segmento puede ser **diagonal** (`ax = 3`, con `dy = ±1`). Se proyecta sobre la cuadrícula como una
  **escalera**: la casilla central de cada paso más una casilla de unión, para que lotes, acceso y valor del
  suelo sigan funcionando en 4 direcciones. La vía se dibuja como una **cinta continua a 45°** con su
  perfil; los triángulos sobrantes de la escalera quedan como zona verde.
- Se detectan cruces diagonal–fila, diagonal–columna y diagonal–diagonal (cuando comparten casilla).
- Todas las vías pueden ir en diagonal. Una vía de w casillas ocupa una **banda de ⌈w·√2⌉ líneas
  diagonales** (calle 2, avenida 3, troncal y bulevar 5), y la cinta se dibuja centrada en la banda con
  su perfil completo. En ladera, todas las casillas de la banda a la misma altura a lo largo quedan
  niveladas, así que el perfil transversal sigue siendo horizontal.
- Los edificios cuyo frente da a una diagonal se **giran 45°** para mirar la vía y su modelo se reduce
  al 74 % para caber en el lote.
- **Rutas de bus** (`js/netpath.js`): Dijkstra entre nodos del grafo, con costo según largo (√2 por paso
  diagonal) y velocidad del tipo de vía. La ida y la vuelta se calculan por separado para respetar los
  sentidos únicos. Cada bus va por el carril que le corresponde según el perfil (exterior, o el carril
  exclusivo en la troncal).
- **Carros ambiente**: recorren segmentos en vez de casillas, eligen al azar en cada nodo y respetan los
  sentidos únicos.
- Pendiente: cruces con forma propia (hoy el cruce es pavimento en las casillas compartidas).

## 2d. Fase 3 iniciada: lotes generados por la vía

`js/parcels.js` genera, para cada segmento diagonal, filas de lotes de 12 m de frente a cada lado de la
vía (hasta 2 de fondo), alineados con ella. Cada lote se asocia a la casilla que contiene su centro; los
solapes se resuelven dando prioridad al lote más cercano a la vía y a la vía de mayor rango. Los edificios
se ubican en el centro del lote, girados para mirar la vía y a tamaño completo, y la capa de zonas dibuja
los lotes girados. Las casillas sobrantes junto a la escalera de la diagonal quedan sin acceso (zona verde).

Ahora **todos** los lotes, rectos y diagonales, salen de los segmentos y compiten con una sola prioridad
(fondo menor primero, luego la vía de mayor rango). Así una calle recta que cruza la franja de una diagonal
toma sus lotes de frente y no quedan lotes rectos y girados encima unos de otros.

### Cruces con diagonales

En cada nodo donde llega una diagonal se dibuja un **polígono de cruce**: la envolvente convexa de los
bordes de todos los brazos (andén y calzada por separado), las cintas diagonales se recortan donde empieza y
cada brazo diagonal lleva su cebra. Propuestas siguientes para los empalmes complejos:

1. **Radios de giro**: redondear las esquinas del polígono con arcos (un radio por tipo de vía) en vez de
   unir los bordes con rectas.
2. **Cruces en estrella de 5-6 brazos**: convertirlos en **glorieta** automática cuando el ángulo entre dos
   brazos sea menor de 45°, o pedir al jugador que la construya (herramienta de glorieta).
3. **Ángulo mínimo**: impedir trazar una vía que forme menos de 30° con otra en el mismo nodo, como en
   Cities: Skylines; sugerir desplazar el empalme.
4. **Nodos cercanos**: unir cruces que queden a menos de una casilla en un solo nodo para evitar dos
   polígonos casi superpuestos.
5. **Semáforos y prioridades**: marcar visualmente las vías de mayor rango como preferenciales (sin cebra
   sobre ellas, con línea de pare en las secundarias).

### Glorietas

Un nodo de 3 o más vías puede convertirse en glorieta (`net.rounds`, se guarda). El cruce se dibuja como un
anillo de calzada con isla central arborizada; cada brazo se corta donde su andén toca el círculo y lleva
cebra. El radio crece con el ancho de las vías que llegan. Todo se asienta sobre el mismo plano ajustado al
terreno que usan los demás cruces.

### Guardado

El formato lleva número de versión (`SAVE_VERSION`, hoy 4). Las partidas v2 (casillas) se convierten al
grafo; una partida de versión futura se rechaza con aviso, y los edificios cuyo modelo ya no existe se omiten
(la zona vuelve a crecer).

Siguiente paso de la fase 3: segmentos curvos con el mismo generador de lotes.

## 3. Relieve: qué se implementó

Se implementó **relieve real sin terraformación**:

- **Mapa de alturas** en las esquinas de las casillas (`(N+1)²` valores), generado con ruido fractal. Hay
  dos terrenos: *Valle andino* (fondo plano con laderas al oriente y occidente, como el Valle de Aburrá) y
  *Llano*.
- **Vías** que siguen el terreno: la malla de vías se reconstruye muestreando la altura en cada esquina,
  así que andenes, separadores y cebras se inclinan con la ladera. Cada tipo de vía tiene una
  **pendiente máxima** (la autopista y la troncal no suben laderas fuertes; el camino destapado sí).
- **Edificios sobre plataformas**: cada lote se apoya en la esquina más alta y debajo aparece un muro de
  contención hasta la esquina más baja. Así una ladera construida se ve escalonada, como los barrios de
  ladera en Medellín, sin modificar el terreno.
- **Pendiente**: sólo limita las vías: calles hasta 20 %, avenidas 10-12 %, troncal 8 %, autopista 6 %;
  por encima de 20 % y hasta 40 % sólo caben calles peatonales (escaleras). Los edificios se construyen
  en cualquier pendiente sobre su plataforma.
- **Metrocable con relieve**: el cable va recto entre estaciones; si el tramo atraviesa la montaña se
  rechaza y se pide una estación intermedia. Las torres miden lo necesario según el terreno.
- **Vehículos, árboles y cámara** usan la altura bilineal del terreno; la selección con el ratón se hace
  marchando el rayo contra el mapa de alturas.

### Pendiente por hacer en relieve

| Mejora | Complejidad | Nota |
|---|---|---|
| Herramienta de terraformación (subir, bajar, aplanar) | Media | Ya existe la reconstrucción del terreno y de las vías; faltaría actualizar plataformas de edificios afectados. |
| Ríos y quebradas con puentes | Media-alta | Necesita agua, puentes y vías que crucen sin seguir el terreno. |
| Túneles y viaductos | Alta | Rompe la regla "una vía por casilla a nivel del suelo". |
| Vistas que suben el valor del suelo en lomas | Baja | Una línea en `recomputeLandValue()`. |

## 4. Rendimiento

- Cada combinación de modelo (tipología × estrato × variante) se construye una vez y se dibuja con
  `InstancedMesh`: una llamada de dibujo por modelo distinto, sin importar cuántos edificios lo usen.
- La simulación es agregada (demanda R/C/I, empleo, bienes, valor del suelo); **no hay agentes
  individuales**. Los carros y buses son sólo animación.
