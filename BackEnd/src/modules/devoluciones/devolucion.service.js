const prisma = require('../../config/database')
const { getPagination } = require('../../utils/pagination')
const { AppError } = require('../../utils/AppError')
const { codigoUnico } = require('../../utils/codigos')
const { LIMITE_CRITICO_C } = require('../trazabilidad/expediente.service')
const { PARAMETROS } = require('../../config/parametros')

// Cierra un despacho cuyas paradas quedaron todas devueltas y libera al repartidor (antes el
// repartidor quedaba EN_RUTA y ya no aparecía como disponible)
async function finalizarDespacho(tx, despachoId) {
  const despacho = await tx.despacho.update({
    where: { id: despachoId },
    data: { estado: 'FINALIZADO', fechaHoraCierre: new Date() },
  })
  if (despacho.repartidorId) {
    await tx.repartidor.update({ where: { id: despacho.repartidorId }, data: { estado: 'DISPONIBLE' } })
  }
}

async function listDevoluciones(query) {
  const { page, limit, skip } = getPagination(query)
  const { estado, motivoId, despachoPedidoId, fechaDesde, fechaHasta, search, activas } = query

  const where = {}

  // "Activas": aún en proceso de logística inversa (sin dictamen final)
  if (activas === 'true') where.estado = { in: ['SOLICITADA', 'EN_TRASLADO', 'RECIBIDA', 'EVALUADA'] }
  if (estado) where.estado = estado
  if (motivoId) where.motivoId = motivoId
  if (despachoPedidoId) where.despachoPedidoId = despachoPedidoId
  if (fechaDesde || fechaHasta) {
    where.fechaRegistro = {}
    if (fechaDesde) where.fechaRegistro.gte = new Date(fechaDesde)
    if (fechaHasta) where.fechaRegistro.lte = new Date(fechaHasta)
  }
  if (search) {
    where.OR = [
      { codigo: { contains: search, mode: 'insensitive' } },
      { despachoPedido: { pedido: { codigo: { contains: search, mode: 'insensitive' } } } },
      { motivo: { nombre: { contains: search, mode: 'insensitive' } } },
      { despachoPedido: { pedido: { cliente: { razonSocial: { contains: search, mode: 'insensitive' } } } } },
    ]
  }

  const [devoluciones, total] = await Promise.all([
    prisma.devolucion.findMany({
      where,
      skip,
      take: limit,
      orderBy: { fechaRegistro: 'desc' },
      include: {
        despachoPedido: {
          include: {
            pedido: { select: { id: true, codigo: true, cliente: { select: { razonSocial: true } } } },
            despacho: { select: { id: true, codigo: true, repartidor: { include: { usuario: { select: { nombre: true } } } } } },
          },
        },
        incidencia: { select: { id: true, codigo: true, tipo: { select: { nombre: true } } } },
        motivo: { select: { id: true, codigo: true, nombre: true } },
        recibidoPor: { select: { id: true, nombre: true, codigo: true } },
        evaluacion: { include: { evaluadoPor: { select: { nombre: true } } } },
        // Temperatura de retorno (última medición) y productos devueltos para la tabla y el dictamen
        registrosTemp: { orderBy: { fechaHora: 'desc' }, take: 1, select: { temperaturaC: true, fechaHora: true } },
        detalles: {
          select: {
            id: true,
            cantidad: true,
            unidad: true,
            estadoProducto: true,
            decision: true,
            loteId: true,
            lote: { select: { codigo: true } },
            detallePedido: { select: { producto: { select: { nombre: true } } } },
          },
        },
        _count: { select: { detalles: true } },
      },
    }),
    prisma.devolucion.count({ where }),
  ])

  return { data: devoluciones, total, page, limit }
}

function inicioDiaVE(offsetDias = 0) {
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' })
  const d = new Date(`${hoy}T00:00:00-04:00`)
  d.setDate(d.getDate() + offsetDias)
  return d
}

