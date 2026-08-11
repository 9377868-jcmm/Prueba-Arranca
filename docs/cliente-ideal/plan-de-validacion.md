# Plan de validación del Cliente Ideal

> Este documento existe porque la definición de cliente ideal de Arranca se construyó
> **sin data interna**. Está basada en conocimiento de campo del equipo y en contexto
> público de mercado. Eso la hace útil como punto de partida y peligrosa como verdad
> definitiva.
>
> Una definición de cliente ideal que nadie valida se convierte, en seis meses, en una
> opinión con formato de documento. Este plan es lo que impide eso.

---

## 1. Principio de trabajo

Cada perfil y cada preferencia declarada en esta estrategia es una **hipótesis con nombre y
apellido**. Toda hipótesis aquí listada tiene tres cosas:

1. **Enunciado falsable** — redactado de forma que pueda resultar falso.
2. **Prueba concreta** — qué medir, con qué instrumento, con cuántos casos.
3. **Umbral de decisión** — el número que la confirma y el número que la descarta,
   **definido antes de mirar los datos**.

El tercer punto es el que más se omite y el más importante. Sin umbral fijado de antemano,
cualquier resultado termina interpretándose como confirmación de lo que ya creíamos.

---

## 2. Instrumentación mínima en punto de venta

Es la fuente de datos más barata que tiene Arranca y hoy no se está aprovechando. **Tres
preguntas**, hechas por el vendedor durante la conversación normal de venta y registradas
en cada operación cerrada.

No es un formulario que el cliente llena. Es el vendedor anotando tres campos.

| # | Pregunta al cliente | Campo a registrar | Para qué sirve |
|---|---------------------|-------------------|----------------|
| 1 | «¿Para qué la va a usar principalmente?» | Uso previsto: *trabajo con app · mototaxi · carga/faena · diligencias y familia · uso personal* | Asigna el cliente a un segmento. Es el dato que hoy falta por completo. |
| 2 | «¿De dónde va a salir la cuota?» | Fuente de ingreso: *la moto misma · sueldo/empleo · negocio propio · remesa · apoyo familiar* | Es el mejor predictor de calidad de pago, y distingue activo productivo de herramienta. |
| 3 | «¿Cómo se enteró de Arranca?» | Origen: *referido · pasó por la tienda · redes · concesionario/aliado · vino por la marca EK* | Revela qué segmento llega solo y cuál hay que salir a buscar. |

**Campos que ya existen y solo hay que cruzar:** modelo vendido, sucursal, fecha, forma de
pago (contado/financiado), monto de inicial, edad del cliente.

**Regla de calidad:** el campo de uso previsto debe ser una lista cerrada, no texto libre.
Texto libre en punto de venta produce datos que nadie puede agregar después.

**Horizonte:** con ~60 días de registro y volumen normal de tienda hay base suficiente para
la primera lectura de segmentos.

---

## 3. Entrevistas en profundidad

Lo que el registro de ventas no da: el **porqué**. Se hacen entrevistas cortas (20–30 min),
presenciales en tienda o telefónicas a clientes con 3–6 meses de uso.

**Muestra:** 8–10 clientes por segmento prioritario. Prioridad de ejecución en la sección 6.

**Criterio de selección:** clientes que ya usaron la moto lo suficiente para tener opinión
formada, no recién comprados. Incluir deliberadamente **2 clientes con atraso en cuotas**
por segmento — son los que más enseñan y los que nunca se entrevistan.

### Guía de entrevista

1. Cuénteme el día que decidió comprar la moto. ¿Qué pasó que lo llevó a decidirlo?
2. ¿Qué hacía antes de tener la moto para resolver eso mismo?
3. ¿Qué otros modelos o marcas miró? ¿Por qué descartó cada uno?
4. ¿Por qué terminó eligiendo este modelo específicamente?
5. ¿Quién más opinó en la decisión? ¿Quién tuvo la última palabra?
6. ¿Cuánto le rinde / le ahorra la moto a la semana? ¿Cómo lo calcula?
7. ¿Qué es lo que más le preocupaba antes de comprar? ¿Se cumplió ese temor?
8. Desde que la tiene, ¿qué ha sido lo mejor y qué lo peor?
9. ¿Cómo hace cuando necesita un repuesto o un servicio? ¿A dónde va?
10. Si un amigo suyo le pide consejo para comprar una moto, ¿qué le dice?

**Qué escuchar de verdad:** las preguntas 2, 3 y 6 revelan el *trabajo por hacer* real —
casi nunca coincide con lo que el cliente dice cuando se le pregunta directamente qué
valora. La pregunta 9 revela si la postventa de Arranca está capturando o perdiendo la
recurrencia.

---

## 4. Extracción a solicitar al área de financiamiento

El dato que convierte «cliente que compra» en «cliente ideal». Sin cruzar comportamiento de
pago, el modelo de calificación funciona a ciegas en su criterio de mayor peso.

**Campos mínimos por operación:**

