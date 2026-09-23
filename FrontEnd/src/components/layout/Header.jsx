import { useAuth } from '../../hooks/useAuth'

function Header() {
  const { user, logout } = useAuth()

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">LogiTrace</h2>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">{user?.email || 'Usuario'}</span>
        <button
          onClick={logout}
          className="text-sm text-red-600 hover:text-red-800 transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </header>
  )
}

export default Header