const TASA_RETORNO_MAX = PARAMETROS.tasaRetornoMax

/**
 * Indicadores del módulo 05 (tarjetas, últimas decisiones) y paradas a las que se puede
 * registrar un retorno. Período semanal: últimos 7 días.
 */
async function getResumenDevoluciones() {
  const semana = inicioDiaVE(-6)

  const [pendientes, reingresos, descartes, cuarentenas, devueltasSemana, entregasSemana, ultimosMov, ultimosRes, elegibles] = await Promise.all([
    prisma.devolucion.findMany({
      where: { estado: { in: ['RECIBIDA', 'EVALUADA'] } },
      orderBy: { fechaRecepcion: 'asc' },
      select: { codigo: true, estado: true },
    }),
    prisma.movimientoInventario.findMany({
      where: { referenciaTipo: 'Devolucion', fechaHora: { gte: semana }, ubicacionDestino: { tipo: { not: 'CUARENTENA' } } },
      select: { cantidad: true, ubicacionDestino: { select: { nombre: true } } },
    }),
    prisma.residuo.findMany({ where: { devolucionId: { not: null }, fechaGeneracion: { gte: semana } }, select: { cantidad: true, unidad: true } }),
    prisma.movimientoInventario.count({ where: { referenciaTipo: 'Devolucion', fechaHora: { gte: semana }, ubicacionDestino: { tipo: 'CUARENTENA' } } }),
    prisma.devolucion.count({ where: { fechaRegistro: { gte: semana }, estado: { not: 'CANCELADA' } } }),
    prisma.despachoPedido.count({ where: { OR: [{ horaEntrega: { gte: semana } }, { estado: 'DEVUELTO', despacho: { fechaHoraSalida: { gte: semana } } }] } }),
    prisma.movimientoInventario.findMany({
      where: { referenciaTipo: 'Devolucion' },
      orderBy: { fechaHora: 'desc' },
      take: 5,
      select: {
        id: true, cantidad: true, unidad: true, fechaHora: true, referenciaId: true,
        lote: { select: { id: true, codigo: true } },
        ubicacionDestino: { select: { nombre: true, tipo: true } },
      },
    }),
    prisma.residuo.findMany({
      where: { devolucionId: { not: null } },
      orderBy: { fechaGeneracion: 'desc' },
      take: 5,
      select: { id: true, codigo: true, cantidad: true, unidad: true, fechaGeneracion: true, devolucionId: true, tipoResiduo: { select: { nombre: true } } },
    }),
    // Paradas que pueden generar un retorno: en ruta, con incidencia o entregadas en la última semana
    prisma.despachoPedido.findMany({
      where: {
        devoluciones: { none: { estado: { not: 'CANCELADA' } } },
        OR: [
          { estado: { in: ['PENDIENTE', 'EN_RUTA', 'EN_ESPERA', 'CON_INCIDENCIA'] }, despacho: { estado: { in: ['EN_RUTA', 'CON_INCIDENCIA'] } } },
          { estado: 'ENTREGADO', horaEntrega: { gte: semana } },
        ],
      },
      take: 50,
      orderBy: { despacho: { codigo: 'desc' } },
      select: {
        id: true,
        estado: true,
        pedido: { select: { codigo: true, cliente: { select: { razonSocial: true } } } },
        despacho: { select: { codigo: true } },
        incidencias: { where: { estado: { not: 'CANCELADA' } }, select: { id: true, codigo: true }, take: 1 },
      },
    }),
  ])

  const codigosDev = await prisma.devolucion.findMany({
    where: { id: { in: [...ultimosMov.map((m) => m.referenciaId), ...ultimosRes.map((r) => r.devolucionId)].filter(Boolean) } },
    select: { id: true, codigo: true },
  })
  const codigoDe = (id) => codigosDev.find((d) => d.id === id)?.codigo

  const ultimasDecisiones = [
    ...ultimosMov.map((m) => ({
      tipo: m.ubicacionDestino?.tipo === 'CUARENTENA' ? 'CUARENTENA' : 'REINGRESO',
      fechaHora: m.fechaHora,
      titulo: `Lote ${m.lote?.codigo} ${m.ubicacionDestino?.tipo === 'CUARENTENA' ? 'retenido en' : 'reingresado a'} ${m.ubicacionDestino?.nombre}`,
      detalle: `${Number(m.cantidad)} ${m.unidad}`,
      devolucion: codigoDe(m.referenciaId),
      devolucionId: m.referenciaId,
      referencia: { etiqueta: 'Kardex del lote', to: `/inventario/movimiento/${m.lote?.id}` },
    })),
    ...ultimosRes.map((r) => ({
      tipo: 'DESCARTE',
      fechaHora: r.fechaGeneracion,
      titulo: `Descarte registrado como residuo (${r.tipoResiduo?.nombre})`,
      detalle: `${Number(r.cantidad)} ${r.unidad}`,
      devolucion: codigoDe(r.devolucionId),
      devolucionId: r.devolucionId,
      referencia: { etiqueta: `Residuo ${r.codigo}`, to: '/residuos' },
    })),
  ].sort((a, b) => b.fechaHora - a.fechaHora).slice(0, 5)

  return {
    pendientesDictamen: { total: pendientes.length, siguiente: pendientes[0]?.codigo || null },
    reingresosSemana: {
      movimientos: reingresos.length,
      cantidad: reingresos.reduce((s, m) => s + Number(m.cantidad), 0),
      ubicaciones: [...new Set(reingresos.map((m) => m.ubicacionDestino?.nombre).filter(Boolean))],
    },
    descartesSemana: { residuos: descartes.length, cantidad: descartes.reduce((s, r) => s + Number(r.cantidad), 0) },
    cuarentenasSemana: cuarentenas,
    tasaRetorno: {
      porcentaje: entregasSemana ? Math.round((devueltasSemana / entregasSemana) * 1000) / 10 : null,
      devoluciones: devueltasSemana,
      entregas: entregasSemana,
      maximo: TASA_RETORNO_MAX,
    },
    ultimasDecisiones,
    paradasElegibles: elegibles.map((dp) => ({
      despachoPedidoId: dp.id,
      estado: dp.estado,
      pedido: dp.pedido.codigo,
      cliente: dp.pedido.cliente?.razonSocial,
      despacho: dp.despacho.codigo,
      incidencia: dp.incidencias[0] || null,
    })),
    limiteCriticoC: LIMITE_CRITICO_C,
  }
}

