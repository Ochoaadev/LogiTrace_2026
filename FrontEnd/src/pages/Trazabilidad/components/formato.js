// Formato de fechas en hora de Venezuela, independiente de la zona del navegador
const TZ = 'America/Caracas'

export const hora = (d) =>
  d ? new Date(d).toLocaleTimeString('es-VE', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }) : '—'

export const fecha = (d) =>
  d ? new Date(d).toLocaleDateString('es-VE', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

export const fechaHora = (d) => (d ? `${fecha(d)} ${hora(d)}` : '—')

export const temp = (t) => (t === null || t === undefined ? '—' : `${t.toFixed(1)} °C`)

export const ESTADO_PEDIDO_LABEL = {
  REGISTRADO: 'Registrado',
  EN_PREPARACION: 'En preparación',
  LISTO_PARA_DESPACHO: 'Listo para despacho',
  EN_RUTA: 'En ruta',
  ENTREGADO: 'Entregado',
  CON_INCIDENCIA: 'Con incidencia',
  DEVUELTO: 'En logística inversa',
  CERRADO: 'Cerrado',
  CANCELADO: 'Cancelado',
}

export const ESTADO_PEDIDO_VARIANT = {
  REGISTRADO: 'default',
  EN_PREPARACION: 'info',
  LISTO_PARA_DESPACHO: 'info',
  EN_RUTA: 'info',
  ENTREGADO: 'success',
  CON_INCIDENCIA: 'danger',
  DEVUELTO: 'warning',
  CERRADO: 'default',
  CANCELADO: 'danger',
}

export const RESULTADOS = [
  { value: 'TODOS', label: 'Todos los resultados' },
  { value: 'EN_CURSO', label: 'En curso' },
  { value: 'ENTREGADO', label: 'Entregado' },
  { value: 'CON_INCIDENCIA', label: 'Con incidencia' },
  { value: 'DEVOLUCION', label: 'Con devolución / retorno' },
  { value: 'CANCELADO', label: 'Cancelado' },
]
