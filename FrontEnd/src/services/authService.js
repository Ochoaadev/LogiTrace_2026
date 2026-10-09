import api from './api'

export const authService = {
  // recordar: la cookie de sesión sobrevive al cierre del navegador (7 días) o termina con él
  // sitio_web: campo trampa del formulario (vacío para las personas; un bot suele rellenarlo)
  login: (email, password, recordar, trampa = '') => api.post('/auth/login', { email, password, recordar: !!recordar, sitio_web: trampa }),

  logout: () => api.post('/auth/logout'),

  getMe: () => api.get('/auth/me'),

  changePassword: (data) => api.patch('/usuarios/me/password', data),
}
