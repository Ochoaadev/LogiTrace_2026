const prisma = require('../../config/database')
const { getPagination } = require('../../utils/pagination')
const { AppError } = require('../../utils/AppError')
const { LIMITE_CRITICO_C } = require('../trazabilidad/expediente.service')

async function listInventario(query) {
  const { page, limit, skip } = getPagination(query)
  const { ubicacionId, productoId, loteId, estado, stockBajo, search, tipoUbicacion } = query

  const where = {}

  if (ubicacionId) where.ubicacionId = ubicacionId
  if (tipoUbicacion) where.ubicacion = { tipo: tipoUbicacion }
  if (loteId) where.loteId = loteId
  // productoId y estado (calidad del lote) filtran por la relación lote
  if (productoId || estado) {
    where.lote = {
      ...(productoId && { productoId }),
      ...(estado && { estadoCalidad: estado }),
    }
  }
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
  if (!inventario) throw new AppError('Registro de inventario no encontrado', 404)
  return inventario
}

// Detalle de un lote: producto, estado de calidad y su stock en cada ubicación
async function getLoteDetalle(loteId) {
  const lote = await prisma.lote.findUnique({
    where: { id: loteId },
    include: {
      producto: { select: { id: true, codigo: true, nombre: true, unidadBase: true, esPerecedero: true } },
      inventarios: {
        orderBy: { stockActual: 'desc' },
        include: { ubicacion: { select: { id: true, codigo: true, nombre: true, tipo: true } } },
      },
    },
  })
  if (!lote) throw new AppError('Lote no encontrado', 404)
  return {
    ...lote,
    unidadBase: lote.producto?.unidadBase,
    stockTotal: lote.inventarios.reduce((sum, inv) => sum + Number(inv.stockActual), 0),
  }
}

async function createInventario(data) {
  const { loteId, ubicacionId, stockActual = 0, stockMinimo = 0 } = data

  const existing = await prisma.inventario.findUnique({
    where: { loteId_ubicacionId: { loteId, ubicacionId } },
  })
  if (existing) throw new AppError('Ya existe un registro de inventario para este lote en esta ubicación', 400)

  const lote = await prisma.lote.findUnique({ where: { id: loteId } })
  if (!lote) throw new AppError('Lote no encontrado', 404)

  const ubicacion = await prisma.ubicacionAlmacen.findUnique({ where: { id: ubicacionId } })
  if (!ubicacion) throw new AppError('Ubicación no encontrada', 404)
  if (!ubicacion.activo) throw new AppError('Ubicación inactiva', 400)

  return prisma.inventario.create({
    data: { loteId, ubicacionId, stockActual, stockMinimo },
    include: { lote: { include: { producto: true } }, ubicacion: true },
  })
}

async function updateInventario(id, data) {
  const inventario = await prisma.inventario.findUnique({ where: { id } })
  if (!inventario) throw new AppError('Registro de inventario no encontrado', 404)

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
  if (!inventario) throw new AppError('Registro de inventario no encontrado', 404)

  if (inventario.stockActual > 0) {
    throw new AppError('No se puede eliminar: tiene stock actual > 0', 400)
  }

  return prisma.inventario.delete({ where: { id } })
}

