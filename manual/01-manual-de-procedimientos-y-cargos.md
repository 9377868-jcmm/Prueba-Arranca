# Manual de Procedimientos y Descripción de Cargos — Arranca

**Versión:** 0.1 — Borrador de unificación
**Estado:** Documento de trabajo. Consolida tres fuentes previas (PDF de Monitoreo/GPS, XLSX de Descripción de Cargos y DOCX de guiones comerciales/protocolos) que fueron elaboradas sin un acuerdo común de formato. Ver `00-diagnostico-y-hallazgos.md` para el detalle de las incongruencias resueltas y los vacíos que siguen pendientes de definición por Arranca.
**Clasificación:** Uso interno

> Convención usada en este documento: todo dato que ninguna de las tres fuentes originales aportó se marca como `[PENDIENTE — no definido en las fuentes originales]`. No se completan cifras, plazos legales ni reglas de negocio por suposición.

---

## 1. Cómo usar este documento

Este manual reemplaza y unifica las tres fuentes originales bajo dos ejes:

- **Fichas de cargo** (sección 4): una por cada puesto identificado en cualquiera de las tres fuentes, con estructura común (Datos generales, Misión, Responsabilidades y funciones, Competencias).
- **Procedimientos por proceso** (sección 3): los tramos del negocio que cruzan varios cargos a la vez (p. ej. la asignación de una unidad involucra a Comercial, al Configurador de GPS y al Mecánico Instalador). Documentarlos por proceso, y no solo por cargo, es lo que permite ver el flujo completo de la motocicleta.

---

## 2. Mapa general del flujo de vida de la motocicleta

| Etapa | Cargos involucrados | Fuente | Estado |
|---|---|---|---|
| 1. Compra/alta del activo | `[PENDIENTE]` | Ninguna | **Vacío total** — ver diagnóstico §3.9 |
| 2. Preparación técnica (GPS) | Mecánico Instalador de GPS, Configurador de GPS y Líder de Área, Analista de Inventario y Almacén | PDF | Documentado |
| 3. Comercialización y documentación | Operador Comercial de Arrendamiento | DOCX | Documentado |
| 4. Evaluación y aprobación de crédito | `[PENDIENTE — cargo no identificado]` | DOCX (mención sin cargo) | Parcial |
| 5. Asignación y entrega de la unidad | Operador Comercial, Configurador de GPS y Líder de Área, Mecánico Instalador | DOCX + PDF | Documentado |
| 6. Vida del arrendamiento (pagos, mantenimiento, monitoreo, atención) | Analista de Monitoreo, Operador de Cobranza, Operador de Atención al Cliente | PDF + DOCX | Documentado |
| 7. Incidentes (mora, robo, siniestro) | Operador de Cobranza, Operador Legal, Analista de Monitoreo | DOCX + PDF | Documentado, con huecos operativos (ver §3.5) |
| 8. Traspaso / venta final | Operador Legal (parcial) | DOCX (3 menciones tangenciales) | **Vacío crítico** — ver §3.6 |

---

## 3. Procedimientos transversales por proceso

### 3.1 Preparación técnica de la unidad (instalación y configuración GPS)

*Fuente: PDF "Manual de Flujos y Procesos — Monitoreo y GPS".*

1. **Configuración técnica (Configurador de GPS):** recibe los dispositivos GPS nuevos desde Logística, configura APN, servidor, intervalos de reporte, y realiza pruebas de banco antes del montaje.
2. **Alta en plataforma (Configurador de GPS):** asocia cada IMEI a la placa/matrícula y a los datos del cliente en el sistema de rastreo.
3. **Recepción de orden (Mecánico Instalador):** recibe la orden de trabajo o asignación de moto junto con el dispositivo GPS provisto por logística.
4. **Inspección inicial (Mecánico Instalador):** revisión visual y eléctrica básica de la motocicleta antes de intervenir.
5. **Instalación física (Mecánico Instalador):** instala y oculta estratégicamente el GPS y sus conexiones (corriente, tierra y, opcionalmente, corte de motor).
6. **Prueba de funcionamiento (Mecánico Instalador + Analista de Monitoreo):** se verifica en conjunto que el equipo transmita señal, ubicación exacta y telemetría en tiempo real.
7. **Cierre de orden (Mecánico Instalador):** entrega la unidad física y reporta la culminación al líder de área y a Logística, para el descargo de inventario.

