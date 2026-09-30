import { lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'
import ProtectedRoute from '../components/layout/ProtectedRoute'
import { usePermissions } from '../hooks/usePermissions'

import LoginPage from '../pages/Auth/LoginPage'
// Cada pantalla se descarga al abrirla (antes toda la app iba en un único paquete de 1,4 MB,
// pesado para los teléfonos de los repartidores). El login se mantiene en el paquete principal.
const DashboardPage = lazy(() => import('../pages/Dashboard/DashboardPage'))
const PedidosPage = lazy(() => import('../pages/Pedidos/PedidosPage'))
const PedidoDetallePage = lazy(() => import('../pages/Pedidos/PedidoDetallePage'))
const NuevoPedidoPage = lazy(() => import('../pages/Pedidos/NuevoPedidoPage'))
const DespachosPage = lazy(() => import('../pages/Despachos/DespachosPage'))
const DespachoDetallePage = lazy(() => import('../pages/Despachos/DespachoDetallePage'))
const NuevoDespachoPage = lazy(() => import('../pages/Despachos/NuevoDespachoPage'))
const FlujoOperativoPage = lazy(() => import('../pages/Despachos/FlujoOperativoPage'))
const IncidenciasPage = lazy(() => import('../pages/Incidencias/IncidenciasPage'))
const IncidenciaDetallePage = lazy(() => import('../pages/Incidencias/IncidenciaDetallePage'))
const DevolucionesPage = lazy(() => import('../pages/Devoluciones/DevolucionesPage'))
const DevolucionDetallePage = lazy(() => import('../pages/Devoluciones/DevolucionDetallePage'))
const InventarioPage = lazy(() => import('../pages/Inventario/InventarioPage'))
const MovimientoDetallePage = lazy(() => import('../pages/Inventario/MovimientoDetallePage'))
const TrazabilidadPage = lazy(() => import('../pages/Trazabilidad/TrazabilidadPage'))
const ResiduosPage = lazy(() => import('../pages/Residuos/ResiduosPage'))
const ReportesPage = lazy(() => import('../pages/Reportes/ReportesPage'))
const AdministracionPage = lazy(() => import('../pages/Administracion/AdministracionPage'))
const MiRutaPage = lazy(() => import('../pages/Repartidor/MiRutaPage'))
const CatalogoPage = lazy(() => import('../pages/Catalogos/CatalogoPage'))

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

          {/* Módulos de oficina: el repartidor trabaja solo desde «Mi ruta» y se le redirige allí */}
          <Route element={<ProtectedRoute allowedPermissions={['pedidos.list']} />}>
            <Route path="/pedidos" element={<PedidosPage />} />
            <Route path="/pedidos/:id" element={<PedidoDetallePage />} />
          </Route>
          <Route element={<ProtectedRoute allowedPermissions={['pedidos.create']} />}>
            <Route path="/pedidos/nuevo" element={<NuevoPedidoPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedPermissions={['despachos.list']} />}>
            <Route path="/despachos" element={<DespachosPage />} />
            <Route path="/despachos/:id" element={<DespachoDetallePage />} />
            <Route path="/despachos/flujo" element={<FlujoOperativoPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedPermissions={['despachos.create']} />}>
            <Route path="/despachos/nuevo" element={<NuevoDespachoPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedPermissions={['incidencias.list']} />}>
            <Route path="/incidencias" element={<IncidenciasPage />} />
            <Route path="/incidencias/:id" element={<IncidenciaDetallePage />} />
          </Route>

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
          <Route path="/catalogos/productos" element={<CatalogoPage key="productos" clave="productos" />} />
          <Route path="/catalogos/clientes" element={<CatalogoPage key="clientes" clave="clientes" />} />
          <Route path="/catalogos/zonas" element={<CatalogoPage key="zonas" clave="zonas" />} />
          <Route path="/catalogos/tipos-sector" element={<CatalogoPage key="tipos-sector" clave="tipos-sector" />} />
          <Route path="/catalogos/vehiculos" element={<CatalogoPage key="vehiculos" clave="vehiculos" />} />
          <Route path="/catalogos/tipos-incidencia" element={<CatalogoPage key="tipos-incidencia" clave="tipos-incidencia" />} />
          <Route path="/catalogos/motivos-devolucion" element={<CatalogoPage key="motivos-devolucion" clave="motivos-devolucion" />} />
          <Route path="/catalogos/tipos-residuo" element={<CatalogoPage key="tipos-residuo" clave="tipos-residuo" />} />
          <Route path="/catalogos/gestores-residuo" element={<CatalogoPage key="gestores-residuo" clave="gestores-residuo" />} />
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
