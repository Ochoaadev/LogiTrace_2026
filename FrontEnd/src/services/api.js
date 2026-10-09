import axios from 'axios'
import { sesion } from '@/lib/sesion'

// En HTTPS (modo móvil y producción) la API va por la misma dirección (/api): una página HTTPS no
// puede llamar a un backend HTTP directo (el navegador bloquea el contenido mixto)
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

/**
 * Renueva la sesión con la cookie httpOnly y guarda el nuevo token de acceso en memoria. Las llamadas
 * simultáneas comparten la misma petición: el token de renovación rota en cada uso, y dos renovaciones
 * en paralelo con la misma cookie invalidarían la sesión.
 */
let renovando = null
export function renovarSesion() {
  if (!renovando) {
    renovando = axios
      .post(`${API_URL}/auth/refresh`, {}, { withCredentials: true })
      .then(({ data }) => {
        sesion.fijarToken(data.data.accessToken)
        return data.data
      })
      .finally(() => { renovando = null })
  }
  return renovando
}

api.interceptors.request.use((config) => {
  const token = sesion.token()
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

const esAuth = (url = '') => /\/auth\/(login|refresh|logout)/.test(url)

api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const config = error.config
    // Token vencido: se renueva una vez con la cookie y se repite la petición. En login un 401 son
    // credenciales incorrectas y se deja que la página muestre el mensaje.
    if (error.response?.status === 401 && config && !esAuth(config.url) && !config._reintento) {
      try {
        await renovarSesion()
        config._reintento = true
        config.headers.Authorization = `Bearer ${sesion.token()}`
        return api(config)
      } catch {
        sesion.limpiar()
        if (window.location.pathname !== '/login') window.location.href = '/login'
      }
    }
    // Con respuesta del servidor se conserva el código HTTP (p. ej. para distinguir un rechazo de una
    // caída de red); sin respuesta se devuelve el error de red tal cual
    if (!error.response) return Promise.reject(error)
    const datos = error.response.data
    return Promise.reject({ ...(datos && typeof datos === 'object' ? datos : { message: String(datos || error.message) }), status: error.response.status })
  }
)

export default api
