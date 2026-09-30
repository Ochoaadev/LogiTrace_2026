import { useCallback, useEffect, useRef, useState } from 'react'

// Tema claro / oscuro. Si el usuario no eligió, sigue la preferencia del sistema operativo.
// El script de index.html aplica el tema antes de pintar para evitar el destello claro.
const CLAVE = 'logitrace-tema'

const guardado = () => {
  try {
    const v = localStorage.getItem(CLAVE)
    return v === 'oscuro' || v === 'claro' ? v : null
  } catch {
    return null
  }
}
const delSistema = () => (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro')
const fijar = (tema) => {
  document.documentElement.dataset.theme = tema === 'oscuro' ? 'dark' : 'light'
}

/**
 * Cambia el tema con la API View Transitions: un fundido corto de toda la pantalla (ver index.css).
 * Antes se animaba el color de cada elemento por separado: fondos, bordes y textos cambiaban a
 * destiempo y el mapa saltaba de golpe. Sin soporte (p. ej. Firefox) o con "reducir movimiento",
 * el cambio es inmediato.
 */
function aplicar(tema) {
  const reducir = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (!document.startViewTransition || reducir) {
    fijar(tema)
    return
  }
  document.startViewTransition(() => fijar(tema)).ready.catch(() => {
    // la transición se omitió (p. ej. pestaña oculta): el tema ya quedó aplicado
  })
}

export function useTema() {
  const [tema, setTema] = useState(() => guardado() || delSistema())
  const temaRef = useRef(tema)
  useEffect(() => {
    temaRef.current = tema
  }, [tema])

  // Sin elección propia, acompaña los cambios del sistema (p. ej. modo nocturno automático)
  useEffect(() => {
    const medio = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!medio) return undefined
    const alCambiar = () => {
      if (guardado()) return
      const nuevo = medio.matches ? 'oscuro' : 'claro'
      aplicar(nuevo)
      setTema(nuevo)
    }
    medio.addEventListener('change', alCambiar)
    return () => medio.removeEventListener('change', alCambiar)
  }, [])

  // Los efectos van fuera del actualizador de estado (React lo ejecuta dos veces en desarrollo
  // y la transición se disparaba dos veces seguidas).
  const alternar = useCallback(() => {
    const nuevo = temaRef.current === 'oscuro' ? 'claro' : 'oscuro'
    try {
      localStorage.setItem(CLAVE, nuevo)
    } catch {
      // sin almacenamiento: el cambio dura hasta recargar
    }
    temaRef.current = nuevo
    aplicar(nuevo)
    setTema(nuevo)
  }, [])

  return { tema, oscuro: tema === 'oscuro', alternar }
}
