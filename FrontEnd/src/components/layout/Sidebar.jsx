import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  ReceiptText,
  Truck,
  TriangleAlert,
  ArchiveRestore,
  Archive,
  Route,
  Recycle,
  ChartColumn,
  Settings,
  ChevronDown,
} from 'lucide-react'
import { usePermissions } from '@/hooks/usePermissions'
import { cn } from '@/lib/utils'

// Numeración fija del Figma (01–10): no cambia aunque el rol oculte algún módulo.
const MODULES = [
  { n: '01', to: '/dashboard', label: 'Inicio / Dashboard', icon: LayoutDashboard, permission: 'pedidos.list' },
  { n: '02', to: '/pedidos', label: 'Pedidos', icon: ReceiptText, permission: 'pedidos.list' },
  { n: '03', to: '/despachos', label: 'Despachos', icon: Truck, permission: 'despachos.list' },
  { n: '04', to: '/incidencias', label: 'Incidencias', icon: TriangleAlert, permission: 'incidencias.list' },
  { n: '05', to: '/devoluciones', label: 'Devoluciones', icon: ArchiveRestore, permission: 'devoluciones.list' },
  { n: '06', to: '/inventario', label: 'Inventario', icon: Archive, permission: 'inventario.list' },
  { n: '07', to: '/trazabilidad', label: 'Trazabilidad', icon: Route, permission: 'trazabilidad.list' },
  { n: '08', to: '/residuos', label: 'Gestión de Residuos', icon: Recycle, permission: 'residuos.list' },
  { n: '09', to: '/reportes', label: 'Reportes y Rendimiento', icon: ChartColumn, permission: 'reportes.view' },
]

// Módulo 10: Administración agrupa usuarios, roles y los catálogos maestros
const ADMIN_ITEMS = [
  { to: '/administracion/usuarios', label: 'Usuarios', permission: 'admin.usuarios.list' },
  { to: '/administracion/roles', label: 'Roles y Permisos', permission: 'admin.roles.list' },
  { to: '/catalogos/productos', label: 'Productos', permission: 'catalogos.list' },
  { to: '/catalogos/clientes', label: 'Clientes', permission: 'catalogos.list' },
  { to: '/catalogos/zonas', label: 'Zonas de Despacho', permission: 'catalogos.list' },
  { to: '/catalogos/vehiculos', label: 'Vehículos', permission: 'catalogos.list' },
  { to: '/catalogos/tipos-incidencia', label: 'Tipos de Incidencia', permission: 'catalogos.list' },
  { to: '/catalogos/motivos-devolucion', label: 'Motivos de Devolución', permission: 'catalogos.list' },
  { to: '/catalogos/tipos-residuo', label: 'Tipos de Residuo', permission: 'catalogos.list' },
  { to: '/catalogos/gestores-residuo', label: 'Gestores de Residuo', permission: 'catalogos.list' },
]

function ModuleLink({ module, onNavigate }) {
  const Icon = module.icon
  return (
    <NavLink
      to={module.to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-4 px-4 h-11 text-sm transition-colors border-l-4',
          isActive
            ? 'bg-primary-light border-primary text-gray-900 font-semibold'
            : 'border-transparent text-gray-700 hover:bg-gray-50 hover:text-gray-900'
        )
      }
    >
      <span className="font-mono text-xs text-gray-500 w-5">{module.n}</span>
      <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
      <span className="truncate">{module.label}</span>
    </NavLink>
  )
}

function Sidebar({ mobileOpen = false, onClose }) {
  const location = useLocation()
  const { can } = usePermissions()

  const modules = MODULES.filter((m) => can(m.permission))
  const adminItems = ADMIN_ITEMS.filter((i) => can(i.permission))
  const adminActive = adminItems.some((i) => location.pathname.startsWith(i.to))
  const [adminOpen, setAdminOpen] = useState(adminActive)

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} aria-hidden="true" />
      )}

      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-50 lg:z-auto w-72 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col',
          'transition-transform duration-200 lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Módulos operativos"
      >
        <p className="label-caps px-4 h-12 flex items-center border-b border-gray-100 bg-gray-50">
          Módulos operativos
        </p>

        <nav className="flex-1 overflow-y-auto py-2">
          {modules.map((m) => (
            <ModuleLink key={m.to} module={m} onNavigate={onClose} />
          ))}

          {adminItems.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setAdminOpen((o) => !o)}
                aria-expanded={adminOpen}
                className={cn(
                  'w-full flex items-center gap-4 px-4 h-11 text-sm transition-colors border-l-4',
                  adminActive
                    ? 'bg-primary-light border-primary text-gray-900 font-semibold'
                    : 'border-transparent text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <span className="font-mono text-xs text-gray-500 w-5">10</span>
                <Settings className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                <span className="flex-1 text-left">Administración</span>
                <ChevronDown className={cn('h-4 w-4 text-gray-500 transition-transform', adminOpen && 'rotate-180')} />
              </button>
              {adminOpen && (
                <div className="py-1">
                  {adminItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={onClose}
                      className={({ isActive }) =>
                        cn(
                          'block pl-[4.75rem] pr-4 py-2 text-sm transition-colors',
                          isActive ? 'text-primary font-medium bg-gray-50' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        )
                      }
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>

        <div className="border-t border-gray-100 px-4 py-4 text-xs text-gray-600">
          <p className="font-semibold text-gray-900">SuperTequeños C.A.</p>
          <p className="mt-1">Valera, Edo. Trujillo | LogiTrace v1.0</p>
          <p className="mt-1 font-mono text-gray-500">Sede Principal · Planta Central</p>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
