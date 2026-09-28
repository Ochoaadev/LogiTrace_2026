import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { DataTable, createTableColumns } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Separator } from '@/components/ui/Separator'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/DropdownMenu'
import { Skeleton, SkeletonTable } from '@/components/ui/Skeleton'
import { usePermissions } from '@/hooks/usePermissions'
import { useInventario, useMovimientos, useAjustarStock } from '@/services/query/useInventario'
import { useProductos } from '@/services/query/useCatalogos'
import { useUbicaciones } from '@/services/query/useCatalogos'
import { useLotes } from '@/services/query/useCatalogos'
import { getTipoMovimientoConfig, getEstadoLoteConfig, TIPOS_MOVIMIENTO } from '@/schemas/inventarioSchema'
import { cn } from '@/lib/utils'
import {
  Plus, Search, Filter, X, ChevronDown, ChevronLeft, ChevronRight,
  Package, Warehouse, ArrowDown, ArrowUp, Minus, RotateCcw,
  ArrowRightLeft, Trash2, MoreHorizontal, Calendar, Clock
} from 'lucide-react'

const TIPO_OPTIONS = TIPOS_MOVIMIENTO.map(t => ({ value: t.value, label: t.label }))

export default function InventarioPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { can } = usePermissions()

  const [filters, setFilters] = useState({
    search: '',
    tipo: '',
    estado: '',
    ubicacionId: '',
    loteId: '',
    fechaDesde: '',
    fechaHasta: '',
  })
  const [pagination, setPagination] = useState({ page: 1, limit: 10 })
  const [selection, setSelection] = useState([])
  const [filtersOpen, setFiltersOpen] = useState(false)

  const { data: inventarioData, isLoading, error } = useInventario(filters, pagination)
  const { data: productos } = useProductos({ page: 1, limit: 100 })
  const { data: ubicaciones } = useUbicaciones({ page: 1, limit: 100 })
  const { data: lotes } = useLotes({ page: 1, limit: 100 })

  const inventario = inventarioData?.data || []
  const totalPages = inventarioData?.totalPages || 1
  const totalItems = inventarioData?.total || 0

  const columns = useMemo(() => createTableColumns([
    {
      accessorKey: 'lote',
      header: 'Lote',
      cell: (_, row) => (
        <div>
          <span className="font-mono text-sm font-medium">{row.original.lote?.codigo || '—'}</span>
          <span className="text-gray-500 ml-1">·</span>
          <span className="text-sm ml-1">{row.original.lote?.producto?.nombre || '—'}</span>
        </div>
      ),
    },
    {
      accessorKey: 'ubicacion',
      header: 'Ubicación',
      cell: (_, row) => row.original.ubicacion?.nombre || '—',
    },
    {
      accessorKey: 'stockActual',
      header: 'Stock Actual',
      cell: (val) => <span className="font-mono font-medium text-gray-900">{val} {val === 1 ? 'unidad' : 'unidades'}</span>,
    },
    {
      accessorKey: 'stockMinimo',
      header: 'Mínimo',
      cell: (val) => <span className="text-gray-600">{val}</span>,
    },
    {
      accessorKey: 'stockMaximo',
      header: 'Máximo',
      cell: (val) => val ? <span className="text-gray-600">{val}</span> : <span className="text-gray-400">—</span>,
    },
    {
      accessorKey: 'lote',
      header: 'Estado Lote',
      cell: (_, row) => {
        const estado = row.original.lote?.estadoCalidad || '—'
        const config = getEstadoLoteConfig(estado)
        return <Badge variant={config.color}>{config.label}</Badge>
      },
    },
    {
      accessorKey: 'lote',
      header: 'Vencimiento',
      cell: (_, row) => row.original.lote?.fechaVencimiento ? new Date(row.original.lote.fechaVencimiento).toLocaleDateString('es-ES') : '—',
    },
  ]), [])

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const clearFilters = () => {
    setFilters({ search: '', tipo: '', estado: '', ubicacionId: '', loteId: '', fechaDesde: '', fechaHasta: '' })
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const hasActiveFilters = useMemo(() =>
    filters.search || filters.tipo || filters.estado || filters.ubicacionId || filters.loteId || filters.fechaDesde || filters.fechaHasta, [filters])

  const handleRowClick = (row) => {
    navigate(`/inventario/movimiento/${row.id}`)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
            <p className="text-gray-600 mt-1">Control de stock y movimientos</p>
          </div>
          <Button disabled> <Plus className="h-4 w-4 mr-2" /> Nuevo Movimiento </Button>
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
          <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
          <p className="text-gray-600 mt-1">Control de stock y movimientos</p>
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
                  <Input placeholder="Lote, producto, ubicación..." value={filters.search} onChange={e => handleFilterChange('search', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
                  <Select value={filters.ubicacionId} onValueChange={v => handleFilterChange('ubicacionId', v)}>
                    <SelectTrigger><SelectValue placeholder="Todas las ubicaciones" /></SelectTrigger>
                    <SelectContent>
                      {ubicaciones?.data?.map(u => <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lote</label>
                  <Select value={filters.loteId} onValueChange={v => handleFilterChange('loteId', v)}>
                    <SelectTrigger><SelectValue placeholder="Todos los lotes" /></SelectTrigger>
                    <SelectContent>
                      {lotes?.data?.map(l => <SelectItem key={l.id} value={l.id}>{l.codigo} - {l.producto?.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado Lote</label>
                  <Select value={filters.estado} onValueChange={v => handleFilterChange('estado', v)}>
                    <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      {[
                        { value: 'DISPONIBLE', label: 'Disponible' },
                        { value: 'CUARENTENA', label: 'Cuarentena' },
                        { value: 'NO_APTO', label: 'No Apto' },
                        { value: 'VENCIDO', label: 'Vencido' },
                      ].map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
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
          <Button onClick={() => navigate('/inventario/movimiento/nuevo')}>
            <Plus className="h-4 w-4 mr-2" /> Nuevo Movimiento
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
        <span>{totalItems} registros de inventario</span>
        {hasActiveFilters && <span className="text-primary font-medium">Filtros activos</span>}
        <span>Página {pagination.page} de {totalPages}</span>
      </div>

      {/* Alertas Stock Bajo */}
      {inventario.filter(i => i.stockActual <= i.stockMinimo).length > 0 && (
        <Card className="border-warning bg-warning-light/20">
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <span className="text-sm font-medium text-warning">Stock bajo en {inventario.filter(i => i.stockActual <= i.stockMinimo).length} productos</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => setFilters(prev => ({ ...prev, search: '' }))}>
              Ver alertas
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={inventario}
            keyField="id"
            onRowClick={handleRowClick}
            selection={{ enabled: true, onChange: setSelection }}
            sortable
            filterable
            pagination
            pageSize={pagination.limit}
            showPagination
            loading={isLoading}
            emptyMessage="No se encontraron registros de inventario"
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