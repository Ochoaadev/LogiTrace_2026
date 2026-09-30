const { Prisma } = require('@prisma/client')
const prisma = require('../config/database')

/**
 * Ids de la tabla cuyo texto contiene la búsqueda sin distinguir tildes ni mayúsculas
 * ("maria" encuentra "María"). Usa la extensión unaccent (migración extension_unaccent).
 * `tabla` y `columnas` vienen del código, nunca del usuario; el texto va como parámetro.
 */
async function idsSinTildes(tabla, columnas, texto) {
  const patron = `%${texto.replace(/[\\%_]/g, (c) => '\\' + c)}%`
  const condiciones = columnas.map((c) => Prisma.sql`unaccent(COALESCE(${Prisma.raw(`"${c}"`)}, '')) ILIKE unaccent(${patron})`)
  const filas = await prisma.$queryRaw`SELECT "id" FROM ${Prisma.raw(`"${tabla}"`)} WHERE ${Prisma.join(condiciones, ' OR ')}`
  return filas.map((f) => f.id)
}

module.exports = { idsSinTildes }