`[PENDIENTE — no definido en las fuentes originales]`: en qué momento del ciclo (respecto a la compra de la moto) se dispara la orden de instalación — ninguna fuente documenta la compra/alta de la moto como activo antes de este paso.

### 3.2 Comercialización, documentación y aprobación de la solicitud

*Fuente: DOCX "Manual de Operaciones y Guía de Actuación Comercial" — guion del Operador Comercial de Arrendamiento.*

1. **Contacto y diagnóstico de necesidad:** saludo, identificación del motivo de visita e indagación técnica del perfil de uso (cilindrada, potencia, autonomía requeridas).
2. **Presentación del modelo de arrendamiento:** se explica el depósito de garantía, el canon (semanal o quincenal) y los servicios incluidos (seguro, monitoreo GPS 24/7, pagos en bolívares a tasa oficial).
3. **Transparencia contractual:** se informa sobre mantenimientos preventivos, términos y condiciones, cobertura de seguro, límites del GPS y responsabilidades del cliente.
4. **Recepción de documentación y firma de solicitud:** el operador recibe cédula, RIF, licencia de 2.º grado, soporte de ingresos, referencias y, si el análisis crediticio lo exige, la documentación de un fiador solidario. Se firma la Planilla de Solicitud y se carga el expediente digital en el portal web.
5. **Evaluación centralizada:** el expediente entra en evaluación, que incluye entrevista telefónica de verificación documental y análisis socioeconómico. `[PENDIENTE — no definido en las fuentes originales]`: qué cargo ejecuta esta evaluación (el DOCX solo menciona "la supervisión" y, para el fiador, "el analista asignado", sin que exista una ficha de cargo para ninguno de los dos).
6. **Resultado:**
   - *Favorable:* la supervisión notifica por correo al cliente y al operador; arranca el protocolo de asignación (§3.3).
   - *Desfavorable:* se devuelve el 100% del depósito de garantía por el mismo medio de pago, con planilla firmada de conformidad.
   - *Retracto del cliente* (tras aprobación, el cliente decide no continuar): se retiene el 10% del pago inicial por gastos administrativos y operativos.

### 3.3 Asignación y entrega técnica de la unidad

*Fuente: DOCX, cruzado con el flujo técnico del PDF (§3.1).*

1. Aprobada la solicitud, el Área de Monitoreo asigna la unidad y configura el GPS. Plazo declarado: **3 días hábiles**.
2. El Operador Comercial prepara el expediente de entrega: contrato de arrendamiento, autorización de circulación, placas, póliza de seguro y llaves.
3. En la cita presencial, el operador guía al cliente en la revisión y firma de documentos, explica los canales de atención (siniestros, robo, cobranza, soporte) y el uso de la plataforma digital de pagos.
4. Se realiza la inspección físico-funcional de la moto junto al cliente y se registra el acta de entrega formal en el sistema.
5. **Requisito de despacho:** el cliente debe cancelar el primer canon ("cuota contra entrega") antes del retiro de la unidad.

### 3.4 Vida del arrendamiento: monitoreo, cobranza y atención al cliente

- **Monitoreo continuo** (Analista de Monitoreo, PDF): vigilancia de la plataforma GPS por turnos, gestión de alertas (geocercas, batería, botón de pánico), reportes periódicos y escalamiento de fallas técnicas al Configurador/Mecánico.
- **Cobranza** (Operador de Cobranza, DOCX): validación de pagos (Pago Móvil, transferencia, domiciliado, efectivo, Zelle, Binance) a través del sistema ARRANCA; gestión preventiva de vencimientos; Política de Descuento por Pronto Pago (ejemplo declarado: canon base de $65 USD con descuento de $10 USD por pago puntual, es decir $55 USD netos — cifra de ejemplo del propio documento fuente, no un supuesto añadido).
- **Mantenimiento preventivo** (Operador Comercial / taller, DOCX): registro de visitas por kilometraje/fecha según el Cartón de Garantía físico; el mantenimiento se cobra de contado en caja del concesionario.
- **Atención al cliente postventa** (Operador de Atención al Cliente, DOCX): llamada obligatoria de seguimiento dentro de las 48 horas posteriores a la entrega; canalización de requerimientos hacia Taller, Cobranza, Legal o Traspasos; protocolo diferenciado ante hurto/extravío de documentos, placa o llave.

