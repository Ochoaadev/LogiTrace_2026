import { z } from 'zod'

export const inventarioSchema = z.object({
  ubicacionId: z.string().uuid('Ubicación requerida'),
  loteId: z.string().uuid('Lote requerido'),
  stockMinimo: z.number().int().min(0).default(0),
  stockMaximo: z.number().int().min(0).optional(),
})

export const movimientoSchema = z.object({
  tipo: z.enum(['ENTRADA', 'SALIDA', 'AJUSTE', 'REINGRESO', 'TRASLADO', 'DESCARTE']),
  loteId: z.string().uuid('Lote requerido'),
  ubicacionOrigenId: z.string().uuid().optional(),
  ubicacionDestinoId: z.string().uuid().optional(),
  cantidad: z.number().int().min(1, 'Mínimo 1'),
  unidad: z.string().min(1),
  observaciones: z.string().max(1000).optional(),
  referenciaTipo: z.string().optional(),
  referenciaId: z.string().uuid().optional(),
})

export const ajusteSchema = z.object({
  loteId: z.string().uuid(),
  ubicacionId: z.string().uuid(),
  cantidadNueva: z.number().int().min(0),
  observaciones: z.string().max(500).optional(),
})

export const TIPOS_MOVIMIENTO = [
  { value: 'ENTRADA', label: 'Entrada', color: 'success', icon: 'ArrowDown' },
  { value: 'SALIDA', label: 'Salida', color: 'danger', icon: 'ArrowUp' },
  { value: 'AJUSTE', label: 'Ajuste', color: 'warning', icon: 'Minus' },
  { value: 'REINGRESO', label: 'Reingreso', color: 'info', icon: 'RotateCcw' },
  { value: 'TRASLADO', label: 'Traslado', color: 'primary', icon: 'ArrowRightLeft' },
  { value: 'DESCARTE', label: 'Descarte', color: 'danger', icon: 'Trash2' },
]

export const ESTADOS_LOTE = [
  { value: 'DISPONIBLE', label: 'Disponible', color: 'success' },
  { value: 'CUARENTENA', label: 'Cuarentena', color: 'warning' },
  { value: 'NO_APTO', label: 'No Apto', color: 'danger' },
  { value: 'VENCIDO', label: 'Vencido', color: 'danger' },
]

export function getTipoMovimientoConfig(tipo) {
  return TIPOS_MOVIMIENTO.find(t => t.value === tipo) || { color: 'default', label: tipo, icon: 'Package' }
}

export function getEstadoLoteConfig(estado) {
  return ESTADOS_LOTE.find(e => e.value === estado) || { color: 'default', label: estado }
}