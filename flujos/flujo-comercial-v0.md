# Flujo Comercial v0

Primera versión del flujo de negocio de Arranca, insumo para instrumentar Kommo CRM y SAAPP. Es un borrador de trabajo — se revisa y ajusta con el negocio antes de darlo por definitivo.

```mermaid
flowchart TD
    A[Lead entra: web / WhatsApp / redes] --> B[Kommo CRM: registro del lead]
    B --> C[Calificación y contacto inicial]
    C --> D[Visita / negociación]
    D -->|No cierra| Z[Lead perdido / seguimiento futuro]
    D -->|Cierra| E[SAAPP: creación de orden de arrendamiento]
    E --> F[Verificación de inventario disponible]
    F --> G[Firma de contrato y condiciones de pago]
    G --> H[SAAPP: registro de pago inicial]
    H --> I[Entrega de la moto: checklist de entrega]
    I --> J[SAAPP: seguimiento de pagos periódicos]
    J --> K{¿Pago al día?}
    K -->|Sí| J
    K -->|No| L[Proceso de cobranza]
    L --> J
    J --> M[Fin de contrato: devolución / cierre]
    M --> N[SAAPP: cierre de orden]
    N --> O[Odoo: contabilización de ingresos y cierre]
```

## Puntos de traspaso entre sistemas
- **Kommo → SAAPP**: al cerrar la negociación (paso D→E), se crea la orden con los datos del cliente y la moto elegida.
- **SAAPP → Odoo**: cada pago registrado y cada cierre de contrato se contabiliza (paso H, N→O).
- **SAAPP ↔ Proveedor**: verificación de inventario disponible (paso F) y solicitudes de servicio/mantenimiento durante la vigencia del contrato.
- **SAAPP → Cobranza → Bancos**: el proceso de cobranza (paso L) es la base para la integración bancaria futura.

## Pendiente de validar con el negocio
- [ ] Confirmar canales reales de entrada de leads.
- [ ] Confirmar si existe una etapa de aprobación/verificación de crédito antes de la firma.
- [ ] Confirmar el detalle del checklist de entrega y de devolución.
- [ ] Confirmar reglas de mora y escalamiento de cobranza.
