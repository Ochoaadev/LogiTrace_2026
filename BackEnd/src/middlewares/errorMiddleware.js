const { nodeEnv } = require('../config/env')

function errorMiddleware(err, req, res, next) {
  // Los errores de negocio (AppError) son esperados; solo se registra la traza de los inesperados.
  if (err.name === 'AppError') {
    return res.status(err.status).json({ success: false, message: err.message })
  }

  console.error('Error:', err)

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Error de validación',
      errors: err.errors,
    })
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Token inválido' })
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token expirado' })
  }

  if (err.code === 'P2025') {
    return res.status(404).json({ message: 'Registro no encontrado' })
  }

  // P2023: valor con formato inválido para la columna (p. ej. un ID que no es UUID)
  if (err.code === 'P2023') {
    return res.status(400).json({ message: 'Identificador inválido' })
  }

  if (err.code === 'P2002') {
    return res.status(409).json({ message: 'El registro ya existe' })
  }

  const status = err.status || 500
  // En producción no se exponen mensajes internos (Prisma, stack) en errores 500.
  const message = status === 500 && nodeEnv === 'production'
    ? 'Error interno del servidor'
    : err.message || 'Error interno del servidor'
  res.status(status).json({ message })
}

module.exports = { errorMiddleware }
