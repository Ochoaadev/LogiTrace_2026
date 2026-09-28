const { body, param, query } = require('express-validator')

const createUsuarioValidation = [
  body('nombre')
    .notEmpty().withMessage('El nombre es obligatorio')
    .isLength({ min: 2, max: 120 }).withMessage('El nombre debe tener entre 2 y 120 caracteres')
    .trim(),
  body('email')
    .notEmpty().withMessage('El email es obligatorio')
    .isEmail().withMessage('Formato de email inválido')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('La contraseña es obligatoria')
    .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres')
    .matches(/[A-Z]/).withMessage('La contraseña debe contener al menos una mayúscula')
    .matches(/[a-z]/).withMessage('La contraseña debe contener al menos una minúscula')
    .matches(/[0-9]/).withMessage('La contraseña debe contener al menos un número')
    .matches(/[^A-Za-z0-9]/).withMessage('La contraseña debe contener al menos un carácter especial'),
  body('rol')
    .notEmpty().withMessage('El rol es obligatorio')
    .isIn(['ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR', 'REPARTIDOR']).withMessage('Rol inválido'),
  body('documento')
    .optional()
    .isLength({ max: 30 }).withMessage('El documento no puede exceder 30 caracteres'),
  body('telefono')
    .optional()
    .isLength({ max: 30 }).withMessage('El teléfono no puede exceder 30 caracteres'),
]

const updateUsuarioValidation = [
  param('id').isUUID().withMessage('ID inválido'),
  body('nombre')
    .optional()
    .isLength({ min: 2, max: 120 }).withMessage('El nombre debe tener entre 2 y 120 caracteres')
    .trim(),
  body('email')
    .optional()
    .isEmail().withMessage('Formato de email inválido')
    .normalizeEmail(),
  body('documento')
    .optional()
    .isLength({ max: 30 }).withMessage('El documento no puede exceder 30 caracteres'),
  body('telefono')
    .optional()
    .isLength({ max: 30 }).withMessage('El teléfono no puede exceder 30 caracteres'),
]

const changeEstadoValidation = [
  param('id').isUUID().withMessage('ID inválido'),
  body('activo')
    .notEmpty().withMessage('El estado es obligatorio')
    .isBoolean().withMessage('El estado debe ser true o false'),
]

const changeRolValidation = [
  param('id').isUUID().withMessage('ID inválido'),
  body('rol')
    .notEmpty().withMessage('El rol es obligatorio')
    .isIn(['ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR', 'REPARTIDOR']).withMessage('Rol inválido'),
]

const changePasswordValidation = [
  body('passwordActual')
    .notEmpty().withMessage('La contraseña actual es obligatoria'),
  body('passwordNueva')
    .notEmpty().withMessage('La nueva contraseña es obligatoria')
    .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres')
    .matches(/[A-Z]/).withMessage('La contraseña debe contener al menos una mayúscula')
    .matches(/[a-z]/).withMessage('La contraseña debe contener al menos una minúscula')
    .matches(/[0-9]/).withMessage('La contraseña debe contener al menos un número')
    .matches(/[^A-Za-z0-9]/).withMessage('La contraseña debe contener al menos un carácter especial'),
  body('confirmarPassword')
    .notEmpty().withMessage('La confirmación es obligatoria')
    .custom((value, { req }) => value === req.body.passwordNueva)
    .withMessage('Las contraseñas no coinciden'),
]

const listUsuariosValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Página inválida'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Límite inválido (1-100)'),
  query('rol').optional().isIn(['ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR', 'REPARTIDOR']).withMessage('Rol inválido'),
  query('activo').optional().isBoolean().withMessage('Activo debe ser true o false'),
  query('search').optional().isString().withMessage('Búsqueda inválida'),
]

module.exports = {
  createUsuarioValidation,
  updateUsuarioValidation,
  changeEstadoValidation,
  changeRolValidation,
  changePasswordValidation,
  listUsuariosValidation,
}