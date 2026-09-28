import api from './api'

export const devolucionService = {
  getAll: (params) => api.get('/devoluciones', { params }),
  getById: (id) => api.get(`/devoluciones/${id}`),
  create: (data) => api.post('/devoluciones', data),
  update: (id, data) => api.put(`/devoluciones/${id}`, data),
  updateEstado: (id, estado) => api.patch(`/devoluciones/${id}/estado`, { estado }),
  procesar: (id, accion, observaciones) => api.patch(`/devoluciones/${id}/procesar`, { accion, observaciones }),
}