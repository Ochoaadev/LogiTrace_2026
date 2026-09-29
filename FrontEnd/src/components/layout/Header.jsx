import { useQuery } from '@tanstack/react-query'
import { Network, Clock, User, LogOut, Menu } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import api from '@/services/api'
import { cn } from '@/lib/utils'
import { TemaToggle } from '@/components/ui/TemaToggle'

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
      <div className="flex items-center gap-2 sm:gap-3 pl-3 pr-1 sm:px-4 lg:w-72 lg:border-r lg:border-gray-100">
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

      <div className="flex-1 flex items-center justify-between gap-2 sm:gap-4 pl-2 pr-2 sm:px-4 lg:px-6 min-w-0">
        {/* Compacto según el ancho: en celular solo el punto, en tablet "En línea", completo en escritorio */}
        <div
          className="inline-flex items-center gap-2 bg-gray-50 px-2.5 md:px-3 py-1.5 text-xs text-gray-900 whitespace-nowrap"
          role="status"
          aria-label={online ? 'En línea: servidor local y base de datos disponibles' : 'Sin conexión con el servidor'}
          title={online ? 'En línea · Servidor Local / BD' : 'Sin conexión con el servidor'}
        >
          <span className={cn('h-2 w-2 rounded-full flex-shrink-0', online ? 'bg-success' : 'bg-danger')} aria-hidden="true" />
          <span className="hidden md:inline" aria-hidden="true">{online ? 'En línea' : 'Sin conexión'}</span>
          {online && <span className="hidden xl:inline" aria-hidden="true">· Servidor Local / BD</span>}
        </div>

        <div className="flex items-center gap-1 sm:gap-4 lg:gap-6 ml-auto">
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
          <TemaToggle className="sm:-mr-2 lg:-mr-3" />
          {/* Decorativo: se oculta en celulares muy angostos para que quepan tema y salida */}
          <div className="hidden min-[360px]:flex h-10 w-10 rounded-full bg-primary items-center justify-center flex-shrink-0" aria-hidden="true">
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
