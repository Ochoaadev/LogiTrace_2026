import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/DropdownMenu'
import { Button } from '@/components/ui/Button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/Avatar'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/Tooltip'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import {
  Menu,
  Bell,
  LogOut,
  User,
  Settings,
  ChevronDown,
  Search,
  Sun,
  Moon,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'

function Header() {
  const { user, logout, accessToken } = useAuth()
  const { isAdmin, isSupervisor } = usePermissions()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Simulated notifications
  const notifications = [
    { id: 1, title: 'Nuevo pedido urgente', message: 'Pedido PED-2026-001 requiere atención', time: 'Hace 5 min', read: false },
    { id: 2, title: 'Despacho retrasado', message: 'Despacho DESP-2026-003 tiene demora de 30 min', time: 'Hace 15 min', read: false },
    { id: 3, title: 'Stock bajo', message: 'Producto PROD-005 tiene 5 unidades restantes', time: 'Hace 1 hora', read: true },
  ]

  const unreadCount = notifications.filter((n) => !n.read).length

  useEffect(() => {
    const saved = localStorage.getItem('darkMode')
    if (saved !== null) {
      setDarkMode(saved === 'true')
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode.toString())
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  const getInitials = (name) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const breadcrumbItems = location.pathname
    .split('/')
    .filter(Boolean)
    .map((segment, index) => {
      const href = '/' + location.pathname.split('/').slice(1, index + 2).join('/')
      const label = segment
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
      return { label, href, isCurrent: index === location.pathname.split('/').filter(Boolean).length - 1 }
    })

  return (
    <header className="h-16 bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="h-full px-4 lg:px-6 flex items-center justify-between gap-4">
        {/* Left Side */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Mobile Menu Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden"
                aria-label="Abrir menú"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Menú</TooltipContent>
          </Tooltip>

          {/* Global Search */}
          <div className="relative hidden md:block w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
            <input
              type="search"
              placeholder="Buscar pedidos, clientes, productos... (Cmd+K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-10 pr-4 rounded-md border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary-light focus:outline-none transition-colors"
              aria-label="Búsqueda global"
            />
            <kbd className="hidden sm:inline-flex absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 px-1.5 py-0.5 rounded bg-gray-100">Cmd+K</kbd>
          </div>

          {/* Breadcrumb */}
          <div className="hidden lg:block flex-1 max-w-xl">
            <Breadcrumb items={breadcrumbItems} />
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2 lg:gap-4">
          {/* Dark Mode Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDarkMode(!darkMode)}
                aria-label={darkMode ? 'Modo claro' : 'Modo oscuro'}
              >
                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{darkMode ? 'Modo claro' : 'Modo oscuro'}</TooltipContent>
          </Tooltip>

          {/* Notifications */}
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative"
                    aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ''}`}
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-danger text-white text-[10px] flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 p-0">
                  <div className="p-3 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Notificaciones</h3>
                    {unreadCount > 0 && (
                      <Button variant="ghost" size="sm" className="text-xs">
                        Marcar todo leído
                      </Button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-gray-500 text-sm">No hay notificaciones</div>
                    ) : (
                      notifications.map((notif) => (
                        <DropdownMenuItem
                          key={notif.id}
                          className={cn(
                            'p-3 hover:bg-gray-50 transition-colors',
                            !notif.read && 'bg-primary-light/50'
                          )}
                          onClick={() => { /* mark as read */ }}
                          inset
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn('h-2 w-2 rounded-full mt-2 flex-shrink-0', !notif.read ? 'bg-primary' : 'bg-gray-300')} />
                            <div className="flex-1 min-w-0">
                              <p className={cn('text-sm font-medium', !notif.read ? 'text-gray-900' : 'text-gray-700')}>
                                {notif.title}
                              </p>
                              <p className="text-xs text-gray-500 truncate">{notif.message}</p>
                              <p className="text-xs text-gray-400 mt-1">{notif.time}</p>
                            </div>
                          </div>
                        </DropdownMenuItem>
                      ))
                    )}
                  </div>
                  <div className="p-3 border-t border-gray-200 text-center">
                    <DropdownMenuItem className="text-primary hover:bg-primary-light" onClick={() => { /* view all */ }}>
                      Ver todas las notificaciones
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </TooltipTrigger>
            <TooltipContent side="bottom">Notificaciones</TooltipContent>
          </Tooltip>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 pr-3" aria-label="Menú de usuario">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatar} alt={user?.nombre} />
                  <AvatarFallback>{getInitials(user?.nombre || 'Usuario')}</AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-900 truncate max-w-[150px]">{user?.nombre || 'Usuario'}</p>
                  <p className="text-xs text-gray-500 truncate max-w-[150px]">{user?.email}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400 hidden md:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal text-gray-900">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{getInitials(user?.nombre || 'Usuario')}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{user?.nombre || 'Usuario'}</p>
                    <p className="text-xs text-gray-500">{user?.rol}</p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { /* navigate to profile */ }}>
                <User className="h-4 w-4" />
                Mi perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { /* navigate to settings */ }}>
                <Settings className="h-4 w-4" />
                Configuración
              </DropdownMenuItem>
              {isAdmin() && (
                <DropdownMenuItem onClick={() => { /* navigate to admin */ }}>
                  <Shield className="h-4 w-4" />
                  Administración
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-danger focus:text-danger">
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

import { cn } from '@/lib/utils'

export default Header