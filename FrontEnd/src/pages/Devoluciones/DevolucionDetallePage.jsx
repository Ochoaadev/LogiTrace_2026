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
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from '@/components/ui/AlertDialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogAction, DialogCancel } from '@/components/ui/Dialog'
import { DataTable, createTableColumns } from '@/components/ui/Table'
import { Skeleton, SkeletonTable, SkeletonCard } from '@/components/ui/Skeleton'
import { usePermissions } from '@/hooks/usePermissions'
import { useDevolucion, useProcesarDevolucion } from '@/services/query/useDevoluciones'
import { usePedidos } from '@/services/query/usePedidos'
import { useIncidencias } from '@/services/query/useIncidencias'
import { devolucionService } from '@/services/devolucionService'
import { getEstadoConfig, ESTADOS_DEVOLUCION, getSiguientesEstados, getEstadoProductoConfig, getDecisionConfig } from '@/schemas/devolucionSchema'
import { cn } from '@/lib/utils'
import {
  RotateCcw, Truck, PackageCheck, ClipboardCheck, CheckCircle,
  MoreHorizontal, Calendar, Clock, User, XCircle,
  AlertTriangle, CheckCircle2, Package, ClipboardList,
  RotateCcw as RotateCcwIcon, Trash2
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const ESTADO_TRANSITIONS = {
  SOLICITADA: ['EN_TRASLADO', 'CANCELADA'],
  EN_TRASLADO: ['RECIBIDA', 'SOLICITADA', 'CANCELADA'],
  RECIBIDA: ['EVALUADA', 'EN_TRASLADO', 'CANCELADA'],
  EVALUADA: ['CERRADA', 'RECIBIDA'],
  CERRADA: [],
  CANCELADA: [],
}

const ICONOS_ESTADO = {
  SOLICITADA: RotateCcwIcon,
  EN_TRASLADO: Truck,
  RECIBIDA: PackageCheck,
  EVALUADA: ClipboardCheck,
  CERRADA: CheckCircle2,
  CANCELADA: XCircle,
}

export default function DevolucionDetallePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { can } = usePermissions()
  const { user } = useAuth()

  const { data: devolucion, isLoading, error, refetch } = useDevolucion(id)
  const { data: pedidos } = usePedidos({ page: 1, limit: 50 })
  const { data: incidencias } = useIncidencias({ page: 1, limit: 10 })

  const procesarDevolucion = useProcesarDevolucion()

  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelMotivo, setCancelMotivo] = useState('')
  const [showEvaluarDialog, setShowEvaluarDialog] = useState(false)
  const [evaluacionData, setEvaluacionData] = useState({
    detalles: [],
    observaciones: '',
  })

  const devolucionData = devolucion?.data
  const currentEstado = devolucionData?.estado
  const allowedNextStates = ESTADO_TRANSITIONS[currentEstado] || []

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Detalle de Devolución</h1>
            <p className="text-gray-600 mt-1">Cargando...</p>
          </div>
        </div>
        <SkeletonCard />
      </div>
    )
  }

  if (error || !devolucionData) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 mx-auto text-danger mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Devolución no encontrada</h2>
        <Button className="mt-4" onClick={() => navigate('/devoluciones')}>Volver a lista</Button>
      </div>
    )
  }

  const handleEstadoChange = async (nuevoEstado) => {
    try {
      await procesarDevolucion.mutateAsync({ id, accion: nuevoEstado.toLowerCase().replace('_', '-'), observaciones: '' })
      refetch()
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const handleCancel = async () => {
    if (!cancelMotivo.trim()) return
    try {
      await procesarDevolucion.mutateAsync({ id, accion: 'cancelar', observaciones: cancelMotivo })
      refetch()
      setShowCancelDialog(false)
      setCancelMotivo('')
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const handleEvaluar = async () => {
    if (!evaluacionData.detalles.length) return
    try {
      await procesarDevolucion.mutateAsync({ id, accion: 'evaluar', observaciones: evaluacionData.observaciones, detalles: evaluacionData.detalles })
      refetch()
      setShowEvaluarDialog(false)
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const getEstadoIcon = (estado) => ICONOS_ESTADO[estado] || RotateCcwIcon

  const formatFecha = (fecha) => fecha ? new Date(fecha).toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }) : '—'

  const timelineEvents = [
    { estado: 'SOLICITADA', label: 'Solicitada', fecha: devolucionData.fechaRegistro, user: devolucionData.solicitadoPor },
    { estado: 'EN_TRASLADO', label: 'En Traslado', fecha: devolucionData.fechaTraslado, user: devolucionData.trasladadoPor },
    { estado: 'RECIBIDA', label: 'Recibida', fecha: devolucionData.fechaRecepcion, user: devolucionData.recibidoPor },
    { estado: 'EVALUADA', label: 'Evaluada', fecha: devolucionData.fechaEvaluacion, user: devolucionData.evaluadoPor },
    { estado: 'CERRADA', label: 'Cerrada', fecha: devolucionData.fechaCierre, user: devolucionData.cerradoPor },
  ].filter(e => e.fecha)

  const ICONOS_ESTADO = {
    SOLICITADA: RotateCcwIcon,
    EN_TRASLADO: Truck,
    RECIBIDA: PackageCheck,
    EVALUADA: ClipboardCheck,
    CERRADA: CheckCircle2,
    CANCELADA: XCircle,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{devolucionData.codigo}</h1>
            <Badge variant={getEstadoConfig(currentEstado).color} className="text-sm">
              {getEstadoConfig(currentEstado).label}
            </Badge>
          </div>
          <p className="text-gray-600 mt-1">
            Despacho: {devolucionData.despachoPedido?.despacho?.codigo || '—'} · 
            Pedido: {devolucionData.despachoPedido?.pedido?.codigo || '—'} · 
            Cliente: {devolucionData.despachoPedido?.pedido?.cliente?.razonSocial || devolucionData.despachoPedido?.pedido?.cliente?.nombre || '—'}
          </p>
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
                  disabled={procesarDevolucion.isPending}
                >
                  {getEstadoConfig(estado).label}
                </DropdownMenuItem>
              ))}
              {allowedNextStates.length === 0 && (
                <DropdownMenuItem className="text-gray-400 cursor-not-allowed">
                  Flujo completado
                </DropdownMenuItem>
              )}
              {currentEstado === 'RECIBIDA' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      setEvaluacionData({ detalles: devolucionData.detalles?.map(d => ({ ...d, estadoProducto: 'APTO_PARA_VENTA', decision: 'REINGRESO' })) || [], observaciones: '' })
                      setShowEvaluarDialog(true)
                    }}
                    disabled={procesarDevolucion.isPending}
                  >
                    <ClipboardCheck className="h-4 w-4" /> Evaluar Productos
                  </DropdownMenuItem>
                </>
              )}
              {currentEstado !== 'CANCELADA' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setShowCancelDialog(true)}
                    disabled={procesarDevolucion.isPending}
                    className="text-danger focus:text-danger"
                  >
                    <XCircle className="h-4 w-4" /> Cancelar Devolución
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="sm" onClick={() => navigate('/devoluciones')}>Volver</Button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Motivo</p><p className="font-medium text-gray-900">{devolucionData.motivo?.nombre || '—'}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Registrada</p><p className="font-medium text-gray-900">{formatFecha(devolucionData.fechaRegistro)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Recibida</p><p className="font-medium text-gray-900">{formatFecha(devolucionData.fechaRecepcion) || 'Pendiente'}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Cerrada</p><p className="font-medium text-gray-900">{formatFecha(devolucionData.fechaCierre) || 'Pendiente'}</p></CardContent></Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="productos">Productos ({devolucionData.detalles?.length || 0})</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="evaluacion">Evaluación</TabsTrigger>
          <TabsTrigger value="incidencia">Incidencia</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Datos Generales</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <dt className="text-gray-500">Código</dt><dd className="font-mono font-medium">{devolucionData.codigo}</dd>
                  <dt className="text-gray-500">Estado</dt><dd><Badge variant={getEstadoConfig(currentEstado).color}>{getEstadoConfig(currentEstado).label}</Badge></dd>
                  <dt className="text-gray-500">Motivo</dt><dd>{devolucionData.motivo?.nombre || '—'}</dd>
                  <dt className="text-gray-500">Despacho</dt><dd>{devolucionData.despachoPedido?.despacho?.codigo || '—'}</dd>
                  <dt className="text-gray-500">Pedido</dt><dd>{devolucionData.despachoPedido?.pedido?.codigo || '—'}</dd>
                  <dt className="text-gray-500">Cliente</dt><dd>{devolucionData.despachoPedido?.pedido?.cliente?.razonSocial || devolucionData.despachoPedido?.pedido?.cliente?.nombre || '—'}</dd>
                  <dt className="text-gray-500">Registrada</dt><dd>{formatFecha(devolucionData.fechaRegistro)}</dd>
                  <dt className="text-gray-500">Recibida</dt><dd>{formatFecha(devolucionData.fechaRecepcion) || 'Pendiente'}</dd>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Observaciones</CardTitle></CardHeader>
              <CardContent>
                <p className="text-gray-600 whitespace-pre-wrap">{devolucionData.observaciones || 'Sin observaciones'}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="productos">
          <Card>
            <CardContent className="p-0">
              {devolucionData.detalles?.length ? (
                <DataTable
                  columns={createTableColumns([
                    { accessorKey: 'producto', header: 'Producto', cell: (_, row) => row.original.detallePedido?.producto?.nombre || '—' },
                    { accessorKey: 'lote', header: 'Lote', cell: (_, row) => row.original.lote?.codigo || '—' },
                    { accessorKey: 'cantidad', header: 'Cantidad', cell: (val) => <span className="font-mono">{val}</span> },
                    { accessorKey: 'unidad', header: 'Unidad' },
                    { accessorKey: 'estadoProducto', header: 'Estado Producto', cell: (val) => <Badge variant={getEstadoProductoConfig(val).color}>{getEstadoProductoConfig(val).label}</Badge> },
                    { accessorKey: 'decision', header: 'Decisión', cell: (val) => val ? <Badge variant={getDecisionConfig(val).color}>{getDecisionConfig(val).label}</Badge> : <span className="text-gray-400">Pendiente</span> },
                  ])}
                  data={devolucionData.detalles}
                  keyField="id"
                  showPagination={false}
                />
              ) : (
                <div className="p-8 text-center text-gray-500">Sin productos en la devolución</div>
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
                  const isPast = ESTADOS_DEVOLUCION.findIndex(e => e.value === event.estado) <= ESTADOS_DEVOLUCION.findIndex(e => e.value === currentEstado)
                  const Icon = ICONOS_ESTADO[event.estado] || RotateCcwIcon
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

        <TabsContent value="evaluacion">
          <Card>
            <CardHeader><CardTitle>Evaluación de Calidad</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {devolucionData.detalles?.length ? (
                <>
                  <p className="text-sm text-gray-600">Evalúe cada producto retornado para determinar su destino</p>
                  <DataTable
                    columns={createTableColumns([
                      { accessorKey: 'producto', header: 'Producto', cell: (_, row) => row.original.detallePedido?.producto?.nombre || '—' },
                      { accessorKey: 'lote', header: 'Lote', cell: (_, row) => row.original.lote?.codigo || '—' },
                      { accessorKey: 'cantidad', header: 'Cantidad', cell: (val) => <span className="font-mono">{val}</span> },
                      { accessorKey: 'estadoProducto', header: 'Estado', cell: (val) => <Badge variant={getEstadoProductoConfig(val).color}>{getEstadoProductoConfig(val).label}</Badge> },
                      { accessorKey: 'decision', header: 'Decisión', cell: (val) => val ? <Badge variant={getDecisionConfig(val).color}>{getDecisionConfig(val).label}</Badge> : <span className="text-gray-400">Pendiente</span> },
                    ])}
                    data={devolucionData.detalles}
                    keyField="id"
                    showPagination={false}
                  />
                  <div className="pt-4 border-t">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones de evaluación</label>
                    <Textarea
                      value={evaluacionData.observaciones}
                      onChange={e => setEvaluacionData(prev => ({ ...prev, observaciones: e.target.value }))}
                      placeholder="Observaciones generales de la evaluación..."
                      rows={3}
                      className="w-full"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowEvaluarDialog(false)}>Cancelar</Button>
                    <Button onClick={handleEvaluar} disabled={procesarDevolucion.isPending || !evaluacionData.detalles.length}>
                      {procesarDevolucion.isPending ? 'Evaluando...' : 'Confirmar Evaluación'}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <Package className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                  <p>Sin productos para evaluar</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="incidencia">
          <Card>
            <CardContent className="p-0">
              {devolucionData.incidencia ? (
                <DataTable
                  columns={createTableColumns([
                    { accessorKey: 'codigo', header: 'Código' },
                    { accessorKey: 'tipoIncidencia', header: 'Tipo', cell: (_, row) => row.original.tipoIncidencia?.nombre || '—' },
                    { accessorKey: 'estado', header: 'Estado', cell: (val) => <Badge variant={getEstadoConfig(val).color}>{getEstadoConfig(val).label}</Badge> },
                    { accessorKey: 'fechaCreacion', header: 'Fecha', cell: (val) => formatFecha(val) },
                  ])}
                  data={[devolucionData.incidencia]}
                  keyField="id"
                  showPagination={false}
                />
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <AlertTriangle className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                  <p>Sin incidencia asociada</p>
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
            <AlertDialogTitle>Cancelar Devolución</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Motivo *</label>
            <Textarea value={cancelMotivo} onChange={e => setCancelMotivo(e.target.value)} placeholder="Motivo..." rows={3} className="w-full" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setShowCancelDialog(false); setCancelMotivo('') }}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} disabled={procesarDevolucion.isPending || !cancelMotivo.trim()}>
              {procesarDevolucion.isPending ? 'Cancelando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Evaluar Dialog */}
      <Dialog open={showEvaluarDialog} onOpenChange={setShowEvaluarDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Evaluar Productos Retornados</DialogTitle>
            <DialogDescription>Indique el estado y decisión para cada producto retornado</DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[60vh] overflow-y-auto">
            {devolucionData.detalles?.map((detalle, index) => {
                return (
                  <div key={detalle.id} className="border-b pb-4 last:border-0">
                    <div className="flex items-center gap-3 mb-3">
                      <Package className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium">{detalle.detallePedido?.producto?.nombre || 'Producto'}</p>
                        <p className="text-sm text-gray-500">Lote: {detalle.lote?.codigo || '—'} · Cantidad: {detalle.cantidad} {detalle.unidad}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Select value={evaluacionData.detalles[index]?.estadoProducto || 'APTO_PARA_VENTA'} onValueChange={v => setEvaluacionData(prev => ({ ...prev, detalles: prev.detalles.map((d, i) => i === index ? { ...d, estadoProducto: v } : d) }))}>
                        <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
                        <SelectContent>
                          {ESTADOS_PRODUCTO.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={evaluacionData.detalles[index]?.decision || 'REINGRESO'} onValueChange={v => setEvaluacionData(prev => ({ ...prev, detalles: prev.detalles.map((d, i) => i === index ? { ...d, decision: v } : d) }))}>
                        <SelectTrigger><SelectValue placeholder="Decisión" /></SelectTrigger>
                        <SelectContent>
                          {DECISIONES_DEVOLUCION.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )
              }) }
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones generales</label>
              <Textarea value={evaluacionData.observaciones} onChange={e => setEvaluacionData(prev => ({ ...prev, observaciones: e.target.value }))} placeholder="Observaciones..." rows={3} className="w-full" />
            </div>
          </div>
          <DialogFooter>
            <DialogCancel onClick={() => setShowEvaluarDialog(false)}>Cancelar</DialogCancel>
            <DialogAction onClick={handleEvaluar} disabled={procesarDevolucion.isPending}>
              {procesarDevolucion.isPending ? 'Evaluando...' : 'Confirmar Evaluación'}
            </DialogAction>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Devolución</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Motivo *</label>
            <Textarea value={cancelMotivo} onChange={e => setCancelMotivo(e.target.value)} placeholder="Motivo..." rows={3} className="w-full" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setShowCancelDialog(false); setCancelMotivo('') }}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} disabled={procesarDevolucion.isPending || !cancelMotivo.trim()}>
              {procesarDevolucion.isPending ? 'Cancelando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function formatFecha(fecha) {
  return fecha ? new Date(fecha).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
}