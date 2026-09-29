import { z } from 'zod'

export const pedidoSchema = z.object({
  clienteId: z.string().uuid('Cliente inválido'),
  productos: z.array(z.object({
    productoId: z.string().uuid(),
    cantidad: z.number().int().min(1, 'Mínimo 1'),
    precioUnitario: z.number().min(0),
  })).min(1, 'Debe agregar al menos un producto'),
  prioridad: z.enum(['BAJA', 'NORMAL', 'ALTA', 'URGENTE']).default('NORMAL'),
  zonaId: z.string().uuid().optional(),
  fechaEntregaSolicitada: z.string().optional(),
  observaciones: z.string().max(500).optional(),
})

export const pedidoEstadoSchema = z.object({
  estado: z.enum([
    'REGISTRADO', 'EN_PREPARACION', 'LISTO_PARA_DESPACHO',
    'EN_RUTA', 'ENTREGADO', 'CON_INCIDENCIA', 'DEVUELTO', 'CERRADO', 'CANCELADO'
  ]),
})

export const ESTADOS_PEDIDO = [
  { value: 'REGISTRADO', label: 'Registrado', color: 'default' },
  { value: 'EN_PREPARACION', label: 'En Preparación', color: 'info' },
  { value: 'LISTO_PARA_DESPACHO', label: 'Listo para Despacho', color: 'primary' },
  { value: 'EN_RUTA', label: 'En Ruta', color: 'warning' },
  { value: 'ENTREGADO', label: 'Entregado', color: 'success' },
  { value: 'CON_INCIDENCIA', label: 'Con Incidencia', color: 'danger' },
  { value: 'DEVUELTO', label: 'Devuelto', color: 'default' },
  { value: 'CERRADO', label: 'Cerrado', color: 'default' },
  { value: 'CANCELADO', label: 'Cancelado', color: 'danger' },
]

// Transiciones que acepta el backend (pedido.service.js → changeEstado). Mantener sincronizado:
// ofrecer otra transición en la UI solo produce un error 400.
export const TRANSICIONES_PEDIDO = {
  REGISTRADO: ['EN_PREPARACION', 'CANCELADO'],
  EN_PREPARACION: ['LISTO_PARA_DESPACHO', 'CANCELADO'],
  LISTO_PARA_DESPACHO: ['EN_RUTA', 'CANCELADO'],
  EN_RUTA: ['ENTREGADO', 'CON_INCIDENCIA'],
  CON_INCIDENCIA: ['EN_RUTA', 'DEVUELTO'],
  ENTREGADO: ['CERRADO', 'DEVUELTO'],
  DEVUELTO: ['CERRADO'],
  CERRADO: [],
  CANCELADO: [],
}

export const PRIORIDADES = [
  { value: 'BAJA', label: 'Baja', color: 'default' },
  { value: 'NORMAL', label: 'Normal', color: 'info' },
  { value: 'ALTA', label: 'Alta', color: 'warning' },
  { value: 'URGENTE', label: 'Urgente', color: 'danger' },
]

export function getEstadoConfig(estado) {
  return ESTADOS_PEDIDO.find(e => e.value === estado) || { color: 'default', label: estado }
}

export function getPrioridadConfig(prioridad) {
  return PRIORIDADES.find(p => p.value === prioridad) || { color: 'default', label: prioridad }
}