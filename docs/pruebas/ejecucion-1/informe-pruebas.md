# Resultados de pruebas — LogiTrace (ejecucion-1)

Ejecución: 29/9/2026, 10:29:54 a. m. (hora de Venezuela) · duración 1.2 min

## Metodología

- **Participantes:** 12 usuarios de prueba **simulados** mediante un script automatizado (`BackEnd/scripts/pruebas/ejecutar-pruebas.js`), cada uno con su propia cuenta (rol OPERADOR) y sesión independiente. No corresponden a personas reales.
- **Rondas:** cada participante ejecutó los 14 casos 3 veces (Tiempo 1, 2 y 3). En la Tabla 2, cada "Tiempo k" es el promedio de los 12 participantes en la ronda k; el promedio general y las observaciones usan las 36 mediciones.
- **Tiempo de respuesta:** medido en el cliente desde el envío de la solicitud HTTP hasta la recepción completa de la respuesta (incluye red local, API Node.js/Express y PostgreSQL). En los escenarios (MR-12 a MR-14) es el tiempo total de todas las operaciones del flujo.
- **Criterio de resultado:** un caso *Cumple* para un participante si todas sus verificaciones se cumplen en las 3 rondas; *No cumple* si la operación falla en todas; *Parcial* en cualquier otro caso. El resultado global es *Cumple* solo si los 12 participantes cumplen.
- **Verificación:** cada criterio se comprueba con la respuesta de la API y, de forma independiente, consultando directamente la base de datos.

## Entorno de prueba

| Elemento | Valor |
|---|---|
| Sistema operativo | Windows_NT 10.0.26100 (x64) |
| Procesador | Intel(R) Core(TM) i3-2310M CPU @ 2.10GHz (4 hilos) |
| Memoria | 10 GB |
| Node.js | v24.14.1 |
| Base de datos | PostgreSQL 18.3 on x86_64-windows |
| Datos | logitrace_pruebas (aislada de la base de desarrollo); seed base + 60 días de operación demo |

## Tabla 1. Pruebas funcionales PF-01 – PF-14

| Código | Prueba | Resultado | Participantes | Observaciones |
|---|---|---|---|---|
| PF-01 | Registro de pedido | **Cumple** | 12/12 | Todas las verificaciones se cumplieron |
| PF-02 | Consulta del pedido | **Cumple** | 12/12 | Todas las verificaciones se cumplieron |
| PF-03 | Actualización del estado | **Cumple** | 12/12 | Todas las verificaciones se cumplieron |
| PF-04 | Asignación del despacho | **Cumple** | 12/12 | Todas las verificaciones se cumplieron |
| PF-05 | Registro de incidencia | **Cumple** | 12/12 | Todas las verificaciones se cumplieron |
| PF-06 | Registro de devolución | **Cumple** | 12/12 | Todas las verificaciones se cumplieron |
| PF-07 | Estado del producto retornado | **Cumple** | 12/12 | Todas las verificaciones se cumplieron |
| PF-08 | Actualización del inventario | **Parcial** | 0/12 | El inventario conserva el balance del ciclo (salida por despacho + reingreso) (valores variables) (36/36) |
| PF-09 | Historial de trazabilidad | **Parcial** | 0/12 | El historial incluye registro, despacho, incidencia, devolución e inventario (faltan: DESPACHO_ASIGNADO) (36/36) |
| PF-10 | Consulta de información relacionada | **Cumple** | 12/12 | Todas las verificaciones se cumplieron |
| PF-11 | Integridad de registros | **Cumple** | 12/12 | Todas las verificaciones se cumplieron |
| PF-12 | Escenario simulado de entrega | **Parcial** | 0/12 | El inventario refleja la salida de la mercancía entregada (valores variables) (36/36) |
| PF-13 | Escenario simulado de incidencia | **Cumple** | 12/12 | Todas las verificaciones se cumplieron |
| PF-14 | Escenario simulado de devolución | **Parcial** | 0/12 | El inventario conserva el balance tras la devolución (valores variables) (36/36) |

## Tabla 2. Medición de tiempos de respuesta MR-01 – MR-14

