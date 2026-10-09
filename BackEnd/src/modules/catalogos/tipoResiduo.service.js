const prisma = require('../../config/database')
const { getPagination } = require('../../utils/pagination')
const { AppError } = require('../../utils/AppError')
const { permitir } = require('../../utils/campos')

// Campos que se guardan (el código solo al crear); el resto del cuerpo se descarta
const CAMPOS = ['codigo', 'nombre', 'unidadBase', 'activo']
const EDITABLES = CAMPOS.filter((c) => c !== 'codigo')

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
  if (!tipo) throw new AppError('Tipo de residuo no encontrado', 404)
  return tipo
}

async function createTipoResiduo(data) {
  const existing = await prisma.tipoResiduo.findUnique({ where: { codigo: data.codigo } })
  if (existing) throw new AppError('El código ya existe', 409)

  return prisma.tipoResiduo.create({ data: permitir(data, CAMPOS) })
}

async function updateTipoResiduo(id, data) {
  const tipo = await prisma.tipoResiduo.findUnique({ where: { id } })
  if (!tipo) throw new AppError('Tipo de residuo no encontrado', 404)

  return prisma.tipoResiduo.update({ where: { id }, data: permitir(data, EDITABLES) })
}

async function deleteTipoResiduo(id) {
  const tipo = await prisma.tipoResiduo.findUnique({ where: { id } })
  if (!tipo) throw new AppError('Tipo de residuo no encontrado', 404)

  const hasResiduos = await prisma.residuo.count({ where: { tipoResiduoId: id } })
  if (hasResiduos > 0) throw new AppError('No se puede eliminar: tiene residuos asociados', 400)

  return prisma.tipoResiduo.delete({ where: { id } })
}

module.exports = { listTiposResiduo, getTipoResiduoById, createTipoResiduo, updateTipoResiduo, deleteTipoResiduo }