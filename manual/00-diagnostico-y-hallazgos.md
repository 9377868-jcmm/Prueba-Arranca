# Diagnóstico: Manual de Procedimientos y Descripción de Cargos — Arranca

**Documento:** Informe de consultoría documental
**Fecha:** 2026-08-28
**Fuentes analizadas:**

| # | Archivo | Naturaleza real del contenido |
|---|---|---|
| 1 | `manual_flujos_monitoreo.pdf` | Manual de flujos v1.0 del Departamento de Monitoreo y GPS (4 roles, 5 pasos c/u) |
| 2 | `DESCRIPCIÓN_DE_CARGOS.xlsx` | Plantilla formal de RR.HH. ("Plantilla de 23 cargos") rellenada para 6 puestos |
| 3 | `MANUAL_DE_PROCESOS.docx` | Título interno real: *"Manual de Operaciones y Guía de Actuación Comercial"* — guiones de venta y protocolos narrativos para Comercial, Cobranza, Atención al Cliente y Legal |

---

## 1. Hilo y propósito detectado

Las tres fuentes son intentos independientes, hechos por distintos autores y en distintos momentos, de documentar la operación de **Arranca**, una empresa de **arrendamiento de motocicletas con opción de traspaso** (venta financiada tipo *leasing*, con cánones semanales/quincenales, depósito de garantía, seguro y monitoreo GPS incluidos). Ninguno de los tres se propuso cubrir el ciclo completo del negocio; cada uno documentó el fragmento que su autor conocía mejor:

- El **PDF** documenta la trastienda técnica: cómo se instala y monitorea el GPS de cada moto.
- El **XLSX** documenta la estructura de personal (para qué puestos contratar, con qué misión y responsabilidades) — es un insumo de RR.HH., no un manual operativo.
- El **DOCX** documenta la experiencia comercial y postventa: cómo se vende, cobra, atiende y —cuando algo sale mal— cómo actúa Legal.

El propósito unificado, tal como se puede reconstruir, es: **"Construir el Manual de Procedimientos y Descripción de Cargos de Arranca"**, un documento único que sirva simultáneamente para (a) definir cada puesto de trabajo con fines de contratación/RR.HH., y (b) describir el procedimiento operativo de punta a punta del negocio: desde que una moto se adquiere hasta que se traspasa a un cliente.

Ese documento único **no existe todavía** — es lo que este proyecto debe construir, y es la causa de que las tres fuentes "no se pongan de acuerdo": no comparten una plantilla, ni una lista maestra de cargos, ni un mapa de proceso contra el cual verificarse.

---

## 2. Reconstrucción del flujo: de la compra a la venta por traspaso

```
COMPRA/ALTA DEL     PREPARACIÓN         COMERCIALIZACIÓN    EVALUACIÓN Y        ASIGNACIÓN Y        VIDA DEL              INCIDENTES           TRASPASO /
ACTIVO               TÉCNICA (GPS)                            APROBACIÓN          ENTREGA              ARRENDAMIENTO         (mora / robo)        VENTA FINAL
   ●───────────────────●───────────────────●───────────────────●───────────────────●───────────────────●───────────────────●───────────────────●
 [VACÍO]           PDF: Mecánico       DOCX: Operador      DOCX: menciona    DOCX + PDF:          DOCX: Cobranza,      DOCX: Cobranza →     DOCX: solo 3
 no hay fuente     Instalador +        Comercial           "evaluación       Área de Monitoreo    Atención al          Legal (mora,          menciones
 que documente     Configurador de     (guion completo,    centralizada" y   asigna GPS en 3      Cliente, PDF:        robo, retención)      tangenciales;
 la compra de      GPS (PDF);          documentos          "analista         días hábiles;         Analista de          — bien cubierto,      sin
 la moto como      alta en             requeridos,         asignado" pero    Comercial arma        Monitoreo            salvo el detalle      procedimiento
 activo            plataforma          fiador solidario    SIN cargo         expediente de        (vigilancia          operativo de la       propio
 (proveedor,       (Configurador)                          definido que     entrega              activa) — bien       recuperación física
 recepción,                                                lo ejecute        (contrato, placas,   cubierto              del vehículo
 registro)                                                                   póliza, llaves)
```

**Lectura del diagrama:**

- Los tramos **"Preparación técnica"**, **"Comercialización"**, **"Asignación y entrega"** y **"Vida del arrendamiento"** están razonablemente cubiertos si se cruzan las tres fuentes entre sí.
- El tramo **"Compra/alta del activo"** (cómo Arranca adquiere las motos, quién las recibe, cómo entran al inventario antes incluso de que exista GPS que instalar) **no aparece en ninguna fuente**. El PDF y el XLSX de Logística solo hablan de insumos GPS/SIM/arneses, nunca de la motocicleta como activo comprado.
- El tramo **"Evaluación y aprobación"** del crédito del cliente se menciona ("evaluación centralizada", "análisis socioeconómico", "el analista asignado") pero **no hay ningún cargo definido** (ni en el PDF ni en el XLSX) que sea el dueño de ese paso.
- El tramo **"Traspaso / venta final"**, que es precisamente el cierre del ciclo de vida que se pidió mapear, es el más débil de los tres documentos: aparece mencionado **tres veces, siempre de pasada**, y nunca como un procedimiento (ver detalle en sección 3.6).

