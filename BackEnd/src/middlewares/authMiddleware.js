const jwt = require('jsonwebtoken')
const { jwtSecret } = require('../config/env')
const prisma = require('../config/database')

/**
 * Verifica el token y, además, el estado actual del usuario en la BD. Antes bastaba la firma:
 * una cuenta desactivada, o a la que se le quitaba el rol de administrador, conservaba el acceso
 * con su token anterior hasta que vencía (24 h). El rol vigente es el de la BD, no el del token.
 */
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token no proporcionado' })
  }

  const token = authHeader.split(' ')[1]

  let decoded
  try {
    decoded = jwt.verify(token, jwtSecret)
  } catch {
    return res.status(401).json({ message: 'Token inválido o expirado' })
  }

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.sub },
      select: { id: true, email: true, rol: true, activo: true },
    })
    if (!usuario || !usuario.activo) {
      return res.status(401).json({ message: 'Usuario desactivado o inexistente' })
    }
    req.user = { ...decoded, email: usuario.email, rol: usuario.rol }
    next()
  } catch (err) {
    next(err)
  }
}

module.exports = { authMiddleware }
