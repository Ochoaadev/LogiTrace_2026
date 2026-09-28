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
import { DataTable, createTableColumns } from '@/components/ui/Table'
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton'
import { usePermissions } from '@/hooks/usePermissions'
import { useIncidencia, useUpdateIncidencia, useResolverIncidencia } from '@/services/query/useIncidencias'
import { incidenciaService } from '@/services/incidenciaService'
import { getEstadoConfig, ESTADOS_INCIDENCIA, getSiguientesEstados } from '@/schemas/incidenciaSchema'
import { cn } from '@/lib/utils'
import {
  AlertTriangle, RotateCcw, Wrench, CheckCircle, XCircle,
  MoreHorizontal, Calendar, Clock, User, FileText,
  AlertCircle, CheckCircle2, MessageSquare, Search
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const ESTADO_TRANSITIONS = {
  REPORTADA: ['EN_REVISION', 'CANCELADA'],
  EN_REVISION: ['EN_ATENCION', 'REPORTADA', 'CANCELADA'],
  EN_ATENCION: ['RESUELTA', 'EN_REVISION'],
  RESUELTA: ['CERRADA', 'EN_ATENCION'],
  CERRADA: [],
  CANCELADA: [],
}

const ICONOS_ESTADO = {
  REPORTADA: AlertTriangle,
  EN_REVISION: Search,
  EN_ATENCION: Wrench,
  RESUELTA: CheckCircle2,
  CERRADA: CheckCircle,
  CANCELADA: XCircle,
}

export default function IncidenciaDetallePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { can } = usePermissions()
  const { user } = useAuth()

  const { data: incidencia, isLoading, error, refetch } = useIncidencia(id)

  const updateEstado = useUpdateIncidencia()
  const resolverIncidencia = useResolverIncidencia()

  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelMotivo, setCancelMotivo] = useState('')
  const [showResolverDialog, setShowResolverDialog] = useState(false)
  const [resolucion, setResolucion] = useState('')

  const incidenciaData = incidencia?.data
  const currentEstado = incidenciaData?.estado
  const allowedNextStates = ESTADO_TRANSITIONS[currentEstado] || []

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Detalle de Incidencia</h1>
            <p className="text-gray-600 mt-1">Cargando...</p>
          </div>
        </div>
        <SkeletonCard />
      </div>
    )
  }

  if (error || !incidenciaData) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto text-danger mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Incidencia no encontrada</h2>
        <Button className="mt-4" onClick={() => navigate('/incidencias')}>Volver a lista</Button>
      </div>
    )
  }

  const handleEstadoChange = async (nuevoEstado) => {
    try {
      await updateEstado.mutateAsync({ id, estado: nuevoEstado, resolucion: '' })
      refetch()
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const handleResolver = async () => {
    if (!resolucion.trim()) return
    try {
      await resolverIncidencia.mutateAsync({ id, resolucion })
      refetch()
      setShowResolverDialog(false)
      setResolucion('')
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const handleCancel = async () => {
    if (!cancelMotivo.trim()) return
    try {
      await updateEstado.mutateAsync({ id, estado: 'CANCELADA', resolucion: cancelMotivo })
      refetch()
      setShowCancelDialog(false)
      setCancelMotivo('')
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const getEstadoIcon = (estado) => ICONOS_ESTADO[estado] || AlertTriangle

  const formatFecha = (fecha) => fecha ? new Date(fecha).toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }) : '—'

  const timelineEvents = [
    { estado: 'REPORTADA', label: 'Reportada', fecha: incidenciaData.fechaCreacion, user: incidenciaData.reportadoPor },
    { estado: 'EN_REVISION', label: 'En Revisión', fecha: incidenciaData.fechaRevision, user: incidenciaData.revisadoPor },
    { estado: 'EN_ATENCION', label: 'En Atención', fecha: incidenciaData.fechaAtencion, user: incidenciaData.atendidoPor },
    { estado: 'RESUELTA', label: 'Resuelta', fecha: incidenciaData.fechaResolucion, user: incidenciaData.resueltoPor },
    { estado: 'CERRADA', label: 'Cerrada', fecha: incidenciaData.fechaCierre, user: incidenciaData.cerradoPor },
  ].filter(e => e.fecha)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{incidenciaData.codigo}</h1>
            <Badge variant={getEstadoConfig(currentEstado).color} className="text-sm">
              {getEstadoConfig(currentEstado).label}
            </Badge>
          </div>
          <p className="text-gray-600 mt-1">
            Pedido: {incidenciaData.pedido?.codigo || '—'} · 
            Cliente: {incidenciaData.pedido?.cliente?.razonSocial || incidenciaData.pedido?.cliente?.nombre || '—'}
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
                  disabled={updateEstado.isPending}
                >
                  {getEstadoConfig(estado).label}
                </DropdownMenuItem>
              ))}
              {currentEstado !== 'RESUELTA' && currentEstado !== 'CERRADA' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setShowResolverDialog(true)}
                    disabled={resolverIncidencia.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4" /> Marcar como Resuelta
                  </DropdownMenuItem>
                </>
              )}
              {currentEstado !== 'CANCELADA' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setShowCancelDialog(true)}
                    disabled={updateEstado.isPending}
                    className="text-danger focus:text-danger"
                  >
                    <XCircle className="h-4 w-4" /> Cancelar Incidencia
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="sm" onClick={() => navigate('/incidencias')}>Volver</Button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Tipo</p><p className="font-medium text-gray-900">{incidenciaData.tipoIncidencia?.nombre || '—'}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Prioridad</p><p className="font-medium text-gray-900">{incidenciaData.prioridad || '—'}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Creada</p><p className="font-medium text-gray-900">{formatFecha(incidenciaData.fechaCreacion)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Resuelta</p><p className="font-medium text-gray-900">{formatFecha(incidenciaData.fechaResolucion) || 'Pendiente'}</p></CardContent></Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="resolucion">Resolución</TabsTrigger>
          <TabsTrigger value="pedido">Pedido</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Datos Generales</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <dt className="text-gray-500">Código</dt><dd className="font-mono font-medium">{incidenciaData.codigo}</dd>
                  <dt className="text-gray-500">Estado</dt><dd><Badge variant={getEstadoConfig(currentEstado).color}>{getEstadoConfig(currentEstado).label}</Badge></dd>
                  <dt className="text-gray-500">Tipo</dt><dd>{incidenciaData.tipoIncidencia?.nombre || '—'}</dd>
                  <dt className="text-gray-500">Pedido</dt><dd>{incidenciaData.pedido?.codigo || '—'}</dd>
                  <dt className="text-gray-500">Cliente</dt><dd>{incidenciaData.pedido?.cliente?.razonSocial || incidenciaData.pedido?.cliente?.nombre || '—'}</dd>
                  <dt className="text-gray-500">Creada</dt><dd>{formatFecha(incidenciaData.fechaCreacion)}</dd>
                  <dt className="text-gray-500">Resuelta</dt><dd>{formatFecha(incidenciaData.fechaResolucion) || 'Pendiente'}</dd>
                  <dt className="text-gray-500">Cerrada</dt><dd>{formatFecha(incidenciaData.fechaCierre) || 'Pendiente'}</dd>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Descripción</CardTitle></CardHeader>
              <CardContent>
                <p className="text-gray-600 whitespace-pre-wrap">{incidenciaData.descripcion || 'Sin descripción'}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
                {timelineEvents.map((event, index) => {
                  const isCurrent = event.estado === currentEstado
                  const isPast = ESTADOS_INCIDENCIA.findIndex(e => e.value === event.estado) <= ESTADOS_INCIDENCIA.findIndex(e => e.value === currentEstado)
                  const Icon = ICONOS_ESTADO[event.estado] || AlertTriangle
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

        <TabsContent value="resolucion">
          <Card>
            <CardHeader><CardTitle>Resolución</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {incidenciaData.resolucion ? (
                <>
                  <p className="text-gray-600 whitespace-pre-wrap">{incidenciaData.resolucion}</p>
                  <div className="text-sm text-gray-500">
                    Resuelto por: {incidenciaData.resueltoPor || '—'} · {formatFecha(incidenciaData.fechaResolucion)}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                  <p>Sin resolución registrada</p>
                  <Button className="mt-4" onClick={() => setShowResolverDialog(true)}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Registrar Resolución
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pedido">
          <Card>
            <CardContent>
              {incidenciaData.pedido ? (
                <DataTable
                  columns={createTableColumns([
                    { accessorKey: 'codigo', header: 'Código', cell: (val) => <span className="font-mono text-sm">{val}</span> },
                    { accessorKey: 'cliente', header: 'Cliente', cell: (_, row) => row.original.cliente?.razonSocial || row.original.cliente?.nombre || '—' },
                    { accessorKey: 'estado', header: 'Estado', cell: (val) => <Badge variant={getEstadoConfig(val).color}>{getEstadoConfig(val).label}</Badge> },
                    { accessorKey: 'prioridad', header: 'Prioridad', cell: (val) => <Badge variant={getEstadoConfig(val).color}>{getEstadoConfig(val).label}</Badge> },
                    { accessorKey: 'fechaCreacion', header: 'Creado', cell: (val) => val ? new Date(val).toLocaleDateString('es-ES') : '—' },
                  ])}
                  data={[incidenciaData.pedido]}
                  keyField="id"
                  showPagination={false}
                />
              ) : (
                <div className="p-8 text-center text-gray-500">Sin pedido asociado</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Cancel Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Incidencia</AlertDialogTitle>
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

      {/* Resolver Dialog */}
      <AlertDialog open={showResolverDialog} onOpenChange={setShowResolverDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar como Resuelta</AlertDialogTitle>
            <AlertDialogDescription>Registre la solución aplicada</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Resolución *</label>
            <Textarea value={resolucion} onChange={e => setResolucion(e.target.value)} placeholder="Describa la solución..." rows={4} className="w-full" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setShowResolverDialog(false); setResolucion('') }}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleResolver} disabled={resolverIncidencia.isPending || !resolucion.trim()}>
              {resolverIncidencia.isPending ? 'Resolviendo...' : 'Confirmar Resolución'}
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