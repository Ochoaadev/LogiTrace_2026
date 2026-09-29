import api from './api'

export const TrazabilidadService = {
  // Eventos sueltos con filtros
  search: (params) => api.get('/trazabilidad', { params }),

  // Expedientes (Fase 7): búsqueda por código de pedido, cliente, despacho, precinto, lote,
  // incidencia o devolución; y el expediente completo de un pedido
  buscarExpedientes: (params) => api.get('/trazabilidad/expedientes', { params }),
  getExpediente: (pedidoId) => api.get(`/trazabilidad/pedido/${pedidoId}/expediente`),

  getByPedido: (pedidoId, params) => api.get(`/trazabilidad/pedido/${pedidoId}`, { params }),
  getTimeline: (pedidoId) => api.get(`/trazabilidad/pedido/${pedidoId}/timeline`),
  getByDespacho: (despachoId, params) => api.get(`/trazabilidad/despacho/${despachoId}`, { params }),
  getEstadisticas: (params) => api.get('/trazabilidad/estadisticas', { params }),

  // Registro manual de temperatura (cava, despacho o devolución)
  registrarTemperatura: (data) => api.post('/trazabilidad/temperaturas', data),

  // Exportación (el interceptor devuelve response.data, que aquí es el Blob)
  exportCsv: (params) => api.get('/trazabilidad/export/csv', { params, responseType: 'blob' }),
  exportPdf: (pedidoId) => api.get(`/trazabilidad/pedido/${pedidoId}/export/pdf`, { responseType: 'blob' }),
}

// Descarga un Blob en el navegador con el nombre indicado
export function descargarArchivo(blob, nombre) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
