import api from './api'

export const inventarioService = {
  getAll: (params) => api.get('/inventario', { params }),
  getById: (id) => api.get(`/inventario/${id}`),
  create: (data) => api.post('/inventario', data),
  update: (id, data) => api.put(`/inventario/${id}`, data),
  registrarMovimiento: (data) => api.post('/inventario/movimiento', data),
}
