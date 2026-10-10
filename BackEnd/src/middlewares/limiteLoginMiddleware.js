const prisma = require('../config/database')
const { error } = require('../utils/response')
const { segundoPlano } = require('../utils/segundoPlano')

// Freno a la prueba masiva de contraseñas en /auth/login. Cuenta los intentos fallidos (HTTP 401)
// por dirección IP + correo y por dirección IP; al superar el límite responde 429 hasta que pase la
// ventana. Un inicio de sesión correcto reinicia el contador de ese correo. Los contadores están en la
// tabla IntentoLogin: en la nube cada petición puede atenderla una instancia distinta del backend.
const VENTANA_MS = 15 * 60 * 1000
const MAX_POR_CUENTA = 5
const MAX_POR_IP = 20

const vigente = (f, ahora) => (f && ahora - f.desde.getTime() <= VENTANA_MS ? f : null)

async function sumar(clave) {
  const ahora = new Date()
  const f = await prisma.intentoLogin.findUnique({ where: { clave } })
  if (vigente(f, ahora.getTime())) {
    await prisma.intentoLogin.update({ where: { clave }, data: { n: { increment: 1 } } })
  } else {
    await prisma.intentoLogin.upsert({ where: { clave }, create: { clave, n: 1, desde: ahora }, update: { n: 1, desde: ahora } })
  }
}

async function limiteLoginMiddleware(req, res, next) {
  try {
    const ahora = Date.now()
    const ip = req.ip || req.socket?.remoteAddress || 'desconocida'
    const correo = String(req.body?.email || '').trim().toLowerCase().slice(0, 254)
    const claveCuenta = `${ip}|${correo}`
    const claveIp = `ip|${ip}`

    const filas = await prisma.intentoLogin.findMany({ where: { clave: { in: [claveCuenta, claveIp] } } })
    const cuenta = vigente(filas.find((f) => f.clave === claveCuenta), ahora)
    const porIp = vigente(filas.find((f) => f.clave === claveIp), ahora)
    const bloqueo = (cuenta?.n >= MAX_POR_CUENTA && cuenta) || (porIp?.n >= MAX_POR_IP && porIp)
    if (bloqueo) {
      const minutos = Math.max(1, Math.ceil((bloqueo.desde.getTime() + VENTANA_MS - ahora) / 60000))
      res.set('Retry-After', String(minutos * 60))
      return error(res, `Demasiados intentos fallidos. Intente de nuevo en ${minutos} minuto(s).`, 429)
    }

    res.on('finish', () => {
      if (res.statusCode === 401) {
        segundoPlano(Promise.all([sumar(claveCuenta), sumar(claveIp)]))
      } else if (res.statusCode < 400) {
        // Limpieza de contadores vencidos aprovechando el inicio de sesión correcto
        segundoPlano(prisma.intentoLogin.deleteMany({
          where: { OR: [{ clave: claveCuenta }, { desde: { lt: new Date(Date.now() - VENTANA_MS) } }] },
        }))
      }
    })
    next()
  } catch (err) {
    next(err)
  }
}

module.exports = { limiteLoginMiddleware }
