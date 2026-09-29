import { useState } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { ArrowLeft, Route, ArchiveRestore, AlertCircle, ChevronRight } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogCancel } from '@/components/ui/Dialog'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { usePermissions } from '@/hooks/usePermissions'
import { useIncidencia, useCambiarEstadoIncidencia } from '@/services/query/useIncidencias'
import { useCreateDevolucion } from '@/services/query/useDevoluciones'
import { useMotivosDevolucion } from '@/services/query/useCatalogos'
import { useExpediente } from '@/services/query/useTrazabilidad'
import { getEstadoConfig, getSiguientesEstados } from '@/schemas/incidenciaSchema'
import { getEstadoConfig as getEstadoDevolucionConfig } from '@/schemas/devolucionSchema'
import { LineaTemporal } from '@/pages/Trazabilidad/components/LineaTemporal'
import { MapaRecorrido } from '@/pages/Trazabilidad/components/MapaRecorrido'

// Texto de la acción para cada estado destino
const ACCION = {
  EN_REVISION: 'Iniciar revisión',
  EN_ATENCION: 'Pasar a atención',
  RESUELTA: 'Resolver incidencia',
  CERRADA: 'Cerrar incidencia',
  REPORTADA: 'Devolver a reportada',
  CANCELADA: 'Anular incidencia',
}
// Estados que exigen escribir la decisión o el motivo
const PIDE_TEXTO = { RESUELTA: 'Decisión operativa / resolución', CANCELADA: 'Motivo de la anulación' }

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

