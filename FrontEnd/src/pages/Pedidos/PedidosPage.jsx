import { useDeferredValue, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Snowflake, ReceiptText, FilePlus2, History, ClipboardClock, Archive, Truck, CircleCheck,
  Search, RotateCcw, Eye, Route, MapPin, Bike, Building2, ShieldCheck, TrendingUp, TrendingDown,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Pestana, Pestanas, Panel } from '@/components/layout/ModuloUI'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { KpiCard } from '@/components/ui/KpiCard'
import { PaginacionServidor } from '@/components/ui/PaginacionServidor'
import { DataTable } from '@/components/ui/Table'
import { createTableColumns } from '@/components/ui/tablaColumnas'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { usePermissions } from '@/hooks/usePermissions'
import { usePedidos, usePedidosResumen } from '@/services/query/usePedidos'
import { useZonas } from '@/services/query/useCatalogos'
import { ESTADOS_PEDIDO, getEstadoConfig, getPrioridadConfig } from '@/schemas/pedidoSchema'
import { cn } from '@/lib/utils'
import { fechaSinHora } from '@/lib/fechas'

const TODOS = '__todos'
const ESTADOS_POR_VISTA = {
  activos: ['REGISTRADO', 'EN_PREPARACION', 'LISTO_PARA_DESPACHO', 'EN_RUTA', 'CON_INCIDENCIA'],
  historial: ['ENTREGADO', 'CERRADO', 'CANCELADO', 'DEVUELTO'],
}
const TIPO_VEHICULO = { MOTO: 'moto', VEHICULO_LIVIANO: 'vehículo liviano', FURGON: 'furgón', OTRO: 'otro', SIN_VEHICULO: 'sin vehículo' }

const fecha = (d) => new Date(d).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })
const hora = (d) => new Date(d).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })
const num = (v) => Number(v ?? 0).toLocaleString('es-VE', { maximumFractionDigits: 1 })

