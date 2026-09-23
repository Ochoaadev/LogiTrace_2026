import api from './api'

export const reporteService = {
  getPedidos: (params) => api.get('/reportes/pedidos', { params }),
  getDespachos: (params) => api.get('/reportes/despachos', { params }),
  getIncidencias: (params) => api.get('/reportes/incidencias', { params }),
  getDevoluciones: (params) => api.get('/reportes/devoluciones', { params }),
  getInventario: (params) => api.get('/reportes/inventario', { params }),
  getRendimiento: (params) => api.get('/reportes/rendimiento', { params }),
}
