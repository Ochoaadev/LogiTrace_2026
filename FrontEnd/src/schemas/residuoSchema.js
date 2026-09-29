// Estados del residuo (espejo de TRANSICIONES_RESIDUO en residuo.service.js del backend)
export const ESTADOS_RESIDUO = [
  { value: 'REGISTRADO', label: 'Registrado en planta', color: 'info' },
  { value: 'EN_ALMACENAMIENTO', label: 'En almacenamiento', color: 'warning' },
  { value: 'RETIRADO', label: 'Retirado por gestor', color: 'default' },
  { value: 'DISPOSICION_FINAL', label: 'Disposición final', color: 'success' },
  { value: 'ANULADO', label: 'Anulado', color: 'danger' },
]

export const TRANSICIONES_RESIDUO = {
  REGISTRADO: ['EN_ALMACENAMIENTO', 'ANULADO'],
  EN_ALMACENAMIENTO: ['RETIRADO', 'ANULADO'],
  RETIRADO: ['DISPOSICION_FINAL'],
  DISPOSICION_FINAL: [],
  ANULADO: [],
}

// Botón que ejecuta cada transición
export const ACCION_RESIDUO = {
  EN_ALMACENAMIENTO: 'Pasar a almacenamiento',
  RETIRADO: 'Registrar retiro',
  DISPOSICION_FINAL: 'Confirmar disposición final',
  ANULADO: 'Anular registro',
}

export const UNIDADES_RESIDUO = [
  { value: 'kg', label: 'Kilogramos (kg)' },
  { value: 'litros', label: 'Litros (L)' },
  { value: 'unidad', label: 'Unidades' },
]

// Áreas de la planta El Murachí que generan residuos; "Devolución" vincula el registro a la
// logística inversa (módulo 05).
export const ORIGENES_RESIDUO = [
  'Área de fritura',
  'Preparación de masa',
  'Línea de laminado y corte',
  'Almacén de materia prima',
  'Cava de producto terminado',
  'Empaque y despacho',
]
export const ORIGEN_DEVOLUCION = 'DEVOLUCION'

export function getEstadoResiduo(estado) {
  return ESTADOS_RESIDUO.find((e) => e.value === estado) || { value: estado, label: estado, color: 'default' }
}
