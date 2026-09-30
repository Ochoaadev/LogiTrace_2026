import { distanciaMetros } from '@/lib/useSeguimientoGPS'

// Más allá de esta distancia al centro más próximo no se sugiere zona (el punto queda fuera del área atendida)
export const RADIO_SUGERENCIA_M = 6000

/**
 * Zona cuyo centro está más cerca del punto de entrega. Solo cuentan las zonas con centro marcado
 * en el catálogo. Devuelve { zona, metros } o null.
 */
export function zonaMasCercana(zonas, punto) {
  if (!punto) return null
  let mejor = null
  for (const zona of zonas) {
    if (zona.latitudCentro == null || zona.longitudCentro == null) continue
    const metros = distanciaMetros(punto, { lat: Number(zona.latitudCentro), lng: Number(zona.longitudCentro) })
    if (!mejor || metros < mejor.metros) mejor = { zona, metros }
  }
  return mejor && mejor.metros <= RADIO_SUGERENCIA_M ? mejor : null
}

export const textoDistancia = (m) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`)
