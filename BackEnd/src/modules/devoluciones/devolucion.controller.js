const devolucionService = require('./devolucion.service')
const { success } = require('../../utils/response')

async function listDevoluciones(req, res, next) {
  try {
    const result = await devolucionService.listDevoluciones(req.query)
    return success(res, result.data, 'Devoluciones obtenidas', 200, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    })
  } catch (err) {
    next(err)
  }
}

async function getDevolucionById(req, res, next) {
  try {
    const devolucion = await devolucionService.getDevolucionById(req.params.id)
    return success(res, devolucion, 'Devolución obtenida')
  } catch (err) {
    next(err)
  }
}

async function createDevolucion(req, res, next) {
  try {
    const devolucion = await devolucionService.createDevolucion(req.body, req.user.sub)
    return success(res, devolucion, 'Devolución registrada', 201)
  } catch (err) {
    next(err)
  }
}

async function updateDevolucion(req, res, next) {
  try {
    const devolucion = await devolucionService.updateDevolucion(req.params.id, req.body)
    return success(res, devolucion, 'Devolución actualizada')
  } catch (err) {
    next(err)
  }
}

async function recepcionDevolucion(req, res, next) {
  try {
    const { temperatura, observaciones } = req.body
    const devolucion = await devolucionService.recepcionDevolucion(req.params.id, { temperatura, observaciones }, req.user.sub)
    return success(res, devolucion, 'Devolución recibida')
  } catch (err) {
    next(err)
  }
}

async function evaluarDevolucion(req, res, next) {
  try {
    const { selloIntegro, condicionEmpaque, observaciones, temperatura } = req.body
    const devolucion = await devolucionService.evaluarDevolucion(req.params.id, { selloIntegro, condicionEmpaque, observaciones, temperatura }, req.user.sub)
    return success(res, devolucion, 'Devolución evaluada')
  } catch (err) {
    next(err)
  }
}

async function evaluarDetalle(req, res, next) {
  try {
    const { detalleDevolucionId, estadoProducto, decision, loteId, ubicacionId } = req.body
    const devolucion = await devolucionService.evaluarDetalle(req.params.id, { detalleDevolucionId, estadoProducto, decision, loteId, ubicacionId }, req.user.sub)
    return success(res, devolucion, 'Detalle evaluado')
  } catch (err) {
    next(err)
  }
}

async function changeEstado(req, res, next) {
  try {
    const { estado, observaciones } = req.body
    const devolucion = await devolucionService.changeEstado(req.params.id, estado, req.user.sub, observaciones)
    return success(res, devolucion, `Devolución ${estado.toLowerCase()}`)
  } catch (err) {
    next(err)
  }
}

async function deleteDevolucion(req, res, next) {
  try {
    await devolucionService.deleteDevolucion(req.params.id)
    return success(res, null, 'Devolución eliminada')
  } catch (err) {
    next(err)
  }
}

module.exports = {
  listDevoluciones,
  getDevolucionById,
  createDevolucion,
  updateDevolucion,
  recepcionDevolucion,
  evaluarDevolucion,
  evaluarDetalle,
  changeEstado,
  deleteDevolucion,
}