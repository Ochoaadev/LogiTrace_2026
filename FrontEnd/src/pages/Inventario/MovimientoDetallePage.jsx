import { useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogCancel } from '@/components/ui/Dialog'
import { DataTable, createTableColumns } from '@/components/ui/Table'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { PageHeader } from '@/components/layout/PageHeader'
import { usePermissions } from '@/hooks/usePermissions'
import { useMovimientos, useAjustarStock, useCrearMovimiento, useGetLoteDetalle } from '@/services/query/useInventario'
import { useUbicaciones } from '@/services/query/useCatalogos'
import { getTipoMovimientoConfig, getEstadoLoteConfig, TIPOS_MOVIMIENTO } from '@/schemas/inventarioSchema'
import { Minus, Plus, AlertCircle, TriangleAlert, CircleCheck, ArrowLeft } from 'lucide-react'
import { fechaSinHora, diasHasta } from '@/lib/fechas'

const DIAS_ALERTA_VENCIMIENTO = 7

// Qué ubicaciones exige el backend para cada tipo de movimiento
const REQUIERE = {
  ENTRADA: { destino: true },
  REINGRESO: { destino: true },
  AJUSTE: { destino: true },
  SALIDA: { origen: true },
  DESCARTE: { origen: true },
  TRASLADO: { origen: true, destino: true },
}

// Efecto de un movimiento sobre el stock total del lote. TRASLADO no cambia el total (solo mueve
// entre ubicaciones); AJUSTE guarda la diferencia con signo.
function efectoEnTotal(m) {
  const c = Number(m.cantidad)
  if (['ENTRADA', 'REINGRESO', 'AJUSTE'].includes(m.tipo)) return c
  if (['SALIDA', 'DESCARTE'].includes(m.tipo)) return -c
  return 0
}

const formatFecha = (fecha) =>
  fecha ? new Date(fecha).toLocaleString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

const num = (v) => Number(v ?? 0).toLocaleString('es-VE', { maximumFractionDigits: 2 })

function TipoBadge({ tipo }) {
  const config = getTipoMovimientoConfig(tipo)
  return (
    <Badge variant={config.color}>
      {config.icon && <config.icon className="h-3 w-3" aria-hidden="true" />} {config.label}
    </Badge>
  )
}

function Dato({ etiqueta, children }) {
  return (
    <div className="bg-white p-4">
      <p className="label-caps">{etiqueta}</p>
      <p className="mt-2 text-xl font-semibold text-gray-900">{children}</p>
    </div>
  )
}

