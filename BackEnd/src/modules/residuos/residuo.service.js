const prisma = require('../../config/database')
const { getPagination } = require('../../utils/pagination')

function generateCodigo() {
  const fecha = new Date()
  const yymmdd = fecha.toISOString().slice(2, 10).replace(/-/g, '')
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `RES-${yymmdd}-${random}`
}

async function listResiduos(query) {
  const { page, limit, skip } = getPagination(query)
  const { estado, tipoResiduoId, gestorId, devolucionId, fechaDesde, fechaHasta, search } = query

  const where = {}

  if (estado) where.estado = estado
  if (tipoResiduoId) where.tipoResiduoId = tipoResiduoId
  if (gestorId) where.gestorId = gestorId
  if (devolucionId) where.devolucionId = devolucionId
  if (fechaDesde || fechaHasta) {
    where.fechaGeneracion = {}
    if (fechaDesde) where.fechaGeneracion.gte = new Date(fechaDesde)
    if (fechaHasta) where.fechaGeneracion.lte = new Date(fechaHasta)
  }
  if (search) {
    where.OR = [
      { codigo: { contains: search, mode: 'insensitive' } },
      { tipoResiduo: { nombre: { contains: search, mode: 'insensitive' } } },
      { origen: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [residuos, total] = await Promise.all([
    prisma.residuo.findMany({
      where,
      skip,
      take: limit,
      orderBy: { fechaGeneracion: 'desc' },
      include: {
        tipoResiduo: { select: { id: true, codigo: true, nombre: true, unidadBase: true } },
        devolucion: { select: { id: true, codigo: true, despachoPedido: { select: { pedido: { select: { codigo: true } } } } } },
        gestor: { select: { id: true, codigo: true, nombre: true, tipo: true } },
      },
    }),
    prisma.residuo.count({ where }),
  ])

  return { data: residuos, total, page, limit }
}

async function getResiduoById(id) {
  const residuo = await prisma.residuo.findUnique({
    where: { id },
    include: {
      tipoResiduo: true,
      devolucion: {
        include: {
          despachoPedido: {
            include: {
              pedido: { select: { id: true, codigo: true, cliente: { select: { razonSocial: true } } } },
              despacho: { select: { codigo: true } },
            },
          },
        },
      },
      gestor: true,
    },
  })
  if (!residuo) throw new Error('Residuo no encontrado')
  return residuo
}

async function createResiduo(data, usuarioId) {
  const { tipoResiduoId, devolucionId, gestorId, cantidad, unidad, origen, observaciones } = data

  const tipoResiduo = await prisma.tipoResiduo.findUnique({ where: { id: tipoResiduoId } })
  if (!tipoResiduo) throw new Error('Tipo de residuo no encontrado')
  if (!tipoResiduo.activo) throw new Error('Tipo de residuo inactivo')

  if (devolucionId) {
    const devolucion = await prisma.devolucion.findUnique({ where: { id: devolucionId } })
    if (!devolucion) throw new Error('Devolución no encontrada')
  }

  if (gestorId) {
    const gestor = await prisma.gestorResiduo.findUnique({ where: { id: gestorId } })
    if (!gestor) throw new Error('Gestor de residuo no encontrado')
    if (!gestor.activo) throw new Error('Gestor inactivo')
  }

  const codigo = generateCodigo()

  const residuo = await prisma.$transaction(async (tx) => {
    const nuevo = await tx.residuo.create({
      data: {
        codigo,
        tipoResiduoId,
        devolucionId,
        gestorId,
        cantidad,
        unidad,
        origen: origen || (devolucionId ? 'DEVOLUCION' : 'OTRO'),
        observaciones,
        estado: 'REGISTRADO',
      },
    })

    await tx.eventoTrazabilidad.create({
      data: {
        devolucionId,
        usuarioId,
        tipoEvento: 'RESIDUO_REGISTRADO',
        entidadTipo: 'Residuo',
        entidadId: nuevo.id,
        estadoNuevo: 'REGISTRADO',
        descripcion: `Residuo registrado: ${tipoResiduo.nombre}, ${cantidad} ${unidad}`,
      },
    })

    return nuevo
  })

  return getResiduoById(residuo.id)
}

async function updateResiduo(id, data) {
  const residuo = await prisma.residuo.findUnique({ where: { id } })
  if (!residuo) throw new Error('Residuo no encontrado')
  if (['RETIRADO', 'DISPOSICION_FINAL', 'ANULADO'].includes(residuo.estado)) {
    throw new Error('No se puede modificar un residuo en estado final')
  }

  const updateData = {}
  if (data.tipoResiduoId) updateData.tipoResiduoId = data.tipoResiduoId
  if (data.gestorId) updateData.gestorId = data.gestorId
  if (data.cantidad !== undefined) updateData.cantidad = data.cantidad
  if (data.unidad) updateData.unidad = data.unidad
  if (data.origen !== undefined) updateData.origen = data.origen
  if (data.observaciones !== undefined) updateData.observaciones = data.observaciones

  return prisma.residuo.update({
    where: { id },
    data: updateData,
    include: { tipoResiduo: true, gestor: true },
  })
}

async function changeEstado(id, nuevoEstado, usuarioId, observaciones) {
  const residuo = await prisma.residuo.findUnique({ where: { id } })
  if (!residuo) throw new Error('Residuo no encontrado')

  const estadoActual = residuo.estado

  const transicionesValidas = {
    REGISTRADO: ['EN_ALMACENAMIENTO', 'ANULADO'],
    EN_ALMACENAMIENTO: ['RETIRADO', 'ANULADO'],
    RETIRADO: ['DISPOSICION_FINAL'],
    DISPOSICION_FINAL: [],
    ANULADO: [],
  }

  if (!transicionesValidas[estadoActual]?.includes(nuevoEstado)) {
    throw new Error(`Transición inválida: ${estadoActual} → ${nuevoEstado}`)
  }

  const updated = await prisma.$transaction(async (tx) => {
    const data = { estado: nuevoEstado }
    if (nuevoEstado === 'RETIRADO') data.fechaRetiro = new Date()
    if (nuevoEstado === 'DISPOSICION_FINAL') data.fechaRetiro = new Date()

    const r = await tx.residuo.update({ where: { id }, data })

    await tx.eventoTrazabilidad.create({
      data: {
        usuarioId,
        tipoEvento: 'RESIDUO_REGISTRADO',
        entidadTipo: 'Residuo',
        entidadId: id,
        estadoAnterior: estadoActual,
        estadoNuevo: nuevoEstado,
        descripcion: observaciones || `Estado cambiado de ${estadoActual} a ${nuevoEstado}`,
      },
    })

    return r
  })

  return getResiduoById(updated.id)
}

async function deleteResiduo(id) {
  const residuo = await prisma.residuo.findUnique({ where: { id } })
  if (!residuo) throw new Error('Residuo no encontrado')
  if (residuo.estado !== 'REGISTRADO' && residuo.estado !== 'ANULADO') {
    throw new Error('Solo se puede eliminar en REGISTRADO o ANULADO')
  }

  await prisma.residuo.delete({ where: { id } })
  return true
}

async function getResumenResiduos(query) {
  const { fechaDesde, fechaHasta } = query

  const where = {}
  if (fechaDesde || fechaHasta) {
    where.fechaGeneracion = {}
    if (fechaDesde) where.fechaGeneracion.gte = new Date(fechaDesde)
    if (fechaHasta) where.fechaGeneracion.lte = new Date(fechaHasta)
  }

  const [totalResiduos, porTipo, porEstado, porGestor] = await Promise.all([
    prisma.residuo.count({ where }),
    prisma.residuo.groupBy({
      by: ['tipoResiduoId'],
      where,
      _sum: { cantidad: true },
      _count: { _all: true },
    }),
    prisma.residuo.groupBy({
      by: ['estado'],
      where,
      _sum: { cantidad: true },
      _count: { _all: true },
    }),
    prisma.residuo.groupBy({
      by: ['gestorId'],
      where,
      _sum: { cantidad: true },
      _count: { _all: true },
    }),
  ])

  const tipos = await prisma.tipoResiduo.findMany({
    where: { id: { in: porTipo.map(t => t.tipoResiduoId) } },
    select: { id: true, codigo: true, nombre: true, unidadBase: true },
  })

  const gestores = await prisma.gestorResiduo.findMany({
    where: { id: { in: porGestor.map(g => g.gestorId).filter(Boolean) } },
    select: { id: true, codigo: true, nombre: true, tipo: true },
  })

  return {
    totalResiduos,
    totalCantidad: porTipo.reduce((sum, t) => sum + Number(t._sum.cantidad || 0), 0),
    porTipo: porTipo.map(t => ({
      ...tipos.find(tp => tp.id === t.tipoResiduoId),
      totalCantidad: Number(t._sum.cantidad || 0),
      totalRegistros: t._count._all,
    })),
    porEstado: porEstado.map(e => ({ estado: e.estado, totalCantidad: Number(e._sum.cantidad || 0), totalRegistros: e._count._all })),
    porGestor: porGestor.map(g => ({
      ...gestores.find(gp => gp.id === g.gestorId),
      totalCantidad: Number(g._sum.cantidad || 0),
      totalRegistros: g._count._all,
    })),
  }
}

module.exports = {
  listResiduos,
  getResiduoById,
  createResiduo,
  updateResiduo,
  changeEstado,
  deleteResiduo,
  getResumenResiduos,
}