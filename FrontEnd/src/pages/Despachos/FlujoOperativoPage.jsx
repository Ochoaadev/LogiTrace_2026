import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core'
import { Plus, List, Truck, Package, MapPin, Clock, Lock, TriangleAlert } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { usePermissions } from '@/hooks/usePermissions'
import { useFlujoOperativo, useUpdateEstadoDespacho } from '@/services/query/useDespachos'
import { FLUJO_COLUMNAS, getEstadoConfig, getSiguientesEstados } from '@/schemas/despachoSchema'
import { getPrioridadConfig } from '@/schemas/pedidoSchema'
import { cn } from '@/lib/utils'

const hora = (d) => (d ? new Date(d).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }) : null)

// Contenido visual de la tarjeta (sin lógica de arrastre): lo usan la tarjeta y su "fantasma"
function ContenidoTarjeta({ despacho, className, ...props }) {
  const prioridad = getPrioridadConfig(despacho.prioridad)
  return (
    <article
      className={cn('bg-white p-3 border-l-4 border-primary focus-visible:outline-2 focus-visible:outline-primary', className)}
      aria-label={`Despacho ${despacho.codigo}`}
      {...props}
    >
      <header className="flex items-start justify-between gap-2 mb-2">
        <span className="font-mono text-sm font-semibold text-primary">{despacho.codigo}</span>
        {['ALTA', 'URGENTE'].includes(despacho.prioridad) && <Badge variant={prioridad.color}>{prioridad.label}</Badge>}
      </header>
      <dl className="space-y-1 text-xs text-gray-700">
        <div className="flex items-center gap-1.5">
          <Truck className="h-3.5 w-3.5 text-gray-500" aria-hidden="true" />
          <dt className="sr-only">Repartidor</dt>
          <dd>{despacho.repartidor?.nombre || 'Sin repartidor'}{despacho.vehiculo ? ` · ${despacho.vehiculo.codigo}` : ''}</dd>
        </div>
        <div className="flex items-start gap-1.5">
          <Package className="h-3.5 w-3.5 text-gray-500 mt-px" aria-hidden="true" />
          <dt className="sr-only">Paradas</dt>
          <dd className="min-w-0">
            {despacho.paradas.length} parada(s)
            {despacho.paradas[0] && <span className="block truncate text-gray-600">{despacho.paradas.map((p) => p.cliente).join(' · ')}</span>}
          </dd>
        </div>
        {despacho.fechaSalida && (
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-gray-500" aria-hidden="true" />
            <dt className="sr-only">Salida</dt>
            <dd className="font-mono">salida {hora(despacho.fechaSalida)}{despacho.fechaCierre ? ` · cierre ${hora(despacho.fechaCierre)}` : ''}</dd>
          </div>
        )}
        {despacho.precinto && (
          <div className="flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-gray-500" aria-hidden="true" />
            <dt className="sr-only">Precinto</dt>
            <dd className="font-mono">{despacho.precinto}</dd>
          </div>
        )}
        {despacho.posicionesGPS > 0 && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-gray-500" aria-hidden="true" />
            <dt className="sr-only">GPS</dt>
            <dd>{despacho.posicionesGPS} posiciones GPS</dd>
          </div>
        )}
      </dl>
    </article>
  )
}

function TarjetaDespacho({ despacho, arrastrable }) {
  const navigate = useNavigate()
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: despacho.id,
    data: { estado: despacho.estado },
    disabled: !arrastrable,
  })
  return (
    <ContenidoTarjeta
      ref={setNodeRef}
      despacho={despacho}
      {...attributes}
      {...listeners}
      onClick={() => navigate(`/despachos/${despacho.id}`)}
      className={cn('cursor-pointer hover:bg-gray-50', arrastrable && 'cursor-grab active:cursor-grabbing', isDragging && 'opacity-30')}
    />
  )
}

function Columna({ columna, despachos, permitida, arrastrando, puedeMover }) {
  // Todas las columnas reciben la tarjeta: soltar en una no permitida muestra el motivo
  const { setNodeRef, isOver } = useDroppable({ id: columna.value })
  const Icon = columna.icon

  return (
    <section
      ref={setNodeRef}
      className={cn(
        'flex flex-col flex-1 min-w-[13rem] bg-gray-100 transition-colors',
        arrastrando && permitida && 'outline-2 outline-dashed outline-primary',
        isOver && permitida && 'bg-primary-light',
        arrastrando && !permitida && 'opacity-60'
      )}
      aria-label={`${columna.label}: ${despachos.length} despachos`}
    >
      <header className="flex items-center gap-2 px-3 h-12 bg-white border-b-2 border-gray-200">
        <Icon className="h-4 w-4 text-gray-700" aria-hidden="true" />
        <h2 className="flex-1 text-sm font-semibold text-gray-900">{columna.label}</h2>
        <span className="font-mono text-xs bg-gray-100 px-2 py-0.5">{despachos.length}</span>
      </header>
      <div className="flex-1 p-2 space-y-2 min-h-[420px]">
        {despachos.map((d) => (
          <TarjetaDespacho key={d.id} despacho={d} arrastrable={puedeMover && getSiguientesEstados(d.estado).some((e) => e !== 'CANCELADO')} />
        ))}
        {despachos.length === 0 && (
          <p className="text-xs text-gray-500 text-center py-6">{arrastrando && permitida ? 'Soltar aquí' : 'Sin despachos'}</p>
        )}
      </div>
    </section>
  )
}