| Código | Operación evaluada | Condición / acción de prueba | Tiempo 1 (s) | Tiempo 2 (s) | Tiempo 3 (s) | Promedio (s) | Observaciones |
|---|---|---|---|---|---|---|---|
| MR-01 | Registro de pedido | Registrar un nuevo pedido con la información requerida. | 0,043 | 0,026 | 0,026 | **0,032** | n=36; mín 0,020 s; máx 0,179 s; desv. est. 0,027 s; 36/36 bajo 2 s |
| MR-02 | Consulta del pedido | Consultar un pedido previamente registrado. | 0,020 | 0,014 | 0,011 | **0,015** | n=36; mín 0,009 s; máx 0,112 s; desv. est. 0,018 s; 36/36 bajo 2 s |
| MR-03 | Actualización del estado | Modificar el estado de un pedido durante su gestión. | 0,029 | 0,028 | 0,027 | **0,028** | n=36; mín 0,021 s; máx 0,056 s; desv. est. 0,009 s; 36/36 bajo 2 s |
| MR-04 | Asignación del despacho | Asignar un pedido a un repartidor o responsable. | 0,059 | 0,036 | 0,062 | **0,052** | n=36; mín 0,027 s; máx 0,370 s; desv. est. 0,061 s; 36/36 bajo 2 s |
| MR-05 | Registro de incidencia | Registrar una incidencia asociada a un pedido. | 0,046 | 0,040 | 0,036 | **0,041** | n=36; mín 0,027 s; máx 0,115 s; desv. est. 0,017 s; 36/36 bajo 2 s |
| MR-06 | Registro de devolución | Registrar una devolución y su causa. | 0,075 | 0,062 | 0,062 | **0,066** | n=36; mín 0,043 s; máx 0,188 s; desv. est. 0,030 s; 36/36 bajo 2 s |
| MR-07 | Estado del producto retornado | Registrar la condición del producto al momento de la devolución. | 0,038 | 0,035 | 0,047 | **0,040** | n=36; mín 0,026 s; máx 0,162 s; desv. est. 0,024 s; 36/36 bajo 2 s |
| MR-08 | Actualización del inventario | Procesar una devolución y actualizar el inventario según el estado del producto. | 0,065 | 0,061 | 0,059 | **0,062** | n=36; mín 0,043 s; máx 0,106 s; desv. est. 0,016 s; 36/36 bajo 2 s |
| MR-09 | Historial de trazabilidad | Consultar el historial de operaciones de un pedido. | 0,041 | 0,041 | 0,056 | **0,046** | n=36; mín 0,029 s; máx 0,258 s; desv. est. 0,038 s; 36/36 bajo 2 s |
| MR-10 | Consulta de información relacionada | Consultar información vinculada con pedidos, despachos, incidencias y devoluciones. | 0,068 | 0,030 | 0,030 | **0,043** | n=36; mín 0,022 s; máx 0,286 s; desv. est. 0,057 s; 36/36 bajo 2 s |
| MR-11 | Integridad de registros | Realizar una operación y consultar posteriormente sus datos para verificar su conservación. | 0,046 | 0,042 | 0,043 | **0,044** | n=36; mín 0,029 s; máx 0,097 s; desv. est. 0,019 s; 36/36 bajo 2 s |
| MR-12 | Escenario simulado de entrega | Ejecutar un flujo de entrega sin incidencia. | 0,184 | 0,176 | 0,177 | **0,179** | n=36; mín 0,145 s; máx 0,289 s; desv. est. 0,039 s; 36/36 bajo 2 s |
| MR-13 | Escenario simulado de incidencia | Ejecutar una entrega en la que ocurra una incidencia. | 0,327 | 0,307 | 0,309 | **0,314** | n=36; mín 0,244 s; máx 0,696 s; desv. est. 0,091 s; 36/36 bajo 2 s |
| MR-14 | Escenario simulado de devolución | Ejecutar una devolución simulada de un pedido. | 0,562 | 0,473 | 0,541 | **0,525** | n=36; mín 0,396 s; máx 1,411 s; desv. est. 0,203 s; 36/36 bajo 2 s |

