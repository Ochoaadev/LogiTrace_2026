import { useDeferredValue, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  FileDown, Plus, Archive, Snowflake, ClipboardCheck, TriangleAlert, Boxes, ArrowRightLeft, ShieldAlert, Search,
  RotateCcw, History, SlidersHorizontal, ClipboardPen, Thermometer, CircleCheck, Activity, Save,
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
import { DataTable } from '@/components/ui/Table'
import { createTableColumns } from '@/components/ui/tablaColumnas'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogCancel } from '@/components/ui/Dialog'
import { usePermissions } from '@/hooks/usePermissions'
import { useInventario, useInventarioResumen, useMovimientos, useCrearMovimiento } from '@/services/query/useInventario'
import { useUbicaciones, useLotes } from '@/services/query/useCatalogos'
import { useRegistrarTemperatura } from '@/services/query/useTrazabilidad'
import { inventarioService } from '@/services/inventarioService'
import { descargarArchivo } from '@/services/trazabilidadService'
import { getTipoMovimientoConfig, TIPOS_MOVIMIENTO } from '@/schemas/inventarioSchema'
import { fechaSinHora, diasHasta } from '@/lib/fechas'
import { cn } from '@/lib/utils'

const TODOS = '__todos'
const num = (v) => Number(v ?? 0).toLocaleString('es-VE', { maximumFractionDigits: 2 })
const fechaHora = (d) => new Date(d).toLocaleString('es-VE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
const mensajeError = (err, porDefecto) => err?.errors?.[0]?.mensaje || err?.message || porDefecto

// Ubicaciones que exige el backend según el tipo de movimiento
const REQUIERE = {
  ENTRADA: { destino: true }, REINGRESO: { destino: true },
  SALIDA: { origen: true }, DESCARTE: { origen: true },
  TRASLADO: { origen: true, destino: true },
}

// Estado sanitario / de stock de una existencia (columna del Figma)
function estadoExistencia(inv) {
  const stock = Number(inv.stockActual)
  const minimo = Number(inv.stockMinimo)
  const dias = diasHasta(inv.lote?.fechaVencimiento)
  if (inv.ubicacion?.tipo === 'CUARENTENA' || inv.lote?.estadoCalidad === 'CUARENTENA') return { label: 'En cuarentena', variant: 'warning' }
  if (inv.lote?.estadoCalidad === 'VENCIDO' || (dias !== null && dias < 0)) return { label: 'Vencido', variant: 'danger' }
  if (inv.lote?.estadoCalidad === 'NO_APTO') return { label: 'No apto', variant: 'danger' }
  if (minimo > 0 && stock <= minimo) return { label: 'Bajo mínimo', variant: 'danger' }
  if (dias !== null && dias <= 7) return { label: `Vence en ${dias} d`, variant: 'warning' }
  if (minimo > 0 && stock <= minimo * 1.25) return { label: 'Próximo al mínimo', variant: 'warning' }
  return { label: 'En stock óptimo', variant: 'success' }
}

export default function InventarioPage() {
  const navigate = useNavigate()
  const { can } = usePermissions()
  const [vista, setVista] = useState('existencias')
  const [filtros, setFiltros] = useState({ search: '', ubicacionId: TODOS, estado: TODOS })
  const [page, setPage] = useState(1)
  const [exportando, setExportando] = useState(false)
  const [tempCava, setTempCava] = useState(null)
  const busqueda = useDeferredValue(filtros.search)

  const cambiarFiltro = (k) => (v) => { setFiltros((f) => ({ ...f, [k]: v })); setPage(1) }
  const cambiarVista = (v) => { setVista(v); setPage(1) }

  const { data: resumen, isLoading: cargandoResumen } = useInventarioResumen()
  const { data: ubicacionesData } = useUbicaciones({ activo: 'true' }, { page: 1, limit: 100 })
  const ubicaciones = ubicacionesData?.data || []
  const temperaturaDe = (ubicacionId) => resumen?.cavas.find((c) => c.id === ubicacionId)?.temperatura

  const existencias = useInventario(
    {
      search: busqueda.trim(),
      ...(filtros.ubicacionId !== TODOS && { ubicacionId: filtros.ubicacionId }),
      ...(filtros.estado !== TODOS && { estado: filtros.estado }),
      ...(vista === 'cuarentena' && { tipoUbicacion: 'CUARENTENA' }),
    },
    { page, limit: 10 }
  )
  const kardex = useMovimientos(
    { search: busqueda.trim(), ...(filtros.ubicacionId !== TODOS && { ubicacionId: filtros.ubicacionId }) },
    { page, limit: 15 }
  )

  const exportar = async () => {
    setExportando(true)
    try {
      const blob = await inventarioService.exportKardex({ search: filtros.search || undefined, ...(filtros.ubicacionId !== TODOS && { ubicacionId: filtros.ubicacionId }) })
      descargarArchivo(blob, `kardex-${new Date().toISOString().slice(0, 10)}.csv`)
    } finally {
      setExportando(false)
    }
  }

  const columnasExistencias = createTableColumns([
    {
      accessorKey: 'lote',
      header: 'Lote / SKU',
      cell: (lote) => (
        <div className="min-w-[11rem]">
          <Link to={`/inventario/movimiento/${lote?.id}`} className="font-mono text-sm font-semibold text-primary hover:underline whitespace-nowrap">#{lote?.codigo}</Link>
          <p className="text-xs text-gray-600">{lote?.producto?.nombre}</p>
          {lote?.fechaVencimiento && <p className="font-mono text-[11px] text-gray-500">Vence {fechaSinHora(lote.fechaVencimiento)}</p>}
        </div>
      ),
    },
    {
      accessorKey: 'ubicacion',
      header: 'Cámara / ubic.',
      cell: (u) => {
        const t = temperaturaDe(u?.id)
        return (
          <span className="inline-block bg-gray-50 px-2 py-1 text-xs text-gray-900 whitespace-nowrap">
            <span className={cn('inline-block h-1.5 w-1.5 rounded-full mr-1.5 align-middle', u?.tipo === 'CAVA' ? 'bg-primary' : 'bg-gray-400')} aria-hidden="true" />
            {u?.nombre}
            {t && <span className={cn('block font-mono text-[11px]', t.conforme ? 'text-gray-600' : 'text-danger')}>({t.temperaturaC.toFixed(1)} °C)</span>}
          </span>
        )
      },
    },
    {
      accessorKey: 'stockActual',
      header: () => <span className="block text-right">Stock actual</span>,
      cell: (v, row) => {
        const bajo = Number(row.original.stockMinimo) > 0 && Number(v) <= Number(row.original.stockMinimo)
        return <span className={cn('block text-right font-mono font-semibold whitespace-nowrap', bajo && 'text-danger')}>{num(v)} {row.original.lote?.producto?.unidadBase}</span>
      },
    },
    {
      accessorKey: 'stockMinimo',
      header: () => <span className="block text-right">Stock mínimo</span>,
      cell: (v) => <span className="block text-right font-mono text-gray-600">{Number(v) > 0 ? num(v) : '—'}</span>,
    },
    {
      accessorKey: 'id',
      header: 'Estado sanitario / stock',
      cell: (_, row) => {
        const e = estadoExistencia(row.original)
        return <Badge variant={e.variant}>{e.label}</Badge>
      },
    },
    {
      id: 'acciones',
      header: () => <span className="block text-right">Acciones</span>,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <button type="button" className="p-2 text-gray-700 hover:bg-gray-100 hover:text-primary" onClick={() => navigate(`/inventario/movimiento/${row.original.loteId}`)} title="Kardex del lote" aria-label={`Kardex del lote ${row.original.lote?.codigo}`}>
            <History className="h-4 w-4" />
          </button>
          {can('inventario.movimientos') && (
            <button type="button" className="p-2 text-gray-700 hover:bg-gray-100 hover:text-primary" onClick={() => navigate(`/inventario/movimiento/${row.original.loteId}?accion=movimiento`)} title="Registrar movimiento" aria-label={`Movimiento del lote ${row.original.lote?.codigo}`}>
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ])

  const columnasKardex = createTableColumns([
    { accessorKey: 'fechaHora', header: 'Fecha', cell: (v) => <span className="font-mono text-xs whitespace-nowrap">{fechaHora(v)}</span> },
    {
      accessorKey: 'tipo',
      header: 'Tipo',
      cell: (v) => {
        const c = getTipoMovimientoConfig(v)
        return <Badge variant={c.color}>{c.icon && <c.icon className="h-3 w-3" aria-hidden="true" />} {c.label}</Badge>
      },
    },
    {
      accessorKey: 'lote',
      header: 'Lote',
      cell: (l) => (
        <div>
          <Link to={`/inventario/movimiento/${l?.id}`} className="font-mono text-sm text-primary hover:underline whitespace-nowrap">{l?.codigo}</Link>
          <p className="text-xs text-gray-600">{l?.producto?.nombre}</p>
        </div>
      ),
    },
    { accessorKey: 'cantidad', header: 'Cantidad', cell: (v, row) => <span className="font-mono whitespace-nowrap">{num(v)} {row.original.unidad}</span> },
    { accessorKey: 'ubicacionOrigen', header: 'Origen → destino', cell: (_, row) => <span className="text-xs whitespace-nowrap">{row.original.ubicacionOrigen?.nombre || '—'} → {row.original.ubicacionDestino?.nombre || '—'}</span> },
    { accessorKey: 'usuario', header: 'Usuario', cell: (u) => u?.nombre || '—' },
    { accessorKey: 'observaciones', header: 'Observaciones', cell: (v) => <span className="block max-w-[16rem] truncate text-xs text-gray-700" title={v || ''}>{v || '—'}</span> },
  ])

  const stock = resumen?.stockProductoTerminado
  const tabla = vista === 'kardex' ? kardex : existencias

  return (
    <div>
      <PageHeader
        modulo="06"
        seccion="Control de stock y cámaras frigoríficas"
        title="Control de Inventario y Almacenamiento"
        description="Existencias de producto terminado ultracongelado, cámaras de frío y movimientos generados por despachos, ajustes y devoluciones."
        actions={
          <>
            {can('inventario.export') && (
              <Button variant="secondary" onClick={exportar} loading={exportando} disabled={exportando}>
                {!exportando && <FileDown className="h-4 w-4" aria-hidden="true" />} Descargar reporte kardex
              </Button>
            )}
            {can('inventario.movimientos') && (
              <Button size="lg" onClick={() => document.getElementById('mov-tipo')?.focus()}>
                <Plus className="h-5 w-5" aria-hidden="true" /> Registrar movimiento manual
              </Button>
            )}
          </>
        }
      >
        <Pestanas etiqueta="Vistas de inventario">
          <Pestana activa={vista === 'existencias'} onClick={() => cambiarVista('existencias')} icon={Boxes}>Existencias de producto terminado</Pestana>
          <Pestana activa={vista === 'kardex'} onClick={() => cambiarVista('kardex')} icon={ArrowRightLeft}>Kardex de movimientos</Pestana>
          <Pestana activa={vista === 'cuarentena'} onClick={() => cambiarVista('cuarentena')} icon={ShieldAlert} contador={resumen ? resumen.porUbicacion.filter((u) => u.tipo === 'CUARENTENA').reduce((s, u) => s + u.totalItems, 0) : undefined}>
            Lotes en cuarentena
          </Pestana>
        </Pestanas>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Stock total producto terminado"
          icon={Archive}
          loading={cargandoResumen}
          value={<>{num(stock?.total)}<span className="text-sm font-normal text-gray-600 ml-1">{stock?.porProducto[0]?.unidad || 'unid.'}</span></>}
          detail={
            stock && (
              <ul className="space-y-0.5">
                {stock.porProducto.slice(0, 3).map((p) => (
                  <li key={p.producto} className="flex justify-between gap-2"><span className="truncate">{p.producto}</span><span className="font-mono">{num(p.stock)}</span></li>
                ))}
              </ul>
            )
          }
        />
        <KpiCard
          label="Cámaras de frío"
          icon={Snowflake}
          tone="primary"
          loading={cargandoResumen}
          value={resumen ? `${resumen.cavas.filter((c) => c.temperatura?.conforme).length}/${resumen.cavas.length}` : '—'}
          detail={
            resumen && (
              <ul className="space-y-0.5">
                {resumen.cavas.map((c) => (
                  <li key={c.id} className="flex justify-between gap-2">
                    <span className="truncate">{c.nombre}</span>
                    <span className={cn('font-mono', c.temperatura ? (c.temperatura.conforme ? 'text-success' : 'text-danger') : 'text-gray-500')}>
                      {c.temperatura ? `${c.temperatura.temperaturaC.toFixed(1)} °C` : 'sin registro'}
                    </span>
                  </li>
                ))}
              </ul>
            )
          }
        />
        <KpiCard
          label="Reingresos por devolución"
          icon={ClipboardCheck}
          tone="success"
          loading={cargandoResumen}
          value={String(resumen?.reingresosSemana.movimientos ?? 0).padStart(2, '0')}
          detail={resumen && <>{num(resumen.reingresosSemana.cantidad)} unidades reincorporadas esta semana con dictamen del <Link to="/devoluciones" className="text-primary hover:underline">módulo 05</Link></>}
        />
        <KpiCard
          label="Alertas de stock crítico"
          icon={TriangleAlert}
          tone={resumen?.stockBajo ? 'danger' : 'default'}
          loading={cargandoResumen}
          value={String(resumen?.stockBajo ?? 0).padStart(2, '0')}
          detail={
            resumen?.alertas.length ? (
              <ul className="space-y-0.5">
                {resumen.alertas.slice(0, 3).map((a) => (
                  <li key={a.loteId + a.ubicacion} className="flex justify-between gap-2">
                    <Link to={`/inventario/movimiento/${a.loteId}`} className="truncate hover:underline">{a.producto} ({a.ubicacion})</Link>
                    <span className="font-mono text-danger">{num(a.stockActual)}/{num(a.stockMinimo)}</span>
                  </li>
                ))}
              </ul>
            ) : 'Todas las existencias sobre su mínimo'
          }
        />
      </div>

      <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-6 mb-6">
        <section className="min-w-0" aria-label="Existencias">
          <div className="bg-white p-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[14rem]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 pointer-events-none" aria-hidden="true" />
              <Input aria-label="Buscar" placeholder={vista === 'kardex' ? 'Buscar por lote, producto u observación…' : 'Buscar por lote, producto o ubicación…'} value={filtros.search} onChange={(e) => cambiarFiltro('search')(e.target.value)} className="pl-9" />
            </div>
            <Select value={filtros.ubicacionId} onValueChange={cambiarFiltro('ubicacionId')}>
              <SelectTrigger className="w-52" aria-label="Filtrar por ubicación"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todas las ubicaciones</SelectItem>
                {ubicaciones.map((u) => <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
            {vista !== 'kardex' && (
              <Select value={filtros.estado} onValueChange={cambiarFiltro('estado')}>
                <SelectTrigger className="w-48" aria-label="Filtrar por estado del lote"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODOS}>Todos los estados</SelectItem>
                  <SelectItem value="DISPONIBLE">Disponible</SelectItem>
                  <SelectItem value="CUARENTENA">Cuarentena</SelectItem>
                  <SelectItem value="NO_APTO">No apto</SelectItem>
                  <SelectItem value="VENCIDO">Vencido</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Button variant="secondary" size="icon" aria-label="Limpiar filtros" onClick={() => { setFiltros({ search: '', ubicacionId: TODOS, estado: TODOS }); setPage(1) }}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="bg-white px-4 pb-3 label-caps text-gray-900 flex items-center gap-2">
            {vista === 'kardex' ? <><ArrowRightLeft className="h-4 w-4 text-primary" aria-hidden="true" /> Kardex de movimientos</> : vista === 'cuarentena' ? <><ShieldAlert className="h-4 w-4 text-primary" aria-hidden="true" /> Lotes retenidos en cuarentena</> : <><Boxes className="h-4 w-4 text-primary" aria-hidden="true" /> Inventario disponible en cámaras y almacenes</>}
          </h2>
          {tabla.isError ? (
            <p role="alert" className="bg-danger-light text-[#a2191f] px-4 py-3 text-sm">No se pudo cargar el inventario.</p>
          ) : (
            <>
              <DataTable
                columns={vista === 'kardex' ? columnasKardex : columnasExistencias}
                data={tabla.data?.data || []}
                loading={tabla.isLoading}
                sortable={false}
                pagination={false}
                showPagination={false}
                emptyMessage={vista === 'cuarentena' ? 'No hay lotes retenidos en cuarentena.' : vista === 'kardex' ? 'Sin movimientos registrados.' : 'No hay existencias con estos filtros.'}
              />
              <PaginacionServidor pagination={tabla.data?.pagination} onPageChange={setPage} etiqueta={vista === 'kardex' ? 'movimientos' : 'registros'} />
            </>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-1 gap-6 content-start min-w-0">
          {can('inventario.movimientos') && <RegistroMovimiento ubicaciones={ubicaciones} />}
          <Panel titulo="Temperaturas de cámaras" icon={Thermometer}>
            {!resumen?.cavas.length ? (
              <p className="text-sm text-gray-600">No hay cavas activas registradas.</p>
            ) : (
              <ul className="space-y-2">
                {resumen.cavas.map((c) => (
                  <li key={c.id} className="bg-gray-50 p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{c.nombre}</p>
                      <p className="text-xs text-gray-600">{num(c.stock)} en existencia</p>
                      {c.temperatura ? (
                        <p className={cn('text-xs flex items-center gap-1', c.temperatura.conforme ? 'text-success' : 'text-danger')}>
                          <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" /> {c.temperatura.conforme ? 'Operatividad normal' : 'Fuera de rango'} · {fechaHora(c.temperatura.fechaHora)}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-500">Sin mediciones registradas</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className={cn('font-mono text-xl font-semibold whitespace-nowrap', !c.temperatura ? 'text-gray-400' : c.temperatura.conforme ? 'text-primary' : 'text-danger')}>
                        {c.temperatura ? `${c.temperatura.temperaturaC.toFixed(1)} °C` : '—'}
                      </p>
                      <p className="font-mono text-[11px] text-gray-500">Rango ≤ {resumen.limiteCriticoC} °C</p>
                      <button type="button" onClick={() => setTempCava(c)} className="mt-1 text-xs text-primary hover:underline">Registrar</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-gray-600">Registro manual con termómetro, según los protocolos de inocuidad y control térmico de SuperTequeños C.A.</p>
          </Panel>
        </div>
      </div>

      <Panel titulo="Actividad operativa reciente (kardex)" icon={Activity} extra={<button type="button" className="text-xs text-primary hover:underline" onClick={() => cambiarVista('kardex')}>Ver kardex completo</button>}>
        {!resumen?.actividadReciente.length ? (
          <p className="text-sm text-gray-600">Sin movimientos registrados.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {resumen.actividadReciente.map((m) => {
              const c = getTipoMovimientoConfig(m.tipo)
              const signo = ['SALIDA', 'DESCARTE'].includes(m.tipo) ? '-' : m.tipo === 'TRASLADO' ? '' : m.cantidad >= 0 ? '+' : ''
              return (
                <article key={m.id} className="bg-gray-50 p-4">
                  <div className="flex justify-between gap-2 font-mono text-xs">
                    <span className="text-gray-600">{fechaHora(m.fechaHora)}</span>
                    <span className={cn('font-semibold', signo === '-' ? 'text-danger' : 'text-success')}>{signo}{num(Math.abs(m.cantidad))} {m.unidad}</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-gray-900">{c.label}{m.referenciaTipo === 'Devolucion' ? ' por devolución' : m.referenciaTipo === 'Pedido' ? ' por pedido' : ''}</p>
                  <p className="text-xs text-gray-700">
                    Lote <Link to={`/inventario/movimiento/${m.lote?.id}`} className="font-mono text-primary hover:underline">{m.lote?.codigo}</Link>
                    {m.ubicacionDestino ? ` hacia ${m.ubicacionDestino.nombre}` : m.ubicacionOrigen ? ` desde ${m.ubicacionOrigen.nombre}` : ''}
                  </p>
                  <p className="mt-2 font-mono text-[11px] text-gray-500">Resp.: {m.usuario?.nombre}</p>
                </article>
              )
            })}
          </div>
        )}
      </Panel>

      {tempCava && <TemperaturaCavaDialog cava={tempCava} limite={resumen?.limiteCriticoC} onClose={() => setTempCava(null)} />}
    </div>
  )
}

function SelectUbicacion({ id, value, onChange, ubicaciones }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id}><SelectValue placeholder="Seleccione ubicación" /></SelectTrigger>
      <SelectContent>
        {ubicaciones.map((u) => <SelectItem key={u.id} value={u.id}>{u.codigo} · {u.nombre}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}

// Registro rápido de movimiento (Figma): tipo, lote, cantidad y ubicaciones según el tipo
function RegistroMovimiento({ ubicaciones }) {
  const crear = useCrearMovimiento()
  const { data: lotesData } = useLotes({}, { page: 1, limit: 100 })
  const lotes = lotesData?.data || []
  const vacio = { tipo: 'ENTRADA', loteId: '', cantidad: '', ubicacionOrigenId: '', ubicacionDestinoId: '', observaciones: '' }
  const [form, setForm] = useState(vacio)
  const [error, setError] = useState(null)
  const [ok, setOk] = useState(null)
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))
  const req = REQUIERE[form.tipo] || {}
  const lote = lotes.find((l) => l.id === form.loteId)
  const valido = form.loteId && Number(form.cantidad) > 0 && (!req.origen || form.ubicacionOrigenId) && (!req.destino || form.ubicacionDestinoId)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setOk(null)
    try {
      await crear.mutateAsync({
        tipo: form.tipo,
        loteId: form.loteId,
        cantidad: String(form.cantidad),
        unidad: lote?.producto?.unidadBase || 'unidad',
        ...(req.origen && { ubicacionOrigenId: form.ubicacionOrigenId }),
        ...(req.destino && { ubicacionDestinoId: form.ubicacionDestinoId }),
        ...(form.observaciones && { observaciones: form.observaciones }),
      })
      setOk(`${getTipoMovimientoConfig(form.tipo).label} de ${form.cantidad} ${lote?.producto?.unidadBase || ''} registrada en el kardex del lote ${lote?.codigo}.`)
      setForm(vacio)
    } catch (err) {
      setError(mensajeError(err, 'No se pudo registrar el movimiento'))
    }
  }

  return (
    <Panel titulo="Registro rápido de movimiento" icon={ClipboardPen}>
      <form onSubmit={onSubmit} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="mov-tipo">Tipo de movimiento</Label>
          <Select value={form.tipo} onValueChange={set('tipo')}>
            <SelectTrigger id="mov-tipo"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIPOS_MOVIMIENTO.filter((t) => t.value !== 'AJUSTE').map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-600">Los ajustes por conteo físico se hacen desde el detalle del lote.</p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="mov-lote">Lote / producto</Label>
          <Select value={form.loteId} onValueChange={set('loteId')}>
            <SelectTrigger id="mov-lote"><SelectValue placeholder="Seleccione el lote" /></SelectTrigger>
            <SelectContent>
              {lotes.map((l) => <SelectItem key={l.id} value={l.id}>{l.codigo} · {l.producto?.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="mov-cant">Cantidad{lote ? ` (${lote.producto?.unidadBase})` : ''}</Label>
          <Input id="mov-cant" type="number" min="0.01" step="0.01" value={form.cantidad} onChange={(e) => set('cantidad')(e.target.value)} />
        </div>
        {req.origen && <div className="grid gap-2"><Label htmlFor="mov-origen">Ubicación de origen</Label><SelectUbicacion id="mov-origen" value={form.ubicacionOrigenId} onChange={set('ubicacionOrigenId')} ubicaciones={ubicaciones} /></div>}
        {req.destino && <div className="grid gap-2"><Label htmlFor="mov-destino">Ubicación / cámara de destino</Label><SelectUbicacion id="mov-destino" value={form.ubicacionDestinoId} onChange={set('ubicacionDestinoId')} ubicaciones={ubicaciones} /></div>}
        <div className="grid gap-2">
          <Label htmlFor="mov-obs">Observaciones / guía</Label>
          <Textarea id="mov-obs" rows={2} placeholder="Ej.: Orden de producción OP-302" value={form.observaciones} onChange={(e) => set('observaciones')(e.target.value)} />
        </div>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        {ok && <p role="status" className="text-sm bg-success-light text-[#044317] px-3 py-2">{ok}</p>}
        <Button type="submit" disabled={!valido || crear.isPending} loading={crear.isPending}>
          {!crear.isPending && <Save className="h-4 w-4" aria-hidden="true" />} Confirmar movimiento en kardex
        </Button>
      </form>
    </Panel>
  )
}

function TemperaturaCavaDialog({ cava, limite, onClose }) {
  const registrar = useRegistrarTemperatura()
  const [temp, setTemp] = useState('')
  const [obs, setObs] = useState('')
  const [error, setError] = useState(null)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      await registrar.mutateAsync({ tipoRegistro: 'CAVA', ubicacionId: cava.id, temperaturaC: Number(temp), observaciones: obs || undefined })
      onClose()
    } catch (err) {
      setError(mensajeError(err, 'No se pudo registrar la temperatura'))
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Temperatura de {cava.nombre}</DialogTitle>
            <DialogDescription>Medición manual con termómetro. Rango conforme: ≤ {limite} °C.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="temp-cava">Temperatura (°C)</Label>
            <Input id="temp-cava" type="number" step="0.1" min="-60" max="40" placeholder="-18.0" value={temp} onChange={(e) => setTemp(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="temp-cava-obs">Observaciones</Label>
            <Textarea id="temp-cava-obs" rows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
          </div>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <DialogFooter>
            <DialogCancel type="button">Cancelar</DialogCancel>
            <Button type="submit" disabled={temp === '' || registrar.isPending} loading={registrar.isPending}>Registrar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
