import { z } from 'zod'
import { CheckCircle, ClipboardCheck, PackageCheck, RotateCcw, Truck, XCircle } from 'lucide-react'

export const devolucionSchema = z.object({
  despachoPedidoId: z.string().uuid('Despacho-pedido requerido'),
  incidenciaId: z.string().uuid().optional().nullable(),
  motivoId: z.string().uuid('Motivo requerido'),
  observaciones: z.string().max(1000).optional(),
  detalles: z.array(z.object({
    detallePedidoId: z.string().uuid(),
    loteId: z.string().uuid(),
    cantidad: z.number().int().min(1, 'Mínimo 1'),
    unidad: z.string().min(1),
    estadoProducto: z.enum(['APTO_PARA_VENTA', 'DETERIORADO', 'NO_APTO_PARA_VENTA']),
    decision: z.enum(['REINGRESO', 'CUARENTENA', 'DESCARTE']).optional(),
  })).min(1, 'Debe agregar al menos un detalle'),
})

export const devolucionEstadoSchema = z.object({
  estado: z.enum([
    'SOLICITADA', 'EN_TRASLADO', 'RECIBIDA', 'EVALUADA', 'CERRADA', 'CANCELADA'
  ]),
  observaciones: z.string().max(1000).optional(),
})

export const ESTADOS_DEVOLUCION = [
  { value: 'SOLICITADA', label: 'Solicitada', color: 'info', icon: RotateCcw, order: 1 },
  { value: 'EN_TRASLADO', label: 'En Traslado', color: 'warning', icon: Truck, order: 2 },
  { value: 'RECIBIDA', label: 'Recibida', color: 'primary', icon: PackageCheck, order: 3 },
  { value: 'EVALUADA', label: 'Evaluada', color: 'primary', icon: ClipboardCheck, order: 4 },
  { value: 'CERRADA', label: 'Cerrada', color: 'success', icon: CheckCircle, order: 5 },
  { value: 'CANCELADA', label: 'Cancelada', color: 'danger', icon: XCircle, order: 6 },
]

// Transiciones que acepta el backend (devolucion.service.js → changeEstado). RECIBIDA y EVALUADA
// se alcanzan con sus endpoints propios (recepción y evaluación); CERRADA, al decidir todos los
// productos.
export const TRANSICIONES_DEVOLUCION = {
  SOLICITADA: ['EN_TRASLADO', 'CANCELADA'],
  EN_TRASLADO: ['RECIBIDA', 'CANCELADA'],
  RECIBIDA: ['EVALUADA', 'CANCELADA'],
  EVALUADA: ['CERRADA', 'CANCELADA'],
  CERRADA: [],
  CANCELADA: [],
}

export const ESTADOS_PRODUCTO = [
  { value: 'APTO_PARA_VENTA', label: 'Apto para Venta', color: 'success' },
  { value: 'DETERIORADO', label: 'Deteriorado', color: 'warning' },
  { value: 'NO_APTO_PARA_VENTA', label: 'No Apto para Venta', color: 'danger' },
]

export const DECISIONES_DEVOLUCION = [
  { value: 'REINGRESO', label: 'Reingreso a Inventario', color: 'success' },
  { value: 'CUARENTENA', label: 'Cuarentena', color: 'warning' },
  { value: 'DESCARTE', label: 'Descarte', color: 'danger' },
]

export function getEstadoConfig(estado) {
  return ESTADOS_DEVOLUCION.find(e => e.value === estado) || { color: 'default', label: estado, icon: RotateCcw }
}

export function getSiguientesEstados(estadoActual) {
  return TRANSICIONES_DEVOLUCION[estadoActual] || []
}

export function getEstadoProductoConfig(estado) {
  return ESTADOS_PRODUCTO.find(e => e.value === estado) || { color: 'default', label: estado }
}

export function getDecisionConfig(decision) {
  return DECISIONES_DEVOLUCION.find(d => d.value === decision) || { color: 'default', label: decision }
}