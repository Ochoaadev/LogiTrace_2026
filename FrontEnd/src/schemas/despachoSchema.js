import { z } from 'zod'
import { CalendarClock, CircleCheck, MapPin, Package, TriangleAlert, XCircle } from 'lucide-react'

// Formulario "Nuevo despacho" (mismas reglas que createDespachoValidation en el backend)
export const despachoSchema = z.object({
  repartidorId: z.string().uuid('Seleccione un repartidor'),
  vehiculoId: z.string().uuid('Vehículo inválido').optional().or(z.literal('')),
  rutaId: z.string().uuid('Ruta inválida').optional().or(z.literal('')),
  medioConservacion: z.string().max(80, 'Máximo 80 caracteres').optional(),
  precintoSeguridad: z.string().max(50, 'Máximo 50 caracteres').optional(),
  observaciones: z.string().max(500).optional(),
  pedidoIds: z.array(z.string().uuid()).min(1, 'Seleccione al menos un pedido'),
})

// Estados del enum EstadoDespacho del backend (schema.prisma)
export const ESTADOS_DESPACHO = [
  { value: 'PROGRAMADO', label: 'Programado', color: 'default', icon: CalendarClock },
  { value: 'PREPARANDO', label: 'Preparando carga', color: 'info', icon: Package },
  { value: 'EN_RUTA', label: 'En ruta', color: 'primary', icon: MapPin },
  { value: 'CON_INCIDENCIA', label: 'Con incidencia', color: 'danger', icon: TriangleAlert },
  { value: 'FINALIZADO', label: 'Finalizado', color: 'success', icon: CircleCheck },
  { value: 'CANCELADO', label: 'Cancelado', color: 'default', icon: XCircle },
]

// Transiciones que acepta el backend (despacho.service.js → changeEstado). Mantener sincronizado.
export const TRANSICIONES_DESPACHO = {
  PROGRAMADO: ['PREPARANDO', 'CANCELADO'],
  PREPARANDO: ['EN_RUTA', 'CANCELADO'],
  EN_RUTA: ['CON_INCIDENCIA', 'FINALIZADO'],
  CON_INCIDENCIA: ['EN_RUTA', 'CANCELADO'],
  FINALIZADO: [],
  CANCELADO: [],
}

// Texto del botón para pasar a cada estado
// Texto del botón según el estado actual: volver a ruta desde una incidencia no es una nueva salida
export const accionDespacho = (destino, actual) =>
  destino === 'EN_RUTA' && actual === 'CON_INCIDENCIA' ? 'Reanudar ruta' : ACCION_DESPACHO[destino]

export const ACCION_DESPACHO = {
  PREPARANDO: 'Iniciar preparación',
  EN_RUTA: 'Registrar salida a ruta',
  CON_INCIDENCIA: 'Reportar incidencia en ruta',
  FINALIZADO: 'Finalizar despacho',
  CANCELADO: 'Cancelar despacho',
}

// Columnas del tablero de flujo operativo (los cancelados se consultan en la lista)
export const FLUJO_COLUMNAS = ESTADOS_DESPACHO.filter((e) => e.value !== 'CANCELADO')

export function getEstadoConfig(estado) {
  return ESTADOS_DESPACHO.find((e) => e.value === estado) || { color: 'default', label: estado, icon: Package }
}

export function getSiguientesEstados(estadoActual) {
  return TRANSICIONES_DESPACHO[estadoActual] || []
}
