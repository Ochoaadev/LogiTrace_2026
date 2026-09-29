const { body, param, query } = require('express-validator')

const createIncidenciaValidation = [
  body('despachoPedidoId')
    .notEmpty().withMessage('El despacho-pedido es obligatorio')
    .isUUID().withMessage('Despacho-pedido inválido'),
  body('tipoIncidenciaId')
    .notEmpty().withMessage('El tipo de incidencia es obligatorio')
    .isUUID().withMessage('Tipo de incidencia inválido'),
  body('descripcion')
    .notEmpty().withMessage('La descripción es obligatoria')
    .isLength({ max: 1000 }).withMessage('Descripción muy larga'),
  body('latitud')
    .optional()
    .isDecimal().withMessage('Latitud inválida'),
  body('longitud')
    .optional()
    .isDecimal().withMessage('Longitud inválida'),
  body('decisionOperativa')
    .optional()
    .isLength({ max: 500 }).withMessage('Decisión operativa muy larga'),
]

const updateIncidenciaValidation = [
  param('id').isUUID().withMessage('ID inválido'),
  body('tipoIncidenciaId')
    .optional()
    .isUUID().withMessage('Tipo de incidencia inválido'),
  body('descripcion')
    .optional()
    .isLength({ max: 1000 }).withMessage('Descripción muy larga'),
  body('latitud')
    .optional()
    .isDecimal().withMessage('Latitud inválida'),
  body('longitud')
    .optional()
    .isDecimal().withMessage('Longitud inválida'),
  body('decisionOperativa')
    .optional()
    .isLength({ max: 500 }).withMessage('Decisión operativa muy larga'),
]

const changeEstadoIncidenciaValidation = [
  param('id').isUUID().withMessage('ID inválido'),
  body('estado')
    .notEmpty().withMessage('El estado es obligatorio')
    .isIn(['REPORTADA', 'EN_REVISION', 'EN_ATENCION', 'RESUELTA', 'CERRADA', 'CANCELADA']).withMessage('Estado inválido'),
  body('decisionOperativa')
    .optional()
    .isLength({ max: 500 }).withMessage('Decisión operativa muy larga'),
  body('observaciones')
    .optional()
    .isString().withMessage('Observaciones inválidas'),
]

const listIncidenciasValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Página inválida'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Límite 1-100'),
  query('estado').optional().isIn(['REPORTADA', 'EN_REVISION', 'EN_ATENCION', 'RESUELTA', 'CERRADA', 'CANCELADA']).withMessage('Estado inválido'),
  query('tipoIncidenciaId').optional().isUUID().withMessage('Tipo inválido'),
  query('despachoPedidoId').optional().isUUID().withMessage('Despacho-pedido inválido'),
  query('fechaDesde').optional().isISO8601().withMessage('Fecha desde inválida'),
  query('fechaHasta').optional().isISO8601().withMessage('Fecha hasta inválida'),
  query('search').optional().isString().withMessage('Búsqueda inválida'),
  query('abiertas').optional().isBoolean().withMessage('abiertas debe ser true/false'),
]

module.exports = {
  createIncidenciaValidation,
  updateIncidenciaValidation,
  changeEstadoIncidenciaValidation,
  listIncidenciasValidation,
}