async function registrarMovimiento(data, usuarioId) {
  const { tipo, loteId, ubicacionOrigenId, ubicacionDestinoId, cantidad, unidad, referenciaTipo, referenciaId, observaciones } = data

  if (tipo === 'TRASLADO') {
    if (!ubicacionOrigenId || !ubicacionDestinoId) {
      throw new AppError('TRASLADO requiere ubicacionOrigenId y ubicacionDestinoId', 400)
    }
    if (ubicacionOrigenId === ubicacionDestinoId) {
      throw new AppError('Origen y destino deben ser diferentes', 400)
    }
  } else if (['ENTRADA', 'REINGRESO', 'AJUSTE'].includes(tipo)) {
    if (!ubicacionDestinoId) throw new AppError(`${tipo} requiere ubicacionDestinoId`, 400)
  } else if (['SALIDA', 'DESCARTE'].includes(tipo)) {
    if (!ubicacionOrigenId) throw new AppError(`${tipo} requiere ubicacionOrigenId`, 400)
  }

  return prisma.$transaction(async (tx) => {
    // Obtener o crear inventario origen
    let inventarioOrigen = null
    if (ubicacionOrigenId) {
      inventarioOrigen = await tx.inventario.findUnique({
        where: { loteId_ubicacionId: { loteId, ubicacionId: ubicacionOrigenId } },
      })
      if (!inventarioOrigen && ['SALIDA', 'DESCARTE', 'TRASLADO'].includes(tipo)) {
        throw new AppError('No existe inventario en la ubicación origen', 400)
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
      // Number(): stockActual es Decimal y cantidad llega como string; compararlos directamente
      // los compara como texto ("100" < "20" es true).
      if (!inventarioOrigen || Number(inventarioOrigen.stockActual) < Number(cantidad)) {
        throw new AppError(`Stock insuficiente en ubicación origen (disponible: ${inventarioOrigen?.stockActual || 0})`, 400)
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
      await tx.inventario.update({
        where: { id: inventarioDestino.id },
        data: { stockActual: { increment: cantidad } },
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
  const { tipo, loteId, ubicacionId, fechaDesde, fechaHasta, search } = query

  const where = {}

  if (tipo) where.tipo = tipo
  if (search) {
    where.AND = [{
      OR: [
        { lote: { codigo: { contains: search, mode: 'insensitive' } } },
        { lote: { producto: { nombre: { contains: search, mode: 'insensitive' } } } },
        { observaciones: { contains: search, mode: 'insensitive' } },
      ],
    }]
  }
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
  if (!movimiento) throw new AppError('Movimiento no encontrado', 404)
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

  // ---- Indicadores del módulo 06 (Figma)
  const semana = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const [inventarios, cavas, reingresos, alertas, recientes] = await Promise.all([
    prisma.inventario.findMany({
      where: { stockActual: { gt: 0 }, ubicacion: { tipo: { notIn: ['CUARENTENA', 'DESCARTE'] } } },
      select: { stockActual: true, lote: { select: { producto: { select: { nombre: true, unidadBase: true } } } } },
    }),
    prisma.ubicacionAlmacen.findMany({
      where: { tipo: 'CAVA', activo: true },
      orderBy: { codigo: 'asc' },
      select: {
        id: true, codigo: true, nombre: true,
        registrosTemperatura: { orderBy: { fechaHora: 'desc' }, take: 1, select: { temperaturaC: true, fechaHora: true, usuario: { select: { nombre: true } } } },
        inventarios: { select: { stockActual: true } },
      },
    }),
    prisma.movimientoInventario.findMany({
      where: { referenciaTipo: 'Devolucion', tipo: 'REINGRESO', fechaHora: { gte: semana } },
      select: { cantidad: true, unidad: true, referenciaId: true },
    }),
    prisma.inventario.findMany({
      where: { stockActual: { lte: prisma.inventario.fields.stockMinimo }, stockMinimo: { gt: 0 } },
      take: 5,
      orderBy: { stockActual: 'asc' },
      select: {
        stockActual: true, stockMinimo: true,
        lote: { select: { id: true, codigo: true, producto: { select: { nombre: true, unidadBase: true } } } },
        ubicacion: { select: { nombre: true } },
      },
    }),
    prisma.movimientoInventario.findMany({
      orderBy: { fechaHora: 'desc' },
      take: 3,
      select: {
        id: true, tipo: true, cantidad: true, unidad: true, fechaHora: true, observaciones: true, referenciaTipo: true,
        lote: { select: { id: true, codigo: true } },
        ubicacionOrigen: { select: { nombre: true } },
        ubicacionDestino: { select: { nombre: true } },
        usuario: { select: { nombre: true } },
      },
    }),
  ])

  const porProducto = {}
  for (const i of inventarios) {
    const nombre = i.lote.producto?.nombre || 'Producto'
    porProducto[nombre] = porProducto[nombre] || { producto: nombre, unidad: i.lote.producto?.unidadBase, stock: 0 }
    porProducto[nombre].stock += Number(i.stockActual)
  }

  return {
    totalItems,
    totalStock: totalStock._sum.stockActual || 0,
    stockBajo,
    porUbicacion: ubicacionesConStock,
    stockProductoTerminado: {
      total: Object.values(porProducto).reduce((s, p) => s + p.stock, 0),
      porProducto: Object.values(porProducto).sort((a, b) => b.stock - a.stock),
    },
    cavas: cavas.map((c) => {
      const r = c.registrosTemperatura[0]
      return {
        id: c.id,
        codigo: c.codigo,
        nombre: c.nombre,
        stock: c.inventarios.reduce((s, i) => s + Number(i.stockActual), 0),
        temperatura: r ? { temperaturaC: Number(r.temperaturaC), fechaHora: r.fechaHora, usuario: r.usuario?.nombre, conforme: Number(r.temperaturaC) <= LIMITE_CRITICO_C } : null,
      }
    }),
    limiteCriticoC: LIMITE_CRITICO_C,
    reingresosSemana: {
      movimientos: reingresos.length,
      devoluciones: new Set(reingresos.map((r) => r.referenciaId)).size,
      cantidad: reingresos.reduce((s, r) => s + Number(r.cantidad), 0),
    },
    alertas: alertas.map((a) => ({
      loteId: a.lote.id,
      lote: a.lote.codigo,
      producto: a.lote.producto?.nombre,
      ubicacion: a.ubicacion?.nombre,
      stockActual: Number(a.stockActual),
      stockMinimo: Number(a.stockMinimo),
      unidad: a.lote.producto?.unidadBase,
    })),
    actividadReciente: recientes.map((m) => ({ ...m, cantidad: Number(m.cantidad) })),
  }
}

// Reporte kardex (CSV) con los filtros de la lista de movimientos; separador ";" para Excel es-VE
async function exportKardexCsv(query) {
  const { data } = await listMovimientos({ ...query, page: 1, limit: 100 })
  const fecha = (d) => new Date(d).toLocaleString('es-VE', { timeZone: 'America/Caracas' })
  const celda = (v) => {
    if (v === null || v === undefined) return ''
    const s = String(v)
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const filas = data.map((m) => [
    fecha(m.fechaHora), m.tipo, m.lote?.codigo, m.lote?.producto?.nombre, Number(m.cantidad), m.unidad,
    m.ubicacionOrigen?.nombre, m.ubicacionDestino?.nombre, m.usuario?.nombre, m.referenciaTipo, m.observaciones,
  ].map(celda).join(';'))
  const encabezado = ['Fecha y hora', 'Tipo', 'Lote', 'Producto', 'Cantidad', 'Unidad', 'Origen', 'Destino', 'Usuario', 'Referencia', 'Observaciones']
  return '\uFEFF' + [encabezado.join(';'), ...filas].join('\r\n')
}

// Fija el stock de un lote en una ubicación a un valor absoluto (conteo físico) y deja el
// movimiento AJUSTE en el kardex con la diferencia firmada.
async function ajustarStock(loteId, { ubicacionId, cantidadNueva, observaciones }, usuarioId) {
  const nueva = Number(cantidadNueva)

  return prisma.$transaction(async (tx) => {
    const lote = await tx.lote.findUnique({
      where: { id: loteId },
      include: { producto: { select: { unidadBase: true } } },
    })
    if (!lote) throw new AppError('Lote no encontrado', 404)

    const ubicacion = await tx.ubicacionAlmacen.findUnique({ where: { id: ubicacionId } })
    if (!ubicacion) throw new AppError('Ubicación no encontrada', 404)

    let inventario = await tx.inventario.findUnique({
      where: { loteId_ubicacionId: { loteId, ubicacionId } },
    })
    if (!inventario) {
      inventario = await tx.inventario.create({
        data: { loteId, ubicacionId, stockActual: 0, stockMinimo: 0 },
      })
    }

    const anterior = Number(inventario.stockActual)
    const delta = nueva - anterior
    if (delta === 0) throw new AppError('El stock ya tiene ese valor; no hay nada que ajustar', 400)

    await tx.inventario.update({
      where: { id: inventario.id },
      data: { stockActual: nueva },
    })

    return tx.movimientoInventario.create({
      data: {
        tipo: 'AJUSTE',
        loteId,
        ubicacionDestinoId: ubicacionId,
        cantidad: delta,
        unidad: lote.producto?.unidadBase || 'und',
        usuarioId,
        referenciaTipo: 'AJUSTE_MANUAL',
        observaciones: [`Ajuste de ${anterior} a ${nueva}`, observaciones].filter(Boolean).join(' · '),
      },
      include: {
        lote: { include: { producto: { select: { id: true, codigo: true, nombre: true } } } },
        ubicacionDestino: { select: { id: true, codigo: true, nombre: true } },
        usuario: { select: { id: true, nombre: true, codigo: true } },
      },
    })
  })
}

module.exports = {
  exportKardexCsv,
  getLoteDetalle,
  ajustarStock,
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