### 3.5 Gestión de mora y recuperación

*Fuente: DOCX, secciones de Cobranza y Legal.*

1. **Declaración de mora:** se activa al acumular 3 cánones vencidos (planes semanales) o 2 cánones vencidos (planes quincenales).
2. **Renegociación (Cobranza):** diagnóstico financiero de la causa del retraso, propuesta de nuevo plan de pago (Compromiso de Pago), y si se acuerda un nuevo monto/plazo, firma de un nuevo contrato que reemplaza al anterior. El incumplimiento del primer pago del acuerdo anula la renegociación y pasa el caso a Legal.
3. **Retención del vehículo (Legal):** el Departamento Legal recibe la notificación formal de mora de Cobranza, contacta al cliente y coordina con el Operador del Concesionario la recepción del vehículo. El cliente firma la Planilla de Entrega Voluntaria del Vehículo.
4. **Resolución:**
   - *Restitución:* si el cliente cancela la deuda total más la tarifa de reconexión ($10 USD, según cifra declarada en la fuente), se libera la unidad.
   - *Terminación:* si no hay pago ni acuerdo, se redacta la Rescisión de Contrato y la moto reingresa al inventario corporativo.

`[PENDIENTE — no definido en las fuentes originales]`: el detalle operativo de cómo se ejecuta físicamente la recuperación cuando el cliente no acude voluntariamente a la cita (rol de autoridades, plazos, custodia temporal del vehículo).

### 3.6 Traspaso / venta final — proceso incompleto

Esta es la etapa de cierre del ciclo de vida de la moto y, tal como están las fuentes hoy, **es la que menos procedimiento tiene**. Lo único que las fuentes originales dicen, textualmente, es:

- El **Operador Legal** gestiona los traspasos: *"Elaboración, revisión y tramitación oportuna de los expedientes para la firma de documentos de propiedad ante Notaría Pública, garantizando el cumplimiento de los plazos y cláusulas contractuales establecidas para la transferencia del bien."*
- El **Operador de Atención al Cliente**, en su checklist previo a cualquier llamada, debe verificar *"si el cliente... tiene pagos pendientes por trámites de traspaso"*.
- En el guion de llamada post-entrega, el operador debe *"confirmar la activación de sus seguros y del traspaso"*.

A partir de solo estas tres frases **no es posible** reconstruir un procedimiento paso a paso responsable. Antes de operar este tramo, Arranca debe definir (ver también diagnóstico §4):

- [ ] Momento en que procede el traspaso (¿fin del plan de cuotas?, ¿compra anticipada?, ¿es el mismo trámite que se "activa" ya en la entrega inicial, o un trámite homónimo distinto — p. ej. traspaso de circulación/placa —?).
- [ ] Cargo responsable de iniciar el trámite y de notificar al cliente que es elegible.
- [ ] Costo del trámite notarial, quién lo asume y cómo se cobra.
- [ ] Documentos de propiedad exigidos por la aseguradora para el traspaso (una nota suelta hallada en el DOCX original señala explícitamente que esto "no se detalla").
- [ ] Qué ocurre con el dispositivo GPS y la suscripción de monitoreo tras el traspaso (retiro, transferencia de titularidad del servicio, o facturación aparte).

**Este manual no propone respuestas a estos puntos** para evitar introducir reglas de negocio, plazos o cifras que ninguna fuente respalda. Deben completarse con la definición de Arranca y luego incorporarse a esta sección.

---

## 4. Fichas de cargo

> Estructura estándar adoptada (tomada de la plantilla XLSX de RR.HH.): Datos generales, Misión del cargo, Responsabilidades y funciones, Competencias.
> Para los cargos que en las fuentes originales solo existían como texto narrativo (Cobranza, Atención al Cliente, Legal), la ficha se reconstruyó a partir de ese texto; se indica expresamente y los campos administrativos de RR.HH. que ninguna fuente cubre quedan `[PENDIENTE]`.

### 4.1 Mecánico Instalador de GPS

| Campo | Valor |
|---|---|
| Régimen de contratación | Laboral |
| Área / Departamento | Dpto. Monitoreo |
| Supervisor inmediato | `[PENDIENTE]` |
| Tipo de contrato | Indefinido |
| Sede / Concesionario | Concesionario |
| Vacantes totales / Mes de incorporación | `[PENDIENTE]` |

