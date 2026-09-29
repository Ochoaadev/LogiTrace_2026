// Fechas sin hora (@db.Date en Prisma: vencimiento, producción, fecha de ruta) llegan como
// medianoche UTC ("2026-10-01T00:00:00.000Z"). Formateadas en la zona local (UTC-4) retroceden
// un día; por eso se formatean en UTC.
export function fechaSinHora(valor) {
  if (!valor) return '—'
  return new Date(valor).toLocaleDateString('es-VE', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' })
}

// Días que faltan para una fecha sin hora (negativo si ya pasó), contando desde hoy en Venezuela
export function diasHasta(valor) {
  if (!valor) return null
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' })
  const objetivo = new Date(valor).toISOString().slice(0, 10)
  return Math.round((Date.parse(objetivo) - Date.parse(hoy)) / 86_400_000)
}
