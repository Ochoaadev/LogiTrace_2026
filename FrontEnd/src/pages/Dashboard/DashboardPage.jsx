import { useDeferredValue, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ReceiptText, Truck, TriangleAlert, ArchiveRestore, Archive, CirclePlus, Undo2, Search, Recycle, Clock,
  RefreshCw, MapPin, ArrowRight, CircleCheck, Bike, CircleAlert, ClipboardCheck, Package, Thermometer, Info, Route,
} from 'lucide-react'
import { PageHeader, PageTag } from '@/components/layout/PageHeader'
import { Panel } from '@/components/layout/ModuloUI'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { PaginacionServidor } from '@/components/ui/PaginacionServidor'
import { DataTable, createTableColumns } from '@/components/ui/Table'
import { usePermissions } from '@/hooks/usePermissions'
import { usePedidos, usePedidosResumen } from '@/services/query/usePedidos'
import { useDespachosResumen } from '@/services/query/useDespachos'
import { useIncidencias, useIncidenciasResumen } from '@/services/query/useIncidencias'
import { useDevoluciones, useDevolucionesResumen } from '@/services/query/useDevoluciones'
import { useInventarioResumen } from '@/services/query/useInventario'
import { useActividadReciente } from '@/services/query/useDashboard'
import { getEstadoConfig } from '@/schemas/pedidoSchema'
import { getEstadoConfig as getEstadoDevolucionConfig } from '@/schemas/devolucionSchema'
import { MapaRecorrido } from '@/pages/Trazabilidad/components/MapaRecorrido'
import { cn } from '@/lib/utils'

const num = (v) => Number(v ?? 0).toLocaleString('es-VE', { maximumFractionDigits: 1 })
const hora = (d) => new Date(d).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })

// Turno operativo según la hora de Venezuela (solo presentación; no hay entidad de turnos)
function turnoActual() {
  const h = Number(new Date().toLocaleString('en-US', { timeZone: 'America/Caracas', hour: 'numeric', hour12: false }))
  if (h >= 6 && h < 14) return { nombre: 'Turno matutino', rango: '06:00 – 14:00' }
  if (h >= 14 && h < 22) return { nombre: 'Turno vespertino', rango: '14:00 – 22:00' }
  return { nombre: 'Turno nocturno', rango: '22:00 – 06:00' }
}

// Estilo del evento en la columna de actividad según su categoría
const ESTILO_EVENTO = {
  cierre: { icon: CircleCheck, caja: 'bg-success-light text-success' },
  operacion: { icon: Bike, caja: 'bg-primary-light text-primary' },
  incidencia: { icon: CircleAlert, caja: 'bg-danger-light text-danger' },
  inversa: { icon: ClipboardCheck, caja: 'bg-gray-100 text-gray-700' },
  inventario: { icon: Package, caja: 'bg-primary-light text-primary' },
  residuo: { icon: Recycle, caja: 'bg-success-light text-success' },
}

