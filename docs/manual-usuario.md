# Manual de usuario — LogiTrace

Sistema de trazabilidad y despacho de SuperTequeños C.A. (Valera, Edo. Trujillo). Este manual explica,
por perfil, las tareas del día a día. Cada persona ve en el menú solo los módulos de su perfil.

## Índice

1. [Acceso al sistema](#1-acceso-al-sistema)
2. [Qué puede hacer cada perfil](#2-qué-puede-hacer-cada-perfil)
3. [Operador / despachador](#3-operador--despachador)
4. [Repartidor — «Mi ruta» en el teléfono](#4-repartidor--mi-ruta-en-el-teléfono)
5. [Supervisor](#5-supervisor)
6. [Administrador](#6-administrador)
7. [Preguntas frecuentes](#7-preguntas-frecuentes)

---

## 1. Acceso al sistema

1. Abra la dirección del sistema que le indique el administrador (por ejemplo `https://192.168.0.10`).
2. Escriba su **correo** y **contraseña** y pulse **Iniciar sesión**.
3. **Recordar sesión**: márquelo solo en un equipo propio. Sin marcar, la sesión termina al cerrar el navegador.

- **Modo claro / oscuro**: botón del sol / luna en la parte superior.
- **Cerrar sesión**: icono de salida, arriba a la derecha.
- Tras **5 intentos fallidos** la cuenta se bloquea **15 minutos** desde ese equipo. Si olvidó la
  contraseña, pídale al administrador que la restablezca.

## 2. Qué puede hacer cada perfil

| Tarea | Operador | Repartidor | Supervisor | Administrador |
|---|:-:|:-:|:-:|:-:|
| Registrar pedidos y clientes nuevos | ✔ | | ✔ | ✔ |
| Preparar pedidos y programar despachos | ✔ | | ✔ | ✔ |
| Seguir despachos (lista, tablero, mapa) | ✔ | | ✔ | ✔ |
| Registrar incidencias y devoluciones | ✔ | Incidencias de su ruta | ✔ | ✔ |
| Inventario, trazabilidad y residuos | ✔ | | ✔ | ✔ |
| «Mi ruta» con GPS | | ✔ | | |
| Cancelar pedidos, reasignar repartidor | | | ✔ | ✔ |
| Reportes y exportaciones (PDF / CSV) | | | ✔ | ✔ |
| Crear y editar catálogos | Solo clientes | | ✔ | ✔ |
| Usuarios, roles, parámetros y auditoría | | | | ✔ |

## 3. Operador / despachador

### 3.1 Registrar un pedido

**Pedidos → Nuevo pedido / emisión rápida**

1. **Cliente**: escriba el nombre, el código o la **cédula / RIF** (con o sin puntos). Elija de la lista
   con el ratón o con las flechas y *Enter*.
   - Si no existe, pulse **«Registrar … como cliente nuevo»**: indique tipo y número de documento,
     nombre y teléfono. El cliente queda creado y seleccionado sin salir del pedido. El sistema no
     permite registrar dos veces la misma cédula.
   - Si el cliente ya tiene pedidos, aparece **«Usar esta dirección»** para repetir la última entrega.
2. **Productos**: elija el producto y la cantidad (en la unidad base). **Agregar producto** añade líneas.
3. **Entrega**: *Despacho a domicilio* o *Retiro en planta*.
   - Escriba la dirección y un punto de referencia.
   - Marque el punto en el **mapa** (clic o **Usar mi ubicación actual**). Con el punto marcado, el
     sistema **sugiere la zona de despacho y el tipo de sector**; puede cambiarlos.
   - Indique la **fecha de entrega solicitada** si el cliente la pidió.
4. Pulse **Registrar pedido**. El pedido queda en estado *Registrado*.

### 3.2 Preparar el pedido

En el detalle del pedido (**Pedidos → clic en el código**):

1. **Enviar a preparación**: el sistema verifica que haya stock en la cava.
2. **Marcar listo para despacho**: se abre una confirmación con los **lotes que saldrán de la cava**
   (primero los que vencen antes). Revise y pulse **Descontar y marcar listo**.
   - Si falta stock, lo indica y no deja continuar.
   - Si luego se cancela el pedido, el stock vuelve a la cava.

### 3.3 Programar el despacho

**Despachos → Programar despacho**

1. Marque los pedidos *listos para despacho* en el **orden de entrega** (las flechas cambian el orden).
2. Elija el **repartidor disponible**; opcionalmente vehículo, ruta, medio de conservación y precinto.
3. Pulse **Programar despacho**. Si el botón está gris, el aviso debajo indica qué falta.

La **salida a ruta** la registra el repartidor al pulsar *Iniciar recorrido* en su teléfono, o la
oficina desde el detalle del despacho (**Registrar salida a ruta**, con confirmación).

### 3.4 Seguimiento

- **Despachos**: lista con filtros (*en ruta*, *completados hoy*…), acciones rápidas y disponibilidad de flota.
- **Tablero**: arrastre la tarjeta a la siguiente etapa. Pasar a *Finalizado* pide confirmación y
  avisa si quedan paradas sin entrega (se darían por entregadas).
- **Detalle del despacho → Recorrido**: mapa con el trayecto GPS del repartidor y sus paradas. Se
  actualiza solo mientras el despacho está en ruta.

### 3.5 Incidencias y devoluciones

- Las **incidencias** (cliente ausente, retraso, producto dañado…) las reporta normalmente el
  repartidor. En **Incidencias** se revisan, se atienden y se resuelven. Desde una incidencia se puede
  **Registrar devolución**.
- **Devoluciones**: **Registrar retorno de mercancía**, luego **Registrar recepción en planta** con la
  temperatura y el estado del producto, y **Decidir destino** (reingreso a la cava, cuarentena o descarte
  como residuo). El inventario se actualiza según la decisión.

### 3.6 Inventario, trazabilidad y residuos

- **Inventario**: *Existencias de producto terminado*, *Kardex de movimientos* y cuarentena. Desde un
  lote: **Kardex del lote**, **Registrar movimiento** (traslado, entrada…) y **Ajustar** stock.
- **Trazabilidad**: busque un pedido por código para ver su **expediente**: línea de tiempo, lotes,
  despacho, recorrido GPS, temperaturas, incidencias y devoluciones. **Registrar temperatura** agrega
  una lectura manual de la cadena de frío.
- **Residuos**: bitácora de residuos generados, gestores y destinos, y **Manifiestos y retiros**.

### 3.7 Catálogos

**Catálogos** (menú lateral): productos, clientes, zonas de despacho, tipos de sector, vehículos, tipos
de incidencia, motivos de devolución, tipos de residuo y gestores. El operador los consulta y puede
**registrar clientes**; crear y editar el resto corresponde al supervisor o al administrador.

## 4. Repartidor — «Mi ruta» en el teléfono

El repartidor solo trabaja desde **Mi ruta**: ve su despacho asignado y nada más.

**Antes de salir**

1. Abra el sistema en el navegador del teléfono (Chrome o Safari) con la dirección **https://** que
   le indicaron. El GPS del navegador solo funciona con HTTPS.
2. Inicie sesión. Se abre **Mi ruta** con su despacho, las paradas en orden y el mapa.
3. Pulse **Iniciar recorrido** al salir de planta y **permita el acceso a la ubicación** cuando el
   teléfono lo pregunte.

**Durante el recorrido**

- Mantenga **la pantalla de Mi ruta abierta**: con la pantalla apagada el navegador deja de enviar la
  ubicación (el sistema intenta mantenerla encendida).
- La ubicación se envía cada 30 segundos o cada 50 metros. Si **pierde la señal**, las posiciones se
  guardan en el teléfono (verá el aviso *«posiciones guardadas en el teléfono»*) y se envían solas al
  recuperar la conexión.
- **Pausar GPS** detiene el envío temporalmente (por ejemplo, en un descanso).
- En cada parada: **Cómo llegar** abre el mapa del teléfono y **Llamar** marca al cliente.

**En cada entrega**

- **Registrar entrega**: escriba el nombre de quien recibe (y observaciones si hace falta) y confirme.
- **Incidencia**: si no puede entregar (cliente ausente, dirección errada, producto dañado…), elija el
  tipo y descríbala. Esa parada queda en espera; **puede seguir con las demás paradas**.
- Cuando todas las paradas quedan cerradas, el despacho se finaliza solo y usted queda disponible.

## 5. Supervisor

Además de todo lo del operador:

- **Cancelar pedidos** (pide el motivo) y **reasignar el repartidor** de un despacho programado.
- **Reportes y Rendimiento Operativo**: eficacia de entregas, tiempos de ciclo, incidencias, tasa de
  retorno, cadena de frío y actividad, con comparación contra el periodo anterior. **Generar reporte** y
  **Generar reporte personalizado** exportan a PDF o CSV.
- Exportar a CSV las listas de incidencias, movimientos de inventario, trazabilidad y residuos, y el
  expediente PDF de un pedido.
- Crear, editar y desactivar registros de los catálogos. Desactivar pide confirmación; el historial se
  conserva y el registro puede reactivarse.
- En **Zonas de despacho** y **Tipos de sector**: **Editar → clic en el mapa** para fijar el centro y
  ajustar el **radio de cobertura**. Se sugiere el área más pequeña que contenga el punto de entrega.

## 6. Administrador

**Administración** (solo administrador):

- **Usuarios y accesos**: crear cuentas, asignar el perfil, activar / desactivar y **Restablecer
  contraseña**. Una cuenta desactivada no puede entrar aunque tenga la sesión abierta.
- **Roles y permisos RBAC**: consulta de lo que puede hacer cada perfil.
- **Catálogos del negocio** y **Parámetros de planta**: temperatura objetivo y límite crítico de la cava,
  y metas de los indicadores.
- **Registro de auditoría**: quién hizo cada operación y cuándo, incluidos los inicios de sesión fallidos.
- Solo el administrador puede **eliminar** registros de los catálogos (si no tienen historial asociado).

## 7. Preguntas frecuentes

**El botón «Programar despacho» está gris.** Falta marcar al menos un pedido o elegir el repartidor; el
aviso debajo del botón lo indica.

**No aparece ningún pedido para despachar.** Solo se listan los pedidos *listos para despacho*: primero
envíelos a preparación y márquelos como listos.

**«Stock insuficiente en cava».** No hay existencias disponibles del producto. Revise el inventario o
registre la entrada del lote antes de marcar el pedido como listo.

**El teléfono no comparte la ubicación.** Compruebe que la dirección empiece por **https://**, que el
navegador tenga permiso de ubicación (Ajustes del navegador → Sitios → Ubicación) y que el GPS del
teléfono esté encendido.

**La zona no se sugiere al marcar el mapa.** La zona o el sector necesitan centro y radio en el catálogo,
o el punto queda fuera de todas las áreas: elíjala a mano.

**«Demasiados intentos fallidos».** Espere 15 minutos o pida al administrador que restablezca la contraseña.
