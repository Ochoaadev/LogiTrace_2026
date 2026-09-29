// Datos de demostración para el módulo 07 (Trazabilidad): crea dos expedientes completos
// identificados con el prefijo DEMO- para poder probar la pantalla sin operar todo el flujo.
//
//   node scripts/seed-demo-trazabilidad.js           → crea (o recrea) los datos demo
//   node scripts/seed-demo-trazabilidad.js --limpiar → elimina solo los datos demo
//
// Requiere el seed base (clientes, productos, lotes, ubicaciones, repartidores, vehículos...).
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const PREFIJO = 'DEMO-'
const CANTIDAD_REINGRESO = 35

// Hora local de Venezuela (UTC-4) del día de hoy
function hoy(hhmm) {
  const fecha = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' })
  return new Date(`${fecha}T${hhmm}:00-04:00`)
}

async function limpiar() {
  const pedidos = await prisma.pedido.findMany({ where: { codigo: { startsWith: PREFIJO } }, select: { id: true } })
  const despachos = await prisma.despacho.findMany({ where: { codigo: { startsWith: PREFIJO } }, select: { id: true } })
  const devoluciones = await prisma.devolucion.findMany({ where: { codigo: { startsWith: PREFIJO } }, select: { id: true } })
  const incidencias = await prisma.incidencia.findMany({ where: { codigo: { startsWith: PREFIJO } }, select: { id: true } })
  const pedidoIds = pedidos.map((p) => p.id)
  const despachoIds = despachos.map((d) => d.id)
  const devolucionIds = devoluciones.map((d) => d.id)
  const incidenciaIds = incidencias.map((i) => i.id)

  await prisma.$transaction(async (tx) => {
    // Revertir el stock que sumó el reingreso demo antes de borrar el movimiento
    const movimientos = await tx.movimientoInventario.findMany({
      where: { referenciaTipo: 'Devolucion', referenciaId: { in: devolucionIds } },
    })
    for (const m of movimientos) {
      if (m.ubicacionDestinoId) {
        await tx.inventario.updateMany({
          where: { loteId: m.loteId, ubicacionId: m.ubicacionDestinoId },
          data: { stockActual: { decrement: m.cantidad } },
        })
      }
    }
    await tx.movimientoInventario.deleteMany({ where: { id: { in: movimientos.map((m) => m.id) } } })

    await tx.eventoTrazabilidad.deleteMany({
      where: {
        OR: [
          { pedidoId: { in: pedidoIds } },
          { entidadTipo: 'Despacho', entidadId: { in: despachoIds } },
          { entidadTipo: 'Incidencia', entidadId: { in: incidenciaIds } },
          { entidadTipo: 'Devolucion', entidadId: { in: devolucionIds } },
        ],
      },
    })
    await tx.evaluacionDevolucion.deleteMany({ where: { devolucionId: { in: devolucionIds } } })
    await tx.registroTemperatura.deleteMany({
      where: { OR: [{ despachoId: { in: despachoIds } }, { devolucionId: { in: devolucionIds } }] },
    })
    await tx.detalleDevolucion.deleteMany({ where: { devolucionId: { in: devolucionIds } } })
    await tx.devolucion.deleteMany({ where: { id: { in: devolucionIds } } })
    await tx.incidencia.deleteMany({ where: { id: { in: incidenciaIds } } })
    await tx.ubicacionGPS.deleteMany({ where: { despachoId: { in: despachoIds } } })
    await tx.despacho.deleteMany({ where: { id: { in: despachoIds } } }) // cascada: DespachoPedido, DetalleDespacho
    await tx.pedido.deleteMany({ where: { id: { in: pedidoIds } } }) // cascada: DetallePedido
  })

  console.log(`Datos demo eliminados: ${pedidoIds.length} pedido(s), ${despachoIds.length} despacho(s)`)
}

async function requerido(modelo, where, descripcion) {
  const r = await prisma[modelo].findFirst({ where })
  if (!r) throw new Error(`Falta en el seed base: ${descripcion}. Ejecuta primero "npm run prisma:seed".`)
  return r
}

