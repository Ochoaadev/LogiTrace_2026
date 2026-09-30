import api from './api'

export const pedidoService = {
  getAll: (params) => api.get('/pedidos', { params }),
  getById: (id) => api.get(`/pedidos/${id}`),
  getResumen: () => api.get('/pedidos/resumen'),
  create: (data) => api.post('/pedidos', data),
  update: (id, data) => api.put(`/pedidos/${id}`, data),
  updateEstado: (id, estado) => api.patch(`/pedidos/${id}/estado`, { estado }),
  // Pasos con lógica propia en el backend (verificación de stock, evento de trazabilidad)
  preparar: (id) => api.post(`/pedidos/${id}/preparar`),
  listoDespacho: (id, itemsPreparados) => api.post(`/pedidos/${id}/listo-despacho`, { itemsPreparados }),
  salidaPrevista: (id) => api.get(`/pedidos/${id}/salida-prevista`),
  getByCliente: (clienteId, params) => api.get('/pedidos', { params: { ...params, clienteId } }),
  getByZona: (zonaId, params) => api.get('/pedidos', { params: { ...params, zonaId } }),
  cancel: (id, motivo) => api.patch(`/pedidos/${id}/estado`, { estado: 'CANCELADO', observaciones: motivo }),
  assignDespacho: (id, despachoId) => api.post(`/despachos/${despachoId}/pedidos`, { pedidoId: id }),
}