export default function IncidenciaDetallePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { can } = usePermissions()
  const { data, isLoading, error } = useIncidencia(id)
  const cambiar = useCambiarEstadoIncidencia()
  const i = data?.data
  const pedidoId = i?.despachoPedido?.pedidoId
  const expediente = useExpediente(pedidoId)

  // ?accion=devolucion: llega desde el registro rápido con la decisión "cancelar y retornar"
  const [params, setParams] = useSearchParams()
  const [dialogo, setDialogo] = useState(params.get('accion') === 'devolucion' ? { tipo: 'devolucion' } : null)
  const [errorAccion, setErrorAccion] = useState(null)
  const cerrarDialogo = () => {
    setDialogo(null)
    if (params.get('accion')) setParams({}, { replace: true })
  }

  if (isLoading) return <SkeletonCard />
  if (error || !i) {
    return (
      <div className="bg-white text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto text-danger mb-4" aria-hidden="true" />
        <h2 className="text-xl font-semibold text-gray-900">Incidencia no encontrada</h2>
        <Button className="mt-4" onClick={() => navigate('/incidencias')}>Volver a incidencias</Button>
      </div>
    )
  }

  const estado = getEstadoConfig(i.estado)
  const siguientes = getSiguientesEstados(i.estado)
  const dp = i.despachoPedido
  const puedeGestionar = can('incidencias.edit')
  const puedeDevolver =
    can('devoluciones.create') &&
    i.estado !== 'CANCELADA' &&
    i.devoluciones.length === 0 &&
    !['DEVUELTO', 'REPROGRAMADO'].includes(dp.estado)

  // Solo los eventos de esta incidencia y de sus devoluciones
  const idsRelacionados = new Set([i.id, ...i.devoluciones.map((d) => d.id)])
  const eventos = (expediente.data?.timeline || []).filter((e) => idsRelacionados.has(e.entidadId))

  const ejecutar = async (nuevoEstado, decisionOperativa) => {
    setErrorAccion(null)
    try {
      await cambiar.mutateAsync({ id, estado: nuevoEstado, decisionOperativa })
      setDialogo(null)
    } catch (err) {
      setErrorAccion(mensajeError(err, 'No se pudo cambiar el estado'))
    }
  }

  const lugar = i.latitud && i.longitud
    ? { puntos: [], destinos: [{ lat: Number(i.latitud), lng: Number(i.longitud), direccion: dp.pedido?.direccionEntrega, etiqueta: 'Lugar de la incidencia' }] }
    : { puntos: [], destinos: [] }

  return (
    <div>
      <PageHeader
        modulo="04"
        seccion="Incidencias en ruta · detalle"
        title={`Incidencia ${i.codigo}`}
        description={`${i.tipo?.nombre || 'Incidencia'} · reportada el ${fechaHora(i.fechaHora)} por ${i.reportadoPor?.nombre || '—'}`}
        tags={<Badge variant={estado.color}>{estado.label}</Badge>}
        actions={
          <>
            <Button variant="ghost" onClick={() => navigate('/incidencias')}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver
            </Button>
            {pedidoId && (
              <Button variant="secondary" onClick={() => navigate(`/trazabilidad?pedido=${pedidoId}`)}>
                <Route className="h-4 w-4" aria-hidden="true" /> Ver trazabilidad
              </Button>
            )}
          </>
        }
      />

      {puedeGestionar && (siguientes.length > 0 || puedeDevolver) && (
        <section className="bg-white px-6 py-4 mb-6 flex flex-wrap items-center gap-3" aria-label="Acciones de la incidencia">
          <span className="label-caps mr-2">Acciones:</span>
          {siguientes.map((e) =>
            PIDE_TEXTO[e] ? (
              <Button key={e} size="sm" variant={e === 'CANCELADA' ? 'ghost' : 'primary'} className={e === 'CANCELADA' ? 'text-danger' : undefined} onClick={() => setDialogo({ tipo: 'estado', estado: e })}>
                {ACCION[e]}
              </Button>
            ) : (
              <Button key={e} size="sm" variant={e === 'REPORTADA' ? 'ghost' : 'primary'} onClick={() => ejecutar(e)} disabled={cambiar.isPending} loading={cambiar.isPending && cambiar.variables?.estado === e}>
                {ACCION[e]}
              </Button>
            )
          )}
          {puedeDevolver && (
            <Button size="sm" variant="secondary" onClick={() => setDialogo({ tipo: 'devolucion' })}>
              <ArchiveRestore className="h-4 w-4" aria-hidden="true" /> Registrar devolución
            </Button>
          )}
          {errorAccion && !dialogo && <p role="alert" className="w-full text-sm text-danger">{errorAccion}</p>}
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-6">
        <div className="space-y-6 min-w-0">
          <section className="bg-danger-light p-6">
            <h2 className="label-caps text-[#a2191f] mb-2">Qué ocurrió</h2>
            <p className="text-sm text-gray-900 whitespace-pre-line">{i.descripcion}</p>
            {i.decisionOperativa && (
              <>
                <h3 className="label-caps mt-4 mb-2">Decisión operativa</h3>
                <p className="text-sm text-gray-900 whitespace-pre-line">{i.decisionOperativa}</p>
              </>
            )}
          </section>

          <section className="bg-white p-6">
            <h2 className="label-caps text-gray-900 mb-3">Entrega afectada</h2>
            <dl>
              <Fila etiqueta="Pedido"><Link to={`/pedidos/${dp.pedidoId}`} className="font-mono text-primary hover:underline">{dp.pedido?.codigo}</Link></Fila>
              <Fila etiqueta="Cliente">{dp.pedido?.cliente?.razonSocial}{dp.pedido?.cliente?.telefono ? ` · ${dp.pedido.cliente.telefono}` : ''}</Fila>
              <Fila etiqueta="Dirección">{dp.pedido?.direccionEntrega}</Fila>
              <Fila etiqueta="Carga">{dp.pedido?.detalles?.map((d) => `${Number(d.cantidad)} ${d.unidad} ${d.producto?.nombre}`).join(' · ')}</Fila>
              <Fila etiqueta="Despacho">
                <Link to={`/despachos/${dp.despachoId}`} className="font-mono text-primary hover:underline">{dp.despacho?.codigo}</Link>
                {' '}· parada #{dp.ordenParada} · {dp.estado.replaceAll('_', ' ').toLowerCase()}
              </Fila>
              <Fila etiqueta="Repartidor">{dp.despacho?.repartidor?.usuario?.nombre}{dp.despacho?.vehiculo ? ` · ${dp.despacho.vehiculo.codigo}` : ''}</Fila>
            </dl>
          </section>

          {expediente.isLoading ? <SkeletonCard /> : <LineaTemporal eventos={eventos} />}
        </div>

        <div className="space-y-6 min-w-0">
          <section className="bg-white p-6">
            <h2 className="label-caps text-gray-900 mb-3">Gestión</h2>
            <dl>
              <Fila etiqueta="Tipo">{i.tipo?.nombre}</Fila>
              <Fila etiqueta="Reportada">{fechaHora(i.fechaHora)}</Fila>
              <Fila etiqueta="Reportó">{i.reportadoPor?.nombre}</Fila>
              <Fila etiqueta="Resuelta">{i.fechaResolucion ? fechaHora(i.fechaResolucion) : null}</Fila>
              <Fila etiqueta="Resolvió">{i.resueltaPor?.nombre}</Fila>
            </dl>
          </section>

          <section className="bg-white p-6">
            <h2 className="label-caps text-gray-900 mb-3">Logística inversa</h2>
            {i.devoluciones.length === 0 ? (
              <p className="text-sm text-gray-600">Sin devoluciones asociadas.</p>
            ) : (
              <ul className="space-y-2">
                {i.devoluciones.map((d) => {
                  const c = getEstadoDevolucionConfig(d.estado)
                  return (
                    <li key={d.id}>
                      <Link to={`/devoluciones/${d.id}`} className="flex items-center gap-3 bg-gray-50 px-3 py-2.5 text-sm hover:bg-gray-100">
                        <span className="font-mono font-semibold">{d.codigo}</span>
                        <span className="flex-1 min-w-0 truncate">{d.motivo?.nombre}</span>
                        <Badge variant={c.color}>{c.label}</Badge>
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {lugar.destinos.length > 0 && <MapaRecorrido gps={lugar} />}
        </div>
      </div>

      {dialogo?.tipo === 'estado' && (
        <TextoDialog
          titulo={`${ACCION[dialogo.estado]} ${i.codigo}`}
          etiqueta={PIDE_TEXTO[dialogo.estado]}
          peligro={dialogo.estado === 'CANCELADA'}
          enviando={cambiar.isPending}
          error={errorAccion}
          onConfirmar={(texto) => ejecutar(dialogo.estado, texto)}
          onClose={() => { setDialogo(null); setErrorAccion(null) }}
        />
      )}
      {dialogo?.tipo === 'devolucion' && (
        <DevolucionDialog incidencia={i} onClose={cerrarDialogo} onCreada={(devId) => navigate(`/devoluciones/${devId}`)} />
      )}
    </div>
  )
}

function TextoDialog({ titulo, etiqueta, peligro, enviando, error, onConfirmar, onClose }) {
  const [texto, setTexto] = useState('')
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form onSubmit={(e) => { e.preventDefault(); onConfirmar(texto) }} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{titulo}</DialogTitle>
            <DialogDescription>Queda registrado en la trazabilidad del pedido.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="texto-incidencia">{etiqueta}</Label>
            <Textarea id="texto-incidencia" rows={3} maxLength={500} value={texto} onChange={(e) => setTexto(e.target.value)} required />
          </div>
          {error && <p className="text-sm text-danger" role="alert">{error}</p>}
          <DialogFooter>
            <DialogCancel type="button">Volver</DialogCancel>
            <Button type="submit" variant={peligro ? 'danger' : 'primary'} disabled={!texto.trim() || enviando} loading={enviando}>Confirmar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Activa la logística inversa: registra la devolución de la parada afectada por la incidencia
function DevolucionDialog({ incidencia, onClose, onCreada }) {
  const crear = useCreateDevolucion()
  const { data } = useMotivosDevolucion({ activo: 'true' }, { page: 1, limit: 100 })
  const motivos = data?.data || []
  const [motivoId, setMotivoId] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [error, setError] = useState(null)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      const res = await crear.mutateAsync({
        despachoPedidoId: incidencia.despachoPedidoId,
        incidenciaId: incidencia.id,
        motivoId,
        ...(observaciones && { observaciones }),
      })
      onCreada(res.data.id)
    } catch (err) {
      setError(mensajeError(err, 'No se pudo registrar la devolución'))
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Registrar devolución</DialogTitle>
            <DialogDescription>
              Activa la logística inversa del pedido {incidencia.despachoPedido.pedido?.codigo}: la carga completa de la parada retorna a planta para su evaluación.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="motivo-dev">Motivo</Label>
            <Select value={motivoId} onValueChange={setMotivoId}>
              <SelectTrigger id="motivo-dev"><SelectValue placeholder="Seleccione el motivo" /></SelectTrigger>
              <SelectContent>
                {motivos.map((m) => <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="obs-dev">Observaciones</Label>
            <Textarea id="obs-dev" rows={3} maxLength={1000} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
          </div>
          {error && <p className="text-sm text-danger" role="alert">{error}</p>}
          <DialogFooter>
            <DialogCancel type="button">Cancelar</DialogCancel>
            <Button type="submit" disabled={!motivoId || crear.isPending} loading={crear.isPending}>Registrar devolución</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
