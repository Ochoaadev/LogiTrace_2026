import { useAuth } from './useAuth'

const ROLE_HIERARCHY = {
  ADMINISTRADOR: 4,
  SUPERVISOR: 3,
  OPERADOR: 2,
  REPARTIDOR: 1,
}

const PERMISSIONS = {
  // Pedidos
  'pedidos.list': ['ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR', 'REPARTIDOR'],
  'pedidos.create': ['ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'],
  'pedidos.view': ['ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR', 'REPARTIDOR'],
  'pedidos.edit': ['ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'],
  'pedidos.cancel': ['ADMINISTRADOR', 'SUPERVISOR'],
  'pedidos.assign_despacho': ['ADMINISTRADOR', 'SUPERVISOR'],
  'pedidos.change_priority': ['ADMINISTRADOR', 'SUPERVISOR'],
  'pedidos.export': ['ADMINISTRADOR', 'SUPERVISOR'],

  // Panel de inicio con indicadores (personal de planta)
  'dashboard.view': ['ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'],

  // Ruta propia del repartidor (vista móvil con GPS)
  'ruta.propia': ['REPARTIDOR'],

  // Despachos
  'despachos.list': ['ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR', 'REPARTIDOR'],
  'despachos.view': ['ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR', 'REPARTIDOR'],
  'despachos.create': ['ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'],
  'despachos.edit': ['ADMINISTRADOR', 'SUPERVISOR'],
  'despachos.assign_repartidor': ['ADMINISTRADOR', 'SUPERVISOR'],
  'despachos.change_state': ['ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR', 'REPARTIDOR'],
  'despachos.flujo_operativo': ['ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'],
  'despachos.export': ['ADMINISTRADOR', 'SUPERVISOR'],

  // Incidencias
  'incidencias.list': ['ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR', 'REPARTIDOR'],
  'incidencias.view': ['ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR', 'REPARTIDOR'],
  'incidencias.create': ['ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR', 'REPARTIDOR'],
  'incidencias.edit': ['ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'],
  'incidencias.resolve': ['ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'],
  'incidencias.export': ['ADMINISTRADOR', 'SUPERVISOR'],

  // Devoluciones
  'devoluciones.list': ['ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'],
  'devoluciones.view': ['ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'],
  'devoluciones.create': ['ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'],
  'devoluciones.process': ['ADMINISTRADOR', 'SUPERVISOR'],
  'devoluciones.export': ['ADMINISTRADOR', 'SUPERVISOR'],

  // Inventario
  'inventario.list': ['ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'],
  'inventario.view': ['ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'],
  'inventario.movimientos': ['ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'],
  'inventario.adjust': ['ADMINISTRADOR', 'SUPERVISOR'],
  'inventario.export': ['ADMINISTRADOR', 'SUPERVISOR'],

  // Trazabilidad
  'trazabilidad.list': ['ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'],
  'trazabilidad.view': ['ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'],
  'trazabilidad.export': ['ADMINISTRADOR', 'SUPERVISOR'],

  // Residuos
  'residuos.list': ['ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'],
  'residuos.view': ['ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'],
  'residuos.create': ['ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'],
  'residuos.update': ['ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'],
  'residuos.export': ['ADMINISTRADOR', 'SUPERVISOR'],

  // Reportes
  'reportes.view': ['ADMINISTRADOR', 'SUPERVISOR'],
  'reportes.export': ['ADMINISTRADOR', 'SUPERVISOR'],

  // Catálogos
  'catalogos.list': ['ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'],
  'catalogos.create': ['ADMINISTRADOR', 'SUPERVISOR'],
  'catalogos.edit': ['ADMINISTRADOR', 'SUPERVISOR'],
  'catalogos.delete': ['ADMINISTRADOR'],
  // El operador registra clientes nuevos al tomar pedidos (sin poder editarlos ni borrarlos)
  'clientes.create': ['ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'],

  // Administración
  'admin.usuarios.list': ['ADMINISTRADOR'],
  'admin.usuarios.create': ['ADMINISTRADOR'],
  'admin.usuarios.edit': ['ADMINISTRADOR'],
  'admin.usuarios.delete': ['ADMINISTRADOR'],
  'admin.roles.list': ['ADMINISTRADOR'],
  'admin.roles.edit': ['ADMINISTRADOR'],
  'admin.catalogos.manage': ['ADMINISTRADOR'],
}

export function usePermissions() {
  const { user } = useAuth()

  const userRole = user?.rol
  const userLevel = ROLE_HIERARCHY[userRole] || 0

  const can = (permission) => {
    const allowedRoles = PERMISSIONS[permission]
    if (!allowedRoles) return false
    return allowedRoles.includes(userRole)
  }

  const hasRole = (roles) => {
    const roleArray = Array.isArray(roles) ? roles : [roles]
    return roleArray.includes(userRole)
  }

  const hasAnyRole = (roles) => {
    const roleArray = Array.isArray(roles) ? roles : [roles]
    return roleArray.some((role) => role === userRole)
  }

  const isAdmin = () => userRole === 'ADMINISTRADOR'
  const isSupervisor = () => userRole === 'SUPERVISOR'
  const isOperador = () => userRole === 'OPERADOR'
  const isRepartidor = () => userRole === 'REPARTIDOR'

  const canAccessRoute = (routePermissions) => {
    if (!routePermissions || routePermissions.length === 0) return true
    return routePermissions.some((p) => can(p))
  }

  return {
    userRole,
    userLevel,
    can,
    hasRole,
    hasAnyRole,
    isAdmin,
    isSupervisor,
    isOperador,
    isRepartidor,
    canAccessRoute,
    ROLE_HIERARCHY,
    PERMISSIONS,
  }
}

export { PERMISSIONS, ROLE_HIERARCHY }