async function getDevolucionById(id) {
  const devolucion = await prisma.devolucion.findUnique({
    where: { id },
    include: {
      despachoPedido: {
        include: {
          pedido: {
            include: {
              cliente: { select: { id: true, codigo: true, razonSocial: true, telefono: true } },
              detalles: { include: { producto: { select: { id: true, codigo: true, nombre: true } } } },
            },
          },
          despacho: {
            include: {
              repartidor: { include: { usuario: { select: { nombre: true } } } },
              vehiculo: { select: { codigo: true, placa: true } },
            },
          },
        },
      },
      incidencia: { include: { tipo: true } },
      motivo: true,
      recibidoPor: { select: { id: true, nombre: true, codigo: true } },
      evaluacion: {
        include: {
          evaluadoPor: { select: { id: true, nombre: true, codigo: true } },
          registroTemperatura: true,
        },
      },
      detalles: {
        include: {
          detallePedido: { include: { producto: { select: { id: true, codigo: true, nombre: true } } } },
          lote: true,
        },
      },
      registrosTemp: { orderBy: { fechaHora: 'desc' } },
      residuos: { include: { tipoResiduo: true, gestor: true } },
    },
  })
  if (!devolucion) throw new AppError('Devolución no encontrada', 404)
  return { ...devolucion, limiteCriticoC: LIMITE_CRITICO_C }
}

