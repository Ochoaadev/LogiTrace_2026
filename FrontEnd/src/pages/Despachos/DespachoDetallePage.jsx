import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, LayoutGrid, TriangleAlert, UserRound, Thermometer, Snowflake, AlertCircle } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogCancel } from '@/components/ui/Dialog'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { usePermissions } from '@/hooks/usePermissions'
import { useDespacho, useUpdateEstadoDespacho, useAsignarRepartidor } from '@/services/query/useDespachos'
import { useCreateIncidencia } from '@/services/query/useIncidencias'
import { useRepartidores, useTiposIncidencia } from '@/services/query/useCatalogos'
import { useTrazabilidadDespacho } from '@/services/query/useTrazabilidad'
import { getEstadoConfig, getSiguientesEstados, accionDespacho } from '@/schemas/despachoSchema'
import { LineaTemporal } from '@/pages/Trazabilidad/components/LineaTemporal'
import { MapaRecorrido } from '@/pages/Trazabilidad/components/MapaRecorrido'
import { CurvaTermica } from '@/pages/Trazabilidad/components/CurvaTermica'
import { RegistrarTemperaturaDialog } from '@/pages/Trazabilidad/components/Dialogos'
import { cn } from '@/lib/utils'

const ESTADO_PARADA = {
  PENDIENTE: { label: 'Pendiente', color: 'default' },
  EN_RUTA: { label: 'En ruta', color: 'primary' },
  EN_ESPERA: { label: 'En espera', color: 'warning' },
  ENTREGADO: { label: 'Entregado', color: 'success' },
  CON_INCIDENCIA: { label: 'Con incidencia', color: 'danger' },
  DEVUELTO: { label: 'Devuelto', color: 'warning' },
  REPROGRAMADO: { label: 'Reprogramado', color: 'default' },
}

// Estados que piden un motivo antes de confirmarse
const REQUIERE_MOTIVO = ['CANCELADO']

const fechaHora = (d) =>
  d ? new Date(d).toLocaleString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
const num = (v) => (v === null || v === undefined ? null : Number(v))
const mensajeError = (err, porDefecto) => err?.errors?.[0]?.mensaje || err?.message || porDefecto

function Dato({ etiqueta, children }) {
  return (
    <div className="bg-white p-4">
      <p className="label-caps">{etiqueta}</p>
      <p className="mt-2 text-lg font-semibold text-gray-900">{children}</p>
    </div>
  )
}