| Campo | Por qué se necesita |
|-------|---------------------|
| Modelo y fecha de compra | Une la operación con el segmento |
| Sucursal | Diferencia plazas |
| Monto de inicial y plan de cuotas | Perfil de esfuerzo financiero |
| Historial de pago cuota a cuota | La variable real: no si pagó, sino **cómo** pagó |
| Días de atraso acumulados | Predictor de deterioro |
| Estado final (al día / atrasado / recuperado / castigado) | Resultado a explicar |
| Edad y ocupación declarada | Cruce demográfico |

**Los tres cruces que hay que correr primero:**

1. **Modelo × comportamiento de pago.** ¿Hay modelos que sistemáticamente se atrasan más?
   Si sí, casi nunca es el modelo: es el segmento que lo compra.
2. **Fuente de ingreso × mora.** Prueba directa de si el ingreso generado por la moto misma
   sostiene la cuota mejor o peor que un sueldo fijo. Es la pregunta económica central de
   todo el negocio.
3. **Sucursal × mix de modelos.** Confirma o desmonta las preferencias regionales
   declaradas, con volumen real y no con recuerdo.

---

## 5. Hipótesis, pruebas y umbrales

| # | Hipótesis | Confianza inicial | Prueba | Confirma si | Descarta si |
|---|-----------|-------------------|--------|-------------|-------------|
| H1 | El **Horse** es el modelo dominante para acarreo y faena en el Sur y el interior | Alta | Cruce sucursal × modelo + uso previsto | Horse supera el 40 % de las ventas en sucursales del interior, con uso previsto *carga/faena* como primer motivo | Su participación en el interior no se distingue de la del resto de plazas |
| H2 | El **Owen** es el modelo preferido del mototaxista urbano de pasajeros | Alta | Cruce modelo × uso previsto *mototaxi* | Más del 50 % de las ventas marcadas como mototaxi son Owen | El uso mototaxi se reparte parejo entre tres o más modelos |
| H3 | La **Xpress** concentra a los compradores de primer vehículo | Alta | Cruce modelo × edad × primera compra | Edad promedio del comprador de Xpress al menos 6 años menor que la media general | La edad del comprador de Xpress no difiere de la media |
| H4 | El rider de aplicaciones decide **por costo de operación y disponibilidad de repuestos**, no por precio de lista | Media | Entrevistas, preguntas 3, 4 y 6 | 6 de cada 10 entrevistados mencionan consumo, repuestos o tiempo de taller antes que precio | El precio de compra domina de forma clara la justificación |
| H5 | El ingreso generado por la moto **sostiene la cuota mejor** que un sueldo fijo | Media | Cruce fuente de ingreso × mora | La mora del segmento productivo es menor que la del segmento con sueldo fijo | Es igual o mayor |
| H6 | Existe un segmento **utilitario doméstico** en el interior, distinto del productivo, con volumen relevante | Media | Registro de uso previsto en punto de venta | Al menos 15 % de las ventas del interior declaran *diligencias y familia* | Queda por debajo del 5 % |
| H7 | Existe un segmento de **usuaria urbana / scooter** con volumen suficiente para atenderlo aparte | **Hipótesis — baja** | Registro de género × modelo, en capitales | Las mujeres superan el 12 % de las compradoras en capitales, concentradas en scooter/línea urbana | Se mantiene por debajo del 5 % sin concentración por modelo |
| H8 | El comprador guiado solo por precio, sin ingreso ligado a la moto, es el de **peor comportamiento de pago** | Media | Cruce inicial baja + sueldo/apoyo familiar × mora | Su tasa de atraso duplica la del promedio | No se diferencia del promedio |

---

## 6. Orden de ejecución

No todo se valida a la vez. Este es el orden por relación entre esfuerzo y valor para el
negocio:

**Primero — arrancar el registro en punto de venta (semana 1).**
Cuesta casi nada y es el cuello de botella de todo lo demás. Cada semana que no se registra
es una semana de datos perdida para siempre. Empezar aquí, hoy, aunque el resto del plan no
se ejecute nunca.

**Segundo — pedir la extracción de financiamiento (semanas 1–2).**
El dato ya existe, solo hay que solicitarlo. Resuelve H1, H2, H3, H5 y H8 con data
histórica, sin esperar a acumular ventas nuevas. Es el mayor retorno inmediato del plan.

**Tercero — entrevistas a los dos segmentos productivos (semanas 3–5).**
Rider de aplicaciones y mototaxista urbano. Son los de mayor recurrencia de postventa y los
que definen el grueso del inventario. Resuelve H4.

**Cuarto — entrevistas al interior (semanas 5–7).**
Acarreador y utilitario doméstico. Resuelve H6 y afina H1.

**Quinto — sondeo del segmento emergente (semana 8+).**
Usuaria urbana / scooter (H7). Es el de menor certeza y menor volumen esperado: se valida
al final, con lo que sobre, y sin comprometer inventario antes de tener la respuesta.

---

## 7. Revisión

Esta definición de cliente ideal se **revisa a los 90 días** con los datos recogidos. En esa
revisión cada hipótesis queda en uno de tres estados: **confirmada**, **descartada** o
**ajustada** — y las ponderaciones del modelo de calificación se recalculan en consecuencia.

Un perfil que no resiste su propia prueba se elimina del documento. No se conserva «por si
acaso»: mantener perfiles no validados es exactamente lo que convierte una estrategia en
folclore interno.