**Misión:** Responsable de la ejecución física de las instalaciones, revisiones técnicas, mantenimientos preventivos y reemplazos de los dispositivos GPS en las motocicletas de la flota de arrendamiento, garantizando que el equipo quede oculto, seguro y operativo.

**Responsabilidades y funciones:**

| Responsabilidad | Función asociada |
|---|---|
| Calidad y discreción de la instalación | Recepción y verificación de dispositivos GPS, cables, relés y periféricos en almacén/logística |
| Seguridad operacional y eléctrica | Inspección técnica inicial (batería, encendido, cableado) antes de intervenir |
| Documentación y trazabilidad (IMEI, serie, placa/VIN) | Instalación e integración física del GPS (alimentación, tierra, corte de motor) |
| Verificación de operatividad antes de liberar la moto | Pruebas operativas junto al área de monitoreo (señal, telemetría, geolocalización) |

**Competencias:** Electricidad y electromecánica de motocicletas; sistemas de rastreo y telemetría; técnicas de ocultamiento y fijación; manejo de herramientas de taller e instrumental eléctrico; solución de problemas / diagnóstico de fallas.

---

### 4.2 Analista de Monitoreo

| Campo | Valor |
|---|---|
| Régimen de contratación | Laboral |
| Área / Departamento | Dpto. Monitoreo |
| Supervisor inmediato | `[PENDIENTE]` |
| Tipo de contrato | Indefinido |
| Sede / Concesionario | `[PENDIENTE]` |
| Vacantes totales / Mes de incorporación | `[PENDIENTE]` |

**Misión:** Encargado de la vigilancia activa y continua de la flota de motos arrendadas a través de la plataforma de rastreo satelital, detectando anomalías, alertas de seguridad, excesos de velocidad o desconexiones de equipos.

**Responsabilidades y funciones:**

| Responsabilidad | Función asociada |
|---|---|
| Respuesta oportuna ante emergencias | Supervisión de plataforma al inicio de turno (unidades activas / sin señal) |
| Protección del activo (seguimiento y eventual recuperación) | Gestión de alertas en tiempo real (pánico, batería, geocercas, velocidad) |
| Trazabilidad y registro para auditorías/seguros | Verificación de transmisión de unidades nuevas o recién intervenidas; activación de protocolos de seguridad ante hurto/robo/emergencia |
| Continuidad del monitoreo durante todo el turno | Escalamiento técnico a soporte/mantenimiento ante pérdida de señal o fallas de telemetría |

**Competencias:** Manejo de plataformas de rastreo y telemetría; análisis de datos e informes; conocimiento de protocolos de emergencia; atención al detalle y concentración; sentido de urgencia.

---

### 4.3 Configurador de GPS y Líder de Área

> Nota de unificación: el PDF lo define como un único rol dual; el XLSX lo registra como "Configurador de GPS – Táctico". Se mantiene el nombre completo del PDF porque describe con mayor precisión el alcance real del cargo. Ver diagnóstico §3.3 — pendiente de confirmación por Arranca si en la práctica son dos posiciones distintas.

| Campo | Valor |
|---|---|
| Régimen de contratación | Laboral |
| Área / Departamento | Dpto. Monitoreo |
| Supervisor inmediato | `[PENDIENTE]` |
| Tipo de contrato | Indefinido |
| Sede / Concesionario | `[PENDIENTE]` |
| Vacantes totales / Mes de incorporación | `[PENDIENTE]` |

**Misión:** Rol dual encargado, por un lado, de la parametrización técnica, activación y configuración en plataforma de los dispositivos GPS; y por el otro, de la supervisión, coordinación y toma de decisiones del equipo de monitoreo e instalación.

**Responsabilidades y funciones:**

| Responsabilidad | Función asociada |
|---|---|
| Coordinación interdepartamental (Logística, Gerencia General) | Parametrización y configuración de hardware GPS (APN, servidor, comandos, límites de velocidad) y pruebas de banco |
| Operatividad e integración de la flota (100% de dispositivos transmitiendo antes de entregar) | Gestión de activos en plataforma: alta de dispositivos, geocercas base, vínculo IMEI–vehículo–cliente |
| Liderazgo y desempeño del equipo (mecánico instalador y analistas) | Planificación y asignación de carga laboral (agenda de instalaciones, mantenimientos, guardias) |
| Continuidad de la conectividad (SIM, saldos, APN) | Gestión de incidencias de nivel 2 y 3 (firmware, servidor, proveedores de conectividad) |

