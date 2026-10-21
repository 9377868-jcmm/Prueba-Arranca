# Motos a cuotas en Caracas

Monitor de planes de arrendamiento y financiamiento de motos en Caracas: compara ofertas por modelo, ordena por costo total / cuota / inicial, sigue cambios de precio e incluye a Arranca y a los nuevos actores del mercado.

- Sitio estático en `public/` (sin framework; d3 incluido), servido con Cloudflare Workers Static Assets.
- Datos en `data/` (un archivo por corte quincenal en `data/cortes/`). `scripts/build.mjs` genera `dist/`.
- Comandos: `npm run validate`, `npm test`, `npm run build`, `npm run dev`, `npm run deploy`.
- Actualización quincenal: ver `docs/ACTUALIZACION.md`.
- Despliegue: integración Git de Cloudflare Workers Builds (Worker `prueba-arranca`). Cada push a `main` se construye y publica solo.
  - Build command: `npm ci && npm run validate && npm test && npm run build`
  - Deploy command: `npx wrangler deploy`
  - Production branch: `main`
