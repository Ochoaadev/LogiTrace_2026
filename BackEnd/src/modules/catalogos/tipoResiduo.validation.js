const { body, param, query } = require('express-validator')

const createTipoResiduoValidation = [
  body('codigo')
    .notEmpty().withMessage('El código es obligatorio')
    .isLength({ max: 20 }).withMessage('El código no puede exceder 20 caracteres')
    .trim(),
  body('nombre')
    .notEmpty().withMessage('El nombre es obligatorio')
    .isLength({ max: 100 }).withMessage('El nombre no puede exceder 100 caracteres')
    .trim(),
  body('unidadBase')
    .notEmpty().withMessage('La unidad base es obligatoria')
    .isLength({ max: 20 }).withMessage('La unidad base no puede exceder 20 caracteres')
    .trim(),
  body('activo')
    .optional()
    .isBoolean().withMessage('activo debe ser true o false')
    .toBoolean(),
]

const updateTipoResiduoValidation = [
  param('id').isUUID().withMessage('ID inválido'),
  body('nombre')
    .optional()
    .isLength({ max: 100 }).withMessage('El nombre no puede exceder 100 caracteres')
    .trim(),
  body('unidadBase')
    .optional()
    .isLength({ max: 20 }).withMessage('La unidad base no puede exceder 20 caracteres')
    .trim(),
  body('activo')
    .optional()
    .isBoolean().withMessage('activo debe ser true o false')
    .toBoolean(),
]

const listTiposResiduoValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Página inválida'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Límite inválido (1-100)'),
  query('activo').optional().isBoolean().withMessage('activo debe ser true o false'),
  query('search').optional().isString().withMessage('Búsqueda inválida'),
]

module.exports = {
  createTipoResiduoValidation,
  updateTipoResiduoValidation,
  listTiposResiduoValidation,
}