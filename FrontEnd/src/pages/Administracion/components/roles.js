import { PERMISSIONS } from '@/hooks/usePermissions'

// Perfiles del sistema (RBAC simple) según el organigrama operativo de SuperTequeños C.A.
export const ROLES = [
  {
    rol: 'ADMINISTRADOR',
    nombre: 'Administrador',
    nivel: 1,
    descripcion: 'Acceso total a configuración, auditoría, reportes y usuarios.',
    variante: 'default',
  },
  {
    rol: 'SUPERVISOR',
    nombre: 'Supervisor de inocuidad / cava',
    nivel: 2,
    descripcion: 'Dictamen técnico de devoluciones, registro manual de temperatura, control de inventario y reportes.',
    variante: 'success',
  },
  {
    rol: 'OPERADOR',
    nombre: 'Despachador / Operador',
    nivel: 2,
    descripcion: 'Emisión de pedidos, asignación de despachos, registro de incidencias y devoluciones.',
    variante: 'info',
  },
  {
    rol: 'REPARTIDOR',
    nombre: 'Repartidor / Motorizado',
    nivel: 3,
    descripcion: 'Consulta de pedidos asignados, reporte de demoras e incidencias y confirmación de entrega con GPS.',
    variante: 'warning',
  },
]

export const rolInfo = (rol) => ROLES.find((r) => r.rol === rol) || { rol, nombre: rol, variante: 'default' }

// Módulos en el orden del menú (numeración del Figma)
export const MODULOS = [
  { n: '01–02', prefijo: 'pedidos', nombre: 'Pedidos' },
  { n: '03', prefijo: 'despachos', nombre: 'Despachos' },
  { n: '04', prefijo: 'incidencias', nombre: 'Incidencias' },
  { n: '05', prefijo: 'devoluciones', nombre: 'Devoluciones' },
  { n: '06', prefijo: 'inventario', nombre: 'Inventario' },
  { n: '07', prefijo: 'trazabilidad', nombre: 'Trazabilidad' },
  { n: '08', prefijo: 'residuos', nombre: 'Gestión de residuos' },
  { n: '09', prefijo: 'reportes', nombre: 'Reportes y rendimiento' },
  { n: '10', prefijo: 'catalogos', nombre: 'Catálogos maestros' },
  { n: '10', prefijo: 'admin', nombre: 'Usuarios y roles' },
]

const ACCION = {
  list: 'Consultar', view: 'Consultar', create: 'Registrar', edit: 'Editar', delete: 'Eliminar', cancel: 'Anular',
  export: 'Exportar', resolve: 'Resolver', process: 'Dictaminar', adjust: 'Ajustar stock', movimientos: 'Movimientos',
  change_state: 'Cambiar estado', update: 'Cambiar estado', assign_despacho: 'Asignar despacho', assign_repartidor: 'Asignar repartidor',
  change_priority: 'Prioridad', flujo_operativo: 'Tablero', manage: 'Gestionar',
}

/** Acciones que un rol puede ejecutar en un módulo, según el mapa de permisos de la aplicación. */
export function accionesDe(rol, prefijo) {
  const acciones = Object.entries(PERMISSIONS)
    .filter(([clave, roles]) => clave.startsWith(`${prefijo}.`) && roles.includes(rol))
    .map(([clave]) => ACCION[clave.split('.').pop()] || clave.split('.').pop())
  return [...new Set(acciones)]
}

/** Números de los módulos del menú habilitados para el rol. */
export function modulosHabilitados(rol) {
  return MODULOS.filter((m) => accionesDe(rol, m.prefijo).length > 0)
}

export const iniciales = (nombre = '') =>
  nombre.split(/\s+/).filter((p) => p && !/^(ing\.|lic\.|dr\.|de|del|la)$/i.test(p)).slice(0, 2).map((p) => p[0].toUpperCase()).join('')