async function createDevolucion(data, usuarioId) {
  const { despachoPedidoId, motivoId, incidenciaId, observaciones } = data

  const dp = await prisma.despachoPedido.findUnique({
    where: { id: despachoPedidoId },
    include: {
      // Lotes despachados en esta parada: la devolución debe referir al lote que salió
      pedido: { include: { detalles: { include: { detallesDespacho: { where: { despachoPedidoId } } } } } },
      despacho: true,
    },
  })
  if (!dp) throw new AppError('Despacho-pedido no encontrado', 404)
  if (dp.estado === 'DEVUELTO') throw new AppError('Este pedido ya tiene una devolución registrada', 400)
  if (dp.estado === 'REPROGRAMADO') throw new AppError('El pedido está reprogramado, no se puede devolver', 400)

  const motivo = await prisma.motivoDevolucion.findUnique({ where: { id: motivoId } })
  if (!motivo) throw new AppError('Motivo de devolución no encontrado', 404)
  if (!motivo.activo) throw new AppError('Motivo inactivo', 400)

  if (incidenciaId) {
    const incidencia = await prisma.incidencia.findUnique({ where: { id: incidenciaId } })
    if (!incidencia) throw new AppError('Incidencia no encontrada', 404)
    if (incidencia.despachoPedidoId !== despachoPedidoId) {
      throw new AppError('La incidencia no corresponde a este despacho-pedido', 400)
    }
  }

  const codigo = await codigoUnico('DEV', 'devolucion')

  const devolucion = await prisma.$transaction(async (tx) => {
    const nueva = await tx.devolucion.create({
      data: {
        codigo,
        despachoPedidoId,
        motivoId,
        incidenciaId,
        observaciones,
        estado: 'SOLICITADA',
      },
    })

    for (const detalle of dp.pedido.detalles) {
      let loteId = null
      if (detalle.detallesDespacho && detalle.detallesDespacho.length > 0) {
        loteId = detalle.detallesDespacho[0].loteId
      } else {
        const lote = await tx.lote.findFirst({
          where: { productoId: detalle.productoId },
          orderBy: { fechaVencimiento: 'asc' },
        })
        loteId = lote?.id
      }
      if (!loteId) {
        const producto = await tx.producto.findUnique({ where: { id: detalle.productoId } })
        const lote = await tx.lote.create({
          data: {
            codigo: `L-${producto.codigo}-${Date.now()}`,
            productoId: detalle.productoId,
            estadoCalidad: 'DISPONIBLE',
          },
        })
        loteId = lote.id
      }

      await tx.detalleDevolucion.create({
        data: {
          devolucionId: nueva.id,
          detallePedidoId: detalle.id,
          loteId,
          cantidad: detalle.cantidad,
          unidad: detalle.unidad,
          estadoProducto: 'APTO_PARA_VENTA',
        },
      })
    }

    await tx.despachoPedido.update({
      where: { id: despachoPedidoId },
      data: { estado: 'DEVUELTO' },
    })
    // El pedido pasa a logística inversa (antes quedaba en su estado anterior)
    await tx.pedido.update({ where: { id: dp.pedidoId }, data: { estado: 'DEVUELTO' } })

    const dpUpdated = await tx.despachoPedido.findUnique({
      where: { id: despachoPedidoId },
      include: { despacho: { include: { pedidos: true } } },
    })
    if (dpUpdated && dpUpdated.despacho) {
      const otrasDevueltas = await tx.devolucion.count({
        where: { despachoPedido: { despachoId: dpUpdated.despachoId }, estado: { not: 'CANCELADA' } },
      })
      const totalPedidos = dpUpdated.despacho.pedidos.length
      if (otrasDevueltas === totalPedidos) {
        await finalizarDespacho(tx, dpUpdated.despachoId)
      }
    }

    await tx.eventoTrazabilidad.create({
      data: {
        pedidoId: dp.pedidoId,
        usuarioId,
        tipoEvento: 'DEVOLUCION_REGISTRADA',
        entidadTipo: 'Devolucion',
        entidadId: nueva.id,
        estadoAnterior: dp.estado,
        estadoNuevo: 'SOLICITADA',
        descripcion: `Devolución solicitada: ${motivo.nombre} - ${observaciones || 'Sin observaciones'}`,
      },
    })

    return nueva
  })

  return getDevolucionById(devolucion.id)
}

