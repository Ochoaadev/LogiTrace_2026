import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Route, XCircle, Truck, AlertCircle, ChevronRight } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogCancel } from '@/components/ui/Dialog'
import { DataTable, createTableColumns } from '@/components/ui/Table'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { usePermissions } from '@/hooks/usePermissions'
import { usePedido, useAvanzarPedido, useCancelPedido, useAsignarDespacho } from '@/services/query/usePedidos'
import { useDespachos } from '@/services/query/useDespachos'
import { useExpediente } from '@/services/query/useTrazabilidad'
import { getEstadoConfig, getPrioridadConfig, TRANSICIONES_PEDIDO } from '@/schemas/pedidoSchema'
import { getEstadoConfig as getEstadoDespachoConfig } from '@/schemas/despachoSchema'
import { LineaTemporal } from '@/pages/Trazabilidad/components/LineaTemporal'
import { fechaSinHora, diasHasta } from '@/lib/fechas'

// Plazo respecto a la fecha solicitada, solo mientras el pedido no se haya entregado
const FINALES = ['ENTREGADO', 'CERRADO', 'CANCELADO', 'DEVUELTO']
function textoPlazo(p) {
  if (FINALES.includes(p.estado)) return ''
  const d = diasHasta(p.fechaEntrega)
  if (d === null) return ''
  if (d === 0) return '(hoy)'
  if (d === 1) return '(mañana)'
  return d > 0 ? `(en ${d} días)` : `(vencida hace ${-d} día${d === -1 ? '' : 's'})`
}

// Acción de la UI para cada estado destino. EN_RUTA no se ofrece aquí: ocurre al asignar el
// pedido a un despacho y ponerlo en ruta desde el módulo de despachos.
const ACCION = {
  EN_PREPARACION: 'Enviar a preparación',
  LISTO_PARA_DESPACHO: 'Marcar listo para despacho',
  ENTREGADO: 'Registrar entrega',
  CON_INCIDENCIA: 'Marcar con incidencia',
  DEVUELTO: 'Marcar devuelto',
  CERRADO: 'Cerrar pedido',
}

const METODO_ENTREGA = { DOMICILIO: 'A domicilio', RETIRO_EN_ESTABLECIMIENTO: 'Retiro en establecimiento' }

const fechaHora = (d) =>
  d ? new Date(d).toLocaleString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
const num = (v) => Number(v ?? 0).toLocaleString('es-VE', { maximumFractionDigits: 2 })
const mensajeError = (err, porDefecto) => err?.errors?.[0]?.mensaje || err?.message || porDefecto

function Dato({ etiqueta, children }) {
  return (
    <div className="bg-white p-4">
      <p className="label-caps">{etiqueta}</p>
      <p className="mt-2 text-lg font-semibold text-gray-900">{children}</p>
    </div>
  )
}

function Fila({ etiqueta, children }) {
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-4 py-2 border-b border-gray-100 last:border-0">
      <dt className="text-sm text-gray-600">{etiqueta}</dt>
      <dd className="text-sm text-gray-900">{children || '—'}</dd>
    </div>
  )
}

