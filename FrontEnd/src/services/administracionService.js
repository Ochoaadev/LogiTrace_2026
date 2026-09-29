import api from './api'

export const usuarioService = {
  getAll: (params) => api.get('/usuarios', { params }),
  create: (data) => api.post('/usuarios', data),
  update: (id, data) => api.put(`/usuarios/${id}`, data),
  cambiarEstado: (id, activo) => api.patch(`/usuarios/${id}/estado`, { activo }),
  cambiarRol: (id, rol) => api.patch(`/usuarios/${id}/rol`, { rol }),
  restablecerPassword: (id, passwordNueva) => api.patch(`/usuarios/${id}/restablecer-password`, { passwordNueva }),
}

export const administracionService = {
  getResumen: () => api.get('/administracion/resumen'),
  getParametros: () => api.get('/administracion/parametros'),
  getAuditoria: (params) => api.get('/auditoria', { params }),
}

// Catálogos del negocio editables desde Administración (mismos endpoints que Catálogos)
export const CATALOGOS_NEGOCIO = [
  { clave: 'tiposIncidencia', codigo: 'CAT-01', nombre: 'Causas de incidencias en ruta', ruta: 'tipos-incidencia', extra: { campo: 'descripcion', etiqueta: 'Descripción / criterio operativo' } },
  { clave: 'motivosDevolucion', codigo: 'CAT-02', nombre: 'Causas de retorno / devolución', ruta: 'motivos-devolucion', extra: { campo: 'descripcion', etiqueta: 'Descripción' } },
  { clave: 'tiposResiduo', codigo: 'CAT-03', nombre: 'Tipos de residuos ambientales', ruta: 'tipos-residuo', extra: { campo: 'unidadBase', etiqueta: 'Unidad base (kg, litros, unidad)', requerido: true } },
  { clave: 'zonas', codigo: 'CAT-04', nombre: 'Zonas de despacho Valera-Carvajal', ruta: 'zonas', extra: { campo: 'municipio', etiqueta: 'Municipio' } },
]

export const catalogoNegocioService = {
  getAll: (ruta) => api.get(`/catalogos/${ruta}`, { params: { limit: 100 } }),
  create: (ruta, data) => api.post(`/catalogos/${ruta}`, data),
  update: (ruta, id, data) => api.put(`/catalogos/${ruta}/${id}`, data),
}