**Competencias:** Configuración de hardware GPS y protocolos de red; administración avanzada de plataformas de telemetría; electrónica y diagnóstico de fallas; liderazgo y supervisión de personal; toma de decisiones bajo presión.

---

### 4.4 Analista de Inventario y Almacén

> Nota de unificación: corresponde funcionalmente al "Departamento de Logística" descrito en el PDF (ver diagnóstico §3.4); se preserva como cargo individual porque así lo registra el XLSX.

| Campo | Valor |
|---|---|
| Régimen de contratación | Laboral |
| Área / Departamento | Dpto. Logística |
| Supervisor inmediato | `[PENDIENTE]` |
| Tipo de contrato | Indefinido |
| Sede / Concesionario | Av. Francisco Solano López, esquina calle Pascual Navarro, Sabana Grande, Edif. Seguros la Fe, piso 3, Caracas |
| Vacantes totales / Mes de incorporación | `[PENDIENTE]` |

**Misión:** Custodia, control, conteo, entradas, salidas y auditoría de todo el inventario de la empresa, incluyendo los dispositivos GPS y accesorios.

**Responsabilidades y funciones:**

| Responsabilidad | Función asociada |
|---|---|
| Custodia y resguardo del inventario | Recepción e inspección de mercancía (GPS, SIM, relés, arneses, herramientas) |
| Precisión de la información / trazabilidad de IMEI-SIM | Control de inventario en el sistema (disponible, asignado, en reparación) |
| Disponibilidad de insumos (alertar stock mínimo) | Entrega y despacho bajo requisición u orden de trabajo firmada |
| Eficiencia en el ciclo de garantías | Administración de garantías y devoluciones a proveedores |

**Competencias:** Gestión de almacenes e inventarios; manejo de sistemas WMS/ERP/Excel; identificación de insumos técnicos; técnicas de auditoría de inventario; honestidad e integridad; orden y meticulosidad; atención al detalle en registro de series/IMEI.

---

### 4.5 Operador de Arrendamiento — COA

| Campo | Valor |
|---|---|
| Régimen de contratación | Laboral |
| Área / Departamento | Dpto. Ventas |
| Supervisor inmediato | Julio Moreno |
| Tipo de contrato | Tiempo indefinido |
| Sede / Concesionario | Av. Francisco Solano López, esquina calle Pascual Navarro, Sabana Grande, Edif. Seguros la Fe, piso 3 |
| Vacantes totales / Mes de incorporación | 1 persona / M8 |

**Misión:** Coordinar y supervisar la operativa comercial y administrativa de todos los puntos de venta a nivel nacional, garantizando la rentabilidad de las unidades de negocio, la correcta aplicación del modelo de arrendamiento y el cumplimiento de los estándares de servicio de Arranca, C.A.

**Responsabilidades y funciones:**

| Responsabilidad | Función asociada |
|---|---|
| Uniformidad del modelo de negocio en cada concesionario | Capacitación continua del equipo de ventas (negociación, sistema, planes de arrendamiento) |
| Seguimiento de objetivos de ventas mensuales por zona | Supervisión diaria de agentes: soporte, cartera de clientes, entregas, reportes |
| Integridad del proceso de arrendamiento (requisitos, cuota inicial, aprobación) | Validación de fianzas/depósitos de garantía previa a la entrega de unidades |
| Comunicación con supervisión inmediata sobre desempeño del equipo | Supervisión del llenado, firma e integridad documental de expedientes legales |

**Competencias:** Dominio del portafolio/catálogo comercial; manejo de sistemas operativos y CRM; procedimientos administrativos (facturación, conciliación de depósitos); técnicas de negociación y cierre; asesoría comercial consultiva; orientación al detalle; atención al cliente; disciplina operativa.

> `[PENDIENTE — no definido en las fuentes originales]`: procedimiento operativo propio de este cargo — el DOCX solo desarrolla el guion del Operador Comercial (cargo distinto, de tienda).

---

### 4.6 Operador Comercial de Arrendamiento

| Campo | Valor |
|---|---|
| Régimen de contratación | Laboral |
| Área / Departamento | Dpto. Ventas |
| Supervisor inmediato | `[PENDIENTE]` |
| Tipo de contrato | Indefinido |
| Sede / Concesionario | Concesionario asignado `[PENDIENTE — dato no completado en la fuente original]` |
| Vacantes totales / Mes de incorporación | `[PENDIENTE]` |

