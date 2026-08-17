# Instrumentación de SAAPP

Sistema operativo propio de Arranca: inventario, relación de pagos de clientes, órdenes, pagos, entregas y cierres.

## Alcance
- Inventario de motos (alta, estado, ubicación/tienda, asignación).
- Órdenes de arrendamiento (creación desde CRM, condiciones, plazos).
- Registro y control de pagos de clientes.
- Entregas (checklist de entrega, estado del vehículo).
- Cierres (devolución, liquidación, cierre de contrato).

## Dependencias
- `4. Diagramación de flujos de trabajo` debe estar aprobado.
- Recibe datos desde Kommo CRM (ver `/integraciones/kommo/`).
- Entrega datos a Odoo (contabilidad) y a la integración bancaria.

## Pendientes
- [ ] Confirmar modelo de datos actual de SAAPP (entidades: moto, cliente, orden, pago, entrega, cierre).
- [ ] Definir el contrato de datos Kommo → SAAPP (qué campos llegan al crear una orden).
- [ ] Definir el contrato de datos SAAPP → Odoo (qué se contabiliza y cuándo).
- [ ] Definir el contrato de datos SAAPP → proveedor de motos (ver `/integraciones/proveedor/`).
- [ ] Reglas de cobranza dentro de SAAPP (ver marcha de cobranza, actividad 13 del Plan Maestro).

## Estado
Atrasado. Según arranca_gantt.xlsx (auditado 14-ago-2026, no modificado), SAAPP es el "Módulo de ventas" de la actividad 3.1.1 — programado 20-jul→01-ago, a cargo del equipo IT/Ventas/Cobranza/Contabilidad, y sigue sin cerrar. Es el ítem más atrasado del Gantt real.
