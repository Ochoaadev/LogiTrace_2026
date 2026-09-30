import api from './api'

const base = '/catalogos'

export const productoService = {
  getAll: (params) => api.get(`${base}/productos`, { params }),
  getById: (id) => api.get(`${base}/productos/${id}`),
  create: (data) => api.post(`${base}/productos`, data),
  update: (id, data) => api.put(`${base}/productos/${id}`, data),
  delete: (id) => api.delete(`${base}/productos/${id}`),
}

export const clienteService = {
  getAll: (params) => api.get(`${base}/clientes`, { params }),
  getById: (id) => api.get(`${base}/clientes/${id}`),
  create: (data) => api.post(`${base}/clientes`, data),
  update: (id, data) => api.put(`${base}/clientes/${id}`, data),
  delete: (id) => api.delete(`${base}/clientes/${id}`),
}

export const zonaService = {
  getAll: (params) => api.get(`${base}/zonas`, { params }),
  getById: (id) => api.get(`${base}/zonas/${id}`),
  create: (data) => api.post(`${base}/zonas`, data),
  update: (id, data) => api.put(`${base}/zonas/${id}`, data),
  delete: (id) => api.delete(`${base}/zonas/${id}`),
}

export const tipoSectorService = {
  getAll: (params) => api.get(`${base}/tipos-sector`, { params }),
  getById: (id) => api.get(`${base}/tipos-sector/${id}`),
  create: (data) => api.post(`${base}/tipos-sector`, data),
  update: (id, data) => api.put(`${base}/tipos-sector/${id}`, data),
  delete: (id) => api.delete(`${base}/tipos-sector/${id}`),
}

export const vehiculoService = {
  getAll: (params) => api.get(`${base}/vehiculos`, { params }),
  getById: (id) => api.get(`${base}/vehiculos/${id}`),
  create: (data) => api.post(`${base}/vehiculos`, data),
  update: (id, data) => api.put(`${base}/vehiculos/${id}`, data),
  delete: (id) => api.delete(`${base}/vehiculos/${id}`),
}

export const tipoIncidenciaService = {
  getAll: (params) => api.get(`${base}/tipos-incidencia`, { params }),
  getById: (id) => api.get(`${base}/tipos-incidencia/${id}`),
  create: (data) => api.post(`${base}/tipos-incidencia`, data),
  update: (id, data) => api.put(`${base}/tipos-incidencia/${id}`, data),
  delete: (id) => api.delete(`${base}/tipos-incidencia/${id}`),
}

export const motivoDevolucionService = {
  getAll: (params) => api.get(`${base}/motivos-devolucion`, { params }),
  getById: (id) => api.get(`${base}/motivos-devolucion/${id}`),
  create: (data) => api.post(`${base}/motivos-devolucion`, data),
  update: (id, data) => api.put(`${base}/motivos-devolucion/${id}`, data),
  delete: (id) => api.delete(`${base}/motivos-devolucion/${id}`),
}

export const tipoResiduoService = {
  getAll: (params) => api.get(`${base}/tipos-residuo`, { params }),
  getById: (id) => api.get(`${base}/tipos-residuo/${id}`),
  create: (data) => api.post(`${base}/tipos-residuo`, data),
  update: (id, data) => api.put(`${base}/tipos-residuo/${id}`, data),
  delete: (id) => api.delete(`${base}/tipos-residuo/${id}`),
}

export const gestorResiduoService = {
  getAll: (params) => api.get(`${base}/gestores-residuo`, { params }),
  getById: (id) => api.get(`${base}/gestores-residuo/${id}`),
  create: (data) => api.post(`${base}/gestores-residuo`, data),
  update: (id, data) => api.put(`${base}/gestores-residuo/${id}`, data),
  delete: (id) => api.delete(`${base}/gestores-residuo/${id}`),
}

export const repartidorService = {
  getAll: (params) => api.get(`${base}/repartidores`, { params }),
  getById: (id) => api.get(`${base}/repartidores/${id}`),
  create: (data) => api.post(`${base}/repartidores`, data),
  update: (id, data) => api.put(`${base}/repartidores/${id}`, data),
  delete: (id) => api.delete(`${base}/repartidores/${id}`),
}

export const rutaService = {
  getAll: (params) => api.get(`${base}/rutas`, { params }),
  getById: (id) => api.get(`${base}/rutas/${id}`),
  create: (data) => api.post(`${base}/rutas`, data),
  update: (id, data) => api.put(`${base}/rutas/${id}`, data),
  delete: (id) => api.delete(`${base}/rutas/${id}`),
}

export const loteService = {
  getAll: (params) => api.get(`${base}/lotes`, { params }),
  getById: (id) => api.get(`${base}/lotes/${id}`),
  create: (data) => api.post(`${base}/lotes`, data),
  update: (id, data) => api.put(`${base}/lotes/${id}`, data),
  delete: (id) => api.delete(`${base}/lotes/${id}`),
}

export const ubicacionService = {
  getAll: (params) => api.get(`${base}/ubicaciones`, { params }),
  getById: (id) => api.get(`${base}/ubicaciones/${id}`),
  create: (data) => api.post(`${base}/ubicaciones`, data),
  update: (id, data) => api.put(`${base}/ubicaciones/${id}`, data),
  delete: (id) => api.delete(`${base}/ubicaciones/${id}`),
}

export const catalogoService = {
  getProductos: (params) => productoService.getAll(params),
  getClientes: (params) => clienteService.getAll(params),
  getZonas: (params) => zonaService.getAll(params),
  getTiposSector: (params) => tipoSectorService.getAll(params),
  getVehiculos: (params) => vehiculoService.getAll(params),
  getRepartidores: (params) => repartidorService.getAll(params),
  getRutas: (params) => rutaService.getAll(params),
  getLotes: (params) => loteService.getAll(params),
  getUbicaciones: (params) => ubicacionService.getAll(params),
  getTiposIncidencia: (params) => tipoIncidenciaService.getAll(params),
  getMotivosDevolucion: (params) => motivoDevolucionService.getAll(params),
  getTiposResiduo: (params) => tipoResiduoService.getAll(params),
  getGestoresResiduo: (params) => gestorResiduoService.getAll(params),
}