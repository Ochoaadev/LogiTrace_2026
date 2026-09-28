const trazabilidadService = require('./trazabilidad.service')
const { success } = require('../../utils/response')

async function listTrazabilidad(req, res, next) {
  try {
    const result = await trazabilidadService.listTrazabilidad(req.query)
    return success(res, result.data, 'Eventos de trazabilidad obtenidos', 200, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    })
  } catch (err) {
    next(err)
  }
}

async function getTrazabilidadByPedido(req, res, next) {
  try {
    const result = await trazabilidadService.getTrazabilidadByPedido(req.params.id, req.query)
    return success(res, result.data, 'Trazabilidad por pedido', 200, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    })
  } catch (err) {
    next(err)
  }
}

async function getTrazabilidadByDespacho(req, res, next) {
  try {
    const result = await trazabilidadService.getTrazabilidadByDespacho(req.params.id, req.query)
    return success(res, result.data, 'Trazabilidad por despacho', 200, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    })
  } catch (err) {
    next(err)
  }
}

async function getTrazabilidadCompleta(req, res, next) {
  try {
    const data = await trazabilidadService.getTrazabilidadCompleta(req.params.id)
    return success(res, data, 'Trazabilidad completa del pedido')
  } catch (err) {
    next(err)
  }
}

async function getTimeline(req, res, next) {
  try {
    const timeline = await trazabilidadService.getTimeline(req.params.id)
    return success(res, timeline, 'Línea de tiempo del pedido')
  } catch (err) {
    next(err)
  }
}

async function getEstadisticas(req, res, next) {
  try {
    const stats = await trazabilidadService.getEstadisticasTrazabilidad(req.query)
    return success(res, stats, 'Estadísticas de trazabilidad')
  } catch (err) {
    next(err)
  }
}

module.exports = {
  listTrazabilidad,
  getTrazabilidadByPedido,
  getTrazabilidadByDespacho,
  getTrazabilidadCompleta,
  getTimeline,
  getEstadisticas,
}