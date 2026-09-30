import { useState, useEffect, useCallback } from 'react'
import { authService } from '../services/authService'
import { sesion } from '../lib/sesion'
import { AuthContext } from './authContexto'

// Sesión guardada en el navegador. Un usuario guardado corrupto se descarta (antes la app se
// quedaba cargando indefinidamente).
function leerSesionGuardada() {
  const token = sesion.get('accessToken')
  const guardado = sesion.get('user')
  if (!token || !guardado) return null
  try {
    return { token, user: JSON.parse(guardado) }
  } catch {
    sesion.limpiar()
    return null
  }
}

export function AuthProvider({ children }) {
  // La sesión guardada se lee al crear el estado (antes se cargaba dentro de un efecto con
  // setState síncrono, lo que provocaba un render extra en cascada)
  const [inicial] = useState(leerSesionGuardada)
  const [user, setUser] = useState(inicial?.user ?? null)
  const [accessToken, setAccessToken] = useState(inicial?.token ?? null)
  const [loading, setLoading] = useState(!!inicial)

  const clearSession = useCallback(() => {
    sesion.limpiar()
    setAccessToken(null)
    setUser(null)
  }, [])

  // Con sesión guardada se confirma contra el servidor. El interceptor devuelve el cuerpo
  // { success, message, data }; el usuario está en data (antes se guardaba el cuerpo entero y
  // tras recargar se perdía el rol y el menú quedaba vacío).
  useEffect(() => {
    if (!inicial) return undefined
    let vigente = true
    authService.getMe()
      .then(({ data: me }) => {
        if (!vigente) return
        setUser(me)
        sesion.actualizarUsuario(me)
      })
      .catch(() => { if (vigente) clearSession() })
      .finally(() => { if (vigente) setLoading(false) })
    return () => { vigente = false }
  }, [inicial, clearSession])

  // recordar: la sesión sobrevive al cierre del navegador (localStorage) o termina con él
  const login = async (email, password, recordar = true) => {
    const response = await authService.login(email, password)
    const { user: userData, accessToken, refreshToken } = response.data
    sesion.guardar({ accessToken, refreshToken, user: userData }, recordar)
    setAccessToken(accessToken)
    setUser(userData)
    return response
  }

  const register = async (data) => {
    const response = await authService.register(data)
    const { user: userData, accessToken, refreshToken } = response.data
    sesion.guardar({ accessToken, refreshToken, user: userData })
    setAccessToken(accessToken)
    setUser(userData)
    return response
  }

  const logout = async () => {
    try {
      await authService.logout()
    } catch {
      // ignore logout errors
    }
    clearSession()
  }

  const isAuthenticated = !!user

  const hasRole = (roles) => {
    if (!user) return false
    const userRoles = Array.isArray(roles) ? roles : [roles]
    return userRoles.includes(user.rol)
  }

  return (
    <AuthContext.Provider value={{
      user,
      accessToken,
      login,
      register,
      logout,
      isAuthenticated,
      hasRole,
      loading,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