function IndicadorCava({ cava }) {
  if (!cava) {
    return (
      <div className="flex items-center gap-3 bg-gray-50 px-4 py-2.5">
        <Snowflake className="h-5 w-5 text-gray-500" aria-hidden="true" />
        <p className="text-xs text-gray-600">Sin registros de temperatura de cava</p>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-3 bg-gray-50 px-4 py-2.5" title={`Registrado ${fecha(cava.fechaHora)} ${hora(cava.fechaHora)}`}>
      <Snowflake className={cn('h-5 w-5', cava.conforme ? 'text-success' : 'text-danger')} aria-hidden="true" />
      <div>
        <p className="label-caps text-[10px]">{cava.ubicacion}</p>
        <p className="font-mono text-sm font-semibold text-gray-900">
          {cava.temperaturaC.toFixed(1)} °C · <span className={cava.conforme ? 'text-success' : 'text-danger'}>{cava.conforme ? 'Óptimo' : 'Fuera de rango'}</span>
        </p>
      </div>
    </div>
  )
}

export default function PedidosPage() {
  const navigate = useNavigate()
  const { can } = usePermissions()

  // ?vista=historial permite abrir directamente el historial (p. ej. desde Nuevo pedido)
  const [vista, setVista] = useState(() => (new URLSearchParams(window.location.search).get('vista') === 'historial' ? 'historial' : 'activos'))
  const [filtros, setFiltros] = useState({ search: '', estado: TODOS, zonaId: TODOS })
  const [page, setPage] = useState(1)
  const busqueda = useDeferredValue(filtros.search)

  const cambiarFiltro = (k) => (v) => { setFiltros((f) => ({ ...f, [k]: v })); setPage(1) }
  const cambiarVista = (v) => { setVista(v); setFiltros((f) => ({ ...f, estado: TODOS })); setPage(1) }
  const limpiar = () => { setFiltros({ search: '', estado: TODOS, zonaId: TODOS }); setPage(1) }
  const hayFiltros = filtros.search || filtros.estado !== TODOS || filtros.zonaId !== TODOS

  const { data, isLoading, isError } = usePedidos(
    {
      vista,
      search: busqueda.trim(),
      ...(filtros.estado !== TODOS && { estado: filtros.estado }),
      ...(filtros.zonaId !== TODOS && { zonaId: filtros.zonaId }),
    },
    { page, limit: 10 }
  )
  const { data: resumen, isLoading: cargandoResumen } = usePedidosResumen()
  const { data: zonasData } = useZonas({ activo: 'true' }, { page: 1, limit: 100 })

  const pedidos = data?.data || []
  const zonas = zonasData?.data || []

  const columnas = createTableColumns([
    {
      accessorKey: 'codigo',
      header: 'ID pedido',
      cell: (v, row) => (
        <button type="button" onClick={() => navigate(`/pedidos/${row.original.id}`)} className="font-mono text-sm font-semibold text-primary hover:underline text-left">
          #{v}
        </button>
      ),
    },
    {
      accessorKey: 'cliente',
      header: 'Cliente / destino',
      cell: (_, row) => (
        <div className="min-w-[12rem]">
          <p className="font-semibold text-gray-900">{row.original.cliente?.razonSocial}</p>
          <p className="flex items-start gap-1 text-xs text-gray-600">
            <MapPin className="h-3.5 w-3.5 mt-px flex-shrink-0" aria-hidden="true" />
            {[row.original.zona?.nombre, row.original.direccionEntrega].filter(Boolean).join(' · ')}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'fechaHora',
      header: 'Fecha & hora',
      cell: (v) => <span className="font-mono text-xs whitespace-nowrap">{fecha(v)}<br />{hora(v)}</span>,
    },
    {
      accessorKey: 'detalles',
      header: 'Total / cantidad',
      cell: (detalles) => {
        const total = detalles.reduce((s, d) => s + Number(d.cantidad), 0)
        const unidad = [...new Set(detalles.map((d) => d.unidad))].join('/')
        return (
          <div className="min-w-[9rem]">
            <p className="font-semibold text-gray-900">{num(total)} {unidad}</p>
            <p className="font-mono text-xs text-gray-600 line-clamp-2">{detalles.map((d) => d.producto?.nombre).join(' · ')}</p>
          </div>
        )
      },
    },
    {
      accessorKey: 'despachos',
      header: 'Repartidor & móvil',
      cell: (despachos) => {
        const d = despachos?.at(-1)?.despacho
        if (!d) return <span className="text-sm italic text-gray-500">Por asignar</span>
        return (
          <div>
            <p className="text-gray-900">{d.repartidor?.usuario?.nombre || 'Sin repartidor'}</p>
            <p className="flex items-center gap-1 text-xs text-gray-600">
              <Bike className="h-3.5 w-3.5" aria-hidden="true" />
              {d.vehiculo ? `${d.vehiculo.codigo} · ${TIPO_VEHICULO[d.vehiculo.tipo] || d.vehiculo.tipo}` : d.codigo}
            </p>
          </div>
        )
      },
    },
    {
      accessorKey: 'estado',
      header: 'Estado',
      cell: (v, row) => {
        const e = getEstadoConfig(v)
        const prioridad = getPrioridadConfig(row.original.prioridad)
        return (
          <div className="flex flex-col items-start gap-1">
            <Badge variant={e.color}>{e.label}</Badge>
            {['ALTA', 'URGENTE'].includes(row.original.prioridad) && <span className="text-[11px] text-gray-600">Prioridad {prioridad.label.toLowerCase()}</span>}
          </div>
        )
      },
    },
    {
      id: 'acciones',
      header: () => <span className="block text-right">Acciones operativas</span>,
      cell: ({ row }) => {
        const p = row.original
        const despacho = p.despachos?.at(-1)?.despacho
        const icono = 'p-2 text-gray-700 hover:bg-gray-100 hover:text-primary'
        return (
          <div className="flex items-center justify-end gap-1">
            <button type="button" className={icono} onClick={() => navigate(`/pedidos/${p.id}`)} aria-label={`Ver pedido ${p.codigo}`} title="Ver detalle">
              <Eye className="h-4 w-4" />
            </button>
            {despacho ? (
              <button type="button" className={icono} onClick={() => navigate(`/despachos/${despacho.id}`)} aria-label={`Ver despacho ${despacho.codigo}`} title={`Despacho ${despacho.codigo}`}>
                <Truck className="h-4 w-4" />
              </button>
            ) : p.estado === 'LISTO_PARA_DESPACHO' && can('despachos.create') ? (
              <button type="button" className={icono} onClick={() => navigate('/despachos/nuevo')} aria-label="Programar despacho" title="Programar despacho">
                <Truck className="h-4 w-4" />
              </button>
            ) : (
              <span className="p-2 text-gray-300" aria-hidden="true"><Truck className="h-4 w-4" /></span>
            )}
            <button type="button" className={icono} onClick={() => navigate(`/trazabilidad?pedido=${p.id}`)} aria-label={`Trazabilidad de ${p.codigo}`} title="Trazabilidad">
              <Route className="h-4 w-4" />
            </button>
          </div>
        )
      },
    },
  ])

  const enCola = resumen?.enCola
  const deltaCola = enCola ? enCola.registradosHoy - enCola.registradosAyer : 0
  const vehiculos = Object.entries(resumen?.enRuta.vehiculosEnUso || {})

  return (
    <div>
      <PageHeader
        modulo="02"
        seccion="Operaciones de planta & despacho"
        title="Gestión de Pedidos"
        description="Control de preventa, preparación en cava y programación de rutas para Valera y zonas aledañas."
        actions={
          <>
            <IndicadorCava cava={resumen?.cava} />
            {can('pedidos.create') && (
              <Button size="lg" onClick={() => navigate('/pedidos/nuevo')}>
                <Plus className="h-5 w-5" aria-hidden="true" /> Registrar nuevo pedido
              </Button>
            )}
          </>
        }
      >
        <Pestanas etiqueta="Vistas de pedidos">
          <Pestana activa={vista === 'activos'} onClick={() => cambiarVista('activos')} icon={ReceiptText} contador={resumen?.activos ?? '…'}>
            Listado de pedidos (activos)
          </Pestana>
          {can('pedidos.create') && (
            <Pestana activa={false} onClick={() => navigate('/pedidos/nuevo')} icon={FilePlus2}>Nuevo pedido / emisión rápida</Pestana>
          )}
          <Pestana activa={vista === 'historial'} onClick={() => cambiarVista('historial')} icon={History}>Historial y consulta</Pestana>
        </Pestanas>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Pedidos en cola"
          icon={ClipboardClock}
          loading={cargandoResumen}
          value={enCola?.total ?? 0}
          detail={
            enCola && (
              <span className={cn('inline-flex items-center gap-1', deltaCola > 0 ? 'text-success' : deltaCola < 0 ? 'text-danger' : 'text-gray-600')}>
                {deltaCola > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : deltaCola < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : null}
                {deltaCola > 0 ? '+' : ''}{deltaCola} registrados vs ayer
              </span>
            )
          }
        />
        <KpiCard
          label="En preparación (cava)"
          icon={Archive}
          tone="primary"
          loading={cargandoResumen}
          value={resumen?.enPreparacion.total ?? 0}
          detail={resumen && `${num(resumen.enPreparacion.cantidad)} ${resumen.enPreparacion.unidades.join('/') || 'unidades'} en preparación`}
        />
        <KpiCard
          label="En ruta / despacho"
          icon={Truck}
          loading={cargandoResumen}
          value={resumen?.enRuta.total ?? 0}
          detail={vehiculos.length ? vehiculos.map(([t, n]) => `${n} ${TIPO_VEHICULO[t] || t}`).join(' / ') : 'Sin unidades en ruta'}
        />
        <KpiCard
          label="Efectividad de entrega"
          icon={CircleCheck}
          tone="success"
          loading={cargandoResumen}
          value={resumen?.efectividad.porcentaje !== null && resumen?.efectividad.porcentaje !== undefined ? `${num(resumen.efectividad.porcentaje)}%` : '—'}
          detail={resumen && `Últimos ${resumen.efectividad.dias} días · ${resumen.efectividad.incidencias} incidencia(s) reportada(s)`}
        />
      </div>

      <section className="bg-white p-4 mb-6 flex flex-wrap items-center gap-3" aria-label="Filtros">
        <div className="relative flex-1 min-w-[16rem]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 pointer-events-none" aria-hidden="true" />
          <Input
            aria-label="Buscar pedidos"
            placeholder="Buscar por código, cliente o dirección…"
            value={filtros.search}
            onChange={(e) => cambiarFiltro('search')(e.target.value)}
            className="pl-9"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          Estado:
          <Select value={filtros.estado} onValueChange={cambiarFiltro('estado')}>
            <SelectTrigger className="w-48" aria-label="Filtrar por estado"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos</SelectItem>
              {ESTADOS_PEDIDO.filter((e) => ESTADOS_POR_VISTA[vista].includes(e.value)).map((e) => (
                <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          Zona:
          <Select value={filtros.zonaId} onValueChange={cambiarFiltro('zonaId')}>
            <SelectTrigger className="w-48" aria-label="Filtrar por zona"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todas</SelectItem>
              {zonas.map((z) => <SelectItem key={z.id} value={z.id}>{z.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </label>
        <Button variant="secondary" onClick={limpiar} disabled={!hayFiltros}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" /> Limpiar
        </Button>
      </section>

      <section className="mb-6" aria-label="Listado de pedidos">
        {isError ? (
          <p role="alert" className="bg-danger-light text-[#a2191f] px-4 py-3 text-sm">No se pudieron cargar los pedidos.</p>
        ) : (
          <>
            <DataTable
              columns={columnas}
              data={pedidos}
              loading={isLoading}
              sortable={false}
              pagination={false}
              showPagination={false}
              emptyMessage={hayFiltros ? 'Ningún pedido coincide con los filtros.' : vista === 'activos' ? 'No hay pedidos activos.' : 'Sin pedidos en el historial.'}
            />
            <PaginacionServidor pagination={data?.pagination} onPageChange={setPage} etiqueta={vista === 'activos' ? 'pedidos activos' : 'pedidos del historial'} />
          </>
        )}
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Panel titulo="Capacidad de cava y rutas" extra={resumen?.capacidad.length ? <span className="text-xs font-mono text-success">Activo</span> : null}>
          {!resumen?.capacidad.length ? (
            <p className="text-sm text-gray-600">No hay unidades cargadas en este momento.</p>
          ) : (
            <ul className="space-y-4">
              {resumen.capacidad.map((c) => (
                <li key={c.despacho}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-gray-900">{c.vehiculo} · {TIPO_VEHICULO[c.tipo] || c.tipo}{c.esTermico ? ' térmico' : ''}</span>
                    <span className="font-mono font-semibold whitespace-nowrap">
                      {c.porcentaje !== null ? `${c.porcentaje}% ` : ''}({num(c.carga)}{c.capacidad ? ` / ${num(c.capacidad)} ${c.unidadCapacidad || ''}` : ''})
                    </span>
                  </div>
                  <div className="mt-1 h-2 bg-gray-100" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={c.porcentaje ?? 0} aria-label={`Carga de ${c.vehiculo}`}>
                    <div className={cn('h-2', (c.porcentaje ?? 0) > 100 ? 'bg-danger' : (c.porcentaje ?? 0) > 85 ? 'bg-primary' : 'bg-success')} style={{ width: `${Math.min(c.porcentaje ?? 0, 100)}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-gray-600">{c.despacho}{c.repartidor ? ` · ${c.repartidor}` : ''}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel titulo="Puntos de despacho frecuentes" extra={<span className="text-xs text-gray-600">Últimos 30 días</span>}>
          {!resumen?.zonasFrecuentes.length ? (
            <p className="text-sm text-gray-600">Sin pedidos en el período.</p>
          ) : (
            <ul className="space-y-2">
              {resumen.zonasFrecuentes.map((z) => (
                <li key={z.zonaId}>
                  <button
                    type="button"
                    onClick={() => cambiarFiltro('zonaId')(z.zonaId)}
                    className="w-full flex items-center gap-3 bg-gray-50 px-4 py-3 text-left hover:bg-gray-100"
                  >
                    <Building2 className="h-5 w-5 text-primary flex-shrink-0" aria-hidden="true" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-gray-900">{z.nombre}</span>
                      {z.municipio && <span className="block text-xs text-gray-600">{z.municipio}</span>}
                    </span>
                    <span className="font-mono text-sm whitespace-nowrap">{z.pedidos} pedido(s)</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel titulo="Protocolo de preventa" extra={<ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />}>
          <p className="text-sm text-gray-700">
            SuperTequeños C.A. elabora producto ultracongelado. Los despachos en planta deben contar con precinto de
            seguridad y registro de temperatura antes de la salida a ruta.
          </p>
          <div className="mt-4 bg-gray-50 p-4 space-y-2 text-sm">
            <p className="flex items-center gap-2">
              <CircleCheck className="h-4 w-4 text-success flex-shrink-0" aria-hidden="true" />
              {resumen?.loteVigente ? (
                <span>Lote vigente en cava (FEFO): <span className="font-mono font-semibold">{resumen.loteVigente.codigo}</span></span>
              ) : (
                <span>Sin lotes disponibles en cava</span>
              )}
            </p>
            {resumen?.loteVigente && (
              <p className="text-xs text-gray-600 pl-6">
                {resumen.loteVigente.producto} · {num(resumen.loteVigente.stock)} en {resumen.loteVigente.ubicacion}
                {resumen.loteVigente.fechaVencimiento && ` · vence ${fechaSinHora(resumen.loteVigente.fechaVencimiento)}`}
              </p>
            )}
            <p className="flex items-center gap-2">
              <CircleCheck className={cn('h-4 w-4 flex-shrink-0', resumen?.cava?.conforme ? 'text-success' : 'text-gray-400')} aria-hidden="true" />
              {resumen?.cava ? `Última medición de cava: ${resumen.cava.temperaturaC.toFixed(1)} °C (límite ${resumen.cava.limiteCriticoC} °C)` : 'Sin medición de cava registrada'}
            </p>
          </div>
        </Panel>
      </div>
    </div>
  )
}
