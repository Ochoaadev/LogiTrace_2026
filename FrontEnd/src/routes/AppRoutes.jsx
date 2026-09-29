import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'
import ProtectedRoute from '../components/layout/ProtectedRoute'
import { usePermissions } from '../hooks/usePermissions'

import LoginPage from '../pages/Auth/LoginPage'
import DashboardPage from '../pages/Dashboard/DashboardPage'
import PedidosPage from '../pages/Pedidos/PedidosPage'
import PedidoDetallePage from '../pages/Pedidos/PedidoDetallePage'
import NuevoPedidoPage from '../pages/Pedidos/NuevoPedidoPage'
import DespachosPage from '../pages/Despachos/DespachosPage'
import DespachoDetallePage from '../pages/Despachos/DespachoDetallePage'
import NuevoDespachoPage from '../pages/Despachos/NuevoDespachoPage'
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
import AdministracionPage from '../pages/Administracion/AdministracionPage'
import MiRutaPage from '../pages/Repartidor/MiRutaPage'

import ProductosPage from '../pages/Catalogos/ProductosPage'
import ClientesPage from '../pages/Catalogos/ClientesPage'
import ZonasPage from '../pages/Catalogos/ZonasPage'
import VehiculosPage from '../pages/Catalogos/VehiculosPage'
import TiposIncidenciaPage from '../pages/Catalogos/TiposIncidenciaPage'
import MotivosDevolucionPage from '../pages/Catalogos/MotivosDevolucionPage'
import TiposResiduoPage from '../pages/Catalogos/TiposResiduoPage'
import GestoresResiduoPage from '../pages/Catalogos/GestoresResiduoPage'



// El repartidor trabaja desde su ruta (GPS); el panel de indicadores es del personal de planta
function Inicio() {
  const { can } = usePermissions()
  return can('ruta.propia') ? <Navigate to="/mi-ruta" replace /> : <DashboardPage />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Inicio />} />
          <Route path="/dashboard" element={<Inicio />} />

          <Route element={<ProtectedRoute allowedPermissions={['ruta.propia']} />}>
            <Route path="/mi-ruta" element={<MiRutaPage />} />
          </Route>

          <Route path="/pedidos" element={<PedidosPage />} />
          <Route path="/pedidos/nuevo" element={<NuevoPedidoPage />} />
          <Route path="/pedidos/:id" element={<PedidoDetallePage />} />

          <Route path="/despachos" element={<DespachosPage />} />
          <Route path="/despachos/nuevo" element={<NuevoDespachoPage />} />
          <Route path="/despachos/:id" element={<DespachoDetallePage />} />
          <Route path="/despachos/flujo" element={<FlujoOperativoPage />} />

          <Route path="/incidencias" element={<IncidenciasPage />} />
          <Route path="/incidencias/:id" element={<IncidenciaDetallePage />} />

          {/* Los módulos que no todos los perfiles pueden abrir redirigen al inicio (antes solo el
              menú los ocultaba y la dirección directa mostraba la pantalla con errores de permisos) */}
          <Route element={<ProtectedRoute allowedPermissions={['devoluciones.list']} />}>
            <Route path="/devoluciones" element={<DevolucionesPage />} />
            <Route path="/devoluciones/:id" element={<DevolucionDetallePage />} />
          </Route>

          <Route element={<ProtectedRoute allowedPermissions={['inventario.list']} />}>
            <Route path="/inventario" element={<InventarioPage />} />
            <Route path="/inventario/movimiento/:id" element={<MovimientoDetallePage />} />
          </Route>

          <Route element={<ProtectedRoute allowedPermissions={['trazabilidad.list']} />}>
            <Route path="/trazabilidad" element={<TrazabilidadPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedPermissions={['residuos.list']} />}>
            <Route path="/residuos" element={<ResiduosPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedPermissions={['reportes.view']} />}>
            <Route path="/reportes" element={<ReportesPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedPermissions={['catalogos.list']} />}>
          <Route path="/catalogos/productos" element={<ProductosPage />} />
          <Route path="/catalogos/clientes" element={<ClientesPage />} />
          <Route path="/catalogos/zonas" element={<ZonasPage />} />
          <Route path="/catalogos/vehiculos" element={<VehiculosPage />} />
          <Route path="/catalogos/tipos-incidencia" element={<TiposIncidenciaPage />} />
          <Route path="/catalogos/motivos-devolucion" element={<MotivosDevolucionPage />} />
          <Route path="/catalogos/tipos-residuo" element={<TiposResiduoPage />} />
          <Route path="/catalogos/gestores-residuo" element={<GestoresResiduoPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedPermissions={['admin.usuarios.list']} />}>
            <Route path="/administracion" element={<AdministracionPage />} />
            <Route path="/administracion/usuarios" element={<Navigate to="/administracion?vista=usuarios" replace />} />
            <Route path="/administracion/roles" element={<Navigate to="/administracion?vista=roles" replace />} />
            <Route path="/administracion/catalogos" element={<Navigate to="/administracion?vista=catalogos" replace />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default AppRoutes
