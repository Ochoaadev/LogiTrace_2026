const { body, param, query } = require('express-validator')

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

const buscarExpedientesValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Página inválida'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Límite 1-100'),
  query('q').optional().isString().isLength({ max: 100 }).withMessage('Término de búsqueda muy largo'),
  query('fecha').optional().isISO8601().withMessage('Fecha inválida'),
  query('resultado').optional().isIn(['EN_CURSO', 'ENTREGADO', 'CON_INCIDENCIA', 'DEVOLUCION', 'CANCELADO']).withMessage('Resultado inválido'),
]

const pedidoIdParam = [param('id').isUUID().withMessage('Pedido inválido')]

const exportCsvValidation = [
  query('pedidoId').optional().isUUID().withMessage('Pedido inválido'),
  query('tipoEvento').optional().isString(),
  query('fechaDesde').optional().isISO8601().withMessage('Fecha desde inválida'),
  query('fechaHasta').optional().isISO8601().withMessage('Fecha hasta inválida'),
]

const registrarTemperaturaValidation = [
  body('tipoRegistro')
    .notEmpty().withMessage('El tipo de registro es obligatorio')
    .isIn(['CAVA', 'VEHICULO_SALIDA', 'RECEPCION_DEVOLUCION', 'OTRA']).withMessage('Tipo de registro inválido'),
  body('temperaturaC')
    .notEmpty().withMessage('La temperatura es obligatoria')
    .isFloat({ min: -60, max: 40 }).withMessage('Temperatura fuera del rango medible (-60 °C a 40 °C)'),
  body('ubicacionId').optional({ values: 'falsy' }).isUUID().withMessage('Ubicación inválida'),
  body('despachoId').optional({ values: 'falsy' }).isUUID().withMessage('Despacho inválido'),
  body('devolucionId').optional({ values: 'falsy' }).isUUID().withMessage('Devolución inválida'),
  body('observaciones').optional().isString().isLength({ max: 500 }).withMessage('Observaciones muy largas'),
]

module.exports = {
  buscarExpedientesValidation,
  pedidoIdParam,
  exportCsvValidation,
  registrarTemperaturaValidation,
  listTrazabilidadValidation,
  getTrazabilidadByPedidoValidation,
  getTrazabilidadByDespachoValidation,
}