async function updateDevolucion(id, data) {
  const devolucion = await prisma.devolucion.findUnique({ where: { id } })
  if (!devolucion) throw new AppError('Devolución no encontrada', 404)
  if (['EVALUADA', 'CERRADA', 'CANCELADA'].includes(devolucion.estado)) {
    throw new AppError('No se puede modificar una devolución en estado final', 400)
  }

  return prisma.devolucion.update({
    where: { id },
    data,
    include: { motivo: true },
  })
}

async function recepcionDevolucion(id, { temperatura, observaciones }, usuarioId) {
  const devolucion = await prisma.devolucion.findUnique({
    where: { id },
    include: { despachoPedido: { include: { pedido: true, despacho: true } } },
  })
  if (!devolucion) throw new AppError('Devolución no encontrada', 404)
  if (devolucion.estado !== 'SOLICITADA' && devolucion.estado !== 'EN_TRASLADO') {
    throw new AppError('Solo se puede recibir en SOLICITADA o EN_TRASLADO', 400)
  }

  const updated = await prisma.$transaction(async (tx) => {
    const data = {
      estado: 'RECIBIDA',
      fechaRecepcion: new Date(),
      recibidoPor: { connect: { id: usuarioId } },
    }
    if (observaciones) data.observaciones = observaciones

    const d = await tx.devolucion.update({ where: { id }, data })

    if (temperatura) {
      await tx.registroTemperatura.create({
        data: {
          tipoRegistro: 'RECEPCION_DEVOLUCION',
          devolucionId: id,
          temperaturaC: temperatura,
          metodo: 'MANUAL',
          usuarioId,
          observaciones: 'Temperatura a recepción de devolución',
        },
      })
    }

    await tx.eventoTrazabilidad.create({
      data: {
        pedidoId: devolucion.despachoPedido.pedidoId,
        usuarioId,
        tipoEvento: 'DEVOLUCION_RECIBIDA',
        entidadTipo: 'Devolucion',
        entidadId: id,
        estadoAnterior: devolucion.estado,
        estadoNuevo: 'RECIBIDA',
        descripcion: `Devolución recibida${temperatura ? `, temp: ${temperatura}°C` : ''}`,
      },
    })

    return d
  })

  return getDevolucionById(updated.id)
}

