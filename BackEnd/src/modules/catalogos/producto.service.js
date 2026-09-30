const prisma = require('../../config/database')
const { getPagination } = require('../../utils/pagination')
const { AppError } = require('../../utils/AppError')
const { idsSinTildes } = require('../../utils/busqueda')

async function listProductos(query) {
  const { page, limit, skip } = getPagination(query)
  const { activo, search } = query

  const where = {}
  if (activo !== undefined) where.activo = activo === 'true'
  if (search) {
    where.id = { in: await idsSinTildes('Producto', ['nombre', 'codigo'], search) }
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
  if (!producto) throw new AppError('Producto no encontrado', 404)
  return producto
}

async function createProducto(data) {
  const existing = await prisma.producto.findUnique({ where: { codigo: data.codigo } })
  if (existing) throw new AppError('El código ya existe', 409)

  return prisma.producto.create({ data })
}

async function updateProducto(id, data) {
  const producto = await prisma.producto.findUnique({ where: { id } })
  if (!producto) throw new AppError('Producto no encontrado', 404)

  return prisma.producto.update({ where: { id }, data })
}

async function deleteProducto(id) {
  const producto = await prisma.producto.findUnique({ where: { id } })
  if (!producto) throw new AppError('Producto no encontrado', 404)

  const hasLotes = await prisma.lote.count({ where: { productoId: id } })
  if (hasLotes > 0) throw new AppError('No se puede eliminar: tiene lotes asociados', 400)

  return prisma.producto.delete({ where: { id } })
}

module.exports = { listProductos, getProductoById, createProducto, updateProducto, deleteProducto }