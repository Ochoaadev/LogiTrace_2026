import api from './api'

export const residuoService = {
  getAll: (params) => api.get('/residuos', { params }),
  create: (data) => api.post('/residuos', data),
  update: (id, data) => api.put(`/residuos/${id}`, data),
}
