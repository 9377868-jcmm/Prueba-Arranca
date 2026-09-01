# Prueba-Arranca

## Análisis: modelo de moto vs. morosidad

Ver [`analysis/`](analysis/) — pipeline reproducible (SQL + Python) para
correlacionar el modelo de moto arrendado con la morosidad del contrato, más
los resultados agregados y el reporte visual. Incluye dos definiciones de
morosidad (v1: evento de cobranza; v2: 4 cuotas consecutivas vencidas, con
cohortes trimestrales, matriz de correlación completa entre todos los
factores y un modelo multivariado) y un tercer análisis independiente de
riesgo de siniestralidad (v3: frecuencia y severidad de robo/hurto/choque
por sede y modelo, con una simulación Monte Carlo para decidir entre póliza
de seguro y fondo propio). No incluye datos crudos ni información de
clientes.