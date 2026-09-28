import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  Truck,
  AlertTriangle,
  RotateCcw,
  ClipboardList,
  Search,
  Recycle,
  BarChart3,
  Settings,
  Users,
  Shield,
  Database,
  ChevronDown,
  Menu,
  X,
  LogOut,
  Bell,
  HelpCircle,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/DropdownMenu'
import { Button } from '@/components/ui/Button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/Avatar'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/Tooltip'

const MENU_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'pedidos.list' },
  { to: '/pedidos', label: 'Pedidos', icon: Package, permission: 'pedidos.list' },
  { to: '/despachos', label: 'Despachos', icon: Truck, permission: 'despachos.list' },
  { to: '/incidencias', label: 'Incidencias', icon: AlertTriangle, permission: 'incidencias.list' },
  { to: '/devoluciones', label: 'Devoluciones', icon: RotateCcw, permission: 'devoluciones.list' },
  { to: '/inventario', label: 'Inventario', icon: ClipboardList, permission: 'inventario.list' },
  { to: '/trazabilidad', label: 'Trazabilidad', icon: Search, permission: 'trazabilidad.list' },
  { to: '/residuos', label: 'Residuos', icon: Recycle, permission: 'residuos.list' },
  { to: '/reportes', label: 'Reportes', icon: BarChart3, permission: 'reportes.view' },
]

const CATALOG_ITEMS = [
  { to: '/catalogos/productos', label: 'Productos', icon: Package, permission: 'catalogos.list' },
  { to: '/catalogos/clientes', label: 'Clientes', icon: Users, permission: 'catalogos.list' },
  { to: '/catalogos/zonas', label: 'Zonas de Despacho', icon: MapPin, permission: 'catalogos.list' },
  { to: '/catalogos/vehiculos', label: 'Vehículos', icon: Truck, permission: 'catalogos.list' },
  { to: '/catalogos/tipos-incidencia', label: 'Tipos de Incidencia', icon: AlertTriangle, permission: 'catalogos.list' },
  { to: '/catalogos/motivos-devolucion', label: 'Motivos de Devolución', icon: RotateCcw, permission: 'catalogos.list' },
  { to: '/catalogos/tipos-residuo', label: 'Tipos de Residuo', icon: Recycle, permission: 'catalogos.list' },
  { to: '/catalogos/gestores-residuo', label: 'Gestores de Residuo', icon: Factory, permission: 'catalogos.list' },
]

const ADMIN_ITEMS = [
  { to: '/administracion/usuarios', label: 'Usuarios', icon: Users, permission: 'admin.usuarios.list' },
  { to: '/administracion/roles', label: 'Roles y Permisos', icon: Shield, permission: 'admin.roles.list' },
  { to: '/administracion/catalogos', label: 'Gestión Catálogos', icon: Database, permission: 'admin.catalogos.manage' },
]

// Icons that need to be imported
import { MapPin, Factory } from 'lucide-react'

