// Cifrado de respaldos con AES-256-GCM. La clave se deriva de RESPALDO_CLAVE (frase secreta del .env)
// con scrypt y una sal aleatoria por archivo; GCM detecta cualquier alteración del archivo cifrado.
// Formato: "LTBK1" | sal (16) | iv (12) | etiqueta (16) | datos cifrados.
const crypto = require('crypto')
const fs = require('fs')

const MAGIA = Buffer.from('LTBK1')

const derivar = (frase, sal) => crypto.scryptSync(frase, sal, 32, { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 })

function cifrarArchivo(origen, destino, frase) {
  const sal = crypto.randomBytes(16)
  const iv = crypto.randomBytes(12)
  const cifrador = crypto.createCipheriv('aes-256-gcm', derivar(frase, sal), iv)
  const datos = Buffer.concat([cifrador.update(fs.readFileSync(origen)), cifrador.final()])
  fs.writeFileSync(destino, Buffer.concat([MAGIA, sal, iv, cifrador.getAuthTag(), datos]))
}

function descifrarArchivo(origen, destino, frase) {
  const b = fs.readFileSync(origen)
  if (!b.subarray(0, MAGIA.length).equals(MAGIA)) throw new Error('No es un respaldo cifrado de LogiTrace')
  let o = MAGIA.length
  const sal = b.subarray(o, (o += 16))
  const iv = b.subarray(o, (o += 12))
  const etiqueta = b.subarray(o, (o += 16))
  const descifrador = crypto.createDecipheriv('aes-256-gcm', derivar(frase, sal), iv)
  descifrador.setAuthTag(etiqueta)
  try {
    fs.writeFileSync(destino, Buffer.concat([descifrador.update(b.subarray(o)), descifrador.final()]))
  } catch {
    throw new Error('Clave incorrecta o archivo alterado')
  }
}

module.exports = { cifrarArchivo, descifrarArchivo }
