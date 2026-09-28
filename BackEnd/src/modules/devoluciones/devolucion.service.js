const prisma = require('../../config/database')
const { getPagination } = require('../../utils/pagination')

function generateCodigo() {
  const fecha = new Date()
  const yymmdd = fecha.toISOString().slice(2, 10).replace(/-/g, '')
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `DEV-${yymmdd}-${random}`
}

async function listDevoluciones(query) {
  const { page, limit, skip } = getPagination(query)
  const { estado, motivoId, despachoPedidoId, fechaDesde, fechaHasta, search } = query

  const where = {}

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
        _count: { select: { detalles: true } },
      },
    }),
    prisma.devolucion.count({ where }),
  ])

  return { data: devoluciones, total, page, limit }
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
  if (!devolucion) throw new Error('Devolución no encontrada')
  return devolucion
}

async function createDevolucion(data, usuarioId) {
  const { despachoPedidoId, motivoId, incidenciaId, observaciones } = data

  const dp = await prisma.despachoPedido.findUnique({
    where: { id: despachoPedidoId },
    include: { pedido: { include: { detalles: true } }, despacho: true },
  })
  if (!dp) throw new Error('Despacho-pedido no encontrado')
  if (dp.estado === 'DEVUELTO') throw new Error('Este pedido ya tiene una devolución registrada')
  if (dp.estado === 'REPROGRAMADO') throw new Error('El pedido está reprogramado, no se puede devolver')

  const motivo = await prisma.motivoDevolucion.findUnique({ where: { id: motivoId } })
  if (!motivo) throw new Error('Motivo de devolución no encontrado')
  if (!motivo.activo) throw new Error('Motivo inactivo')

  if (incidenciaId) {
    const incidencia = await prisma.incidencia.findUnique({ where: { id: incidenciaId } })
    if (!incidencia) throw new Error('Incidencia no encontrada')
    if (incidencia.despachoPedidoId !== despachoPedidoId) {
      throw new Error('La incidencia no corresponde a este despacho-pedido')
    }
  }

  const codigo = generateCodigo()

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
        await tx.despacho.update({
          where: { id: dpUpdated.despachoId },
          data: { estado: 'FINALIZADO', fechaHoraCierre: new Date() },
        })
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
  if (!devolucion) throw new Error('Devolución no encontrada')
  if (['EVALUADA', 'CERRADA', 'CANCELADA'].includes(devolucion.estado)) {
    throw new Error('No se puede modificar una devolución en estado final')
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
  if (!devolucion) throw new Error('Devolución no encontrada')
  if (devolucion.estado !== 'SOLICITADA' && devolucion.estado !== 'EN_TRASLADO') {
    throw new Error('Solo se puede recibir en SOLICITADA o EN_TRASLADO')
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
  if (!devolucion) throw new Error('Devolución no encontrada')
  if (devolucion.estado !== 'RECIBIDA') {
    throw new Error('Solo se puede evaluar una devolución RECIBIDA')
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.devolucion.update({
      where: { id },
      data: { estado: 'EVALUADA' },
    })

    const registroTemp = await tx.registroTemperatura.create({
      data: {
        tipoRegistro: 'RECEPCION_DEVOLUCION',
        devolucionId: id,
        temperaturaC: temperatura || 0,
        metodo: 'MANUAL',
        usuarioId,
        observaciones: 'Temperatura a evaluación de devolución',
      },
    })

    const evaluacion = await tx.evaluacionDevolucion.create({
      data: {
        devolucionId: id,
        registroTemperaturaId: registroTemp.id,
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

  return getDevolucionById(updated.id)
}

async function evaluarDetalle(id, { detalleDevolucionId, estadoProducto, decision, loteId, ubicacionId }, usuarioId) {
  const detalle = await prisma.detalleDevolucion.findUnique({
    where: { id: detalleDevolucionId },
    include: { 
      devolucion: { include: { despachoPedido: { include: { pedido: true } } } },
      detallePedido: { include: { producto: true } },
    },
  })
  if (!detalle) throw new Error('Detalle de devolución no encontrado')
  if (detalle.devolucionId !== id) throw new Error('El detalle no pertenece a esta devolución')
  if (detalle.devolucion.estado !== 'EVALUADA') {
    throw new Error('La devolución debe estar EVALUADA para decidir sobre los detalles')
  }
  if (detalle.decision) throw new Error('Este detalle ya tiene decisión asignada')

  await prisma.$transaction(async (tx) => {
    await tx.detalleDevolucion.update({
      where: { id: detalleDevolucionId },
      data: { estadoProducto, decision },
    })

    if (decision === 'REINGRESO') {
      if (!loteId || !ubicacionId) throw new Error('Lote y ubicación requeridos para reingreso')

      const lote = await tx.lote.findUnique({ where: { id: loteId } })
      if (!lote) throw new Error('Lote no encontrado')

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
          observaciones: `Reingreso por devolución ${detalle.devolucion.codigo}`,
        },
      })

      await tx.eventoTrazabilidad.create({
        data: {
          pedidoId: detalle.devolucion.despachoPedido.pedidoId,
          usuarioId,
          tipoEvento: 'INVENTARIO_ACTUALIZADO',
          entidadTipo: 'Inventario',
          entidadId: inventario.id,
          estadoNuevo: 'REINGRESO',
          descripcion: `Reingreso al inventario: ${detalle.cantidad} ${detalle.unidad} de ${detalle.detallePedido.producto.nombre}`,
        },
      })
    }

    if (decision === 'DESCARTE') {
      await tx.eventoTrazabilidad.create({
        data: {
          pedidoId: detalle.devolucion.despachoPedido.pedidoId,
          usuarioId,
          tipoEvento: 'RESIDUO_REGISTRADO',
          entidadTipo: 'Residuo',
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
  const devolucion = await prisma.devolucion.findUnique({ where: { id } })
  if (!devolucion) throw new Error('Devolución no encontrada')

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
    throw new Error(`Transición inválida: ${estadoActual} → ${nuevoEstado}`)
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
          await tx.despacho.update({
            where: { id: dp.despachoId },
            data: { estado: 'FINALIZADO', fechaHoraCierre: new Date() },
          })
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
  if (!devolucion) throw new Error('Devolución no encontrada')
  if (!['SOLICITADA', 'CANCELADA'].includes(devolucion.estado)) {
    throw new Error('Solo se puede eliminar en SOLICITADA o CANCELADA')
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