export default function PedidoDetallePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { can } = usePermissions()

  const { data: pedido, isLoading, error } = usePedido(id)
  const expediente = useExpediente(id)
  const avanzar = useAvanzarPedido()

  const [dialogo, setDialogo] = useState(null)
  const [errorAccion, setErrorAccion] = useState(null)

  if (isLoading) return <SkeletonCard />

  const p = pedido?.data
  if (error || !p) {
    return (
      <div className="bg-white text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto text-danger mb-4" aria-hidden="true" />
        <h2 className="text-xl font-semibold text-gray-900">Pedido no encontrado</h2>
        <Button className="mt-4" onClick={() => navigate('/pedidos')}>Volver a pedidos</Button>
      </div>
    )
  }

  const estado = getEstadoConfig(p.estado)
  const prioridad = getPrioridadConfig(p.prioridad)
  const siguientes = TRANSICIONES_PEDIDO[p.estado] || []
  const acciones = siguientes.filter((e) => ACCION[e])
  const puedeCancelar = siguientes.includes('CANCELADO') && can('pedidos.cancel')
  const puedeAsignar = p.estado === 'LISTO_PARA_DESPACHO' && can('pedidos.assign_despacho')

  const totalProductos = p.detalles.reduce((s, d) => s + Number(d.cantidad), 0)
  const unidades = [...new Set(p.detalles.map((d) => d.unidad))]
  const totalMonto = p.total ?? (p.detalles.some((d) => d.subtotal) ? p.detalles.reduce((s, d) => s + Number(d.subtotal || 0), 0) : null)

  const ejecutar = async (nuevoEstado) => {
    setErrorAccion(null)
    try {
      await avanzar.mutateAsync({ id, estado: nuevoEstado })
    } catch (err) {
      setErrorAccion(mensajeError(err, 'No se pudo cambiar el estado del pedido'))
    }
  }

  const exp = expediente.data

  return (
    <div>
      <PageHeader
        modulo="02"
        seccion="Operaciones de planta & despacho · detalle"
        title={`Pedido ${p.codigo}`}
        description={`${p.cliente?.razonSocial || 'Cliente'} · registrado el ${fechaHora(p.fechaHora)}`}
        tags={
          <>
            <Badge variant={estado.color}>{estado.label}</Badge>
            <Badge variant={prioridad.color}>Prioridad {prioridad.label?.toLowerCase()}</Badge>
          </>
        }
        actions={
          <>
            <Button variant="ghost" onClick={() => navigate('/pedidos')}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver
            </Button>
            <Button variant="secondary" onClick={() => navigate(`/trazabilidad?pedido=${id}`)}>
              <Route className="h-4 w-4" aria-hidden="true" /> Ver trazabilidad
            </Button>
          </>
        }
      />

      {/* Acciones de estado disponibles */}
      {can('pedidos.edit') && (acciones.length > 0 || puedeCancelar || puedeAsignar) && (
        <section className="bg-white px-6 py-4 mb-6 flex flex-wrap items-center gap-3" aria-label="Acciones del pedido">
          <span className="label-caps mr-2">Acciones:</span>
          {acciones.map((e) => (
            <Button key={e} size="sm" onClick={() => ejecutar(e)} disabled={avanzar.isPending} loading={avanzar.isPending && avanzar.variables?.estado === e}>
              {ACCION[e]}
            </Button>
          ))}
          {puedeAsignar && (
            <Button size="sm" variant="secondary" onClick={() => setDialogo('asignar')}>
              <Truck className="h-4 w-4" aria-hidden="true" /> Asignar a despacho
            </Button>
          )}
          {puedeCancelar && (
            <Button size="sm" variant="ghost" className="text-danger" onClick={() => setDialogo('cancelar')}>
              <XCircle className="h-4 w-4" aria-hidden="true" /> Cancelar pedido
            </Button>
          )}
          {errorAccion && <p role="alert" className="w-full text-sm text-danger">{errorAccion}</p>}
        </section>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Dato etiqueta="Registrado">{fechaHora(p.fechaHora)}</Dato>
        <Dato etiqueta="Productos">{num(totalProductos)} <span className="text-sm font-normal text-gray-600">{unidades.join(' / ')}</span></Dato>
        <Dato etiqueta="Total">{totalMonto !== null ? `$${num(totalMonto)}` : 'Sin precio'}</Dato>
        <Dato etiqueta="Entrega">
          {METODO_ENTREGA[p.metodoEntrega] || p.metodoEntrega}
          {p.fechaEntrega && <span className="block text-sm font-normal text-gray-600">Solicitada: {fechaSinHora(p.fechaEntrega)} {textoPlazo(p)}</span>}
        </Dato>
      </div>

      <Tabs defaultValue="info" className="bg-white px-4 pb-4">
        <TabsList>
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="productos">Productos ({p.detalles.length})</TabsTrigger>
          <TabsTrigger value="historial">Historial ({exp?.timeline.length ?? '…'})</TabsTrigger>
          <TabsTrigger value="despachos">Despachos ({p.despachos.length})</TabsTrigger>
          <TabsTrigger value="novedades">Incidencias y devoluciones ({exp ? exp.incidencias.length + exp.devoluciones.length : '…'})</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-2">
            <div>
              <h3 className="label-caps mb-2">Cliente y entrega</h3>
              <dl>
              <Fila etiqueta="Cliente">{p.cliente?.razonSocial}</Fila>
              <Fila etiqueta="Documento">{p.cliente?.numeroDocumento}</Fila>
              <Fila etiqueta="Contacto">{[p.cliente?.nombreContacto, p.telefonoContacto || p.cliente?.telefono].filter(Boolean).join(' · ')}</Fila>
              <Fila etiqueta="Dirección">{p.direccionEntrega}</Fila>
              <Fila etiqueta="Referencia">{p.referenciaEntrega}</Fila>
              <Fila etiqueta="Zona de despacho">{p.zona?.nombre}</Fila>
              <Fila etiqueta="Tipo de sector">{p.tipoSector?.nombre}</Fila>
              <Fila etiqueta="Entrega solicitada">{p.fechaEntrega ? `${fechaSinHora(p.fechaEntrega)} ${textoPlazo(p)}` : null}</Fila>
              </dl>
            </div>
            <div>
              <h3 className="label-caps mb-2">Registro</h3>
              <dl>
              <Fila etiqueta="Código"><span className="font-mono">{p.codigo}</span></Fila>
              <Fila etiqueta="Registrado por">{p.creadoPor?.nombre}</Fila>
              <Fila etiqueta="Fecha">{fechaHora(p.fechaHora)}</Fila>
              <Fila etiqueta="Última actualización">{fechaHora(p.updatedAt)}</Fila>
              <Fila etiqueta="Observaciones">{p.observaciones}</Fila>
              </dl>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="productos">
          <DataTable
            showPagination={false}
            data={p.detalles}
            columns={createTableColumns([
              { accessorKey: 'producto', header: 'Producto', cell: (_, row) => <><span className="font-mono text-xs text-gray-600 mr-2">{row.original.producto?.codigo}</span>{row.original.producto?.nombre}</> },
              { accessorKey: 'cantidad', header: 'Cantidad', cell: (v, row) => <span className="font-mono">{num(v)} {row.original.unidad}</span> },
              { accessorKey: 'precioUnitario', header: 'Precio unit.', cell: (v) => (v ? `$${num(v)}` : '—') },
              { accessorKey: 'subtotal', header: 'Subtotal', cell: (v) => (v ? `$${num(v)}` : '—') },
              {
                accessorKey: 'detallesDespacho',
                header: 'Lotes despachados',
                cell: (v) => (v?.length ? <span className="font-mono text-xs">{v.map((d) => d.lote?.codigo || '—').join(', ')}</span> : '—'),
              },
            ])}
          />
        </TabsContent>

        <TabsContent value="historial">
          {expediente.isLoading ? <SkeletonCard /> : exp ? <LineaTemporal eventos={exp.timeline} /> : <p className="p-6 text-sm text-gray-600">No se pudo cargar el historial.</p>}
        </TabsContent>

        <TabsContent value="despachos">
          {p.despachos.length === 0 ? (
            <p className="p-6 text-sm text-gray-600">El pedido aún no ha sido asignado a un despacho.</p>
          ) : (
            <DataTable
              showPagination={false}
              data={p.despachos}
              onRowClick={(row) => navigate(`/despachos/${row.despachoId}`)}
              columns={createTableColumns([
                { accessorKey: 'despacho', header: 'Despacho', cell: (_, row) => <span className="font-mono text-primary">{row.original.despacho?.codigo}</span> },
                { accessorKey: 'ordenParada', header: 'Parada', cell: (v) => <span className="font-mono">#{v}</span> },
                { accessorKey: 'estado', header: 'Estado de la entrega', cell: (v) => <Badge>{v?.replaceAll('_', ' ').toLowerCase()}</Badge> },
                {
                  accessorKey: 'despachoId',
                  header: 'Estado del despacho',
                  cell: (_, row) => {
                    const c = getEstadoDespachoConfig(row.original.despacho?.estado)
                    return <Badge variant={c.color}>{c.label}</Badge>
                  },
                },
                { accessorKey: 'horaEntrega', header: 'Entrega', cell: (v, row) => (v ? `${fechaHora(v)}${row.original.receptor ? ` · ${row.original.receptor}` : ''}` : '—') },
              ])}
            />
          )}
        </TabsContent>

        <TabsContent value="novedades">
          {!exp ? (
            <SkeletonCard />
          ) : exp.incidencias.length + exp.devoluciones.length === 0 ? (
            <p className="p-6 text-sm text-gray-600">Sin incidencias ni devoluciones.</p>
          ) : (
            <ul className="space-y-2">
              {exp.incidencias.map((i) => (
                <li key={i.id}>
                  <Link to={`/incidencias/${i.id}`} className="flex items-center gap-3 bg-danger-light px-4 py-3 text-sm hover:opacity-90">
                    <span className="font-mono font-semibold">{i.codigo}</span>
                    <span className="flex-1">{i.tipo} · {i.estado.toLowerCase()} · {fechaHora(i.fechaHora)}</span>
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </li>
              ))}
              {exp.devoluciones.map((d) => (
                <li key={d.id}>
                  <Link to={`/devoluciones/${d.id}`} className="flex items-center gap-3 bg-gray-100 px-4 py-3 text-sm hover:bg-gray-200">
                    <span className="font-mono font-semibold">{d.codigo}</span>
                    <span className="flex-1">{d.motivo} · {d.estado.toLowerCase()} · {fechaHora(d.fechaRegistro)}</span>
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      {dialogo === 'cancelar' && <CancelarDialog pedido={p} onClose={() => setDialogo(null)} />}
      {dialogo === 'asignar' && <AsignarDespachoDialog pedido={p} onClose={() => setDialogo(null)} />}
    </div>
  )
}

function CancelarDialog({ pedido, onClose }) {
  const cancelar = useCancelPedido()
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState(null)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      await cancelar.mutateAsync({ id: pedido.id, motivo })
      onClose()
    } catch (err) {
      setError(mensajeError(err, 'No se pudo cancelar el pedido'))
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Cancelar pedido {pedido.codigo}</DialogTitle>
            <DialogDescription>El motivo queda registrado en la trazabilidad del pedido.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="motivo-cancelacion">Motivo</Label>
            <Textarea id="motivo-cancelacion" rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} required />
          </div>
          {error && <p className="text-sm text-danger" role="alert">{error}</p>}
          <DialogFooter>
            <DialogCancel type="button">Volver</DialogCancel>
            <Button type="submit" variant="danger" disabled={!motivo.trim() || cancelar.isPending} loading={cancelar.isPending}>Cancelar pedido</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function AsignarDespachoDialog({ pedido, onClose }) {
  const asignar = useAsignarDespacho()
  const { data } = useDespachos({}, { page: 1, limit: 100 })
  // Solo despachos que aún no salieron (el backend rechaza el resto)
  const abiertos = (data?.data || []).filter((d) => ['PROGRAMADO', 'PREPARANDO'].includes(d.estado))
  const [despachoId, setDespachoId] = useState('')
  const [error, setError] = useState(null)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      await asignar.mutateAsync({ id: pedido.id, despachoId })
      onClose()
    } catch (err) {
      setError(mensajeError(err, 'No se pudo asignar el despacho'))
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Asignar {pedido.codigo} a un despacho</DialogTitle>
            <DialogDescription>Se agrega como última parada de un despacho programado o en preparación.</DialogDescription>
          </DialogHeader>
          {abiertos.length === 0 ? (
            <p className="text-sm text-gray-700">No hay despachos programados o en preparación. Cree uno en el módulo de despachos.</p>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor="despacho-destino">Despacho</Label>
              <Select value={despachoId} onValueChange={setDespachoId}>
                <SelectTrigger id="despacho-destino"><SelectValue placeholder="Seleccione un despacho" /></SelectTrigger>
                <SelectContent>
                  {abiertos.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.codigo} · {d.repartidor?.usuario?.nombre || 'sin repartidor'} · {d.estado.toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {error && <p className="text-sm text-danger" role="alert">{error}</p>}
          <DialogFooter>
            <DialogCancel type="button">Cancelar</DialogCancel>
            <Button type="submit" disabled={!despachoId || asignar.isPending} loading={asignar.isPending}>Asignar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
