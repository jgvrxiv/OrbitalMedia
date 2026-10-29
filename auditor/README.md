# Auditor web · Orbital Media

Diagnóstico rápido de un sitio: SEO, técnico, velocidad, redes, medición, conversión y seguridad.

## Uso

```bash
cd auditor
npm install
npm start            # http://localhost:3000
npm test
```

Variables opcionales:

| Variable | Para qué |
|---|---|
| `ANTHROPIC_API_KEY` | Activa el resumen y las prioridades con IA |
| `PAGESPEED_API_KEY` | Evita el límite (429) de la API gratuita de PageSpeed |
| `AUDIT_MODEL` | Modelo del resumen (por defecto `claude-sonnet-5-5`) |
| `PORT` | Puerto del servidor |

## Qué es medido y qué es opinión

- **Medido** (confiable, repetible): HTTPS, título, meta descripción, H1, alt, canonical, viewport, Open Graph,
  robots.txt, sitemap, enlaces internos rotos (muestra de 12), píxel de Meta, GA4/Tag Manager, vías de contacto,
  cabeceras de seguridad, tiempo de respuesta y puntaje Lighthouse móvil.
- **Opinión IA** (opcional): resume y prioriza únicamente los hallazgos medidos. Solo puede citar ids de hallazgos
  existentes; las referencias inventadas se descartan.

## Límites conocidos

- Sitios que se construyen con JavaScript: se avisa, pero SEO/contenido pueden salir incompletos.
- El píxel de Meta cargado vía Tag Manager no es visible en el HTML y se marca como "no detectado".
- No estima tráfico, ranking ni keywords (requeriría Search Console, Ahrefs o Semrush).
- Los enlaces rotos son una muestra, no un rastreo completo.
- Protección SSRF: bloquea IPs privadas, valida cada redirección. `ALLOW_PRIVATE=1` solo para pruebas locales.
- Límite de 6 auditorías por IP cada 10 minutos (en memoria).
