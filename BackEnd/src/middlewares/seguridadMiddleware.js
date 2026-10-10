const jwt = require('jsonwebtoken')

const PRODUCCION = process.env.NODE_ENV === 'production'

/**
 * HTTPS obligatorio en producción (detrás del proxy inverso, que informa el protocolo original con
 * X-Forwarded-Proto; requiere TRUST_PROXY). Una lectura por HTTP se redirige; una escritura se rechaza
 * para no reenviar datos que ya viajaron sin cifrar. FORZAR_HTTPS=0 lo desactiva (solo pruebas).
 */
function forzarHttps(req, res, next) {
  if (!PRODUCCION || process.env.FORZAR_HTTPS === '0' || req.secure) return next()
  if (req.method === 'GET' || req.method === 'HEAD') return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`)
  return res.status(403).json({ success: false, message: 'Se requiere HTTPS' })
}

/**
 * Saneamiento de la entrada antes de cualquier validación:
 * - descarta claves usadas para contaminar prototipos (__proto__, constructor, prototype) y las que
 *   empiezan por "$" (operadores de consulta);
 * - quita bytes nulos y caracteres de control invisibles de los textos (se conservan salto de línea,
 *   retorno y tabulador);
 * - limita la profundidad de los objetos anidados.
 * La salida no necesita escapar HTML aquí: React muestra todo texto como texto.
 */
const CLAVES_PROHIBIDAS = new Set(['__proto__', 'constructor', 'prototype'])
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g
const PROFUNDIDAD_MAX = 8

function limpiar(valor, nivel = 0) {
  if (nivel > PROFUNDIDAD_MAX) return undefined
  if (typeof valor === 'string') return valor.replace(CONTROL, '')
  if (Array.isArray(valor)) return valor.map((v) => limpiar(v, nivel + 1))
  if (valor && typeof valor === 'object') {
    const limpio = {}
    for (const [k, v] of Object.entries(valor)) {
      if (CLAVES_PROHIBIDAS.has(k) || k.startsWith('$')) continue
      const r = limpiar(v, nivel + 1)
      if (r !== undefined) limpio[k] = r
    }
    return limpio
  }
  return valor
}

function sanearEntrada(req, res, next) {
  if (req.body && typeof req.body === 'object') req.body = limpiar(req.body)
  // req.query es de solo lectura en Express 5; en 4 se limpian sus valores en el mismo objeto
  for (const [k, v] of Object.entries(req.query || {})) {
    if (CLAVES_PROHIBIDAS.has(k) || k.startsWith('$')) delete req.query[k]
    else req.query[k] = limpiar(v, 1)
  }
  next()
}

/**
 * Límite general de peticiones (además del límite de intentos de login). Ventana de 1 minuto:
 * - por usuario autenticado (id del token): 300 peticiones;
 * - por dirección IP: 900 (en la nube, toda la oficina puede salir por la misma IP).
 * En memoria, por instancia: en un servidor propio es exacto; en Vercel cada instancia cuenta lo suyo y
 * la plataforma añade su propia protección contra ráfagas. El freno de login sí es global (en la base).
 */
const VENTANA_MS = 60 * 1000
const MAX_USUARIO = Number(process.env.LIMITE_POR_USUARIO) || 300
const MAX_IP = Number(process.env.LIMITE_POR_IP) || 900
const contadores = new Map()

setInterval(() => {
  const ahora = Date.now()
  for (const [k, c] of contadores) if (ahora - c.desde > VENTANA_MS) contadores.delete(k)
}, VENTANA_MS).unref()

function contar(clave, ahora) {
  const c = contadores.get(clave)
  if (!c || ahora - c.desde > VENTANA_MS) {
    contadores.set(clave, { n: 1, desde: ahora })
    return 1
  }
  return ++c.n
}

function limiteGeneral(req, res, next) {
  if (req.path === '/health') return next()
  const ahora = Date.now()
  const porIp = contar(`ip|${req.ip}`, ahora)
  let porUsuario = 0
  const auth = req.headers.authorization
  if (auth?.startsWith('Bearer ')) {
    // Solo para contar: la firma se verifica después en authMiddleware
    const sub = jwt.decode(auth.slice(7))?.sub
    if (sub) porUsuario = contar(`u|${sub}`, ahora)
  }
  if (porIp > MAX_IP || porUsuario > MAX_USUARIO) {
    res.set('Retry-After', '60')
    return res.status(429).json({ success: false, message: 'Demasiadas solicitudes. Espere un momento e intente de nuevo.' })
  }
  next()
}

module.exports = { forzarHttps, sanearEntrada, limiteGeneral }
