import { z } from 'zod'

export const incidenciaSchema = z.object({
  pedidoId: z.string().uuid('Pedido inválido'),
  tipoIncidenciaId: z.string().uuid('Tipo de incidencia requerido'),
  descripcion: z.string().min(10, 'Descripción mínima 10 caracteres').max(1000),
  latitud: z.number().optional(),
  longitud: z.number().optional(),
})

export const incidenciaEstadoSchema = z.object({
  estado: z.enum([
    'REPORTADA', 'EN_REVISION', 'EN_ATENCION', 'RESUELTA', 'CERRADA', 'CANCELADA'
  ]),
  resolucion: z.string().max(1000).optional(),
})

export const ESTADOS_INCIDENCIA = [
  { value: 'REPORTADA', label: 'Reportada', color: 'info', icon: 'AlertTriangle', order: 1 },
  { value: 'EN_REVISION', label: 'En Revisión', color: 'warning', icon: 'Search', order: 2 },
  { value: 'EN_ATENCION', label: 'En Atención', color: 'primary', icon: 'Wrench', order: 3 },
  { value: 'RESUELTA', label: 'Resuelta', color: 'success', icon: 'CheckCircle', order: 4 },
  { value: 'CERRADA', label: 'Cerrada', color: 'default', icon: 'Archive', order: 5 },
  { value: 'CANCELADA', label: 'Cancelada', color: 'danger', icon: 'XCircle', order: 6 },
]

export const TRANSICIONES_INCIDENCIA = {
  REPORTADA: ['EN_REVISION', 'CANCELADA'],
  EN_REVISION: ['EN_ATENCION', 'REPORTADA', 'CANCELADA'],
  EN_ATENCION: ['RESUELTA', 'EN_REVISION'],
  RESUELTA: ['CERRADA', 'EN_ATENCION'],
  CERRADA: [],
  CANCELADA: [],
}

export function getEstadoConfig(estado) {
  return ESTADOS_INCIDENCIA.find(e => e.value === estado) || { color: 'default', label: estado, icon: 'AlertTriangle' }
}

export function getSiguientesEstados(estadoActual) {
  return TRANSICIONES_INCIDENCIA[estadoActual] || []
}