import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { DataTable, createTableColumns, getCoreRowModel, getSortedRowModel, getFilteredRowModel, getPaginationRowModel } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Separator } from '@/components/ui/Separator'
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from '@/components/ui/AlertDialog'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/DropdownMenu'
import { Skeleton, SkeletonTable } from '@/components/ui/Skeleton'
import { usePermissions } from '@/hooks/usePermissions'
import { usePedidos, useUpdateEstadoPedido, useCancelPedido, useAsignarDespacho } from '@/services/query/usePedidos'
import { useDespachos } from '@/services/query/useDespachos'
import { useClientes } from '@/services/query/useCatalogos'
import { useZonas } from '@/services/query/useCatalogos'
import {
  Plus, Search, Filter, X, ChevronDown,
  Package, Truck, AlertTriangle, RotateCcw,
  MoreHorizontal, Calendar, MapPin, Flag
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getEstadoConfig, getPrioridadConfig, ESTADOS_PEDIDO, PRIORIDADES } from '@/schemas/pedidoSchema'

const ESTADO_OPTIONS = ESTADOS_PEDIDO.map(e => ({ value: e.value, label: e.label }))
const PRIORIDAD_OPTIONS = PRIORIDADES.map(p => ({ value: p.value, label: p.label }))

export default function PedidosPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { can } = usePermissions()

  const [filters, setFilters] = useState({
    search: '',
    estado: [],
    prioridad: [],
    clienteId: '',
    zonaId: '',
    fechaDesde: '',
    fechaHasta: '',
  })
  const [pagination, setPagination] = useState({ page: 1, limit: 10 })
  const [selection, setSelection] = useState([])
  const [filtersOpen, setFiltersOpen] = useState(false)

  const { data: pedidosData, isLoading, error, refetch } = usePedidos(filters, pagination)
  const { data: clientes } = useClientes({ page: 1, limit: 100 })
  const { data: zonas } = useZonas({ page: 1, limit: 100 })
  const { data: despachos } = useDespachos({ page: 1, limit: 100 })

  const updateEstado = useUpdateEstadoPedido()
  const cancelPedido = useCancelPedido()
  const asignarDespacho = useAsignarDespacho()

  const pedidos = pedidosData?.data || []
  const totalPages = pedidosData?.totalPages || 1
  const totalItems = pedidosData?.total || 0

  const columns = useMemo(() => createTableColumns([
    {
      accessorKey: 'codigo',
      header: 'Código',
      cell: (val, row) => (
        <span className="font-mono text-sm font-medium">{val}</span>
      ),
    },
    {
      accessorKey: 'cliente',
      header: 'Cliente',
      cell: (_, row) => row.original.cliente?.razonSocial || row.original.cliente?.nombre || '—',
    },
    {
      accessorKey: 'estado',
      header: 'Estado',
      cell: (val) => {
        const config = getEstadoConfig(val)
        return (
          <Badge variant={config.color}>{config.label}</Badge>
        )
      },
    },
    {
      accessorKey: 'prioridad',
      header: 'Prioridad',
      cell: (val) => {
        const config = getPrioridadConfig(val)
        return (
          <Badge variant={config.color}>{config.label}</Badge>
        )
      },
    },
    {
      accessorKey: 'fechaCreacion',
      header: 'Creado',
      cell: (val) => val ? new Date(val).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—',
    },
    {
      accessorKey: 'fechaEntregaSolicitada',
      header: 'Entrega Solic.',
      cell: (val) => val ? new Date(val).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—',
    },
  ]), [])

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const clearFilters = () => {
    setFilters({
      search: '', estado: [], prioridad: [], clienteId: '', zonaId: '', fechaDesde: '', fechaHasta: ''
    })
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const hasActiveFilters = useMemo(() =>
    filters.search || filters.estado.length > 0 || filters.prioridad.length > 0 ||
    filters.clienteId || filters.zonaId || filters.fechaDesde || filters.fechaHasta, [filters])

  const handleRowClick = (row) => {
    navigate(`/pedidos/${row.id}`)
  }

  const handleEstadoChange = async (pedido, nuevoEstado) => {
    try {
      await updateEstado.mutateAsync({ id: pedido.id, estado: nuevoEstado })
      queryClient.invalidateQueries({ queryKey: ['pedidos'] })
    } catch (err) {
      console.error('Error actualizando estado:', err)
    }
  }

  const handleCancelar = async (pedido) => {
    const motivo = prompt('Motivo de cancelación:')
    if (!motivo) return
    try {
      await cancelPedido.mutateAsync({ id: pedido.id, motivo })
      queryClient.invalidateQueries({ queryKey: ['pedidos'] })
    } catch (err) {
      console.error('Error cancelando:', err)
    }
  }

  const handleAsignarDespacho = async (pedido) => {
    const despachoId = prompt('ID del despacho:')
    if (!despachoId) return
    try {
      await asignarDespacho.mutateAsync({ id: pedido.id, despachoId })
      queryClient.invalidateQueries({ queryKey: ['pedidos'] })
    } catch (err) {
      console.error('Error asignando:', err)
    }
  }

  const bulkActions = [
    {
      label: 'Cambiar a En Preparación',
      action: () => selection.forEach(p => handleEstadoChange(p, 'EN_PREPARACION')),
      disabled: !can('pedidos.edit'),
    },
    {
      label: 'Cambiar a Listo para Despacho',
      action: () => selection.forEach(p => handleEstadoChange(p, 'LISTO_PARA_DESPACHO')),
      disabled: !can('pedidos.edit'),
    },
    {
      label: 'Cancelar seleccionados',
      action: () => selection.forEach(p => handleCancelar(p)),
      disabled: !can('pedidos.cancel'),
      variant: 'danger',
    },
  ]

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
            <p className="text-gray-600 mt-1">Gestión de pedidos de SuperTequeños</p>
          </div>
          <Button disabled> <Plus className="h-4 w-4 mr-2" /> Nuevo Pedido </Button>
        </div>
        <Card><CardContent><SkeletonTable rows={5} columns={6} /></CardContent></Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-gray-600 mt-1">Gestión de pedidos de SuperTequeños</p>
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" /> Limpiar filtros
            </Button>
          )}
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" /> Filtros
                {hasActiveFilters && <span className="ml-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">*</span>}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 sm:w-96 p-0">
              <SheetHeader className="p-4 border-b">
                <SheetTitle>Filtros de búsqueda</SheetTitle>
              </SheetHeader>
              <div className="p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
                  <Input
                    placeholder="Código, cliente, observaciones..."
                    value={filters.search}
                    onChange={e => handleFilterChange('search', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <Select
                    value={filters.estado.join(',')}
                    onValueChange={v => handleFilterChange('estado', v ? v.split(',').filter(Boolean) : [])}
                    multiple
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los estados" />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTADO_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
                  <Select
                    value={filters.prioridad.join(',')}
                    onValueChange={v => handleFilterChange('prioridad', v ? v.split(',').filter(Boolean) : [])}
                    multiple
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas las prioridades" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORIDAD_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                  <Select value={filters.clienteId} onValueChange={v => handleFilterChange('clienteId', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los clientes" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes?.data?.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.razonSocial || c.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Zona</label>
                  <Select value={filters.zonaId} onValueChange={v => handleFilterChange('zonaId', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas las zonas" />
                    </SelectTrigger>
                    <SelectContent>
                      {zonas?.data?.map(z => (
                        <SelectItem key={z.id} value={z.id}>{z.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha desde</label>
                    <Input type="date" value={filters.fechaDesde} onChange={e => handleFilterChange('fechaDesde', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha hasta</label>
                    <Input type="date" value={filters.fechaHasta} onChange={e => handleFilterChange('fechaHasta', e.target.value)} />
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          {can('pedidos.create') && (
            <Button onClick={() => navigate('/pedidos/nuevo')}>
              <Plus className="h-4 w-4 mr-2" /> Nuevo Pedido
            </Button>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
        <span>{totalItems} pedidos en total</span>
        {hasActiveFilters && <span className="text-primary font-medium">Filtros activos</span>}
        <span>Página {pagination.page} de {totalPages}</span>
      </div>

      {/* Bulk Actions */}
      {selection.length > 0 && (
        <Card className="border-primary bg-primary-light/10">
          <CardContent className="p-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-primary">{selection.length} seleccionados</span>
            <div className="flex items-center gap-2">
              {bulkActions.map((action, i) => (
                <Button
                  key={i}
                  variant={action.variant === 'danger' ? 'danger' : 'outline'}
                  size="sm"
                  onClick={action.action}
                  disabled={action.disabled || updateEstado.isPending || cancelPedido.isPending}
                >
                  {action.label}
                </Button>
              ))}
              <Button variant="ghost" size="sm" onClick={() => setSelection([])}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={pedidos}
            keyField="id"
            onRowClick={handleRowClick}
            selection={{ enabled: true, onChange: setSelection }}
            sortable
            filterable
            pagination
            pageSize={pagination.limit}
            showPagination
            loading={isLoading}
            emptyMessage="No se encontraron pedidos"
          />
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <select
            value={pagination.limit}
            onChange={e => { setPagination({ page: 1, limit: Number(e.target.value) }) }}
            className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm"
          >
            {[10, 25, 50, 100].map(size => (
              <option key={size} value={size}>{size} por página</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
            disabled={pagination.page === 1}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
            disabled={pagination.page >= totalPages}
          >
            <ChevronDown className="h-4 w-4 rotate-180" />
          </Button>
        </div>
      </div>
    </div>
  )
}