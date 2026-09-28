const prisma = require('../../config/database')
const { getPagination } = require('../../utils/pagination')

async function listInventario(query) {
  const { page, limit, skip } = getPagination(query)
  const { ubicacionId, productoId, stockBajo, search } = query

  const where = {}

  if (ubicacionId) where.ubicacionId = ubicacionId
  if (productoId) where.lote = { productoId }
  if (stockBajo === 'true') {
    where.stockActual = { lte: prisma.inventario.fields.stockMinimo }
  }
  if (search) {
    where.OR = [
      { lote: { codigo: { contains: search, mode: 'insensitive' } } },
      { lote: { producto: { nombre: { contains: search, mode: 'insensitive' } } } },
      { ubicacion: { nombre: { contains: search, mode: 'insensitive' } } },
      { ubicacion: { codigo: { contains: search, mode: 'insensitive' } } },
    ]
  }

  const [inventarios, total] = await Promise.all([
    prisma.inventario.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        lote: {
          include: {
            producto: { select: { id: true, codigo: true, nombre: true, unidadBase: true, esPerecedero: true } },
          },
        },
        ubicacion: { select: { id: true, codigo: true, nombre: true, tipo: true } },
      },
    }),
    prisma.inventario.count({ where }),
  ])

  return { data: inventarios, total, page, limit }
}

async function getInventarioById(id) {
  const inventario = await prisma.inventario.findUnique({
    where: { id },
    include: {
      lote: {
        include: {
          producto: { select: { id: true, codigo: true, nombre: true, unidadBase: true, esPerecedero: true } },
        },
      },
      ubicacion: true,
    },
  })
  if (!inventario) throw new Error('Registro de inventario no encontrado')
  return inventario
}

async function createInventario(data) {
  const { loteId, ubicacionId, stockActual = 0, stockMinimo = 0 } = data

  const existing = await prisma.inventario.findUnique({
    where: { loteId_ubicacionId: { loteId, ubicacionId } },
  })
  if (existing) throw new Error('Ya existe un registro de inventario para este lote en esta ubicación')

  const lote = await prisma.lote.findUnique({ where: { id: loteId } })
  if (!lote) throw new Error('Lote no encontrado')

  const ubicacion = await prisma.ubicacionAlmacen.findUnique({ where: { id: ubicacionId } })
  if (!ubicacion) throw new Error('Ubicación no encontrada')
  if (!ubicacion.activo) throw new Error('Ubicación inactiva')

  return prisma.inventario.create({
    data: { loteId, ubicacionId, stockActual, stockMinimo },
    include: { lote: { include: { producto: true } }, ubicacion: true },
  })
}

async function updateInventario(id, data) {
  const inventario = await prisma.inventario.findUnique({ where: { id } })
  if (!inventario) throw new Error('Registro de inventario no encontrado')

  const updateData = {}
  if (data.stockActual !== undefined) updateData.stockActual = data.stockActual
  if (data.stockMinimo !== undefined) updateData.stockMinimo = data.stockMinimo

  return prisma.inventario.update({
    where: { id },
    data: updateData,
    include: { lote: { include: { producto: true } }, ubicacion: true },
  })
}

async function deleteInventario(id) {
  const inventario = await prisma.inventario.findUnique({ where: { id } })
  if (!inventario) throw new Error('Registro de inventario no encontrado')

  if (inventario.stockActual > 0) {
    throw new Error('No se puede eliminar: tiene stock actual > 0')
  }

  return prisma.inventario.delete({ where: { id } })
}

async function registrarMovimiento(data, usuarioId) {
  const { tipo, loteId, ubicacionOrigenId, ubicacionDestinoId, cantidad, unidad, referenciaTipo, referenciaId, observaciones } = data

  if (tipo === 'TRASLADO') {
    if (!ubicacionOrigenId || !ubicacionDestinoId) {
      throw new Error('TRASLADO requiere ubicacionOrigenId y ubicacionDestinoId')
    }
    if (ubicacionOrigenId === ubicacionDestinoId) {
      throw new Error('Origen y destino deben ser diferentes')
    }
  } else if (['ENTRADA', 'REINGRESO', 'AJUSTE'].includes(tipo)) {
    if (!ubicacionDestinoId) throw new Error(`${tipo} requiere ubicacionDestinoId`)
  } else if (['SALIDA', 'DESCARTE'].includes(tipo)) {
    if (!ubicacionOrigenId) throw new Error(`${tipo} requiere ubicacionOrigenId`)
  }

  return prisma.$transaction(async (tx) => {
    // Obtener o crear inventario origen
    let inventarioOrigen = null
    if (ubicacionOrigenId) {
      inventarioOrigen = await tx.inventario.findUnique({
        where: { loteId_ubicacionId: { loteId, ubicacionId: ubicacionOrigenId } },
      })
      if (!inventarioOrigen && ['SALIDA', 'DESCARTE', 'TRASLADO'].includes(tipo)) {
        throw new Error('No existe inventario en la ubicación origen')
      }
    }

    // Obtener o crear inventario destino
    let inventarioDestino = null
    if (ubicacionDestinoId) {
      inventarioDestino = await tx.inventario.findUnique({
        where: { loteId_ubicacionId: { loteId, ubicacionId: ubicacionDestinoId } },
      })
      if (!inventarioDestino) {
        inventarioDestino = await tx.inventario.create({
          data: { loteId, ubicacionId: ubicacionDestinoId, stockActual: 0, stockMinimo: 0 },
        })
      }
    }

    // Validar stock suficiente para salidas
    if (['SALIDA', 'DESCARTE', 'TRASLADO'].includes(tipo)) {
      if (!inventarioOrigen || inventarioOrigen.stockActual < cantidad) {
        throw new Error(`Stock insuficiente en ubicación origen (disponible: ${inventarioOrigen?.stockActual || 0})`)
      }
    }

    // Actualizar stocks
    if (ubicacionOrigenId && ['SALIDA', 'DESCARTE', 'TRASLADO'].includes(tipo)) {
      await tx.inventario.update({
        where: { id: inventarioOrigen.id },
        data: { stockActual: { decrement: cantidad } },
      })
    }

    if (ubicacionDestinoId && ['ENTRADA', 'REINGRESO', 'AJUSTE', 'TRASLADO'].includes(tipo)) {
      const delta = tipo === 'AJUSTE' ? cantidad : cantidad
      await tx.inventario.update({
        where: { id: inventarioDestino.id },
        data: { stockActual: { increment: delta } },
      })
    }

    // Crear movimiento
    const movimiento = await tx.movimientoInventario.create({
      data: {
        tipo,
        loteId,
        ubicacionOrigenId,
        ubicacionDestinoId,
        cantidad,
        unidad,
        usuarioId,
        referenciaTipo,
        referenciaId,
        observaciones,
      },
      include: {
        lote: { include: { producto: { select: { id: true, codigo: true, nombre: true } } } },
        ubicacionOrigen: { select: { id: true, codigo: true, nombre: true } },
        ubicacionDestino: { select: { id: true, codigo: true, nombre: true } },
        usuario: { select: { id: true, nombre: true, codigo: true } },
      },
    })

    return movimiento
  })
}

