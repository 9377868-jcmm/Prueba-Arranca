# Integración tecnológica con bancos

## Alcance
Automatizar el flujo de pagos y conciliación bancaria del proceso de cobranza.

## Dependencias
- `6. Instrumentación de SAAPP` y `7. Instrumentación de Odoo`.
- `13. Marcha de cobranza` (el proceso de cobranza debe estar definido antes de automatizarlo).

## Pendientes
- [x] Elegir banco(s)/pasarela de pago a integrar. → Confirmado en arranca_gantt.xlsx (actividad 3.3.1 "Domiciliación de pagos"): **R4 (API)**, **Multibanco**, **Cobro Móvil**.
- [ ] Definir método de conciliación (API bancaria, archivo de conciliación, webhook de pagos) con estos tres rieles específicamente.
- [ ] Definir el contrato de datos banco ↔ SAAPP/Odoo.
- [ ] Seguridad y manejo de credenciales/API keys.

## Estado
En curso — actividad 3.3.1 del Gantt real ya identifica los proveedores (R4, Multibanco, Cobro Móvil); falta especificar la integración técnica. Auditado 14-ago-2026 contra arranca_gantt.xlsx (Google Drive).
