const { body, param, query } = require('express-validator')

// Centro de la zona: ambos o ninguno (null borra el centro al editar)
const centro = [
  body('latitudCentro').optional({ values: 'null' }).isFloat({ min: -90, max: 90 }).withMessage('Latitud del centro fuera de rango').toFloat(),
  body('longitudCentro').optional({ values: 'null' }).isFloat({ min: -180, max: 180 }).withMessage('Longitud del centro fuera de rango').toFloat(),
  body('longitudCentro').custom((lng, { req }) => {
    const conLat = req.body.latitudCentro != null
    const conLng = lng != null
    if (conLat !== conLng) throw new Error('Indique latitud y longitud del centro juntas')
    return true
  }),
]

const createZonaValidation = [
  body('codigo')
    .notEmpty().withMessage('El código es obligatorio')
    .isLength({ max: 20 }).withMessage('El código no puede exceder 20 caracteres')
    .trim(),
  body('nombre')
    .notEmpty().withMessage('El nombre es obligatorio')
    .isLength({ max: 100 }).withMessage('El nombre no puede exceder 100 caracteres')
    .trim(),
  body('municipio')
    .optional()
    .isLength({ max: 100 }).withMessage('El municipio no puede exceder 100 caracteres')
    .trim(),
  body('activo')
    .optional()
    .isBoolean().withMessage('activo debe ser true o false')
    .toBoolean(),
  ...centro,
]

const updateZonaValidation = [
  param('id').isUUID().withMessage('ID inválido'),
  body('nombre')
    .optional()
    .isLength({ max: 100 }).withMessage('El nombre no puede exceder 100 caracteres')
    .trim(),
  body('municipio')
    .optional()
    .isLength({ max: 100 }).withMessage('El municipio no puede exceder 100 caracteres')
    .trim(),
  body('activo')
    .optional()
    .isBoolean().withMessage('activo debe ser true o false')
    .toBoolean(),
  ...centro,
]

const listZonasValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Página inválida'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Límite inválido (1-100)'),
  query('activo').optional().isBoolean().withMessage('activo debe ser true o false'),
  query('search').optional().isString().withMessage('Búsqueda inválida'),
]

module.exports = {
  createZonaValidation,
  updateZonaValidation,
  listZonasValidation,
}