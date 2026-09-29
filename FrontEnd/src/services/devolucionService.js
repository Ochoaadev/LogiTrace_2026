import api from './api'

export const devolucionService = {
  getAll: (params) => api.get('/devoluciones', { params }),
  getById: (id) => api.get(`/devoluciones/${id}`),
  getResumen: () => api.get('/devoluciones/resumen'),
  create: (data) => api.post('/devoluciones', data),
  update: (id, data) => api.put(`/devoluciones/${id}`, data),
  updateEstado: (id, estado, observaciones) => api.patch(`/devoluciones/${id}/estado`, { estado, observaciones }),
  recepcion: (id, { temperatura, observaciones }) => api.patch(`/devoluciones/${id}/recepcion`, { temperatura, observaciones }),
  evaluar: (id, { selloIntegro, condicionEmpaque, observaciones, temperatura }) => api.post(`/devoluciones/${id}/evaluacion`, { selloIntegro, condicionEmpaque, observaciones, temperatura }),
  // datos: detalleDevolucionId, estadoProducto, decision y, según la decisión, ubicacionId / tipoResiduoId
  evaluarDetalle: (id, datos) => api.post(`/devoluciones/${id}/evaluar-detalle`, datos),
}
