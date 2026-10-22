# Actualización quincenal (días 1 y 16)

Procedimiento para la rutina programada. Todo se hace por PR; el CI valida y el merge despliega.

1. **Recolectar precios** de cada empresa de `data/empresas.json` (web oficial, simulador de Chekia, Instagram, prensa). Una fila por plan, con el mismo esquema de `data/cortes/*.json`. Si un dato no se pudo confirmar, usar `confianza: "Baja"` y explicar en `nota`.
2. **Descubrir nuevos actores.** Buscar en web, Instagram y prensa empresas de arrendamiento o financiamiento de motos en Caracas que no estén en `empresas.json`.
   - Con precios publicados: agregar la ficha a `data/empresas.json` con `"estado": "nuevo"` y `"alta": "AAAA-MM-DD"`, y sus planes al corte.
   - Sin precios: agregar a `data/candidatos.json` (`nombre`, `detectado`, `nota`, `fuente`, `url`).
   - Listarlos en el cuerpo del PR bajo "Nuevos actores".
3. **Arranca.** Si Arranca ya tiene planes publicados, incluirlos con `"empresa": "Arranca"` (la ficha ya existe con `propia: true`; pasar su `estado` a `"activo"` y completar los campos). Nunca inventar cifras.
4. **Tasas BCV.** Agregar la entrada del corte en `data/tasas.json` con `usd_ves` y `eur_ves` del BCV y la `fuente`; la tasa €→US$ se calcula sola (euro ÷ dólar). Con ella entran al ranking los planes con la cuota (o la inicial) en €.
   **Monedas.** En cada fila registrar `moneda_inicial` y `moneda_cuota` (`USD` o `EUR`); suelen ser distintas (inicial en US$, cuota en €). `data/monedas.json` solo guarda el valor por defecto de cada empresa para datos que no lo traigan.
5. Escribir `data/cortes/AAAA-MM-DD.json` (fecha del corte).
   - Revisar `data/manual/`: los datos cargados a mano vencen a los 30 días o cuando el corte real trae el mismo plan; retirar los que ya no hagan falta y avisar de los que sigan vigentes.
   - Las marcas nuevas o con otro nombre se unifican en `data/marcas.json` (variante -> marca canónica; `null` = sin marca).
6. Ejecutar `npm run validate` y `npm test`. Revisar las advertencias (variaciones mayores a 40 %, empresas que desaparecen) y explicarlas en el PR.
7. Abrir el PR contra `main` con el resumen de cambios. Sin advertencias sin explicar: merge. El merge a `main` dispara la construcción y el despliegue en Cloudflare Workers Builds.

`frescura.yml` avisa por correo si pasan más de 17 días sin un corte nuevo.
