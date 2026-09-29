const { body, param, query } = require('express-validator')

const createDevolucionValidation = [
  body('despachoPedidoId')
    .notEmpty().withMessage('El despacho-pedido es obligatorio')
    .isUUID().withMessage('Despacho-pedido inválido'),
  body('motivoId')
    .notEmpty().withMessage('El motivo de devolución es obligatorio')
    .isUUID().withMessage('Motivo inválido'),
  body('incidenciaId')
    .optional()
    .isUUID().withMessage('Incidencia inválida'),
  body('observaciones')
    .optional()
    .isLength({ max: 1000 }).withMessage('Observaciones muy largas'),
]

const updateDevolucionValidation = [
  param('id').isUUID().withMessage('ID inválido'),
  body('motivoId')
    .optional()
    .isUUID().withMessage('Motivo inválido'),
  body('observaciones')
    .optional()
    .isLength({ max: 1000 }).withMessage('Observaciones muy largas'),
]

const changeEstadoDevolucionValidation = [
  param('id').isUUID().withMessage('ID inválido'),
  body('estado')
    .notEmpty().withMessage('El estado es obligatorio')
    .isIn(['SOLICITADA', 'EN_TRASLADO', 'RECIBIDA', 'EVALUADA', 'CERRADA', 'CANCELADA']).withMessage('Estado inválido'),
  body('observaciones')
    .optional()
    .isString().withMessage('Observaciones inválidas'),
]

const recepcionDevolucionValidation = [
  param('id').isUUID().withMessage('ID inválido'),
  body('temperatura')
    .optional()
    .isDecimal().withMessage('Temperatura inválida'),
  body('observaciones')
    .optional()
    .isString().withMessage('Observaciones inválidas'),
]

const evaluacionDevolucionValidation = [
  param('id').isUUID().withMessage('ID inválido'),
  body('selloIntegro')
    .notEmpty().withMessage('Estado del sello es obligatorio')
    .isBoolean().withMessage('selloIntegro debe ser true o false'),
  body('condicionEmpaque')
    .optional()
    .isLength({ max: 200 }).withMessage('Condición de empaque muy larga'),
  body('observaciones')
    .optional()
    .isLength({ max: 500 }).withMessage('Observaciones muy largas'),
  body('temperatura')
    .optional()
    .isDecimal().withMessage('Temperatura inválida'),
]

const evaluacionDetalleValidation = [
  body('detalleDevolucionId')
    .notEmpty().withMessage('ID del detalle es obligatorio')
    .isUUID().withMessage('Detalle inválido'),
  body('estadoProducto')
    .notEmpty().withMessage('Estado del producto es obligatorio')
    .isIn(['APTO_PARA_VENTA', 'DETERIORADO', 'NO_APTO_PARA_VENTA']).withMessage('Estado de producto inválido'),
  body('decision')
    .notEmpty().withMessage('Decisión es obligatoria')
    .isIn(['REINGRESO', 'CUARENTENA', 'DESCARTE']).withMessage('Decisión inválida'),
  body('loteId')
    .optional()
    .isUUID().withMessage('Lote inválido'),
  body('ubicacionId')
    .optional()
    .isUUID().withMessage('Ubicación inválida'),
  body('tipoResiduoId')
    .optional()
    .isUUID().withMessage('Tipo de residuo inválido'),
]

const listDevolucionesValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Página inválida'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Límite 1-100'),
  query('estado').optional().isIn(['SOLICITADA', 'EN_TRASLADO', 'RECIBIDA', 'EVALUADA', 'CERRADA', 'CANCELADA']).withMessage('Estado inválido'),
  query('motivoId').optional().isUUID().withMessage('Motivo inválido'),
  query('despachoPedidoId').optional().isUUID().withMessage('Despacho-pedido inválido'),
  query('fechaDesde').optional().isISO8601().withMessage('Fecha desde inválida'),
  query('fechaHasta').optional().isISO8601().withMessage('Fecha hasta inválida'),
  query('search').optional().isString().withMessage('Búsqueda inválida'),
  query('activas').optional().isBoolean().withMessage('activas debe ser true/false'),
]

module.exports = {
  createDevolucionValidation,
  updateDevolucionValidation,
  changeEstadoDevolucionValidation,
  recepcionDevolucionValidation,
  evaluacionDevolucionValidation,
  evaluacionDetalleValidation,
  listDevolucionesValidation,
}