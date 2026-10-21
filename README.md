# Motos a cuotas en Caracas

Monitor de planes de arrendamiento y financiamiento de motos en Caracas: compara ofertas por modelo, ordena por costo total / cuota / inicial, sigue cambios de precio e incluye a Arranca y a los nuevos actores del mercado.

- Sitio estático en `public/` (sin framework; d3 incluido), servido con Cloudflare Workers Static Assets.
- Datos en `data/` (un archivo por corte quincenal en `data/cortes/`). `scripts/build.mjs` genera `dist/`.
- Comandos: `npm run validate`, `npm test`, `npm run build`, `npm run dev`, `npm run deploy`.
- Actualización quincenal: ver `docs/ACTUALIZACION.md`.
- Despliegue: `deploy.yml` en cada push a `main`; requiere los secretos `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID`.
