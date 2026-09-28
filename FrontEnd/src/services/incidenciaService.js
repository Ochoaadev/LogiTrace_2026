import api from './api'

export const incidenciaService = {
  getAll: (params) => api.get('/incidencias', { params }),
  getById: (id) => api.get(`/incidencias/${id}`),
  create: (data) => api.post('/incidencias', data),
  update: (id, data) => api.put(`/incidencias/${id}`, data),
  updateEstado: (id, estado) => api.patch(`/incidencias/${id}/estado`, { estado }),
  resolver: (id, resolucion) => api.patch(`/incidencias/${id}/resolver`, { resolucion }),
}