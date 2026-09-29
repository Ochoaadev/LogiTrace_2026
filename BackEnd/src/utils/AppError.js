// Error de negocio con código HTTP. errorMiddleware responde con err.status;
// un Error normal sin status se trata como fallo inesperado (500).
class AppError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.name = 'AppError'
    this.status = status
  }
}

module.exports = { AppError }
