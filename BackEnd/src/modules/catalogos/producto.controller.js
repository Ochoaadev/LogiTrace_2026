const productoService = require('./producto.service')
const { success } = require('../../utils/response')

async function listProductos(req, res, next) {
  try {
    const result = await productoService.listProductos(req.query)
    return success(res, result.data, 'Productos obtenidos', 200, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    })
  } catch (err) {
    next(err)
  }
}

async function getProductoById(req, res, next) {
  try {
    const producto = await productoService.getProductoById(req.params.id)
    return success(res, producto, 'Producto obtenido')
  } catch (err) {
    next(err)
  }
}

async function createProducto(req, res, next) {
  try {
    const producto = await productoService.createProducto(req.body)
    return success(res, producto, 'Producto creado', 201)
  } catch (err) {
    next(err)
  }
}

async function updateProducto(req, res, next) {
  try {
    const producto = await productoService.updateProducto(req.params.id, req.body)
    return success(res, producto, 'Producto actualizado')
  } catch (err) {
    next(err)
  }
}

async function deleteProducto(req, res, next) {
  try {
    await productoService.deleteProducto(req.params.id)
    return success(res, null, 'Producto eliminado')
  } catch (err) {
    next(err)
  }
}

module.exports = { listProductos, getProductoById, createProducto, updateProducto, deleteProducto }