async function evaluarDevolucion(id, { selloIntegro, condicionEmpaque, observaciones, temperatura }, usuarioId) {
  const devolucion = await prisma.devolucion.findUnique({
    where: { id },
    include: { detalles: { include: { detallePedido: { include: { producto: true } } } }, despachoPedido: { include: { pedido: true } } },
  })
  if (!devolucion) throw new AppError('Devolución no encontrada', 404)
  if (devolucion.estado !== 'RECIBIDA') {
    throw new AppError('Solo se puede evaluar una devolución RECIBIDA', 400)
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.devolucion.update({
      where: { id },
      data: { estado: 'EVALUADA' },
    })

    // Solo se registra temperatura si se midió (antes se guardaba 0 °C, que aparecía como
    // rotura de la cadena de frío)
    const tieneTemperatura = temperatura !== undefined && temperatura !== null && temperatura !== ''
    const registroTemp = tieneTemperatura
      ? await tx.registroTemperatura.create({
          data: {
            tipoRegistro: 'RECEPCION_DEVOLUCION',
            devolucionId: id,
            temperaturaC: Number(temperatura),
            metodo: 'MANUAL',
            usuarioId,
            observaciones: 'Temperatura a evaluación de devolución',
          },
        })
      : null

    const evaluacion = await tx.evaluacionDevolucion.create({
      data: {
        devolucionId: id,
        registroTemperaturaId: registroTemp?.id ?? null,
        selloIntegro,
        condicionEmpaque,
        observaciones,
        evaluadoPorId: usuarioId,
      },
    })

    await tx.eventoTrazabilidad.create({
      data: {
        pedidoId: devolucion.despachoPedido.pedidoId,
        usuarioId,
        tipoEvento: 'PRODUCTO_EVALUADO',
        entidadTipo: 'Devolucion',
        entidadId: id,
        estadoAnterior: 'RECIBIDA',
        estadoNuevo: 'EVALUADA',
        descripcion: `Devolución evaluada: sello ${selloIntegro ? 'íntegro' : 'roto'}, empaque: ${condicionEmpaque || 'no especificado'}`,
      },
    })

    return evaluacion
  })

  return getDevolucionById(updated.devolucionId)
}

