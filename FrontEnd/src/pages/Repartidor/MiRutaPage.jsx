import { useState } from 'react'
import {
  Navigation, MapPin, Phone, PackageCheck, TriangleAlert, Truck, Satellite, SatelliteDish, Play, Pause, CircleCheck, Route,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Panel } from '@/components/layout/ModuloUI'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogCancel } from '@/components/ui/Dialog'
import { MapaRecorrido } from '@/pages/Trazabilidad/components/MapaRecorrido'
import { useMiRuta, useAccionRuta } from '@/services/query/useDespachos'
import { despachoService } from '@/services/despachoService'
import { incidenciaService } from '@/services/incidenciaService'
import { useSeguimientoGPS, posicionActual } from '@/lib/useSeguimientoGPS'
import { cn } from '@/lib/utils'

const num = (v) => (v === null || v === undefined ? null : Number(v))
const hora = (d) => (d ? new Date(d).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }) : '—')
const mensaje = (err, porDefecto) => err?.errors?.[0]?.mensaje || err?.message || porDefecto

const ESTADO_PARADA = {
  PENDIENTE: { label: 'Pendiente', variant: 'default' },
  EN_RUTA: { label: 'Por entregar', variant: 'info' },
  EN_ESPERA: { label: 'En espera', variant: 'warning' },
  CON_INCIDENCIA: { label: 'Con incidencia', variant: 'danger' },
  ENTREGADO: { label: 'Entregado', variant: 'success' },
  DEVUELTO: { label: 'Devuelto', variant: 'danger' },
  REPROGRAMADO: { label: 'Reprogramado', variant: 'default' },
}
const POR_ENTREGAR = ['EN_RUTA', 'EN_ESPERA']

const AVISO_GPS = {
  inactivo: { texto: 'El GPS se activa al iniciar el recorrido.', tono: 'text-gray-600' },
  solicitando: { texto: 'Obteniendo señal GPS… acepte el permiso de ubicación si el navegador lo pide.', tono: 'text-gray-700' },
  activo: { texto: 'Compartiendo su ubicación con el despacho.', tono: 'text-success' },
  denegado: { texto: 'Permiso de ubicación denegado. Habilítelo en la configuración del navegador para este sitio.', tono: 'text-danger' },
  sin_gps: { texto: 'Este dispositivo o navegador no ofrece GPS.', tono: 'text-danger' },
  inseguro: { texto: 'El navegador solo permite el GPS en conexión segura (HTTPS). Abra LogiTrace con la dirección https:// que le indique el despacho.', tono: 'text-danger' },
  error: { texto: 'No se obtiene señal GPS. Verifique que la ubicación del teléfono esté encendida.', tono: 'text-[#8a3800]' },
}

