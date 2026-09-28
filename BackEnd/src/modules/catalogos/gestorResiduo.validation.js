const { body, param, query } = require('express-validator')

const createGestorResiduoValidation = [
  body('codigo')
    .notEmpty().withMessage('El código es obligatorio')
    .isLength({ max: 20 }).withMessage('El código no puede exceder 20 caracteres')
    .trim(),
  body('nombre')
    .notEmpty().withMessage('El nombre es obligatorio')
    .isLength({ max: 120 }).withMessage('El nombre no puede exceder 120 caracteres')
    .trim(),
  body('tipo')
    .notEmpty().withMessage('El tipo es obligatorio')
    .isIn(['INTERNO', 'EXTERNO']).withMessage('Tipo inválido (INTERNO/EXTERNO)'),
  body('contacto')
    .optional()
    .isString().withMessage('Contacto inválido'),
  body('ubicacion')
    .optional()
    .isString().withMessage('Ubicación inválida'),
  body('activo')
    .optional()
    .isBoolean().withMessage('activo debe ser true o false'),
]

const updateGestorResiduoValidation = [
  param('id').isUUID().withMessage('ID inválido'),
  body('nombre')
    .optional()
    .isLength({ max: 120 }).withMessage('El nombre no puede exceder 120 caracteres')
    .trim(),
  body('tipo')
    .optional()
    .isIn(['INTERNO', 'EXTERNO']).withMessage('Tipo inválido (INTERNO/EXTERNO)'),
  body('contacto')
    .optional()
    .isString().withMessage('Contacto inválido'),
  body('ubicacion')
    .optional()
    .isString().withMessage('Ubicación inválida'),
  body('activo')
    .optional()
    .isBoolean().withMessage('activo debe ser true o false'),
]

const listGestoresResiduoValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Página inválida'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Límite inválido (1-100)'),
  query('tipo').optional().isIn(['INTERNO', 'EXTERNO']).withMessage('Tipo inválido'),
  query('activo').optional().isBoolean().withMessage('activo debe ser true o false'),
  query('search').optional().isString().withMessage('Búsqueda inválida'),
]

module.exports = {
  createGestorResiduoValidation,
  updateGestorResiduoValidation,
  listGestoresResiduoValidation,
}