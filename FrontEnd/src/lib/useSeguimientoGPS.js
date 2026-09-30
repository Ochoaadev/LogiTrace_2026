import { useCallback, useEffect, useRef, useState } from 'react'

const INTERVALO_MS = 30_000 // envío como máximo cada 30 s…
const DISTANCIA_M = 50 // …o antes, si el vehículo avanzó más de 50 m
// Puntos tomados sin señal: se guardan en el teléfono y se envían al recuperar la conexión
const CLAVE_COLA = 'logitrace-gps-pendientes'
const MAX_COLA = 2000 // ~16 h de recorrido a un punto cada 30 s

function leerCola() {
  try {
    const cola = JSON.parse(localStorage.getItem(CLAVE_COLA) || '[]')
    return Array.isArray(cola) ? cola : []
  } catch {
    return []
  }
}
function guardarCola(cola) {
  try {
    if (cola.length) localStorage.setItem(CLAVE_COLA, JSON.stringify(cola))
    else localStorage.removeItem(CLAVE_COLA)
  } catch {
    // almacenamiento lleno o bloqueado: la cola sigue en memoria mientras la página esté abierta
  }
}
// El servidor rechazó el punto (dato inválido o fuera del recorrido): reintentarlo no sirve.
// Sin respuesta (red), 408, 429 o 5xx sí se reintenta.
const rechazoDefinitivo = (err) => err?.status >= 400 && err.status < 500 && ![401, 408, 429].includes(err.status)

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
 * Seguimiento GPS del repartidor mientras `activo`. Cada punto se guarda primero en una cola del
 * teléfono (con su despacho y hora de captura) y se envía con `enviar(punto)`; si no hay señal,
 * queda guardado y se envía al volver la conexión, en orden. Antes esos tramos se perdían.
 * Mantiene la pantalla encendida (en los teléfonos el GPS del navegador se detiene con la
 * pantalla apagada). Estados: inactivo · solicitando · activo · denegado · sin_gps · inseguro · error.
 */
// Limitaciones del navegador que no cambian durante la sesión
const soporteGPS = () => (!window.isSecureContext ? 'inseguro' : !navigator.geolocation ? 'sin_gps' : null)

export function useSeguimientoGPS(activo, enviar, despachoId) {
  const [errorGps, setErrorGps] = useState(null)
  const [posicion, setPosicion] = useState(null)
  const [ultimoEnvio, setUltimoEnvio] = useState(null)
  const [enviados, setEnviados] = useState(0)
  const [falloEnvio, setFalloEnvio] = useState(false)
  const [pendientes, setPendientes] = useState(() => leerCola().length)
  const ultimoEnviado = useRef(null) // último punto registrado (enviado o en cola)
  const enviando = useRef(false)
  // Última versión de la función de envío sin reiniciar el seguimiento en cada render
  const enviarRef = useRef(enviar)
  const despachoRef = useRef(despachoId)
  useEffect(() => {
    enviarRef.current = enviar
    despachoRef.current = despachoId
  }, [enviar, despachoId])

  // Envía la cola en orden; se detiene en el primer fallo de red y lo reintenta más tarde
  const vaciar = useCallback(async () => {
    if (enviando.current) return
    enviando.current = true
    try {
      let cola = leerCola()
      while (cola.length) {
        try {
          await enviarRef.current(cola[0])
          setUltimoEnvio(new Date())
          setEnviados((n) => n + 1)
          setFalloEnvio(false)
        } catch (err) {
          if (!rechazoDefinitivo(err)) {
            setFalloEnvio(true)
            break
          }
        }
        cola = leerCola().slice(1) // releída: pudo crecer mientras se enviaba
        guardarCola(cola)
        setPendientes(cola.length)
      }
    } finally {
      enviando.current = false
    }
  }, [])

  const procesar = useCallback((p) => {
    const punto = { lat: p.coords.latitude, lng: p.coords.longitude, precision: Math.round(p.coords.accuracy), velocidad: p.coords.speed }
    setPosicion({ ...punto, fechaHora: new Date(p.timestamp) })
    setErrorGps(null)
    const previo = ultimoEnviado.current
    const toca = !previo || Date.now() - previo.t >= INTERVALO_MS || distanciaMetros(previo, punto) >= DISTANCIA_M
    if (!toca || !despachoRef.current) return
    ultimoEnviado.current = { ...punto, t: Date.now() }
    const cola = [...leerCola(), {
      despachoId: despachoRef.current,
      latitud: punto.lat,
      longitud: punto.lng,
      precisionMetros: punto.precision,
      ...(punto.velocidad != null && punto.velocidad >= 0 && { velocidadKmh: Math.round(punto.velocidad * 3.6 * 10) / 10 }),
      fechaHora: new Date(p.timestamp).toISOString(),
    }].slice(-MAX_COLA)
    guardarCola(cola)
    setPendientes(cola.length)
    vaciar()
  }, [vaciar])

  // Al abrir la pantalla o volver la conexión se envía lo que haya quedado guardado,
  // aunque el recorrido ya no esté activo (p. ej. el despacho se cerró antes de recuperar la señal)
  useEffect(() => {
    vaciar()
    window.addEventListener('online', vaciar)
    const reintento = setInterval(() => { if (leerCola().length) vaciar() }, INTERVALO_MS)
    return () => {
      window.removeEventListener('online', vaciar)
      clearInterval(reintento)
    }
  }, [vaciar])

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
  return { estado, posicion, ultimoEnvio, enviados, falloEnvio, pendientes }
}
