const { body, param, query } = require('express-validator')

const createResiduoValidation = [
  body('tipoResiduoId')
    .notEmpty().withMessage('El tipo de residuo es obligatorio')
    .isUUID().withMessage('Tipo de residuo inválido'),
  body('devolucionId')
    .optional({ values: 'falsy' })
    .isUUID().withMessage('Devolución inválida'),
  body('gestorId')
    .optional({ values: 'falsy' })
    .isUUID().withMessage('Gestor inválido'),
  body('cantidad')
    .notEmpty().withMessage('La cantidad es obligatoria')
    .isDecimal().withMessage('Cantidad debe ser decimal'),
  body('unidad')
    .notEmpty().withMessage('La unidad es obligatoria')
    .isLength({ max: 20 }).withMessage('Unidad muy larga'),
  body('origen')
    .optional()
    .isLength({ max: 100 }).withMessage('Origen muy largo'),
  body('observaciones')
    .optional()
    .isString().withMessage('Observaciones inválidas'),
]

const updateResiduoValidation = [
  param('id').isUUID().withMessage('ID inválido'),
  body('tipoResiduoId')
    .optional()
    .isUUID().withMessage('Tipo de residuo inválido'),
  body('gestorId')
    .optional()
    .isUUID().withMessage('Gestor inválido'),
  body('cantidad')
    .optional()
    .isDecimal().withMessage('Cantidad debe ser decimal'),
  body('unidad')
    .optional()
    .isLength({ max: 20 }).withMessage('Unidad muy larga'),
  body('origen')
    .optional()
    .isLength({ max: 100 }).withMessage('Origen muy largo'),
  body('observaciones')
    .optional()
    .isString().withMessage('Observaciones inválidas'),
]

const changeEstadoResiduoValidation = [
  param('id').isUUID().withMessage('ID inválido'),
  body('estado')
    .notEmpty().withMessage('El estado es obligatorio')
    .isIn(['REGISTRADO', 'EN_ALMACENAMIENTO', 'RETIRADO', 'DISPOSICION_FINAL', 'ANULADO']).withMessage('Estado inválido'),
  body('observaciones')
    .optional()
    .isString().withMessage('Observaciones inválidas'),
  body('gestorId')
    .optional({ values: 'falsy' })
    .isUUID().withMessage('Gestor inválido'),
]

const listResiduosValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Página inválida'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Límite 1-100'),
  query('estado').optional().isIn(['REGISTRADO', 'EN_ALMACENAMIENTO', 'RETIRADO', 'DISPOSICION_FINAL', 'ANULADO']).withMessage('Estado inválido'),
  query('tipoResiduoId').optional().isUUID().withMessage('Tipo inválido'),
  query('gestorId').optional().isUUID().withMessage('Gestor inválido'),
  query('devolucionId').optional().isUUID().withMessage('Devolución inválida'),
  query('fechaDesde').optional().isISO8601().withMessage('Fecha desde inválida'),
  query('fechaHasta').optional().isISO8601().withMessage('Fecha hasta inválida'),
  query('search').optional().isString().withMessage('Búsqueda inválida'),
  query('pendientes').optional().isIn(['true', 'false']).withMessage('Filtro de pendientes inválido'),
]

const resumenValidation = [
  query('fechaDesde').optional().isISO8601().withMessage('Fecha desde inválida'),
  query('fechaHasta').optional().isISO8601().withMessage('Fecha hasta inválida'),
]

const manifiestoValidation = [
  ...resumenValidation,
  query('gestorId').optional().isUUID().withMessage('Gestor inválido'),
]

const idResiduoValidation = [param('id').isUUID().withMessage('ID inválido')]

module.exports = {
  createResiduoValidation,
  updateResiduoValidation,
  changeEstadoResiduoValidation,
  listResiduosValidation,
  resumenValidation,
  manifiestoValidation,
  idResiduoValidation,
}