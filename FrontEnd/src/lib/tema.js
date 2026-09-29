import { useCallback, useEffect, useState } from 'react'

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

function aplicar(tema, animar) {
  const html = document.documentElement
  if (animar) {
    html.classList.add('tema-transicion')
    window.setTimeout(() => html.classList.remove('tema-transicion'), 350)
  }
  html.dataset.theme = tema === 'oscuro' ? 'dark' : 'light'
}

export function useTema() {
  const [tema, setTema] = useState(() => guardado() || delSistema())

  // Sin elección propia, acompaña los cambios del sistema (p. ej. modo nocturno automático)
  useEffect(() => {
    const medio = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!medio) return undefined
    const alCambiar = () => {
      if (guardado()) return
      const nuevo = medio.matches ? 'oscuro' : 'claro'
      aplicar(nuevo, true)
      setTema(nuevo)
    }
    medio.addEventListener('change', alCambiar)
    return () => medio.removeEventListener('change', alCambiar)
  }, [])

  const alternar = useCallback(() => {
    setTema((actual) => {
      const nuevo = actual === 'oscuro' ? 'claro' : 'oscuro'
      try {
        localStorage.setItem(CLAVE, nuevo)
      } catch {
        // sin almacenamiento: el cambio dura hasta recargar
      }
      aplicar(nuevo, true)
      return nuevo
    })
  }, [])

  return { tema, oscuro: tema === 'oscuro', alternar }
}
