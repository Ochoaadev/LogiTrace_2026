const { waitUntil } = require('@vercel/functions')

/**
 * Tarea que termina después de enviar la respuesta (auditoría, contadores de intentos). En Vercel la
 * instancia se congela al responder: waitUntil la mantiene viva hasta que la promesa termine. Fuera de
 * Vercel (servidor propio, desarrollo) la promesa simplemente sigue su curso.
 */
function segundoPlano(promesa) {
  const tarea = Promise.resolve(promesa).catch((err) => console.error('Tarea en segundo plano fallida:', err.message))
  try {
    waitUntil(tarea)
  } catch {
    // sin contexto de Vercel
  }
  return tarea
}

module.exports = { segundoPlano }
