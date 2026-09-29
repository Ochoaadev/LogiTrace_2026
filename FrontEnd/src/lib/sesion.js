// Almacenamiento de la sesión. "Recordar sesión" la guarda en localStorage (sobrevive al cierre del
// navegador); sin marcarla se usa sessionStorage y la sesión termina al cerrar el navegador, lo
// recomendable en equipos compartidos de la planta.
const CLAVES = ['accessToken', 'refreshToken', 'user']

const leer = (almacen, clave) => {
  try {
    const v = almacen.getItem(clave)
    return v === 'undefined' ? null : v
  } catch {
    return null
  }
}

// Dónde está la sesión activa (si la hay)
const almacenActivo = () => (leer(sessionStorage, 'accessToken') ? sessionStorage : localStorage)

export const sesion = {
  get: (clave) => leer(sessionStorage, clave) ?? leer(localStorage, clave),

  guardar({ accessToken, refreshToken, user }, recordar = true) {
    sesion.limpiar()
    const almacen = recordar ? localStorage : sessionStorage
    try {
      almacen.setItem('accessToken', accessToken)
      almacen.setItem('refreshToken', refreshToken)
      almacen.setItem('user', JSON.stringify(user))
    } catch {
      // Almacenamiento bloqueado: la sesión dura mientras la pestaña siga abierta
    }
  },

  actualizarUsuario(user) {
    try {
      almacenActivo().setItem('user', JSON.stringify(user))
    } catch {
      // sin almacenamiento disponible
    }
  },

  limpiar() {
    for (const almacen of [localStorage, sessionStorage]) {
      for (const clave of [...CLAVES, 'token', 'usuario']) {
        try {
          almacen.removeItem(clave)
        } catch {
          // sin almacenamiento disponible
        }
      }
    }
  },
}
