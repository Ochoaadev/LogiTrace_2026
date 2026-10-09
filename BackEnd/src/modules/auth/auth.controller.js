const authService = require('./auth.service')
const { success } = require('../../utils/response')
const prisma = require('../../config/database')
const { registrar } = require('../auditoria/auditoria.service')
const { AppError } = require('../../utils/AppError')

/**
 * El token de renovación viaja solo en esta cookie: httpOnly (JavaScript no puede leerla, así que un
 * script inyectado no puede robarla), Secure en producción (solo por HTTPS), SameSite=Strict (no se
 * envía desde otros sitios: sin CSRF) y limitada a /api/auth. Antes el token también se devolvía en
 * el cuerpo y el navegador lo guardaba en localStorage, al alcance de cualquier script.
 * Sin «Recordar sesión» es una cookie de sesión: desaparece al cerrar el navegador.
 */
const COOKIE = 'lt_refresh'
const opcionesCookie = (recordar) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/api/auth',
  ...(recordar && { maxAge: authService.REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000 }),
})

async function login(req, res, next) {
  try {
    const { email, password } = req.body
    const recordar = req.body.recordar === true
    let result
    try {
      // Campo trampa del formulario: una persona no lo ve ni lo llena; si llega con texto es un bot.
      // Se responde como un intento fallido más (cuenta para el límite de intentos) sin revelar el motivo.
      if (req.body.sitio_web) {
        const err = new AppError('Credenciales inválidas', 401)
        err.detalle = 'Bloqueado: formulario rellenado por un bot'
        throw err
      }
      result = await authService.login(email, password, recordar)
    } catch (err) {
      // Intento fallido sobre una cuenta existente (contraseña errada o cuenta desactivada).
      // Los correos inexistentes no se pueden asociar a un usuario en la tabla Auditoria.
      const cuenta = await prisma.usuario.findUnique({ where: { email: String(email).toLowerCase() }, select: { id: true } })
      if (cuenta) {
        await registrar({ usuarioId: cuenta.id, accion: 'INICIO_SESION_FALLIDO', modulo: 'Acceso', entidad: 'usuarios', entidadId: cuenta.id, ip: req.ip, detalle: err.detalle || err.message })
      }
      throw err
    }
    await registrar({ usuarioId: result.user.id, accion: 'INICIO_SESION', modulo: 'Acceso', entidad: 'usuarios', entidadId: result.user.id, ip: req.ip })

    res.cookie(COOKIE, result.refreshToken, opcionesCookie(recordar))
    // El token de acceso (15 min) se devuelve para que la aplicación lo guarde solo en memoria
    return success(res, { user: result.user, accessToken: result.accessToken }, 'Login exitoso')
  } catch (err) {
    next(err)
  }
}

// Renueva la sesión con la cookie (al recargar la página o cuando vence el token de acceso).
// El token de renovación se rota en cada uso: el anterior queda revocado.
async function refresh(req, res, next) {
  try {
    const result = await authService.refresh(req.cookies?.[COOKIE])
    res.cookie(COOKIE, result.refreshToken, opcionesCookie(result.recordar))
    return success(res, { user: result.user, accessToken: result.accessToken }, 'Token renovado')
  } catch (err) {
    res.clearCookie(COOKIE, opcionesCookie(false))
    next(err)
  }
}

async function logout(req, res, next) {
  try {
    await authService.logout(req.cookies?.[COOKIE])
    res.clearCookie(COOKIE, opcionesCookie(false))
    return success(res, null, 'Logout exitoso')
  } catch (err) {
    next(err)
  }
}

async function me(req, res, next) {
  try {
    const user = await authService.getMe(req.user.sub)
    return success(res, user, 'Perfil obtenido')
  } catch (err) {
    next(err)
  }
}

module.exports = {
  login,
  refresh,
  logout,
  me,
}
