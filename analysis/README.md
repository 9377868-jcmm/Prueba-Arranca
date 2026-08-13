# Análisis: modelo de moto vs. morosidad

Pipeline usado para reconstruir un backup de PostgreSQL (formato *directorio*,
`pg_dump -Fd`) cuando la versión de catálogo del dump es más nueva que la que
soporta el `pg_restore` disponible, y para correlacionar el modelo de moto
arrendado con la morosidad del contrato.

**Esta carpeta no contiene datos crudos ni PII.** El dump original (nombres,
cédulas, teléfonos, correos, montos por cliente) se procesó de forma local y
nunca se subió a este repositorio. Solo se versionan el código del pipeline y
las salidas ya agregadas/anonimizadas en `data/`.

## Por qué hizo falta un parser manual

El dump traía versión de catálogo `1.16` (Postgres 18), mientras que el
`pg_restore` disponible en el entorno era 16.x y solo soporta hasta `1.15`
(`pg_restore: error: unsupported version (1.16) in file header`). En formato
directorio, cada tabla se guarda como un archivo `NNNN.dat.gz` con el `COPY`
en texto plano; lo único en formato binario propietario es `toc.dat`, que
mapea `tabla → columnas → archivo`. Como pg_dump escribe esa metadata como
strings C planos dentro del binario, `strings toc.dat` la recupera sin
necesidad de parsear el formato binario completo.

## Pipeline

1. **`scripts/01_parse_toc.py`** — Toma la salida de `strings -n4 toc.dat` y
   extrae, por cada tabla, su nombre, columnas (del `COPY ... FROM stdin;`) y
   el archivo `NNNN.dat` asociado. Produce `tables_map.json`.
2. **`scripts/02_generate_schema.py`** — A partir de `tables_map.json` genera:
   - `create_tables.sql`: crea un esquema `raw` con una tabla por cada tabla
     original, todas las columnas como `TEXT` (evita adivinar tipos/longitudes
     exactos del DDL truncado por `strings`; los casts se hacen en el paso de
     análisis, donde sí importan).
   - `copy_all.sql`: una sentencia `\copy` por tabla apuntando a su
     `NNNN.dat` ya descomprimido.
3. **`sql/03_build_lease_features.sql`** — Sobre el esquema `raw` ya cargado,
   construye `analysis.lease_features`: una fila por lease con el modelo de
   moto normalizado, atributos del contrato, y features de morosidad
   agregadas desde `status_records_statusrecord` (historial completo de
   cambios de estatus de cobranza), no desde `fees_fees.paid` — ese campo
   resultó no usarse en producción (siempre `false`/`NULL`).
4. **`scripts/04_stats.py`** — Corre las pruebas estadísticas (χ² +
   V de Cramér para variables categóricas, correlación punto-biserial para
   continuas) y exporta los agregados versionados en `data/`.

## Cómo correrlo con un backup nuevo

```bash
# 0. Postgres local disponible (ej. `service postgresql start`) y un dump
#    extraído en $DUMP_DIR (contiene toc.dat + NNNN.dat.gz)
gunzip -k "$DUMP_DIR"/*.dat.gz

# 1. Mapear tablas/columnas/archivos
strings -n 4 "$DUMP_DIR/toc.dat" > toc_strings.txt
python3 scripts/01_parse_toc.py toc_strings.txt tables_map.json

# 2. Generar y aplicar el esquema
python3 scripts/02_generate_schema.py tables_map.json create_tables.sql copy_all.sql "$DUMP_DIR"
psql -d TARGET_DB -f create_tables.sql
psql -d TARGET_DB -f copy_all.sql

# 3. Construir las features de morosidad
psql -d TARGET_DB -f sql/03_build_lease_features.sql

# 4. Estadística + exportar agregados
DATABASE_URL=postgresql:///TARGET_DB python3 scripts/04_stats.py
```

## Resultados

- **`data/model_summary.csv`** — morosidad por modelo de moto (n≥15).
- **`data/branch_summary.csv`** — morosidad por sucursal.
- **`data/payment_summary.csv`** — morosidad por plan de pago.
- **`data/year_summary.csv`** — morosidad por cosecha/año de originación.
- **`data/stats_summary.csv`** — todas las pruebas de asociación corridas
  (factor, estadístico, p-valor, significancia).
- **`reports/morosidad_modelo_moto.html`** — reporte visual (abrir en
  cualquier navegador; sin dependencias externas).

Ver el reporte HTML para la lectura completa de hallazgos y las salvedades
(correlación ≠ causalidad, el "efecto modelo" está en buena parte confundido
con el score del cliente, etc).
