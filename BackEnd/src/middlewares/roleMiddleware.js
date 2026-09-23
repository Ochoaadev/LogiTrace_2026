function roleMiddleware(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' })
    }

    if (!allowedRoles.includes(req.user.rol)) {
      return res.status(403).json({ message: 'No tienes permisos para esta acción' })
    }

    next()
  }
}

module.exports = { roleMiddleware }
