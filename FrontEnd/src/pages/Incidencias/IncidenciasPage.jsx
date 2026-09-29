import { useDeferredValue, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Download, BellPlus, TriangleAlert, CircleCheck, UserX, Snowflake, Thermometer, Search, RefreshCw,
  MapPin, ClipboardPen, ShieldCheck, Save, MapPinned,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Panel } from '@/components/layout/ModuloUI'
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
import { useIncidencias, useIncidenciasResumen, useCreateIncidencia } from '@/services/query/useIncidencias'
import { incidenciaService } from '@/services/incidenciaService'
import { descargarArchivo } from '@/services/trazabilidadService'
import { getEstadoConfig } from '@/schemas/incidenciaSchema'
import { cn } from '@/lib/utils'

const ABIERTOS = ['REPORTADA', 'EN_REVISION', 'EN_ATENCION']

// Decisión operativa inmediata del registro rápido (Figma)
const DECISIONES = [
  { value: 'REINTENTAR', titulo: 'Reintentar entrega en ruta', detalle: 'Continuar con las siguientes paradas y volver a intentar la entrega.' },
  { value: 'ESPERAR', titulo: 'Esperar 15 min de protocolo', detalle: 'Unidad detenida con cava cerrada. Notificar al supervisor.' },
  { value: 'RETORNAR', titulo: 'Cancelar y retornar a planta', detalle: 'Activa la devolución y la evaluación para reingreso a cava.', peligro: true },
]

const hora = (d) => new Date(d).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })
function hace(d) {
  const min = Math.max(0, Math.round((Date.now() - new Date(d)) / 60000))
  if (min < 60) return `hace ${min} min`
  if (min < 1440) return `hace ${Math.round(min / 60)} h`
  return `hace ${Math.round(min / 1440)} d`
}
const dosDigitos = (n) => String(n ?? 0).padStart(2, '0')

