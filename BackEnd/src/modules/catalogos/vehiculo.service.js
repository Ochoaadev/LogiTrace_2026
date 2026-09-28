const prisma = require('../../config/database')
const { getPagination } = require('../../utils/pagination')

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
  if (!vehiculo) throw new Error('Vehículo no encontrado')
  return vehiculo
}

async function createVehiculo(data) {
  const existing = await prisma.vehiculo.findUnique({ where: { codigo: data.codigo } })
  if (existing) throw new Error('El código ya existe')

  if (data.placa) {
    const existingPlaca = await prisma.vehiculo.findUnique({ where: { placa: data.placa } })
    if (existingPlaca) throw new Error('La placa ya existe')
  }

  return prisma.vehiculo.create({ data })
}

async function updateVehiculo(id, data) {
  const vehiculo = await prisma.vehiculo.findUnique({ where: { id } })
  if (!vehiculo) throw new Error('Vehículo no encontrado')

  if (data.placa && data.placa !== vehiculo.placa) {
    const existing = await prisma.vehiculo.findUnique({ where: { placa: data.placa } })
    if (existing) throw new Error('La placa ya existe')
  }

  return prisma.vehiculo.update({ where: { id }, data })
}

async function deleteVehiculo(id) {
  const vehiculo = await prisma.vehiculo.findUnique({ where: { id } })
  if (!vehiculo) throw new Error('Vehículo no encontrado')

  const hasDespachos = await prisma.despacho.count({ where: { vehiculoId: id } })
  if (hasDespachos > 0) throw new Error('No se puede eliminar: tiene despachos asociados')

  return prisma.vehiculo.delete({ where: { id } })
}

module.exports = { listVehiculos, getVehiculoById, createVehiculo, updateVehiculo, deleteVehiculo }