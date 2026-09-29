const { body, param, query } = require('express-validator')

const createInventarioValidation = [
  body('loteId')
    .notEmpty().withMessage('El lote es obligatorio')
    .isUUID().withMessage('Lote inválido'),
  body('ubicacionId')
    .notEmpty().withMessage('La ubicación es obligatoria')
    .isUUID().withMessage('Ubicación inválida'),
  body('stockActual')
    .optional()
    .isDecimal().withMessage('Stock actual debe ser decimal'),
  body('stockMinimo')
    .optional()
    .isDecimal().withMessage('Stock mínimo debe ser decimal'),
]

const updateInventarioValidation = [
  param('id').isUUID().withMessage('ID inválido'),
  body('stockActual')
    .optional()
    .isDecimal().withMessage('Stock actual debe ser decimal'),
  body('stockMinimo')
    .optional()
    .isDecimal().withMessage('Stock mínimo debe ser decimal'),
]

const movimientoValidation = [
  body('tipo')
    .notEmpty().withMessage('El tipo de movimiento es obligatorio')
    .isIn(['ENTRADA', 'SALIDA', 'AJUSTE', 'REINGRESO', 'TRASLADO', 'DESCARTE']).withMessage('Tipo de movimiento inválido'),
  body('loteId')
    .notEmpty().withMessage('El lote es obligatorio')
    .isUUID().withMessage('Lote inválido'),
  body('ubicacionOrigenId')
    .optional()
    .isUUID().withMessage('Ubicación origen inválida'),
  body('ubicacionDestinoId')
    .optional()
    .isUUID().withMessage('Ubicación destino inválida'),
  body('cantidad')
    .notEmpty().withMessage('La cantidad es obligatoria')
    .isDecimal().withMessage('Cantidad debe ser decimal'),
  body('unidad')
    .notEmpty().withMessage('La unidad es obligatoria')
    .isLength({ max: 20 }).withMessage('Unidad muy larga'),
  body('referenciaTipo')
    .optional()
    .isLength({ max: 30 }).withMessage('Tipo de referencia muy largo'),
  body('referenciaId')
    .optional()
    .isUUID().withMessage('ID de referencia inválido'),
  body('observaciones')
    .optional()
    .isString().withMessage('Observaciones inválidas'),
]

const listInventarioValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Página inválida'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Límite 1-100'),
  query('ubicacionId').optional().isUUID().withMessage('Ubicación inválida'),
  query('productoId').optional().isUUID().withMessage('Producto inválido'),
  query('stockBajo').optional().isBoolean().withMessage('stockBajo debe ser true/false'),
  query('search').optional().isString().withMessage('Búsqueda inválida'),
  query('loteId').optional().isUUID().withMessage('Lote inválido'),
  query('estado').optional().isIn(['DISPONIBLE', 'CUARENTENA', 'NO_APTO', 'VENCIDO']).withMessage('Estado de lote inválido'),
  query('tipoUbicacion').optional().isIn(['CAVA', 'ALMACEN', 'PREPARACION', 'RECEPCION', 'CUARENTENA', 'DESCARTE', 'OTRA']).withMessage('Tipo de ubicación inválido'),
]

const listMovimientosValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Página inválida'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Límite 1-100'),
  query('tipo').optional().isIn(['ENTRADA', 'SALIDA', 'AJUSTE', 'REINGRESO', 'TRASLADO', 'DESCARTE']).withMessage('Tipo inválido'),
  query('loteId').optional().isUUID().withMessage('Lote inválido'),
  query('ubicacionId').optional().isUUID().withMessage('Ubicación inválida'),
  query('fechaDesde').optional().isISO8601().withMessage('Fecha desde inválida'),
  query('fechaHasta').optional().isISO8601().withMessage('Fecha hasta inválida'),
  query('search').optional().isString().withMessage('Búsqueda inválida'),
]

const ajustarStockValidation = [
  param('id').isUUID().withMessage('Lote inválido'),
  body('ubicacionId')
    .notEmpty().withMessage('La ubicación es obligatoria')
    .isUUID().withMessage('Ubicación inválida'),
  body('cantidadNueva')
    .notEmpty().withMessage('La cantidad nueva es obligatoria')
    .isFloat({ min: 0 }).withMessage('La cantidad nueva debe ser un número mayor o igual a 0'),
  body('observaciones')
    .optional()
    .isString().withMessage('Observaciones inválidas'),
]

module.exports = {
  ajustarStockValidation,
  createInventarioValidation,
  updateInventarioValidation,
  movimientoValidation,
  listInventarioValidation,
  listMovimientosValidation,
}