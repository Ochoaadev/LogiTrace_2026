const prisma = require('../../config/database')
const { getPagination } = require('../../utils/pagination')

function generateCodigo() {
  const fecha = new Date()
  const yymmdd = fecha.toISOString().slice(2, 10).replace(/-/g, '')
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `INC-${yymmdd}-${random}`
}

async function listIncidencias(query) {
  const { page, limit, skip } = getPagination(query)
  const { estado, tipoIncidenciaId, despachoPedidoId, fechaDesde, fechaHasta, search } = query

  const where = {}

  if (estado) where.estado = estado
  if (tipoIncidenciaId) where.tipoIncidenciaId = tipoIncidenciaId
  if (despachoPedidoId) where.despachoPedidoId = despachoPedidoId
  if (fechaDesde || fechaHasta) {
    where.fechaHora = {}
    if (fechaDesde) where.fechaHora.gte = new Date(fechaDesde)
    if (fechaHasta) where.fechaHora.lte = new Date(fechaHasta)
  }
  if (search) {
    where.OR = [
      { codigo: { contains: search, mode: 'insensitive' } },
      { descripcion: { contains: search, mode: 'insensitive' } },
      { despachoPedido: { pedido: { codigo: { contains: search, mode: 'insensitive' } } } },
    ]
  }

  const [incidencias, total] = await Promise.all([
    prisma.incidencia.findMany({
      where,
      skip,
      take: limit,
      orderBy: { fechaHora: 'desc' },
      include: {
        despachoPedido: {
          include: {
            pedido: { select: { id: true, codigo: true, cliente: { select: { razonSocial: true } } } },
            despacho: { select: { id: true, codigo: true, repartidor: { include: { usuario: { select: { nombre: true } } } } } },
          },
        },
        tipo: { select: { id: true, codigo: true, nombre: true } },
        reportadoPor: { select: { id: true, nombre: true, codigo: true } },
        resueltaPor: { select: { id: true, nombre: true, codigo: true } },
      },
    }),
    prisma.incidencia.count({ where }),
  ])

  return { data: incidencias, total, page, limit }
}

async function getIncidenciaById(id) {
  const incidencia = await prisma.incidencia.findUnique({
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
      tipo: true,
      reportadoPor: { select: { id: true, nombre: true, codigo: true } },
      resueltaPor: { select: { id: true, nombre: true, codigo: true } },
      devoluciones: { include: { motivo: true } },
    },
  })
  if (!incidencia) throw new Error('Incidencia no encontrada')
  return incidencia
}

async function createIncidencia(data, usuarioId) {
  const { despachoPedidoId, tipoIncidenciaId, descripcion, latitud, longitud, decisionOperativa } = data

  const dp = await prisma.despachoPedido.findUnique({
    where: { id: despachoPedidoId },
    include: { pedido: true, despacho: true },
  })
  if (!dp) throw new Error('Despacho-pedido no encontrado')

  const tipo = await prisma.tipoIncidencia.findUnique({ where: { id: tipoIncidenciaId } })
  if (!tipo) throw new Error('Tipo de incidencia no encontrado')
  if (!tipo.activo) throw new Error('Tipo de incidencia inactivo')

  const codigo = generateCodigo()

  const incidencia = await prisma.$transaction(async (tx) => {
    const nueva = await tx.incidencia.create({
      data: {
        codigo,
        despachoPedidoId,
        tipoIncidenciaId,
        reportadoPorId: usuarioId,
        descripcion,
        latitud,
        longitud,
        decisionOperativa,
        estado: 'ABIERTA',
      },
    })

    await tx.despachoPedido.update({
      where: { id: despachoPedidoId },
      data: { estado: 'CON_INCIDENCIA' },
    })

    const despacho = await tx.despacho.findUnique({ where: { id: dp.despachoId } })
    if (despacho && despacho.estado !== 'CON_INCIDENCIA') {
      await tx.despacho.update({
        where: { id: dp.despachoId },
        data: { estado: 'CON_INCIDENCIA' },
      })
    }

    await tx.eventoTrazabilidad.create({
      data: {
        pedidoId: dp.pedidoId,
        usuarioId,
        tipoEvento: 'INCIDENCIA_REGISTRADA',
        entidadTipo: 'Incidencia',
        entidadId: nueva.id,
        estadoAnterior: 'EN_RUTA',
        estadoNuevo: 'CON_INCIDENCIA',
        descripcion: `Incidencia registrada: ${tipo.nombre} - ${descripcion}`,
        ubicacionGPSId: null,
      },
    })

    return nueva
  })

  return getIncidenciaById(incidencia.id)
}

