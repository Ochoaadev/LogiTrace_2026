// Misma regla que FrontEnd/src/lib/zonas.js: con radio gana el área más pequeña que contenga el
// punto; sin radio, la de centro más cercano hasta 6 km.
const RADIO_SUGERENCIA_M = 6000

function distanciaMetros(a, b) {
  const R = 6371000
  const rad = (g) => (g * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function areaSugerida(areas, punto) {
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

module.exports = { areaSugerida, distanciaMetros }
