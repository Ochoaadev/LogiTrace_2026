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
import { useDevoluciones, useProcesarDevolucion } from '@/services/query/useDevoluciones'
import { usePedidos } from '@/services/query/usePedidos'
import { useMotivosDevolucion } from '@/services/query/useCatalogos'
import { getEstadoConfig, ESTADOS_DEVOLUCION, getSiguientesEstados } from '@/schemas/devolucionSchema'
import { cn } from '@/lib/utils'
import {
  Plus, Search, Filter, X, ChevronDown, ChevronLeft, ChevronRight,
  RotateCcw, Truck, PackageCheck, ClipboardCheck, CheckCircle,
  MoreHorizontal, Calendar, Clock, AlertTriangle
} from 'lucide-react'

const ESTADO_OPTIONS = ESTADOS_DEVOLUCION.map(e => ({ value: e.value, label: e.label }))

export default function DevolucionesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { can } = usePermissions()

  const [filters, setFilters] = useState({
    search: '',
    estado: [],
    motivoId: '',
    despachoId: '',
    fechaDesde: '',
    fechaHasta: '',
  })
  const [pagination, setPagination] = useState({ page: 1, limit: 10 })
  const [selection, setSelection] = useState([])
  const [filtersOpen, setFiltersOpen] = useState(false)

  const { data: devolucionesData, isLoading, error } = useDevoluciones(filters, pagination)
  const { data: pedidos } = usePedidos({ page: 1, limit: 100 })
  const { data: motivos } = useMotivosDevolucion({ page: 1, limit: 100 })

  const procesarDevolucion = useProcesarDevolucion()

  const devoluciones = devolucionesData?.data || []
  const totalPages = devolucionesData?.totalPages || 1
  const totalItems = devolucionesData?.total || 0

  const columns = useMemo(() => createTableColumns([
    {
      accessorKey: 'codigo',
      header: 'Código',
      cell: (val) => <span className="font-mono text-sm font-medium">{val}</span>,
    },
    {
      accessorKey: 'despachoPedido',
      header: 'Despacho / Pedido',
      cell: (_, row) => (
        <div>
          <span className="font-mono text-sm">{row.original.despachoPedido?.despacho?.codigo || '—'}</span>
          <span className="text-gray-500 ml-1">/</span>
          <span className="font-mono text-sm ml-1">{row.original.despachoPedido?.pedido?.codigo || '—'}</span>
        </div>
      ),
    },
    {
      accessorKey: 'cliente',
      header: 'Cliente',
      cell: (_, row) => row.original.despachoPedido?.pedido?.cliente?.razonSocial || row.original.despachoPedido?.pedido?.cliente?.nombre || '—',
    },
    {
      accessorKey: 'motivo',
      header: 'Motivo',
      cell: (_, row) => row.original.motivo?.nombre || '—',
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
      accessorKey: 'fechaRegistro',
      header: 'Registrada',
      cell: (val) => val ? new Date(val).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—',
    },
    {
      accessorKey: 'fechaRecepcion',
      header: 'Recibida',
      cell: (val) => val ? new Date(val).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—',
    },
  ]), [])

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const clearFilters = () => {
    setFilters({ search: '', estado: [], motivoId: '', despachoId: '', fechaDesde: '', fechaHasta: '' })
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const hasActiveFilters = useMemo(() =>
    filters.search || filters.estado.length > 0 || filters.motivoId || filters.despachoId || filters.fechaDesde || filters.fechaHasta, [filters])

  const handleRowClick = (row) => {
    navigate(`/devoluciones/${row.id}`)
  }

  const handleEstadoChange = async (devolucion, nuevoEstado) => {
    try {
      await procesarDevolucion.mutateAsync({ id: devolucion.id, accion: nuevoEstado.toLowerCase().replace('_', '-'), observaciones: '' })
      queryClient.invalidateQueries({ queryKey: ['devoluciones'] })
    } catch (err) {
      console.error('Error:', err)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Devoluciones</h1>
            <p className="text-gray-600 mt-1">Gestión de devoluciones y evaluación de calidad</p>
          </div>
          <Button disabled> <Plus className="h-4 w-4 mr-2" /> Nueva Devolución </Button>
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
          <h1 className="text-2xl font-bold text-gray-900">Devoluciones</h1>
          <p className="text-gray-600 mt-1">Gestión de devoluciones y evaluación de calidad</p>
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
                  <Input placeholder="Código, cliente, observaciones..." value={filters.search} onChange={e => handleFilterChange('search', e.target.value)} />
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
                  <Select value={filters.motivoId} onValueChange={v => handleFilterChange('motivoId', v)}>
                    <SelectTrigger><SelectValue placeholder="Todos los motivos" /></SelectTrigger>
                    <SelectContent>
                      {motivos?.data?.map(m => <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Despacho</label>
                  <Input placeholder="Código despacho..." value={filters.despachoId} onChange={e => handleFilterChange('despachoId', e.target.value)} />
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
          {can('devoluciones.create') && (
            <Button onClick={() => navigate('/devoluciones/nueva')}>
              <Plus className="h-4 w-4 mr-2" /> Nueva Devolución
            </Button>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
        <span>{totalItems} devoluciones totales</span>
        {hasActiveFilters && <span className="text-primary font-medium">Filtros activos</span>}
        <span>Página {pagination.page} de {totalPages}</span>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={devoluciones}
            keyField="id"
            onRowClick={handleRowClick}
            selection={{ enabled: true, onChange: setSelection }}
            sortable
            filterable
            pagination
            pageSize={pagination.limit}
            showPagination
            loading={isLoading}
            emptyMessage="No se encontraron devoluciones"
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