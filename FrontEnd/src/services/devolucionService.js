import api from './api'

export const devolucionService = {
  getAll: (params) => api.get('/devoluciones', { params }),
  getById: (id) => api.get(`/devoluciones/${id}`),
  create: (data) => api.post('/devoluciones', data),
  update: (id, data) => api.put(`/devoluciones/${id}`, data),
  evaluar: (id, data) => api.post(`/devoluciones/${id}/evaluacion`, data),
}
