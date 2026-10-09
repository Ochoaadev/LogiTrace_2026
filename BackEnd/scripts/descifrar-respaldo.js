// Descifra un respaldo cifrado para restaurarlo con pg_restore:
//   node scripts/descifrar-respaldo.js respaldos/<archivo>.dump.enc   → crea respaldos/<archivo>.dump
// Usa RESPALDO_CLAVE del .env (la misma con la que se cifró). Borre el .dump descifrado al terminar.
require('dotenv').config()
const { descifrarArchivo } = require('./cifrado-respaldo')

const origen = process.argv[2]
try {
  if (!origen || !origen.endsWith('.enc')) throw new Error('Indique un archivo .dump.enc')
  if (!process.env.RESPALDO_CLAVE) throw new Error('Falta RESPALDO_CLAVE en el .env')
  const destino = origen.slice(0, -4)
  descifrarArchivo(origen, destino, process.env.RESPALDO_CLAVE)
  console.log(`Descifrado: ${destino}`)
} catch (e) {
  console.error('Error al descifrar:', e.message)
  process.exitCode = 1
}
