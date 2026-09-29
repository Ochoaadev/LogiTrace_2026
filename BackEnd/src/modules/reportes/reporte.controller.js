const prisma = require('../../config/database')
const reporteService = require('./reporte.service')
const operativoService = require('./operativo.service')
const { success } = require('../../utils/response')

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

async function getReporteOperativo(req, res, next) {
  try {
    const reporte = await operativoService.getReporteOperativo(req.query)
    return success(res, reporte, 'Reporte operativo generado')
  } catch (err) {
    next(err)
  }
}

const sufijoArchivo = () => new Date().toISOString().slice(0, 10)

async function exportReporteCsv(req, res, next) {
  try {
    const csv = await operativoService.exportReporteCsv(req.query)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="reporte-operativo-${sufijoArchivo()}.csv"`)
    return res.send(csv)
  } catch (err) {
    next(err)
  }
}

async function exportReportePdf(req, res, next) {
  try {
    const usuario = await prisma.usuario.findUnique({ where: { id: req.user.sub }, select: { nombre: true } })
    const doc = await operativoService.buildReportePdf(req.query, usuario?.nombre)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="reporte-operativo-${sufijoArchivo()}.pdf"`)
    doc.pipe(res)
  } catch (err) {
    next(err)
  }
}

module.exports = {
  getReporteOperativo,
  exportReporteCsv,
  exportReportePdf,
  getDashboardKPIs,
  getPedidosPorEstado,
  getTimelinePedidos,
  getTopClientes,
  getActividadReciente,
  getAlertas,
}