# Planeador de líneas de transporte (fase 1)

App 100 % estática: mapa real de OpenStreetMap (Leaflet) y sin servidor, base de datos ni API keys.

## Uso
Abre `index.html` con doble clic. Es un solo archivo con todo incluido (necesita internet para Leaflet y el mapa).

## Desarrollo
`index.html` se **genera**; no lo edites a mano. Edita `index.src.html`, `lib.js` o `app.js` y corre:
```bash
node build.js
```

## Qué hace
- Varias líneas (bus, tranvía, metro) con color y nombre; clic en el mapa añade paradas a la línea activa.
- Arrastrar paradas, doble clic para renombrarlas.
- Estima longitud, tiempo de viaje, vehículos necesarios según la frecuencia y costo aproximado.
- Guarda en el navegador, exporta/importa JSON y comparte el plan en un enlace.

## Límites (fase 1)
- La longitud es en línea recta entre paradas: es un mínimo. La fase 2 ajustará a las calles (OSRM/Valhalla).
- Velocidades y costos son supuestos genéricos editables en `lib.js` (`MODES`), no cifras de ingeniería.
- Las teselas públicas de OSM sirven para prototipos y poco tráfico; para producción usa un proveedor con plan.

## Pruebas
```bash
node --test test/*.test.js
```

## Publicar gratis
Sube `index.html` (solo ese archivo) a GitHub Pages, Netlify o Cloudflare Pages.
