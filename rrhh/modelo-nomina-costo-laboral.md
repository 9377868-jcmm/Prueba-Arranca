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

## Decisiones aplicadas (15-ago-2026) — ya no son preguntas abiertas

- **Tasas de comisión/bono:** confirmadas en 2.5%/1.5% (comisión) y 0.5%/0.3% (bono de cobranza). Se corrigió el texto de "Notas y Criterios" que documentaba el doble (5%/3% y 1%/0.5%) — ya no hay discrepancia.
- **Techo al bono de cobranza:** nuevo parámetro (Parámetros!B60) — el pool mensual no puede superar 1× el total de salarios base de los elegibles de ese nivel ese mes.
- **Honorarios profesionales (sin beneficios/comisión):** solo Recursos Humanos y Contador. Las tres gerencias pasan a régimen Laboral.
- **Salarios base:** cargos gerenciales → $500/mes (Laboral). Todos los demás cargos (17 restantes) → $150/mes interino (Laboral, con todos los beneficios de ley) — resuelve los 3 cargos que tenían salario base $0 (Analista OA, Monitoreo, Mercadeo).
- **Filosofía de compensación (instrucción del usuario):** sueldo base modesto por diseño — comisión y bono de cobranza cargan el peso real de la compensación para atraer talento competitivo.

Versión revisada del archivo: `Modelo_Nomina_Costo_Laboral_ARRANCA (revisado 15-ago-2026).xlsx` en Google Drive (el original no se modificó). Detalle completo: subpágina "Decisiones aplicadas 15-ago — Nueva estructura de nómina" en Organigrama y Cargos (Notion).

**Pendiente:** LibreOffice no pudo recalcular el archivo completo en este entorno (colgado repetido incluso con el archivo original sin editar). Google Sheets recalcula automáticamente al abrir el archivo — confirmar ahí las cifras finales exactas de costo total devengado.

## Otras preguntas abiertas (no resueltas)

- 5 cargos por debajo de lo que sería una banda salarial diferenciada por rol — quedaron unificados en $150 "interino", a ajustar más adelante según el usuario indicó.
- 9 supuestos marcados "A VALIDAR" en la hoja Parámetros (cuota promedio por contrato, plazo promedio, eficiencia de cobranza 92%, tasa activa BCV Art. 143, HCM, guardería, seguro funerario, entre otros) — sin resolver todavía.

## Uso previsto

El skill `rrhh-arranca` debe consultar este archivo antes de redactar descripciones de cargo, guiones de entrevista o anuncios de vacante para cualquiera de los 23 cargos de la plantilla, para mantener consistencia de nivel, régimen y banda salarial.