export default function MovimientoDetallePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { can } = usePermissions()

  const { data: lote, isLoading, error } = useGetLoteDetalle(id)
  const { data: movimientosData } = useMovimientos({ loteId: id }, { page: 1, limit: 50 })
  const { data: ubicacionesData } = useUbicaciones({ activo: 'true' }, { page: 1, limit: 100 })

  // ?accion=movimiento abre el diálogo al llegar desde "Nuevo movimiento" en la lista
  const [dialogo, setDialogo] = useState(params.get('accion') === 'movimiento' ? 'movimiento' : null)
  const cerrarDialogo = () => {
    setDialogo(null)
    if (params.get('accion')) setParams({}, { replace: true })
  }

  const loteData = lote?.data
  const ubicaciones = ubicacionesData?.data || []
  const movimientos = movimientosData?.data || []

  if (isLoading) return <SkeletonCard />

  if (error || !loteData) {
    return (
      <div className="bg-white text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto text-danger mb-4" aria-hidden="true" />
        <h2 className="text-xl font-semibold text-gray-900">Lote no encontrado</h2>
        <Button className="mt-4" onClick={() => navigate('/inventario')}>Volver a inventario</Button>
      </div>
    )
  }

  const inventarios = loteData.inventarios || []
  const estado = getEstadoLoteConfig(loteData.estadoCalidad)
  const unidad = loteData.unidadBase || ''

  // Saldo del kardex: se reconstruye hacia atrás desde el stock total actual, porque la lista
  // viene del más reciente al más antiguo y puede no incluir todo el historial.
  const stockTotal = Number(loteData.stockTotal ?? 0)
  const kardex = movimientos.map((m, i) => ({
    ...m,
    saldo: stockTotal - movimientos.slice(0, i).reduce((acc, posterior) => acc + efectoEnTotal(posterior), 0),
  }))

  // Alertas reales del lote
  const vence = loteData.fechaVencimiento
  const diasParaVencer = diasHasta(vence)
  const alertas = [
    ...inventarios
      .filter((inv) => Number(inv.stockActual) <= Number(inv.stockMinimo) && Number(inv.stockMinimo) > 0)
      .map((inv) => ({ tipo: 'critical', texto: `Stock bajo en ${inv.ubicacion?.nombre}: ${num(inv.stockActual)} ${unidad} (mínimo ${num(inv.stockMinimo)})` })),
    ...(diasParaVencer !== null && diasParaVencer < 0 ? [{ tipo: 'critical', texto: `Lote vencido desde el ${fechaSinHora(vence)}` }] : []),
    ...(diasParaVencer !== null && diasParaVencer >= 0 && diasParaVencer <= DIAS_ALERTA_VENCIMIENTO
      ? [{ tipo: 'warning', texto: `Vence en ${diasParaVencer} día(s) (${fechaSinHora(vence)})` }]
      : []),
    ...(loteData.estadoCalidad !== 'DISPONIBLE' ? [{ tipo: 'warning', texto: `Estado de calidad: ${estado.label}` }] : []),
  ]

  return (
    <div>
      <PageHeader
        modulo="06"
        seccion="Inventario · detalle de lote"
        title={`Lote ${loteData.codigo}`}
        description={`${loteData.producto?.nombre || 'Producto'} · unidad base: ${unidad}`}
        tags={<Badge variant={estado.color}>{estado.label}</Badge>}
        actions={
          <>
            <Button variant="ghost" onClick={() => navigate('/inventario')}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver
            </Button>
            {can('inventario.adjust') && (
              <Button variant="secondary" onClick={() => setDialogo('ajuste')}>
                <Minus className="h-4 w-4" aria-hidden="true" /> Ajustar stock
              </Button>
            )}
            {can('inventario.movimientos') && (
              <Button onClick={() => setDialogo('movimiento')}>
                <Plus className="h-4 w-4" aria-hidden="true" /> Nuevo movimiento
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Dato etiqueta="Stock total">{num(loteData.stockTotal)} <span className="text-sm font-normal text-gray-600">{unidad}</span></Dato>
        <Dato etiqueta="Ubicaciones con stock">{inventarios.filter((i) => Number(i.stockActual) > 0).length}</Dato>
        <Dato etiqueta="Producción">{fechaSinHora(loteData.fechaProduccion)}</Dato>
        <Dato etiqueta="Vencimiento">{vence ? fechaSinHora(vence) : 'Sin fecha'}</Dato>
      </div>

      <Tabs defaultValue="stock" className="bg-white px-4 pb-4">
        <TabsList>
          <TabsTrigger value="stock">Stock por ubicación ({inventarios.length})</TabsTrigger>
          <TabsTrigger value="kardex">Kardex ({movimientos.length})</TabsTrigger>
          <TabsTrigger value="alertas">Alertas ({alertas.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="stock">
          {inventarios.length ? (
            <DataTable
              showPagination={false}
              data={inventarios}
              columns={createTableColumns([
                { accessorKey: 'ubicacion', header: 'Ubicación', cell: (_, row) => `${row.original.ubicacion?.codigo} · ${row.original.ubicacion?.nombre}` },
                { accessorKey: 'stockActual', header: 'Stock actual', cell: (v) => <span className="font-mono">{num(v)} {unidad}</span> },
                { accessorKey: 'stockMinimo', header: 'Stock mínimo', cell: (v) => <span className="font-mono">{num(v)}</span> },
                {
                  accessorKey: 'id',
                  header: 'Estado',
                  cell: (_, row) =>
                    Number(row.original.stockActual) <= Number(row.original.stockMinimo) && Number(row.original.stockMinimo) > 0
                      ? <Badge variant="danger">Bajo mínimo</Badge>
                      : <Badge variant="success">Normal</Badge>,
                },
              ])}
            />
          ) : (
            <p className="p-8 text-center text-gray-600">Este lote no tiene stock registrado en ninguna ubicación.</p>
          )}
        </TabsContent>

        <TabsContent value="kardex">
          {kardex.length ? (
            <DataTable
              showPagination={false}
              data={kardex}
              columns={createTableColumns([
                { accessorKey: 'fechaHora', header: 'Fecha', cell: (v) => <span className="font-mono text-xs">{formatFecha(v)}</span> },
                { accessorKey: 'tipo', header: 'Tipo', cell: (v) => <TipoBadge tipo={v} /> },
                {
                  accessorKey: 'cantidad',
                  header: 'Cantidad',
                  cell: (_, row) => {
                    const e = efectoEnTotal(row.original)
                    return <span className="font-mono">{row.original.tipo === 'TRASLADO' ? num(row.original.cantidad) : `${e > 0 ? '+' : ''}${num(e)}`}</span>
                  },
                },
                { accessorKey: 'saldo', header: 'Saldo', cell: (v) => <span className="font-mono font-semibold">{num(v)}</span> },
                { accessorKey: 'ubicacionOrigen', header: 'Origen', cell: (_, row) => row.original.ubicacionOrigen?.nombre || '—' },
                { accessorKey: 'ubicacionDestino', header: 'Destino', cell: (_, row) => row.original.ubicacionDestino?.nombre || '—' },
                { accessorKey: 'usuario', header: 'Usuario', cell: (_, row) => row.original.usuario?.nombre || '—' },
                { accessorKey: 'observaciones', header: 'Observaciones', cell: (v) => v || '—' },
              ])}
            />
          ) : (
            <p className="p-8 text-center text-gray-600">Sin movimientos registrados.</p>
          )}
        </TabsContent>

        <TabsContent value="alertas">
          {alertas.length === 0 ? (
            <p className="flex items-center gap-2 p-4 text-sm text-gray-700">
              <CircleCheck className="h-5 w-5 text-success" aria-hidden="true" /> Sin alertas: stock sobre el mínimo, lote vigente y disponible.
            </p>
          ) : (
            <ul className="space-y-2">
              {alertas.map((a) => (
                <li key={a.texto} className={a.tipo === 'critical' ? 'flex items-center gap-2 p-3 bg-danger-light text-[#a2191f] text-sm' : 'flex items-center gap-2 p-3 bg-warning-light text-[#684e00] text-sm'}>
                  <TriangleAlert className="h-4 w-4 flex-shrink-0" aria-hidden="true" /> {a.texto}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      {dialogo === 'ajuste' && (
        <AjusteDialog lote={loteData} ubicaciones={ubicaciones} onClose={cerrarDialogo} />
      )}
      {dialogo === 'movimiento' && (
        <MovimientoDialog lote={loteData} ubicaciones={ubicaciones} onClose={cerrarDialogo} />
      )}
    </div>
  )
}

const mensajeError = (err, porDefecto) => err?.errors?.[0]?.mensaje || err?.message || porDefecto

function UbicacionSelect({ id, value, onChange, ubicaciones, placeholder = 'Seleccione ubicación' }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id}><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        {ubicaciones.map((u) => <SelectItem key={u.id} value={u.id}>{u.codigo} · {u.nombre}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}

// Fija el stock de una ubicación a un valor contado (conteo físico)
function AjusteDialog({ lote, ubicaciones, onClose }) {
  const ajustar = useAjustarStock()
  const inicial = lote.inventarios?.[0]
  const [ubicacionId, setUbicacionId] = useState(inicial?.ubicacion?.id || '')
  const [cantidad, setCantidad] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [error, setError] = useState(null)

  const actual = lote.inventarios?.find((i) => i.ubicacion?.id === ubicacionId)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      await ajustar.mutateAsync({ loteId: lote.id, ubicacionId, cantidadNueva: Number(cantidad), observaciones: observaciones || undefined })
      onClose()
    } catch (err) {
      setError(mensajeError(err, 'No se pudo ajustar el stock'))
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Ajustar stock del lote {lote.codigo}</DialogTitle>
            <DialogDescription>Registra el conteo físico; la diferencia queda en el kardex como AJUSTE.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="ajuste-ubicacion">Ubicación</Label>
            <UbicacionSelect id="ajuste-ubicacion" value={ubicacionId} onChange={setUbicacionId} ubicaciones={ubicaciones} />
            <p className="text-xs text-gray-600">Stock registrado: {num(actual?.stockActual)} {lote.unidadBase}</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ajuste-cantidad">Cantidad contada</Label>
            <Input id="ajuste-cantidad" type="number" min="0" step="0.01" value={cantidad} onChange={(e) => setCantidad(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ajuste-obs">Motivo / observaciones</Label>
            <Textarea id="ajuste-obs" rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
          </div>
          {error && <p className="text-sm text-danger" role="alert">{error}</p>}
          <DialogFooter>
            <DialogCancel type="button">Cancelar</DialogCancel>
            <Button type="submit" disabled={!ubicacionId || cantidad === '' || ajustar.isPending} loading={ajustar.isPending}>Ajustar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function MovimientoDialog({ lote, ubicaciones, onClose }) {
  const crear = useCrearMovimiento()
  const [form, setForm] = useState({ tipo: 'ENTRADA', cantidad: '', ubicacionOrigenId: '', ubicacionDestinoId: '', observaciones: '' })
  const [error, setError] = useState(null)
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))
  const req = REQUIERE[form.tipo] || {}

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      // Solo se envían las ubicaciones que corresponden al tipo (antes iban invertidas:
      // ENTRADA sin destino y SALIDA sin origen, y el backend las rechazaba)
      await crear.mutateAsync({
        tipo: form.tipo,
        loteId: lote.id,
        cantidad: String(form.cantidad),
        unidad: lote.unidadBase || 'unidad',
        ...(req.origen && { ubicacionOrigenId: form.ubicacionOrigenId }),
        ...(req.destino && { ubicacionDestinoId: form.ubicacionDestinoId }),
        ...(form.observaciones && { observaciones: form.observaciones }),
      })
      onClose()
    } catch (err) {
      setError(mensajeError(err, 'No se pudo registrar el movimiento'))
    }
  }

  const valido =
    Number(form.cantidad) > 0 &&
    (!req.origen || form.ubicacionOrigenId) &&
    (!req.destino || form.ubicacionDestinoId)

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Nuevo movimiento · lote {lote.codigo}</DialogTitle>
            <DialogDescription>{lote.producto?.nombre} · stock total {num(lote.stockTotal)} {lote.unidadBase}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="mov-tipo">Tipo de movimiento</Label>
            <Select value={form.tipo} onValueChange={set('tipo')}>
              <SelectTrigger id="mov-tipo"><SelectValue /></SelectTrigger>
              <SelectContent>
                {/* AJUSTE se hace con "Ajustar stock" (conteo físico) */}
                {TIPOS_MOVIMIENTO.filter((t) => t.value !== 'AJUSTE').map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="mov-cantidad">Cantidad ({lote.unidadBase})</Label>
            <Input id="mov-cantidad" type="number" min="0.01" step="0.01" value={form.cantidad} onChange={(e) => set('cantidad')(e.target.value)} required />
          </div>
          {req.origen && (
            <div className="grid gap-2">
              <Label htmlFor="mov-origen">Ubicación de origen</Label>
              <UbicacionSelect id="mov-origen" value={form.ubicacionOrigenId} onChange={set('ubicacionOrigenId')} ubicaciones={ubicaciones} />
            </div>
          )}
          {req.destino && (
            <div className="grid gap-2">
              <Label htmlFor="mov-destino">Ubicación de destino</Label>
              <UbicacionSelect id="mov-destino" value={form.ubicacionDestinoId} onChange={set('ubicacionDestinoId')} ubicaciones={ubicaciones} />
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="mov-obs">Observaciones</Label>
            <Textarea id="mov-obs" rows={2} value={form.observaciones} onChange={(e) => set('observaciones')(e.target.value)} />
          </div>
          {error && <p className="text-sm text-danger" role="alert">{error}</p>}
          <DialogFooter>
            <DialogCancel type="button">Cancelar</DialogCancel>
            <Button type="submit" disabled={!valido || crear.isPending} loading={crear.isPending}>Registrar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
