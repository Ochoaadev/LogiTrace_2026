const { body, param, query } = require('express-validator')

const createProductoValidation = [
  body('codigo')
    .notEmpty().withMessage('El código es obligatorio')
    .isLength({ max: 30 }).withMessage('El código no puede exceder 30 caracteres')
    .trim(),
  body('nombre')
    .notEmpty().withMessage('El nombre es obligatorio')
    .isLength({ max: 120 }).withMessage('El nombre no puede exceder 120 caracteres')
    .trim(),
  body('descripcion')
    .optional()
    .isString().withMessage('Descripción inválida'),
  body('unidadBase')
    .notEmpty().withMessage('La unidad base es obligatoria')
    .isLength({ max: 20 }).withMessage('La unidad base no puede exceder 20 caracteres')
    .trim(),
  body('esPerecedero')
    .optional()
    .isBoolean().withMessage('esPerecedero debe ser true o false'),
  body('activo')
    .optional()
    .isBoolean().withMessage('activo debe ser true o false')
    .toBoolean(),
]

const updateProductoValidation = [
  param('id').isUUID().withMessage('ID inválido'),
  body('nombre')
    .optional()
    .isLength({ max: 120 }).withMessage('El nombre no puede exceder 120 caracteres')
    .trim(),
  body('descripcion')
    .optional()
    .isString().withMessage('Descripción inválida'),
  body('unidadBase')
    .optional()
    .isLength({ max: 20 }).withMessage('La unidad base no puede exceder 20 caracteres')
    .trim(),
  body('esPerecedero')
    .optional()
    .isBoolean().withMessage('esPerecedero debe ser true o false'),
  body('activo')
    .optional()
    .isBoolean().withMessage('activo debe ser true o false')
    .toBoolean(),
]

const listProductosValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Página inválida'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Límite inválido (1-100)'),
  query('activo').optional().isBoolean().withMessage('activo debe ser true o false'),
  query('search').optional().isString().withMessage('Búsqueda inválida'),
]

module.exports = {
  createProductoValidation,
  updateProductoValidation,
  listProductosValidation,
}