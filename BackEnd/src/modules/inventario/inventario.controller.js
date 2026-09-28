const inventarioService = require('./inventario.service')
const { success } = require('../../utils/response')

async function listInventario(req, res, next) {
  try {
    const result = await inventarioService.listInventario(req.query)
    return success(res, result.data, 'Inventario obtenido', 200, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    })
  } catch (err) {
    next(err)
  }
}

async function getInventarioById(req, res, next) {
  try {
    const inventario = await inventarioService.getInventarioById(req.params.id)
    return success(res, inventario, 'Registro de inventario obtenido')
  } catch (err) {
    next(err)
  }
}

async function createInventario(req, res, next) {
  try {
    const inventario = await inventarioService.createInventario(req.body)
    return success(res, inventario, 'Registro de inventario creado', 201)
  } catch (err) {
    next(err)
  }
}

async function updateInventario(req, res, next) {
  try {
    const inventario = await inventarioService.updateInventario(req.params.id, req.body)
    return success(res, inventario, 'Registro de inventario actualizado')
  } catch (err) {
    next(err)
  }
}

async function deleteInventario(req, res, next) {
  try {
    await inventarioService.deleteInventario(req.params.id)
    return success(res, null, 'Registro de inventario eliminado')
  } catch (err) {
    next(err)
  }
}

async function registrarMovimiento(req, res, next) {
  try {
    const movimiento = await inventarioService.registrarMovimiento(req.body, req.user.sub)
    return success(res, movimiento, 'Movimiento registrado', 201)
  } catch (err) {
    next(err)
  }
}

async function listMovimientos(req, res, next) {
  try {
    const result = await inventarioService.listMovimientos(req.query)
    return success(res, result.data, 'Movimientos obtenidos', 200, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    })
  } catch (err) {
    next(err)
  }
}

async function getMovimientoById(req, res, next) {
  try {
    const movimiento = await inventarioService.getMovimientoById(req.params.id)
    return success(res, movimiento, 'Movimiento obtenido')
  } catch (err) {
    next(err)
  }
}

async function getStockBajo(req, res, next) {
  try {
    const stockBajo = await inventarioService.getStockBajo()
    return success(res, stockBajo, 'Productos con stock bajo obtenidos')
  } catch (err) {
    next(err)
  }
}

async function getResumenInventario(req, res, next) {
  try {
    const resumen = await inventarioService.getResumenInventario()
    return success(res, resumen, 'Resumen de inventario obtenido')
  } catch (err) {
    next(err)
  }
}

module.exports = {
  listInventario,
  getInventarioById,
  createInventario,
  updateInventario,
  deleteInventario,
  registrarMovimiento,
  listMovimientos,
  getMovimientoById,
  getStockBajo,
  getResumenInventario,
}