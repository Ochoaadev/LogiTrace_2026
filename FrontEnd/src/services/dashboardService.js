import api from './api'

export const dashboardService = {
  getKPIs: () => api.get('/reportes/kpis'),
  getPedidosPorEstado: () => api.get('/reportes/pedidos-por-estado'),
  getTimelinePedidos: (dias = 30) => api.get('/reportes/timeline', { params: { dias } }),
  getTopClientes: (limit = 5) => api.get('/reportes/top-clientes', { params: { limit } }),
  getActividadReciente: (limit = 10) => api.get('/reportes/actividad', { params: { limit } }),
  getAlertas: () => api.get('/reportes/alertas'),
}