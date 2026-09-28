import { useKPIs, usePedidosPorEstado, useTimelinePedidos, useTopClientes, useActividadReciente, useAlertas } from '@/services/query/useDashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton, SkeletonKPI } from '@/components/ui/Skeleton'
import {
  Package,
  Truck,
  AlertTriangle,
  RotateCcw,
  Users,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const KPI_CARDS = [
  { key: 'pedidosActivos', label: 'Pedidos Activos', icon: Package, color: 'primary' },
  { key: 'despachosEnRuta', label: 'Despachos En Ruta', icon: Truck, color: 'info' },
  { key: 'incidenciasAbiertas', label: 'Incidencias Abiertas', icon: AlertTriangle, color: 'warning' },
  { key: 'devolucionesPendientes', label: 'Devoluciones Pendientes', icon: RotateCcw, color: 'danger' },
]

const ICON_COLORS = {
  primary: 'bg-primary-light text-primary',
  info: 'bg-info-light text-info',
  warning: 'bg-warning-light text-warning',
  danger: 'bg-danger-light text-danger',
  success: 'bg-success-light text-success',
}

const ESTADO_LABELS = {
  REGISTRADO: 'Registrado',
  EN_PREPARACION: 'En Preparación',
  LISTO_PARA_DESPACHO: 'Listo para Despacho',
  EN_RUTA: 'En Ruta',
  ENTREGADO: 'Entregado',
  CON_INCIDENCIA: 'Con Incidencia',
  DEVUELTO: 'Devuelto',
  CERRADO: 'Cerrado',
  CANCELADO: 'Cancelado',
}

const ESTADO_COLORS = {
  REGISTRADO: 'bg-gray-100 text-gray-700',
  EN_PREPARACION: 'bg-info-light text-info',
  LISTO_PARA_DESPACHO: 'bg-primary-light text-primary',
  EN_RUTA: 'bg-warning-light text-warning',
  ENTREGADO: 'bg-success-light text-success',
  CON_INCIDENCIA: 'bg-danger-light text-danger',
  DEVUELTO: 'bg-gray-100 text-gray-700',
  CERRADO: 'bg-gray-100 text-gray-500',
  CANCELADO: 'bg-danger-light text-danger',
}

const ACTIVIDAD_ICONS = {
  PEDIDO: Package,
  DESPACHO: Truck,
  INCIDENCIA: AlertTriangle,
  DEVOLUCION: RotateCcw,
  INVENTARIO: Users,
}

export default function DashboardPage() {
  const { data: kpis, isLoading: kpisLoading } = useKPIs()
  const { data: pedidosPorEstado, isLoading: estadoLoading } = usePedidosPorEstado()
  const { data: timeline, isLoading: timelineLoading } = useTimelinePedidos(30)
  const { data: topClientes, isLoading: topLoading } = useTopClientes(5)
  const { data: actividad, isLoading: actividadLoading } = useActividadReciente(10)
  const { data: alertas, isLoading: alertasLoading } = useAlertas()

  const loading = kpisLoading || estadoLoading || timelineLoading || topLoading || actividadLoading

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Resumen operativo de SuperTequeños</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Actualizado hace un momento</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_CARDS.map((kpi) => (
          <Card key={kpi.key}>
            <CardContent className="p-4">
              {kpisLoading ? (
                <SkeletonKPI />
              ) : (
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">{kpi.label}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {kpis?.[kpi.key] ?? 0}
                    </p>
                  </div>
                  <div className={cn('h-12 w-12 rounded-lg flex items-center justify-center', ICON_COLORS[kpi.color])}>
                    <kpi.icon className="h-6 w-6" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pedidos por Estado - Donut Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Pedidos por Estado
            </CardTitle>
          </CardHeader>
          <CardContent>
            {estadoLoading ? (
              <Skeleton className="h-64 w-full" variant="rectangular" />
            ) : (
              <div className="h-64 flex items-center justify-center">
                <PedidosEstadoChart data={pedidosPorEstado} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alertas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              Alertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alertasLoading ? (
              <Skeleton className="h-64 w-full" variant="rectangular" />
            ) : (
              <div className="space-y-3">
                {alertas?.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="h-12 w-12 mx-auto text-success mb-2" />
                    <p>No hay alertas activas</p>
                  </div>
                ) : (
                  alertas?.slice(0, 5).map((alerta) => (
                    <div
                      key={alerta.id}
                      className={cn(
                        'p-3 rounded-lg border flex items-start gap-3',
                        alerta.severity === 'critical' && 'border-danger-light bg-danger-light/50',
                        alerta.severity === 'warning' && 'border-warning-light bg-warning-light/50',
                        alerta.severity === 'info' && 'border-info-light bg-info-light/50'
                      )}
                    >
                      <div className={cn('h-2 w-2 rounded-full mt-1.5 flex-shrink-0',
                        alerta.severity === 'critical' && 'bg-danger',
                        alerta.severity === 'warning' && 'bg-warning',
                        alerta.severity === 'info' && 'bg-info'
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{alerta.title}</p>
                        <p className="text-xs text-gray-500">{alerta.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timeline Pedidos */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Pedidos Últimos 30 Días
            </CardTitle>
          </CardHeader>
          <CardContent>
            {timelineLoading ? (
              <Skeleton className="h-64 w-full" variant="rectangular" />
            ) : (
              <div className="h-64 flex items-end justify-center gap-2 px-2">
                <TimelineChart data={timeline} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Clientes & Actividad Reciente */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Top 5 Clientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topLoading ? (
                <Skeleton className="h-48 w-full" variant="rectangular" />
              ) : (
                <div className="space-y-3">
                  {topClientes?.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No hay datos</p>
                  ) : (
                    topClientes?.map((cliente, index) => (
                      <div key={cliente.clienteId || index} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="h-6 w-6 rounded-full bg-primary-light text-primary flex items-center justify-center text-xs font-medium">
                            {index + 1}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{cliente.clienteNombre}</p>
                            <p className="text-xs text-gray-500">{cliente.count} pedidos</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Actividad Reciente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {actividadLoading ? (
                <Skeleton className="h-48 w-full" variant="rectangular" />
              ) : (
                <div className="space-y-3">
                  {actividad?.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">Sin actividad reciente</p>
                  ) : (
                    actividad?.map((act) => (
                      <div key={act.id} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                        <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0',
                          act.tipo === 'PEDIDO' && 'bg-primary-light text-primary',
                          act.tipo === 'DESPACHO' && 'bg-info-light text-info',
                          act.tipo === 'INCIDENCIA' && 'bg-warning-light text-warning',
                          act.tipo === 'DEVOLUCION' && 'bg-danger-light text-danger',
                          act.tipo === 'INVENTARIO' && 'bg-success-light text-success'
                        )}>
                          {(() => {
                            const Icon = ACTIVIDAD_ICONS[act.tipo] || Package
                            return <Icon className="h-4 w-4" />
                          })()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{act.descripcion}</p>
                          <p className="text-xs text-gray-500">{act.fecha}</p>
                        </div>
                        {act.usuario && <span className="text-xs text-gray-400">{act.usuario}</span>}
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// Simple Donut Chart using SVG
function PedidosEstadoChart({ data }) {
  if (!data?.length) return <div className="text-center text-gray-500 py-8">Sin datos</div>

  const total = data.reduce((sum, d) => sum + (d.count || 0), 0)
  const colors = ['#0f62fe', '#198038', '#f1c21b', '#da1e28', '#8d8d8d', '#525252', '#0043ce', '#3d3d3d']
  let startAngle = -90

  return (
    <div className="flex flex-col items-center justify-center gap-4 w-full">
      <div className="relative w-48 h-48">
        <svg viewBox="0 0 120 120" className="w-full h-full transform -rotate-90">
          {data.map((item, index) => {
            const percentage = total > 0 ? (item.count / total) * 100 : 0
            const angle = (percentage / 100) * 360
            const endAngle = startAngle + angle
            const largeArc = angle > 180 ? 1 : 0

            const startX = 60 + 50 * Math.cos((startAngle * Math.PI) / 180)
            const startY = 60 + 50 * Math.sin((startAngle * Math.PI) / 180)
            const endX = 60 + 50 * Math.cos((endAngle * Math.PI) / 180)
            const endY = 60 + 50 * Math.sin((endAngle * Math.PI) / 180)

            startAngle = endAngle

            return (
              <path
                key={item.estado}
                d={`M 60 60 L ${startX} ${startY} A 50 50 0 ${largeArc} 1 ${endX} ${endY} Z`}
                fill={colors[index % colors.length]}
                opacity={0.8}
              />
            )
          })}
          <circle cx="60" cy="60" r="30" fill="white" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{total}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-2 text-xs">
        {data.map((item, index) => (
          <span key={item.estado} className="flex items-center gap-1">
            <span className="h-2 w-2 rounded" style={{ backgroundColor: colors[index % colors.length] }} />
            <span className="text-gray-600">{ESTADO_LABELS[item.estado] || item.estado} ({item.count})</span>
          </span>
        ))}
      </div>
    </div>
  )
}

// Simple Bar Chart using SVG
function TimelineChart({ data }) {
  if (!data?.length) return <div className="text-center text-gray-500 py-8 w-full">Sin datos</div>

  const maxValue = Math.max(...data.map((d) => d.count || 0))
  const barWidth = 8

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="timelineGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0f62fe" />
          <stop offset="100%" stopColor="#0f62fe" stopOpacity="0.3" />
        </linearGradient>
      </defs>
      {data.map((item, index) => {
        const height = maxValue > 0 ? (item.count / maxValue) * 80 : 0
        const x = (index / Math.max(data.length - 1, 1)) * 90 + 5
        return (
          <rect
            key={item.fecha}
            x={x}
            y={100 - height - 10}
            width={barWidth}
            height={height}
            fill="url(#timelineGradient)"
            rx={2}
            ry={2}
          />
        )
      })}
    </svg>
  )
}