const { validationResult } = require('express-validator')

function validationMiddleware(req, res, next) {
  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Error de validación',
      errors: errors.array().map((e) => ({
        campo: e.path,
        mensaje: e.msg,
      })),
    })
  }

  next()
}

module.exports = { validationMiddleware }
