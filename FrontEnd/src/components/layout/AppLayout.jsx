import { Suspense, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { SkeletonCard } from '@/components/ui/Skeleton'

// Layout del Figma: header a todo el ancho arriba; debajo, sidebar fijo + contenido con scroll propio.
function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header onMenuClick={() => setMobileOpen(true)} />
      <div className="flex flex-1 min-h-0">
        <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
        {/* min-w-0: sin él, el contenido ancho (tablero Kanban, tablas) ensanchaba la página entera
            en lugar de desplazarse dentro de su propio contenedor */}
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-6">
          {/* La clave por ruta reinicia la animación de entrada en cada pantalla */}
          <div key={location.pathname} className="max-w-[1400px] mx-auto animar-entrada">
            {/* Mientras se descarga la pantalla (carga diferida) se ve un esqueleto dentro del diseño */}
            <Suspense fallback={<SkeletonCard />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  )
}

export default AppLayout
