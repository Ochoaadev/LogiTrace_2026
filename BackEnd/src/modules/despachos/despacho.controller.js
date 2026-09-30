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

async function agregarPedido(req, res, next) {
  try {
    const despacho = await despachoService.agregarPedido(req.params.id, req.body.pedidoId, req.user.sub)
    return success(res, despacho, 'Pedido agregado al despacho')
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
    const { latitud, longitud, precisionMetros, velocidadKmh, fechaHora } = req.body
    const punto = await despachoService.updateUbicacion(req.params.id, { latitud, longitud, precisionMetros, velocidadKmh, fechaHora }, req.user)
    return success(res, punto, 'Ubicación registrada', 201)
  } catch (err) {
    next(err)
  }
}

async function getMiRuta(req, res, next) {
  try {
    return success(res, await despachoService.getMiRuta(req.user.sub), 'Ruta del repartidor obtenida')
  } catch (err) {
    next(err)
  }
}

async function iniciarRecorrido(req, res, next) {
  try {
    return success(res, await despachoService.iniciarRecorrido(req.params.id, req.user), 'Recorrido iniciado')
  } catch (err) {
    next(err)
  }
}

async function registrarEntrega(req, res, next) {
  try {
    const { receptor, observaciones, latitud, longitud, precisionMetros } = req.body
    const despacho = await despachoService.registrarEntrega(req.params.id, req.params.paradaId, { receptor, observaciones, latitud, longitud, precisionMetros }, req.user)
    return success(res, despacho, 'Entrega registrada')
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

async function getResumenDespachos(req, res, next) {
  try {
    const resumen = await despachoService.getResumenDespachos()
    return success(res, resumen, 'Resumen de despachos obtenido')
  } catch (err) {
    next(err)
  }
}

module.exports = {
  getMiRuta,
  iniciarRecorrido,
  registrarEntrega,
  getResumenDespachos,
  listDespachos,
  getDespachoById,
  createDespacho,
  agregarPedido,
  updateDespacho,
  changeEstado,
  updateUbicacion,
  updatePedidosOrden,
  deleteDespacho,
  getFlujoOperativo,
}