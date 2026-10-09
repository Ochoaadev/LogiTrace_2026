const prisma = require('../../config/database')
const { getPagination } = require('../../utils/pagination')
const { AppError } = require('../../utils/AppError')
const { permitir } = require('../../utils/campos')

// Campos que se guardan (el código solo al crear); el resto del cuerpo se descarta
const CAMPOS = ['codigo', 'tipo', 'placa', 'descripcion', 'capacidadCarga', 'unidadCapacidad', 'esTermico', 'activo']
const EDITABLES = CAMPOS.filter((c) => c !== 'codigo')

async function listVehiculos(query) {
  const { page, limit, skip } = getPagination(query)
  const { tipo, activo, search } = query

  const where = {}
  if (tipo) where.tipo = tipo
  if (activo !== undefined) where.activo = activo === 'true'
  if (search) {
    where.OR = [
      { codigo: { contains: search, mode: 'insensitive' } },
      { placa: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [vehiculos, total] = await Promise.all([
    prisma.vehiculo.findMany({
      where,
      skip,
      take: limit,
      orderBy: { codigo: 'asc' },
      include: { _count: { select: { despachos: true } } },
    }),
    prisma.vehiculo.count({ where }),
  ])

  return { data: vehiculos, total, page, limit }
}

async function getVehiculoById(id) {
  const vehiculo = await prisma.vehiculo.findUnique({
    where: { id },
    include: { despachos: { take: 5, orderBy: { fechaHoraSalida: 'desc' } } },
  })
  if (!vehiculo) throw new AppError('Vehículo no encontrado', 404)
  return vehiculo
}

async function createVehiculo(data) {
  const existing = await prisma.vehiculo.findUnique({ where: { codigo: data.codigo } })
  if (existing) throw new AppError('El código ya existe', 409)

  if (data.placa) {
    const existingPlaca = await prisma.vehiculo.findUnique({ where: { placa: data.placa } })
    if (existingPlaca) throw new AppError('La placa ya existe', 409)
  }

  return prisma.vehiculo.create({ data: permitir(data, CAMPOS) })
}

async function updateVehiculo(id, data) {
  const vehiculo = await prisma.vehiculo.findUnique({ where: { id } })
  if (!vehiculo) throw new AppError('Vehículo no encontrado', 404)

  if (data.placa && data.placa !== vehiculo.placa) {
    const existing = await prisma.vehiculo.findUnique({ where: { placa: data.placa } })
    if (existing) throw new AppError('La placa ya existe', 409)
  }

  return prisma.vehiculo.update({ where: { id }, data: permitir(data, EDITABLES) })
}

async function deleteVehiculo(id) {
  const vehiculo = await prisma.vehiculo.findUnique({ where: { id } })
  if (!vehiculo) throw new AppError('Vehículo no encontrado', 404)

  const hasDespachos = await prisma.despacho.count({ where: { vehiculoId: id } })
  if (hasDespachos > 0) throw new AppError('No se puede eliminar: tiene despachos asociados', 400)

  return prisma.vehiculo.delete({ where: { id } })
}

module.exports = { listVehiculos, getVehiculoById, createVehiculo, updateVehiculo, deleteVehiculo }