async function updateIncidencia(id, data) {
  const incidencia = await prisma.incidencia.findUnique({ where: { id } })
  if (!incidencia) throw new Error('Incidencia no encontrada')
  if (['RESUELTA', 'CERRADA', 'CANCELADA'].includes(incidencia.estado)) {
    throw new Error('No se puede modificar una incidencia cerrada')
  }

  return prisma.incidencia.update({
    where: { id },
    data,
    include: { tipo: true, despachoPedido: { include: { pedido: true } } },
  })
}

async function changeEstado(id, nuevoEstado, usuarioId, decisionOperativa, observaciones) {
  const incidencia = await prisma.incidencia.findUnique({
    where: { id },
    include: { despachoPedido: { include: { pedido: true, despacho: true } } },
  })
  if (!incidencia) throw new Error('Incidencia no encontrada')

  const estadoActual = incidencia.estado

  const transicionesValidas = {
    ABIERTA: ['EN_GESTION', 'RESUELTA', 'CANCELADA'],
    EN_GESTION: ['RESUELTA', 'CANCELADA'],
    RESUELTA: ['CERRADA'],
    CANCELADA: [],
    CERRADA: [],
  }

  if (!transicionesValidas[estadoActual]?.includes(nuevoEstado)) {
    throw new Error(`Transición inválida: ${estadoActual} → ${nuevoEstado}`)
  }

  const updated = await prisma.$transaction(async (tx) => {
    const data = { estado: nuevoEstado }
    if (nuevoEstado === 'RESUELTA' || nuevoEstado === 'CERRADA') data.fechaResolucion = new Date()
    if (nuevoEstado === 'RESUELTA' || nuevoEstado === 'CERRADA') data.resueltaPorId = usuarioId
    if (decisionOperativa) data.decisionOperativa = decisionOperativa

    const i = await tx.incidencia.update({ where: { id }, data })

    if (nuevoEstado === 'RESUELTA' || nuevoEstado === 'CERRADA') {
      await tx.despachoPedido.update({
        where: { id: incidencia.despachoPedidoId },
        data: { estado: 'EN_RUTA' },
      })

      const dp = await tx.despachoPedido.findUnique({
        where: { id: incidencia.despachoPedidoId },
        include: { despacho: { include: { pedidos: true } } },
      })
      if (dp && dp.despacho) {
        const otrasIncidencias = await tx.incidencia.count({
          where: {
            despachoPedido: { despachoId: dp.despachoId },
            estado: { in: ['ABIERTA', 'EN_GESTION'] },
            NOT: { id },
          },
        })
        if (otrasIncidencias === 0) {
          await tx.despacho.update({
            where: { id: dp.despachoId },
            data: { estado: 'EN_RUTA' },
          })
        }
      }
    }
    if (nuevoEstado === 'CANCELADA') {
      await tx.despachoPedido.update({
        where: { id: incidencia.despachoPedidoId },
        data: { estado: 'EN_RUTA' },
      })
    }

    await tx.eventoTrazabilidad.create({
      data: {
        pedidoId: incidencia.despachoPedido.pedidoId,
        usuarioId,
        tipoEvento: nuevoEstado === 'RESUELTA' ? 'INCIDENCIA_RESUELTA' : 'INCIDENCIA_REGISTRADA',
        entidadTipo: 'Incidencia',
        entidadId: id,
        estadoAnterior: estadoActual,
        estadoNuevo: nuevoEstado,
        descripcion: observaciones || decisionOperativa || `Incidencia ${nuevoEstado.toLowerCase()}`,
      },
    })

    return i
  })

  return getIncidenciaById(updated.id)
}

async function deleteIncidencia(id) {
  const incidencia = await prisma.incidencia.findUnique({ where: { id } })
  if (!incidencia) throw new Error('Incidencia no encontrada')
  if (incidencia.estado !== 'ABIERTA' && incidencia.estado !== 'CANCELADA') {
    throw new Error('Solo se puede eliminar en ABIERTA o CANCELADA')
  }

  await prisma.$transaction(async (tx) => {
    await tx.despachoPedido.update({
      where: { id: incidencia.despachoPedidoId },
      data: { estado: 'EN_RUTA' },
    })

    const dp = await tx.despachoPedido.findUnique({
      where: { id: incidencia.despachoPedidoId },
      include: { despacho: { include: { pedidos: true } } },
    })
    if (dp && dp.despacho) {
      const otrasIncidencias = await tx.incidencia.count({
        where: { despachoPedido: { despachoId: dp.despachoId }, estado: { in: ['ABIERTA', 'EN_GESTION'] } },
      })
      if (otrasIncidencias === 0) {
        await tx.despacho.update({
          where: { id: dp.despachoId },
          data: { estado: 'EN_RUTA' },
        })
      }
    }

    await tx.incidencia.delete({ where: { id } })
  })

  return true
}

module.exports = {
  listIncidencias,
  getIncidenciaById,
  createIncidencia,
  updateIncidencia,
  changeEstado,
  deleteIncidencia,
}