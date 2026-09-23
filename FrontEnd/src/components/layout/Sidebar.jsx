import { NavLink } from 'react-router-dom'

const menuItems = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/pedidos', label: 'Pedidos', icon: '📦' },
  { to: '/despachos', label: 'Despachos', icon: '🚚' },
  { to: '/incidencias', label: 'Incidencias', icon: '⚠️' },
  { to: '/devoluciones', label: 'Devoluciones', icon: '↩️' },
  { to: '/inventario', label: 'Inventario', icon: '📋' },
  { to: '/trazabilidad', label: 'Trazabilidad', icon: '🔍' },
  { to: '/residuos', label: 'Residuos', icon: '♻️' },
  { to: '/reportes', label: 'Reportes', icon: '📈' },
  { to: '/administracion/usuarios', label: 'Administración', icon: '⚙️' },
]

function Sidebar() {
  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen flex flex-col">
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-xl font-bold">LogiTrace</h1>
        <p className="text-xs text-gray-400 mt-1">SuperTequeños</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-700">
        <p className="text-xs text-gray-500 text-center">LogiTrace v1.0</p>
      </div>
    </aside>
  )
}

export default Sidebar