async function crear() {
  const cliente = await requerido('cliente', { codigo: 'CLI-001' }, 'cliente CLI-001')
  const cliente2 = await requerido('cliente', { codigo: 'CLI-002' }, 'cliente CLI-002')
  const zona = await requerido('zonaDespacho', { codigo: 'ZON-001' }, 'zona ZON-001')
  const operador = await requerido('usuario', { rol: 'OPERADOR' }, 'un usuario OPERADOR')
  const supervisor = (await prisma.usuario.findFirst({ where: { rol: 'SUPERVISOR' } })) || operador
  const repartidor = await requerido('repartidor', {}, 'un repartidor')
  const vehiculo = await requerido('vehiculo', { activo: true }, 'un vehículo activo')
  const cava = await requerido('ubicacionAlmacen', { tipo: 'CAVA' }, 'una ubicación tipo CAVA')
  const lote = await requerido('lote', { producto: { codigo: { startsWith: 'TEQ' } } }, 'un lote de tequeños')
  const producto = await prisma.producto.findUnique({ where: { id: lote.productoId } })
  const tipoIncidencia = await requerido('tipoIncidencia', { codigo: 'INC-003' }, 'tipo de incidencia INC-003')
  const motivo = await requerido('motivoDevolucion', { codigo: 'DEV-005' }, 'motivo de devolución DEV-005')

  await prisma.$transaction(async (tx) => {
    // ---------- Expediente 1: con incidencia y logística inversa (escenario del Figma)
    const pedido = await tx.pedido.create({
      data: {
        codigo: 'DEMO-P-0001',
        clienteId: cliente.id,
        zonaId: zona.id,
        fechaHora: hoy('07:30'),
        estado: 'DEVUELTO',
        prioridad: 'ALTA',
        direccionEntrega: 'Av. Bolívar c/ Calle 10, Valera',
        referenciaEntrega: 'Frente a la plaza',
        latitudEntrega: 9.3186,
        longitudEntrega: -70.6035,
        creadoPorId: operador.id,
        detalles: { create: [{ productoId: producto.id, cantidad: 35, unidad: 'bandeja' }] },
      },
      include: { detalles: true },
    })
    const detalle = pedido.detalles[0]

    const despacho = await tx.despacho.create({
      data: {
        codigo: 'DEMO-D-0001',
        repartidorId: repartidor.id,
        vehiculoId: vehiculo.id,
        estado: 'FINALIZADO',
        fechaHoraSalida: hoy('09:40'),
        fechaHoraCierre: hoy('11:25'),
        medioConservacion: 'Caja isotérmica #04',
        precintoSeguridad: 'DEMO-PREC-9024',
      },
    })
    const dp = await tx.despachoPedido.create({
      data: {
        despachoId: despacho.id,
        pedidoId: pedido.id,
        ordenParada: 1,
        estado: 'DEVUELTO',
        horaLlegada: hoy('10:10'),
        detalles: { create: [{ detallePedidoId: detalle.id, loteId: lote.id, cantidad: 35, unidad: 'bandeja' }] },
      },
    })

    // Recorrido GPS: planta → centro de Valera → retorno
    const ruta = [
      ['09:40', 9.3071, -70.6121], ['09:48', 9.3102, -70.6093], ['09:55', 9.3131, -70.6068],
      ['10:02', 9.3160, -70.6049], ['10:10', 9.3186, -70.6035], ['10:50', 9.3140, -70.6070],
      ['11:05', 9.3071, -70.6121],
    ]
    const puntos = []
    for (const [hora, lat, lng] of ruta) {
      puntos.push(await tx.ubicacionGPS.create({
        data: { despachoId: despacho.id, repartidorId: repartidor.id, latitud: lat, longitud: lng, velocidadKmh: 28, fechaHora: hoy(hora) },
      }))
    }

    const incidencia = await tx.incidencia.create({
      data: {
        codigo: 'DEMO-INC-0041',
        despachoPedidoId: dp.id,
        tipoIncidenciaId: tipoIncidencia.id,
        reportadoPorId: repartidor.usuarioId,
        fechaHora: hoy('10:15'),
        latitud: 9.3186,
        longitud: -70.6035,
        descripcion: 'Cliente temporalmente ausente por corte eléctrico en la zona. Repartidor aplica protocolo de espera de 15 minutos en sombra.',
        decisionOperativa: 'Retorno inmediato a planta para preservar cadena de frío',
        estado: 'RESUELTA',
        resueltaPorId: supervisor.id,
        fechaResolucion: hoy('10:45'),
      },
    })

    const devolucion = await tx.devolucion.create({
      data: {
        codigo: 'DEMO-DEV-0019',
        despachoPedidoId: dp.id,
        incidenciaId: incidencia.id,
        motivoId: motivo.id,
        estado: 'CERRADA',
        fechaRegistro: hoy('10:45'),
        fechaRecepcion: hoy('11:10'),
        recibidoPorId: supervisor.id,
        observaciones: 'El cliente no puede recibir producto refrigerado por avería en su congelador.',
        detalles: {
          create: [{ detallePedidoId: detalle.id, loteId: lote.id, cantidad: CANTIDAD_REINGRESO, unidad: 'bandeja', estadoProducto: 'APTO_PARA_VENTA', decision: 'REINGRESO' }],
        },
      },
    })

    // Cadena de frío (registros manuales)
    const temp = (hora, t, tipo, extra) =>
      tx.registroTemperatura.create({ data: { tipoRegistro: tipo, temperaturaC: t, fechaHora: hoy(hora), usuarioId: operador.id, ...extra } })
    await temp('08:15', -18.6, 'CAVA', { ubicacionId: cava.id, despachoId: despacho.id, observaciones: 'Salida de cava' })
    await temp('09:40', -17.8, 'VEHICULO_SALIDA', { despachoId: despacho.id, observaciones: 'En ruta' })
    await temp('10:30', -17.1, 'OTRA', { despachoId: despacho.id, observaciones: 'Durante la espera' })
    const tRecepcion = await temp('11:10', -16.5, 'RECEPCION_DEVOLUCION', { devolucionId: devolucion.id, observaciones: 'Reingreso a planta' })

    await tx.evaluacionDevolucion.create({
      data: {
        devolucionId: devolucion.id,
        registroTemperaturaId: tRecepcion.id,
        selloIntegro: true,
        condicionEmpaque: 'Íntegro',
        observaciones: 'Lote verificado sin quiebre térmico.',
        evaluadoPorId: supervisor.id,
        fechaHora: hoy('11:15'),
      },
    })

    const movimiento = await tx.movimientoInventario.create({
      data: {
        tipo: 'REINGRESO', loteId: lote.id, ubicacionDestinoId: cava.id, cantidad: CANTIDAD_REINGRESO, unidad: 'bandeja',
        usuarioId: supervisor.id, referenciaTipo: 'Devolucion', referenciaId: devolucion.id, fechaHora: hoy('11:25'),
        observaciones: `Reingreso por devolución ${devolucion.codigo}`,
      },
    })
    await tx.inventario.upsert({
      where: { loteId_ubicacionId: { loteId: lote.id, ubicacionId: cava.id } },
      update: { stockActual: { increment: CANTIDAD_REINGRESO } },
      create: { loteId: lote.id, ubicacionId: cava.id, stockActual: CANTIDAD_REINGRESO, stockMinimo: 0 },
    })

    const evento = (hora, data) => tx.eventoTrazabilidad.create({ data: { fechaHora: hoy(hora), ...data } })
    await evento('07:30', { pedidoId: pedido.id, usuarioId: operador.id, tipoEvento: 'PEDIDO_CREADO', entidadTipo: 'Pedido', entidadId: pedido.id, estadoNuevo: 'REGISTRADO', descripcion: 'Pedido recibido y validado en sistema central. Enviado a línea de preparación.' })
    await evento('08:15', { pedidoId: pedido.id, usuarioId: operador.id, tipoEvento: 'PEDIDO_PREPARADO', entidadTipo: 'Pedido', entidadId: pedido.id, estadoAnterior: 'EN_PREPARACION', estadoNuevo: 'LISTO_PARA_DESPACHO', descripcion: `Preparado en cava con lote ${lote.codigo} (-18.6 °C).` })
    await evento('09:30', { usuarioId: operador.id, tipoEvento: 'DESPACHO_CREADO', entidadTipo: 'Despacho', entidadId: despacho.id, estadoNuevo: 'PREPARANDO', descripcion: `Asignado a ${despacho.codigo}, orden de parada 1. Precinto ${despacho.precintoSeguridad}.` })
    await evento('09:40', { usuarioId: repartidor.usuarioId, tipoEvento: 'SALIDA_DESPACHO', entidadTipo: 'Despacho', entidadId: despacho.id, estadoAnterior: 'PREPARANDO', estadoNuevo: 'EN_RUTA', descripcion: 'Salida registrada de planta con rumbo al centro de Valera.', ubicacionGPSId: puntos[0].id })
    await evento('10:15', { pedidoId: pedido.id, usuarioId: repartidor.usuarioId, tipoEvento: 'INCIDENCIA_REGISTRADA', entidadTipo: 'Incidencia', entidadId: incidencia.id, estadoNuevo: 'REPORTADA', descripcion: incidencia.descripcion, ubicacionGPSId: puntos[4].id })
    await evento('10:45', { pedidoId: pedido.id, usuarioId: supervisor.id, tipoEvento: 'INCIDENCIA_RESUELTA', entidadTipo: 'Incidencia', entidadId: incidencia.id, estadoAnterior: 'EN_ATENCION', estadoNuevo: 'RESUELTA', descripcion: incidencia.decisionOperativa })
    await evento('10:45', { pedidoId: pedido.id, usuarioId: supervisor.id, tipoEvento: 'DEVOLUCION_REGISTRADA', entidadTipo: 'Devolucion', entidadId: devolucion.id, estadoNuevo: 'SOLICITADA', descripcion: devolucion.observaciones })
    await evento('11:10', { pedidoId: pedido.id, usuarioId: supervisor.id, tipoEvento: 'DEVOLUCION_RECIBIDA', entidadTipo: 'Devolucion', entidadId: devolucion.id, estadoAnterior: 'EN_TRASLADO', estadoNuevo: 'RECIBIDA', descripcion: 'Recepción en planta a -16.5 °C, sello íntegro.' })
    await evento('11:15', { pedidoId: pedido.id, usuarioId: supervisor.id, tipoEvento: 'PRODUCTO_EVALUADO', entidadTipo: 'Devolucion', entidadId: devolucion.id, estadoAnterior: 'RECIBIDA', estadoNuevo: 'EVALUADA', descripcion: 'Producto apto para venta. Decisión: reingreso.' })
    await evento('11:25', { pedidoId: pedido.id, usuarioId: supervisor.id, tipoEvento: 'INVENTARIO_ACTUALIZADO', entidadTipo: 'Inventario', entidadId: movimiento.id, descripcion: `Reingreso de ${CANTIDAD_REINGRESO} bandejas del lote ${lote.codigo} a ${cava.nombre}.` })

    // ---------- Expediente 2: entrega conforme, sin novedades
    const pedido2 = await tx.pedido.create({
      data: {
        codigo: 'DEMO-P-0002', clienteId: cliente2.id, zonaId: zona.id, fechaHora: hoy('08:05'), estado: 'ENTREGADO',
        direccionEntrega: 'Calle 8, Centro, Valera', latitudEntrega: 9.3165, longitudEntrega: -70.6010, creadoPorId: operador.id,
        detalles: { create: [{ productoId: producto.id, cantidad: 12, unidad: 'bandeja' }] },
      },
      include: { detalles: true },
    })
    const despacho2 = await tx.despacho.create({
      data: {
        codigo: 'DEMO-D-0002', repartidorId: repartidor.id, vehiculoId: vehiculo.id, estado: 'FINALIZADO',
        fechaHoraSalida: hoy('09:00'), fechaHoraCierre: hoy('09:35'), medioConservacion: 'Caja isotérmica #02', precintoSeguridad: 'DEMO-PREC-9031',
      },
    })
    await tx.despachoPedido.create({
      data: {
        despachoId: despacho2.id, pedidoId: pedido2.id, ordenParada: 1, estado: 'ENTREGADO', horaLlegada: hoy('09:25'), horaEntrega: hoy('09:30'), receptor: 'M. Morales',
        detalles: { create: [{ detallePedidoId: pedido2.detalles[0].id, loteId: lote.id, cantidad: 12, unidad: 'bandeja' }] },
      },
    })
    for (const [hora, lat, lng] of [['09:00', 9.3071, -70.6121], ['09:12', 9.3110, -70.6070], ['09:25', 9.3165, -70.6010]]) {
      await tx.ubicacionGPS.create({ data: { despachoId: despacho2.id, repartidorId: repartidor.id, latitud: lat, longitud: lng, fechaHora: hoy(hora) } })
    }
    await tx.registroTemperatura.create({ data: { tipoRegistro: 'VEHICULO_SALIDA', despachoId: despacho2.id, temperaturaC: -18.2, fechaHora: hoy('09:00'), usuarioId: operador.id } })
    await evento('08:05', { pedidoId: pedido2.id, usuarioId: operador.id, tipoEvento: 'PEDIDO_CREADO', entidadTipo: 'Pedido', entidadId: pedido2.id, estadoNuevo: 'REGISTRADO', descripcion: 'Pedido registrado.' })
    await evento('08:50', { usuarioId: operador.id, tipoEvento: 'DESPACHO_CREADO', entidadTipo: 'Despacho', entidadId: despacho2.id, estadoNuevo: 'PREPARANDO', descripcion: `Asignado a ${despacho2.codigo}.` })
    await evento('09:00', { usuarioId: repartidor.usuarioId, tipoEvento: 'SALIDA_DESPACHO', entidadTipo: 'Despacho', entidadId: despacho2.id, estadoAnterior: 'PREPARANDO', estadoNuevo: 'EN_RUTA', descripcion: 'Salida de planta.' })
    await evento('09:30', { pedidoId: pedido2.id, usuarioId: repartidor.usuarioId, tipoEvento: 'ENTREGA_REGISTRADA', entidadTipo: 'Despacho', entidadId: despacho2.id, estadoAnterior: 'EN_RUTA', estadoNuevo: 'ENTREGADO', descripcion: 'Entrega conforme. Recibió M. Morales con firma digital.' })
  })

  console.log('Datos demo creados: DEMO-P-0001 (con incidencia y devolución) y DEMO-P-0002 (entrega conforme)')
}

async function main() {
  await limpiar()
  if (!process.argv.includes('--limpiar')) await crear()
}

main()
  .catch((e) => {
    console.error(e.message)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
