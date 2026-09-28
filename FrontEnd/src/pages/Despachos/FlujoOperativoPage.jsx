import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton'
import { usePermissions } from '@/hooks/usePermissions'
import { useFlujoOperativo, useUpdateEstadoDespacho } from '@/services/query/useDespachos'
import { getEstadoConfig, FLUJO_COLUMNAS, getSiguientesEstados } from '@/schemas/despachoSchema'
import { cn } from '@/lib/utils'
import { Kanban, Plus, ChevronLeft, ChevronRight, Truck, MapPin, Clock, AlertCircle, MoreHorizontal, GripVertical } from 'lucide-react'

const COLUMNAS = FLUJO_COLUMNAS

function DraggableDespacho({ despacho, onDragEnd }) {
  const { id, codigo, repartidor, vehiculo, cliente, fechaSalida, estado, prioridad } = despacho
  const config = getEstadoConfig(estado)

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 mb-2 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <span className="font-mono text-sm font-medium text-gray-900">{codigo}</span>
        <Badge variant={config.color} className="text-xs">{config.label}</Badge>
      </div>
      <div className="space-y-1 text-sm text-gray-600">
        <div className="flex items-center gap-1">
          <Truck className="h-3.5 w-3.5 text-gray-400" />
          <span>{repartidor?.nombre || 'Sin repartidor'}</span>
        </div>
        <div className="flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5 text-gray-400" />
          <span>{cliente?.razonSocial || cliente?.nombre || '—'}</span>
        </div>
        {fechaSalida && (
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-gray-400" />
            <span>{new Date(fechaSalida).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        )}
      </div>
      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="h-4 w-4 text-gray-300 cursor-grab" />
      </div>
    </div>
  )
}

function ColumnaKanban({ columna, despachos, isDraggingOver, onDragEnd }) {
  const config = getEstadoConfig(columna.value)
  const Icon = config.icon ? eval(config.icon) : Truck

  return (
    <div className={cn('flex flex-col min-h-[500px] w-80 flex-shrink-0 bg-gray-50 rounded-lg border-2 transition-colors', isDraggingOver && 'border-primary bg-primary-light/10')}>
      <CardHeader className="p-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-5 w-5', `text-${config.color}`)} />
          <CardTitle className="text-base">{config.label}</CardTitle>
          <Badge variant={config.color} className="text-xs">{despachos.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-2 flex-1 min-h-[400px]">
        <SortableContext items={despachos.map(d => d.id)} strategy={verticalListSortingStrategy}>
          {despachos.map((despacho, index) => (
            <div key={despacho.id} style={{ transform: CSS.Transform.toString(despacho.transform || {}) }}>
              <DraggableDespacho despacho={despacho} />
            </div>
          ))}
          {despachos.length === 0 && (
            <div className="h-20 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg text-gray-400 text-sm">
              Arrastra aquí
            </div>
          )}
        </SortableContext>
      </CardContent>
    </div>
  )
}

export default function FlujoOperativoPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { can } = usePermissions()

  const { data: flujo, isLoading, refetch } = useFlujoOperativo()
  const updateEstado = useUpdateEstadoDespacho()

  const [activeId, setActiveId] = useState(null)
  const [overId, setOverId] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = useCallback(async (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const despachoId = active.id
    const targetColumn = over.id

    const currentColumn = COLUMNAS.find(c => c.value === flujo[active.id]?.estado)
    const targetColConfig = COLUMNAS.find(c => c.value === targetColumn)
    
    if (!targetColConfig) return

    const siguienteEstado = getSiguientesEstados(currentColumn?.value || '')[0]
    if (siguienteEstado !== targetColumn) {
      // Solo permitir mover al siguiente estado en el flujo
      return
    }

    try {
      await updateEstado.mutateAsync({ id: despachoId, estado: targetColumn, observaciones: '' })
      queryClient.invalidateQueries({ queryKey: ['despachos', 'flujo-operativo'] })
    } catch (err) {
      console.error('Error moviendo despacho:', err)
    }
  }, [flujo, updateEstado])

  const columnasData = COLUMNAS.map(col => ({
    ...col,
    items: flujo?.[col.value.toLowerCase()] || [],
  }))

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Flujo Operativo</h1>
            <p className="text-gray-600 mt-1">Gestión visual del flujo de despachos (Kanban)</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {COLUMNAS.map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Flujo Operativo</h1>
          <p className="text-gray-600 mt-1">Gestión visual del flujo de despachos - Arrastra entre columnas</p>
        </div>
        <Button onClick={() => navigate('/despachos')}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Volver a lista
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        onDragStart={({ active }) => setActiveId(active.id)}
        onDragOver={({ over }) => setOverId(over?.id || null)}
        onDragCancel={() => { setActiveId(null); setOverId(null) }}
      >
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="flex gap-4 p-2 overflow-x-auto min-w-[340px]">
            {columnasData.map(({ value, label, items, color, icon: Icon }) => {
              const isOver = overId === value
              return (
                <ColumnaKanban
                  key={value}
                  columna={{ value, label, color, icon: Icon }}
                  despachos={items}
                  isDraggingOver={isOver}
                  onDragEnd={handleDragEnd}
                />
              )
            })}
          </div>
        </ScrollArea>
      </DndContext>
    </div>
  )
}