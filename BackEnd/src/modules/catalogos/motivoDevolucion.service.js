const prisma = require('../../config/database')
const { getPagination } = require('../../utils/pagination')
const { AppError } = require('../../utils/AppError')
const { permitir } = require('../../utils/campos')

// Campos que se guardan (el código solo al crear); el resto del cuerpo se descarta
const CAMPOS = ['codigo', 'nombre', 'descripcion', 'activo']
const EDITABLES = CAMPOS.filter((c) => c !== 'codigo')

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
  if (!motivo) throw new AppError('Motivo de devolución no encontrado', 404)
  return motivo
}

async function createMotivoDevolucion(data) {
  const existing = await prisma.motivoDevolucion.findUnique({ where: { codigo: data.codigo } })
  if (existing) throw new AppError('El código ya existe', 409)

  return prisma.motivoDevolucion.create({ data: permitir(data, CAMPOS) })
}

async function updateMotivoDevolucion(id, data) {
  const motivo = await prisma.motivoDevolucion.findUnique({ where: { id } })
  if (!motivo) throw new AppError('Motivo de devolución no encontrado', 404)

  return prisma.motivoDevolucion.update({ where: { id }, data: permitir(data, EDITABLES) })
}

async function deleteMotivoDevolucion(id) {
  const motivo = await prisma.motivoDevolucion.findUnique({ where: { id } })
  if (!motivo) throw new AppError('Motivo de devolución no encontrado', 404)

  const hasDevoluciones = await prisma.devolucion.count({ where: { motivoId: id } })
  if (hasDevoluciones > 0) throw new AppError('No se puede eliminar: tiene devoluciones asociadas', 400)

  return prisma.motivoDevolucion.delete({ where: { id } })
}

module.exports = { listMotivosDevolucion, getMotivoDevolucionById, createMotivoDevolucion, updateMotivoDevolucion, deleteMotivoDevolucion }