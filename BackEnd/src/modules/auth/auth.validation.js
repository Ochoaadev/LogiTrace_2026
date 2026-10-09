const { body } = require('express-validator')

const loginValidation = [
  body('email')
    .notEmpty().withMessage('El email es obligatorio')
    .isEmail().withMessage('Formato de email inválido')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('La contraseña es obligatoria')
    .isLength({ min: 1, max: 200 }).withMessage('Contraseña inválida'),
  body('recordar').optional().isBoolean().withMessage('recordar debe ser true o false').toBoolean(),
  body('sitio_web').optional().isString().isLength({ max: 200 }),
]

module.exports = {
  loginValidation,
}