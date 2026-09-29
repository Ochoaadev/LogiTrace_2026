import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Route, AlertCircle, Truck, PackageCheck, ClipboardCheck, XCircle, CircleCheck, TriangleAlert } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogCancel } from '@/components/ui/Dialog'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { usePermissions } from '@/hooks/usePermissions'
import {
  useDevolucion, useRecepcionDevolucion, useEvaluarDevolucion, useEvaluarDetalleDevolucion, useUpdateEstadoDevolucion,
} from '@/services/query/useDevoluciones'
import { useUbicaciones, useTiposResiduo } from '@/services/query/useCatalogos'
import { useExpediente } from '@/services/query/useTrazabilidad'
import {
  getEstadoConfig, getEstadoProductoConfig, getDecisionConfig, ESTADOS_PRODUCTO, DECISIONES_DEVOLUCION,
} from '@/schemas/devolucionSchema'
import { LineaTemporal } from '@/pages/Trazabilidad/components/LineaTemporal'
import { cn } from '@/lib/utils'

// Etapas del proceso, en orden, para el indicador de progreso
const ETAPAS = [
  { estado: 'SOLICITADA', label: 'Solicitada' },
  { estado: 'EN_TRASLADO', label: 'En traslado' },
  { estado: 'RECIBIDA', label: 'Recibida en planta' },
  { estado: 'EVALUADA', label: 'Evaluada' },
  { estado: 'CERRADA', label: 'Cerrada' },
]

const fechaHora = (d) =>
  d ? new Date(d).toLocaleString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
const mensajeError = (err, porDefecto) => err?.errors?.[0]?.mensaje || err?.message || porDefecto

function Fila({ etiqueta, children }) {
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-4 py-2 border-b border-gray-100 last:border-0">
      <dt className="text-sm text-gray-600">{etiqueta}</dt>
      <dd className="text-sm text-gray-900">{children || '—'}</dd>
    </div>
  )
}

function Progreso({ estado }) {
  if (estado === 'CANCELADA') {
    return <p className="bg-gray-100 px-4 py-3 text-sm text-gray-700 mb-6 flex items-center gap-2"><XCircle className="h-4 w-4" aria-hidden="true" /> Devolución cancelada</p>
  }
  const actual = ETAPAS.findIndex((e) => e.estado === estado)
  return (
    <ol className="bg-white mb-6 grid grid-cols-5" aria-label="Progreso de la devolución">
      {ETAPAS.map((e, i) => (
        <li
          key={e.estado}
          aria-current={i === actual ? 'step' : undefined}
          className={cn(
            'px-3 py-3 text-xs sm:text-sm border-b-4',
            i < actual && 'border-success text-gray-700',
            i === actual && 'border-primary text-gray-900 font-semibold',
            i > actual && 'border-gray-200 text-gray-500'
          )}
        >
          <span className="font-mono mr-1">{String(i + 1).padStart(2, '0')}</span> {e.label}
        </li>
      ))}
    </ol>
  )
}

