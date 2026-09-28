import { z } from 'zod'

export const despachoSchema = z.object({
  codigo: z.string().min(1, 'Código requerido'),
  repartidorId: z.string().uuid('Repartidor inválido').optional().nullable(),
  vehiculoId: z.string().uuid('Vehículo inválido').optional().nullable(),
  rutaId: z.string().uuid('Ruta inválida').optional().nullable(),
  fechaSalida: z.string().optional(),
  fechaLlegadaEstimada: z.string().optional(),
  observaciones: z.string().max(500).optional(),
  pedidoIds: z.array(z.string().uuid()).min(1, 'Debe asignar al menos un pedido'),
})

export const despachoEstadoSchema = z.object({
  estado: z.enum([
    'PREPARACION', 'LISTO_PARA_DESPACHO', 'EN_RUTA', 'ENTREGADO', 'CON_INCIDENCIA', 'DEVUELTO', 'CANCELADO'
  ]),
  observaciones: z.string().max(500).optional(),
})

export const ESTADOS_DESPACHO = [
  { value: 'PREPARACION', label: 'Preparación', color: 'info', icon: 'Package', order: 1 },
  { value: 'LISTO_PARA_DESPACHO', label: 'Listo para Despacho', color: 'primary', icon: 'Truck', order: 2 },
  { value: 'EN_RUTA', label: 'En Ruta', color: 'warning', icon: 'MapPin', order: 3 },
  { value: 'ENTREGADO', label: 'Entregado', color: 'success', icon: 'CheckCircle', order: 4 },
  { value: 'CON_INCIDENCIA', label: 'Con Incidencia', color: 'danger', icon: 'AlertCircle', order: 5 },
  { value: 'DEVUELTO', label: 'Devuelto', color: 'default', icon: 'RotateCcw', order: 6 },
  { value: 'CANCELADO', label: 'Cancelado', color: 'danger', icon: 'XCircle', order: 7 },
]

export const FLUJO_COLUMNAS = ESTADOS_DESPACHO.filter(e => 
  ['PREPARACION', 'LISTO_PARA_DESPACHO', 'EN_RUTA', 'ENTREGADO'].includes(e.value)
)

export function getEstadoConfig(estado) {
  return ESTADOS_DESPACHO.find(e => e.value === estado) || { color: 'default', label: estado, icon: 'Package' }
}

export function getSiguientesEstados(estadoActual) {
  const flujo = ['PREPARACION', 'LISTO_PARA_DESPACHO', 'EN_RUTA', 'ENTREGADO']
  const idx = flujo.indexOf(estadoActual)
  if (idx === -1 || idx === flujo.length - 1) return []
  return flujo.slice(idx + 1, idx + 2)
}