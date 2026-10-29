# Brújula Colombia

Sitio estático (HTML + JS, sin dependencias) con dos tests:

1. **Test ideológico**: 30 preguntas sobre 8 ejes colombianos (economía, paz y seguridad, territorio, ambiente y minería, drogas, valores sociales, instituciones y relaciones exteriores). Muestra tu posición en cada eje y las ideologías más cercanas.
2. **Test de candidatos**: preguntas concretas de la elección activa y tu porcentaje de coincidencia con cada candidato, pregunta por pregunta y con su fuente.

## Correr en local

```bash
cd brujula-colombia
python3 -m http.server 8000   # abre http://localhost:8000
```

Usa `fetch`, así que no funciona abriendo `index.html` directamente: necesita un servidor. Para desplegar en Vercel o Netlify basta con publicar esta carpeta tal cual.

## Actualizar para una nueva elección

1. Copia `data/elecciones/ejemplo-2026.json` como, por ejemplo, `data/elecciones/presidencial-2030.json`.
2. Llena:
   - `preguntas`: entre 10 y 20 temas que estén en debate esa elección. Cada una lleva un `id` único.
   - `candidatos`: en `respuestas`, para cada `id` de pregunta, un valor de `-2` (muy en desacuerdo) a `2` (muy de acuerdo). Si no hay una posición pública verificable, omite la pregunta y no contará para ese candidato.
   - `fuentes`: un enlace por respuesta (programa, entrevista, debate o votación). **Toda respuesta publicada debería tener una fuente.**
   - `aviso`: déjalo vacío (`""`) cuando los datos sean reales y estén verificados.
3. En `data/elecciones/index.json`, agrega la elección a la lista y cambia `activa` a su `id`.

Las elecciones anteriores se quedan en la carpeta como archivo histórico.

## Ajustar el test ideológico

Todo está en `data/ideologia.json`:
- `preguntas[].dir`: `1` si estar de acuerdo empuja hacia el polo izquierdo del eje (`izq`) y `-1` si empuja hacia el derecho (`der`).
- `ideologias[].v`: la posición de cada arquetipo en cada eje, de `-100` (polo `izq`) a `100` (polo `der`).

## Buenas prácticas de neutralidad

- Los datos de ejemplo son **ficticios**. No publiques el sitio con candidatos reales hasta tener cada posición verificada.
- Pide que una segunda persona revise la redacción de las preguntas para evitar sesgos.
- Ofrece a las campañas la opción de validar o corregir sus respuestas, y registra quién lo hizo.
