function errorMiddleware(err, req, res, next) {
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

  if (err.code === 'P2002') {
    return res.status(409).json({ message: 'El registro ya existe' })
  }

  res.status(err.status || 500).json({
    message: err.message || 'Error interno del servidor',
  })
}

module.exports = { errorMiddleware }
