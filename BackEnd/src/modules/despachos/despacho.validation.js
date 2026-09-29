const { body, param, query } = require('express-validator')

const createDespachoValidation = [
  body('rutaId')
    .optional()
    .isUUID().withMessage('Ruta inválida'),
  body('repartidorId')
    .notEmpty().withMessage('El repartidor es obligatorio')
    .isUUID().withMessage('Repartidor inválido'),
  body('vehiculoId')
    .optional()
    .isUUID().withMessage('Vehículo inválido'),
  body('pedidos')
    .isArray({ min: 1 }).withMessage('Debe asignar al menos un pedido'),
  body('pedidos.*.pedidoId')
    .notEmpty().withMessage('ID de pedido obligatorio')
    .isUUID().withMessage('Pedido inválido'),
  body('pedidos.*.ordenParada')
    .notEmpty().withMessage('Orden de parada obligatoria')
    .isInt({ min: 1 }).withMessage('Orden debe ser entero positivo'),
  body('medioConservacion')
    .optional()
    .isLength({ max: 80 }).withMessage('Medio de conservación muy largo'),
  body('precintoSeguridad')
    .optional()
    .isLength({ max: 50 }).withMessage('Precinto muy largo'),
  body('observaciones')
    .optional()
    .isString().withMessage('Observaciones inválidas'),
]

const updateDespachoValidation = [
  param('id').isUUID().withMessage('ID inválido'),
  body('rutaId')
    .optional()
    .isUUID().withMessage('Ruta inválida'),
  body('repartidorId')
    .optional()
    .isUUID().withMessage('Repartidor inválido'),
  body('vehiculoId')
    .optional()
    .isUUID().withMessage('Vehículo inválido'),
  body('medioConservacion')
    .optional()
    .isLength({ max: 80 }).withMessage('Medio de conservación muy largo'),
  body('precintoSeguridad')
    .optional()
    .isLength({ max: 50 }).withMessage('Precinto muy largo'),
  body('observaciones')
    .optional()
    .isString().withMessage('Observaciones inválidas'),
]

const changeEstadoDespachoValidation = [
  param('id').isUUID().withMessage('ID inválido'),
  body('estado')
    .notEmpty().withMessage('El estado es obligatorio')
    .isIn([
      'PROGRAMADO',
      'PREPARANDO',
      'EN_RUTA',
      'CON_INCIDENCIA',
      'FINALIZADO',
      'CANCELADO'
    ]).withMessage('Estado inválido'),
  body('observaciones')
    .optional()
    .isString().withMessage('Observaciones inválidas'),
]

const updateUbicacionValidation = [
  param('id').isUUID().withMessage('ID inválido'),
  body('latitud')
    .notEmpty().withMessage('Latitud obligatoria')
    .isDecimal().withMessage('Latitud inválida'),
  body('longitud')
    .notEmpty().withMessage('Longitud obligatoria')
    .isDecimal().withMessage('Longitud inválida'),
  body('precisionMetros')
    .optional()
    .isDecimal().withMessage('Precisión inválida'),
  body('velocidadKmh')
    .optional()
    .isDecimal().withMessage('Velocidad inválida'),
]

const listDespachosValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Página inválida'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Límite 1-100'),
  query('estado').optional().isIn([
    'PROGRAMADO', 'PREPARANDO', 'EN_RUTA', 'CON_INCIDENCIA', 'FINALIZADO', 'CANCELADO'
  ]).withMessage('Estado inválido'),
  query('repartidorId').optional().isUUID().withMessage('Repartidor inválido'),
  query('rutaId').optional().isUUID().withMessage('Ruta inválida'),
  query('fechaDesde').optional().isISO8601().withMessage('Fecha desde inválida'),
  query('fechaHasta').optional().isISO8601().withMessage('Fecha hasta inválida'),
  query('search').optional().isString().withMessage('Búsqueda inválida'),
  query('vista').optional().isIn(['en_ruta', 'pendientes', 'completados_hoy']).withMessage('Vista inválida'),
]

const agregarPedidoValidation = [
  param('id').isUUID().withMessage('ID inválido'),
  body('pedidoId')
    .notEmpty().withMessage('El pedido es obligatorio')
    .isUUID().withMessage('Pedido inválido'),
]

module.exports = {
  agregarPedidoValidation,
  createDespachoValidation,
  updateDespachoValidation,
  changeEstadoDespachoValidation,
  updateUbicacionValidation,
  listDespachosValidation,
}