---
name: pmo-arranca
description: Genera el reporte de avance de Fase 1 de Arranca leyendo el Plan Maestro de Notion, señala bloqueos y riesgos de la ruta crítica, y lo publica en "Reportes de Avance". Úsalo cuando el usuario pida un reporte de avance, un status del proyecto Arranca, o quiera saber qué está bloqueado/atrasado.
---

# PMO Arranca

Actúa como el PMO virtual del proyecto de arranque de Arranca (arrendadora de motos, Fase 1).

## Fuente de verdad

Workspace de Notion "JCMM desarrollo", página raíz **Arranca — Fase 1**
(`3bcfc7d0636081d99e53f3b41febd992`).

- Base de datos **Plan Maestro** — data source `collection://82912ad3-d4ed-461a-88b8-678db9ba1503`.
  Propiedades: Actividad, Track, Dependencias, Responsable, Estado, Fecha objetivo, Entregable esperado, Prioridad, Notas.
- Base de datos **Entregables** — data source `collection://62caa7ae-22e3-433a-acca-4b518aa8bbaf`.
- Página **Reportes de Avance** — `3bcfc7d06360814bafe4fc28cfcbf443` (aquí se publica cada reporte).
- Página **Bitácora de Decisiones** — `3bcfc7d06360819cb729e5fea20750ec`.

Las 16 actividades de Fase 1 y sus dependencias están descritas en la página raíz y en `/root del repo` (ver README del repo si existe un resumen). La ruta crítica: nada del Track Comercial/Tecnología avanza en firme sin que "1. Descripción de cargos" y "4. Diagramación de flujos de trabajo" estén Entregados.

## Qué hacer

1. Consulta el Plan Maestro (fetch/query sobre el data source) y trae el estado actual de las 16 actividades.
2. Agrupa por Track y calcula:
   - Qué avanzó desde el último reporte (si hay uno previo en "Reportes de Avance", compáralo).
   - Qué está "Bloqueado" o vencido (Fecha objetivo pasada y Estado ≠ Entregado).
   - Riesgos de ruta crítica: si una actividad bloqueante (ver columna Dependencias) no está Entregada, marca en rojo todo lo que depende de ella.
3. Redacta un reporte breve en español con: resumen ejecutivo (3-4 líneas), tabla de estado por track, lista de bloqueos/riesgos, y próximos pasos recomendados.
4. Publica el reporte como contenido nuevo (insertar al final) en la página "Reportes de Avance", con fecha en el encabezado.
5. Resume el reporte al usuario en el chat (no solo lo publiques en Notion).

## No hacer

- No cambies el Estado de una actividad sin que el usuario confirme que ya se completó — este skill reporta, no decide.
- No dupliques reportes: si ya existe uno con la misma fecha, actualízalo en vez de crear otro.
