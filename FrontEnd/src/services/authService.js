import api from './api'

export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),

  register: (data) => api.post('/auth/register', data),

  logout: () => api.post('/auth/logout'),

  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),

  getMe: () => api.get('/auth/me'),

  changePassword: (data) => api.patch('/usuarios/me/password', data),
}