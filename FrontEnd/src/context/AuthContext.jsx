import { createContext, useState, useEffect, useCallback } from 'react'
import { authService } from '../services/authService'
import { sesion } from '../lib/sesion'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [accessToken, setAccessToken] = useState(null)

  const clearSession = useCallback(() => {
    sesion.limpiar()
    setAccessToken(null)
    setUser(null)
  }, [])

  const loadSession = useCallback(async () => {
    const token = sesion.get('accessToken')
    const savedUser = sesion.get('user')

    if (token && savedUser) {
      setAccessToken(token)
      try {
        setUser(JSON.parse(savedUser))
      } catch {
        // Usuario guardado corrupto: limpiar y terminar la carga (antes se quedaba en loading)
        clearSession()
        setLoading(false)
        return
      }
      try {
        // El interceptor devuelve el cuerpo { success, message, data }; el usuario está en data.
        // Antes se guardaba el cuerpo entero: tras recargar se perdía el rol y el menú quedaba vacío.
        const { data: me } = await authService.getMe()
        setUser(me)
        sesion.actualizarUsuario(me)
      } catch {
        clearSession()
      }
    }
    setLoading(false)
  }, [clearSession])

  useEffect(() => {
    loadSession()
  }, [loadSession])

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
      refreshSession: loadSession,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