---

## 3. Incongruencias e inconsistencias detectadas

### 3.1 Metodología y formato

No existe una plantilla común. El PDF usa "flujo numerado de 5 pasos por rol"; el XLSX usa una ficha de RR.HH. con 4 filas fijas de responsabilidades/funciones; el DOCX usa narrativa y guiones de diálogo con tablas de ejemplo. Al unificarlos no hay un "formato ganador" evidente — hubo que elegir uno (ver manual unificado, que adopta la ficha del XLSX para cargos y agrega procedimientos por proceso para lo transversal).

### 3.2 Filas de Responsabilidades/Funciones desalineadas (XLSX)

En la hoja **"Analista de Monitoreo"**, la fila 3 de "Funciones del cargo" mezcla dos funciones distintas en una sola celda ("Verificación de transmisión..." + "Activación de protocolos de seguridad..."), rompiendo la correspondencia 1 a 1 que el resto de la plantilla respeta entre responsabilidad y función.

### 3.3 El rol dual "Configurador de GPS y Líder de Área" se parte sin aviso

El PDF lo define explícitamente como **un solo cargo con dos frentes** (configuración técnica + liderazgo del equipo). El XLSX lo registra como **"Configurador de GPS – Táctico"**, con la misión dual copiada literalmente del PDF, pero sin mencionar en el nombre del cargo el rol de "Líder de Área". No queda claro si:
- (a) sigue siendo un solo cargo (el nombre del XLSX es solo abreviado), o
- (b) el liderazgo de área se separó en otra posición que no fue documentada.

### 3.4 "Departamento de Logística" vs. "Analista de Inventario y Almacén"

El PDF describe **"Departamento de Logística"** como un bloque funcional (custodia, conteo, entregas, auditoría, garantías), sin ficha de cargo individual. El XLSX sí tiene una ficha de cargo — **"Analista de Inventario y Almacén"** — con responsabilidades muy similares. El mapeo entre ambos documentos es razonable pero nunca se hace explícito; formalmente son "cosas distintas" (departamento vs. cargo) que probablemente se refieren a lo mismo.

### 3.5 Cargos mencionados en el DOCX sin ficha en el XLSX

Ningún cargo de los que actúan en la mitad comercial/legal/postventa del negocio tiene ficha de RR.HH.:

- **Operador de Cobranza**
- **Operador de Atención al Cliente (Postventa)**
- **Operador Legal**
- Roles secundarios mencionados sin desarrollo: Gerente de Repuestos, Jefe de Taller, mecánico del concesionario, Director/Supervisor inmediato.

A la inversa, el XLSX incluye **"Operador de Arrendamiento – COA"** (coordinador nacional de puntos de venta, único cargo con supervisor inmediato y plan de incorporación completos: 1 persona, mes 8) sin que el DOCX describa un procedimiento operativo propio para él — solo se detalla el guion del **"Operador Comercial"**, que es un cargo distinto (de tienda, no de coordinación nacional).

### 3.6 Traspaso: el vacío más crítico

El "traspaso" (transferencia final de la propiedad de la moto al cliente) se menciona en exactamente tres lugares del DOCX, siempre como referencia lateral a otro proceso, nunca como procedimiento propio:

1. Bajo las funciones del Operador Legal: *"Gestión de Traspasos: Elaboración, revisión y tramitación... de los expedientes para la firma de documentos de propiedad ante Notaría Pública..."* — una sola frase, sin pasos.
2. En la preparación del Operador de Atención al Cliente: *"Verificar si el cliente... tiene pagos pendientes por trámites de traspaso"* — confirma que el traspaso tiene un costo asociado, pero no dice cuál ni cuándo se cobra.
3. En el guion de llamada post-entrega: *"Validaciones: Confirmar la activación de sus seguros y del traspaso"* — sugiere que el traspaso se activa muy cerca de la entrega inicial, lo cual entra en tensión con la lógica típica de un arrendamiento con opción de compra (donde el traspaso de propiedad suele ocurrir al **final** del plan de pagos, no al inicio). Este punto necesita aclaración de Arranca: **¿el "traspaso" que se activa en la entrega es el mismo traspaso de propiedad final, o es otro trámite (p. ej. traspaso de placa/circulación) con el mismo nombre?**

