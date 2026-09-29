# Pruebas funcionales y de tiempo de respuesta — LogiTrace

Evidencia de las pruebas PF-01 a PF-14 (funcionales) y MR-01 a MR-14 (tiempos de respuesta) del
Trabajo Especial de Grado.

## Cómo se ejecutan

```bash
cd BackEnd
node scripts/pruebas/ejecutar-pruebas.js --preparar            # reinicia la base aislada logitrace_pruebas
node scripts/pruebas/ejecutar-pruebas.js --etiqueta=ejecucion-3 # corre la batería y escribe docs/pruebas/ejecucion-3/
```

El script crea 12 usuarios de prueba (`participante01@pruebas.logitrace.local` … `participante12`, rol
OPERADOR), levanta su propia instancia del backend en el puerto 3101 contra la base `logitrace_pruebas`
y ejecuta 3 rondas de los 14 casos por participante. La base de desarrollo no se modifica.

> Los 12 participantes son **simulados** (sesiones automatizadas). Si la tesis exige usuarios reales,
> estas tablas sirven como línea base técnica y el mismo protocolo puede repetirse con personas.

## Contenido de cada ejecución

| Archivo | Uso |
|---|---|
| `informe-pruebas.md` | Informe completo: metodología, entorno, Tabla 1, Tabla 2, criterios y anexos |
| `tabla-1-pruebas-funcionales.csv` | Tabla 1 lista para Excel / Word |
| `tabla-2-tiempos-respuesta.csv` | Tabla 2 lista para Excel / Word |
| `anexo-pf-por-participante.csv` | Resultado de cada caso por participante |
| `anexo-mr-por-participante.csv` | Tiempo promedio de cada operación por participante |
| `resultados.json` | Datos crudos: cada verificación y cada tiempo medido |

## Historial

> Las carpetas `ejecucion-2` y `ejecucion-3` se conservan solo en el equipo del autor (excluidas en
> `.gitignore`); el repositorio mantiene el script para regenerarlas y la `ejecucion-1` como evidencia
> del defecto detectado.

| Ejecución | Resultado | Notas |
|---|---|---|
| `ejecucion-1` | 10 Cumple · 4 Parcial | Detectó un defecto real: al preparar un pedido desde la interfaz no se descontaba inventario, pero el reingreso de una devolución sí lo sumaba (PF-08, PF-12 y PF-14). La observación de PF-09 se debió a un nombre de evento mal indicado en el propio script de prueba (`DESPACHO_ASIGNADO` en lugar de `DESPACHO_CREADO`); no era un defecto del sistema. |
| `ejecucion-3` | 14 Cumple (12/12 participantes) | Prueba de regresión tras la Fase 10: cada solicitud verifica ahora en la BD el estado y el rol de la cuenta, y las operaciones de escritura se registran en auditoría. Resultados y tiempos equivalentes a `ejecucion-2`. |
| `ejecucion-2` | 14 Cumple (12/12 participantes) | Tras corregir el defecto: al marcar un pedido "listo para despacho" se asignan los lotes de la cava por FEFO, se descuenta el stock y se registran los movimientos de salida; el despacho vincula esos lotes a la parada y la cancelación de un pedido preparado devuelve el stock. |
