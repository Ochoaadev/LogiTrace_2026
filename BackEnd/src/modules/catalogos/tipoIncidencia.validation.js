const { body, param, query } = require('express-validator')

const createTipoIncidenciaValidation = [
  body('codigo')
    .notEmpty().withMessage('El código es obligatorio')
    .isLength({ max: 20 }).withMessage('El código no puede exceder 20 caracteres')
    .trim(),
  body('nombre')
    .notEmpty().withMessage('El nombre es obligatorio')
    .isLength({ max: 100 }).withMessage('El nombre no puede exceder 100 caracteres')
    .trim(),
  body('descripcion')
    .optional()
    .isString().withMessage('Descripción inválida'),
  body('activo')
    .optional()
    .isBoolean().withMessage('activo debe ser true o false')
    .toBoolean(),
]

const updateTipoIncidenciaValidation = [
  param('id').isUUID().withMessage('ID inválido'),
  body('nombre')
    .optional()
    .isLength({ max: 100 }).withMessage('El nombre no puede exceder 100 caracteres')
    .trim(),
  body('descripcion')
    .optional()
    .isString().withMessage('Descripción inválida'),
  body('activo')
    .optional()
    .isBoolean().withMessage('activo debe ser true o false')
    .toBoolean(),
]

const listTiposIncidenciaValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Página inválida'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Límite inválido (1-100)'),
  query('activo').optional().isBoolean().withMessage('activo debe ser true o false'),
  query('search').optional().isString().withMessage('Búsqueda inválida'),
]

module.exports = {
  createTipoIncidenciaValidation,
  updateTipoIncidenciaValidation,
  listTiposIncidenciaValidation,
}