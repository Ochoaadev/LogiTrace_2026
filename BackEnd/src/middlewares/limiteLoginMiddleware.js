const { error } = require('../utils/response')

// Freno a la prueba masiva de contraseñas en /auth/login. Cuenta los intentos fallidos (HTTP 401)
// por dirección IP + correo y por dirección IP; al superar el límite responde 429 hasta que pase la
// ventana. Un inicio de sesión correcto reinicia el contador de ese correo. En memoria: basta para
// una sola instancia del backend (si se reinicia, los contadores empiezan de cero).
const VENTANA_MS = 15 * 60 * 1000
const MAX_POR_CUENTA = 5
const MAX_POR_IP = 20

const fallos = new Map() // clave → { n, desde }

function vigente(clave, ahora) {
  const f = fallos.get(clave)
  if (!f) return null
  if (ahora - f.desde > VENTANA_MS) {
    fallos.delete(clave)
    return null
  }
  return f
}

function sumar(clave, ahora) {
  const f = vigente(clave, ahora)
  if (f) f.n += 1
  else fallos.set(clave, { n: 1, desde: ahora })
}

// Limpieza periódica de contadores vencidos (no mantiene vivo el proceso)
setInterval(() => {
  const ahora = Date.now()
  for (const clave of fallos.keys()) vigente(clave, ahora)
}, VENTANA_MS).unref()

function limiteLoginMiddleware(req, res, next) {
  const ahora = Date.now()
  const ip = req.ip || req.socket?.remoteAddress || 'desconocida'
  const correo = String(req.body?.email || '').trim().toLowerCase()
  const claveCuenta = `${ip}|${correo}`
  const claveIp = `ip|${ip}`

  const cuenta = vigente(claveCuenta, ahora)
  const porIp = vigente(claveIp, ahora)
  const bloqueo = (cuenta?.n >= MAX_POR_CUENTA && cuenta) || (porIp?.n >= MAX_POR_IP && porIp)
  if (bloqueo) {
    const minutos = Math.max(1, Math.ceil((bloqueo.desde + VENTANA_MS - ahora) / 60000))
    res.set('Retry-After', String(minutos * 60))
    return error(res, `Demasiados intentos fallidos. Intente de nuevo en ${minutos} minuto(s).`, 429)
  }

  res.on('finish', () => {
    if (res.statusCode === 401) {
      sumar(claveCuenta, Date.now())
      sumar(claveIp, Date.now())
    } else if (res.statusCode < 400) {
      fallos.delete(claveCuenta)
    }
  })
  next()
}

module.exports = { limiteLoginMiddleware }