function Tarjeta({ titulo, icon: Icon, tono = 'text-primary', valor, valorTono, sufijo, children, to }) {
  const navigate = useNavigate()
  return (
    <section className="bg-white p-5 flex flex-col gap-3" aria-label={titulo}>
      <div className="flex items-start justify-between gap-2">
        <button type="button" onClick={() => navigate(to)} className="label-caps text-left hover:text-primary">{titulo}</button>
        <Icon className={cn('h-5 w-5 flex-shrink-0', tono)} aria-hidden="true" />
      </div>
      <p className="flex items-baseline gap-2">
        <span className={cn('font-mono text-[2rem] leading-none font-semibold', valorTono)}>{valor}</span>
        {sufijo && <span className={cn('font-mono text-xs', valorTono)}>{sufijo}</span>}
      </p>
      <div className="mt-auto text-xs text-gray-700">{children}</div>
    </section>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { can } = usePermissions()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const busqueda = useDeferredValue(search)
  const turno = turnoActual()

  const { data: rPed } = usePedidosResumen()
  const { data: rDesp } = useDespachosResumen()
  const { data: rInc } = useIncidenciasResumen()
  const { data: rDev } = useDevolucionesResumen()
  const { data: rInv } = useInventarioResumen()
  const { data: abiertas } = useIncidencias({ abiertas: 'true' }, { page: 1, limit: 2 })
  const { data: enProceso } = useDevoluciones({ activas: 'true' }, { page: 1, limit: 1 })
  const actividad = useActividadReciente(6)
  const pedidos = usePedidos({ vista: 'activos', search: busqueda.trim() }, { page, limit: 5 })

  // Distribución de los pedidos activos por etapa (barra de la primera tarjeta)
  const etapas = rPed && [
    { label: 'en preparación', valor: rPed.enPreparacion.total, color: 'bg-success' },
    { label: 'en ruta', valor: rPed.enRuta.total, color: 'bg-primary' },
    { label: 'en cola', valor: rPed.enCola.total, color: 'bg-gray-300' },
  ]
  const totalEtapas = etapas?.reduce((s, e) => s + e.valor, 0) || 0

  const columnas = createTableColumns([
    {
      accessorKey: 'codigo',
      header: 'Código',
      cell: (v, row) => <button type="button" onClick={() => navigate(`/pedidos/${row.original.id}`)} className="font-mono text-sm font-semibold text-primary hover:underline whitespace-nowrap">#{v}</button>,
    },
    {
      accessorKey: 'cliente',
      header: 'Cliente / destino',
      cell: (c, row) => (
        <div className="min-w-[12rem]">
          <p className="font-semibold text-gray-900">{c?.razonSocial}</p>
          <p className="text-xs text-gray-600">
            {row.original.detalles.reduce((s, d) => s + Number(d.cantidad), 0)} {[...new Set(row.original.detalles.map((d) => d.unidad))].join('/')} · {row.original.detalles.map((d) => d.producto?.nombre).join(', ')}
          </p>
          <p className="flex items-start gap-1 text-xs text-gray-600">
            <MapPin className="h-3.5 w-3.5 mt-px flex-shrink-0" aria-hidden="true" />
            {[row.original.zona?.nombre, row.original.direccionEntrega].filter(Boolean).join(' · ')}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'despachos',
      header: 'Repartidor',
      cell: (d) => {
        const desp = d?.at(-1)?.despacho
        return <span className="whitespace-nowrap">{desp?.repartidor?.usuario?.nombre || <span className="italic text-gray-500">{desp ? desp.codigo : 'Por asignar'}</span>}</span>
      },
    },
    {
      accessorKey: 'estado',
      header: 'Estado',
      cell: (v) => {
        const e = getEstadoConfig(v)
        return <Badge variant={e.color}>{e.label}</Badge>
      },
    },
    {
      id: 'accion',
      header: () => <span className="block text-right">Trazab.</span>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => navigate(`/trazabilidad?pedido=${row.original.id}`)}
            className="p-2 text-primary hover:bg-gray-100"
            aria-label={`Trazabilidad de ${row.original.codigo}`}
            title="Ver trazabilidad"
          >
            <Route className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ])

  // Mapa: última posición de cada despacho en ruta y sus destinos
  const posiciones = rDesp?.posiciones || []
  const gps = {
    puntos: posiciones.filter((p) => p.ultimaPosicion).map((p) => ({ ...p.ultimaPosicion, despacho: p.despacho, repartidor: p.repartidor })),
    destinos: posiciones.flatMap((p) => p.destinos),
  }
  const zonasEnRuta = [...new Set(posiciones.flatMap((p) => p.zonas))]
  const devolucion = enProceso?.data?.[0]

  return (
    <div>
      <PageHeader
        modulo="01"
        seccion="Inicio"
        tags={<PageTag>Valera · Zona operativa andina</PageTag>}
        title="Inicio / Dashboard Operativo"
        description="Resumen diario de pedidos, despachos, novedades e inventario crítico en Valera y zonas aledañas, actualizado con cada registro de los módulos operativos."
        actions={
          <div className="flex items-center gap-4 bg-gray-50 px-5 py-3">
            <div className="text-right">
              <p className="label-caps text-[10px]">{turno.nombre}</p>
              <p className="font-mono text-lg font-semibold text-gray-900">{turno.rango}</p>
              <p className="font-mono text-xs text-gray-600">VET</p>
            </div>
            <Clock className="h-7 w-7 text-primary" aria-hidden="true" />
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
        <Tarjeta titulo="Pedidos activos" icon={ReceiptText} valor={rPed?.activos ?? '—'} sufijo={rPed ? `${rPed.enCola.registradosHoy} registrados hoy` : ''} valorTono="text-gray-900" to="/pedidos">
          {totalEtapas > 0 && (
            <div className="flex h-1.5 mb-2" role="img" aria-label="Distribución de pedidos activos">
              {etapas.filter((e) => e.valor).map((e) => <span key={e.label} className={e.color} style={{ width: `${(e.valor / totalEtapas) * 100}%` }} />)}
            </div>
          )}
          {/* Leyenda de la barra: se ajusta al ancho sin partir las etiquetas (antes se montaban) */}
          <ul className="flex flex-wrap gap-x-3 gap-y-0.5 font-mono">
            {etapas?.map((e) => (
              <li key={e.label} className="flex items-center gap-1.5 whitespace-nowrap">
                <span className={cn('h-2 w-2 flex-shrink-0', e.color)} aria-hidden="true" />
                {e.valor} {e.label}
              </li>
            ))}
          </ul>
        </Tarjeta>

        <Tarjeta titulo="Despachos activos" icon={Truck} valor={rDesp?.enRuta.total ?? '—'} sufijo="en tránsito" valorTono="text-gray-900" to="/despachos">
          {posiciones.length ? (
            <>
              <p className="label-caps text-[10px] mb-1">Motorizados en calle:</p>
              <ul className="space-y-0.5">
                {posiciones.slice(0, 3).map((p) => (
                  <li key={p.despacho}>
                    <span className="block text-gray-900">{p.repartidor || p.despacho}</span>
                    {p.zonas[0] && <span className="block font-mono text-primary">{p.zonas.join(', ')}</span>}
                  </li>
                ))}
              </ul>
            </>
          ) : 'Sin unidades en calle'}
        </Tarjeta>

        <Tarjeta titulo="Incidencias abiertas" icon={TriangleAlert} tono="text-danger" valor={rInc?.abiertas ?? '—'} sufijo={rInc?.abiertas ? 'requieren acción' : ''} valorTono={rInc?.abiertas ? 'text-danger' : 'text-gray-900'} to="/incidencias">
          {abiertas?.data?.length ? (
            <ul className="space-y-2">
              {abiertas.data.map((i) => (
                <li key={i.id}>
                  <Link to={`/incidencias/${i.id}`} className="block bg-danger-light px-2 py-1.5 hover:opacity-90">
                    <span className="font-semibold text-[#a2191f]">{i.despachoPedido?.pedido?.zona?.nombre || i.codigo}:</span>{' '}
                    <span className="text-[#a2191f]">{i.tipo?.nombre}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : 'Sin novedades abiertas'}
        </Tarjeta>

        <Tarjeta titulo="Devoluciones" icon={ArchiveRestore} valor={rDev?.pendientesDictamen.total ?? '—'} sufijo="pendientes de dictamen" valorTono="text-gray-900" to="/devoluciones">
          {devolucion ? (
            <Link to={`/devoluciones/${devolucion.id}`} className="block bg-gray-50 px-2 py-1.5 hover:bg-gray-100">
              <span className="flex justify-between gap-2">
                <span className="font-mono text-primary">#{devolucion.codigo}</span>
                <Badge>{getEstadoDevolucionConfig(devolucion.estado).label}</Badge>
              </span>
              <span className="block text-gray-600 mt-1">{devolucion.motivo?.nombre} · {devolucion.despachoPedido?.pedido?.cliente?.razonSocial}</span>
            </Link>
          ) : 'Sin devoluciones en proceso'}
        </Tarjeta>

        <Tarjeta titulo="Alertas inventario" icon={Archive} tono="text-danger" valor={rInv?.stockBajo ?? '—'} sufijo={rInv?.stockBajo ? 'bajo mínimo' : ''} valorTono={rInv?.stockBajo ? 'text-danger' : 'text-gray-900'} to="/inventario">
          {rInv?.alertas.length ? (
            <ul className="space-y-1">
              {rInv.alertas.slice(0, 2).map((a) => (
                <li key={a.loteId + a.ubicacion} className="flex justify-between gap-2 bg-gray-50 px-2 py-1">
                  <span className="truncate">{a.producto}</span>
                  <span className="font-mono text-danger">{num(a.stockActual)} {a.unidad}</span>
                </li>
              ))}
            </ul>
          ) : 'Existencias sobre su mínimo'}
        </Tarjeta>
      </div>

      <section className="bg-white px-6 py-4 mb-6 flex flex-wrap items-center gap-3" aria-label="Acciones rápidas">
        <span className="label-caps mr-2">Acciones rápidas:</span>
        {can('pedidos.create') && <Button onClick={() => navigate('/pedidos/nuevo')}><CirclePlus className="h-4 w-4" aria-hidden="true" /> Nuevo pedido</Button>}
        {can('incidencias.create') && <Button variant="secondary" onClick={() => navigate('/incidencias')}><TriangleAlert className="h-4 w-4 text-danger" aria-hidden="true" /> Registrar incidencia en ruta</Button>}
        {can('devoluciones.create') && <Button variant="secondary" onClick={() => navigate('/devoluciones')}><Undo2 className="h-4 w-4 text-primary" aria-hidden="true" /> Registrar devolución</Button>}
        {can('trazabilidad.list') && <Button variant="secondary" onClick={() => navigate('/trazabilidad')}><Search className="h-4 w-4 text-primary" aria-hidden="true" /> Consultar trazabilidad</Button>}
        {can('residuos.create') && <Button variant="secondary" onClick={() => navigate('/residuos')}><Recycle className="h-4 w-4 text-success" aria-hidden="true" /> Registrar residuo operativo</Button>}
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-6 mb-6">
        <div className="space-y-6 min-w-0">
          <section className="bg-white" aria-label="Pedidos y despachos en curso">
            <div className="flex flex-wrap items-start justify-between gap-3 p-4">
              <div>
                <h2 className="label-caps text-gray-900">Pedidos y despachos en curso</h2>
                <p className="text-sm text-gray-600">Monitoreo de entregas activas a clientes mayoristas y comercios</p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-1 min-w-0 sm:flex-none sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 pointer-events-none" aria-hidden="true" />
                  <Input aria-label="Filtrar pedidos" placeholder="Filtrar por código o cliente…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-9" />
                </div>
                <Button variant="secondary" size="icon" aria-label="Actualizar" onClick={() => pedidos.refetch()}>
                  <RefreshCw className={cn('h-4 w-4', pedidos.isFetching && 'animate-spin')} />
                </Button>
              </div>
            </div>
            <DataTable
              columns={columnas}
              data={pedidos.data?.data || []}
              loading={pedidos.isLoading}
              sortable={false}
              pagination={false}
              showPagination={false}
              emptyMessage={search ? 'Ningún pedido coincide.' : 'No hay pedidos en curso.'}
            />
            <PaginacionServidor pagination={pedidos.data?.pagination} onPageChange={setPage} etiqueta="pedidos en curso" />
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="min-w-0">
              <MapaRecorrido soloPosiciones titulo="Unidades en ruta" gps={gps} zona={zonasEnRuta.length ? `${zonasEnRuta.length} zona(s) con entregas` : 'Valera'} />
            </div>
            <Panel
              titulo="Cobertura de ruta urbana"
              icon={MapPin}
              extra={rPed?.efectividad.porcentaje !== null && rPed?.efectividad.porcentaje !== undefined && <span className="font-mono text-xs text-success whitespace-nowrap">Efectividad {num(rPed.efectividad.porcentaje)}%</span>}
            >
              <p className="text-sm text-gray-700 mb-4">
                {posiciones.length
                  ? `${posiciones.length} despacho(s) en ruta${posiciones.some((p) => p.estado === 'CON_INCIDENCIA') ? `, ${posiciones.filter((p) => p.estado === 'CON_INCIDENCIA').length} con incidencia` : ''}. Tiempo promedio salida → entrega: ${rDesp?.tiempoCiclo.minutos ?? '—'} min.`
                  : 'No hay despachos en ruta en este momento.'}
              </p>
              {rPed?.zonasFrecuentes.length > 0 && (
                <ul className="space-y-1 text-sm">
                  {rPed.zonasFrecuentes.map((z) => (
                    <li key={z.zonaId} className="flex justify-between gap-3">
                      <span>• {z.nombre}</span>
                      <span className={cn('font-mono text-xs', zonasEnRuta.includes(z.nombre) ? 'text-primary' : 'text-gray-600')}>
                        {zonasEnRuta.includes(z.nombre) ? 'Entregas en curso' : `${z.pedidos} pedido(s) / 30 d`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>

        <div className="space-y-6 min-w-0">
          <section className="bg-white p-5" aria-label="Actividad y eventos">
            <div className="flex items-start justify-between gap-2 mb-4">
              <h2 className="flex items-center gap-2 label-caps text-gray-900"><span className="h-2 w-2 rounded-full bg-primary animate-pulse" aria-hidden="true" /> Actividad y eventos</h2>
              <span className="text-xs bg-gray-50 px-2 py-1 text-gray-600">En vivo · Valera</span>
            </div>
            {actividad.isLoading ? (
              <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-16 bg-gray-50 animate-pulse" />)}</div>
            ) : !actividad.data?.length ? (
              <p className="text-sm text-gray-600">Sin eventos registrados.</p>
            ) : (
              <ol className="relative space-y-3">
                <span className="absolute left-[15px] top-2 bottom-2 w-px bg-gray-200" aria-hidden="true" />
                {actividad.data.map((e) => {
                  const estilo = ESTILO_EVENTO[e.categoria] || ESTILO_EVENTO.operacion
                  return (
                    <li key={e.id} className="relative flex gap-3">
                      <span className={cn('relative h-8 w-8 flex items-center justify-center flex-shrink-0', estilo.caja)} aria-hidden="true">
                        <estilo.icon className="h-4 w-4" />
                      </span>
                      <div className="flex-1 min-w-0 bg-gray-50 px-3 py-2">
                        <p className="flex justify-between gap-2 font-mono text-[11px]">
                          <span className="font-semibold text-primary">{hora(e.fechaHora)}</span>
                          <span className="text-gray-600 truncate">{e.modulo?.nombre}</span>
                        </p>
                        <p className="text-sm font-semibold text-gray-900">{e.titulo}{e.pedido ? ` · ${e.pedido}` : ''}</p>
                        <p className="text-xs text-gray-600 line-clamp-2">{e.descripcion}</p>
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
            <Button variant="secondary" className="w-full mt-4" onClick={() => navigate('/trazabilidad')}>
              Ver historial de eventos completo <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </section>

          <Panel titulo="Parámetros de planta principal" icon={Thermometer}>
            {!rInv?.cavas.length ? (
              <p className="text-sm text-gray-600">No hay cavas activas registradas.</p>
            ) : (
              <ul className="space-y-4">
                {rInv.cavas.map((c) => {
                  const t = c.temperatura?.temperaturaC
                  // Barra: qué tan fría está la cava en la escala 0 °C a -25 °C
                  const ancho = t === undefined ? 0 : Math.max(0, Math.min(100, (-t / 25) * 100))
                  return (
                    <li key={c.id}>
                      <div className="flex justify-between gap-2 text-sm">
                        <span className="text-gray-900">{c.nombre}</span>
                        <span className={cn('font-mono font-semibold', !c.temperatura ? 'text-gray-400' : c.temperatura.conforme ? 'text-primary' : 'text-danger')}>
                          {c.temperatura ? `${t.toFixed(1)} °C` : 'sin registro'}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 bg-gray-100">
                        <div className={cn('h-1.5', c.temperatura?.conforme === false ? 'bg-danger' : 'bg-primary')} style={{ width: `${ancho}%` }} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
            <p className="mt-4 flex justify-between gap-2 text-xs text-gray-600">
              <span>Registros manuales de temperatura</span>
              <span className="text-success">Límite ≤ {rInv?.limiteCriticoC ?? -15} °C</span>
            </p>
          </Panel>
        </div>
      </div>

      <aside className="bg-white px-6 py-4 flex gap-3 text-sm text-gray-700">
        <Info className="h-5 w-5 text-primary flex-shrink-0" aria-hidden="true" />
        <p>
          <strong>Nota metodológica:</strong> las métricas de este tablero se calculan en tiempo real desde la base de datos
          de LogiTrace a partir de los registros de cada módulo operativo. Las temperaturas corresponden a mediciones manuales
          y las posiciones al GPS reportado por los despachos.
        </p>
      </aside>
    </div>
  )
}
