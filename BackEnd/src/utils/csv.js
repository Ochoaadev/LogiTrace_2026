/**
 * Celda CSV segura (separador ";" para Excel es-VE):
 * - RFC 4180: comillas si hay separador, comillas o salto de línea.
 * - Inyección de fórmulas: un texto que empieza por = + - @ (o tabulador / retorno) se ejecutaría como
 *   fórmula al abrir el archivo en Excel (p. ej. un cliente llamado "=HYPERLINK(...)"). Se antepone
 *   un apóstrofo para que se muestre como texto. Los números (incluidos los negativos) no se alteran.
 */
function celdaCsv(valor) {
  if (valor === null || valor === undefined) return ''
  let s = String(valor)
  if (typeof valor !== 'number' && /^[=+\-@\t\r]/.test(s) && !/^-?\d+([.,]\d+)?$/.test(s)) s = `'${s}`
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

module.exports = { celdaCsv }
