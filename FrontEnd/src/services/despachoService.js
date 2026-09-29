import api from './api'

export const despachoService = {
  getAll: (params) => api.get('/despachos', { params }),
  getById: (id) => api.get(`/despachos/${id}`),
  getResumen: () => api.get('/despachos/resumen'),
  create: (data) => api.post('/despachos', data),
  update: (id, data) => api.put(`/despachos/${id}`, data),
  updateEstado: (id, estado, observaciones) => api.patch(`/despachos/${id}/estado`, { estado, observaciones }),
  updateUbicacion: (id, ubicacion) => api.patch(`/despachos/${id}/ubicacion`, ubicacion),
  // Vista del repartidor (Mi ruta)
  getMiRuta: () => api.get('/despachos/mi-ruta'),
  iniciarRecorrido: (id) => api.post(`/despachos/${id}/iniciar-recorrido`),
  registrarEntrega: (id, paradaId, datos) => api.post(`/despachos/${id}/paradas/${paradaId}/entrega`, datos),
  getFlujoOperativo: () => api.get('/despachos/flujo-operativo'),
  asignarRepartidor: (id, repartidorId) => api.put(`/despachos/${id}`, { repartidorId }),
}