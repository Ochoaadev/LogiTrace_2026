const { body, param, query } = require('express-validator')

const createClienteValidation = [
  body('codigo')
    .optional({ values: 'falsy' }) // si falta, se asigna el siguiente CLI-###
    .isLength({ max: 20 }).withMessage('El código no puede exceder 20 caracteres')
    .trim(),
  body('razonSocial')
    .notEmpty().withMessage('La razón social es obligatoria')
    .isLength({ max: 150 }).withMessage('La razón social no puede exceder 150 caracteres')
    .trim(),
  body('nombreContacto')
    .optional()
    .isLength({ max: 120 }).withMessage('El nombre de contacto no puede exceder 120 caracteres')
    .trim(),
  body('tipoDocumento')
    .optional({ values: 'falsy' })
    .isIn(['V', 'E', 'J', 'G', 'P']).withMessage('Tipo de documento inválido (V, E, J, G o P)'),
  body('numeroDocumento')
    .optional()
    .isLength({ max: 30 }).withMessage('El número de documento no puede exceder 30 caracteres')
    .trim(),
  body('telefono')
    .optional()
    .isLength({ max: 30 }).withMessage('El teléfono no puede exceder 30 caracteres')
    .trim(),
  body('email')
    .optional()
    .isEmail().withMessage('Email inválido')
    .normalizeEmail(),
  body('activo')
    .optional()
    .isBoolean().withMessage('activo debe ser true o false')
    .toBoolean(),
]

const updateClienteValidation = [
  param('id').isUUID().withMessage('ID inválido'),
  body('razonSocial')
    .optional()
    .isLength({ max: 150 }).withMessage('La razón social no puede exceder 150 caracteres')
    .trim(),
  body('nombreContacto')
    .optional()
    .isLength({ max: 120 }).withMessage('El nombre de contacto no puede exceder 120 caracteres')
    .trim(),
  body('tipoDocumento')
    .optional({ values: 'falsy' })
    .isIn(['V', 'E', 'J', 'G', 'P']).withMessage('Tipo de documento inválido (V, E, J, G o P)'),
  body('numeroDocumento')
    .optional()
    .isLength({ max: 30 }).withMessage('El número de documento no puede exceder 30 caracteres')
    .trim(),
  body('telefono')
    .optional()
    .isLength({ max: 30 }).withMessage('El teléfono no puede exceder 30 caracteres')
    .trim(),
  body('email')
    .optional()
    .isEmail().withMessage('Email inválido')
    .normalizeEmail(),
  body('activo')
    .optional()
    .isBoolean().withMessage('activo debe ser true o false')
    .toBoolean(),
]

const listClientesValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Página inválida'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Límite inválido (1-100)'),
  query('activo').optional().isBoolean().withMessage('activo debe ser true o false'),
  query('search').optional().isString().withMessage('Búsqueda inválida'),
]

module.exports = {
  createClienteValidation,
  updateClienteValidation,
  listClientesValidation,
}