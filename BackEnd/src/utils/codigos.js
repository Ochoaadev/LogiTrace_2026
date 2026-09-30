const crypto = require('crypto')
const prisma = require('../config/database')

const CARACTERES = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const INTENTOS = 8

// Fecha de operación en Venezuela (antes se tomaba en UTC: desde las 8 p. m. los códigos salían con el día siguiente)
const aammdd = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' }).slice(2).replace(/-/g, '')
const azar = (n) => Array.from({ length: n }, () => CARACTERES[crypto.randomInt(CARACTERES.length)]).join('')

/**
 * Código legible PREFIJO-AAMMDD-XXXX que no existe aún en la tabla. Antes se generaba al azar sin
 * comprobarlo: con muchos registros el mismo día dos podían coincidir y el alta fallaba con 409
 * (lo detectó la batería de pruebas en ejecucion-5). `cliente` permite usarlo dentro de una transacción.
 */
async function codigoUnico(prefijo, modelo, cliente = prisma) {
  for (let i = 0; i < INTENTOS; i++) {
    const codigo = `${prefijo}-${aammdd()}-${azar(4)}`
    if (!(await cliente[modelo].findUnique({ where: { codigo }, select: { codigo: true } }))) return codigo
  }
  throw new Error(`No se pudo generar un código único para ${modelo}`)
}

module.exports = { codigoUnico }
