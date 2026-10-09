const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const prisma = require('../../config/database')
const { jwtSecret, jwtExpiresIn } = require('../../config/env')
const { AppError } = require('../../utils/AppError')

const BCRYPT_ROUNDS = 12
const REFRESH_EXPIRES_DAYS = 7

// Hash de una contraseña que nadie tiene: cuando el correo no existe se compara igual contra él, para
// que la respuesta tarde lo mismo y no delate qué correos están registrados
const HASH_FICTICIO = bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), BCRYPT_ROUNDS)

// Tokens de renovación ya usados o cerrados (rotación): id del token → vencimiento. Se purgan al vencer.
const revocados = new Map()
setInterval(() => {
  const ahora = Date.now() / 1000
  for (const [jti, exp] of revocados) if (exp < ahora) revocados.delete(jti)
}, 60 * 60 * 1000).unref()

function generateAccessToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, rol: user.rol }, jwtSecret, { expiresIn: jwtExpiresIn })
}

// `recordar` viaja en el token para que la rotación conserve el tipo de cookie elegido al entrar
function generateRefreshToken(user, recordar) {
  return jwt.sign(
    { sub: user.id, type: 'refresh', recordar: !!recordar },
    jwtSecret,
    { expiresIn: `${REFRESH_EXPIRES_DAYS}d`, jwtid: crypto.randomUUID() },
  )
}

function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, jwtSecret)
  } catch {
    return null
  }
}

async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash)
}

const sinClave = ({ passwordHash, ...resto }) => resto

/**
 * Mismo mensaje para correo inexistente, contraseña errada o cuenta desactivada: antes «Usuario
 * desactivado» confirmaba que el correo existía. El motivo real queda en `detalle` para la auditoría.
 */
async function login(email, password, recordar = false) {
  const user = await prisma.usuario.findUnique({
    where: { email: email.toLowerCase() },
    include: { repartidor: true },
  })
  const valid = await comparePassword(password, user?.passwordHash || HASH_FICTICIO)
  if (!user || !valid || !user.activo) {
    const err = new AppError('Credenciales inválidas', 401)
    err.detalle = !user ? 'Correo no registrado' : !valid ? 'Contraseña incorrecta' : 'Cuenta desactivada'
    throw err
  }

  await prisma.usuario.update({ where: { id: user.id }, data: { ultimoAcceso: new Date() } })

  return {
    user: sinClave(user),
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user, recordar),
  }
}

async function refresh(refreshToken) {
  const decoded = refreshToken ? verifyRefreshToken(refreshToken) : null
  if (!decoded || decoded.type !== 'refresh' || !decoded.jti || revocados.has(decoded.jti)) {
    throw new AppError('Sesión vencida o cerrada', 401)
  }

  const user = await prisma.usuario.findUnique({ where: { id: decoded.sub }, include: { repartidor: true } })
  if (!user || !user.activo) throw new AppError('Sesión vencida o cerrada', 401)

  revocados.set(decoded.jti, decoded.exp)

  return {
    user: sinClave(user),
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user, decoded.recordar),
    recordar: !!decoded.recordar,
  }
}

async function logout(refreshToken) {
  const decoded = refreshToken ? verifyRefreshToken(refreshToken) : null
  if (decoded?.jti) revocados.set(decoded.jti, decoded.exp)
  return true
}

async function getMe(userId) {
  const user = await prisma.usuario.findUnique({ where: { id: userId }, include: { repartidor: true } })
  if (!user) throw new AppError('Usuario no encontrado', 404)
  return sinClave(user)
}

module.exports = {
  REFRESH_EXPIRES_DAYS,
  login,
  refresh,
  logout,
  getMe,
  hashPassword,
  comparePassword,
}