**Misión:** Ser un aliado estratégico para el cliente, interpretando sus necesidades de movilidad y traduciéndolas en soluciones de arrendamiento personalizadas; estructurar esquemas de pago y cánones sólidos que protejan la rentabilidad del concesionario y construyan relaciones comerciales de largo plazo.

**Responsabilidades y funciones:**

| Responsabilidad | Función asociada |
|---|---|
| Asesoría técnica y diagnóstico de perfil del cliente | Auditar y validar documentación (historial crediticio, estados bancarios) |
| Prevención de incidencias operativas (explicar mantenimiento y contrato) | Recaudo del pago inicial y cánones presenciales; reporte de cobranza a oficina central |
| Gestión ágil de consultas y canalización a áreas correspondientes | Retención proactiva de clientes de alto valor (renovación de contratos) |
| Reportes de gestión diarios/semanales | Cumplimiento de objetivos comerciales (semanal, quincenal, mensual) |

**Competencias:** Conocimiento técnico automotriz; gestión recaudatoria y contable; atención híbrida (digital y presencial); orientación al cliente y transparencia; orientación a resultados; negociación y persuasión consultiva; rigurosidad documental; organización y control operativo.

**Procedimiento operativo:** ver §3.2 (comercialización y aprobación) y §3.3 (asignación y entrega). El guion de venta completo y la tabla de lenguaje recomendado se preservan en el Anexo A.

---

### 4.7 Operador de Cobranza

> Reconstruido a partir de texto narrativo del DOCX; no existe ficha de RR.HH. original para este cargo. Los campos de datos generales quedan `[PENDIENTE]` salvo lo que puede inferirse razonablemente del propio nombre del cargo.

| Campo | Valor |
|---|---|
| Régimen de contratación | `[PENDIENTE]` |
| Área / Departamento | Cobranza *(inferido del nombre del cargo)* |
| Supervisor inmediato | `[PENDIENTE]` |
| Tipo de contrato | `[PENDIENTE]` |
| Sede / Concesionario | `[PENDIENTE]` |
| Vacantes totales / Mes de incorporación | `[PENDIENTE]` |

**Misión:** Responsable de la gestión, seguimiento y acompañamiento continuo de la cartera de clientes postventa, asegurando el cumplimiento oportuno de los compromisos de arrendamiento; minimiza la exposición al riesgo crediticio y previene el ingreso de cuentas en mora.

**Responsabilidades principales** *(extraídas del texto narrativo; no hay tabla original responsabilidad/función):*
- Gestión preventiva de vencimientos antes de que se conviertan en incumplimientos.
- Verificación y validación de pagos a través del sistema ARRANCA en las modalidades habilitadas (Pago Móvil, transferencia, domiciliado, efectivo, Zelle, Binance).
- Ejecución del protocolo de renegociación ante mora temprana (diagnóstico financiero, mesa de negociación, formalización de nuevo contrato).
- Verificación de vinculación de órdenes para el Programa de Beneficio por Referidos y aplicación del descuento correspondiente.

**Competencias** *(inferidas del texto, no listadas explícitamente en una fuente original):* manejo de CRM (KOMMO) y del Sistema ARRANCA; análisis financiero básico; negociación; comunicación asertiva bajo presión.

**Procedimiento operativo:** ver §3.4 y §3.5.

---

### 4.8 Operador de Atención al Cliente (Postventa)

> Reconstruido a partir de texto narrativo del DOCX; no existe ficha de RR.HH. original.

| Campo | Valor |
|---|---|
| Régimen de contratación | `[PENDIENTE]` |
| Área / Departamento | Atención al Cliente *(inferido del nombre del cargo)* |
| Supervisor inmediato | `[PENDIENTE]` |
| Tipo de contrato | `[PENDIENTE]` |
| Sede / Concesionario | `[PENDIENTE]` |
| Vacantes totales / Mes de incorporación | `[PENDIENTE]` |

**Misión:** Ser el principal punto de contacto y solución tras la entrega de la motocicleta, garantizando una experiencia de usuario excepcional, resolviendo inquietudes de forma ágil y coordinando con las áreas internas correspondientes.

