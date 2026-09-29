import api from './api'

export const residuoService = {
  getAll: (params) => api.get('/residuos', { params }),
  getById: (id) => api.get(`/residuos/${id}`),
  getResumen: (params) => api.get('/residuos/resumen', { params }),
  exportCsv: (params) => api.get('/residuos/export/csv', { params, responseType: 'blob' }),
  manifiestoPdf: (params) => api.get('/residuos/manifiesto/pdf', { params, responseType: 'blob' }),
  create: (data) => api.post('/residuos', data),
  update: (id, data) => api.put(`/residuos/${id}`, data),
  updateEstado: (id, { estado, observaciones, gestorId }) => api.patch(`/residuos/${id}/estado`, { estado, observaciones, gestorId }),
}
