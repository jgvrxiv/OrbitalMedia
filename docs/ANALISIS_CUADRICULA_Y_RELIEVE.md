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
- **Pendiente máxima por densidad**: alta ≤ 0,45; media ≤ 0,55; baja ≤ 0,75 (la vivienda de baja
  densidad tolera un poco más). Hay una capa de información **Pendiente** para verlo.
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
