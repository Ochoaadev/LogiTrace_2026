const { query } = require('express-validator')

const listTrazabilidadValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Página inválida'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Límite 1-100'),
  query('pedidoId').optional().isUUID().withMessage('Pedido inválido'),
  query('despachoId').optional().isUUID().withMessage('Despacho inválido'),
  query('incidenciaId').optional().isUUID().withMessage('Incidencia inválida'),
  query('devolucionId').optional().isUUID().withMessage('Devolución inválida'),
  query('tipoEvento').optional().isString().withMessage('Tipo de evento inválido'),
  query('fechaDesde').optional().isISO8601().withMessage('Fecha desde inválida'),
  query('fechaHasta').optional().isISO8601().withMessage('Fecha hasta inválida'),
  query('usuarioId').optional().isUUID().withMessage('Usuario inválido'),
]

const getTrazabilidadByPedidoValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Página inválida'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Límite 1-100'),
]

const getTrazabilidadByDespachoValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Página inválida'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Límite 1-100'),
]

module.exports = {
  listTrazabilidadValidation,
  getTrazabilidadByPedidoValidation,
  getTrazabilidadByDespachoValidation,
}