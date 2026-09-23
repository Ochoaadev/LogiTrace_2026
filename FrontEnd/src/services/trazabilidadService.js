import api from './api'

export const trazabilidadService = {
  getAll: (params) => api.get('/trazabilidad', { params }),
  getByPedido: (pedidoId) => api.get(`/trazabilidad/pedido/${pedidoId}`),
  getByDespacho: (despachoId) => api.get(`/trazabilidad/despacho/${despachoId}`),
}
