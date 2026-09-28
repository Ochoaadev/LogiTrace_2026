import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogAction, DialogCancel } from '@/components/ui/Dialog'
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from '@/components/ui/AlertDialog'
import { DataTable, createTableColumns } from '@/components/ui/Table'
import { Skeleton, SkeletonTable, SkeletonCard } from '@/components/ui/Skeleton'
import { usePermissions } from '@/hooks/usePermissions'
import { useInventario, useMovimientos, useAjustarStock, useCrearMovimiento, useGetLoteDetalle } from '@/services/query/useInventario'
import { useLotes } from '@/services/query/useCatalogos'
import { useUbicaciones } from '@/services/query/useCatalogos'
import { getTipoMovimientoConfig, getEstadoLoteConfig, TIPOS_MOVIMIENTO } from '@/schemas/inventarioSchema'
import { cn } from '@/lib/utils'
import {
  Package, Warehouse, ArrowDown, ArrowUp, Minus, RotateCcw,
  ArrowRightLeft, Trash2, MoreHorizontal, Calendar, Clock,
  AlertTriangle, CheckCircle, XCircle, Plus, AlertCircle
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const TIPO_OPTIONS = TIPOS_MOVIMIENTO.map(t => ({ value: t.value, label: t.label }))

export default function MovimientoDetallePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { can } = usePermissions()
  const { user } = useAuth()

  const { data: lote, isLoading: loteLoading, error: loteError } = useGetLoteDetalle(id)
  const { data: movimientosData, isLoading: movLoading } = useMovimientos({ loteId: id }, { page: 1, limit: 20 })

  const crearMovimiento = useCrearMovimiento()
  const ajustarStock = useAjustarStock()

  const [showAjusteDialog, setShowAjusteDialog] = useState(false)
  const [ajusteData, setAjusteData] = useState({
    cantidad: '',
    observaciones: '',
  })
  const [showMovimientoDialog, setShowMovimientoDialog] = useState(false)
  const [movimientoData, setMovimientoData] = useState({
    tipo: 'AJUSTE',
    cantidad: 1,
    ubicacionOrigenId: '',
    ubicacionDestinoId: '',
    observaciones: '',
    referenciaTipo: '',
    referenciaId: '',
  })

  const loteData = lote?.data
  const currentStock = loteData?.inventarios?.[0]?.stockActual || 0
  const ubicacionActual = loteData?.inventarios?.[0]?.ubicacion

  const movimientos = movimientosData?.data || []

  if (loteLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Detalle de Lote</h1>
            <p className="text-gray-600 mt-1">Cargando...</p>
          </div>
        </div>
        <SkeletonCard />
      </div>
    )
  }

  if (loteError || !loteData) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto text-danger mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Lote no encontrado</h2>
        <Button className="mt-4" onClick={() => navigate('/inventario')}>Volver a inventario</Button>
      </div>
    )
  }

  const handleCrearMovimiento = async (e) => {
    e.preventDefault()
    try {
      await crearMovimiento.mutateAsync({ ...movimientoData, loteId: id, ubicacionOrigenId: movimientoData.tipo === 'TRASLADO' ? movimientoData.ubicacionOrigenId : undefined, ubicacionDestinoId: movimientoData.tipo !== 'ENTRADA' ? movimientoData.ubicacionDestinoId : undefined })
      setShowMovimientoDialog(false)
      setMovimientoData({ tipo: 'AJUSTE', cantidad: 1, ubicacionOrigenId: '', ubicacionDestinoId: '', observaciones: '', referenciaTipo: '', referenciaId: '' })
      queryClient.invalidateQueries({ queryKey: ['inventario', 'movimientos', id] })
      queryClient.invalidateQueries({ queryKey: ['inventario', 'detalle', id] })
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const handleAjuste = async (e) => {
    e.preventDefault()
    if (!ajusteData.cantidad) return
    try {
      await ajustarStock.mutateAsync({ loteId: id, ubicacionId: ubicacionActual?.id, cantidadNueva: parseInt(ajusteData.cantidad), observaciones: ajusteData.observaciones })
      setShowAjusteDialog(false)
      setAjusteData({ cantidad: '', observaciones: '' })
      queryClient.invalidateQueries({ queryKey: ['inventario', 'detalle', id] })
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const getTipoConfig = (tipo) => getTipoMovimientoConfig(tipo)

  const formatFecha = (fecha) => fecha ? new Date(fecha).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

  if (!loteData) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto text-danger mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Lote no encontrado</h2>
        <Button className="mt-4" onClick={() => navigate('/inventario')}>Volver a inventario</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{loteData.codigo}</h1>
            <Badge variant={getEstadoLoteConfig(loteData.estadoCalidad).color}>{getEstadoLoteConfig(loteData.estadoCalidad).label}</Badge>
          </div>
          <p className="text-gray-600 mt-1">Producto: {loteData.producto?.nombre || '—'} · {loteData.unidadBase}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setShowAjusteDialog(true)}>
            <Minus className="h-4 w-4 mr-1" /> Ajustar Stock
          </Button>
          <Button onClick={() => setShowMovimientoDialog(true)}>
            <Plus className="h-4 w-4 mr-1" /> Nuevo Movimiento
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate('/inventario')}>
            Volver
          </Button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Stock Actual</p><p className="font-medium text-gray-900 text-2xl">{currentStock} {loteData.unidadBase}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Ubicación</p><p className="font-medium text-gray-900">{ubicacionActual?.nombre || 'Sin ubicación'}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Stock Mínimo</p><p className="font-medium text-gray-900">{loteData.inventarios?.[0]?.stockMinimo || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-gray-500">Vencimiento</p><p className="font-medium text-gray-900">{loteData.fechaVencimiento ? new Date(loteData.fechaVencimiento).toLocaleDateString('es-ES') : 'Sin fecha'}</p></CardContent></Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="movimientos" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="movimientos">Movimientos ({movimientos.length})</TabsTrigger>
          <TabsTrigger value="kardex">Kardex</TabsTrigger>
          <TabsTrigger value="alertas">Alertas</TabsTrigger>
        </TabsList>

        <TabsContent value="movimientos">
          <Card>
            <CardContent className="p-0">
              {movimientos.length ? (
                <DataTable
                  columns={createTableColumns([
                    {
                      accessorKey: 'tipo',
                      header: 'Tipo',
                      cell: (val) => {
                        const config = getTipoConfig(val)
                        return <Badge variant={config.color} className="gap-1"><config.icon className="h-3 w-3" /> {config.label}</Badge>
                      },
                    },
                    {
                      accessorKey: 'cantidad',
                      header: 'Cantidad',
                      cell: (val) => <span className="font-mono text-sm">{val}</span>,
                    },
                    {
                      accessorKey: 'ubicacionOrigen',
                      header: 'Origen',
                      cell: (_, row) => row.original.ubicacionOrigen?.nombre || '—',
                    },
                    {
                      accessorKey: 'ubicacionDestino',
                      header: 'Destino',
                      cell: (_, row) => row.original.ubicacionDestino?.nombre || '—',
                    },
                    {
                      accessorKey: 'fechaHora',
                      header: 'Fecha',
                      cell: (val) => formatFecha(val),
                    },
                    {
                      accessorKey: 'usuario',
                      header: 'Usuario',
                      cell: (_, row) => row.original.usuario?.nombre || '—',
                    },
                  ])}
                  data={movimientos}
                  keyField="id"
                  showPagination={false}
                />
              ) : (
                <div className="p-8 text-center text-gray-500">Sin movimientos registrados</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kardex">
          <Card>
            <CardContent className="p-0">
              {movimientos.length ? (
                <DataTable
                  columns={createTableColumns([
                    { accessorKey: 'fechaHora', header: 'Fecha', cell: (val) => formatFecha(val) },
                    { accessorKey: 'tipo', header: 'Tipo', cell: (val) => <Badge variant={getTipoConfig(val).color} className="gap-1"><config.icon className="h-3 w-3" /> {config.label}</Badge> },
                    { accessorKey: 'cantidad', header: 'Entrada', cell: (val, row) => row.original.tipo === 'ENTRADA' || row.original.tipo === 'REINGRESO' || (row.original.tipo === 'TRASLADO' && row.original.ubicacionDestinoId) ? val : '—' },
                    { accessorKey: 'cantidad', header: 'Salida', cell: (val, row) => row.original.tipo === 'SALIDA' || row.original.tipo === 'DESCARTE' || (row.original.tipo === 'TRASLADO' && row.original.ubicacionOrigenId) ? val : '—' },
                    { accessorKey: 'saldo', header: 'Saldo', cell: (_, row) => <span className="font-mono font-medium">{row.original.saldo || '—'}</span> },
                    { accessorKey: 'ubicacionOrigen', header: 'Origen', cell: (_, row) => row.original.ubicacionOrigen?.nombre || '—' },
                    { accessorKey: 'ubicacionDestino', header: 'Destino', cell: (_, row) => row.original.ubicacionDestino?.nombre || '—' },
                    { accessorKey: 'observaciones', header: 'Observaciones' },
                  ])}
                  data={movimientos.map((m, i) => ({ ...m, saldo: movimientos.slice(0, i + 1).reduce((acc, mv) => {
                    if (['ENTRADA', 'REINGRESO'].includes(mv.tipo) || (mv.tipo === 'TRASLADO' && mv.ubicacionDestinoId)) return acc + mv.cantidad
                    if (['SALIDA', 'DESCARTE'].includes(mv.tipo) || (mv.tipo === 'TRASLADO' && mv.ubicacionOrigenId)) return acc - mv.cantidad
                    if (mv.tipo === 'AJUSTE') return mv.cantidad
                    return acc
                  }, 0) })).reverse()}
                  keyField="id"
                  showPagination={false}
                />
              ) : (
                <div className="p-8 text-center text-gray-500">Sin datos para kardex</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alertas">
          <Card>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-warning">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">Alertas de Stock</span>
              </div>
              <div className="space-y-2">
                {[
                  { tipo: 'Stock bajo', condicion: 'stockActual <= stockMinimo', icon: AlertTriangle },
                  { tipo: 'Próximo a vencer', condicion: 'fechaVencimiento <= 30 días', icon: AlertCircle },
                  { tipo: 'Vencido', condicion: 'fechaVencimiento < hoy', icon: XCircle },
                ].map(alerta => (
                  <div key={alerta.tipo} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <alerta.icon className="h-5 w-5 text-warning" />
                      <span className="font-medium">{alerta.tipo}</span>
                    </div>
                    <span className="text-sm text-gray-500">Verificar manualmente</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function formatFecha(fecha) {
  return fecha ? new Date(fecha).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
}