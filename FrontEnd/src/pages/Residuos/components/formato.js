const numero = new Intl.NumberFormat('es-VE', { maximumFractionDigits: 1 })

export const cantidad = (n) => numero.format(Number(n) || 0)

// [{ unidad, total }] → "12,5 kg · 3 unidad"
export const cantidades = (lista = []) =>
  lista.length ? lista.map((c) => `${cantidad(c.total)} ${c.unidad}`).join(' · ') : '0'

export const fecha = (d) => (d ? new Date(d).toLocaleDateString('es-VE') : '—')
export const fechaHora = (d) =>
  d ? new Date(d).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' }) : '—'

// Las descargas piden un Blob: si el backend responde con error, el mensaje viene dentro del Blob
export async function mensajeError(err, porDefecto) {
  if (err instanceof Blob) {
    try {
      return JSON.parse(await err.text()).message || porDefecto
    } catch {
      return porDefecto
    }
  }
  return err?.errors?.[0]?.mensaje || err?.message || porDefecto
}
