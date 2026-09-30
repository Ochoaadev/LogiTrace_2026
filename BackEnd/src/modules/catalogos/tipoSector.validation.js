const { body, param, query } = require('express-validator')
const { centroYRadio } = require('./area.validation')

const comunes = [
  body('descripcion').optional({ values: 'null' }).isLength({ max: 1000 }).withMessage('La descripción no puede exceder 1000 caracteres').trim(),
  body('activo').optional().isBoolean().withMessage('activo debe ser true o false').toBoolean(),
  ...centroYRadio,
]

const createTipoSectorValidation = [
  body('codigo')
    .notEmpty().withMessage('El código es obligatorio')
    .isLength({ max: 20 }).withMessage('El código no puede exceder 20 caracteres')
    .trim(),
  body('nombre')
    .notEmpty().withMessage('El nombre es obligatorio')
    .isLength({ max: 100 }).withMessage('El nombre no puede exceder 100 caracteres')
    .trim(),
  ...comunes,
]

const updateTipoSectorValidation = [
  param('id').isUUID().withMessage('ID inválido'),
  body('nombre')
    .optional()
    .notEmpty().withMessage('El nombre es obligatorio')
    .isLength({ max: 100 }).withMessage('El nombre no puede exceder 100 caracteres')
    .trim(),
  ...comunes,
]

const listTiposSectorValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Página inválida'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Límite inválido (1-100)'),
  query('activo').optional().isBoolean().withMessage('activo debe ser true o false'),
  query('search').optional().isString().withMessage('Búsqueda inválida'),
]

module.exports = {
  createTipoSectorValidation,
  updateTipoSectorValidation,
  listTiposSectorValidation,
}