**Responsabilidades principales:**
- Auditoría previa obligatoria del usuario en el Sistema ARRANCA (identidad, historial de órdenes, estado financiero, servicios adicionales) antes de cualquier contacto.
- Gestión reactiva de requerimientos: indagar, analizar en sistema, canalizar internamente (Taller, Cobranzas, Legal o Traspasos) y hacer seguimiento hasta la resolución.
- Contacto proactivo post-entrega (dentro de 48 horas): recordatorio de mantenimiento preventivo, canales de soporte, plan de pagos, validación de seguro y traspaso.
- Protocolo diferenciado ante hurto del vehículo, extravío de documentos, pérdida de placa o de llave.

**Competencias** *(inferidas del texto):* manejo del Sistema ARRANCA; comunicación empática y estructurada (scripts en 5 pasos); capacidad de diagnóstico técnico básico (formulario de descarte); coordinación interdepartamental.

**Procedimiento operativo:** ver §3.4.

---

### 4.9 Operador Legal

> Reconstruido a partir de texto narrativo del DOCX; no existe ficha de RR.HH. original.

| Campo | Valor |
|---|---|
| Régimen de contratación | `[PENDIENTE]` |
| Área / Departamento | Legal *(inferido del nombre del cargo)* |
| Supervisor inmediato | Director/Supervisor inmediato *(mencionado como destinatario de reportes, sin nombre)* |
| Tipo de contrato | `[PENDIENTE]` |
| Sede / Concesionario | `[PENDIENTE]` |
| Vacantes totales / Mes de incorporación | `[PENDIENTE]` |

**Misión:** Profesional en derecho responsable de gestionar los aspectos corporativos, contractuales y judiciales de la empresa; proteger los intereses patrimoniales de Arranca, garantizar la seguridad jurídica y servir de enlace con entes reguladores, notarías y autoridades de tránsito.

**Responsabilidades principales:**
- Trámites notariales, documentación y notificaciones oficiales: gestión de traspasos, rescisiones contractuales, gestión ante entes reguladores.
- Recuperación de activos y control de mora: retención y resguardo de motocicletas, negociación con clientes en impago, gestión de accidentes, hurtos y robos.
- Tramitación documental e incidencias vehiculares: pérdida de placa, autorizaciones y permisos.
- Redacción, registro documental y gestión contractual: elaboración de contratos, instrumentos legales, control de archivo ante el SAREN.

**Flujo de interacción interdepartamental:** recibe expedientes de Cobranza (declaración de mora) y de Atención al Cliente (placas extraviadas, rescisiones voluntarias, siniestros); reporta a Dirección/Supervisor inmediato.

**Competencias** *(inferidas del texto):* derecho contractual y de tránsito; gestión notarial; negociación en contextos de impago; manejo del SAREN.

**Procedimiento operativo:** ver §3.5 (mora y recuperación) y §3.6 (traspaso — incompleto).

---

### 4.10 Gerente de Repuestos *(mención sin desarrollo)*

Mencionado únicamente como responsable de emitir el presupuesto de mano de obra y repuestos para reparaciones bajo arrendamiento adicional. `[PENDIENTE — no definido en las fuentes originales]`: misión, responsabilidades, competencias y todos los campos de datos generales.

### 4.11 Jefe de Taller / Mecánico del concesionario *(mención sin desarrollo)*

Mencionado como quien ejecuta el mantenimiento preventivo, estampa el sello del Cartón de Garantía, y como destinatario de la autorización para iniciar labores de taller tras el pago del cliente. `[PENDIENTE — no definido en las fuentes originales]`: misión, responsabilidades, competencias y todos los campos de datos generales. Nota: no está claro si "Jefe de Taller" y "mecánico del concesionario" son el mismo cargo o dos distintos — otro punto a confirmar con Arranca.

---

## Anexo A — Guion comercial y lenguaje recomendado

*Preservado del DOCX original por su valor operativo directo para el Operador Comercial de Arrendamiento.*

