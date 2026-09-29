const { body, param, query } = require('express-validator')

const createPedidoValidation = [
  body('clienteId')
    .notEmpty().withMessage('El cliente es obligatorio')
    .isUUID().withMessage('Cliente inválido'),
  body('fechaEntrega')
    .optional()
    .isISO8601().withMessage('Fecha de entrega inválida'),
  body('prioridad')
    .optional()
    .isIn(['BAJA', 'NORMAL', 'ALTA', 'URGENTE']).withMessage('Prioridad inválida'),
  body('metodoEntrega')
    .optional()
    .isIn(['DOMICILIO', 'RETIRO_EN_ESTABLECIMIENTO']).withMessage('Método de entrega inválido'),
  body('zonaId')
    .optional()
    .isUUID().withMessage('Zona inválida'),
  body('direccionEntrega')
    .notEmpty().withMessage('La dirección de entrega es obligatoria')
    .isLength({ max: 500 }).withMessage('Dirección muy larga'),
  body('referenciaEntrega')
    .optional()
    .isLength({ max: 180 }).withMessage('Referencia muy larga'),
  body('latitudEntrega')
    .optional()
    .isDecimal().withMessage('Latitud inválida'),
  body('longitudEntrega')
    .optional()
    .isDecimal().withMessage('Longitud inválida'),
  body('telefonoContacto')
    .optional()
    .isLength({ max: 30 }).withMessage('Teléfono muy largo'),
  body('observaciones')
    .optional()
    .isString().withMessage('Observaciones inválidas'),
  body('items')
    .isArray({ min: 1 }).withMessage('Debe haber al menos un item'),
  body('items.*.productoId')
    .notEmpty().withMessage('Producto obligatorio')
    .isUUID().withMessage('Producto inválido'),
  body('items.*.cantidad')
    .notEmpty().withMessage('Cantidad obligatoria')
    .isInt({ min: 1 }).withMessage('Cantidad mínima 1'),
  body('items.*.unidad')
    .optional()
    .isLength({ max: 20 }).withMessage('Unidad muy larga'),
  body('items.*.observaciones')
    .optional()
    .isString().withMessage('Observaciones del item inválidas'),
]

const updatePedidoValidation = [
  param('id').isUUID().withMessage('ID inválido'),
  body('fechaEntrega')
    .optional()
    .isISO8601().withMessage('Fecha de entrega inválida'),
  body('prioridad')
    .optional()
    .isIn(['BAJA', 'NORMAL', 'ALTA', 'URGENTE']).withMessage('Prioridad inválida'),
  body('metodoEntrega')
    .optional()
    .isIn(['DOMICILIO', 'RETIRO_EN_ESTABLECIMIENTO']).withMessage('Método inválido'),
  body('zonaId')
    .optional()
    .isUUID().withMessage('Zona inválida'),
  body('direccionEntrega')
    .optional()
    .isLength({ max: 500 }).withMessage('Dirección muy larga'),
  body('referenciaEntrega')
    .optional()
    .isLength({ max: 180 }).withMessage('Referencia muy larga'),
  body('latitudEntrega')
    .optional()
    .isDecimal().withMessage('Latitud inválida'),
  body('longitudEntrega')
    .optional()
    .isDecimal().withMessage('Longitud inválida'),
  body('telefonoContacto')
    .optional()
    .isLength({ max: 30 }).withMessage('Teléfono muy largo'),
  body('observaciones')
    .optional()
    .isString().withMessage('Observaciones inválidas'),
]

const changeEstadoValidation = [
  param('id').isUUID().withMessage('ID inválido'),
  body('estado')
    .notEmpty().withMessage('El estado es obligatorio')
    .isIn([
      'REGISTRADO',
      'EN_PREPARACION',
      'LISTO_PARA_DESPACHO',
      'EN_RUTA',
      'ENTREGADO',
      'CON_INCIDENCIA',
      'DEVUELTO',
      'CERRADO',
      'CANCELADO'
    ]).withMessage('Estado inválido'),
]

const listPedidosValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Página inválida'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Límite 1-100'),
  query('estado').optional().isIn([
    'REGISTRADO', 'EN_PREPARACION', 'LISTO_PARA_DESPACHO', 'EN_RUTA',
    'ENTREGADO', 'CON_INCIDENCIA', 'DEVUELTO', 'CERRADO', 'CANCELADO'
  ]).withMessage('Estado inválido'),
  query('prioridad').optional().isIn(['BAJA', 'NORMAL', 'ALTA', 'URGENTE']).withMessage('Prioridad inválida'),
  query('clienteId').optional().isUUID().withMessage('Cliente inválido'),
  query('zonaId').optional().isUUID().withMessage('Zona inválida'),
  query('fechaDesde').optional().isISO8601().withMessage('Fecha desde inválida'),
  query('fechaHasta').optional().isISO8601().withMessage('Fecha hasta inválida'),
  query('search').optional().isString().withMessage('Búsqueda inválida'),
  query('vista').optional().isIn(['activos', 'historial']).withMessage('Vista inválida'),
]

module.exports = {
  createPedidoValidation,
  updatePedidoValidation,
  changeEstadoValidation,
  listPedidosValidation,
}