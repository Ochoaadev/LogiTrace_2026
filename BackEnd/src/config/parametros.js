// Parámetros operativos de la planta (El Murachí, Valera). Se configuran en el .env del servidor y se
// muestran en Administración → Parámetros de planta. Antes estaban repartidos por los módulos y la tasa
// máxima de retornos valía 3,5 % en Devoluciones y 3 % en Reportes.
require('dotenv').config()

const numero = (variable, porDefecto) => {
  const valor = Number(process.env[variable])
  return Number.isFinite(valor) && process.env[variable] !== '' && process.env[variable] !== undefined ? valor : porDefecto
}

const PARAMETROS = {
  zonaHoraria: 'America/Caracas',
  ejeOperativo: process.env.EJE_OPERATIVO || 'Valera - Carvajal (Edo. Trujillo)',
  // Cadena de frío (mediciones manuales)
  temperaturaObjetivoCavaC: numero('TEMP_OBJETIVO_CAVA_C', -18),
  limiteCriticoC: numero('TEMP_LIMITE_CRITICO_C', -15),
  // Metas de rendimiento (Reportes y Devoluciones)
  eficaciaMinima: numero('META_EFICACIA_PCT', 92),
  cicloEstandarMin: numero('META_CICLO_MIN', 40),
  incidenciasMaxima: numero('META_INCIDENCIAS_MAX_PCT', 5),
  tasaRetornoMax: numero('TASA_RETORNO_MAX', 3.5),
}

module.exports = { PARAMETROS }
