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
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/DropdownMenu'
import { Skeleton, SkeletonTable } from '@/components/ui/Skeleton'
import { usePermissions } from '@/hooks/usePermissions'
import { useDespachos, useFlujoOperativo, useUpdateEstadoDespacho, useAsignarRepartidor } from '@/services/query/useDespachos'
import { useRepartidores, useVehiculos, useRutas } from '@/services/query/useCatalogos'
import { getEstadoConfig, FLUJO_COLUMNAS } from '@/schemas/despachoSchema'
import { cn } from '@/lib/utils'
import {
  Plus, Search, Filter, X, ChevronDown, ChevronLeft, ChevronRight,
  Package, Truck, MapPin, Flag, Clock, User, MoreHorizontal,
  ArrowRight, Kanban
} from 'lucide-react'

const ESTADO_OPTIONS = FLUJO_COLUMNAS.map(e => ({ value: e.value, label: e.label }))

export default function DespachosPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { can } = usePermissions()

  const [filters, setFilters] = useState({
    search: '',
    estado: [],
    repartidorId: '',
    vehiculoId: '',
    rutaId: '',
    fechaDesde: '',
    fechaHasta: '',
  })
  const [pagination, setPagination] = useState({ page: 1, limit: 10 })
  const [selection, setSelection] = useState([])
  const [filtersOpen, setFiltersOpen] = useState(false)

  const { data: despachosData, isLoading, error } = useDespachos(filters, pagination)
  const { data: repartidores } = useRepartidores({ page: 1, limit: 100 })
  const { data: vehiculos } = useVehiculos({ page: 1, limit: 100 })
  const { data: rutas } = useRutas({ page: 1, limit: 100 })
  const { data: flujo } = useFlujoOperativo()

  const updateEstado = useUpdateEstadoDespacho()
  const asignarRepartidor = useAsignarRepartidor()

  const despachos = despachosData?.data || []
  const totalPages = despachosData?.totalPages || 1
  const totalItems = despachosData?.total || 0

  const columns = useMemo(() => createTableColumns([
    {
      accessorKey: 'codigo',
      header: 'Código',
      cell: (val) => <span className="font-mono text-sm font-medium">{val}</span>,
    },
    {
      accessorKey: 'repartidor',
      header: 'Repartidor',
      cell: (_, row) => row.original.repartidor?.nombre || 'Sin asignar',
    },
    {
      accessorKey: 'vehiculo',
      header: 'Vehículo',
      cell: (_, row) => row.original.vehiculo?.placa || '—',
    },
    {
      accessorKey: 'ruta',
      header: 'Ruta',
      cell: (_, row) => row.original.ruta?.nombre || '—',
    },
    {
      accessorKey: 'estado',
      header: 'Estado',
      cell: (val) => {
        const config = getEstadoConfig(val)
        return <Badge variant={config.color}>{config.label}</Badge>
      },
    },
    {
      accessorKey: 'fechaSalida',
      header: 'Salida',
      cell: (val) => val ? new Date(val).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—',
    },
    {
      accessorKey: 'fechaEntrega',
      header: 'Entrega',
      cell: (val) => val ? new Date(val).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—',
    },
  ]), [])

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const clearFilters = () => {
    setFilters({ search: '', estado: [], repartidorId: '', vehiculoId: '', rutaId: '', fechaDesde: '', fechaHasta: '' })
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const hasActiveFilters = useMemo(() =>
    filters.search || filters.estado.length > 0 || filters.repartidorId || filters.vehiculoId || filters.rutaId || filters.fechaDesde || filters.fechaHasta, [filters])

  const handleRowClick = (row) => {
    navigate(`/despachos/${row.id}`)
  }

  const handleEstadoChange = async (despacho, nuevoEstado) => {
    try {
      await updateEstado.mutateAsync({ id: despacho.id, estado: nuevoEstado, observaciones: '' })
      queryClient.invalidateQueries({ queryKey: ['despachos'] })
      queryClient.invalidateQueries({ queryKey: ['despachos', 'flujo-operativo'] })
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const handleAsignarRepartidor = async (despacho) => {
    const repartidorId = prompt('ID del repartidor:')
    if (!repartidorId) return
    try {
      await asignarRepartidor.mutateAsync({ id: despacho.id, repartidorId })
      queryClient.invalidateQueries({ queryKey: ['despachos'] })
    } catch (err) {
      console.error('Error:', err)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Despachos</h1>
            <p className="text-gray-600 mt-1">Gestión de despachos y flujo operativo</p>
          </div>
          <div className="flex gap-2">
            <Button disabled><Plus className="h-4 w-4 mr-2" /> Nuevo Despacho</Button>
            <Button variant="outline" onClick={() => navigate('/despachos/flujo')}>
              <Kanban className="h-4 w-4 mr-2" /> Flujo Operativo
            </Button>
          </div>
        </div>
        <Card><CardContent><SkeletonTable rows={5} columns={7} /></CardContent></Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Despachos</h1>
          <p className="text-gray-600 mt-1">Gestión de despachos y flujo operativo</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
                  <Input placeholder="Código, repartidor, vehículo..." value={filters.search} onChange={e => handleFilterChange('search', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <Select value={filters.estado.join(',')} onValueChange={v => handleFilterChange('estado', v ? v.split(',').filter(Boolean) : [])} multiple>
                    <SelectTrigger><SelectValue placeholder="Todos los estados" /></SelectTrigger>
                    <SelectContent>
                      {ESTADO_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Repartidor</label>
                  <Select value={filters.repartidorId} onValueChange={v => handleFilterChange('repartidorId', v)}>
                    <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      {repartidores?.data?.map(r => <SelectItem key={r.id} value={r.id}>{r.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehículo</label>
                  <Select value={filters.vehiculoId} onValueChange={v => handleFilterChange('vehiculoId', v)}>
                    <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      {vehiculos?.data?.map(v => <SelectItem key={v.id} value={v.id}>{v.placa} - {v.marca} {v.modelo}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ruta</label>
                  <Select value={filters.rutaId} onValueChange={v => handleFilterChange('rutaId', v)}>
                    <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                    <SelectContent>
                      {rutas?.data?.map(r => <SelectItem key={r.id} value={r.id}>{r.nombre}</SelectItem>)}
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
          <Button onClick={() => navigate('/despachos/nuevo')}>
            <Plus className="h-4 w-4 mr-2" /> Nuevo Despacho
          </Button>
          <Button variant="outline" onClick={() => navigate('/despachos/flujo')}>
            <Kanban className="h-4 w-4 mr-2" /> Flujo Operativo
          </Button>
        </div>
      </div>

      {/* Stats Bar + Resumen Flujo */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
        <span>{totalItems} despachos totales</span>
        {hasActiveFilters && <span className="text-primary font-medium">Filtros activos</span>}
        <span>Página {pagination.page} de {totalPages}</span>
      </div>

      {/* Flujo Resumen Cards */}
      {flujo && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {FLUJO_COLUMNAS.map((col) => {
            const count = flujo[col.value.toLowerCase()]?.length || 0
            const config = getEstadoConfig(col.value)
            return (
              <Card key={col.value} className="border-l-4" style={{ borderLeftColor: `var(--color-${config.color})` }}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={config.color}>{config.label}</Badge>
                  </div>
                  <span className="text-2xl font-bold text-gray-900">{count}</span>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={despachos}
            keyField="id"
            onRowClick={handleRowClick}
            selection={{ enabled: true, onChange: setSelection }}
            sortable
            filterable
            pagination
            pageSize={pagination.limit}
            showPagination
            loading={isLoading}
            emptyMessage="No se encontraron despachos"
          />
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <select value={pagination.limit} onChange={e => setPagination({ page: 1, limit: Number(e.target.value) })} className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm">
          {[10, 25, 50, 100].map(size => <option key={size} value={size}>{size} por página</option>)}
        </select>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))} disabled={pagination.page === 1}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))} disabled={pagination.page >= totalPages}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  )
}