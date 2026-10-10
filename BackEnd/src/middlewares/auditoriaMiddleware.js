const { registrar, describirSolicitud } = require('../modules/auditoria/auditoria.service')
const { segundoPlano } = require('../utils/segundoPlano')

const ESCRITURA = ['POST', 'PUT', 'PATCH', 'DELETE']
// El inicio de sesión se audita en el controlador (incluye los intentos fallidos)
const EXCLUIDAS = [/^\/api\/auth\//]

/**
 * Registra en Auditoria cada operación de escritura que termina con éxito (< 400) hecha por un
 * usuario autenticado. Se evalúa al finalizar la respuesta, cuando authMiddleware ya fijó req.user.
 */
function auditoriaMiddleware(req, res, next) {
  if (!ESCRITURA.includes(req.method) || EXCLUIDAS.some((r) => r.test(req.originalUrl))) return next()
  res.on('finish', () => {
    if (res.statusCode >= 400 || !req.user?.sub) return
    // En la nube la escritura debe terminar aunque la respuesta ya se haya enviado
    segundoPlano(registrar({ usuarioId: req.user.sub, ip: req.ip, ...describirSolicitud(req) }))
  })
  next()
}

module.exports = { auditoriaMiddleware }
