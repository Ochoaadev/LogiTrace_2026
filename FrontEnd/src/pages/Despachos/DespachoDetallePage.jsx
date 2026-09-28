import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/DropdownMenu'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogAction, DialogCancel } from '@/components/ui/Dialog'
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from '@/components/ui/AlertDialog'
import { DataTable, createTableColumns } from '@/components/ui/Table'
import { Skeleton, SkeletonTable, SkeletonCard } from '@/components/ui/Skeleton'
import { usePermissions } from '@/hooks/usePermissions'
import { useDespacho, useUpdateEstadoDespacho, useAsignarRepartidor } from '@/services/query/useDespachos'
import { usePedidos } from '@/services/query/usePedidos'
import { useIncidencias } from '@/services/query/useIncidencias'
import { despachoService } from '@/services/despachoService'
import { getEstadoConfig, FLUJO_COLUMNAS, getSiguientesEstados } from '@/schemas/despachoSchema'
import { cn } from '@/lib/utils'
import {
  Package, Truck, MapPin, AlertCircle, RotateCcw,
  MoreHorizontal, Calendar, Clock, User, CheckCircle,
  XCircle, AlertCircle as AlertCircleIcon, RotateCcw as RotateCcwIcon,
  GripVertical, ArrowRight, MapPin as MapPinIcon
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const ESTADO_TRANSITIONS = {
  PREPARACION: ['LISTO_PARA_DESPACHO', 'CANCELADO'],
  LISTO_PARA_DESPACHO: ['EN_RUTA', 'PREPARACION', 'CANCELADO'],
  EN_RUTA: ['ENTREGADO', 'CON_INCIDENCIA', 'DEVUELTO'],
  ENTREGADO: [],
  CON_INCIDENCIA: ['EN_RUTA', 'DEVUELTO', 'CANCELADO'],
  DEVUELTO: ['PREPARACION', 'CANCELADO'],
  CANCELADO: [],
}

const ICONOS_ESTADO = {
  PREPARACION: Package,
  LISTO_PARA_DESPACHO: Truck,
  EN_RUTA: MapPin,
  ENTREGADO: CheckCircle,
  CON_INCIDENCIA: AlertCircleIcon,
  DEVUELTO: RotateCcwIcon,
  CANCELADO: XCircle,
}

export default function DespachoDetallePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { can } = usePermissions()
  const { user } = useAuth()

  const { data: despacho, isLoading, error, refetch } = useDespacho(id)
  const { data: pedidos } = usePedidos({ page: 1, limit: 50 })
  const { data: incidencias } = useIncidencias({ page: 1, limit: 10 })

  const updateEstado = useUpdateEstadoDespacho()
  const asignarRepartidor = useAsignarRepartidor()

  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelMotivo, setCancelMotivo] = useState('')
  const [showAsignarDialog, setShowAsignarDialog] = useState(false)
  const [repartidorId, setRepartidorId] = useState('')

  const despachoData = despacho?.data
  const currentEstado = despachoData?.estado
  const allowedNextStates = ESTADO_TRANSITIONS[currentEstado] || []

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Detalle del Despacho</h1>
            <p className="text-gray-600 mt-1">Cargando...</p>
          </div>
        </div>
        <SkeletonCard />
      </div>
    )
  }

  if (error || !despachoData) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto text-danger mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Despacho no encontrado</h2>
        <Button className="mt-4" onClick={() => navigate('/despachos')}>Volver a lista</Button>
      </div>
    )
  }

  const handleEstadoChange = async (nuevoEstado) => {
    try {
      await updateEstado.mutateAsync({ id, estado: nuevoEstado, observaciones: '' })
      refetch()
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const handleCancel = async () => {
    if (!cancelMotivo.trim()) return
    try {
      await updateEstado.mutateAsync({ id, estado: 'CANCELADO', observaciones: cancelMotivo })
      refetch()
      setShowCancelDialog(false)
      setCancelMotivo('')
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const handleAsignarRepartidor = async () => {
    if (!repartidorId) return
    try {
      await asignarRepartidor.mutateAsync({ id, repartidorId })
      refetch()
      setShowAsignarDialog(false)
      setRepartidorId('')
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const getEstadoIcon = (estado) => ICONOS_ESTADO[estado] || Truck

  const formatFecha = (fecha) => fecha ? new Date(fecha).toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }) : '—'

  const timelineEvents = [
    { estado: 'PREPARACION', label: 'Preparación', fecha: despachoData.fechaPreparacion, user: despachoData.preparadoPor },
    { estado: 'LISTO_PARA_DESPACHO', label: 'Listo para Despacho', fecha: despachoData.fechaListo, user: despachoData.listadoPor },
    { estado: 'EN_RUTA', label: 'En Ruta', fecha: despachoData.fechaSalida, user: despachoData.repartidor?.nombre },
    { estado: 'ENTREGADO', label: 'Entregado', fecha: despachoData.fechaEntrega, user: despachoData.entregadoPor },
  ].filter(e => e.fecha)

  const pedidosDespacho = pedidos?.data?.filter(p => p.despachoId === id) || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{despachoData.codigo}</h1>
            <Badge variant={getEstadoConfig(currentEstado).color} className="text-sm">
              {getEstadoConfig(currentEstado).label}
            </Badge>
            <Badge variant={getEstadoConfig(despachoData.prioridad).color}>
              {getEstadoConfig(despachoData.prioridad).label}
            </Badge>
          </div>
          <p className="text-gray-600 mt-1">Repartidor: {despachoData.repartidor?.nombre || 'Sin asignar'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4 mr-1" /> Acciones
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Cambiar Estado</DropdownMenuLabel>
              {allowedNextStates.map(estado => (
                <DropdownMenuItem
                  key={estado}
                  onClick={() => handleEstadoChange(estado)}
                  disabled={updateEstado.isPending}
                >
                  {getEstadoConfig(estado).label}
                </DropdownMenuItem>
              ))}
              {allowedNextStates.length === 0 && (
                <DropdownMenuItem className="text-gray-400 cursor-not-allowed">
                  Flujo completado
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowAsignarDialog(true)}
                disabled={!can('despachos.assign_repartidor') || asignarRepartidor.isPending}
              >
                <User className="h-4 w-4" /> Asignar Repartidor
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowCancelDialog(true)}
                disabled={!can('despachos.cancel') || updateEstado.isPending}
                className="text-danger focus:text-danger"
              >
                <XCircle className="h-4 w-4" /> Cancelar Despacho
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="sm" onClick={() => navigate('/despachos')}>Volver</Button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Salida</p><p className="font-medium text-gray-900">{formatFecha(despachoData.fechaSalida)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Llegada Estimada</p><p className="font-medium text-gray-900">{formatFecha(despachoData.fechaLlegadaEstimada)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Entrega Real</p><p className="font-medium text-gray-900">{formatFecha(despachoData.fechaEntrega)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Pedidos</p><p className="font-medium text-gray-900">{pedidosDespacho.length}</p></CardContent></Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="pedidos">Pedidos ({pedidosDespacho.length})</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="incidencias">Incidencias</TabsTrigger>
          <TabsTrigger value="tracking">Tracking</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Datos Generales</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <dt className="text-gray-500">Código</dt><dd className="font-mono font-medium">{despachoData.codigo}</dd>
                  <dt className="text-gray-500">Estado</dt><dd><Badge variant={getEstadoConfig(currentEstado).color}>{getEstadoConfig(currentEstado).label}</Badge></dd>
                  <dt className="text-gray-500">Repartidor</dt><dd>{despachoData.repartidor?.nombre || 'Sin asignar'}</dd>
                  <dt className="text-gray-500">Vehículo</dt><dd>{despachoData.vehiculo?.placa || '—'}</dd>
                  <dt className="text-gray-500">Ruta</dt><dd>{despachoData.ruta?.nombre || '—'}</dd>
                  <dt className="text-gray-500">Salida</dt><dd>{formatFecha(despachoData.fechaSalida)}</dd>
                  <dt className="text-gray-500">Llegada Estimada</dt><dd>{formatFecha(despachoData.fechaLlegadaEstimada)}</dd>
                  <dt className="text-gray-500">Entrega</dt><dd>{formatFecha(despachoData.fechaEntrega)}</dd>
                </dl>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Observaciones</CardTitle></CardHeader>
              <CardContent><p className="text-gray-600 whitespace-pre-wrap">{despachoData.observaciones || 'Sin observaciones'}</p></CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pedidos">
          <Card>
            <CardContent className="p-0">
              {pedidosDespacho.length ? (
                <DataTable
                  columns={createTableColumns([
                    { accessorKey: 'codigo', header: 'Código', cell: (val) => <span className="font-mono text-sm">{val}</span> },
                    { accessorKey: 'cliente', header: 'Cliente', cell: (_, row) => row.original.cliente?.razonSocial || '—' },
                    { accessorKey: 'estado', header: 'Estado', cell: (val) => <Badge variant={getEstadoConfig(val).color}>{getEstadoConfig(val).label}</Badge> },
                    { accessorKey: 'prioridad', header: 'Prioridad', cell: (val) => <Badge variant={getEstadoConfig(val).color}>{getEstadoConfig(val).label}</Badge> },
                  ])}
                  data={pedidosDespacho}
                  keyField="id"
                  onRowClick={(row) => navigate(`/pedidos/${row.id}`)}
                  showPagination={false}
                />
              ) : (
                <div className="p-8 text-center text-gray-500">Sin pedidos asignados</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
                {timelineEvents.map((event, index) => {
                  const isCurrent = event.estado === currentEstado
                  const isPast = FLUJO_COLUMNAS.findIndex(e => e.value === event.estado) <= FLUJO_COLUMNAS.findIndex(e => e.value === currentEstado)
                  const Icon = ICONOS_ESTADO[event.estado] || Truck
                  const config = getEstadoConfig(event.estado)

                  return (
                    <div key={event.estado} className="relative pl-16 pb-8 last:pb-0">
                      <div className={cn('absolute left-6 w-3 h-3 rounded-full border-2 flex items-center justify-center',
                        isPast ? `bg-${config.color} border-${config.color}` : 'bg-white border-gray-300',
                        isCurrent && 'ring-2 ring-offset-2 ring-primary'
                      )}>
                        {isPast && <CheckCircle className="h-2 w-2 text-white" />}
                        {!isPast && <Icon className={cn('h-2.5 w-2.5', `text-${config.color}`)} />}
                      </div>
                      <div className={cn('bg-gray-50 rounded-lg p-4', isCurrent ? 'ring-2 ring-primary ring-offset-2' : '')}>
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <p className={cn('font-medium', isCurrent ? 'text-primary' : 'text-gray-900')}>{event.label}</p>
                            <p className="text-sm text-gray-500">{formatFecha(event.fecha)}</p>
                            {event.user && <p className="text-xs text-gray-400 mt-1">Por: {event.user}</p>}
                          </div>
                          {isCurrent && <Badge variant="primary" className="self-start">Actual</Badge>}
                        </div>
                      </div>
                    </div>
                  )
                })}
                {timelineEvents.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                    <p>Sin eventos registrados aún</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="incidencias">
          <Card>
            <CardContent className="p-0">
              {incidencias?.data?.length ? (
                <DataTable
                  columns={createTableColumns([
                    { accessorKey: 'codigo', header: 'Código' },
                    { accessorKey: 'tipoIncidencia', header: 'Tipo', cell: (_, row) => row.original.tipoIncidencia?.nombre || '—' },
                    { accessorKey: 'estado', header: 'Estado', cell: (val) => <Badge variant={getEstadoConfig(val).color}>{getEstadoConfig(val).label}</Badge> },
                    { accessorKey: 'fechaCreacion', header: 'Fecha', cell: (val) => formatFecha(val) },
                  ])}
                  data={incidencias.data}
                  keyField="id"
                  onRowClick={(row) => navigate(`/incidencias/${row.id}`)}
                  showPagination={false}
                />
              ) : (
                <div className="p-8 text-center text-gray-500"><AlertCircle className="h-12 w-12 mx-auto text-gray-300 mb-2" /><p>Sin incidencias</p></div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tracking">
          <Card>
            <CardHeader><CardTitle>Tracking GPS (Próximamente)</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400">
                <MapPinIcon className="h-16 w-16" />
                <p className="ml-4">Mapa de ruta y tracking en tiempo real</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Cancel Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Despacho</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Motivo *</label>
            <Textarea value={cancelMotivo} onChange={e => setCancelMotivo(e.target.value)} placeholder="Motivo..." rows={3} className="w-full" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setShowCancelDialog(false); setCancelMotivo('') }}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} disabled={updateEstado.isPending || !cancelMotivo.trim()}>
              {updateEstado.isPending ? 'Cancelando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Asignar Repartidor Dialog */}
      <Dialog open={showAsignarDialog} onOpenChange={setShowAsignarDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Asignar Repartidor</DialogTitle><DialogDescription>Seleccione un repartidor disponible</DialogDescription></DialogHeader>
          <div className="py-4">
            <Select value={repartidorId} onValueChange={setRepartidorId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>
                {/* Repartidores se cargarían desde useRepartidores */}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <DialogCancel onClick={() => { setShowAsignarDialog(false); setRepartidorId('') }}>Cancelar</DialogCancel>
            <DialogAction onClick={handleAsignarRepartidor} disabled={asignarRepartidor.isPending || !repartidorId}>
              {asignarRepartidor.isPending ? 'Asignando...' : 'Asignar'}
            </DialogAction>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function formatFecha(fecha) {
  return fecha ? new Date(fecha).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
}