export default function IncidenciasPage() {
  const navigate = useNavigate()
  const { can } = usePermissions()
  const [tipo, setTipo] = useState(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [exportando, setExportando] = useState(false)
  const busqueda = useDeferredValue(search)

  const filtros = { ...(tipo && { tipoIncidenciaId: tipo }), search: busqueda.trim() }
  const { data, isLoading, isError, dataUpdatedAt, refetch, isFetching } = useIncidencias(filtros, { page, limit: 10 })
  const { data: resumen, isLoading: cargandoResumen } = useIncidenciasResumen()
  const incidencias = data?.data || []

  const exportar = async () => {
    setExportando(true)
    try {
      const blob = await incidenciaService.exportCsv(filtros)
      descargarArchivo(blob, `novedades-${new Date().toISOString().slice(0, 10)}.csv`)
    } finally {
      setExportando(false)
    }
  }

  const columnas = createTableColumns([
    {
      accessorKey: 'codigo',
      header: 'ID / hora',
      cell: (v, row) => {
        const abierta = ABIERTOS.includes(row.original.estado)
        return (
          <button type="button" onClick={() => navigate(`/incidencias/${row.original.id}`)} className="text-left">
            <span className={cn('flex items-center gap-1.5 font-mono text-sm font-semibold whitespace-nowrap', abierta ? 'text-danger' : 'text-gray-900')}>
              {abierta && <span className="h-2 w-2 rounded-full bg-danger" aria-hidden="true" />}
              #{v}
            </span>
            <span className="block font-mono text-xs text-gray-600 whitespace-nowrap">{hora(row.original.fechaHora)}</span>
            {abierta && <span className="block text-xs text-danger whitespace-nowrap">{hace(row.original.fechaHora)}</span>}
          </button>
        )
      },
    },
    {
      accessorKey: 'despachoPedido',
      header: 'Pedido',
      cell: (dp) => (
        <div>
          <button type="button" onClick={(e) => { e.stopPropagation(); navigate(`/pedidos/${dp.pedido?.id}`) }} className="font-mono text-sm font-semibold text-primary hover:underline whitespace-nowrap">{dp.pedido?.codigo}</button>
          <p className="font-mono text-xs text-gray-600 whitespace-nowrap">
            {dp.pedido?.detalles?.reduce((s, d) => s + Number(d.cantidad), 0)} {[...new Set(dp.pedido?.detalles?.map((d) => d.unidad))].join('/')}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'tipo',
      header: 'Causa / tipología',
      cell: (t, row) => (
        <div className="min-w-[10rem] max-w-[14rem]">
          <p className="font-semibold text-gray-900">{t?.nombre}</p>
          <p className="text-xs text-gray-600 truncate" title={row.original.descripcion}>{row.original.descripcion}</p>
        </div>
      ),
    },
    {
      accessorKey: 'id',
      header: 'Sector',
      cell: (_, row) => (
        <span className="inline-flex items-center gap-1 bg-gray-50 px-2 py-1 text-xs text-gray-700 whitespace-nowrap">
          <MapPin className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
          {row.original.despachoPedido?.pedido?.zona?.nombre || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'reportadoPor',
      header: 'Reportado por',
      cell: (u, row) => (
        <div>
          <p className="text-gray-900 whitespace-nowrap">{u?.nombre}</p>
          <p className="font-mono text-xs text-gray-600">{row.original.despachoPedido?.despacho?.vehiculo?.codigo || row.original.despachoPedido?.despacho?.codigo}</p>
        </div>
      ),
    },
    {
      accessorKey: 'estado',
      header: 'Estado operativo',
      cell: (v, row) => {
        if (row.original._count?.devoluciones > 0) return <Badge variant="default">Derivada a devolución</Badge>
        const e = getEstadoConfig(v)
        return <Badge variant={ABIERTOS.includes(v) ? 'danger' : e.color}>{e.label}</Badge>
      },
    },
  ])

  const leyenda = resumen?.leyenda
  const frio = resumen?.impactoFrio

  return (
    <div>
      <PageHeader
        modulo="04"
        seccion="Gestión de contingencias en ruta"
        title="Incidencias Operativas"
        description="Registro, tipificación y resolución de novedades durante la preparación y entrega en Valera y sectores aledaños."
        actions={
          <>
            {can('incidencias.export') && (
              <Button variant="outline" onClick={exportar} loading={exportando} disabled={exportando}>
                {!exportando && <Download className="h-4 w-4" aria-hidden="true" />} Exportar reporte de novedades
              </Button>
            )}
            {can('incidencias.create') && (
              <Button size="lg" onClick={() => document.getElementById('rr-parada')?.focus()}>
                <BellPlus className="h-5 w-5" aria-hidden="true" /> Registrar nueva incidencia
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Incidencias abiertas"
          icon={TriangleAlert}
          tone="danger"
          loading={cargandoResumen}
          value={dosDigitos(resumen?.abiertas)}
          detail={<span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-danger" aria-hidden="true" />Requieren decisión del despacho</span>}
        />
        <KpiCard
          label="Resueltas hoy"
          icon={CircleCheck}
          tone="success"
          loading={cargandoResumen}
          value={dosDigitos(resumen?.resueltasHoy)}
          detail={resumen?.tiempoResolucionMin !== null && resumen?.tiempoResolucionMin !== undefined ? `Resolución promedio: ${resumen.tiempoResolucionMin} min (${resumen.dias} días)` : 'Sin resoluciones en el período'}
        />
        <KpiCard
          label="Causa más frecuente"
          icon={UserX}
          tone="primary"
          loading={cargandoResumen}
          value={resumen?.causaFrecuente ? <span className="text-xl font-sans">{resumen.causaFrecuente.nombre} <span className="font-mono text-base text-primary">{resumen.causaFrecuente.porcentaje}%</span></span> : '—'}
          detail={resumen?.causaFrecuente ? `${resumen.causaFrecuente.total} caso(s) en los últimos ${resumen.dias} días` : `Sin incidencias en los últimos ${resumen?.dias ?? 30} días`}
        />
        <KpiCard
          label="Impacto en frío"
          icon={Snowflake}
          tone={frio?.quiebres ? 'danger' : 'default'}
          loading={cargandoResumen}
          value={<>{frio?.quiebres ?? 0}<span className="text-sm font-normal text-gray-600 ml-1">quiebres</span></>}
          detail={
            frio?.rango
              ? <span className={frio.quiebres ? 'text-danger' : 'text-success'}>{frio.quiebres ? 'Registros sobre el límite' : 'Cadena de frío estable'} ({frio.rango.min.toFixed(1)} °C a {frio.rango.max.toFixed(1)} °C)</span>
              : 'Sin mediciones en despachos con incidencias'
          }
        />
      </div>

      <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-6 mb-6">
        <div className="min-w-0 space-y-4">
          <div className="bg-white p-3 flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por causa">
            <button
              type="button"
              onClick={() => { setTipo(null); setPage(1) }}
              aria-pressed={!tipo}
              className={cn('px-3 py-2 text-sm', !tipo ? 'bg-primary text-white' : 'bg-gray-50 text-gray-900 hover:bg-gray-100')}
            >
              Todas ({resumen?.porTipo.reduce((s, t) => s + t.total, 0) ?? '…'})
            </button>
            {resumen?.porTipo.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { setTipo(t.id); setPage(1) }}
                aria-pressed={tipo === t.id}
                className={cn('px-3 py-2 text-sm', tipo === t.id ? 'bg-primary text-white' : 'bg-gray-50 text-gray-900 hover:bg-gray-100')}
              >
                {t.nombre} {t.total > 0 && <span className="font-mono text-xs">({t.total})</span>}
              </button>
            ))}
            <button type="button" onClick={() => refetch()} className="ml-auto inline-flex items-center gap-1.5 px-2 py-2 text-xs text-gray-600 hover:text-gray-900" title="Actualizar">
              <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} aria-hidden="true" />
              Actualizado {dataUpdatedAt ? hora(dataUpdatedAt) : '—'}
            </button>
          </div>

          <section className="bg-white" aria-label="Bitácora de incidencias">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4">
              <h2 className="text-base font-semibold text-gray-900">Bitácora de eventos e incidencias en ruta</h2>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 pointer-events-none" aria-hidden="true" />
                <Input aria-label="Buscar incidencias" placeholder="Código, pedido o descripción…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-9" />
              </div>
            </div>
            {isError ? (
              <p role="alert" className="bg-danger-light text-[#a2191f] px-4 py-3 text-sm">No se pudieron cargar las incidencias.</p>
            ) : (
              <>
                <DataTable
                  columns={columnas}
                  data={incidencias}
                  loading={isLoading}
                  sortable={false}
                  pagination={false}
                  showPagination={false}
                  onRowClick={(row) => navigate(`/incidencias/${row.id}`)}
                  emptyMessage={tipo || search ? 'Ninguna incidencia coincide con el filtro.' : 'No hay incidencias registradas.'}
                />
                {leyenda && (
                  <ul className="flex flex-wrap gap-x-6 gap-y-1 px-4 pt-3 text-xs text-gray-700" aria-label={`Resumen de los últimos ${resumen.dias} días`}>
                    <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 bg-danger" aria-hidden="true" />{leyenda.abiertas} abiertas</li>
                    <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 bg-success" aria-hidden="true" />{leyenda.resueltas} resueltas</li>
                    <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 bg-gray-500" aria-hidden="true" />{leyenda.conDevolucion} con devolución</li>
                    <li className="text-gray-500">Últimos {resumen.dias} días</li>
                  </ul>
                )}
                <PaginacionServidor pagination={data?.pagination} onPageChange={setPage} etiqueta="incidencias" />
              </>
            )}
          </section>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-1 gap-6 content-start min-w-0">
          {can('incidencias.create') && <RegistroRapido enTransito={resumen?.enTransito || []} tipos={resumen?.porTipo || []} />}
          <Panel titulo="Protocolo oficial SuperTequeños" icon={ShieldCheck}>
            <ul className="space-y-2 text-sm text-gray-700 list-disc pl-5">
              <li>Máximo <strong>15 minutos</strong> de espera en comercios de alto volumen.</li>
              <li>En caso de corte eléctrico en el local, verificar el pago antes de autorizar la entrega.</li>
              <li>No abrir cavas isotérmicas por más de 90 segundos acumulados si el vehículo está detenido sin refrigeración activa.</li>
            </ul>
          </Panel>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel titulo="Puntos críticos de distribución" icon={MapPinned} extra={<span className="text-xs text-gray-600">Últimos {resumen?.dias ?? 30} días</span>}>
          {!resumen?.zonasCriticas.length ? (
            <p className="text-sm text-gray-600">Sin incidencias por zona en el período.</p>
          ) : (
            <ul className="space-y-2">
              {resumen.zonasCriticas.map((z) => (
                <li key={z.id} className="flex items-center gap-3 bg-gray-50 px-4 py-3">
                  <MapPin className="h-5 w-5 text-danger flex-shrink-0" aria-hidden="true" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-gray-900">{z.nombre}</span>
                    {z.municipio && <span className="block text-xs text-gray-600">{z.municipio}</span>}
                  </span>
                  <span className="font-mono text-sm">{z.incidencias} incidencia(s)</span>
                  {z.abiertas > 0 && <Badge variant="danger">{z.abiertas} abierta(s)</Badge>}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel titulo="Control térmico durante incidencias" icon={Thermometer} extra={frio?.registros ? <Badge variant={frio.quiebres ? 'danger' : 'success'}>{frio.quiebres ? 'Fuera de norma' : 'Normal'}</Badge> : null}>
          {!frio?.ultimo ? (
            <p className="text-sm text-gray-600">Sin mediciones manuales en despachos con incidencias.</p>
          ) : (
            <div className="flex items-center gap-6 bg-gray-50 p-4">
              <div
                className={cn('h-24 w-24 rounded-full border-[6px] flex items-center justify-center flex-shrink-0', frio.ultimo.temperaturaC > frio.limiteCriticoC ? 'border-danger' : 'border-primary')}
                role="img"
                aria-label={`Última medición ${frio.ultimo.temperaturaC} grados`}
              >
                <span className="font-mono text-lg font-semibold">{frio.ultimo.temperaturaC.toFixed(1)}°</span>
              </div>
              <div className="text-sm text-gray-700 space-y-1">
                <p className="font-semibold text-gray-900">Última medición · {frio.ultimo.despacho}</p>
                <p>{frio.registros} registro(s) manuales en despachos con incidencias; límite crítico {frio.limiteCriticoC} °C.</p>
                <p className={cn('flex items-center gap-1.5', frio.quiebres ? 'text-danger' : 'text-success')}>
                  <CircleCheck className="h-4 w-4" aria-hidden="true" />
                  {frio.quiebres ? `${frio.quiebres} medición(es) fuera de rango` : 'Calidad del producto resguardada'}
                </p>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}

/**
 * Registro rápido (Figma): novedad comunicada por radio o teléfono sobre una parada en tránsito,
 * con la decisión operativa inmediata. "Cancelar y retornar" abre el registro de la devolución.
 */
function RegistroRapido({ enTransito, tipos }) {
  const navigate = useNavigate()
  const crear = useCreateIncidencia()
  const vacio = { parada: '', tipoIncidenciaId: '', descripcion: '', decision: 'REINTENTAR' }
  const [form, setForm] = useState(vacio)
  const [error, setError] = useState(null)
  const [ok, setOk] = useState(null)
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))
  const parada = enTransito.find((p) => p.despachoPedidoId === form.parada)
  const decision = DECISIONES.find((d) => d.value === form.decision)
  const valido = form.parada && form.tipoIncidenciaId && form.descripcion.trim()

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setOk(null)
    try {
      const { data: inc } = await crear.mutateAsync({
        despachoPedidoId: form.parada,
        tipoIncidenciaId: form.tipoIncidenciaId,
        descripcion: form.descripcion.trim(),
        decisionOperativa: `${decision.titulo}. ${decision.detalle}`,
      })
      setForm(vacio)
      if (form.decision === 'RETORNAR') navigate(`/incidencias/${inc.id}?accion=devolucion`)
      else setOk(`Incidencia ${inc.codigo} registrada. Instrucción: ${decision.titulo.toLowerCase()}.`)
    } catch (err) {
      setError(err?.errors?.[0]?.mensaje || err?.message || 'No se pudo registrar la incidencia')
    }
  }

  return (
    <Panel titulo="Registro rápido en línea" icon={ClipboardPen}>
      <p className="text-sm text-gray-600 mb-4">Captura directa de novedades comunicadas por radio, llamada o mensajería de despacho.</p>
      {enTransito.length === 0 ? (
        <p className="bg-gray-50 p-4 text-sm text-gray-700">No hay pedidos en tránsito en este momento.</p>
      ) : (
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="rr-parada">Pedido en tránsito *</Label>
            <Select value={form.parada} onValueChange={set('parada')}>
              <SelectTrigger id="rr-parada"><SelectValue placeholder="Seleccione el pedido en ruta…" /></SelectTrigger>
              <SelectContent>
                {enTransito.map((p) => <SelectItem key={p.despachoPedidoId} value={p.despachoPedidoId}>{p.pedido} · {p.cliente} ({p.despacho})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="rr-tipo">Tipo de causa *</Label>
            <Select value={form.tipoIncidenciaId} onValueChange={set('tipoIncidenciaId')}>
              <SelectTrigger id="rr-tipo"><SelectValue placeholder="Seleccione tipología…" /></SelectTrigger>
              <SelectContent>
                {tipos.map((t) => <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="rr-repartidor">Repartidor notificante</Label>
            <Input id="rr-repartidor" readOnly value={parada ? `${parada.repartidor || 'Sin repartidor'}${parada.vehiculo ? ` (${parada.vehiculo})` : ''}` : ''} placeholder="Se completa al elegir el pedido" className="font-mono" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="rr-obs">Observación detallada *</Label>
            <Textarea id="rr-obs" rows={3} maxLength={1000} placeholder="Ubicación, motivo reportado por el conductor y condición de la carga congelada…" value={form.descripcion} onChange={(e) => set('descripcion')(e.target.value)} />
          </div>
          <fieldset className="grid gap-2">
            <legend className="text-xs font-medium tracking-[0.04em] text-gray-600 mb-2">Decisión operativa inmediata *</legend>
            {DECISIONES.map((d) => (
              <label key={d.value} className={cn('flex items-start gap-3 p-3 cursor-pointer', d.peligro ? 'bg-danger-light' : 'bg-gray-50', form.decision === d.value && 'outline-2 outline-primary')}>
                <input type="radio" name="decision" value={d.value} checked={form.decision === d.value} onChange={() => set('decision')(d.value)} className="mt-1 accent-[#0f62fe]" />
                <span>
                  <span className={cn('block text-sm font-semibold', d.peligro ? 'text-[#a2191f]' : 'text-gray-900')}>{d.titulo}</span>
                  <span className="block text-xs text-gray-600">{d.detalle}</span>
                </span>
              </label>
            ))}
          </fieldset>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          {ok && <p role="status" className="text-sm bg-success-light text-[#044317] px-3 py-2">{ok}</p>}
          <Button type="submit" size="lg" disabled={!valido || crear.isPending} loading={crear.isPending}>
            {!crear.isPending && <Save className="h-4 w-4" aria-hidden="true" />} Registrar e instruir al conductor
          </Button>
        </form>
      )}
    </Panel>
  )
}
