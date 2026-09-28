const { query } = require('express-validator')

const listReportesValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Página inválida'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Límite 1-100'),
  query('fechaDesde').optional().isISO8601().withMessage('Fecha desde inválida'),
  query('fechaHasta').optional().isISO8601().withMessage('Fecha hasta inválida'),
  query('tipoReporte').optional().isIn(['PEDIDOS', 'DESPACHOS', 'INCIDENCIAS', 'DEVOLUCIONES', 'INVENTARIO', 'RENDIMIENTO']).withMessage('Tipo de reporte inválido'),
]

const rendimientoValidation = [
  query('fechaDesde').optional().isISO8601().withMessage('Fecha desde inválida'),
  query('fechaHasta').optional().isISO8601().withMessage('Fecha hasta inválida'),
  query('repartidorId').optional().isUUID().withMessage('Repartidor inválido'),
  query('vehiculoId').optional().isUUID().withMessage('Vehículo inválido'),
]

const kpiValidation = [
  query('fechaDesde').optional().isISO8601().withMessage('Fecha desde inválida'),
  query('fechaHasta').optional().isISO8601().withMessage('Fecha hasta inválida'),
]

module.exports = {
  listReportesValidation,
  rendimientoValidation,
  kpiValidation,
}