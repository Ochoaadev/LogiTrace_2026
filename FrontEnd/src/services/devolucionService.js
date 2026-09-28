import api from './api'

export const devolucionService = {
  getAll: (params) => api.get('/devoluciones', { params }),
  getById: (id) => api.get(`/devoluciones/${id}`),
  create: (data) => api.post('/devoluciones', data),
  update: (id, data) => api.put(`/devoluciones/${id}`, data),
  updateEstado: (id, estado, observaciones) => api.patch(`/devoluciones/${id}/estado`, { estado, observaciones }),
  recepcion: (id, { temperatura, observaciones }) => api.patch(`/devoluciones/${id}/recepcion`, { temperatura, observaciones }),
  evaluar: (id, { selloIntegro, condicionEmpaque, observaciones, temperatura }) => api.post(`/devoluciones/${id}/evaluacion`, { selloIntegro, condicionEmpaque, observaciones, temperatura }),
  evaluarDetalle: (id, { detalleDevolucionId, estadoProducto, decision, loteId, ubicacionId }) => api.post(`/devoluciones/${id}/evaluar-detalle`, { detalleDevolucionId, estadoProducto, decision, loteId, ubicacionId }),
  updateEstado: (id, estado, observaciones) => api.patch(`/devoluciones/${id}/estado`, { estado, observaciones }),
}