import { distanciaMetros } from '@/lib/useSeguimientoGPS'

// Áreas sin radio: más allá de esta distancia a su centro no se sugieren
export const RADIO_SUGERENCIA_M = 6000

/**
 * Área (zona de despacho o tipo de sector) que corresponde a un punto del mapa.
 * - Con radio de cobertura: gana la más pequeña que contenga el punto. Así un área central
 *   (radio corto) se impone a la periferia que la rodea, y esta a la rural.
 * - Sin radio: la de centro más cercano, hasta RADIO_SUGERENCIA_M.
 * Solo cuentan las áreas con centro marcado. Devuelve { zona, metros } o null.
 * (La misma regla está en BackEnd/src/utils/areas.js.)
 */
export function areaSugerida(areas, punto) {
  if (!punto) return null
  let dentro = null
  let cercana = null
  for (const zona of areas) {
    if (zona.latitudCentro == null || zona.longitudCentro == null) continue
    const metros = distanciaMetros(punto, { lat: Number(zona.latitudCentro), lng: Number(zona.longitudCentro) })
    if (zona.radioMetros) {
      if (metros <= zona.radioMetros && (!dentro || zona.radioMetros < dentro.zona.radioMetros)) dentro = { zona, metros }
    } else if (metros <= RADIO_SUGERENCIA_M && (!cercana || metros < cercana.metros)) {
      cercana = { zona, metros }
    }
  }
  return dentro || cercana
}

export const textoDistancia = (m) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`)
