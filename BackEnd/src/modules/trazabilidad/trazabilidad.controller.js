const trazabilidadService = require('./trazabilidad.service')
const expedienteService = require('./expediente.service')
const exportService = require('./export.service')
const prisma = require('../../config/database')
const { success } = require('../../utils/response')

async function buscarExpedientes(req, res, next) {
  try {
    const result = await expedienteService.buscarExpedientes(req.query)
    return success(res, result.data, 'Expedientes encontrados', 200, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    })
  } catch (err) {
    next(err)
  }
}

async function getExpediente(req, res, next) {
  try {
    const expediente = await expedienteService.getExpediente(req.params.id)
    return success(res, expediente, 'Expediente de trazabilidad obtenido')
  } catch (err) {
    next(err)
  }
}

async function registrarTemperatura(req, res, next) {
  try {
    const registro = await expedienteService.registrarTemperatura(req.body, req.user.sub)
    return success(res, registro, 'Temperatura registrada', 201)
  } catch (err) {
    next(err)
  }
}

async function exportCsv(req, res, next) {
  try {
    const csv = await exportService.exportEventosCsv(req.query)
    const fecha = new Date().toISOString().slice(0, 10)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="trazabilidad-${fecha}.csv"`)
    return res.send(csv)
  } catch (err) {
    next(err)
  }
}

async function exportPdf(req, res, next) {
  try {
    const usuario = await prisma.usuario.findUnique({ where: { id: req.user.sub }, select: { nombre: true } })
    const { codigo, doc } = await exportService.buildExpedientePdf(req.params.id, usuario?.nombre)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="expediente-${codigo}.pdf"`)
    doc.pipe(res)
  } catch (err) {
    next(err)
  }
}

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
  buscarExpedientes,
  getExpediente,
  registrarTemperatura,
  exportCsv,
  exportPdf,
  listTrazabilidad,
  getTrazabilidadByPedido,
  getTrazabilidadByDespacho,
  getTrazabilidadCompleta,
  getTimeline,
  getEstadisticas,
}