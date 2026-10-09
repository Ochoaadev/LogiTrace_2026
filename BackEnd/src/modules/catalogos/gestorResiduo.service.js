const prisma = require('../../config/database')
const { getPagination } = require('../../utils/pagination')
const { AppError } = require('../../utils/AppError')
const { permitir } = require('../../utils/campos')

// Campos que se guardan (el código solo al crear); el resto del cuerpo se descarta
const CAMPOS = ['codigo', 'nombre', 'tipo', 'contacto', 'ubicacion', 'activo']
const EDITABLES = CAMPOS.filter((c) => c !== 'codigo')

async function listGestoresResiduo(query) {
  const { page, limit, skip } = getPagination(query)
  const { tipo, activo, search } = query

  const where = {}
  if (tipo) where.tipo = tipo
  if (activo !== undefined) where.activo = activo === 'true'
  if (search) {
    where.OR = [
      { nombre: { contains: search, mode: 'insensitive' } },
      { codigo: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [gestores, total] = await Promise.all([
    prisma.gestorResiduo.findMany({
      where,
      skip,
      take: limit,
      orderBy: { nombre: 'asc' },
      include: { _count: { select: { residuos: true } } },
    }),
    prisma.gestorResiduo.count({ where }),
  ])

  return { data: gestores, total, page, limit }
}

async function getGestorResiduoById(id) {
  const gestor = await prisma.gestorResiduo.findUnique({
    where: { id },
    include: { residuos: { take: 5, orderBy: { fechaGeneracion: 'desc' } } },
  })
  if (!gestor) throw new AppError('Gestor de residuo no encontrado', 404)
  return gestor
}

async function createGestorResiduo(data) {
  const existing = await prisma.gestorResiduo.findUnique({ where: { codigo: data.codigo } })
  if (existing) throw new AppError('El código ya existe', 409)

  return prisma.gestorResiduo.create({ data: permitir(data, CAMPOS) })
}

async function updateGestorResiduo(id, data) {
  const gestor = await prisma.gestorResiduo.findUnique({ where: { id } })
  if (!gestor) throw new AppError('Gestor de residuo no encontrado', 404)

  return prisma.gestorResiduo.update({ where: { id }, data: permitir(data, EDITABLES) })
}

async function deleteGestorResiduo(id) {
  const gestor = await prisma.gestorResiduo.findUnique({ where: { id } })
  if (!gestor) throw new AppError('Gestor de residuo no encontrado', 404)

  const hasResiduos = await prisma.residuo.count({ where: { gestorId: id } })
  if (hasResiduos > 0) throw new AppError('No se puede eliminar: tiene residuos asociados', 400)

  return prisma.gestorResiduo.delete({ where: { id } })
}

module.exports = { listGestoresResiduo, getGestorResiduoById, createGestorResiduo, updateGestorResiduo, deleteGestorResiduo }