export default function FlujoOperativoPage() {
  const navigate = useNavigate()
  const { can } = usePermissions()
  const { data: flujo, isLoading, isError } = useFlujoOperativo()
  const cambiarEstado = useUpdateEstadoDespacho()

  const [activo, setActivo] = useState(null)
  const [aviso, setAviso] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), // permite el clic para abrir el detalle
    useSensor(KeyboardSensor)
  )

  const todos = FLUJO_COLUMNAS.flatMap((c) => flujo?.[c.value] || [])
  const despachoActivo = todos.find((d) => d.id === activo)
  const destinosPermitidos = despachoActivo ? getSiguientesEstados(despachoActivo.estado) : []
  const puedeMover = can('despachos.change_state')

  const onDragEnd = async ({ active, over }) => {
    setActivo(null)
    if (!over) return
    const origen = active.data.current?.estado
    const destino = over.id
    if (origen === destino) return
    const d = todos.find((x) => x.id === active.id)
    if (!getSiguientesEstados(origen).includes(destino)) {
      setAviso({ tipo: 'error', texto: `${d?.codigo}: no se puede pasar de "${getEstadoConfig(origen).label}" a "${getEstadoConfig(destino).label}".` })
      return
    }
    setAviso(null)
    try {
      await cambiarEstado.mutateAsync({ id: active.id, estado: destino, observaciones: 'Cambio desde el tablero de flujo operativo' })
      setAviso({ tipo: 'ok', texto: `${d?.codigo} pasó a "${getEstadoConfig(destino).label}".` })
    } catch (err) {
      setAviso({ tipo: 'error', texto: err?.message || 'No se pudo cambiar el estado' })
    }
  }

  return (
    <div>
      <PageHeader
        modulo="03"
        seccion="Despachos · flujo operativo"
        title="Tablero de despachos"
        description="Arrastre un despacho a la siguiente etapa para cambiar su estado. Solo se resaltan las etapas permitidas; haga clic en una tarjeta para ver el detalle."
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate('/despachos')}>
              <List className="h-4 w-4" aria-hidden="true" /> Ver lista
            </Button>
            {can('despachos.create') && (
              <Button onClick={() => navigate('/despachos/nuevo')}>
                <Plus className="h-4 w-4" aria-hidden="true" /> Programar despacho
              </Button>
            )}
          </>
        }
      />

      {aviso && (
        <p role="status" className={cn('mb-4 px-4 py-3 text-sm flex items-center gap-2', aviso.tipo === 'error' ? 'bg-danger-light text-[#a2191f]' : 'bg-success-light text-[#044317]')}>
          {aviso.tipo === 'error' && <TriangleAlert className="h-4 w-4" aria-hidden="true" />}
          {aviso.texto}
        </p>
      )}

      {isError ? (
        <p role="alert" className="bg-danger-light text-[#a2191f] px-4 py-3 text-sm">No se pudo cargar el tablero.</p>
      ) : isLoading ? (
        <div className="flex gap-4 overflow-x-auto">{FLUJO_COLUMNAS.map((c) => <Skeleton key={c.value} className="h-96 w-72 flex-shrink-0" />)}</div>
      ) : (
        <DndContext sensors={sensors} onDragStart={({ active }) => setActivo(active.id)} onDragEnd={onDragEnd} onDragCancel={() => setActivo(null)}>
          <div className="flex gap-3 overflow-x-auto pb-4">
            {FLUJO_COLUMNAS.map((col) => (
              <Columna
                key={col.value}
                columna={col}
                despachos={flujo?.[col.value] || []}
                permitida={!activo || destinosPermitidos.includes(col.value) || despachoActivo?.estado === col.value}
                arrastrando={!!activo}
                puedeMover={puedeMover}
              />
            ))}
          </div>
          <DragOverlay>{despachoActivo && <ContenidoTarjeta despacho={despachoActivo} className="shadow-level2 cursor-grabbing" />}</DragOverlay>
        </DndContext>
      )}
      <p className="mt-2 text-xs text-gray-600">La columna "Finalizado" muestra los despachos cerrados en los últimos 3 días. Los cancelados se consultan en la lista.</p>
    </div>
  )
}
