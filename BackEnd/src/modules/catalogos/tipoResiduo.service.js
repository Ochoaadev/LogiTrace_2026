const prisma = require('../../config/database')
const { getPagination } = require('../../utils/pagination')

async function listTiposResiduo(query) {
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
    prisma.tipoResiduo.findMany({
      where,
      skip,
      take: limit,
      orderBy: { nombre: 'asc' },
      include: { _count: { select: { residuos: true } } },
    }),
    prisma.tipoResiduo.count({ where }),
  ])

  return { data: tipos, total, page, limit }
}

async function getTipoResiduoById(id) {
  const tipo = await prisma.tipoResiduo.findUnique({ where: { id } })
  if (!tipo) throw new Error('Tipo de residuo no encontrado')
  return tipo
}

async function createTipoResiduo(data) {
  const existing = await prisma.tipoResiduo.findUnique({ where: { codigo: data.codigo } })
  if (existing) throw new Error('El código ya existe')

  return prisma.tipoResiduo.create({ data })
}

async function updateTipoResiduo(id, data) {
  const tipo = await prisma.tipoResiduo.findUnique({ where: { id } })
  if (!tipo) throw new Error('Tipo de residuo no encontrado')

  return prisma.tipoResiduo.update({ where: { id }, data })
}

async function deleteTipoResiduo(id) {
  const tipo = await prisma.tipoResiduo.findUnique({ where: { id } })
  if (!tipo) throw new Error('Tipo de residuo no encontrado')

  const hasResiduos = await prisma.residuo.count({ where: { tipoResiduoId: id } })
  if (hasResiduos > 0) throw new Error('No se puede eliminar: tiene residuos asociados')

  return prisma.tipoResiduo.delete({ where: { id } })
}

module.exports = { listTiposResiduo, getTipoResiduoById, createTipoResiduo, updateTipoResiduo, deleteTipoResiduo }