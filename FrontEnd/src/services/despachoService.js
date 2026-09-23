import api from './api'

export const despachoService = {
  getAll: (params) => api.get('/despachos', { params }),
  getById: (id) => api.get(`/despachos/${id}`),
  create: (data) => api.post('/despachos', data),
  update: (id, data) => api.put(`/despachos/${id}`, data),
  updateEstado: (id, estado) => api.patch(`/despachos/${id}/estado`, { estado }),
  updateUbicacion: (id, ubicacion) => api.patch(`/despachos/${id}/ubicacion`, ubicacion),
}
