const despachoService = require('./despacho.service')
const { success } = require('../../utils/response')

async function listDespachos(req, res, next) {
  try {
    const result = await despachoService.listDespachos(req.query)
    return success(res, result.data, 'Despachos obtenidos', 200, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    })
  } catch (err) {
    next(err)
  }
}

async function getDespachoById(req, res, next) {
  try {
    const despacho = await despachoService.getDespachoById(req.params.id)
    return success(res, despacho, 'Despacho obtenido')
  } catch (err) {
    next(err)
  }
}

async function createDespacho(req, res, next) {
  try {
    const despacho = await despachoService.createDespacho(req.body, req.user.sub)
    return success(res, despacho, 'Despacho creado', 201)
  } catch (err) {
    next(err)
  }
}

async function updateDespacho(req, res, next) {
  try {
    const despacho = await despachoService.updateDespacho(req.params.id, req.body)
    return success(res, despacho, 'Despacho actualizado')
  } catch (err) {
    next(err)
  }
}

async function changeEstado(req, res, next) {
  try {
    const { estado, observaciones } = req.body
    const despacho = await despachoService.changeEstado(req.params.id, estado, req.user.sub, observaciones)
    return success(res, despacho, `Estado cambiado a ${estado}`)
  } catch (err) {
    next(err)
  }
}

async function updateUbicacion(req, res, next) {
  try {
    const { latitud, longitud, precisionMetros, velocidadKmh } = req.body
    const despacho = await despachoService.updateUbicacion(req.params.id, { latitud, longitud, precisionMetros, velocidadKmh }, req.user.sub)
    return success(res, despacho, 'Ubicación actualizada')
  } catch (err) {
    next(err)
  }
}

async function updatePedidosOrden(req, res, next) {
  try {
    const { pedidos } = req.body
    const despacho = await despachoService.updatePedidosOrden(req.params.id, pedidos, req.user.sub)
    return success(res, despacho, 'Orden de paradas actualizada')
  } catch (err) {
    next(err)
  }
}

async function deleteDespacho(req, res, next) {
  try {
    await despachoService.deleteDespacho(req.params.id)
    return success(res, null, 'Despacho eliminado')
  } catch (err) {
    next(err)
  }
}

async function getFlujoOperativo(req, res, next) {
  try {
    const flujo = await despachoService.getFlujoOperativo()
    return success(res, flujo, 'Flujo operativo obtenido')
  } catch (err) {
    next(err)
  }
}

module.exports = {
  listDespachos,
  getDespachoById,
  createDespacho,
  updateDespacho,
  changeEstado,
  updateUbicacion,
  updatePedidosOrden,
  deleteDespacho,
  getFlujoOperativo,
}