export default function DevolucionDetallePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { can } = usePermissions()
  const { data, isLoading, error } = useDevolucion(id)
  const cambiarEstado = useUpdateEstadoDevolucion()
  const d = data?.data
  const expediente = useExpediente(d?.despachoPedido?.pedidoId)

  const [dialogo, setDialogo] = useState(null)
  const [errorAccion, setErrorAccion] = useState(null)

  if (isLoading) return <SkeletonCard />
  if (error || !d) {
    return (
      <div className="bg-white text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto text-danger mb-4" aria-hidden="true" />
        <h2 className="text-xl font-semibold text-gray-900">Devolución no encontrada</h2>
        <Button className="mt-4" onClick={() => navigate('/devoluciones')}>Volver a devoluciones</Button>
      </div>
    )
  }

  const estado = getEstadoConfig(d.estado)
  const dp = d.despachoPedido
  const puedeProcesar = can('devoluciones.process')
  const pendientes = d.detalles.filter((x) => !x.decision)
  const eventos = (expediente.data?.timeline || []).filter((e) => e.entidadId === d.id || (e.entidadTipo === 'Inventario' && e.estadoNuevo) || e.entidadTipo === 'Residuo')
  const tempRecepcion = [...d.registrosTemp].sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora)).at(-1)

  const trasladar = async () => {
    setErrorAccion(null)
    try {
      await cambiarEstado.mutateAsync({ id, estado: 'EN_TRASLADO', observaciones: 'Producto en traslado a planta' })
    } catch (err) {
      setErrorAccion(mensajeError(err, 'No se pudo registrar el traslado'))
    }
  }

  return (
    <div>
      <PageHeader
        modulo="05"
        seccion="Logística inversa · detalle"
        title={`Devolución ${d.codigo}`}
        description={`${d.motivo?.nombre || 'Devolución'} · registrada el ${fechaHora(d.fechaRegistro)}`}
        tags={<Badge variant={estado.color}>{estado.label}</Badge>}
        actions={
          <>
            <Button variant="ghost" onClick={() => navigate('/devoluciones')}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver
            </Button>
            <Button variant="secondary" onClick={() => navigate(`/trazabilidad?pedido=${dp.pedidoId}`)}>
              <Route className="h-4 w-4" aria-hidden="true" /> Ver trazabilidad
            </Button>
          </>
        }
      />

      <Progreso estado={d.estado} />

      {puedeProcesar && !['CERRADA', 'CANCELADA'].includes(d.estado) && (
        <section className="bg-white px-6 py-4 mb-6 flex flex-wrap items-center gap-3" aria-label="Acciones de la devolución">
          <span className="label-caps mr-2">Siguiente paso:</span>
          {d.estado === 'SOLICITADA' && (
            <Button size="sm" onClick={trasladar} loading={cambiarEstado.isPending} disabled={cambiarEstado.isPending}>
              <Truck className="h-4 w-4" aria-hidden="true" /> Registrar traslado a planta
            </Button>
          )}
          {['SOLICITADA', 'EN_TRASLADO'].includes(d.estado) && (
            <Button size="sm" variant={d.estado === 'EN_TRASLADO' ? 'primary' : 'secondary'} onClick={() => setDialogo('recepcion')}>
              <PackageCheck className="h-4 w-4" aria-hidden="true" /> Registrar recepción
            </Button>
          )}
          {d.estado === 'RECIBIDA' && (
            <Button size="sm" onClick={() => setDialogo('evaluacion')}>
              <ClipboardCheck className="h-4 w-4" aria-hidden="true" /> Evaluar devolución
            </Button>
          )}
          {d.estado === 'EVALUADA' && (
            <span className="text-sm text-gray-700">Decida el destino de cada producto ({pendientes.length} pendiente(s)). La devolución se cierra al decidir todos.</span>
          )}
          {d.estado !== 'EVALUADA' && (
            <Button size="sm" variant="ghost" className="text-danger" onClick={() => setDialogo('cancelar')}>
              <XCircle className="h-4 w-4" aria-hidden="true" /> Cancelar devolución
            </Button>
          )}
          {errorAccion && <p role="alert" className="w-full text-sm text-danger">{errorAccion}</p>}
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-6">
        <div className="space-y-6 min-w-0">
          <section className="bg-white p-6">
            <h2 className="label-caps text-gray-900 mb-4">Productos devueltos</h2>
            <ul className="space-y-3">
              {d.detalles.map((det) => {
                const estadoProd = getEstadoProductoConfig(det.estadoProducto)
                const decision = det.decision ? getDecisionConfig(det.decision) : null
                return (
                  <li key={det.id} className="bg-gray-50 p-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <div className="flex-1 min-w-[12rem]">
                      <p className="text-sm font-semibold text-gray-900">{Number(det.cantidad)} {det.unidad} · {det.detallePedido?.producto?.nombre}</p>
                      <p className="font-mono text-xs text-gray-600">Lote {det.lote?.codigo}</p>
                    </div>
                    <Badge variant={estadoProd.color}>{estadoProd.label}</Badge>
                    {decision ? (
                      <Badge variant={decision.color}>{decision.label}</Badge>
                    ) : d.estado === 'EVALUADA' && puedeProcesar ? (
                      <Button size="sm" onClick={() => setDialogo({ tipo: 'decision', detalle: det })}>Decidir destino</Button>
                    ) : (
                      <span className="text-xs text-gray-500">Decisión pendiente de evaluación</span>
                    )}
                  </li>
                )
              })}
            </ul>
            {d.residuos.length > 0 && (
              <p className="mt-4 text-sm text-gray-700">
                Residuos generados: {d.residuos.map((r) => `${r.codigo} (${Number(r.cantidad)} ${r.unidad}, ${r.tipoResiduo?.nombre})`).join(' · ')}
              </p>
            )}
          </section>

          {expediente.isLoading ? <SkeletonCard /> : <LineaTemporal eventos={eventos} />}
        </div>

        <div className="space-y-6 min-w-0">
          <section className="bg-white p-6">
            <h2 className="label-caps text-gray-900 mb-3">Origen</h2>
            <dl>
              <Fila etiqueta="Pedido"><Link to={`/pedidos/${dp.pedidoId}`} className="font-mono text-primary hover:underline">{dp.pedido?.codigo}</Link></Fila>
              <Fila etiqueta="Cliente">{dp.pedido?.cliente?.razonSocial}</Fila>
              <Fila etiqueta="Despacho"><Link to={`/despachos/${dp.despachoId}`} className="font-mono text-primary hover:underline">{dp.despacho?.codigo}</Link>{dp.despacho?.repartidor ? ` · ${dp.despacho.repartidor.usuario?.nombre}` : ''}</Fila>
              <Fila etiqueta="Incidencia">
                {d.incidencia ? <Link to={`/incidencias/${d.incidencia.id}`} className="font-mono text-primary hover:underline">{d.incidencia.codigo}</Link> : null}
                {d.incidencia?.tipo ? ` · ${d.incidencia.tipo.nombre}` : ''}
              </Fila>
              <Fila etiqueta="Observaciones">{d.observaciones}</Fila>
            </dl>
          </section>

          <section className="bg-white p-6">
            <h2 className="label-caps text-gray-900 mb-3">Recepción y evaluación</h2>
            <dl>
              <Fila etiqueta="Recibida">{d.fechaRecepcion ? `${fechaHora(d.fechaRecepcion)}${d.recibidoPor ? ` · ${d.recibidoPor.nombre}` : ''}` : null}</Fila>
              <Fila etiqueta="Temperatura">
                {tempRecepcion ? (
                  <span className={cn('font-mono', Number(tempRecepcion.temperaturaC) > d.limiteCriticoC ? 'text-danger font-semibold' : 'text-success')}>
                    {Number(tempRecepcion.temperaturaC).toFixed(1)} °C {Number(tempRecepcion.temperaturaC) > d.limiteCriticoC ? '(fuera de rango)' : '(conforme)'}
                  </span>
                ) : null}
              </Fila>
              <Fila etiqueta="Sello de seguridad">
                {d.evaluacion ? (
                  d.evaluacion.selloIntegro
                    ? <span className="inline-flex items-center gap-1 text-success"><CircleCheck className="h-4 w-4" aria-hidden="true" /> Íntegro</span>
                    : <span className="inline-flex items-center gap-1 text-danger"><TriangleAlert className="h-4 w-4" aria-hidden="true" /> Roto o manipulado</span>
                ) : null}
              </Fila>
              <Fila etiqueta="Empaque">{d.evaluacion?.condicionEmpaque}</Fila>
              <Fila etiqueta="Evaluó">{d.evaluacion ? `${d.evaluacion.evaluadoPor?.nombre} · ${fechaHora(d.evaluacion.fechaHora)}` : null}</Fila>
              <Fila etiqueta="Observaciones">{d.evaluacion?.observaciones}</Fila>
            </dl>
          </section>
        </div>
      </div>

      {dialogo === 'recepcion' && <RecepcionDialog devolucion={d} onClose={() => setDialogo(null)} />}
      {dialogo === 'evaluacion' && <EvaluacionDialog devolucion={d} onClose={() => setDialogo(null)} />}
      {dialogo === 'cancelar' && <CancelarDialog devolucion={d} onClose={() => setDialogo(null)} />}
      {dialogo?.tipo === 'decision' && <DecisionDialog devolucion={d} detalle={dialogo.detalle} onClose={() => setDialogo(null)} />}
    </div>
  )
}

function DialogoFormulario({ titulo, descripcion, onClose, onSubmit, error, enviando, valido, textoBoton, children, peligro }) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit() }} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{titulo}</DialogTitle>
            {descripcion && <DialogDescription>{descripcion}</DialogDescription>}
          </DialogHeader>
          {children}
          {error && <p className="text-sm text-danger" role="alert">{error}</p>}
          <DialogFooter>
            <DialogCancel type="button">Volver</DialogCancel>
            <Button type="submit" variant={peligro ? 'danger' : 'primary'} disabled={!valido || enviando} loading={enviando}>{textoBoton}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function useEnvio(mutacion, onClose, mensaje) {
  const [error, setError] = useState(null)
  const enviar = async (datos) => {
    setError(null)
    try {
      await mutacion.mutateAsync(datos)
      onClose()
    } catch (err) {
      setError(mensajeError(err, mensaje))
    }
  }
  return { error, enviar }
}