async function evaluarDetalle(id, datos, usuarioId) {
  const { detalleDevolucionId, estadoProducto, decision, ubicacionId, tipoResiduoId } = datos
  let { loteId } = datos
  const detalle = await prisma.detalleDevolucion.findUnique({
    where: { id: detalleDevolucionId },
    include: { 
      devolucion: { include: { despachoPedido: { include: { pedido: true } } } },
      detallePedido: { include: { producto: true } },
    },
  })
  if (!detalle) throw new AppError('Detalle de devolución no encontrado', 404)
  if (detalle.devolucionId !== id) throw new AppError('El detalle no pertenece a esta devolución', 400)
  if (detalle.devolucion.estado !== 'EVALUADA') {
    throw new AppError('La devolución debe estar EVALUADA para decidir sobre los detalles', 400)
  }
  if (detalle.decision) throw new AppError('Este detalle ya tiene decisión asignada', 400)

  await prisma.$transaction(async (tx) => {
    await tx.detalleDevolucion.update({
      where: { id: detalleDevolucionId },
      data: { estadoProducto, decision },
    })

    // REINGRESO (a venta) y CUARENTENA (a la ubicación de cuarentena) devuelven el producto al
    // inventario; antes CUARENTENA no dejaba ningún registro del producto retenido.
    if (decision === 'REINGRESO' || decision === 'CUARENTENA') {
      loteId = loteId || detalle.loteId
      if (!ubicacionId) throw new AppError('Ubicación requerida para reingreso o cuarentena', 400)
      const ubicacion = await tx.ubicacionAlmacen.findUnique({ where: { id: ubicacionId } })
      if (!ubicacion) throw new AppError('Ubicación no encontrada', 404)
      if (decision === 'CUARENTENA' && ubicacion.tipo !== 'CUARENTENA') {
        throw new AppError('La cuarentena debe hacerse en una ubicación de tipo CUARENTENA', 400)
      }

      const lote = await tx.lote.findUnique({ where: { id: loteId } })
      if (!lote) throw new AppError('Lote no encontrado', 404)

      let inventario = await tx.inventario.findUnique({
        where: { loteId_ubicacionId: { loteId, ubicacionId } },
      })

      if (inventario) {
        await tx.inventario.update({
          where: { loteId_ubicacionId: { loteId, ubicacionId } },
          data: { stockActual: { increment: detalle.cantidad } },
        })
      } else {
        inventario = await tx.inventario.create({
          data: { loteId, ubicacionId, stockActual: detalle.cantidad, stockMinimo: 0 },
        })
      }

      await tx.movimientoInventario.create({
        data: {
          tipo: 'REINGRESO',
          loteId,
          ubicacionDestinoId: ubicacionId,
          cantidad: detalle.cantidad,
          unidad: detalle.unidad,
          usuarioId,
          referenciaTipo: 'Devolucion',
          referenciaId: id,
          observaciones: `${decision === 'CUARENTENA' ? 'Cuarentena' : 'Reingreso'} por devolución ${detalle.devolucion.codigo}`,
        },
      })

      await tx.eventoTrazabilidad.create({
        data: {
          pedidoId: detalle.devolucion.despachoPedido.pedidoId,
          usuarioId,
          tipoEvento: 'INVENTARIO_ACTUALIZADO',
          entidadTipo: 'Inventario',
          entidadId: inventario.id,
          estadoNuevo: decision,
          descripcion: `${decision === 'CUARENTENA' ? 'Retenido en cuarentena' : 'Reingreso al inventario'}: ${detalle.cantidad} ${detalle.unidad} de ${detalle.detallePedido.producto.nombre} (${ubicacion.nombre})`,
        },
      })
    }

    // DESCARTE genera el residuo (módulo 08). Antes solo creaba un evento sin entidadId,
    // campo obligatorio, y la operación fallaba.
    if (decision === 'DESCARTE') {
      if (!tipoResiduoId) throw new AppError('Tipo de residuo requerido para descarte', 400)
      const tipoResiduo = await tx.tipoResiduo.findUnique({ where: { id: tipoResiduoId } })
      if (!tipoResiduo) throw new AppError('Tipo de residuo no encontrado', 404)
      const residuo = await tx.residuo.create({
        data: {
          codigo: await codigoUnico('RES', 'residuo', tx),
          tipoResiduoId,
          devolucionId: id,
          cantidad: detalle.cantidad,
          unidad: detalle.unidad,
          origen: 'DEVOLUCION',
          observaciones: `Descarte de ${detalle.detallePedido.producto.nombre} por devolución ${detalle.devolucion.codigo}`,
        },
      })
      await tx.eventoTrazabilidad.create({
        data: {
          pedidoId: detalle.devolucion.despachoPedido.pedidoId,
          usuarioId,
          tipoEvento: 'RESIDUO_REGISTRADO',
          entidadTipo: 'Residuo',
          entidadId: residuo.id,
          estadoNuevo: 'DESCARTE',
          descripcion: `Producto descartado: ${detalle.cantidad} ${detalle.unidad} de ${detalle.detallePedido.producto.nombre}`,
        },
      })
    }

    const todasDecididas = await tx.detalleDevolucion.count({
      where: { devolucionId: id, decision: null },
    })

    if (todasDecididas === 0) {
      const reingresos = await tx.detalleDevolucion.count({ where: { devolucionId: id, decision: 'REINGRESO' } })
      const descartes = await tx.detalleDevolucion.count({ where: { devolucionId: id, decision: 'DESCARTE' } })
      const cuarentenas = await tx.detalleDevolucion.count({ where: { devolucionId: id, decision: 'CUARENTENA' } })

      let nuevoEstadoDevolucion = 'CERRADA'
      if (cuarentenas > 0 && reingresos === 0 && descartes === 0) nuevoEstadoDevolucion = 'CERRADA'

      await tx.devolucion.update({
        where: { id },
        data: { estado: nuevoEstadoDevolucion },
      })

await tx.eventoTrazabilidad.create({
      data: {
        pedidoId: detalle.devolucion.despachoPedido.pedidoId,
        usuarioId,
        tipoEvento: 'DEVOLUCION_CERRADA',
        entidadTipo: 'Devolucion',
        entidadId: id,
        estadoAnterior: 'EVALUADA',
        estadoNuevo: nuevoEstadoDevolucion,
        descripcion: `Devolución cerrada: ${reingresos} reingresos, ${descartes} descartes, ${cuarentenas} cuarentenas`,
      },
    })
    }
  })

  return getDevolucionById(id)
}

