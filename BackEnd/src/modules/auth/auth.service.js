const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const prisma = require('../../config/database')
const { jwtSecret, jwtExpiresIn } = require('../../config/env')
const { AppError } = require('../../utils/AppError')

const BCRYPT_ROUNDS = 12
const REFRESH_EXPIRES_DAYS = 7

const tokenBlacklist = new Set()

function generateAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, rol: user.rol },
    jwtSecret,
    { expiresIn: jwtExpiresIn }
  )
}

function generateRefreshToken(user) {
  return jwt.sign(
    { sub: user.id, type: 'refresh' },
    jwtSecret,
    { expiresIn: `${REFRESH_EXPIRES_DAYS}d` }
  )
}

function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, jwtSecret)
  } catch {
    return null
  }
}

function isTokenBlacklisted(token) {
  return tokenBlacklist.has(token)
}

function blacklistToken(token) {
  tokenBlacklist.add(token)
}

async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash)
}

async function login(email, password) {
  const user = await prisma.usuario.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      repartidor: true,
    },
  })

  if (!user) {
    throw new AppError('Credenciales inválidas', 401)
  }

  if (!user.activo) {
    throw new AppError('Usuario desactivado', 401)
  }

  const valid = await comparePassword(password, user.passwordHash)
  if (!valid) {
    throw new AppError('Credenciales inválidas', 401)
  }

  await prisma.usuario.update({
    where: { id: user.id },
    data: { ultimoAcceso: new Date() },
  })

  const accessToken = generateAccessToken(user)
  const refreshToken = generateRefreshToken(user)

  const { passwordHash, ...userWithoutPassword } = user

  return {
    user: userWithoutPassword,
    accessToken,
    refreshToken,
  }
}

async function register(data) {
  const { nombre, email, password, rol, documento, telefono } = data

  const existing = await prisma.usuario.findUnique({
    where: { email: email.toLowerCase() },
  })

  if (existing) {
    throw new AppError('El email ya está registrado', 409)
  }

  if (documento) {
    const existingDoc = await prisma.usuario.findUnique({
      where: { documento },
    })
    if (existingDoc) {
      throw new AppError('El documento ya está registrado', 409)
    }
  }

  const passwordHash = await hashPassword(password)

  const codigo = `USR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

  const user = await prisma.usuario.create({
    data: {
      codigo,
      nombre,
      email: email.toLowerCase(),
      passwordHash,
      rol,
      documento,
      telefono,
    },
    include: { repartidor: true },
  })

  if (rol === 'REPARTIDOR') {
    await prisma.repartidor.create({
      data: {
        usuarioId: user.id,
        estado: 'DISPONIBLE',
      },
    })
  }

  const accessToken = generateAccessToken(user)
  const refreshToken = generateRefreshToken(user)

  const { passwordHash: _, ...userWithoutPassword } = user

  return {
    user: userWithoutPassword,
    accessToken,
    refreshToken,
  }
}

async function refresh(refreshToken) {
  if (!refreshToken || isTokenBlacklisted(refreshToken)) {
    throw new AppError('Refresh token inválido o revocado', 401)
  }

  const decoded = verifyRefreshToken(refreshToken)
  if (!decoded || decoded.type !== 'refresh') {
    throw new AppError('Refresh token inválido', 401)
  }

  const user = await prisma.usuario.findUnique({
    where: { id: decoded.sub },
    include: { repartidor: true },
  })

  if (!user || !user.activo) {
    throw new AppError('Usuario no encontrado o desactivado', 401)
  }

  blacklistToken(refreshToken)

  const newAccessToken = generateAccessToken(user)
  const newRefreshToken = generateRefreshToken(user)

  const { passwordHash, ...userWithoutPassword } = user

  return {
    user: userWithoutPassword,
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  }
}

async function logout(refreshToken) {
  if (refreshToken) {
    blacklistToken(refreshToken)
  }
  return true
}

async function getMe(userId) {
  const user = await prisma.usuario.findUnique({
    where: { id: userId },
    include: { repartidor: true },
  })

  if (!user) {
    throw new AppError('Usuario no encontrado', 404)
  }

  const { passwordHash, ...userWithoutPassword } = user
  return userWithoutPassword
}

module.exports = {
  login,
  register,
  refresh,
  logout,
  getMe,
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  isTokenBlacklisted,
  blacklistToken,
}