function RecepcionDialog({ devolucion, onClose }) {
  const recepcion = useRecepcionDevolucion()
  const { error, enviar } = useEnvio(recepcion, onClose, 'No se pudo registrar la recepción')
  const [temperatura, setTemperatura] = useState('')
  const [observaciones, setObservaciones] = useState('')
  return (
    <DialogoFormulario
      titulo={`Recepción en planta · ${devolucion.codigo}`}
      descripcion={`Registre la temperatura del producto al llegar (límite crítico ${devolucion.limiteCriticoC} °C).`}
      onClose={onClose}
      onSubmit={() => enviar({ id: devolucion.id, temperatura: temperatura === '' ? undefined : String(temperatura), observaciones: observaciones || undefined })}
      error={error}
      enviando={recepcion.isPending}
      valido
      textoBoton="Registrar recepción"
    >
      <div className="grid gap-2">
        <Label htmlFor="temp-recepcion">Temperatura (°C)</Label>
        <Input id="temp-recepcion" type="number" step="0.1" min="-60" max="40" placeholder="-17.0" value={temperatura} onChange={(e) => setTemperatura(e.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="obs-recepcion">Observaciones</Label>
        <Textarea id="obs-recepcion" rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
      </div>
    </DialogoFormulario>
  )
}

function EvaluacionDialog({ devolucion, onClose }) {
  const evaluar = useEvaluarDevolucion()
  const { error, enviar } = useEnvio(evaluar, onClose, 'No se pudo registrar la evaluación')
  const [form, setForm] = useState({ selloIntegro: '', condicionEmpaque: '', temperatura: '', observaciones: '' })
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))
  return (
    <DialogoFormulario
      titulo={`Evaluación de calidad · ${devolucion.codigo}`}
      descripcion="Inspección del sello, el empaque y la temperatura antes de decidir el destino de cada producto."
      onClose={onClose}
      onSubmit={() => enviar({
        id: devolucion.id,
        selloIntegro: form.selloIntegro === 'true',
        condicionEmpaque: form.condicionEmpaque || undefined,
        temperatura: form.temperatura === '' ? undefined : String(form.temperatura),
        observaciones: form.observaciones || undefined,
      })}
      error={error}
      enviando={evaluar.isPending}
      valido={form.selloIntegro !== ''}
      textoBoton="Registrar evaluación"
    >
      <div className="grid gap-2">
        <Label htmlFor="sello">Sello de seguridad</Label>
        <Select value={form.selloIntegro} onValueChange={set('selloIntegro')}>
          <SelectTrigger id="sello"><SelectValue placeholder="Seleccione" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Íntegro</SelectItem>
            <SelectItem value="false">Roto o manipulado</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="empaque">Condición del empaque</Label>
        <Input id="empaque" maxLength={200} placeholder="Ej.: Íntegro, sin humedad" value={form.condicionEmpaque} onChange={(e) => set('condicionEmpaque')(e.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="temp-eval">Temperatura en evaluación (°C, opcional)</Label>
        <Input id="temp-eval" type="number" step="0.1" min="-60" max="40" value={form.temperatura} onChange={(e) => set('temperatura')(e.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="obs-eval">Observaciones</Label>
        <Textarea id="obs-eval" rows={2} maxLength={500} value={form.observaciones} onChange={(e) => set('observaciones')(e.target.value)} />
      </div>
    </DialogoFormulario>
  )
}

function CancelarDialog({ devolucion, onClose }) {
  const cambiar = useUpdateEstadoDevolucion()
  const { error, enviar } = useEnvio(cambiar, onClose, 'No se pudo cancelar la devolución')
  const [motivo, setMotivo] = useState('')
  return (
    <DialogoFormulario
      titulo={`Cancelar devolución ${devolucion.codigo}`}
      descripcion="La parada vuelve a ruta. Úselo solo si la devolución se registró por error."
      onClose={onClose}
      onSubmit={() => enviar({ id: devolucion.id, estado: 'CANCELADA', observaciones: motivo })}
      error={error}
      enviando={cambiar.isPending}
      valido={!!motivo.trim()}
      textoBoton="Cancelar devolución"
      peligro
    >
      <div className="grid gap-2">
        <Label htmlFor="motivo-cancel">Motivo</Label>
        <Textarea id="motivo-cancel" rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} required />
      </div>
    </DialogoFormulario>
  )
}

// Destino de un producto devuelto: reingreso a una ubicación, cuarentena o descarte (residuo)
function DecisionDialog({ devolucion, detalle, onClose }) {
  const evaluarDetalle = useEvaluarDetalleDevolucion()
  const { error, enviar } = useEnvio(evaluarDetalle, onClose, 'No se pudo registrar la decisión')
  const { data: ubicacionesData } = useUbicaciones({ activo: 'true' }, { page: 1, limit: 100 })
  const { data: tiposResiduoData } = useTiposResiduo({ activo: 'true' }, { page: 1, limit: 100 })
  const [form, setForm] = useState({ estadoProducto: detalle.estadoProducto, decision: '', ubicacionId: '', tipoResiduoId: '' })
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v, ...(k === 'decision' && { ubicacionId: '', tipoResiduoId: '' }) }))

  const ubicaciones = (ubicacionesData?.data || []).filter((u) =>
    form.decision === 'CUARENTENA' ? u.tipo === 'CUARENTENA' : !['CUARENTENA', 'DESCARTE'].includes(u.tipo)
  )
  const tiposResiduo = tiposResiduoData?.data || []
  const valido =
    form.decision &&
    (form.decision === 'DESCARTE' ? !!form.tipoResiduoId : !!form.ubicacionId)

  return (
    <DialogoFormulario
      titulo="Destino del producto"
      descripcion={`${Number(detalle.cantidad)} ${detalle.unidad} · ${detalle.detallePedido?.producto?.nombre} · lote ${detalle.lote?.codigo}`}
      onClose={onClose}
      onSubmit={() => enviar({
        id: devolucion.id,
        detalleDevolucionId: detalle.id,
        estadoProducto: form.estadoProducto,
        decision: form.decision,
        ...(form.decision !== 'DESCARTE' && { ubicacionId: form.ubicacionId, loteId: detalle.loteId }),
        ...(form.decision === 'DESCARTE' && { tipoResiduoId: form.tipoResiduoId }),
      })}
      error={error}
      enviando={evaluarDetalle.isPending}
      valido={valido}
      textoBoton="Registrar decisión"
    >
      <div className="grid gap-2">
        <Label htmlFor="estado-prod">Estado del producto</Label>
        <Select value={form.estadoProducto} onValueChange={set('estadoProducto')}>
          <SelectTrigger id="estado-prod"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ESTADOS_PRODUCTO.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="decision">Decisión</Label>
        <Select value={form.decision} onValueChange={set('decision')}>
          <SelectTrigger id="decision"><SelectValue placeholder="Seleccione el destino" /></SelectTrigger>
          <SelectContent>
            {DECISIONES_DEVOLUCION.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {['REINGRESO', 'CUARENTENA'].includes(form.decision) && (
        <div className="grid gap-2">
          <Label htmlFor="ubicacion-dec">{form.decision === 'CUARENTENA' ? 'Ubicación de cuarentena' : 'Ubicación de reingreso'}</Label>
          <Select value={form.ubicacionId} onValueChange={set('ubicacionId')}>
            <SelectTrigger id="ubicacion-dec"><SelectValue placeholder="Seleccione la ubicación" /></SelectTrigger>
            <SelectContent>
              {ubicaciones.map((u) => <SelectItem key={u.id} value={u.id}>{u.codigo} · {u.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      {form.decision === 'DESCARTE' && (
        <div className="grid gap-2">
          <Label htmlFor="tipo-residuo">Tipo de residuo</Label>
          <Select value={form.tipoResiduoId} onValueChange={set('tipoResiduoId')}>
            <SelectTrigger id="tipo-residuo"><SelectValue placeholder="Seleccione el tipo de residuo" /></SelectTrigger>
            <SelectContent>
              {tiposResiduo.map((t) => <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-600">Se registrará el residuo en el módulo 08 (Gestión de residuos).</p>
        </div>
      )}
    </DialogoFormulario>
  )
}
