import axios from 'axios'
import { sesion } from '@/lib/sesion'

// En HTTPS (modo móvil) la API va por el proxy de Vite (/api): una página HTTPS no puede llamar
// a un backend HTTP directo (el navegador bloquea el contenido mixto)
const API_URL = window.location.protocol === 'https:'
  ? '/api'
  : import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const token = sesion.get('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  // Los filtros sin valor ("", null, undefined) no se envían: el backend valida con
  // optional(), que acepta un parámetro ausente pero rechaza "estado=" con 400.
  if (config.params) {
    config.params = Object.fromEntries(
      Object.entries(config.params).filter(([, v]) => v !== '' && v !== null && v !== undefined)
    )
  }
  return config
})

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // En /auth/login un 401 significa credenciales incorrectas: se deja que la página muestre
    // el mensaje en lugar de recargar /login y perderlo.
    const isLoginRequest = error.config?.url?.includes('/auth/login')
    if (error.response?.status === 401 && !isLoginRequest) {
      sesion.limpiar()
      window.location.href = '/login'
    }
    return Promise.reject(error.response?.data || error)
  }
)

export default api
