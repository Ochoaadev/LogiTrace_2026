import { useDeferredValue, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, LayoutGrid, Bike, PackageCheck, CircleCheck, Timer, Search, Eye, Snowflake, Thermometer,
  UserRoundCheck, Truck, Send, MapPin,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Pestana, Pestanas, Panel } from '@/components/layout/ModuloUI'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { Badge } from '@/components/ui/Badge'
import { KpiCard } from '@/components/ui/KpiCard'
import { PaginacionServidor } from '@/components/ui/PaginacionServidor'
import { DataTable, createTableColumns } from '@/components/ui/Table'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { usePermissions } from '@/hooks/usePermissions'
import { useDespachos, useDespachosResumen, useCreateDespacho, useUpdateEstadoDespacho } from '@/services/query/useDespachos'
import { usePedidos } from '@/services/query/usePedidos'
import { useRepartidores } from '@/services/query/useCatalogos'
import { useRegistrarTemperatura } from '@/services/query/useTrazabilidad'
import { getEstadoConfig } from '@/schemas/despachoSchema'
import { cn } from '@/lib/utils'

const TIPO_VEHICULO = {
  MOTO: 'moto', MOTO_TERMICO: 'moto térmica', VEHICULO_LIVIANO: 'vehículo liviano', VEHICULO_LIVIANO_TERMICO: 'vehículo liviano térmico',
  FURGON: 'furgón', FURGON_TERMICO: 'furgón térmico', OTRO: 'otro', OTRO_TERMICO: 'otro térmico', SIN_VEHICULO: 'sin vehículo',
}
// Acción rápida de la tabla: el siguiente paso normal de cada estado
const SIGUIENTE = { PREPARANDO: ['EN_RUTA', 'Registrar salida'], EN_RUTA: ['FINALIZADO', 'Finalizar'] }

const hora = (d) => (d ? new Date(d).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }) : '--:--')
const dosDigitos = (n) => String(n ?? 0).padStart(2, '0')

