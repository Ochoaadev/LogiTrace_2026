import { useCallback, useEffect, useRef, useState } from 'react'

const INTERVALO_MS = 30_000 // envío como máximo cada 30 s…
const DISTANCIA_M = 50 // …o antes, si el vehículo avanzó más de 50 m

// Distancia en metros entre dos coordenadas (fórmula del haversine)
export function distanciaMetros(a, b) {
  const R = 6371000
  const rad = (g) => (g * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Posición actual una sola vez (para registrar una entrega o una incidencia). */
export function posicionActual() {
  return new Promise((resolve) => {
    if (!navigator.geolocation || !window.isSecureContext) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitud: p.coords.latitude, longitud: p.coords.longitude, precisionMetros: Math.round(p.coords.accuracy) }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 }
    )
  })
}

/**
 * Seguimiento GPS del repartidor mientras `activo`. Envía la posición con `enviar(punto)` y
 * mantiene la pantalla encendida (en los teléfonos el GPS del navegador se detiene con la
 * pantalla apagada). Estados: inactivo · solicitando · activo · denegado · sin_gps · inseguro · error.
 */
// Limitaciones del navegador que no cambian durante la sesión
const soporteGPS = () => (!window.isSecureContext ? 'inseguro' : !navigator.geolocation ? 'sin_gps' : null)

export function useSeguimientoGPS(activo, enviar) {
  const [errorGps, setErrorGps] = useState(null)
  const [posicion, setPosicion] = useState(null)
  const [ultimoEnvio, setUltimoEnvio] = useState(null)
  const [enviados, setEnviados] = useState(0)
  const [falloEnvio, setFalloEnvio] = useState(false)
  const ultimoEnviado = useRef(null)
  const enviando = useRef(false)
  // Última versión de la función de envío sin reiniciar el seguimiento en cada render
  const enviarRef = useRef(enviar)
  useEffect(() => {
    enviarRef.current = enviar
  }, [enviar])

  const procesar = useCallback(async (p) => {
    const punto = { lat: p.coords.latitude, lng: p.coords.longitude, precision: Math.round(p.coords.accuracy), velocidad: p.coords.speed }
    setPosicion({ ...punto, fechaHora: new Date(p.timestamp) })
    setErrorGps(null)
    const previo = ultimoEnviado.current
    const toca = !previo || Date.now() - previo.t >= INTERVALO_MS || distanciaMetros(previo, punto) >= DISTANCIA_M
    if (!toca || enviando.current) return
    enviando.current = true
    try {
      await enviarRef.current({
        latitud: punto.lat,
        longitud: punto.lng,
        precisionMetros: punto.precision,
        ...(punto.velocidad != null && punto.velocidad >= 0 && { velocidadKmh: Math.round(punto.velocidad * 3.6 * 10) / 10 }),
      })
      ultimoEnviado.current = { ...punto, t: Date.now() }
      setUltimoEnvio(new Date())
      setEnviados((n) => n + 1)
      setFalloEnvio(false)
    } catch {
      // Sin señal o servidor caído: se reintenta con la próxima posición
      setFalloEnvio(true)
    } finally {
      enviando.current = false
    }
  }, [])

  useEffect(() => {
    if (!activo || soporteGPS()) return undefined
    const id = navigator.geolocation.watchPosition(
      procesar,
      (err) => setErrorGps(err.code === err.PERMISSION_DENIED ? 'denegado' : 'error'),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 30_000 }
    )

    // Pantalla encendida mientras se comparte la ubicación (si el navegador lo permite)
    let bloqueo = null
    const pedirBloqueo = async () => {
      try {
        if (document.visibilityState === 'visible' && 'wakeLock' in navigator) bloqueo = await navigator.wakeLock.request('screen')
      } catch {
        // no soportado o denegado: el seguimiento sigue mientras la pantalla esté encendida
      }
    }
    pedirBloqueo()
    document.addEventListener('visibilitychange', pedirBloqueo)

    return () => {
      navigator.geolocation.clearWatch(id)
      document.removeEventListener('visibilitychange', pedirBloqueo)
      bloqueo?.release?.().catch(() => {})
      setErrorGps(null)
    }
  }, [activo, procesar])

  // Estado derivado: inactivo · inseguro/sin_gps · denegado/error · activo (con posición) · solicitando
  const estado = !activo ? 'inactivo' : soporteGPS() || errorGps || (posicion ? 'activo' : 'solicitando')
  return { estado, posicion, ultimoEnvio, enviados, falloEnvio }
}
