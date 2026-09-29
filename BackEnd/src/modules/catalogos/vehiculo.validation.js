const { body, param, query } = require('express-validator')

const createVehiculoValidation = [
  body('codigo')
    .notEmpty().withMessage('El código es obligatorio')
    .isLength({ max: 20 }).withMessage('El código no puede exceder 20 caracteres')
    .trim(),
  body('tipo')
    .notEmpty().withMessage('El tipo es obligatorio')
    .isIn(['MOTO', 'VEHICULO_LIVIANO', 'FURGON', 'OTRO']).withMessage('Tipo inválido'),
  body('placa')
    .optional()
    .isLength({ max: 20 }).withMessage('La placa no puede exceder 20 caracteres')
    .trim(),
  body('descripcion')
    .optional()
    .isString().withMessage('Descripción inválida'),
  body('capacidadCarga')
    .optional()
    .isDecimal().withMessage('La capacidad de carga debe ser un número decimal'),
  body('unidadCapacidad')
    .optional()
    .isLength({ max: 20 }).withMessage('La unidad de capacidad no puede exceder 20 caracteres')
    .trim(),
  body('esTermico')
    .optional()
    .isBoolean().withMessage('esTermico debe ser true o false'),
  body('activo')
    .optional()
    .isBoolean().withMessage('activo debe ser true o false')
    .toBoolean(),
]

const updateVehiculoValidation = [
  param('id').isUUID().withMessage('ID inválido'),
  body('tipo')
    .optional()
    .isIn(['MOTO', 'VEHICULO_LIVIANO', 'FURGON', 'OTRO']).withMessage('Tipo inválido'),
  body('placa')
    .optional()
    .isLength({ max: 20 }).withMessage('La placa no puede exceder 20 caracteres')
    .trim(),
  body('descripcion')
    .optional()
    .isString().withMessage('Descripción inválida'),
  body('capacidadCarga')
    .optional()
    .isDecimal().withMessage('La capacidad de carga debe ser un número decimal'),
  body('unidadCapacidad')
    .optional()
    .isLength({ max: 20 }).withMessage('La unidad de capacidad no puede exceder 20 caracteres')
    .trim(),
  body('esTermico')
    .optional()
    .isBoolean().withMessage('esTermico debe ser true o false'),
  body('activo')
    .optional()
    .isBoolean().withMessage('activo debe ser true o false')
    .toBoolean(),
]

const listVehiculosValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Página inválida'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Límite inválido (1-100)'),
  query('tipo').optional().isIn(['MOTO', 'VEHICULO_LIVIANO', 'FURGON', 'OTRO']).withMessage('Tipo inválido'),
  query('activo').optional().isBoolean().withMessage('activo debe ser true o false'),
  query('search').optional().isString().withMessage('Búsqueda inválida'),
]

module.exports = {
  createVehiculoValidation,
  updateVehiculoValidation,
  listVehiculosValidation,
}