## Criterios de aceptación verificados por caso

**PF-01 Registro de pedido**

- La API acepta el registro (HTTP 201)
- Se genera un código único de pedido
- El pedido inicia en estado REGISTRADO
- El pedido y su detalle quedan guardados en la BD
- Se registra el evento PEDIDO_CREADO

**PF-02 Consulta del pedido**

- La consulta responde (HTTP 200)
- Devuelve el mismo código, cliente y dirección registrados
- Incluye los productos y cantidades del pedido

**PF-03 Actualización del estado**

- La API acepta el cambio de estado
- El pedido pasa a EN_PREPARACION
- Se rechaza una transición no permitida (EN_PREPARACION → ENTREGADO)
- El pedido avanza a LISTO_PARA_DESPACHO

**PF-04 Asignación del despacho**

- La API crea el despacho (HTTP 201)
- El despacho queda asignado al repartidor seleccionado
- El pedido queda vinculado como parada del despacho
- El repartidor deja de figurar como disponible
- Al salir a ruta el pedido pasa a EN_RUTA

**PF-05 Registro de incidencia**

- La API registra la incidencia (HTTP 201)
- La incidencia inicia en estado REPORTADA con su tipo
- El pedido asociado pasa a CON_INCIDENCIA
- Se registra el evento INCIDENCIA_REGISTRADA

**PF-06 Registro de devolución**

- La API registra la devolución (HTTP 201)
- Queda registrada la causa (motivo) y la incidencia de origen
- Se copian los productos y cantidades del pedido con su lote
- El pedido pasa a DEVUELTO

**PF-07 Estado del producto retornado**

- La API registra la evaluación del producto
- Se guarda la condición del sello y del empaque
- Se conserva la temperatura medida en la recepción
- La devolución pasa a EVALUADA

**PF-08 Actualización del inventario**

- La API procesa la decisión de reingreso
- El stock en cava aumenta en la cantidad reingresada
- Se registra el movimiento de inventario REINGRESO
- El inventario conserva el balance del ciclo (salida por despacho + reingreso)

**PF-09 Historial de trazabilidad**

- La consulta del expediente responde (HTTP 200)
- El historial incluye registro, despacho, incidencia, devolución e inventario
- Los eventos se presentan en orden cronológico
- Cada evento conserva usuario responsable y fecha

**PF-10 Consulta de información relacionada**

- Las tres consultas responden (HTTP 200)
- El despacho muestra el pedido como parada
- La incidencia muestra el pedido y el despacho asociados
- La devolución muestra la incidencia, el pedido y la evaluación

**PF-11 Integridad de registros**

- La operación se registra y se puede consultar después
- Los datos guardados en la BD coinciden con los enviados
- Los datos consultados por la API coinciden con los de la BD
- Se rechaza un registro con referencias inexistentes sin crear datos
- El pedido A conserva sus datos originales tras todo el ciclo

**PF-12 Escenario simulado de entrega**

- El pedido termina ENTREGADO
- La parada registra la hora de entrega
- El despacho queda FINALIZADO y el repartidor DISPONIBLE
- Se registra el evento ENTREGA_REGISTRADA
- El inventario refleja la salida de la mercancía entregada

**PF-13 Escenario simulado de incidencia**

- La incidencia recorre su ciclo hasta RESUELTA con decisión y fecha
- La entrega se completa (pedido ENTREGADO, despacho FINALIZADO)
- La trazabilidad registra incidencia, resolución y entrega

**PF-14 Escenario simulado de devolución**

- La devolución termina CERRADA
- El pedido queda DEVUELTO y el despacho FINALIZADO
- El repartidor queda DISPONIBLE
- El inventario conserva el balance tras la devolución

## Anexo A. Resultado por participante

