const prisma = require('../../config/database')
const { getPagination } = require('../../utils/pagination')

async function listClientes(query) {
  const { page, limit, skip } = getPagination(query)
  const { activo, search } = query

  const where = {}
  if (activo !== undefined) where.activo = activo === 'true'
  if (search) {
    where.OR = [
      { razonSocial: { contains: search, mode: 'insensitive' } },
      { codigo: { contains: search, mode: 'insensitive' } },
      { nombreContacto: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [clientes, total] = await Promise.all([
    prisma.cliente.findMany({
      where,
      skip,
      take: limit,
      orderBy: { razonSocial: 'asc' },
    }),
    prisma.cliente.count({ where }),
  ])

  return { data: clientes, total, page, limit }
}

async function getClienteById(id) {
  const cliente = await prisma.cliente.findUnique({ where: { id } })
  if (!cliente) throw new Error('Cliente no encontrado')
  return cliente
}

async function createCliente(data) {
  if (data.numeroDocumento) {
    const existing = await prisma.cliente.findUnique({ where: { numeroDocumento: data.numeroDocumento } })
    if (existing) throw new Error('El número de documento ya existe')
  }
  const existing = await prisma.cliente.findUnique({ where: { codigo: data.codigo } })
  if (existing) throw new Error('El código ya existe')

  return prisma.cliente.create({ data })
}

async function updateCliente(id, data) {
  const cliente = await prisma.cliente.findUnique({ where: { id } })
  if (!cliente) throw new Error('Cliente no encontrado')

  if (data.numeroDocumento && data.numeroDocumento !== cliente.numeroDocumento) {
    const existing = await prisma.cliente.findUnique({ where: { numeroDocumento: data.numeroDocumento } })
    if (existing) throw new Error('El número de documento ya existe')
  }

  return prisma.cliente.update({ where: { id }, data })
}

async function deleteCliente(id) {
  const cliente = await prisma.cliente.findUnique({ where: { id } })
  if (!cliente) throw new Error('Cliente no encontrado')

  const hasPedidos = await prisma.pedido.count({ where: { clienteId: id } })
  if (hasPedidos > 0) throw new Error('No se puede eliminar: tiene pedidos asociados')

  return prisma.cliente.delete({ where: { id } })
}

module.exports = { listClientes, getClienteById, createCliente, updateCliente, deleteCliente }