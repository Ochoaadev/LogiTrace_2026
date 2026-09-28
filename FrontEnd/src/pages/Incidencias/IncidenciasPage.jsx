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
import { useIncidencias, useUpdateIncidencia, useResolverIncidencia } from '@/services/query/useIncidencias'
import { usePedidos } from '@/services/query/usePedidos'
import { useTiposIncidencia } from '@/services/query/useCatalogos'
import { getEstadoConfig, ESTADOS_INCIDENCIA, getSiguientesEstados } from '@/schemas/incidenciaSchema'
import { cn } from '@/lib/utils'
import {
  Plus, Search, Filter, X, ChevronDown, ChevronLeft, ChevronRight,
  AlertTriangle, RotateCcw, Clock, User, MoreHorizontal,
  ArrowRight, FileText, CheckCircle, Wrench
} from 'lucide-react'

const ESTADO_OPTIONS = ESTADOS_INCIDENCIA.map(e => ({ value: e.value, label: e.label }))

export default function IncidenciasPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { can } = usePermissions()

  const [filters, setFilters] = useState({
    search: '',
    estado: [],
    tipoIncidenciaId: '',
    pedidoId: '',
    fechaDesde: '',
    fechaHasta: '',
  })
  const [pagination, setPagination] = useState({ page: 1, limit: 10 })
  const [selection, setSelection] = useState([])
  const [filtersOpen, setFiltersOpen] = useState(false)

  const { data: incidenciasData, isLoading, error } = useIncidencias(filters, pagination)
  const { data: pedidos } = usePedidos({ page: 1, limit: 100 })
  const { data: tiposIncidencia } = useTiposIncidencia({ page: 1, limit: 100 })

  const updateEstado = useUpdateIncidencia()
  const resolverIncidencia = useResolverIncidencia()

  const incidencias = incidenciasData?.data || []
  const totalPages = incidenciasData?.totalPages || 1
  const totalItems = incidenciasData?.total || 0

  const columns = useMemo(() => createTableColumns([
    {
      accessorKey: 'codigo',
      header: 'Código',
      cell: (val) => <span className="font-mono text-sm font-medium">{val}</span>,
    },
    {
      accessorKey: 'pedido',
      header: 'Pedido',
      cell: (_, row) => row.original.pedido?.codigo || '—',
    },
    {
      accessorKey: 'cliente',
      header: 'Cliente',
      cell: (_, row) => row.original.pedido?.cliente?.razonSocial || row.original.pedido?.cliente?.nombre || '—',
    },
    {
      accessorKey: 'tipoIncidencia',
      header: 'Tipo',
      cell: (_, row) => row.original.tipoIncidencia?.nombre || '—',
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
      accessorKey: 'fechaCreacion',
      header: 'Creada',
      cell: (val) => val ? new Date(val).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—',
    },
    {
      accessorKey: 'fechaResolucion',
      header: 'Resuelta',
      cell: (val) => val ? new Date(val).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—',
    },
  ]), [])

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const clearFilters = () => {
    setFilters({ search: '', estado: [], tipoIncidenciaId: '', pedidoId: '', fechaDesde: '', fechaHasta: '' })
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const hasActiveFilters = useMemo(() =>
    filters.search || filters.estado.length > 0 || filters.tipoIncidenciaId || filters.pedidoId || filters.fechaDesde || filters.fechaHasta, [filters])

  const handleRowClick = (row) => {
    navigate(`/incidencias/${row.id}`)
  }

  const handleEstadoChange = async (incidencia, nuevoEstado) => {
    try {
      await updateEstado.mutateAsync({ id: incidencia.id, estado: nuevoEstado, resolucion: '' })
      queryClient.invalidateQueries({ queryKey: ['incidencias'] })
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const handleResolver = async (incidencia) => {
    const resolucion = prompt('Descripción de la resolución:')
    if (!resolucion) return
    try {
      await resolverIncidencia.mutateAsync({ id: incidencia.id, resolucion })
      queryClient.invalidateQueries({ queryKey: ['incidencias'] })
    } catch (err) {
      console.error('Error:', err)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Incidencias</h1>
            <p className="text-gray-600 mt-1">Gestión de incidencias operativas</p>
          </div>
          <Button disabled> <Plus className="h-4 w-4 mr-2" /> Nueva Incidencia </Button>
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
          <h1 className="text-2xl font-bold text-gray-900">Incidencias</h1>
          <p className="text-gray-600 mt-1">Gestión de incidencias operativas</p>
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
                  <Input placeholder="Código, descripción, cliente..." value={filters.search} onChange={e => handleFilterChange('search', e.target.value)} />
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Incidencia</label>
                  <Select value={filters.tipoIncidenciaId} onValueChange={v => handleFilterChange('tipoIncidenciaId', v)}>
                    <SelectTrigger><SelectValue placeholder="Todos los tipos" /></SelectTrigger>
                    <SelectContent>
                      {tiposIncidencia?.data?.map(t => <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pedido</label>
                  <Select value={filters.pedidoId} onValueChange={v => handleFilterChange('pedidoId', v)}>
                    <SelectTrigger><SelectValue placeholder="Todos los pedidos" /></SelectTrigger>
                    <SelectContent>
                      {pedidos?.data?.map(p => <SelectItem key={p.id} value={p.id}>{p.codigo} - {p.cliente?.razonSocial || p.cliente?.nombre}</SelectItem>)}
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
          {can('incidencias.create') && (
            <Button onClick={() => navigate('/incidencias/nueva')}>
              <Plus className="h-4 w-4 mr-2" /> Nueva Incidencia
            </Button>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
        <span>{totalItems} incidencias totales</span>
        {hasActiveFilters && <span className="text-primary font-medium">Filtros activos</span>}
        <span>Página {pagination.page} de {totalPages}</span>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={incidencias}
            keyField="id"
            onRowClick={handleRowClick}
            selection={{ enabled: true, onChange: setSelection }}
            sortable
            filterable
            pagination
            pageSize={pagination.limit}
            showPagination
            loading={isLoading}
            emptyMessage="No se encontraron incidencias"
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