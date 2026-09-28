const prisma = require('../../config/database')
const { getPagination } = require('../../utils/pagination')

async function listTiposIncidencia(query) {
  const { page, limit, skip } = getPagination(query)
  const { activo, search } = query

  const where = {}
  if (activo !== undefined) where.activo = activo === 'true'
  if (search) {
    where.OR = [
      { nombre: { contains: search, mode: 'insensitive' } },
      { codigo: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [tipos, total] = await Promise.all([
    prisma.tipoIncidencia.findMany({
      where,
      skip,
      take: limit,
      orderBy: { nombre: 'asc' },
      include: { _count: { select: { incidencias: true } } },
    }),
    prisma.tipoIncidencia.count({ where }),
  ])

  return { data: tipos, total, page, limit }
}

async function getTipoIncidenciaById(id) {
  const tipo = await prisma.tipoIncidencia.findUnique({ where: { id } })
  if (!tipo) throw new Error('Tipo de incidencia no encontrado')
  return tipo
}

async function createTipoIncidencia(data) {
  const existing = await prisma.tipoIncidencia.findUnique({ where: { codigo: data.codigo } })
  if (existing) throw new Error('El código ya existe')

  return prisma.tipoIncidencia.create({ data })
}

async function updateTipoIncidencia(id, data) {
  const tipo = await prisma.tipoIncidencia.findUnique({ where: { id } })
  if (!tipo) throw new Error('Tipo de incidencia no encontrado')

  return prisma.tipoIncidencia.update({ where: { id }, data })
}

async function deleteTipoIncidencia(id) {
  const tipo = await prisma.tipoIncidencia.findUnique({ where: { id } })
  if (!tipo) throw new Error('Tipo de incidencia no encontrado')

  const hasIncidencias = await prisma.incidencia.count({ where: { tipoIncidenciaId: id } })
  if (hasIncidencias > 0) throw new Error('No se puede eliminar: tiene incidencias asociadas')

  return prisma.tipoIncidencia.delete({ where: { id } })
}

module.exports = { listTiposIncidencia, getTipoIncidenciaById, createTipoIncidencia, updateTipoIncidencia, deleteTipoIncidencia }