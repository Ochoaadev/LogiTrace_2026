import api from './api'

export const inventarioService = {
  getAll: (params) => api.get('/inventario', { params }),
  getById: (id) => api.get(`/inventario/${id}`),
  getLoteDetalle: (id) => api.get(`/inventario/lote/${id}`),
  getMovimientos: (params) => api.get('/inventario/movimientos', { params }),
  ajustarStock: (loteId, ubicacionId, cantidadNueva, observaciones) =>
    api.patch(`/inventario/lote/${id}/ajustar`, { ubicacionId, cantidadNueva, observaciones }),
  crearMovimiento: (data) => api.post('/inventario/movimientos', data),
}