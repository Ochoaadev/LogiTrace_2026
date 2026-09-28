const prisma = require('../../config/database')
const { getPagination } = require('../../utils/pagination')

async function listMotivosDevolucion(query) {
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

  const [motivos, total] = await Promise.all([
    prisma.motivoDevolucion.findMany({
      where,
      skip,
      take: limit,
      orderBy: { nombre: 'asc' },
      include: { _count: { select: { devoluciones: true } } },
    }),
    prisma.motivoDevolucion.count({ where }),
  ])

  return { data: motivos, total, page, limit }
}

async function getMotivoDevolucionById(id) {
  const motivo = await prisma.motivoDevolucion.findUnique({ where: { id } })
  if (!motivo) throw new Error('Motivo de devolución no encontrado')
  return motivo
}

async function createMotivoDevolucion(data) {
  const existing = await prisma.motivoDevolucion.findUnique({ where: { codigo: data.codigo } })
  if (existing) throw new Error('El código ya existe')

  return prisma.motivoDevolucion.create({ data })
}

async function updateMotivoDevolucion(id, data) {
  const motivo = await prisma.motivoDevolucion.findUnique({ where: { id } })
  if (!motivo) throw new Error('Motivo de devolución no encontrado')

  return prisma.motivoDevolucion.update({ where: { id }, data })
}

async function deleteMotivoDevolucion(id) {
  const motivo = await prisma.motivoDevolucion.findUnique({ where: { id } })
  if (!motivo) throw new Error('Motivo de devolución no encontrado')

  const hasDevoluciones = await prisma.devolucion.count({ where: { motivoId: id } })
  if (hasDevoluciones > 0) throw new Error('No se puede eliminar: tiene devoluciones asociadas')

  return prisma.motivoDevolucion.delete({ where: { id } })
}

module.exports = { listMotivosDevolucion, getMotivoDevolucionById, createMotivoDevolucion, updateMotivoDevolucion, deleteMotivoDevolucion }