| Código | PRB-01 | PRB-02 | PRB-03 | PRB-04 | PRB-05 | PRB-06 | PRB-07 | PRB-08 | PRB-09 | PRB-10 | PRB-11 | PRB-12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| PF-01 | C | C | C | C | C | C | C | C | C | C | C | C |
| PF-02 | C | C | C | C | C | C | C | C | C | C | C | C |
| PF-03 | C | C | C | C | C | C | C | C | C | C | C | C |
| PF-04 | C | C | C | C | C | C | C | C | C | C | C | C |
| PF-05 | C | C | C | C | C | C | C | C | C | C | C | C |
| PF-06 | C | C | C | C | C | C | C | C | C | C | C | C |
| PF-07 | C | C | C | C | C | C | C | C | C | C | C | C |
| PF-08 | P | P | P | P | P | P | P | P | P | P | P | P |
| PF-09 | P | P | P | P | P | P | P | P | P | P | P | P |
| PF-10 | C | C | C | C | C | C | C | C | C | C | C | C |
| PF-11 | C | C | C | C | C | C | C | C | C | C | C | C |
| PF-12 | P | P | P | P | P | P | P | P | P | P | P | P |
| PF-13 | C | C | C | C | C | C | C | C | C | C | C | C |
| PF-14 | P | P | P | P | P | P | P | P | P | P | P | P |

C = Cumple · P = Parcial · NC = No cumple

## Anexo B. Tiempo promedio por participante (s)

| Código | PRB-01 | PRB-02 | PRB-03 | PRB-04 | PRB-05 | PRB-06 | PRB-07 | PRB-08 | PRB-09 | PRB-10 | PRB-11 | PRB-12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| MR-01 | 0,077 | 0,023 | 0,022 | 0,022 | 0,022 | 0,024 | 0,026 | 0,044 | 0,037 | 0,025 | 0,032 | 0,027 |
| MR-02 | 0,012 | 0,010 | 0,010 | 0,010 | 0,010 | 0,009 | 0,010 | 0,056 | 0,016 | 0,010 | 0,014 | 0,011 |
| MR-03 | 0,035 | 0,024 | 0,023 | 0,025 | 0,022 | 0,023 | 0,023 | 0,036 | 0,042 | 0,022 | 0,035 | 0,028 |
| MR-04 | 0,073 | 0,038 | 0,034 | 0,031 | 0,033 | 0,030 | 0,034 | 0,079 | 0,167 | 0,035 | 0,039 | 0,036 |
| MR-05 | 0,059 | 0,038 | 0,035 | 0,034 | 0,033 | 0,030 | 0,028 | 0,069 | 0,051 | 0,035 | 0,039 | 0,038 |
| MR-06 | 0,089 | 0,058 | 0,054 | 0,050 | 0,048 | 0,051 | 0,050 | 0,136 | 0,083 | 0,056 | 0,054 | 0,065 |
| MR-07 | 0,035 | 0,041 | 0,031 | 0,034 | 0,027 | 0,029 | 0,028 | 0,059 | 0,086 | 0,035 | 0,033 | 0,037 |
| MR-08 | 0,068 | 0,056 | 0,050 | 0,054 | 0,059 | 0,049 | 0,055 | 0,094 | 0,079 | 0,055 | 0,062 | 0,059 |
| MR-09 | 0,046 | 0,034 | 0,035 | 0,031 | 0,040 | 0,030 | 0,039 | 0,129 | 0,052 | 0,039 | 0,036 | 0,041 |
| MR-10 | 0,118 | 0,030 | 0,025 | 0,027 | 0,026 | 0,026 | 0,028 | 0,111 | 0,037 | 0,030 | 0,030 | 0,025 |
| MR-11 | 0,053 | 0,040 | 0,032 | 0,034 | 0,035 | 0,030 | 0,034 | 0,093 | 0,060 | 0,038 | 0,036 | 0,037 |
| MR-12 | 0,177 | 0,168 | 0,158 | 0,150 | 0,159 | 0,150 | 0,182 | 0,250 | 0,225 | 0,151 | 0,208 | 0,167 |
| MR-13 | 0,303 | 0,291 | 0,274 | 0,264 | 0,252 | 0,266 | 0,350 | 0,469 | 0,390 | 0,273 | 0,371 | 0,269 |
| MR-14 | 0,470 | 0,472 | 0,434 | 0,417 | 0,410 | 0,462 | 0,574 | 0,762 | 0,835 | 0,451 | 0,587 | 0,429 |
