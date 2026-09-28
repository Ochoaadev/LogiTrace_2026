import api from './api'

export const reporteService = {
  getPedidos: (params) => api.get('/reportes/pedidos', { params }),
  getDespachos: (params) => api.get('/reportes/despachos', { params }),
  getIncidencias: (params) => api.get('/reportes/incidencias', { params }),
  getDevoluciones: (params) => api.get('/reportes/devoluciones', { params }),
  getInventario: (params) => api.get('/reportes/inventario', { params }),
  getRendimiento: (params) => api.get('/reportes/rendimiento', { params }),

  // Dashboard methods
  getKPIs: () => api.get('/reportes/kpis'),
  getPedidosPorEstado: () => api.get('/reportes/pedidos-por-estado'),
  getTimelinePedidos: (dias = 30) => api.get('/reportes/timeline', { params: { dias } }),
  getTopClientes: (limit = 5) => api.get('/reportes/top-clientes', { params: { limit } }),
  getActividadReciente: (limit = 10) => api.get('/reportes/actividad', { params: { limit } }),
  getAlertas: () => api.get('/reportes/alertas'),
}