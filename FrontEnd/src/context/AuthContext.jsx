import { createContext, useState, useEffect, useCallback } from 'react'
import { authService } from '../services/authService'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [accessToken, setAccessToken] = useState(null)

  const clearSession = useCallback(() => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    setAccessToken(null)
    setUser(null)
  }, [])

  const loadSession = useCallback(async () => {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    if (localStorage.getItem('accessToken') === 'undefined') localStorage.removeItem('accessToken')
    if (localStorage.getItem('refreshToken') === 'undefined') localStorage.removeItem('refreshToken')
    if (localStorage.getItem('user') === 'undefined') localStorage.removeItem('user')

    const token = localStorage.getItem('accessToken')
    const savedUser = localStorage.getItem('user')
    const savedRefreshToken = localStorage.getItem('refreshToken')

    if (token && savedUser && savedUser !== 'undefined') {
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
        localStorage.setItem('user', JSON.stringify(me))
      } catch {
        clearSession()
      }
    }
    setLoading(false)
  }, [clearSession])

  useEffect(() => {
    loadSession()
  }, [loadSession])

  const login = async (email, password) => {
    const response = await authService.login(email, password)
    const { user: userData, accessToken, refreshToken } = response.data
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    localStorage.setItem('user', JSON.stringify(userData))
    setAccessToken(accessToken)
    setUser(userData)
    return response
  }

  const register = async (data) => {
    const response = await authService.register(data)
    const { user: userData, accessToken, refreshToken } = response.data
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    localStorage.setItem('user', JSON.stringify(userData))
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