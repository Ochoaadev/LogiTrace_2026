import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import AppLayout from '../components/layout/AppLayout'
import ProtectedRoute from '../components/layout/ProtectedRoute'

import DashboardPage from '../pages/Dashboard/DashboardPage'
import PedidosPage from '../pages/Pedidos/PedidosPage'
import PedidoDetallePage from '../pages/Pedidos/PedidoDetallePage'
import NuevoPedidoPage from '../pages/Pedidos/NuevoPedidoPage'
import DespachosPage from '../pages/Despachos/DespachosPage'
import DespachoDetallePage from '../pages/Despachos/DespachoDetallePage'
import FlujoOperativoPage from '../pages/Despachos/FlujoOperativoPage'
import IncidenciasPage from '../pages/Incidencias/IncidenciasPage'
import IncidenciaDetallePage from '../pages/Incidencias/IncidenciaDetallePage'
import DevolucionesPage from '../pages/Devoluciones/DevolucionesPage'
import DevolucionDetallePage from '../pages/Devoluciones/DevolucionDetallePage'
import InventarioPage from '../pages/Inventario/InventarioPage'
import MovimientoDetallePage from '../pages/Inventario/MovimientoDetallePage'
import TrazabilidadPage from '../pages/Trazabilidad/TrazabilidadPage'
import ResiduosPage from '../pages/Residuos/ResiduosPage'
import ReportesPage from '../pages/Reportes/ReportesPage'
import UsuariosPage from '../pages/Administracion/UsuariosPage'
import RolesPage from '../pages/Administracion/RolesPage'
import CatalogosPage from '../pages/Administracion/CatalogosPage'

function AppRoutes() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={<div>Login</div>} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />

          <Route path="/pedidos" element={<PedidosPage />} />
          <Route path="/pedidos/nuevo" element={<NuevoPedidoPage />} />
          <Route path="/pedidos/:id" element={<PedidoDetallePage />} />

          <Route path="/despachos" element={<DespachosPage />} />
          <Route path="/despachos/:id" element={<DespachoDetallePage />} />
          <Route path="/despachos/flujo" element={<FlujoOperativoPage />} />

          <Route path="/incidencias" element={<IncidenciasPage />} />
          <Route path="/incidencias/:id" element={<IncidenciaDetallePage />} />

          <Route path="/devoluciones" element={<DevolucionesPage />} />
          <Route path="/devoluciones/:id" element={<DevolucionDetallePage />} />

          <Route path="/inventario" element={<InventarioPage />} />
          <Route path="/inventario/movimiento/:id" element={<MovimientoDetallePage />} />

          <Route path="/trazabilidad" element={<TrazabilidadPage />} />

          <Route path="/residuos" element={<ResiduosPage />} />

          <Route path="/reportes" element={<ReportesPage />} />

          <Route path="/administracion/usuarios" element={<UsuariosPage />} />
          <Route path="/administracion/roles" element={<RolesPage />} />
          <Route path="/administracion/catalogos" element={<CatalogosPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default AppRoutes
