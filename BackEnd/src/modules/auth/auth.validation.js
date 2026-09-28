const { body } = require('express-validator')

const loginValidation = [
  body('email')
    .notEmpty().withMessage('El email es obligatorio')
    .isEmail().withMessage('Formato de email inválido')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('La contraseña es obligatoria')
    .isLength({ min: 1 }).withMessage('La contraseña no puede estar vacía'),
]

const registerValidation = [
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

const refreshValidation = [
  body('refreshToken')
    .optional()
    .isString().withMessage('Refresh token inválido'),
]

module.exports = {
  loginValidation,
  registerValidation,
  refreshValidation,
}