| Etapa del proceso | ❌ Qué evitar (lenguaje burocrático/frío) | ✅ Qué decir (lenguaje empático/comercial) |
|---|---|---|
| 1. Saludo/Indagación | "¿Buscas algún modelo en específico?" | "¡Bienvenido a ARRANCA! Qué gusto tenerte por aquí. Cuéntame, ¿buscas tu primera moto o quieres renovar la que ya tienes?" |
| 1. Saludo/Indagación | "¿Cuáles son tus intenciones de compra?" | "Para recomendarte la opción perfecta ajustada a sus ingresos, ¿la usarás para trabajar, reparto o transporte diario?" |
| 2. Explicación del Arrendamiento | "El modelo de arrendamiento evita descapitalizarte mediante un depósito de garantía y un canon quincenal." | "La gran ventaja es que no gastas todos tus ahorros de golpe. Das un pago inicial accesible y manejas cánones semanales o quincenales." |
| 2. Explicación del Arrendamiento | "El seguro y el GPS son obligaciones contractuales." | "Además, ruedas 100% protegido porque tu canon ya incluye seguro integral, rastreo GPS 24/7 y pagos directos en bolívares a la tasa oficial." |
| 3. Recepción de Documentos | "Debo auditar la veracidad, vigencia e historial de tus documentos para el expediente." | "Para ayudarte a asegurar tu moto hoy mismo y lograr la aprobación rápida, vamos a armar tu expediente. ¿Tienes a la mano tu cédula, licencia y comprobantes de ingreso? Entre otros" |
| 4. Solicitud de Fiador Solidario | "Tu perfil no califica solo y requiere de un Fiador Solidario para asumir la responsabilidad." | "Tu solicitud va muy bien. Para asegurar la aprobación inmediata del sistema, solo necesitamos sumar un respaldo adicional: un fiador solidario (familiar o amigo). ¿A quién podríamos invitar?" |
| 5. Caso: Solicitud Rechazada | "El dictamen de evaluación fue desfavorable. Procederemos a la devolución previa firma." | "En esta oportunidad el sistema no aprobó la solicitud. Pero puede estar tranquilo: le devolvemos el 100% de su dinero por el mismo medio de pago. Solo firmamos este comprobante de devolución y listo." |
| 6. Caso: Retracto del Cliente | "Incurrió en retracto de solicitud y se aplicará una penalización del 10% por gastos administrativos." | "Entiendo su situación. Como la solicitud ya estaba aprobada y procesamos el expediente, la planilla contempla una retención del 10% únicamente por los trámites administrativos ya realizados. Le reintegramos el resto del pago inicial de inmediato." |
| 7. Entrega de Unidad y Primer Canon | "Es requisito indispensable cancelar la cuota contra entrega para despacho." | "¡Felicidades por tu nueva moto! Para finalizar y hacer entrega formal, verificamos el pago del primer canon. Le entrego la carpeta completa con contrato, placa y póliza de seguro." |
| 8. Mantenimiento y Garantía | "Debe cancelar de contado en caja. Si no cumple la pauta perderá la garantía." | "Recuerda que tu próximo mantenimiento preventivo es al alcanzar los [X] km o el día [Fecha]. ¡Agéndalo a tiempo para mantener tu moto como nueva y con garantía activa!" |
| 9. Servicios Extra y Reparaciones | "Debe someterse a pre-evaluación crediticia y cálculo de sistema antes de ingresar el vehículo." | "¡Claro que sí! Podemos incluir la reparación o artículo en tu plan de cánones en cuotas accesibles. Revisamos rápidamente el presupuesto en taller y te muestro las opciones de pago que mejor le convengan." |

**Reglas de trato transversales:** uso de "usted" en todo momento (postura de asesor experto); prohibición categórica de apodos o familiaridades ("mi amor", "cielo", "cariño", "rey", "jefe", "amigo").

---

## Documentación requerida para la solicitud de arrendamiento

*(Preservado del DOCX — estándar de expediente que debe auditar el Operador Comercial.)*

- Cédula de identidad vigente.
- RIF actualizado.
- Licencia de conducir de 2.º grado vigente.
- Constancia de residencia (autoridad competente o junta de condominio).
- Referencia bancaria.
- Mínimo dos referencias personales (firma, contacto y copia de cédula).
- Soporte de ingresos: carta de trabajo (dependientes) o certificación de ingresos de contador colegiado (independientes/firma personal).

**Fiador solidario** (cuando el análisis crediticio lo requiera): cédula, RIF, constancia de residencia, soporte de ingresos y carta compromiso de fianza firmada.

**Regla de auditoría:** ningún expediente se carga a la plataforma con documentos vencidos, borrosos o ilegibles; la vigencia de la carpeta es responsabilidad directa del Operador Comercial.
