import api from './api'

export const incidenciaService = {
  getAll: (params) => api.get('/incidencias', { params }),
  getById: (id) => api.get(`/incidencias/${id}`),
  getResumen: () => api.get('/incidencias/resumen'),
  exportCsv: (params) => api.get('/incidencias/export/csv', { params, responseType: 'blob' }),
  create: (data) => api.post('/incidencias', data),
  update: (id, data) => api.put(`/incidencias/${id}`, data),
  updateEstado: (id, estado, decisionOperativa) => api.patch(`/incidencias/${id}/estado`, { estado, ...(decisionOperativa && { decisionOperativa }) }),
  resolver: (id, resolucion) => api.patch(`/incidencias/${id}/estado`, { estado: 'RESUELTA', decisionOperativa: resolucion }),
}