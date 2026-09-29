// Catálogos operativos de solo lectura (repartidores, rutas, lotes, ubicaciones) que usan los
// filtros y selectores de Inventario y Despachos. El CRUD completo corresponde a la Fase 10.
const prisma = require('../../config/database')
const { getPagination } = require('../../utils/pagination')
const { AppError } = require('../../utils/AppError')

async function listRepartidores(query) {
  const { page, limit, skip } = getPagination(query)
  const { estado, search } = query

  const where = {}
  if (estado) where.estado = estado
  if (search) {
    where.usuario = {
      OR: [
        { nombre: { contains: search, mode: 'insensitive' } },
        { codigo: { contains: search, mode: 'insensitive' } },
      ],
    }
  }

  const [data, total] = await Promise.all([
    prisma.repartidor.findMany({
      where,
      skip,
      take: limit,
      orderBy: { usuario: { nombre: 'asc' } },
      include: { usuario: { select: { id: true, codigo: true, nombre: true, activo: true } } },
    }),
    prisma.repartidor.count({ where }),
  ])

  return { data, total, page, limit }
}

async function getRepartidorById(id) {
  const repartidor = await prisma.repartidor.findUnique({
    where: { id },
    include: {
      usuario: { select: { id: true, codigo: true, nombre: true, email: true, activo: true } },
      despachos: { take: 5, orderBy: { fechaHoraSalida: 'desc' }, select: { id: true, codigo: true, estado: true } },
    },
  })
  if (!repartidor) throw new AppError('Repartidor no encontrado', 404)
  return repartidor
}

async function listRutas(query) {
  const { page, limit, skip } = getPagination(query)
  const { estado, zonaId, search } = query

  const where = {}
  if (estado) where.estado = estado
  if (zonaId) where.zonaId = zonaId
  if (search) {
    where.OR = [
      { nombre: { contains: search, mode: 'insensitive' } },
      { codigo: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [data, total] = await Promise.all([
    prisma.ruta.findMany({
      where,
      skip,
      take: limit,
      orderBy: { fecha: 'desc' },
      include: { zona: { select: { id: true, codigo: true, nombre: true } } },
    }),
    prisma.ruta.count({ where }),
  ])

  return { data, total, page, limit }
}

async function getRutaById(id) {
  const ruta = await prisma.ruta.findUnique({
    where: { id },
    include: { zona: true, despachos: { select: { id: true, codigo: true, estado: true } } },
  })
  if (!ruta) throw new AppError('Ruta no encontrada', 404)
  return ruta
}

async function listLotes(query) {
  const { page, limit, skip } = getPagination(query)
  const { productoId, estadoCalidad, search } = query

  const where = {}
  if (productoId) where.productoId = productoId
  if (estadoCalidad) where.estadoCalidad = estadoCalidad
  if (search) {
    where.OR = [
      { codigo: { contains: search, mode: 'insensitive' } },
      { producto: { nombre: { contains: search, mode: 'insensitive' } } },
    ]
  }

  const [data, total] = await Promise.all([
    prisma.lote.findMany({
      where,
      skip,
      take: limit,
      orderBy: { fechaVencimiento: 'asc' },
      include: { producto: { select: { id: true, codigo: true, nombre: true, unidadBase: true } } },
    }),
    prisma.lote.count({ where }),
  ])

  return { data, total, page, limit }
}

async function getLoteById(id) {
  const lote = await prisma.lote.findUnique({
    where: { id },
    include: {
      producto: true,
      inventarios: { include: { ubicacion: { select: { id: true, codigo: true, nombre: true } } } },
    },
  })
  if (!lote) throw new AppError('Lote no encontrado', 404)
  return lote
}

async function listUbicaciones(query) {
  const { page, limit, skip } = getPagination(query)
  const { activo, tipo, search } = query

  const where = {}
  if (activo !== undefined) where.activo = activo === 'true'
  if (tipo) where.tipo = tipo
  if (search) {
    where.OR = [
      { nombre: { contains: search, mode: 'insensitive' } },
      { codigo: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [data, total] = await Promise.all([
    prisma.ubicacionAlmacen.findMany({ where, skip, take: limit, orderBy: { codigo: 'asc' } }),
    prisma.ubicacionAlmacen.count({ where }),
  ])

  return { data, total, page, limit }
}

async function getUbicacionById(id) {
  const ubicacion = await prisma.ubicacionAlmacen.findUnique({ where: { id } })
  if (!ubicacion) throw new AppError('Ubicación no encontrada', 404)
  return ubicacion
}

module.exports = {
  listRepartidores,
  getRepartidorById,
  listRutas,
  getRutaById,
  listLotes,
  getLoteById,
  listUbicaciones,
  getUbicacionById,
}