function Sidebar({ collapsed = false, onCollapseChange }) {
  const location = useLocation()
  const { user } = useAuth()
  const { can } = usePermissions()
  const [openCatalog, setOpenCatalog] = useState(false)
  const [openAdmin, setOpenAdmin] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const internalCollapsed = collapsed

  const isCatalogActive = CATALOG_ITEMS.some((c) => location.pathname.startsWith(c.to))
  const isAdminActive = ADMIN_ITEMS.some((a) => location.pathname.startsWith(a.to))

  const filteredMenuItems = MENU_ITEMS.filter((item) => !item.permission || can(item.permission))
  const filteredCatalogItems = CATALOG_ITEMS.filter((item) => !item.permission || can(item.permission))
  const filteredAdminItems = ADMIN_ITEMS.filter((item) => !item.permission || can(item.permission))

  const NavItem = ({ item, isChild = false }) => {
    const isActive = location.pathname === item.to || (isChild && location.pathname.startsWith(item.to))
    return (
      <NavLink
        to={item.to}
        className={({ isActive: routerActive }) => {
          const base = 'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors'
          if (collapsed && !isChild) return `${base} justify-center`
          return `${base} ${
            routerActive
              ? 'bg-primary-light text-primary'
              : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
          }`
        }}
        onClick={() => setMobileOpen(false)}
        title={collapsed && !isChild ? item.label : undefined}
      >
        <span className="h-5 w-5 flex-shrink-0" aria-hidden="true">
          <item.icon className="h-5 w-5" />
        </span>
        {!collapsed && <span>{item.label}</span>}
      </NavLink>
    )
  }

  const SectionTrigger = ({ label, icon: Icon, isOpen, onClick, isActive }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            'flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm transition-colors',
            internalCollapsed ? 'justify-center' : '',
            isActive ? 'text-primary' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
          )}
        >
          <span className="flex items-center gap-3">
            <span className="h-5 w-5 flex-shrink-0" aria-hidden="true">
              <Icon className="h-5 w-5" />
            </span>
            {!internalCollapsed && <span>{label}</span>}
          </span>
          {!internalCollapsed && (
            <ChevronDown
              className={cn(
                'w-4 h-4 text-gray-400 transition-transform flex-shrink-0',
                isOpen && 'rotate-180'
              )}
            />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" delayDuration={300}>
        {label}
      </TooltipContent>
    </Tooltip>
  )

  const CollapsedIcon = ({ icon: Icon }) => (
    <span className="h-5 w-5 flex-shrink-0" aria-hidden="true">
      <Icon className="h-5 w-5" />
    </span>
  )

  if (internalCollapsed) {
    return (
      <aside className="w-16 bg-white border-r border-gray-200 min-h-screen flex flex-col transition-all duration-200">
        <div className="p-4 border-b border-gray-200 flex justify-center">
          <Button
            variant="ghost"
            size="icon"
onClick={() => onCollapseChange?.(false)}
            aria-label="Expandir menú"
            className="h-10 w-10"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {filteredMenuItems.map((item) => (
            <NavItem key={item.to} item={item} />
          ))}

          <Separator className="my-2" />

          {filteredCatalogItems.length > 0 && (
            <div>
              <SectionTrigger
                label="Catálogos"
                icon={Database}
                isOpen={openCatalog}
                onClick={() => setOpenCatalog(!openCatalog)}
                isActive={isCatalogActive}
              />
              {openCatalog && (
                <div className="mt-1 space-y-1">
                  {filteredCatalogItems.map((item) => (
                    <NavItem key={item.to} item={item} isChild />
                  ))}
                </div>
              )}
            </div>
          )}

          {filteredAdminItems.length > 0 && (
            <div className="mt-2">
              <SectionTrigger
                label="Administración"
                icon={Settings}
                isOpen={openAdmin}
                onClick={() => setOpenAdmin(!openAdmin)}
                isActive={isAdminActive}
              />
              {openAdmin && (
                <div className="mt-1 space-y-1">
                  {filteredAdminItems.map((item) => (
                    <NavItem key={item.to} item={item} isChild />
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>

        <div className="p-2 border-t border-gray-200">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => onCollapseChange?.(false)} aria-label="Expandir menú" className="h-10 w-10">
                <X className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Expandir menú</TooltipContent>
          </Tooltip>
        </div>
      </aside>
    )
  }

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col transition-all duration-200 lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Package className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">LogiTrace</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden"
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {filteredMenuItems.map((item) => (
            <NavItem key={item.to} item={item} />
          ))}

          <Separator className="my-2" />

          {filteredCatalogItems.length > 0 && (
            <div>
              <SectionTrigger
                label="Catálogos"
                icon={Database}
                isOpen={openCatalog}
                onClick={() => setOpenCatalog(!openCatalog)}
                isActive={isCatalogActive}
              />
              {openCatalog && (
                <div className="ml-4 mt-1 space-y-1">
                  {filteredCatalogItems.map((item) => (
                    <NavItem key={item.to} item={item} isChild />
                  ))}
                </div>
              )}
            </div>
          )}

          {filteredAdminItems.length > 0 && (
            <div className="mt-2">
              <SectionTrigger
                label="Administración"
                icon={Settings}
                isOpen={openAdmin}
                onClick={() => setOpenAdmin(!openAdmin)}
                isActive={isAdminActive}
              />
              {openAdmin && (
                <div className="ml-4 mt-1 space-y-1">
                  {filteredAdminItems.map((item) => (
                    <NavItem key={item.to} item={item} isChild />
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={() => onCollapseChange?.(true)}
              aria-label="Colapsar menú"
            >
              <ChevronDown className="h-4 w-4" />
              <span>Colapsar</span>
            </Button>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">LogiTrace v1.0</p>
          </div>
        </div>
      </aside>
    </>
  )
}

import { cn } from '@/lib/utils'

export default Sidebar