import { useState, useEffect, useCallback } from 'react'
import { authService } from '../services/authService'
import { renovarSesion } from '../services/api'
import { sesion } from '../lib/sesion'
import { AuthContext } from './authContexto'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // Al abrir la aplicación se intenta recuperar la sesión con la cookie httpOnly (el token de acceso
  // no se guarda en el navegador): mientras tanto, las rutas protegidas esperan
  const [loading, setLoading] = useState(true)

  const clearSession = useCallback(() => {
    sesion.limpiar()
    setUser(null)
  }, [])

  useEffect(() => {
    let vigente = true
    renovarSesion()
      .then((datos) => { if (vigente) setUser(datos.user) })
      .catch(() => { if (vigente) clearSession() })
      .finally(() => { if (vigente) setLoading(false) })
    return () => { vigente = false }
  }, [clearSession])

  const login = async (email, password, recordar = false, trampa = '') => {
    const response = await authService.login(email, password, recordar, trampa)
    sesion.fijarToken(response.data.accessToken)
    setUser(response.data.user)
    return response
  }

  const logout = async () => {
    try {
      await authService.logout()
    } catch {
      // la sesión local se cierra igual
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
      login,
      logout,
      isAuthenticated,
      hasRole,
      loading,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
