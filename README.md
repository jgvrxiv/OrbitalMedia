# OrbitalMedia

Para los Proyectos de Orbital en Claude Code.

## 🇨🇴 Ciudad Tricolor — city builder 3D colombiano

Juego de construcción de ciudades en 3D (Three.js, sin build step) con temática colombiana.

**Jugar:** sirve la carpeta con cualquier servidor estático y abre `index.html`:

```bash
python3 -m http.server 8000
```

Luego visita http://localhost:8000.

### Qué incluye
- **6 estratos** de vivienda, del tugurio/invasión (estrato 1) a mansiones y rascacielos (estrato 6), cada uno con 3 niveles de crecimiento, más **comercio**.
- **Constructor de vías** (arrastrar para trazar calles, tráfico con taxis amarillos).
- **12 edificios públicos**: CAI, bomberos, colegio, universidad, centro de salud, hospital, parque con palmas de cera, cancha, estadio, plaza con iglesia, biblioteca parque y plaza de mercado.
- **Transporte público**: paraderos de bus y estaciones de **Metrocable**; crea líneas haciendo clic en las paradas en orden, añade/quita vehículos y cobra pasajes.
- Los estratos altos exigen más servicios cercanos; el estrato 1 recibe subsidio y los estratos 5–6 aportan más impuestos.
- Guardado/carga local y botón de **ciudad de ejemplo**.

### Controles
Clic derecho + arrastrar = girar · rueda = zoom · WASD/flechas o arrastrar con *Inspeccionar* = mover · Q/E = girar · Espacio = pausa · G = cuadrícula · Esc = cancelar · Enter = terminar línea.