Adicionalmente, al final del documento DOCX (última oración del bloque de Legal) aparece un fragmento de texto suelto, mal fusionado con la oración anterior por un error de edición: *"...y se procesa el reingreso definitivo de la motocicleta al inventario corporativo.ni detallan los documentos de propiedad exactos exigidos por la aseguradora para proceder con el cobro de la indemnización."* Este fragmento parece ser una nota o comentario de un autor previo que señalaba, ya entonces, un vacío sin resolver — evidencia adicional de que ni los propios redactores cerraron este punto.

**No existe**, en ninguna de las tres fuentes:
- Una definición de cuándo procede el traspaso (¿al completar todas las cuotas?, ¿es una opción de compra anticipada?, ¿tiene un costo fijo o variable?).
- El cargo responsable de iniciarlo (¿lo dispara Cobranza al detectar el último pago?, ¿lo solicita el cliente?).
- Qué ocurre con el dispositivo GPS y la suscripción de monitoreo una vez traspasada la moto (¿se retira?, ¿se factura aparte?).
- Los documentos de propiedad exigidos por la aseguradora, según señala la propia nota suelta del documento.

### 3.7 Datos de RR.HH. incompletos en el XLSX

- **Plan de incorporación** (vacantes totales / mes M1–M12, sobre una plantilla de 23 cargos totales): solo está completo para 1 de los 6 cargos documentados (Operador de Arrendamiento – COA: 1 persona, mes 8). Los otros 5 cargos tienen estos campos vacíos, lo que impide usar el archivo como plan real de contratación.
- **Supervisor inmediato**: vacío en 5 de 6 cargos (solo está lleno en el COA: "Julio Moreno"). No hay organigrama explícito en ninguna fuente.
- **Sede/Concesionario**: inconsistente entre cargos — dirección completa en unos (Sabana Grande, Caracas), "Concesionario" genérico en otro, "Concesionario asignado ()" con paréntesis vacíos sin completar en otro, y campo vacío en un tercero.

---

## 4. Preguntas abiertas para Arranca

Estas preguntas no se responden en este documento porque ninguna fuente aportó la información necesaria; se dejan explícitas para que la empresa las resuelva antes de que el manual pueda considerarse definitivo.

1. **Organigrama:** ¿A quién reporta el "Configurador de GPS y Líder de Área"? ¿Existe una Gerencia de Monitoreo intermedia, o reporta directo a Gerencia General?
2. **Rol dual:** ¿El "Configurador de GPS" del XLSX y el "Líder de Área" del PDF son la misma persona/cargo, o se dividieron en dos posiciones?
3. **Evaluación crediticia:** ¿Qué cargo ejecuta la "evaluación centralizada" y el "análisis socioeconómico" de las solicitudes? ¿Es un cargo nuevo (Analista de Crédito/Riesgo) que falta documentar?
4. **Traspaso — momento:** ¿El traspaso de propiedad ocurre al finalizar el plan de pagos, o existe una modalidad de traspaso anticipado? ¿El "traspaso" que se valida en la llamada post-entrega es el mismo trámite que gestiona Legal al final del contrato, o es otro trámite homónimo (p. ej. traspaso de circulación/placa)?
5. **Traspaso — costos y requisitos:** ¿Cuál es el costo del trámite notarial de traspaso? ¿Quién lo paga? ¿Qué documentos de propiedad exige la aseguradora (según la nota suelta encontrada en el DOCX)?
6. **Traspaso — GPS:** ¿Qué ocurre con el dispositivo GPS y el servicio de monitoreo una vez traspasada la moto? ¿Se desinstala, se transfiere la suscripción, o se cobra aparte?
7. **Plan de incorporación:** ¿Cuáles son las vacantes totales y el mes de incorporación (M1–M12) de los otros 22 cargos de la plantilla de 23, más allá del único que está documentado?
8. **Cargos sin ficha:** ¿Se debe generar la ficha formal de RR.HH. (XLSX) para Operador de Cobranza, Operador de Atención al Cliente, Operador Legal, Gerente de Repuestos y Jefe de Taller, dado que ya tienen procedimiento operativo descrito en el DOCX pero no ficha de cargo?
9. **Compra de la moto:** ¿Qué departamento/cargo gestiona la compra y el alta en inventario de la motocicleta como activo, antes de que el Mecánico Instalador reciba la orden de trabajo?

---

## 5. Alcance de este diagnóstico

Este informe no inventa respuestas a los vacíos anteriores. El documento `01-manual-de-procedimientos-y-cargos.md` (borrador unificado) resuelve únicamente los vacíos **de formato** (adoptando una plantilla común) y **de redacción** (dando forma de ficha a los cargos que solo existían como narrativa), sin suponer cifras, plazos legales ni reglas de negocio que ninguna fuente respalda — esos puntos quedan marcados como `[PENDIENTE — no definido en las fuentes originales]` o listados en la sección 4 de este diagnóstico.