async function changeEstado(id, nuevoEstado, usuarioId, observaciones) {
  // despachoPedido se usa para el evento de trazabilidad; sin include la función fallaba siempre
  const devolucion = await prisma.devolucion.findUnique({ where: { id }, include: { despachoPedido: true } })
  if (!devolucion) throw new AppError('Devolución no encontrada', 404)

  const estadoActual = devolucion.estado

  const transicionesValidas = {
    SOLICITADA: ['EN_TRASLADO', 'CANCELADA'],
    EN_TRASLADO: ['RECIBIDA', 'CANCELADA'],
    RECIBIDA: ['EVALUADA', 'CANCELADA'],
    EVALUADA: ['CERRADA', 'CANCELADA'],
    CERRADA: [],
    CANCELADA: [],
  }

  if (!transicionesValidas[estadoActual]?.includes(nuevoEstado)) {
    throw new AppError(`Transición inválida: ${estadoActual} → ${nuevoEstado}`, 400)
  }

  const updated = await prisma.$transaction(async (tx) => {
    const data = { estado: nuevoEstado }
    if (nuevoEstado === 'CANCELADA') {
      await tx.despachoPedido.update({
        where: { id: devolucion.despachoPedidoId },
        data: { estado: 'EN_RUTA' },
      })
    }
    if (nuevoEstado === 'CERRADA') {
      const dp = await tx.despachoPedido.findUnique({
        where: { id: devolucion.despachoPedidoId },
        include: { despacho: { include: { pedidos: true } } },
      })
      if (dp && dp.despacho) {
        const otrasDevueltas = await tx.devolucion.count({
          where: { despachoPedido: { despachoId: dp.despachoId }, estado: { not: 'CANCELADA' } },
        })
        if (otrasDevueltas === dp.despacho.pedidos.length) {
          await finalizarDespacho(tx, dp.despachoId)
        }
      }
    }

    const d = await tx.devolucion.update({ where: { id }, data })

    await tx.eventoTrazabilidad.create({
      data: {
        pedidoId: devolucion.despachoPedido.pedidoId,
        usuarioId,
        tipoEvento: 'DEVOLUCION_CERRADA',
        entidadTipo: 'Devolucion',
        entidadId: id,
        estadoAnterior: estadoActual,
        estadoNuevo: nuevoEstado,
        descripcion: observaciones || `Estado cambiado a ${nuevoEstado}`,
      },
    })

    return d
  })

  return getDevolucionById(updated.id)
}

async function deleteDevolucion(id) {
  const devolucion = await prisma.devolucion.findUnique({ where: { id } })
  if (!devolucion) throw new AppError('Devolución no encontrada', 404)
  if (!['SOLICITADA', 'CANCELADA'].includes(devolucion.estado)) {
    throw new AppError('Solo se puede eliminar en SOLICITADA o CANCELADA', 400)
  }

  await prisma.$transaction(async (tx) => {
    await tx.despachoPedido.update({
      where: { id: devolucion.despachoPedidoId },
      data: { estado: 'EN_RUTA' },
    })

    const dp = await tx.despachoPedido.findUnique({
      where: { id: devolucion.despachoPedidoId },
      include: { despacho: { include: { pedidos: true } } },
    })
    if (dp && dp.despacho) {
      const otrasDevueltas = await tx.devolucion.count({
        where: { despachoPedido: { despachoId: dp.despachoId }, estado: { not: 'CANCELADA' } },
      })
      if (otrasDevueltas === dp.despacho.pedidos.length) {
        await tx.despacho.update({
          where: { id: dp.despachoId },
          data: { estado: 'EN_RUTA' },
        })
      }
    }

    await tx.devolucion.delete({ where: { id } })
  })

  return true
}

module.exports = {
  getResumenDevoluciones,
  listDevoluciones,
  getDevolucionById,
  createDevolucion,
  updateDevolucion,
  recepcionDevolucion,
  evaluarDevolucion,
  evaluarDetalle,
  changeEstado,
  deleteDevolucion,
}