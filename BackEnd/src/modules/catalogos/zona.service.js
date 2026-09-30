const prisma = require('../../config/database')
const { getPagination } = require('../../utils/pagination')
const { AppError } = require('../../utils/AppError')
const { idsSinTildes } = require('../../utils/busqueda')

// Solo estos campos llegan a la base de datos (antes se pasaba el cuerpo completo de la petición)
const CAMPOS_ZONA = ['codigo', 'nombre', 'municipio', 'latitudCentro', 'longitudCentro', 'radioMetros', 'activo']
const permitidos = (data) => Object.fromEntries(Object.entries(data).filter(([k, v]) => CAMPOS_ZONA.includes(k) && v !== undefined))

async function listZonas(query) {
  const { page, limit, skip } = getPagination(query)
  const { activo, search } = query

  const where = {}
  if (activo !== undefined) where.activo = activo === 'true'
  if (search) {
    where.id = { in: await idsSinTildes('ZonaDespacho', ['nombre', 'codigo', 'municipio'], search) }
  }

  const [zonas, total] = await Promise.all([
    prisma.zonaDespacho.findMany({
      where,
      skip,
      take: limit,
      orderBy: { nombre: 'asc' },
      include: { _count: { select: { pedidos: true, rutas: true } } },
    }),
    prisma.zonaDespacho.count({ where }),
  ])

  return { data: zonas, total, page, limit }
}

async function getZonaById(id) {
  const zona = await prisma.zonaDespacho.findUnique({
    where: { id },
    include: { rutas: true, pedidos: { take: 5, orderBy: { fechaHora: 'desc' } } },
  })
  if (!zona) throw new AppError('Zona no encontrada', 404)
  return zona
}

async function createZona(data) {
  const existing = await prisma.zonaDespacho.findUnique({ where: { codigo: data.codigo } })
  if (existing) throw new AppError('El código ya existe', 409)

  return prisma.zonaDespacho.create({ data: permitidos(data) })
}

async function updateZona(id, data) {
  const zona = await prisma.zonaDespacho.findUnique({ where: { id } })
  if (!zona) throw new AppError('Zona no encontrada', 404)

  const cambios = permitidos(data)
  delete cambios.codigo // el código no se edita
  return prisma.zonaDespacho.update({ where: { id }, data: cambios })
}

async function deleteZona(id) {
  const zona = await prisma.zonaDespacho.findUnique({ where: { id } })
  if (!zona) throw new AppError('Zona no encontrada', 404)

  const hasPedidos = await prisma.pedido.count({ where: { zonaId: id } })
  if (hasPedidos > 0) throw new AppError('No se puede eliminar: tiene pedidos asociados', 400)

  const hasRutas = await prisma.ruta.count({ where: { zonaId: id } })
  if (hasRutas > 0) throw new AppError('No se puede eliminar: tiene rutas asociadas', 400)

  return prisma.zonaDespacho.delete({ where: { id } })
}

module.exports = { listZonas, getZonaById, createZona, updateZona, deleteZona }