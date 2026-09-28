import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { FormField } from '@/components/ui/FormField'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/DropdownMenu'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogAction, DialogCancel } from '@/components/ui/Dialog'
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from '@/components/ui/AlertDialog'
import { DataTable, createTableColumns, getCoreRowModel, getSortedRowModel, getPaginationRowModel } from '@/components/ui/Table'
import { Skeleton, SkeletonTable, SkeletonCard } from '@/components/ui/Skeleton'
import { usePermissions } from '@/hooks/usePermissions'
import { usePedido, useUpdateEstadoPedido, useCancelPedido, useAsignarDespacho } from '@/services/query/usePedidos'
import { useDespachos } from '@/services/query/useDespachos'
import { useIncidencias } from '@/services/query/useIncidencias'
import { useDevoluciones } from '@/services/query/useDevoluciones'
import { pedidoService } from '@/services/pedidoService'
import { getEstadoConfig, getPrioridadConfig, ESTADOS_PEDIDO } from '@/schemas/pedidoSchema'
import { cn } from '@/lib/utils'
import {
  Package, Truck, AlertTriangle, RotateCcw,
  MoreHorizontal, Calendar, MapPin, Flag,
  Clock, User, MapPin as MapPinIcon,
  Eye, Edit, Trash2, ArrowRight, CheckCircle,
  XCircle, AlertCircle, RotateCcw as RotateCcwIcon,
  Plus, Loader2, ChevronDown
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const ESTADO_TRANSITIONS = {
  REGISTRADO: ['EN_PREPARACION', 'CANCELADO'],
  EN_PREPARACION: ['LISTO_PARA_DESPACHO', 'CANCELADO'],
  LISTO_PARA_DESPACHO: ['EN_RUTA', 'EN_PREPARACION', 'CANCELADO'],
  EN_RUTA: ['ENTREGADO', 'CON_INCIDENCIA', 'DEVUELTO'],
  ENTREGADO: ['CERRADO'],
  CON_INCIDENCIA: ['EN_RUTA', 'DEVUELTO', 'CANCELADO'],
  DEVUELTO: ['REGISTRADO', 'CANCELADO'],
  CERRADO: [],
  CANCELADO: [],
}

const ICONOS_ESTADO = {
  REGISTRADO: Package,
  EN_PREPARACION: Package,
  LISTO_PARA_DESPACHO: Truck,
  EN_RUTA: Truck,
  ENTREGADO: CheckCircle,
  CON_INCIDENCIA: AlertCircle,
  DEVUELTO: RotateCcwIcon,
  CERRADO: CheckCircle,
  CANCELADO: XCircle,
}

export default function PedidoDetallePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { can } = usePermissions()
  const { user } = useAuth()

  const { data: pedido, isLoading, error, refetch } = usePedido(id)
  const { data: despachos } = useDespachos({ page: 1, limit: 10 })
  const { data: incidencias } = useIncidencias({ page: 1, limit: 10 })
  const { data: devoluciones } = useDevoluciones({ page: 1, limit: 10 })

  const updateEstado = useUpdateEstadoPedido()
  const cancelPedido = useCancelPedido()
  const asignarDespacho = useAsignarDespacho()

  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelMotivo, setCancelMotivo] = useState('')
  const [showAsignarDialog, setShowAsignarDialog] = useState(false)
  const [despachoId, setDespachoId] = useState('')

  const pedidoData = pedido?.data
  const currentEstado = pedidoData?.estado
  const allowedNextStates = ESTADO_TRANSITIONS[currentEstado] || []

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Detalle del Pedido</h1>
            <p className="text-gray-600 mt-1">Cargando...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <SkeletonKPI key={i} />)}
        </div>
        <SkeletonCard />
      </div>
    )
  }

  if (error || !pedidoData) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto text-danger mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Pedido no encontrado</h2>
        <p className="text-gray-600 mt-2">El pedido solicitado no existe o no tienes permisos para verlo</p>
        <Button className="mt-4" onClick={() => navigate('/pedidos')}>Volver a lista</Button>
      </div>
    )
  }

  const handleEstadoChange = async (nuevoEstado) => {
    try {
      await updateEstado.mutateAsync({ id, estado: nuevoEstado })
      refetch()
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const handleCancel = async () => {
    if (!cancelMotivo.trim()) return
    try {
      await cancelPedido.mutateAsync({ id, motivo: cancelMotivo })
      refetch()
      setShowCancelDialog(false)
      setCancelMotivo('')
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const handleAsignarDespacho = async () => {
    if (!despachoId) return
    try {
      await asignarDespacho.mutateAsync({ id, despachoId })
      refetch()
      setShowAsignarDialog(false)
      setDespachoId('')
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const getEstadoIcon = (estado) => {
    return ICONOS_ESTADO[estado] || Package
  }

  const formatFecha = (fecha) => fecha ? new Date(fecha).toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }) : '—'

  const timelineEvents = [
    { estado: 'REGISTRADO', label: 'Registrado', fecha: pedidoData.fechaCreacion, user: pedidoData.creadoPor },
    { estado: 'EN_PREPARACION', label: 'En Preparación', fecha: pedidoData.fechaPreparacion, user: pedidoData.preparadoPor },
    { estado: 'LISTO_PARA_DESPACHO', label: 'Listo para Despacho', fecha: pedidoData.fechaListo, user: pedidoData.listadoPor },
    { estado: 'EN_RUTA', label: 'En Ruta', fecha: pedidoData.fechaSalida, user: pedidoData.repartidor?.nombre },
    { estado: 'ENTREGADO', label: 'Entregado', fecha: pedidoData.fechaEntrega, user: pedidoData.entregadoPor },
    { estado: 'CERRADO', label: 'Cerrado', fecha: pedidoData.fechaCierre, user: pedidoData.cerradoPor },
  ].filter(e => e.fecha)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{pedidoData.codigo}</h1>
            <Badge variant={getEstadoConfig(currentEstado).color} className="text-sm">
              {getEstadoConfig(currentEstado).label}
            </Badge>
            <Badge variant={getPrioridadConfig(pedidoData.prioridad).color}>
              {getPrioridadConfig(pedidoData.prioridad).label}
            </Badge>
          </div>
          <p className="text-gray-600 mt-1">Cliente: {pedidoData.cliente?.razonSocial || pedidoData.cliente?.nombre || '—'}</p>
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
                  Sin transiciones disponibles
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowAsignarDialog(true)}
                disabled={!can('pedidos.assign_despacho') || asignarDespacho.isPending}
              >
                <Truck className="h-4 w-4" /> Asignar Despacho
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowCancelDialog(true)}
                disabled={!can('pedidos.cancel') || cancelPedido.isPending}
                className="text-danger focus:text-danger"
              >
                <XCircle className="h-4 w-4" /> Cancelar Pedido
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="sm" onClick={() => navigate('/pedidos')}>
            Volver
          </Button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Creado</p>
            <p className="font-medium text-gray-900">{formatFecha(pedidoData.fechaCreacion)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Entrega Solicitada</p>
            <p className="font-medium text-gray-900">{pedidoData.fechaEntregaSolicitada ? new Date(pedidoData.fechaEntregaSolicitada).toLocaleDateString('es-ES') : 'No especificada'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total Productos</p>
            <p className="font-medium text-gray-900">
              {pedidoData.detalles?.reduce((sum, d) => sum + d.cantidad, 0) || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Subtotal</p>
            <p className="font-medium text-gray-900">
              ${pedidoData.detalles?.reduce((sum, d) => sum + d.cantidad * d.precioUnitario, 0).toLocaleString('es-ES', { minimumFractionDigits: 2 }) || '0.00'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="productos">Productos</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="despachos">Despachos</TabsTrigger>
          <TabsTrigger value="incidencias">Incidencias</TabsTrigger>
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Datos Generales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <dt className="text-gray-500">Código</dt>
                  <dd className="font-mono font-medium">{pedidoData.codigo}</dd>
                  <dt className="text-gray-500">Estado</dt>
                  <dd><Badge variant={getEstadoConfig(currentEstado).color}>{getEstadoConfig(currentEstado).label}</Badge></dd>
                  <dt className="text-gray-500">Prioridad</dt>
                  <dd><Badge variant={getPrioridadConfig(pedidoData.prioridad).color}>{getPrioridadConfig(pedidoData.prioridad).label}</Badge></dd>
                  <dt className="text-gray-500">Cliente</dt>
                  <dd>{pedidoData.cliente?.razonSocial || pedidoData.cliente?.nombre || '—'}</dd>
                  <dt className="text-gray-500">Documento</dt>
                  <dd>{pedidoData.cliente?.documento || '—'}</dd>
                  <dt className="text-gray-500">Zona</dt>
                  <dd>{pedidoData.zona?.nombre || '—'}</dd>
                  <dt className="text-gray-500">Fecha Creación</dt>
                  <dd>{formatFecha(pedidoData.fechaCreacion)}</dd>
                  <dt className="text-gray-500">Entrega Solicitada</dt>
                  <dd>{pedidoData.fechaEntregaSolicitada ? new Date(pedidoData.fechaEntregaSolicitada).toLocaleDateString('es-ES') : 'No especificada'}</dd>
                  <dt className="text-gray-500">Entrega Real</dt>
                  <dd>{formatFecha(pedidoData.fechaEntrega)}</dd>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Observaciones</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 whitespace-pre-wrap">{pedidoData.observaciones || 'Sin observaciones'}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Productos Tab */}
        <TabsContent value="productos">
          <Card>
            <CardContent className="p-0">
              {pedidoData.detalles?.length ? (
                <DataTable
                  columns={createTableColumns([
                    { accessorKey: 'producto', header: 'Producto', cell: (_, row) => row.original.producto?.nombre || '—' },
                    { accessorKey: 'cantidad', header: 'Cantidad', cell: (val) => <span className="font-mono">{val}</span> },
                    { accessorKey: 'precioUnitario', header: 'P. Unit.', cell: (val) => `$${Number(val).toLocaleString('es-ES', { minimumFractionDigits: 2 })}` },
                    { accessorKey: 'subtotal', header: 'Subtotal', cell: (_, row) => `$${(Number(row.original.cantidad) * Number(row.original.precioUnitario)).toLocaleString('es-ES', { minimumFractionDigits: 2 })}` },
                  ])}
                  data={pedidoData.detalles.map(d => ({ ...d, subtotal: d.cantidad * d.precioUnitario }))}
                  keyField="id"
                  showPagination={false}
                  sortable={false}
                />
              ) : (
                <div className="p-8 text-center text-gray-500">Sin productos</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline">
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
                {timelineEvents.map((event, index) => {
                  const isCurrent = event.estado === currentEstado
                  const isPast = ESTADOS_PEDIDO.findIndex(e => e.value === event.estado) <= ESTADOS_PEDIDO.findIndex(e => e.value === currentEstado)
                  const Icon = ICONOS_ESTADO[event.estado] || Package
                  const config = getEstadoConfig(event.estado)

                  return (
                    <div key={event.estado} className="relative pl-16 pb-8 last:pb-0">
                      <div className={cn(
                        'absolute left-6 w-3 h-3 rounded-full border-2 flex items-center justify-center',
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

        {/* Despachos Tab */}
        <TabsContent value="despachos">
          <Card>
            <CardContent className="p-0">
              {despachos?.data?.length ? (
                <DataTable
                  columns={createTableColumns([
                    { accessorKey: 'codigo', header: 'Código' },
                    { accessorKey: 'estado', header: 'Estado', cell: (val) => <Badge variant={getEstadoConfig(val).color}>{getEstadoConfig(val).label}</Badge> },
                    { accessorKey: 'repartidor', header: 'Repartidor', cell: (_, row) => row.original.repartidor?.nombre || '—' },
                    { accessorKey: 'vehiculo', header: 'Vehículo', cell: (_, row) => row.original.vehiculo?.placa || '—' },
                    { accessorKey: 'fechaSalida', header: 'Salida', cell: (val) => formatFecha(val) },
                  ])}
                  data={despachos.data}
                  keyField="id"
                  onRowClick={(row) => navigate(`/despachos/${row.id}`)}
                  showPagination={false}
                />
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <Truck className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                  <p>No hay despachos asociados</p>
                  {can('pedidos.assign_despacho') && (
                    <Button className="mt-4" onClick={() => setShowAsignarDialog(true)}>
                      <Plus className="h-4 w-4 mr-1" /> Asignar Despacho
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Incidencias Tab */}
        <TabsContent value="incidencias">
          <Card>
            <CardContent className="p-0">
              {incidencias?.data?.length ? (
                <DataTable
                  columns={createTableColumns([
                    { accessorKey: 'codigo', header: 'Código' },
                    { accessorKey: 'tipo', header: 'Tipo', cell: (_, row) => row.original.tipoIncidencia?.nombre || '—' },
                    { accessorKey: 'estado', header: 'Estado', cell: (val) => <Badge variant={getEstadoConfig(val).color}>{getEstadoConfig(val).label}</Badge> },
                    { accessorKey: 'fechaCreacion', header: 'Fecha', cell: (val) => formatFecha(val) },
                  ])}
                  data={incidencias.data}
                  keyField="id"
                  onRowClick={(row) => navigate(`/incidencias/${row.id}`)}
                  showPagination={false}
                />
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <AlertTriangle className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                  <p>Sin incidencias registradas</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Cancel Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Pedido</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El pedido quedará marcado como cancelado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de cancelación *</label>
            <Textarea
              value={cancelMotivo}
              onChange={e => setCancelMotivo(e.target.value)}
              placeholder="Escriba el motivo..."
              rows={3}
              className="w-full"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setShowCancelDialog(false); setCancelMotivo('') }}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} disabled={cancelPedido.isPending || !cancelMotivo.trim()}>
              {cancelPedido.isPending ? 'Cancelando...' : 'Confirmar Cancelación'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Asignar Despacho Dialog */}
      <Dialog open={showAsignarDialog} onOpenChange={setShowAsignarDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar Despacho</DialogTitle>
            <DialogDescription>Seleccione un despacho disponible para este pedido</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={despachoId} onValueChange={setDespachoId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar despacho..." />
              </SelectTrigger>
              <SelectContent>
                {despachos?.data?.filter(d => ['PREPARACION', 'LISTO_PARA_DESPACHO'].includes(d.estado))
                  .map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.codigo} - {d.repartidor?.nombre || 'Sin repartidor'} ({d.estado})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <DialogCancel onClick={() => { setShowAsignarDialog(false); setDespachoId('') }}>Cancelar</DialogCancel>
            <DialogAction onClick={handleAsignarDespacho} disabled={asignarDespacho.isPending || !despachoId}>
              {asignarDespacho.isPending ? 'Asignando...' : 'Asignar'}
            </DialogAction>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}