async function listMovimientos(query) {
  const { page, limit, skip } = getPagination(query)
  const { tipo, loteId, ubicacionId, fechaDesde, fechaHasta } = query

  const where = {}

  if (tipo) where.tipo = tipo
  if (loteId) where.loteId = loteId
  if (ubicacionId) {
    where.OR = [
      { ubicacionOrigenId: ubicacionId },
      { ubicacionDestinoId: ubicacionId },
    ]
  }
  if (fechaDesde || fechaHasta) {
    where.fechaHora = {}
    if (fechaDesde) where.fechaHora.gte = new Date(fechaDesde)
    if (fechaHasta) where.fechaHora.lte = new Date(fechaHasta)
  }

  const [movimientos, total] = await Promise.all([
    prisma.movimientoInventario.findMany({
      where,
      skip,
      take: limit,
      orderBy: { fechaHora: 'desc' },
      include: {
        lote: { include: { producto: { select: { id: true, codigo: true, nombre: true } } } },
        ubicacionOrigen: { select: { id: true, codigo: true, nombre: true } },
        ubicacionDestino: { select: { id: true, codigo: true, nombre: true } },
        usuario: { select: { id: true, nombre: true, codigo: true } },
      },
    }),
    prisma.movimientoInventario.count({ where }),
  ])

  return { data: movimientos, total, page, limit }
}

async function getMovimientoById(id) {
  const movimiento = await prisma.movimientoInventario.findUnique({
    where: { id },
    include: {
      lote: { include: { producto: true } },
      ubicacionOrigen: true,
      ubicacionDestino: true,
      usuario: { select: { id: true, nombre: true, codigo: true } },
    },
  })
  if (!movimiento) throw new Error('Movimiento no encontrado')
  return movimiento
}

async function getStockBajo() {
  return prisma.inventario.findMany({
    where: {
      stockActual: { lte: prisma.inventario.fields.stockMinimo },
    },
    include: {
      lote: { include: { producto: { select: { id: true, codigo: true, nombre: true } } } },
      ubicacion: { select: { id: true, codigo: true, nombre: true } },
    },
    orderBy: { stockActual: 'asc' },
  })
}

async function getResumenInventario() {
  const [totalItems, totalStock, stockBajo, porUbicacion, porTipo] = await Promise.all([
    prisma.inventario.count(),
    prisma.inventario.aggregate({ _sum: { stockActual: true } }),
    prisma.inventario.count({ where: { stockActual: { lte: prisma.inventario.fields.stockMinimo } } }),
    prisma.inventario.groupBy({
      by: ['ubicacionId'],
      _sum: { stockActual: true },
      _count: { _all: true },
    }),
    prisma.inventario.groupBy({
      by: ['ubicacionId'],
      _count: { _all: true },
    }),
  ])

  const ubicacionesConStock = await Promise.all(
    porUbicacion.map(async (u) => {
      const ubicacion = await prisma.ubicacionAlmacen.findUnique({
        where: { id: u.ubicacionId },
        select: { id: true, codigo: true, nombre: true, tipo: true },
      })
      return { ...ubicacion, totalStock: u._sum.stockActual, totalItems: u._count._all }
    })
  )

  return {
    totalItems,
    totalStock: totalStock._sum.stockActual || 0,
    stockBajo,
    porUbicacion: ubicacionesConStock,
  }
}

module.exports = {
  listInventario,
  getInventarioById,
  createInventario,
  updateInventario,
  deleteInventario,
  registrarMovimiento,
  listMovimientos,
  getMovimientoById,
  getStockBajo,
  getResumenInventario,
}