const numero = new Intl.NumberFormat('es-VE', { maximumFractionDigits: 1 })

export const num = (v) => (v === null || v === undefined ? '—' : numero.format(v))
export const pct = (v) => (v === null || v === undefined ? '—' : `${numero.format(v)}%`)
export const fecha = (d) => new Date(d).toLocaleDateString('es-VE')
export const fechaHora = (d) => new Date(d).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' })
export const cantidades = (lista = []) => lista.map((c) => `${num(c.total)} ${c.unidad}`).join(' + ') || '0'

// Fecha para <input type="date"> en hora local
export const isoLocal = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)

export const PERIODOS = [
  { value: '7', label: 'Últimos 7 días' },
  { value: '30', label: 'Últimos 30 días' },
  { value: '90', label: 'Últimos 90 días' },
  { value: 'mes', label: 'Mes en curso' },
  { value: 'personalizado', label: 'Rango personalizado' },
]

/** Convierte la opción de periodo (y el rango manual) en fechaDesde / fechaHasta ISO. */
export function rangoDePeriodo({ periodo, desde, hasta }) {
  if (periodo === 'personalizado') {
    return {
      fechaDesde: new Date(`${desde}T00:00:00`).toISOString(),
      fechaHasta: new Date(`${hasta}T23:59:59`).toISOString(),
    }
  }
  const fin = new Date()
  if (periodo === 'mes') return { fechaDesde: new Date(fin.getFullYear(), fin.getMonth(), 1).toISOString(), fechaHasta: fin.toISOString() }
  // Días completos: desde las 00:00 de hace N-1 días hasta ahora
  const inicio = new Date(fin)
  inicio.setHours(0, 0, 0, 0)
  inicio.setDate(inicio.getDate() - (Number(periodo) - 1))
  return { fechaDesde: inicio.toISOString(), fechaHasta: fin.toISOString() }
}

// Mensaje de error de una descarga (el cuerpo del error llega como Blob)
export async function mensajeError(err, porDefecto) {
  if (err instanceof Blob) {
    try {
      return JSON.parse(await err.text()).message || porDefecto
    } catch {
      return porDefecto
    }
  }
  return err?.message || porDefecto
}
