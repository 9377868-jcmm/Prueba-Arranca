---
name: integracion-arranca
description: Documenta y da seguimiento a los requerimientos técnicos de instrumentación de Kommo CRM, SAAPP, Odoo, bancos y el proveedor de motos/servicios de Arranca. Úsalo cuando el usuario pida avanzar, revisar o documentar cualquiera de esas integraciones, o definir contratos de datos entre sistemas.
---

# Integración Técnica Arranca

Mantiene las specs técnicas de las actividades 5-10 del Plan Maestro (Track Tecnología/Sistemas).

## Dónde vive cada cosa

- `/integraciones/kommo/README.md`
- `/integraciones/saapp/README.md`
- `/integraciones/odoo/README.md`
- `/integraciones/bancos/README.md`
- `/integraciones/proveedor/README.md`
- `/flujos/flujo-comercial-v0.md` — fuente de verdad del flujo de negocio; toda spec de integración debe ser consistente con este flujo (o señalar explícitamente dónde se desvía y por qué).

Cada README tiene: Alcance, Dependencias, Pendientes (checklist) y Estado. También están espejados como página/actividad en el Plan Maestro de Notion (`collection://82912ad3-d4ed-461a-88b8-678db9ba1503`).

## Qué hacer

1. Antes de documentar una integración, relee `/flujos/flujo-comercial-v0.md` para no contradecir el flujo aprobado.
2. Al avanzar un pendiente de un README, márcalo como hecho (`- [x]`) y añade el detalle técnico correspondiente (contrato de datos, campos, endpoints, decisiones tomadas).
3. Si defines un contrato de datos entre dos sistemas (ej. Kommo → SAAPP), documenta: qué campos viajan, en qué momento del flujo, y quién es dueño del dato.
4. Actualiza el Estado y, si corresponde, la Fecha objetivo de la actividad relacionada en el Plan Maestro de Notion.
5. Decisiones técnicas relevantes (ej. "usamos Kommo webhooks en vez de API polling") van también a la **Bitácora de Decisiones** (`3bcfc7d06360819cb729e5fea20750ec`).
6. Haz commit de los cambios en el repo con un mensaje descriptivo.

## No hacer

- No marques una integración como Entregada en Notion sin que el usuario confirme que está en producción/probada.
