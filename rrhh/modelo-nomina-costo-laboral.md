# Modelo de Nómina y Costo Laboral — resumen de contexto

Fuente: `Modelo_Nomina_Costo_Laboral_ARRANCA.xlsx` (Google Drive, no modificado). Auditado el 15-ago-2026.
Reporte completo: [Auditoría del Modelo de Nómina Arranca](https://claude.ai/code/artifact/1d1f2e07-6a1f-41d0-8632-22b040ea3691).
Detalle de los 23 cargos: subpágina "Plantilla completa — Modelo de Nómina" en Organigrama y Cargos (Notion).

## Resumen de costo (Año 1)

| Métrica | Valor |
|---|---|
| Costo laboral devengado (año 1) | $333,971 |
| Desembolso de caja real (año 1) | $327,029 |
| Plantilla M1 → M12 | 21 → 45 personas |
| Factor sobre salario base | 1.66x (M1) → 2.78x (M12) |

## Parámetros clave (hoja "Parámetros")

- Comisión de ventas (fórmulas reales): 2.5% nivel Operativo, 1.5% nivel Táctico.
- Bono por cobranza (fórmulas reales): 0.5% nivel Operativo, 0.3% nivel Táctico.
- Incentivo trimestral: 10% Operativo, 12% Táctico, 13% Estratégico, 15% Gerencial (sobre salario base del trimestre).
- Aportes no salariales: $107.17/trabajador/mes (cestaticket, HCM, guardería, uniformes, útiles escolares, becas, funerario).
- IVSS 9% (riesgo mínimo), PIE 2%, FAOV 2% (sobre salario integral, sin tope), INCES 2% (trimestral, no 0.67% mensual).

## Discrepancia sin resolver — no aplicar sin confirmar

La hoja "Notas y Criterios" del archivo documenta comisión de ventas al **5%/3%** y bono de cobranza al **1%/0.5%** — el doble de lo que usan las fórmulas reales (2.5%/1.5% y 0.5%/0.3%). Diferencia estimada: ~$81,000/año. **No usar ninguna de las dos tasas en comunicación con el equipo hasta que el usuario confirme cuál es la correcta.**

## Otras preguntas abiertas (no resueltas)

- 3 cargos con salario base $0 (Analista OA, Monitoreo, Mercadeo) — confirmar si es por diseño o dato faltante.
- 5 cargos estratégicos por debajo de la banda salarial N3 ($600–1,200): Legal, Administración, Programador, Contador, Recursos Humanos.
- Riesgo de reclasificación laboral en las dos gerencias contratadas a honorarios ($3,000 c/u, sin incidencias).
- Bono de cobranza sin techo: el pool se multiplica ×10 entre M1 y M12 sin que la plantilla crezca proporcionalmente.
- 9 supuestos marcados "A VALIDAR" en la hoja Parámetros (cuota promedio por contrato, plazo promedio, eficiencia de cobranza 92%, tasa activa BCV Art. 143, HCM, guardería, seguro funerario, entre otros).

## Uso previsto

El skill `rrhh-arranca` debe consultar este archivo antes de redactar descripciones de cargo, guiones de entrevista o anuncios de vacante para cualquiera de los 23 cargos de la plantilla, para mantener consistencia de nivel, régimen y banda salarial.
