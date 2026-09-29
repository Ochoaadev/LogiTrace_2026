import { useDeferredValue, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ArchiveRestore, Snowflake, CircleCheck, Trash2, ChartLine, Search, ClipboardList, FlaskConical, Route,
  History, Archive, Recycle, ThermometerSnowflake, LogIn, ShieldCheck, PackageCheck, Eye,
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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogCancel } from '@/components/ui/Dialog'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import {
  useDevoluciones, useDevolucionesResumen, useCreateDevolucion, useRecepcionDevolucion, useEvaluarDevolucion, useEvaluarDetalleDevolucion,
} from '@/services/query/useDevoluciones'
import { useMotivosDevolucion, useUbicaciones, useTiposResiduo } from '@/services/query/useCatalogos'
import { getEstadoConfig } from '@/schemas/devolucionSchema'
import { cn } from '@/lib/utils'

const TODOS = '__todos'
const ACTIVAS = '__activas'
const fechaHora = (d) => (d ? new Date(d).toLocaleString('es-VE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—')
const dosDigitos = (n) => String(n ?? 0).padStart(2, '0')
const mensajeError = (err, porDefecto) => err?.errors?.[0]?.mensaje || err?.message || porDefecto

// Checklist de conformidad (Figma). El primer punto es el sello de seguridad.
const CHECKLIST = [
  { id: 'sello', titulo: 'Sello inviolable de bandeja intacto', detalle: 'Film termoencogible sin rasgaduras ni adulteración en transporte.' },
  { id: 'deformacion', titulo: 'Cero deformación o condensación líquida', detalle: 'Masa firme, sin exudación de suero de queso ni escarcha cristalizada.' },
  { id: 'caja', titulo: 'Caja isotérmica con gel pack activo', detalle: 'Tiempo total en circuito dentro del protocolo de la ruta.' },
]

const DICTAMENES = [
  { value: 'REINGRESO', titulo: 'Opción A: aprobar reingreso a inventario', detalle: 'Genera un movimiento de reingreso en el módulo 06 (Inventario).', icon: LogIn },
  { value: 'CUARENTENA', titulo: 'Opción B: retener en cuarentena', detalle: 'El producto queda aislado en una ubicación de cuarentena hasta nueva evaluación.', icon: Archive },
  { value: 'DESCARTE', titulo: 'Opción C: descartar producto / merma operativa', detalle: 'Genera el registro de residuo en el módulo 08 (Gestión de residuos).', icon: Trash2, peligro: true },
]

function TempRetorno({ registro, limite }) {
  if (!registro) return <span className="text-xs text-gray-500">Sin medición</span>
  const t = Number(registro.temperaturaC)
  const conforme = t <= limite
  return (
    <span className="inline-flex items-center gap-2">
      <span className={cn('font-mono text-sm font-semibold', conforme ? 'text-gray-900' : 'text-danger')}>{t.toFixed(1)} °C</span>
      <span className={cn('font-mono text-[11px] px-1.5 py-0.5', conforme ? 'bg-success-light text-[#044317]' : 'bg-danger-light text-[#a2191f]')}>
        {conforme ? 'CONFORME' : 'QUIEBRE'}
      </span>
    </span>
  )
}

export default function DevolucionesPage() {
  const navigate = useNavigate()
  const { can } = usePermissions()
  const [estado, setEstado] = useState(ACTIVAS)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [seleccionId, setSeleccionId] = useState(null)
  const [registrarAbierto, setRegistrarAbierto] = useState(false)
  const [aviso, setAviso] = useState(null)
  const busqueda = useDeferredValue(search)

  const { data, isLoading, isError } = useDevoluciones(
    {
      search: busqueda.trim(),
      ...(estado === ACTIVAS ? { activas: 'true' } : estado !== TODOS ? { estado } : {}),
    },
    { page, limit: 10 }
  )
  const { data: resumen, isLoading: cargandoResumen } = useDevolucionesResumen()
  const devoluciones = data?.data || []
  const limite = resumen?.limiteCriticoC ?? -15
  // La estación muestra la devolución elegida o, si no hay elección, la primera activa de la lista
  const seleccion = devoluciones.find((d) => d.id === seleccionId) || devoluciones.find((d) => !['CERRADA', 'CANCELADA'].includes(d.estado)) || null

  const tasa = resumen?.tasaRetorno

  return (
    <div>
      <PageHeader
        modulo="05"
        seccion="Logística inversa y evaluación de calidad"
        title="Gestión de Devoluciones"
        description="Recepción de productos retornados, inspección de cadena de frío y registro de la decisión técnica de reincorporación a cava o descarte a merma operativa."
        actions={
          can('devoluciones.create') && (
            <Button size="lg" onClick={() => setRegistrarAbierto(true)}>
              <ArchiveRestore className="h-5 w-5" aria-hidden="true" /> Registrar retorno de mercancía
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Pendientes de dictamen"
          icon={Snowflake}
          tone={resumen?.pendientesDictamen.total ? 'danger' : 'default'}
          loading={cargandoResumen}
          value={dosDigitos(resumen?.pendientesDictamen.total)}
          detail={resumen?.pendientesDictamen.siguiente ? <>Siguiente en estación: <span className="font-mono font-semibold">#{resumen.pendientesDictamen.siguiente}</span></> : 'Sin productos esperando dictamen'}
        />
        <KpiCard
          label="Reingresadas a cava"
          icon={CircleCheck}
          tone="success"
          loading={cargandoResumen}
          value={dosDigitos(resumen?.reingresosSemana.movimientos)}
          detail={resumen && (resumen.reingresosSemana.movimientos ? `Esta semana · ${resumen.reingresosSemana.cantidad} unidades a ${resumen.reingresosSemana.ubicaciones.join(', ')}` : 'Sin reingresos esta semana')}
        />
        <KpiCard
          label="Enviadas a merma / descarte"
          icon={Trash2}
          tone={resumen?.descartesSemana.residuos ? 'danger' : 'default'}
          loading={cargandoResumen}
          value={dosDigitos(resumen?.descartesSemana.residuos)}
          detail={<>Canalizado a <Link to="/residuos" className="text-primary hover:underline">módulo 08 · Residuos</Link>{resumen?.cuarentenasSemana ? ` · ${resumen.cuarentenasSemana} en cuarentena` : ''}</>}
        />
        <KpiCard
          label="Tasa de retorno semanal"
          icon={ChartLine}
          tone={tasa?.porcentaje > tasa?.maximo ? 'danger' : 'default'}
          loading={cargandoResumen}
          value={tasa?.porcentaje !== null && tasa?.porcentaje !== undefined ? `${tasa.porcentaje}%` : '—'}
          detail={tasa && <span className={tasa.porcentaje > tasa.maximo ? 'text-danger' : 'text-success'}>Límite permisible &lt; {tasa.maximo}% · {tasa.devoluciones} de {tasa.entregas} entregas</span>}
        />
      </div>

      {aviso && (
        <p role="status" className="mb-6 flex items-center gap-2 bg-success-light text-[#044317] px-4 py-3 text-sm">
          <CircleCheck className="h-4 w-4" aria-hidden="true" /> {aviso}
        </p>
      )}

      <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-6">
        <div className="space-y-6 min-w-0">
          <Panel titulo="Registro central de logística inversa" icon={ClipboardList} extra={data?.pagination && <span className="font-mono text-xs text-gray-600">{data.pagination.total} registro(s)</span>}>
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="relative flex-1 min-w-[14rem]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 pointer-events-none" aria-hidden="true" />
                <Input aria-label="Buscar devoluciones" placeholder="Buscar por cliente, pedido o motivo…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-9" />
              </div>
              <Select value={estado} onValueChange={(v) => { setEstado(v); setPage(1) }}>
                <SelectTrigger className="w-52" aria-label="Filtrar por estado"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ACTIVAS}>En proceso</SelectItem>
                  <SelectItem value={TODOS}>Todos los estados</SelectItem>
                  {['SOLICITADA', 'EN_TRASLADO', 'RECIBIDA', 'EVALUADA', 'CERRADA', 'CANCELADA'].map((e) => (
                    <SelectItem key={e} value={e}>{getEstadoConfig(e).label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isError ? (
              <p role="alert" className="bg-danger-light text-[#a2191f] px-4 py-3 text-sm">No se pudieron cargar las devoluciones.</p>
            ) : isLoading ? (
              <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-16 bg-gray-50 animate-pulse" />)}</div>
            ) : devoluciones.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-600">{estado === ACTIVAS ? 'No hay devoluciones en proceso.' : 'Ninguna devolución coincide con el filtro.'}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      {['ID / origen', 'Cliente & causa', 'Temp. retorno', 'Estado técnico', ''].map((h, i) => (
                        <th key={i} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-gray-900">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {devoluciones.map((d) => {
                      const e = getEstadoConfig(d.estado)
                      const activa = seleccion?.id === d.id
                      const pendiente = ['RECIBIDA', 'EVALUADA'].includes(d.estado)
                      return (
                        <tr key={d.id} className={cn('border-b border-gray-100', activa ? 'bg-primary-light/40' : 'even:bg-gray-50')}>
                          <td className="px-3 py-3 align-top">
                            <Link to={`/devoluciones/${d.id}`} className="font-mono font-semibold text-primary hover:underline whitespace-nowrap">#{d.codigo}</Link>
                            <p className="font-mono text-xs text-gray-600 whitespace-nowrap">Ped: {d.despachoPedido?.pedido?.codigo}</p>
                          </td>
                          <td className="px-3 py-3 align-top">
                            <p className="font-semibold text-gray-900">{d.despachoPedido?.pedido?.cliente?.razonSocial}</p>
                            <p className={cn('text-xs', d.incidencia ? 'text-danger' : 'text-gray-600')}>{d.motivo?.nombre}{d.incidencia ? ` · ${d.incidencia.tipo?.nombre}` : ''}</p>
                          </td>
                          <td className="px-3 py-3 align-top">
                            <TempRetorno registro={d.registrosTemp?.[0]} limite={limite} />
                          </td>
                          <td className="px-3 py-3 align-top">
                            <Badge variant={pendiente ? 'danger' : e.color}>{pendiente ? `${e.label} · pendiente dictamen` : e.label}</Badge>
                          </td>
                          <td className="px-3 py-3 align-top text-right whitespace-nowrap">
                            {!['CERRADA', 'CANCELADA'].includes(d.estado) && can('devoluciones.process') ? (
                              <Button size="sm" variant={activa ? 'primary' : 'secondary'} onClick={() => setSeleccionId(d.id)}>
                                <FlaskConical className="h-4 w-4" aria-hidden="true" /> Inspeccionar
                              </Button>
                            ) : (
                              <button type="button" onClick={() => navigate(`/trazabilidad?pedido=${d.despachoPedido?.pedidoId}`)} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                                <Route className="h-4 w-4" aria-hidden="true" /> Trazabilidad
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <PaginacionServidor className="px-0 pb-0" pagination={data?.pagination} onPageChange={setPage} etiqueta="devoluciones" />
          </Panel>

          <Panel titulo="Últimas decisiones ejecutadas en cadena de frío" icon={History} extra={<span className="text-xs text-gray-600">Auditoría</span>}>
            {!resumen?.ultimasDecisiones.length ? (
              <p className="text-sm text-gray-600">Aún no hay decisiones registradas.</p>
            ) : (
              <ul className="space-y-2">
                {resumen.ultimasDecisiones.map((u, i) => {
                  const Icon = u.tipo === 'DESCARTE' ? Recycle : u.tipo === 'CUARENTENA' ? Archive : PackageCheck
                  return (
                    <li key={i} className="flex items-center gap-3 bg-gray-50 px-4 py-3">
                      <Icon className={cn('h-5 w-5 flex-shrink-0', u.tipo === 'DESCARTE' ? 'text-danger' : 'text-gray-700')} aria-hidden="true" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{u.titulo}</p>
                        <p className="text-xs text-gray-600">
                          <Link to={`/devoluciones/${u.devolucionId}`} className="hover:underline">Devolución #{u.devolucion}</Link> · {u.detalle}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-xs font-semibold whitespace-nowrap">{fechaHora(u.fechaHora)}</p>
                        <Link to={u.referencia.to} className={cn('text-xs hover:underline', u.tipo === 'DESCARTE' ? 'text-danger' : 'text-success')}>{u.referencia.etiqueta}</Link>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Panel>
        </div>

        <div className="min-w-0">
          {seleccion ? (
            <EstacionDictamen
              key={seleccion.id}
              devolucion={seleccion}
              limite={limite}
              // Al cerrar la devolución la estación pasa a la siguiente pendiente; el aviso confirma lo hecho
              onDictamen={(texto) => { setAviso(texto); setSeleccionId(null) }}
            />
          ) : (
            <section className="bg-white p-6 text-sm text-gray-600">
              <p className="label-caps text-gray-900 mb-2">Estación de cuarentena</p>
              No hay devoluciones en proceso para inspeccionar.
            </section>
          )}
        </div>
      </div>

      {registrarAbierto && <RegistrarRetornoDialog paradas={resumen?.paradasElegibles || []} onClose={() => setRegistrarAbierto(false)} onCreada={(id) => { setRegistrarAbierto(false); setSeleccionId(id); setEstado(ACTIVAS) }} />}
    </div>
  )
}

/**
 * Estación de cuarentena (Figma): según el estado, registra la recepción con temperatura, o el
 * checklist + dictamen técnico que evalúa la devolución y decide todos sus productos pendientes.
 */
function EstacionDictamen({ devolucion: d, limite, onDictamen }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { can } = usePermissions()
  const recepcion = useRecepcionDevolucion()
  const evaluar = useEvaluarDevolucion()
  const decidir = useEvaluarDetalleDevolucion()
  const { data: ubicacionesData } = useUbicaciones({ activo: 'true' }, { page: 1, limit: 100 })
  const { data: tiposResiduoData } = useTiposResiduo({ activo: 'true' }, { page: 1, limit: 100 })

  const [temp, setTemp] = useState('')
  const [checks, setChecks] = useState({ sello: false, deformacion: false, caja: false })
  const [dictamen, setDictamen] = useState('REINGRESO')
  const [ubicacionId, setUbicacionId] = useState('')
  const [tipoResiduoId, setTipoResiduoId] = useState('')
  const [justificacion, setJustificacion] = useState('')
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)

  const pendientes = d.detalles.filter((x) => !x.decision)
  const ubicaciones = (ubicacionesData?.data || []).filter((u) => (dictamen === 'CUARENTENA' ? u.tipo === 'CUARENTENA' : ['CAVA', 'ALMACEN'].includes(u.tipo)))
  const tempRecepcion = d.registrosTemp?.[0]
  const todosConformes = Object.values(checks).every(Boolean) && tempRecepcion && Number(tempRecepcion.temperaturaC) <= limite
  const puede = can('devoluciones.process')

  const registrarRecepcion = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      await recepcion.mutateAsync({ id: d.id, temperatura: temp === '' ? undefined : String(temp), observaciones: 'Recepción en estación de cuarentena' })
    } catch (err) {
      setError(mensajeError(err, 'No se pudo registrar la recepción'))
    }
  }

  const confirmar = async (e) => {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      if (d.estado === 'RECIBIDA') {
        const fallas = CHECKLIST.filter((c) => !checks[c.id]).map((c) => c.titulo.toLowerCase())
        await evaluar.mutateAsync({
          id: d.id,
          selloIntegro: checks.sello,
          condicionEmpaque: fallas.length ? `No conforme: ${fallas.join('; ')}` : 'Conforme en los tres puntos del checklist',
          observaciones: justificacion || undefined,
        })
      }
      // Un dictamen para todos los productos pendientes de la devolución
      for (const det of pendientes) {
        await decidir.mutateAsync({
          id: d.id,
          detalleDevolucionId: det.id,
          estadoProducto: dictamen === 'REINGRESO' ? 'APTO_PARA_VENTA' : dictamen === 'CUARENTENA' ? 'DETERIORADO' : 'NO_APTO_PARA_VENTA',
          decision: dictamen,
          ...(dictamen === 'DESCARTE' ? { tipoResiduoId } : { ubicacionId, loteId: det.loteId }),
        })
      }
      const destino = dictamen === 'DESCARTE' ? 'descarte (residuo registrado en el módulo 08)' : `${dictamen === 'CUARENTENA' ? 'cuarentena' : 'reingreso'} en ${ubicaciones.find((u) => u.id === ubicacionId)?.nombre}`
      onDictamen(`Dictamen registrado para la devolución #${d.codigo}: ${destino}.`)
    } catch (err) {
      setError(mensajeError(err, 'No se pudo registrar el dictamen'))
    } finally {
      setEnviando(false)
    }
  }

  const valido = pendientes.length > 0 && (dictamen === 'DESCARTE' ? !!tipoResiduoId : !!ubicacionId)
  const opcion = DICTAMENES.find((o) => o.value === dictamen)

  return (
    <section className="bg-white p-6 space-y-5" aria-label={`Estación de cuarentena: ${d.codigo}`}>
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold bg-primary text-white px-2 py-1">ESTACIÓN CUARENTENA</span>
            <span className="font-mono text-sm font-semibold">#{d.codigo}</span>
          </p>
          <h2 className="mt-2 text-lg font-semibold text-gray-900">Dictamen técnico de calidad</h2>
          <p className="text-xs text-gray-600">Responsable: operador de cava / supervisor de planta</p>
        </div>
        <ThermometerSnowflake className="h-6 w-6 text-primary" aria-hidden="true" />
      </header>

      <dl className="bg-gray-50 p-4 space-y-2 text-sm">
        {[
          ['Pedido de origen', <span key="p" className="font-mono font-semibold">#{d.despachoPedido?.pedido?.codigo}</span>],
          ['Cliente destino', d.despachoPedido?.pedido?.cliente?.razonSocial],
          ['Producto retornado', d.detalles.map((x) => `${Number(x.cantidad)} ${x.unidad} ${x.detallePedido?.producto?.nombre}`).join(' · ')],
          ['Temperatura de recepción', tempRecepcion ? <TempRetorno key="t" registro={tempRecepcion} limite={limite} /> : 'Sin medición'],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4">
            <dt className="text-gray-600">{k}:</dt>
            <dd className="text-right text-gray-900">{v}</dd>
          </div>
        ))}
      </dl>

      {['SOLICITADA', 'EN_TRASLADO'].includes(d.estado) ? (
        <form onSubmit={registrarRecepcion} className="space-y-3">
          <p className="text-sm text-gray-700">El producto aún no llega a planta. Registre la recepción con la temperatura medida con sonda.</p>
          <div className="grid gap-2">
            <Label htmlFor="est-temp">Temperatura de recepción (°C)</Label>
            <Input id="est-temp" type="number" step="0.1" min="-60" max="40" placeholder={`≤ ${limite}`} value={temp} onChange={(e) => setTemp(e.target.value)} />
          </div>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" disabled={!puede || recepcion.isPending} loading={recepcion.isPending}>Registrar recepción en planta</Button>
        </form>
      ) : pendientes.length === 0 ? (
        <p className="flex items-center gap-2 bg-success-light text-[#044317] px-4 py-3 text-sm">
          <CircleCheck className="h-4 w-4" aria-hidden="true" /> Dictamen completo. <Link to={`/devoluciones/${d.id}`} className="underline">Ver devolución</Link>
        </p>
      ) : (
        <form onSubmit={confirmar} className="space-y-5">
          {d.estado === 'RECIBIDA' && (
            <fieldset className="space-y-2">
              <legend className="label-caps text-gray-900 mb-2">Checklist de conformidad de cadena de frío</legend>
              {CHECKLIST.map((c, i) => (
                <label key={c.id} className="flex items-start gap-3 bg-gray-50 p-3 cursor-pointer">
                  <input type="checkbox" className="mt-1 h-4 w-4 accent-[#0f62fe]" checked={checks[c.id]} onChange={(e) => setChecks((x) => ({ ...x, [c.id]: e.target.checked }))} />
                  <span>
                    <span className="block text-sm font-semibold text-gray-900">{i + 1}. {c.titulo}</span>
                    <span className="block text-xs text-gray-600">{c.detalle}</span>
                  </span>
                </label>
              ))}
              {!todosConformes && dictamen === 'REINGRESO' && (
                <p className="text-xs text-danger">El checklist o la temperatura no están conformes: considere cuarentena o descarte.</p>
              )}
            </fieldset>
          )}

          <fieldset className="space-y-2">
            <legend className="label-caps text-gray-900 mb-2">Dictamen operativo ({pendientes.length} producto(s))</legend>
            {DICTAMENES.map((o) => (
              <label key={o.value} className={cn('flex items-start gap-3 p-3 cursor-pointer', o.peligro ? 'bg-danger-light' : 'bg-gray-50', dictamen === o.value && 'outline-2 outline-primary')}>
                <input type="radio" name="dictamen" value={o.value} checked={dictamen === o.value} onChange={() => setDictamen(o.value)} className="mt-1 accent-[#0f62fe]" />
                <o.icon className={cn('h-4 w-4 mt-0.5 flex-shrink-0', o.peligro ? 'text-danger' : 'text-gray-700')} aria-hidden="true" />
                <span>
                  <span className={cn('block text-sm font-semibold', o.peligro ? 'text-[#a2191f]' : 'text-gray-900')}>{o.titulo}</span>
                  <span className="block text-xs text-gray-600">{o.detalle}</span>
                </span>
              </label>
            ))}
          </fieldset>

          {dictamen === 'DESCARTE' ? (
            <div className="grid gap-2">
              <Label htmlFor="est-residuo">Tipo de residuo</Label>
              <Select value={tipoResiduoId} onValueChange={setTipoResiduoId}>
                <SelectTrigger id="est-residuo"><SelectValue placeholder="Seleccione el tipo de residuo" /></SelectTrigger>
                <SelectContent>
                  {(tiposResiduoData?.data || []).map((t) => <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor="est-ubicacion">{dictamen === 'CUARENTENA' ? 'Ubicación de cuarentena' : 'Cava / almacén de reingreso'}</Label>
              <Select key={dictamen} value={ubicacionId} onValueChange={setUbicacionId}>
                <SelectTrigger id="est-ubicacion"><SelectValue placeholder="Seleccione la ubicación" /></SelectTrigger>
                <SelectContent>
                  {ubicaciones.map((u) => <SelectItem key={u.id} value={u.id}>{u.codigo} · {u.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="est-just">Justificación técnica del dictamen</Label>
            <Textarea id="est-just" rows={3} maxLength={500} placeholder="Ej.: Temperatura de retorno conforme con sonda calibrada, sellos intactos…" value={justificacion} onChange={(e) => setJustificacion(e.target.value)} />
          </div>

          <div className="flex items-center justify-between gap-3 bg-gray-50 p-3">
            <div className="flex items-center gap-3">
              <span className="h-9 w-9 bg-primary text-white text-xs font-semibold flex items-center justify-center" aria-hidden="true">
                {(user?.nombre || 'U').split(' ').map((p) => p[0]).slice(0, 2).join('')}
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900">{user?.nombre}</p>
                <p className="font-mono text-xs text-gray-600">{user?.rol?.toLowerCase()}{user?.documento ? ` · ${user.documento}` : ''}</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-xs text-success"><ShieldCheck className="h-4 w-4" aria-hidden="true" /> Firma registrada</span>
          </div>

          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <Button type="submit" size="lg" variant={dictamen === 'DESCARTE' ? 'danger' : 'primary'} className={cn('w-full', dictamen === 'REINGRESO' && 'bg-success hover:bg-success/90')} disabled={!puede || !valido || enviando} loading={enviando}>
            {!enviando && <CircleCheck className="h-4 w-4" aria-hidden="true" />}
            Confirmar {opcion.value === 'REINGRESO' ? 'reingreso' : opcion.value === 'CUARENTENA' ? 'cuarentena' : 'descarte'}
          </Button>
        </form>
      )}

      <button type="button" onClick={() => navigate(`/devoluciones/${d.id}`)} className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
        <Eye className="h-4 w-4" aria-hidden="true" /> Ver expediente completo de la devolución
      </button>
    </section>
  )
}

function RegistrarRetornoDialog({ paradas, onClose, onCreada }) {
  const crear = useCreateDevolucion()
  const { data } = useMotivosDevolucion({ activo: 'true' }, { page: 1, limit: 100 })
  const [form, setForm] = useState({ parada: '', motivoId: '', observaciones: '' })
  const [error, setError] = useState(null)
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))
  const parada = paradas.find((p) => p.despachoPedidoId === form.parada)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      const { data: dev } = await crear.mutateAsync({
        despachoPedidoId: form.parada,
        motivoId: form.motivoId,
        ...(parada?.incidencia && { incidenciaId: parada.incidencia.id }),
        ...(form.observaciones && { observaciones: form.observaciones }),
      })
      onCreada(dev.id)
    } catch (err) {
      setError(mensajeError(err, 'No se pudo registrar el retorno'))
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Registrar retorno de mercancía</DialogTitle>
            <DialogDescription>Entregas en ruta, con incidencia o entregadas en los últimos 7 días que aún no tienen devolución.</DialogDescription>
          </DialogHeader>
          {paradas.length === 0 ? (
            <p className="text-sm text-gray-700">No hay entregas elegibles para registrar un retorno.</p>
          ) : (
            <>
              <div className="grid gap-2">
                <Label htmlFor="ret-parada">Pedido / entrega</Label>
                <Select value={form.parada} onValueChange={set('parada')}>
                  <SelectTrigger id="ret-parada"><SelectValue placeholder="Seleccione la entrega" /></SelectTrigger>
                  <SelectContent>
                    {paradas.map((p) => (
                      <SelectItem key={p.despachoPedidoId} value={p.despachoPedidoId}>
                        {p.pedido} · {p.cliente} ({p.estado.replaceAll('_', ' ').toLowerCase()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {parada?.incidencia && <p className="text-xs text-gray-600">Se vinculará a la incidencia {parada.incidencia.codigo}.</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ret-motivo">Motivo</Label>
                <Select value={form.motivoId} onValueChange={set('motivoId')}>
                  <SelectTrigger id="ret-motivo"><SelectValue placeholder="Seleccione el motivo" /></SelectTrigger>
                  <SelectContent>
                    {(data?.data || []).map((m) => <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ret-obs">Observaciones</Label>
                <Textarea id="ret-obs" rows={3} maxLength={1000} value={form.observaciones} onChange={(e) => set('observaciones')(e.target.value)} />
              </div>
            </>
          )}
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <DialogFooter>
            <DialogCancel type="button">Cancelar</DialogCancel>
            <Button type="submit" disabled={!form.parada || !form.motivoId || crear.isPending} loading={crear.isPending}>Registrar retorno</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