export default function DespachoDetallePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { can } = usePermissions()

  const { data: despacho, isLoading, error } = useDespacho(id)
  const timeline = useTrazabilidadDespacho(id)
  const cambiarEstado = useUpdateEstadoDespacho()

  const [dialogo, setDialogo] = useState(null) // { tipo, ... }
  const [errorAccion, setErrorAccion] = useState(null)

  if (isLoading) return <SkeletonCard />

  const d = despacho?.data
  if (error || !d) {
    return (
      <div className="bg-white text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto text-danger mb-4" aria-hidden="true" />
        <h2 className="text-xl font-semibold text-gray-900">Despacho no encontrado</h2>
        <Button className="mt-4" onClick={() => navigate('/despachos')}>Volver a despachos</Button>
      </div>
    )
  }

  const estado = getEstadoConfig(d.estado)
  const siguientes = getSiguientesEstados(d.estado)
  // CON_INCIDENCIA se alcanza reportando la incidencia en la parada (queda el registro completo)
  const acciones = siguientes.filter((e) => e !== 'CON_INCIDENCIA')
  const puedeCambiar = can('despachos.change_state')
  const editable = ['PROGRAMADO', 'PREPARANDO'].includes(d.estado)
  const enRuta = ['EN_RUTA', 'CON_INCIDENCIA'].includes(d.estado)

  const entregadas = d.pedidos.filter((p) => p.estado === 'ENTREGADO').length

  const ejecutar = async (nuevoEstado, observaciones) => {
    setErrorAccion(null)
    try {
      await cambiarEstado.mutateAsync({ id, estado: nuevoEstado, observaciones })
      setDialogo(null)
    } catch (err) {
      setErrorAccion(mensajeError(err, 'No se pudo cambiar el estado'))
    }
  }

  // Datos en el formato de los componentes de trazabilidad
  const gps = {
    puntos: [...d.ubicacionesGPS].reverse().map((u) => ({ lat: num(u.latitud), lng: num(u.longitud), fechaHora: u.fechaHora, velocidadKmh: num(u.velocidadKmh) })),
    destinos: d.pedidos
      .filter((p) => p.pedido?.latitudEntrega && p.pedido?.longitudEntrega)
      .map((p) => ({ lat: num(p.pedido.latitudEntrega), lng: num(p.pedido.longitudEntrega), direccion: p.pedido.direccionEntrega, etiqueta: `Parada ${p.ordenParada} · ${p.pedido.codigo}` })),
  }
  const registros = [...d.registrosTemperatura].reverse().map((r) => ({
    id: r.id,
    fechaHora: r.fechaHora,
    temperaturaC: Number(r.temperaturaC),
    origen: r.ubicacion?.nombre || r.tipoRegistro.replaceAll('_', ' ').toLowerCase(),
    usuario: r.usuario?.nombre,
    observaciones: r.observaciones,
    fueraDeRango: Number(r.temperaturaC) > d.limiteCriticoC,
  }))
  const cadenaFrio = { limiteCriticoC: d.limiteCriticoC, registros, ultima: registros.at(-1) || null, conforme: registros.length ? registros.every((r) => !r.fueraDeRango) : null }

  return (
    <div>
      <PageHeader
        modulo="03"
        seccion="Despachos y asignación de rutas · detalle"
        title={`Despacho ${d.codigo}`}
        description={`${d.pedidos.length} parada(s) · ${d.repartidor?.usuario?.nombre || 'sin repartidor'}${d.vehiculo ? ` · ${d.vehiculo.codigo}` : ''}`}
        tags={<Badge variant={estado.color}>{estado.label}</Badge>}
        actions={
          <>
            <Button variant="ghost" onClick={() => navigate('/despachos')}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver
            </Button>
            <Button variant="secondary" onClick={() => navigate('/despachos/flujo')}>
              <LayoutGrid className="h-4 w-4" aria-hidden="true" /> Tablero
            </Button>
          </>
        }
      />

      {puedeCambiar && (acciones.length > 0 || editable) && (
        <section className="bg-white px-6 py-4 mb-6 flex flex-wrap items-center gap-3" aria-label="Acciones del despacho">
          <span className="label-caps mr-2">Acciones:</span>
          {acciones.map((e) =>
            REQUIERE_MOTIVO.includes(e) ? (
              <Button key={e} size="sm" variant="ghost" className="text-danger" onClick={() => setDialogo({ tipo: 'estado', estado: e })}>
                {accionDespacho(e, d.estado)}
              </Button>
            ) : (
              <Button key={e} size="sm" onClick={() => ejecutar(e)} disabled={cambiarEstado.isPending} loading={cambiarEstado.isPending && cambiarEstado.variables?.estado === e}>
                {accionDespacho(e, d.estado)}
              </Button>
            )
          )}
          {editable && can('despachos.assign_repartidor') && (
            <Button size="sm" variant="secondary" onClick={() => setDialogo({ tipo: 'repartidor' })}>
              <UserRound className="h-4 w-4" aria-hidden="true" /> {d.repartidorId ? 'Cambiar repartidor' : 'Asignar repartidor'}
            </Button>
          )}
          {d.estado !== 'CANCELADO' && (
            <Button size="sm" variant="secondary" onClick={() => setDialogo({ tipo: 'temperatura' })}>
              <Thermometer className="h-4 w-4" aria-hidden="true" /> Registrar temperatura
            </Button>
          )}
          {errorAccion && <p role="alert" className="w-full text-sm text-danger">{errorAccion}</p>}
        </section>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Dato etiqueta="Salida">{fechaHora(d.fechaHoraSalida)}</Dato>
        <Dato etiqueta="Cierre">{fechaHora(d.fechaHoraCierre)}</Dato>
        <Dato etiqueta="Entregas">{entregadas} / {d.pedidos.length}</Dato>
        <Dato etiqueta="Precinto"><span className="font-mono">{d.precintoSeguridad || '—'}</span></Dato>
      </div>

      <Tabs defaultValue="paradas" className="bg-white px-4 pb-4">
        <TabsList>
          <TabsTrigger value="paradas">Paradas ({d.pedidos.length})</TabsTrigger>
          <TabsTrigger value="recorrido">Recorrido y cadena de frío</TabsTrigger>
          <TabsTrigger value="historial">Historial ({timeline.data?.length ?? '…'})</TabsTrigger>
          <TabsTrigger value="unidad">Unidad y ruta</TabsTrigger>
        </TabsList>

        <TabsContent value="paradas">
          <ol className="space-y-3">
            {d.pedidos.map((dp) => {
              const e = ESTADO_PARADA[dp.estado] || { label: dp.estado, color: 'default' }
              const abierta = ['PENDIENTE', 'EN_RUTA', 'EN_ESPERA'].includes(dp.estado)
              return (
                <li key={dp.id} className={cn('p-4 bg-gray-50', dp.estado === 'CON_INCIDENCIA' && 'bg-danger-light')}>
                  <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
                    <span className="font-mono text-lg font-semibold text-primary">#{dp.ordenParada}</span>
                    <div className="flex-1 min-w-[14rem]">
                      <p className="text-sm font-semibold text-gray-900">
                        <Link to={`/pedidos/${dp.pedidoId}`} className="font-mono text-primary hover:underline mr-2">{dp.pedido?.codigo}</Link>
                        {dp.pedido?.cliente?.razonSocial}
                      </p>
                      <p className="text-xs text-gray-600">{dp.pedido?.direccionEntrega}{dp.pedido?.cliente?.telefono ? ` · ${dp.pedido.cliente.telefono}` : ''}</p>
                      <p className="mt-1 text-xs text-gray-700">
                        {dp.pedido?.detalles?.map((det) => `${Number(det.cantidad)} ${det.unidad} ${det.producto?.nombre}`).join(' · ')}
                        {dp.detalles?.length > 0 && <span className="font-mono text-gray-600"> · lote {[...new Set(dp.detalles.map((x) => x.lote?.codigo))].join(', ')}</span>}
                      </p>
                      {dp.horaEntrega && <p className="mt-1 text-xs text-gray-700">Entregado {fechaHora(dp.horaEntrega)}{dp.receptor ? ` · recibió ${dp.receptor}` : ''}</p>}
                    </div>
                    <Badge variant={e.color}>{e.label}</Badge>
                    {enRuta && abierta && can('incidencias.create') && (
                      <Button size="sm" variant="ghost" className="text-danger" onClick={() => setDialogo({ tipo: 'incidencia', parada: dp })}>
                        <TriangleAlert className="h-4 w-4" aria-hidden="true" /> Reportar incidencia
                      </Button>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </TabsContent>

        <TabsContent value="recorrido">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <MapaRecorrido gps={gps} zona={d.ruta?.nombre} />
            <CurvaTermica cadenaFrio={cadenaFrio} />
          </div>
        </TabsContent>

        <TabsContent value="historial">
          {timeline.isLoading ? <SkeletonCard /> : <LineaTemporal eventos={timeline.data || []} />}
        </TabsContent>

        <TabsContent value="unidad">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 px-2">
            {[
              ['Repartidor', d.repartidor ? `${d.repartidor.usuario?.nombre}${d.repartidor.telefono ? ` · ${d.repartidor.telefono}` : ''}` : null],
              ['Licencia', d.repartidor?.numeroLicencia],
              ['Vehículo', d.vehiculo ? `${d.vehiculo.codigo} · ${d.vehiculo.tipo?.replaceAll('_', ' ').toLowerCase()}${d.vehiculo.placa ? ` · ${d.vehiculo.placa}` : ''}` : null],
              ['Capacidad', d.vehiculo?.capacidadCarga ? `${Number(d.vehiculo.capacidadCarga)} ${d.vehiculo.unidadCapacidad || ''}` : null],
              ['Vehículo térmico', d.vehiculo ? (d.vehiculo.esTermico ? <span className="inline-flex items-center gap-1"><Snowflake className="h-4 w-4 text-primary" aria-hidden="true" /> Sí</span> : 'No') : null],
              ['Medio de conservación', d.medioConservacion],
              ['Ruta', d.ruta ? `${d.ruta.codigo} · ${d.ruta.nombre}` : null],
              ['Observaciones', d.observaciones],
            ].map(([k, v]) => (
              <div key={k} className="grid grid-cols-[11rem_1fr] gap-4 py-2 border-b border-gray-100">
                <dt className="text-sm text-gray-600">{k}</dt>
                <dd className="text-sm text-gray-900">{v || '—'}</dd>
              </div>
            ))}
          </dl>
        </TabsContent>
      </Tabs>

      {dialogo?.tipo === 'estado' && (
        <MotivoDialog
          titulo={`${accionDespacho(dialogo.estado, d.estado)} ${d.codigo}`}
          descripcion="Los pedidos vuelven a 'Listo para despacho' y el repartidor queda disponible."
          enviando={cambiarEstado.isPending}
          error={errorAccion}
          onConfirmar={(motivo) => ejecutar(dialogo.estado, motivo)}
          onClose={() => { setDialogo(null); setErrorAccion(null) }}
        />
      )}
      {dialogo?.tipo === 'repartidor' && <RepartidorDialog despacho={d} onClose={() => setDialogo(null)} />}
      {dialogo?.tipo === 'incidencia' && <IncidenciaDialog despacho={d} parada={dialogo.parada} onClose={() => setDialogo(null)} />}
      {dialogo?.tipo === 'temperatura' && (
        <RegistrarTemperaturaDialog
          open
          onOpenChange={(o) => !o && setDialogo(null)}
          expediente={{ logistica: { despachoId: d.id, codigo: d.codigo }, devoluciones: [], cadenaFrio: { limiteCriticoC: d.limiteCriticoC } }}
        />
      )}
    </div>
  )
}

function MotivoDialog({ titulo, descripcion, enviando, error, onConfirmar, onClose }) {
  const [motivo, setMotivo] = useState('')
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form onSubmit={(e) => { e.preventDefault(); onConfirmar(motivo) }} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{titulo}</DialogTitle>
            <DialogDescription>{descripcion}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="motivo">Motivo</Label>
            <Textarea id="motivo" rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} required />
          </div>
          {error && <p className="text-sm text-danger" role="alert">{error}</p>}
          <DialogFooter>
            <DialogCancel type="button">Volver</DialogCancel>
            <Button type="submit" variant="danger" disabled={!motivo.trim() || enviando} loading={enviando}>Confirmar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RepartidorDialog({ despacho, onClose }) {
  const asignar = useAsignarRepartidor()
  const { data } = useRepartidores({ estado: 'DISPONIBLE' }, { page: 1, limit: 100 })
  const disponibles = data?.data || []
  const [repartidorId, setRepartidorId] = useState('')
  const [error, setError] = useState(null)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      await asignar.mutateAsync({ id: despacho.id, repartidorId })
      onClose()
    } catch (err) {
      setError(mensajeError(err, 'No se pudo asignar el repartidor'))
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Repartidor de {despacho.codigo}</DialogTitle>
            <DialogDescription>Actual: {despacho.repartidor?.usuario?.nombre || 'sin asignar'}. Solo se listan repartidores disponibles.</DialogDescription>
          </DialogHeader>
          <Select value={repartidorId} onValueChange={setRepartidorId}>
            <SelectTrigger aria-label="Repartidor"><SelectValue placeholder={disponibles.length ? 'Seleccione un repartidor' : 'No hay repartidores disponibles'} /></SelectTrigger>
            <SelectContent>
              {disponibles.map((r) => <SelectItem key={r.id} value={r.id}>{r.usuario?.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
          {error && <p className="text-sm text-danger" role="alert">{error}</p>}
          <DialogFooter>
            <DialogCancel type="button">Cancelar</DialogCancel>
            <Button type="submit" disabled={!repartidorId || asignar.isPending} loading={asignar.isPending}>Asignar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Reporte de incidencia sobre una parada del despacho (crea el registro en el módulo 04)
function IncidenciaDialog({ despacho, parada, onClose }) {
  const crear = useCreateIncidencia()
  const { data } = useTiposIncidencia({ activo: 'true' }, { page: 1, limit: 100 })
  const tipos = data?.data || []
  const [form, setForm] = useState({ tipoIncidenciaId: '', descripcion: '', decisionOperativa: '' })
  const [error, setError] = useState(null)
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      await crear.mutateAsync({
        despachoPedidoId: parada.id,
        tipoIncidenciaId: form.tipoIncidenciaId,
        descripcion: form.descripcion,
        ...(form.decisionOperativa && { decisionOperativa: form.decisionOperativa }),
      })
      onClose()
    } catch (err) {
      setError(mensajeError(err, 'No se pudo registrar la incidencia'))
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Reportar incidencia · parada #{parada.ordenParada}</DialogTitle>
            <DialogDescription>
              {parada.pedido?.codigo} · {parada.pedido?.cliente?.razonSocial} ({despacho.codigo}). El despacho pasará a "Con incidencia".
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="tipo-inc">Tipo de incidencia</Label>
            <Select value={form.tipoIncidenciaId} onValueChange={set('tipoIncidenciaId')}>
              <SelectTrigger id="tipo-inc"><SelectValue placeholder="Seleccione el tipo" /></SelectTrigger>
              <SelectContent>
                {tipos.map((t) => <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="desc-inc">Qué ocurrió</Label>
            <Textarea id="desc-inc" rows={3} maxLength={1000} value={form.descripcion} onChange={(e) => set('descripcion')(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="dec-inc">Decisión operativa inmediata (opcional)</Label>
            <Textarea id="dec-inc" rows={2} maxLength={500} value={form.decisionOperativa} onChange={(e) => set('decisionOperativa')(e.target.value)} />
          </div>
          {error && <p className="text-sm text-danger" role="alert">{error}</p>}
          <DialogFooter>
            <DialogCancel type="button">Cancelar</DialogCancel>
            <Button type="submit" variant="danger" disabled={!form.tipoIncidenciaId || !form.descripcion.trim() || crear.isPending} loading={crear.isPending}>
              Reportar incidencia
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
