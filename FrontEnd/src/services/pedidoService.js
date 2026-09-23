import api from './api'

export const pedidoService = {
  getAll: (params) => api.get('/pedidos', { params }),
  getById: (id) => api.get(`/pedidos/${id}`),
  create: (data) => api.post('/pedidos', data),
  update: (id, data) => api.put(`/pedidos/${id}`, data),
  updateEstado: (id, estado) => api.patch(`/pedidos/${id}/estado`, { estado }),
}
