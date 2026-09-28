const prisma = require('../../config/database')
const { getPagination } = require('../../utils/pagination')

async function listProductos(query) {
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

  const [productos, total] = await Promise.all([
    prisma.producto.findMany({
      where,
      skip,
      take: limit,
      orderBy: { nombre: 'asc' },
      include: {
        _count: { select: { lotes: true } },
      },
    }),
    prisma.producto.count({ where }),
  ])

  return { data: productos, total, page, limit }
}

async function getProductoById(id) {
  const producto = await prisma.producto.findUnique({
    where: { id },
    include: {
      lotes: {
        orderBy: { fechaVencimiento: 'asc' },
        include: {
          inventarios: { include: { ubicacion: true } },
        },
      },
    },
  })
  if (!producto) throw new Error('Producto no encontrado')
  return producto
}

async function createProducto(data) {
  const existing = await prisma.producto.findUnique({ where: { codigo: data.codigo } })
  if (existing) throw new Error('El código ya existe')

  return prisma.producto.create({ data })
}

async function updateProducto(id, data) {
  const producto = await prisma.producto.findUnique({ where: { id } })
  if (!producto) throw new Error('Producto no encontrado')

  return prisma.producto.update({ where: { id }, data })
}

async function deleteProducto(id) {
  const producto = await prisma.producto.findUnique({ where: { id } })
  if (!producto) throw new Error('Producto no encontrado')

  const hasLotes = await prisma.lote.count({ where: { productoId: id } })
  if (hasLotes > 0) throw new Error('No se puede eliminar: tiene lotes asociados')

  return prisma.producto.delete({ where: { id } })
}

module.exports = { listProductos, getProductoById, createProducto, updateProducto, deleteProducto }