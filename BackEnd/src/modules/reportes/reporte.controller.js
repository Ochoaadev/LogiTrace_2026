const reporteService = require('./reporte.service')
const { success } = require('../../utils/response')

async function getReportePedidos(req, res, next) {
  try {
    const reporte = await reporteService.getReportePedidos(req.query)
    return success(res, reporte, 'Reporte de pedidos generado')
  } catch (err) {
    next(err)
  }
}

async function getReporteDespachos(req, res, next) {
  try {
    const reporte = await reporteService.getReporteDespachos(req.query)
    return success(res, reporte, 'Reporte de despachos generado')
  } catch (err) {
    next(err)
  }
}

async function getReporteIncidencias(req, res, next) {
  try {
    const reporte = await reporteService.getReporteIncidencias(req.query)
    return success(res, reporte, 'Reporte de incidencias generado')
  } catch (err) {
    next(err)
  }
}

async function getReporteDevoluciones(req, res, next) {
  try {
    const reporte = await reporteService.getReporteDevoluciones(req.query)
    return success(res, reporte, 'Reporte de devoluciones generado')
  } catch (err) {
    next(err)
  }
}

async function getReporteInventario(req, res, next) {
  try {
    const reporte = await reporteService.getReporteInventario(req.query)
    return success(res, reporte, 'Reporte de inventario generado')
  } catch (err) {
    next(err)
  }
}

async function getReporteRendimiento(req, res, next) {
  try {
    const reporte = await reporteService.getReporteRendimiento(req.query)
    return success(res, reporte, 'Reporte de rendimiento generado')
  } catch (err) {
    next(err)
  }
}

async function getDashboardKPIs(req, res, next) {
  try {
    const kpis = await reporteService.getDashboardKPIs(req.query)
    return success(res, kpis, 'KPIs del dashboard obtenidos')
  } catch (err) {
    next(err)
  }
}

async function getPedidosPorEstado(req, res, next) {
  try {
    const data = await reporteService.getPedidosPorEstado()
    return success(res, data, 'Pedidos por estado obtenidos')
  } catch (err) {
    next(err)
  }
}

async function getTimelinePedidos(req, res, next) {
  try {
    const data = await reporteService.getTimelinePedidos(req.query)
    return success(res, data, 'Timeline de pedidos obtenido')
  } catch (err) {
    next(err)
  }
}

async function getTopClientes(req, res, next) {
  try {
    const data = await reporteService.getTopClientes(req.query)
    return success(res, data, 'Top clientes obtenido')
  } catch (err) {
    next(err)
  }
}

async function getActividadReciente(req, res, next) {
  try {
    const data = await reporteService.getActividadReciente(req.query)
    return success(res, data, 'Actividad reciente obtenida')
  } catch (err) {
    next(err)
  }
}

async function getAlertas(req, res, next) {
  try {
    const data = await reporteService.getAlertas()
    return success(res, data, 'Alertas obtenidas')
  } catch (err) {
    next(err)
  }
}

module.exports = {
  getReportePedidos,
  getReporteDespachos,
  getReporteIncidencias,
  getReporteDevoluciones,
  getReporteInventario,
  getReporteRendimiento,
  getDashboardKPIs,
  getPedidosPorEstado,
  getTimelinePedidos,
  getTopClientes,
  getActividadReciente,
  getAlertas,
}