// Indicaciones en la aplicación de mapas del teléfono (coordenadas o, si no hay, la dirección)
function enlaceComoLlegar(pedido) {
  const destino = pedido.latitudEntrega && pedido.longitudEntrega
    ? `${num(pedido.latitudEntrega)},${num(pedido.longitudEntrega)}`
    : `${pedido.direccionEntrega}, Valera, Trujillo, Venezuela`
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destino)}&travelmode=driving`
}

/** Vista del repartidor: su despacho activo, seguimiento GPS y registro de entregas e incidencias. */
export default function MiRutaPage() {
  const { data, isLoading, isError, refetch } = useMiRuta()
  const [pausado, setPausado] = useState(false)
  const [dialogo, setDialogo] = useState(null) // { tipo: 'entrega' | 'incidencia', parada }
  const [aviso, setAviso] = useState(null)
  const despacho = data?.despacho
  const enRuta = ['EN_RUTA', 'CON_INCIDENCIA'].includes(despacho?.estado)
  const gps = useSeguimientoGPS(enRuta && !pausado, (punto) => despachoService.updateUbicacion(despacho.id, punto))
  const iniciar = useAccionRuta(() => despachoService.iniciarRecorrido(despacho.id))

  if (isLoading) return <div className="h-96 bg-white animate-pulse" />
  if (isError) return <p role="alert" className="bg-danger-light text-[#a2191f] px-4 py-3 text-sm">No se pudo cargar su ruta. <button type="button" className="underline" onClick={() => refetch()}>Reintentar</button></p>

  const paradas = despacho?.pedidos || []
  const cerradas = paradas.filter((p) => ['ENTREGADO', 'DEVUELTO'].includes(p.estado)).length
  const puntos = (despacho?.ubicacionesGPS || []).map((u) => ({ lat: num(u.latitud), lng: num(u.longitud), fechaHora: u.fechaHora }))
  if (gps.posicion) puntos.push({ lat: gps.posicion.lat, lng: gps.posicion.lng, fechaHora: gps.posicion.fechaHora })
  const destinos = paradas
    .filter((p) => p.pedido.latitudEntrega && p.pedido.longitudEntrega)
    .map((p) => ({ lat: num(p.pedido.latitudEntrega), lng: num(p.pedido.longitudEntrega), direccion: p.pedido.direccionEntrega, etiqueta: `Parada ${p.ordenParada} · ${p.pedido.cliente.razonSocial}` }))

  const iniciarRecorrido = async () => {
    setAviso(null)
    try {
      await iniciar.mutateAsync()
      setPausado(false)
    } catch (err) {
      setAviso(mensaje(err, 'No se pudo iniciar el recorrido'))
    }
  }

  const avisoGps = AVISO_GPS[pausado && enRuta ? 'inactivo' : gps.estado] || AVISO_GPS.inactivo

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        modulo="03"
        seccion="Repartidor · ruta asignada"
        title="Mi ruta"
        description={`${data.repartidor.nombre} · ${data.entregasHoy} entrega(s) registrada(s) hoy`}
      />

      {aviso && <p role="alert" className="bg-danger-light text-[#a2191f] px-4 py-3 text-sm">{aviso}</p>}

      {!despacho ? (
        <Panel titulo="Sin despacho asignado" icon={Truck}>
          <p className="text-sm text-gray-700">No tiene despachos activos en este momento. Cuando el despacho le asigne una ruta aparecerá aquí.</p>
          <Button variant="secondary" className="mt-4" onClick={() => refetch()}>Actualizar</Button>
        </Panel>
      ) : (
        <>
          <section className="bg-white p-5 sm:p-6" aria-labelledby="despacho-actual">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="label-caps text-gray-600">Despacho asignado</p>
                <h2 id="despacho-actual" className="font-mono text-2xl font-semibold text-gray-900">{despacho.codigo}</h2>
                <p className="text-sm text-gray-700 mt-1">
                  {[despacho.ruta?.nombre, despacho.vehiculo && `${despacho.vehiculo.codigo}${despacho.vehiculo.placa ? ` · ${despacho.vehiculo.placa}` : ''}${despacho.vehiculo.esTermico ? ' · térmico' : ''}`].filter(Boolean).join(' · ') || 'Sin vehículo asignado'}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-2xl font-semibold text-primary">{cerradas}/{paradas.length}</p>
                <p className="text-xs text-gray-600">paradas cerradas</p>
              </div>
            </div>
            <div className="h-2 bg-gray-100 mt-4" aria-hidden="true">
              <div className="h-2 bg-primary transition-all duration-500" style={{ width: `${paradas.length ? (cerradas / paradas.length) * 100 : 0}%` }} />
            </div>

            {/* Estado del GPS y acción principal */}
            <div className="mt-5 flex flex-wrap items-center gap-3 bg-gray-50 p-4">
              <span className={cn('relative h-10 w-10 flex items-center justify-center flex-shrink-0', gps.estado === 'activo' && !pausado ? 'bg-success-light text-[#044317]' : 'bg-gray-100 text-gray-700')}>
                {gps.estado === 'activo' && !pausado && <span className="absolute inset-0 animate-ping bg-success/30" aria-hidden="true" />}
                {gps.estado === 'activo' && !pausado ? <SatelliteDish className="h-5 w-5 relative" aria-hidden="true" /> : <Satellite className="h-5 w-5" aria-hidden="true" />}
              </span>
              <div className="flex-1 min-w-[12rem]" role="status">
                <p className={cn('text-sm font-semibold', avisoGps.tono)}>{avisoGps.texto}</p>
                {enRuta && gps.posicion && (
                  <p className="text-xs text-gray-600 font-mono">
                    Precisión ±{gps.posicion.precision} m · último envío {hora(gps.ultimoEnvio)} · {gps.enviados} posición(es) enviada(s)
                    {gps.falloEnvio && <span className="text-danger"> · sin conexión, reintentando</span>}
                  </p>
                )}
              </div>
              {despacho.estado === 'PREPARANDO' ? (
                <Button size="lg" onClick={iniciarRecorrido} loading={iniciar.isPending} disabled={iniciar.isPending} className="w-full sm:w-auto">
                  {!iniciar.isPending && <Play className="h-5 w-5" aria-hidden="true" />} Iniciar recorrido
                </Button>
              ) : enRuta && (
                <Button variant="outline" onClick={() => setPausado((p) => !p)} className="w-full sm:w-auto">
                  {pausado ? <><Play className="h-4 w-4" aria-hidden="true" /> Reanudar GPS</> : <><Pause className="h-4 w-4" aria-hidden="true" /> Pausar GPS</>}
                </Button>
              )}
            </div>
            {despacho.estado === 'PREPARANDO' && <p className="mt-2 text-xs text-gray-600">Inicie el recorrido al salir de planta: se registrará la hora de salida y comenzará a compartir su ubicación.</p>}
          </section>

          <MapaRecorrido gps={{ puntos, destinos }} titulo="Mi recorrido y paradas" zona={destinos.length < paradas.length ? `${paradas.length - destinos.length} parada(s) sin ubicación en el mapa` : undefined} />

          <section aria-labelledby="paradas" className="space-y-3">
            <h2 id="paradas" className="label-caps text-gray-900 px-1">Paradas ({paradas.length})</h2>
            {paradas.map((p) => {
              const estado = ESTADO_PARADA[p.estado] || { label: p.estado, variant: 'default' }
              const telefono = p.pedido.telefonoContacto || p.pedido.cliente.telefono
              const porEntregar = POR_ENTREGAR.includes(p.estado) && despacho.estado === 'EN_RUTA'
              return (
                <article key={p.id} className={cn('bg-white p-4 sm:p-5 border-l-4', porEntregar ? 'border-primary' : p.estado === 'ENTREGADO' ? 'border-success' : 'border-gray-200')}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-gray-600">Parada {p.ordenParada} · {p.pedido.codigo}</p>
                      <h3 className="text-base font-semibold text-gray-900">{p.pedido.cliente.razonSocial}</h3>
                    </div>
                    <Badge variant={estado.variant}>{estado.label}</Badge>
                  </div>
                  <p className="mt-2 flex gap-2 text-sm text-gray-700"><MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-gray-500" aria-hidden="true" />{p.pedido.direccionEntrega}{p.pedido.referenciaEntrega && <span className="text-gray-500"> · {p.pedido.referenciaEntrega}</span>}</p>
                  <p className="mt-1 text-sm text-gray-700">{p.pedido.detalles.map((d) => `${Number(d.cantidad)} ${d.unidad} ${d.producto.nombre}`).join(' · ')}</p>
                  {p.incidencias.length > 0 && <p className="mt-1 text-xs text-danger">Incidencia abierta: {p.incidencias.map((i) => i.codigo).join(', ')}</p>}
                  {p.estado === 'ENTREGADO' && <p className="mt-1 flex items-center gap-1.5 text-xs text-success"><CircleCheck className="h-3.5 w-3.5" aria-hidden="true" />Entregado {hora(p.horaEntrega)}{p.receptor && ` a ${p.receptor}`}</p>}

                  {!['ENTREGADO', 'DEVUELTO', 'REPROGRAMADO'].includes(p.estado) && (
                    <div className="mt-4 grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                      <Button asChild variant="secondary" size="sm">
                        <a href={enlaceComoLlegar(p.pedido)} target="_blank" rel="noreferrer"><Navigation className="h-4 w-4" aria-hidden="true" /> Cómo llegar</a>
                      </Button>
                      {telefono && (
                        <Button asChild variant="secondary" size="sm">
                          <a href={`tel:${telefono.replace(/[^\d+]/g, '')}`}><Phone className="h-4 w-4" aria-hidden="true" /> Llamar</a>
                        </Button>
                      )}
                      {porEntregar && (
                        <>
                          <Button size="sm" onClick={() => setDialogo({ tipo: 'entrega', parada: p })}><PackageCheck className="h-4 w-4" aria-hidden="true" /> Registrar entrega</Button>
                          <Button variant="outline" size="sm" className="text-danger" onClick={() => setDialogo({ tipo: 'incidencia', parada: p })}><TriangleAlert className="h-4 w-4" aria-hidden="true" /> Incidencia</Button>
                        </>
                      )}
                    </div>
                  )}
                </article>
              )
            })}
          </section>

          <p className="flex items-start gap-2 px-1 text-xs text-gray-600">
            <Route className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            Mantenga esta pantalla abierta durante el recorrido: con la pantalla apagada el navegador deja de enviar la ubicación.
          </p>
        </>
      )}

      {dialogo?.tipo === 'entrega' && <EntregaDialog despacho={despacho} parada={dialogo.parada} posicion={gps.posicion} onClose={() => setDialogo(null)} />}
      {dialogo?.tipo === 'incidencia' && <IncidenciaDialog parada={dialogo.parada} tipos={data.tiposIncidencia} posicion={gps.posicion} onClose={() => setDialogo(null)} />}
    </div>
  )
}

// Usa la última posición del seguimiento si es reciente; si no, pide una nueva al GPS
async function ubicacionDelMomento(posicion) {
  if (posicion && Date.now() - new Date(posicion.fechaHora).getTime() < 60_000) {
    return { latitud: posicion.lat, longitud: posicion.lng, precisionMetros: posicion.precision }
  }
  return posicionActual()
}

function EntregaDialog({ despacho, parada, posicion, onClose }) {
  const [receptor, setReceptor] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [error, setError] = useState(null)
  const entregar = useAccionRuta((datos) => despachoService.registrarEntrega(despacho.id, parada.id, datos))

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      const gps = await ubicacionDelMomento(posicion)
      await entregar.mutateAsync({ receptor: receptor.trim(), ...(observaciones.trim() && { observaciones: observaciones.trim() }), ...(gps || {}) })
      onClose()
    } catch (err) {
      setError(mensaje(err, 'No se pudo registrar la entrega'))
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Registrar entrega</DialogTitle>
            <DialogDescription>Parada {parada.ordenParada} · {parada.pedido.cliente.razonSocial}. Se guardará la hora y su posición GPS actual.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="en-receptor">¿Quién recibe? *</Label>
            <Input id="en-receptor" required maxLength={120} autoComplete="off" placeholder="Nombre de la persona que recibe" value={receptor} onChange={(e) => setReceptor(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="en-obs">Observaciones</Label>
            <Textarea id="en-obs" rows={2} maxLength={500} placeholder="Estado de la mercancía, cava, novedades…" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
          </div>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <DialogFooter>
            <DialogCancel type="button">Cancelar</DialogCancel>
            <Button type="submit" disabled={!receptor.trim() || entregar.isPending} loading={entregar.isPending}>Confirmar entrega</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function IncidenciaDialog({ parada, tipos, posicion, onClose }) {
  const [tipoId, setTipoId] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [error, setError] = useState(null)
  const reportar = useAccionRuta((datos) => incidenciaService.create(datos))

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      const gps = await ubicacionDelMomento(posicion)
      await reportar.mutateAsync({
        despachoPedidoId: parada.id,
        tipoIncidenciaId: tipoId,
        descripcion: descripcion.trim(),
        ...(gps && { latitud: gps.latitud, longitud: gps.longitud }),
      })
      onClose()
    } catch (err) {
      setError(mensaje(err, 'No se pudo reportar la incidencia'))
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Reportar incidencia</DialogTitle>
            <DialogDescription>Parada {parada.ordenParada} · {parada.pedido.cliente.razonSocial}. El despacho la verá al instante con su ubicación.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="in-tipo">¿Qué ocurrió? *</Label>
            <Select value={tipoId} onValueChange={setTipoId}>
              <SelectTrigger id="in-tipo"><SelectValue placeholder="Seleccione la causa…" /></SelectTrigger>
              <SelectContent>{tipos.map((t) => <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="in-desc">Descripción *</Label>
            <Textarea id="in-desc" rows={3} required maxLength={1000} placeholder="Qué pasó, con quién habló y estado de la carga…" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          </div>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <DialogFooter>
            <DialogCancel type="button">Cancelar</DialogCancel>
            <Button type="submit" variant="danger" disabled={!tipoId || !descripcion.trim() || reportar.isPending} loading={reportar.isPending}>Reportar incidencia</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
