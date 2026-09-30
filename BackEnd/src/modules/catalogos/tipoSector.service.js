const prisma = require('../../config/database')
const { getPagination } = require('../../utils/pagination')
const { AppError } = require('../../utils/AppError')
const { idsSinTildes } = require('../../utils/busqueda')

const CAMPOS = ['codigo', 'nombre', 'descripcion', 'latitudCentro', 'longitudCentro', 'radioMetros', 'activo']
const permitidos = (data) => Object.fromEntries(Object.entries(data).filter(([k, v]) => CAMPOS.includes(k) && v !== undefined))

async function listTiposSector(query) {
  const { page, limit, skip } = getPagination(query)
  const { activo, search } = query

  const where = {}
  if (activo !== undefined) where.activo = activo === 'true'
  if (search) where.id = { in: await idsSinTildes('TipoSector', ['nombre', 'codigo', 'descripcion'], search) }

  const [tipos, total] = await Promise.all([
    prisma.tipoSector.findMany({ where, skip, take: limit, orderBy: { codigo: 'asc' }, include: { _count: { select: { pedidos: true } } } }),
    prisma.tipoSector.count({ where }),
  ])

  return { data: tipos, total, page, limit }
}

async function getTipoSectorById(id) {
  const tipo = await prisma.tipoSector.findUnique({ where: { id } })
  if (!tipo) throw new AppError('Tipo de sector no encontrado', 404)
  return tipo
}

async function createTipoSector(data) {
  const datos = permitidos(data)
  const existing = await prisma.tipoSector.findUnique({ where: { codigo: datos.codigo } })
  if (existing) throw new AppError('El código ya existe', 409)
  return prisma.tipoSector.create({ data: datos })
}

async function updateTipoSector(id, data) {
  await getTipoSectorById(id)
  const cambios = permitidos(data)
  delete cambios.codigo // el código no se edita
  return prisma.tipoSector.update({ where: { id }, data: cambios })
}

async function deleteTipoSector(id) {
  await getTipoSectorById(id)
  const usados = await prisma.pedido.count({ where: { tipoSectorId: id } })
  if (usados > 0) throw new AppError('No se puede eliminar: tiene pedidos asociados', 400)
  return prisma.tipoSector.delete({ where: { id } })
}

module.exports = { listTiposSector, getTipoSectorById, createTipoSector, updateTipoSector, deleteTipoSector }
