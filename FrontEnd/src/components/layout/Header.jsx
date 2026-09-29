import { useQuery } from '@tanstack/react-query'
import { Network, Clock, User, LogOut, Menu } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import api from '@/services/api'
import { cn } from '@/lib/utils'

const ROL_LABELS = {
  ADMINISTRADOR: 'Administrador',
  SUPERVISOR: 'Supervisor',
  OPERADOR: 'Operador / Despachador',
  REPARTIDOR: 'Repartidor',
}

// Estado real del backend (y de su conexión a PostgreSQL), consultado cada 30 s
function useServerStatus() {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => api.get('/health'),
    refetchInterval: 30_000,
    retry: false,
  })
}

function Header({ onMenuClick }) {
  const { user, logout } = useAuth()
  const { isSuccess, isError } = useServerStatus()
  const online = isSuccess && !isError

  return (
    <header className="h-16 flex-shrink-0 bg-white border-b border-gray-100 flex items-stretch z-30">
      {/* Marca: mismo ancho que el sidebar */}
      <div className="flex items-center gap-3 px-4 lg:w-72 lg:border-r lg:border-gray-100">
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden -ml-1 p-2 hover:bg-gray-50"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="h-10 w-10 bg-primary flex items-center justify-center flex-shrink-0">
          <Network className="h-6 w-6 text-white" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-base font-semibold leading-tight text-gray-900">LogiTrace</p>
          <p className="text-xs text-gray-600 truncate hidden sm:block">SuperTequeños C.A. · Valera, Trujillo</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-between gap-4 px-4 lg:px-6 min-w-0">
        <div
          className="hidden md:inline-flex items-center gap-2 bg-gray-50 px-3 py-1.5 text-xs text-gray-900"
          role="status"
        >
          <span className={cn('h-2 w-2 rounded-full', online ? 'bg-success' : 'bg-danger')} aria-hidden="true" />
          {online ? 'En línea · Servidor Local / BD' : 'Sin conexión con el servidor'}
        </div>

        <div className="flex items-center gap-4 lg:gap-6 ml-auto">
          <span className="hidden lg:inline-flex items-center gap-2 text-sm text-gray-700">
            <Clock className="h-4 w-4" aria-hidden="true" />
            Venezuela (UTC-4)
          </span>

          <div className="hidden sm:block text-right min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate max-w-[220px]">{user?.nombre || 'Usuario'}</p>
            <p className="text-xs text-gray-600 truncate max-w-[260px]">
              {ROL_LABELS[user?.rol] || user?.rol}
              {user?.documento && ` · ${user.documento}`}
            </p>
          </div>
          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <User className="h-5 w-5 text-white" />
          </div>
          <button
            type="button"
            onClick={logout}
            className="p-2 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header
