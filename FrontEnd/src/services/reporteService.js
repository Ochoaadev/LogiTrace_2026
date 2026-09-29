import api from './api'

export const reporteService = {
  // Reporte operativo del módulo 09 (indicadores, sectores, causas, devoluciones, residuos)
  getOperativo: (params) => api.get('/reportes/operativo', { params }),
  exportCsv: (params) => api.get('/reportes/operativo/export/csv', { params, responseType: 'blob' }),
  exportPdf: (params) => api.get('/reportes/operativo/export/pdf', { params, responseType: 'blob' }),

  // Dashboard
  getKPIs: () => api.get('/reportes/kpis'),
  getPedidosPorEstado: () => api.get('/reportes/pedidos-por-estado'),
  getTimelinePedidos: (dias = 30) => api.get('/reportes/timeline', { params: { dias } }),
  getTopClientes: (limit = 5) => api.get('/reportes/top-clientes', { params: { limit } }),
  getActividadReciente: (limit = 10) => api.get('/reportes/actividad', { params: { limit } }),
  getAlertas: () => api.get('/reportes/alertas'),
}