export default function DespachosPage() {
  const navigate = useNavigate()
  const { can } = usePermissions()
  const [vista, setVista] = useState('en_ruta')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [aviso, setAviso] = useState(null)
  const busqueda = useDeferredValue(search)

  const { data, isLoading, isError } = useDespachos(
    { ...(vista !== 'todos' && { vista }), search: busqueda.trim() },
    { page, limit: 10 }
  )
  const { data: resumen, isLoading: cargandoResumen } = useDespachosResumen()
  const cambiarEstado = useUpdateEstadoDespacho()
  const despachos = data?.data || []

  const cambiarVista = (v) => { setVista(v); setPage(1) }

  const avanzar = async (d) => {
    const [estado] = SIGUIENTE[d.estado]
    setAviso(null)
    try {
      await cambiarEstado.mutateAsync({ id: d.id, estado, observaciones: 'Acción rápida desde la lista de despachos' })
      setAviso({ tipo: 'ok', texto: `${d.codigo}: ${getEstadoConfig(estado).label.toLowerCase()}.` })
    } catch (err) {
      setAviso({ tipo: 'error', texto: err?.message || 'No se pudo cambiar el estado' })
    }
  }

  const columnas = createTableColumns([
    {
      accessorKey: 'codigo',
      header: 'N° despacho',
      cell: (v, row) => (
        <button type="button" onClick={() => navigate(`/despachos/${row.original.id}`)} className="font-mono text-sm font-semibold text-primary hover:underline text-left whitespace-nowrap">
          {v}
        </button>
      ),
    },
    {
      accessorKey: 'pedidos',
      header: 'Pedido(s) asociado(s)',
      cell: (pedidos) => (
        <div className="min-w-[11rem]">
          <p className="font-mono text-sm font-semibold text-gray-900">{pedidos.map((p) => p.pedido?.codigo).join(' · ') || '—'}</p>
          <p className="text-xs text-gray-600 line-clamp-2">
            {pedidos.map((p) => p.pedido?.cliente?.razonSocial).join(' / ')}
            {pedidos.length > 0 && ` (${pedidos.reduce((s, p) => s + (p.pedido?.detalles || []).reduce((a, d) => a + Number(d.cantidad), 0), 0)} ${[...new Set(pedidos.flatMap((p) => (p.pedido?.detalles || []).map((d) => d.unidad)))].join('/')})`}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'repartidor',
      header: 'Repartidor & unidad',
      cell: (_, row) => (
        <div>
          <p className="text-gray-900">{row.original.repartidor?.usuario?.nombre || <span className="italic text-gray-500">Sin repartidor</span>}</p>
          {row.original.vehiculo && (
            <p className="font-mono text-xs text-gray-600">
              {row.original.vehiculo.codigo}{row.original.vehiculo.placa ? ` · ${row.original.vehiculo.placa}` : ''}
            </p>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'ruta',
      header: 'Sector / destino',
      cell: (_, row) => {
        const primera = row.original.pedidos[0]?.pedido
        return (
          <span className="inline-block bg-gray-50 px-2 py-1 text-xs text-gray-700 max-w-[12rem]">
            {row.original.ruta?.nombre || [primera?.zona?.nombre, primera?.direccionEntrega].filter(Boolean).join(' · ') || '—'}
            {row.original.pedidos.length > 1 && ` (+${row.original.pedidos.length - 1})`}
          </span>
        )
      },
    },
    {
      accessorKey: 'fechaHoraSalida',
      header: 'Hora salida',
      cell: (v) => <span className="font-mono text-sm whitespace-nowrap">{hora(v)}</span>,
    },
    {
      accessorKey: 'registrosTemperatura',
      header: 'Temp. vehículo',
      cell: (registros, row) => {
        const r = registros?.[0]
        if (!r) return <span className="text-xs text-gray-500">Sin registro</span>
        const t = Number(r.temperaturaC)
        const conforme = t <= (resumen?.limiteCriticoC ?? -15)
        return (
          <span className={cn('inline-flex items-center gap-1 font-mono text-sm', conforme ? 'text-success' : 'text-danger font-semibold')}>
            {conforme ? <Snowflake className="h-3.5 w-3.5" aria-hidden="true" /> : <Thermometer className="h-3.5 w-3.5" aria-hidden="true" />}
            {t.toFixed(1)} °C
            {row.original.estado === 'FINALIZADO' && <span className="text-xs text-gray-600 ml-1">final</span>}
          </span>
        )
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
      id: 'acciones',
      header: () => <span className="block text-right">Acciones</span>,
      cell: ({ row }) => {
        const d = row.original
        const siguiente = SIGUIENTE[d.estado]
        return (
          <div className="flex items-center justify-end gap-1">
            {siguiente && can('despachos.change_state') && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => avanzar(d)}
                disabled={cambiarEstado.isPending}
                loading={cambiarEstado.isPending && cambiarEstado.variables?.id === d.id}
              >
                {siguiente[1]}
              </Button>
            )}
            <button type="button" className="p-2 text-gray-700 hover:bg-gray-100 hover:text-primary" onClick={() => navigate(`/despachos/${d.id}`)} aria-label={`Ver despacho ${d.codigo}`} title="Ver detalle">
              <Eye className="h-4 w-4" />
            </button>
          </div>
        )
      },
    },
  ])

  const distribucion = Object.entries(resumen?.enRuta.distribucion || {})
  const ciclo = resumen?.tiempoCiclo
  const diferenciaCiclo = ciclo?.minutos !== null && ciclo?.anterior !== null && ciclo ? ciclo.minutos - ciclo.anterior : null

  return (
    <div>
      <PageHeader
        modulo="03"
        seccion="Despachos y asignación de rutas"
        title="Despachos y Reparto"
        description="Asignación de pedidos a motorizados y unidades térmicas, control de salidas y confirmación de entregas en Valera y zonas aledañas."
        actions={
          <>
            <Button variant="outline" onClick={() => navigate('/despachos/flujo')}>
              <LayoutGrid className="h-4 w-4" aria-hidden="true" /> Tablero de rutas activas
            </Button>
            {can('despachos.create') && (
              <Button size="lg" onClick={() => navigate('/despachos/nuevo')}>
                <Plus className="h-5 w-5" aria-hidden="true" /> Nueva hoja de despacho
              </Button>
            )}
          </>
        }
      >
        <Pestanas etiqueta="Vistas de despachos">
          <Pestana activa={vista === 'en_ruta'} onClick={() => cambiarVista('en_ruta')} contador={resumen?.enRuta.total ?? '…'}>En ruta</Pestana>
          <Pestana activa={vista === 'pendientes'} onClick={() => cambiarVista('pendientes')} contador={resumen?.pendientes ?? '…'}>Pendientes de salida</Pestana>
          <Pestana activa={vista === 'completados_hoy'} onClick={() => cambiarVista('completados_hoy')} contador={resumen?.completadosHoy ?? '…'}>Completados hoy</Pestana>
          <Pestana activa={vista === 'todos'} onClick={() => cambiarVista('todos')}>Hojas de salida</Pestana>
        </Pestanas>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Despachos activos"
          icon={Bike}
          tone="primary"
          loading={cargandoResumen}
          value={dosDigitos(resumen?.enRuta.total)}
          detail={
            distribucion.length
              ? `Distribución: ${distribucion.map(([t, n]) => `${n} ${TIPO_VEHICULO[t] || t}`).join(' · ')}${resumen.enRuta.conIncidencia ? ` · ${resumen.enRuta.conIncidencia} con incidencia` : ''}`
              : 'Sin unidades en ruta'
          }
        />
        <KpiCard
          label="Listos para salida"
          icon={PackageCheck}
          loading={cargandoResumen}
          value={dosDigitos(resumen?.listosParaSalida)}
          detail="Pedidos preparados en cava, sin despacho asignado"
        />
        <KpiCard
          label="Entregas completadas hoy"
          icon={CircleCheck}
          tone="success"
          loading={cargandoResumen}
          value={dosDigitos(resumen?.entregasHoy)}
          detail={`${resumen?.completadosHoy ?? 0} despacho(s) cerrados hoy`}
        />
        <KpiCard
          label="Tiempo promedio de ciclo"
          icon={Timer}
          loading={cargandoResumen}
          value={ciclo?.minutos !== null && ciclo?.minutos !== undefined ? <>{ciclo.minutos}<span className="text-sm font-normal text-gray-600 ml-1">min / entrega</span></> : '—'}
          detail={
            diferenciaCiclo !== null
              ? <span className={diferenciaCiclo <= 0 ? 'text-success' : 'text-danger'}>{diferenciaCiclo > 0 ? '+' : ''}{diferenciaCiclo} min vs 30 días anteriores</span>
              : `Salida → entrega, últimos ${ciclo?.dias ?? 30} días`
          }
        />
      </div>

      {aviso && (
        <p role="status" className={cn('mb-4 px-4 py-3 text-sm', aviso.tipo === 'error' ? 'bg-danger-light text-[#a2191f]' : 'bg-success-light text-[#044317]')}>{aviso.texto}</p>
      )}

      <section className="mb-6" aria-label="Listado de despachos">
        <div className="bg-white p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[16rem]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 pointer-events-none" aria-hidden="true" />
            <Input
              aria-label="Buscar despachos"
              placeholder="Buscar por despacho, pedido, repartidor, placa o precinto…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="pl-9"
            />
          </div>
        </div>
        {isError ? (
          <p role="alert" className="bg-danger-light text-[#a2191f] px-4 py-3 text-sm">No se pudieron cargar los despachos.</p>
        ) : (
          <>
            <DataTable
              columns={columnas}
              data={despachos}
              loading={isLoading}
              sortable={false}
              pagination={false}
              showPagination={false}
              emptyMessage={{
                en_ruta: 'No hay despachos en ruta.',
                pendientes: 'No hay despachos pendientes de salida.',
                completados_hoy: 'Aún no se han completado despachos hoy.',
                todos: 'No hay despachos registrados.',
              }[vista]}
            />
            <PaginacionServidor pagination={data?.pagination} onPageChange={setPage} etiqueta="despachos" />
          </>
        )}
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-6">
        {can('despachos.create') && <AsignacionRapida flota={resumen?.flota || []} limiteCriticoC={resumen?.limiteCriticoC} onAviso={setAviso} />}
        <Panel
          titulo="Resumen de flota local"
          icon={Truck}
          extra={resumen && <span className="bg-success-light text-[#044317] text-xs px-2 py-1">{resumen.flota.length} unidades registradas</span>}
        >
          {!resumen?.flota.length ? (
            <p className="text-sm text-gray-600">No hay vehículos activos registrados.</p>
          ) : (
            <ul className="space-y-2">
              {resumen.flota.map((v) => (
                <li key={v.id} className="bg-gray-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-gray-900">
                      {v.codigo}{v.descripcion ? ` (${v.descripcion})` : ''}
                      {v.placa && <span className="font-mono font-normal text-xs text-gray-600 ml-2">{v.placa}</span>}
                    </p>
                    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap', v.estadoOperativo === 'DISPONIBLE' ? 'text-success' : 'text-primary')}>
                      <span className={cn('h-2 w-2 rounded-full', v.estadoOperativo === 'DISPONIBLE' ? 'bg-success' : 'bg-primary')} aria-hidden="true" />
                      {{ DISPONIBLE: 'Disponible', ASIGNADO: 'Asignada', EN_RUTA: 'En ruta' }[v.estadoOperativo]}
                    </span>
                  </div>
                  {v.repartidor && <p className="text-xs text-gray-700 mt-1">Asignada a: <span className="font-medium">{v.repartidor}</span> · {v.despacho}</p>}
                  <p className="text-xs text-gray-600 mt-1">
                    {TIPO_VEHICULO[v.tipo] || v.tipo}{v.esTermico ? ' · térmico' : ''}
                    {v.capacidadCarga ? ` · capacidad ${v.capacidadCarga} ${v.unidadCapacidad || ''}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {resumen?.disponibilidadFlota !== null && resumen?.disponibilidadFlota !== undefined && (
            <p className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-700">
              Disponibilidad de flota activa: <span className="font-mono font-semibold">{resumen.disponibilidadFlota}%</span>
            </p>
          )}
        </Panel>
      </div>
    </div>
  )
}

/**
 * Asignación rápida (Figma): un pedido listo + repartidor + unidad + precinto → despacho de una
 * parada que sale a ruta en el acto, con la temperatura de salida si se midió.
 */
function AsignacionRapida({ flota, limiteCriticoC, onAviso }) {
  const navigate = useNavigate()
  const crear = useCreateDespacho()
  const cambiarEstado = useUpdateEstadoDespacho()
  const registrarTemp = useRegistrarTemperatura()
  const { data: pedidosData } = usePedidos({ estado: 'LISTO_PARA_DESPACHO' }, { page: 1, limit: 100 })
  const { data: repartidoresData } = useRepartidores({ estado: 'DISPONIBLE' }, { page: 1, limit: 100 })
  const pedidos = pedidosData?.data || []
  const repartidores = repartidoresData?.data || []
  const unidades = flota.filter((v) => v.estadoOperativo === 'DISPONIBLE')

  const vacio = { pedidoId: '', repartidorId: '', vehiculoId: '', precinto: '', temperatura: '', instrucciones: '' }
  const [form, setForm] = useState(vacio)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))
  const valido = form.pedidoId && form.repartidorId && form.vehiculoId && form.precinto.trim()

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      const { data: despacho } = await crear.mutateAsync({
        repartidorId: form.repartidorId,
        vehiculoId: form.vehiculoId,
        precintoSeguridad: form.precinto.trim(),
        ...(form.instrucciones && { observaciones: form.instrucciones }),
        pedidos: [{ pedidoId: form.pedidoId, ordenParada: 1 }],
      })
      if (form.temperatura !== '') {
        await registrarTemp.mutateAsync({ tipoRegistro: 'VEHICULO_SALIDA', despachoId: despacho.id, temperaturaC: Number(form.temperatura), observaciones: 'Temperatura de salida' })
      }
      await cambiarEstado.mutateAsync({ id: despacho.id, estado: 'EN_RUTA', observaciones: 'Salida generada desde asignación rápida' })
      setForm(vacio)
      onAviso({ tipo: 'ok', texto: `Despacho ${despacho.codigo} generado y en ruta.` })
    } catch (err) {
      setError(err?.errors?.[0]?.mensaje || err?.message || 'No se pudo generar la salida')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Panel titulo="Asignación rápida de repartidor" icon={UserRoundCheck} extra={<span className="text-xs text-gray-600">Despacho de una parada</span>}>
      {pedidos.length === 0 ? (
        <p className="text-sm text-gray-600">No hay pedidos listos para despacho. Márquelos como listos desde el detalle del pedido.</p>
      ) : (
        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="ar-pedido">Pedido listo para despacho</Label>
            <Select value={form.pedidoId} onValueChange={set('pedidoId')}>
              <SelectTrigger id="ar-pedido"><SelectValue placeholder="Seleccione pedido" /></SelectTrigger>
              <SelectContent>
                {pedidos.map((p) => <SelectItem key={p.id} value={p.id}>{p.codigo} · {p.cliente?.razonSocial}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ar-repartidor">Repartidor disponible</Label>
            <Select value={form.repartidorId} onValueChange={set('repartidorId')}>
              <SelectTrigger id="ar-repartidor"><SelectValue placeholder={repartidores.length ? 'Seleccione repartidor' : 'Ninguno disponible'} /></SelectTrigger>
              <SelectContent>
                {repartidores.map((r) => <SelectItem key={r.id} value={r.id}>{r.usuario?.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ar-unidad">Unidad asignada</Label>
            <Select value={form.vehiculoId} onValueChange={set('vehiculoId')}>
              <SelectTrigger id="ar-unidad"><SelectValue placeholder={unidades.length ? 'Seleccione unidad' : 'Ninguna disponible'} /></SelectTrigger>
              <SelectContent>
                {unidades.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.codigo} · {TIPO_VEHICULO[v.tipo] || v.tipo}{v.esTermico ? ' térmico' : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ar-precinto">N° de precinto de seguridad</Label>
            <Input id="ar-precinto" maxLength={50} className="font-mono" placeholder="Ej.: PREC-9024" value={form.precinto} onChange={(e) => set('precinto')(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ar-temp">Temperatura de salida (°C, opcional)</Label>
            <Input id="ar-temp" type="number" step="0.1" min="-60" max="40" placeholder={limiteCriticoC !== undefined ? `≤ ${limiteCriticoC}` : '-18.0'} value={form.temperatura} onChange={(e) => set('temperatura')(e.target.value)} />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="ar-instrucciones">Instrucciones de ruta y cobro</Label>
            <Textarea id="ar-instrucciones" rows={2} placeholder="Ej.: Entregar en rampa de descarga. Cobro con punto inalámbrico." value={form.instrucciones} onChange={(e) => set('instrucciones')(e.target.value)} />
          </div>
          {error && <p role="alert" className="md:col-span-2 text-sm text-danger">{error}</p>}
          <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100">
            <p className="flex items-center gap-1.5 text-xs text-gray-600">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> Queda registrado en la trazabilidad del pedido.
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => navigate('/despachos/nuevo')}>Varias paradas…</Button>
              <Button type="submit" disabled={!valido || enviando} loading={enviando}>
                {!enviando && <Send className="h-4 w-4" aria-hidden="true" />} Generar salida a ruta
              </Button>
            </div>
          </div>
        </form>
      )}
    </Panel>
  )
}
