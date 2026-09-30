import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowUp, ArrowDown, X, Snowflake } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { Badge } from '@/components/ui/Badge'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { usePedidos } from '@/services/query/usePedidos'
import { useCreateDespacho } from '@/services/query/useDespachos'
import { useRepartidores, useVehiculos, useRutas } from '@/services/query/useCatalogos'
import { getPrioridadConfig } from '@/schemas/pedidoSchema'
import { cn } from '@/lib/utils'

const SIN_VALOR = '__ninguno'

function Seccion({ titulo, children }) {
  return (
    <section className="bg-white p-6">
      <h2 className="label-caps text-gray-900 mb-4">{titulo}</h2>
      {children}
    </section>
  )
}

export default function NuevoDespachoPage() {
  const navigate = useNavigate()
  const crear = useCreateDespacho()

  const { data: pedidosData, isLoading: cargandoPedidos } = usePedidos({ estado: 'LISTO_PARA_DESPACHO' }, { page: 1, limit: 100 })
  const { data: repartidoresData } = useRepartidores({ estado: 'DISPONIBLE' }, { page: 1, limit: 100 })
  const { data: vehiculosData } = useVehiculos({ activo: 'true' }, { page: 1, limit: 100 })
  const { data: rutasData } = useRutas({}, { page: 1, limit: 100 })

  const pedidosListos = pedidosData?.data || []
  const repartidores = (repartidoresData?.data || []).filter((r) => r.usuario?.activo !== false)
  const vehiculos = vehiculosData?.data || []
  const rutas = (rutasData?.data || []).filter((r) => r.estado !== 'FINALIZADA')

  // Orden de selección = orden de parada
  const [paradas, setParadas] = useState([])
  const [form, setForm] = useState({ repartidorId: '', vehiculoId: '', rutaId: '', medioConservacion: '', precintoSeguridad: '', observaciones: '' })
  const [error, setError] = useState(null)
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v === SIN_VALOR ? '' : v }))

  const alternar = (id) =>
    setParadas((ps) => (ps.includes(id) ? ps.filter((x) => x !== id) : [...ps, id]))
  const mover = (i, delta) =>
    setParadas((ps) => {
      const j = i + delta
      if (j < 0 || j >= ps.length) return ps
      const copia = [...ps]
      ;[copia[i], copia[j]] = [copia[j], copia[i]]
      return copia
    })

  const vehiculo = vehiculos.find((v) => v.id === form.vehiculoId)
  const valido = form.repartidorId && paradas.length > 0

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      const res = await crear.mutateAsync({
        repartidorId: form.repartidorId,
        ...(form.vehiculoId && { vehiculoId: form.vehiculoId }),
        ...(form.rutaId && { rutaId: form.rutaId }),
        ...(form.medioConservacion && { medioConservacion: form.medioConservacion }),
        ...(form.precintoSeguridad && { precintoSeguridad: form.precintoSeguridad }),
        ...(form.observaciones && { observaciones: form.observaciones }),
        pedidos: paradas.map((pedidoId, i) => ({ pedidoId, ordenParada: i + 1 })),
      })
      navigate(`/despachos/${res.data.id}`)
    } catch (err) {
      setError(err?.errors?.[0]?.mensaje || err?.message || 'No se pudo crear el despacho')
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <PageHeader
        modulo="03"
        seccion="Despachos · nuevo"
        title="Programar despacho"
        description="Seleccione los pedidos listos para despacho en el orden de entrega, el repartidor disponible y el vehículo."
        actions={
          <Button type="button" variant="ghost" onClick={() => navigate('/despachos')}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver
          </Button>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-6">
        <div className="space-y-6 min-w-0">
          <Seccion titulo={`Pedidos listos para despacho (${pedidosListos.length})`}>
            {cargandoPedidos ? (
              <p className="text-sm text-gray-600">Cargando pedidos…</p>
            ) : pedidosListos.length === 0 ? (
              <p className="text-sm text-gray-600">
                No hay pedidos en estado "Listo para despacho". Márquelos como listos desde el detalle del pedido.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {pedidosListos.map((p) => {
                  const seleccionado = paradas.includes(p.id)
                  const prioridad = getPrioridadConfig(p.prioridad)
                  return (
                    <li key={p.id}>
                      <label className={cn('flex items-start gap-3 px-2 py-3 cursor-pointer hover:bg-gray-50', seleccionado && 'bg-primary-light hover:bg-primary-light')}>
                        <input type="checkbox" className="mt-1 h-4 w-4 accent-[#0f62fe]" checked={seleccionado} onChange={() => alternar(p.id)} />
                        <span className="flex-1 min-w-0">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-semibold text-gray-900">{p.codigo}</span>
                            <Badge variant={prioridad.color}>{prioridad.label}</Badge>
                          </span>
                          <span className="block text-sm text-gray-900">{p.cliente?.razonSocial}</span>
                          <span className="block text-xs text-gray-600">{p.direccionEntrega}{p.zona?.nombre ? ` · ${p.zona.nombre}` : ''}</span>
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            )}
          </Seccion>

          {paradas.length > 0 && (
            <Seccion titulo="Orden de paradas">
              <ol className="space-y-2">
                {paradas.map((id, i) => {
                  const p = pedidosListos.find((x) => x.id === id)
                  return (
                    <li key={id} className="flex items-center gap-3 bg-gray-50 px-3 py-2">
                      <span className="font-mono text-sm font-semibold text-primary w-6">#{i + 1}</span>
                      <span className="flex-1 min-w-0 text-sm truncate">
                        <span className="font-mono mr-2">{p?.codigo}</span>{p?.cliente?.razonSocial}
                      </span>
                      <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} className="p-1 hover:bg-gray-100 disabled:opacity-30" aria-label="Subir parada"><ArrowUp className="h-4 w-4" /></button>
                      <button type="button" onClick={() => mover(i, 1)} disabled={i === paradas.length - 1} className="p-1 hover:bg-gray-100 disabled:opacity-30" aria-label="Bajar parada"><ArrowDown className="h-4 w-4" /></button>
                      <button type="button" onClick={() => alternar(id)} className="p-1 hover:bg-gray-100" aria-label="Quitar parada"><X className="h-4 w-4" /></button>
                    </li>
                  )
                })}
              </ol>
            </Seccion>
          )}
        </div>

        <div className="space-y-6 min-w-0">
          <Seccion titulo="Asignación">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="repartidor">Repartidor (disponibles)</Label>
                <Select value={form.repartidorId} onValueChange={set('repartidorId')}>
                  <SelectTrigger id="repartidor"><SelectValue placeholder={repartidores.length ? 'Seleccione un repartidor' : 'No hay repartidores disponibles'} /></SelectTrigger>
                  <SelectContent>
                    {repartidores.map((r) => <SelectItem key={r.id} value={r.id}>{r.usuario?.nombre}{r.telefono ? ` · ${r.telefono}` : ''}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="vehiculo">Vehículo</Label>
                <Select value={form.vehiculoId || SIN_VALOR} onValueChange={set('vehiculoId')}>
                  <SelectTrigger id="vehiculo"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SIN_VALOR}>Sin vehículo asignado</SelectItem>
                    {vehiculos.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.codigo} · {v.tipo?.replaceAll('_', ' ').toLowerCase()}{v.placa ? ` · ${v.placa}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {vehiculo && (
                  <p className="flex items-center gap-2 text-xs text-gray-700">
                    {vehiculo.capacidadCarga ? `Capacidad: ${Number(vehiculo.capacidadCarga)} ${vehiculo.unidadCapacidad || ''}` : 'Capacidad no registrada'}
                    {vehiculo.esTermico && <span className="inline-flex items-center gap-1 text-primary"><Snowflake className="h-3.5 w-3.5" aria-hidden="true" /> térmico</span>}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ruta">Ruta</Label>
                <Select value={form.rutaId || SIN_VALOR} onValueChange={set('rutaId')}>
                  <SelectTrigger id="ruta"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SIN_VALOR}>Sin ruta</SelectItem>
                    {rutas.map((r) => <SelectItem key={r.id} value={r.id}>{r.codigo} · {r.nombre}{r.zona?.nombre ? ` · ${r.zona.nombre}` : ''}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Seccion>

          <Seccion titulo="Cadena de frío y seguridad">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="medio">Medio de conservación</Label>
                <Input id="medio" maxLength={80} placeholder="Ej.: Caja isotérmica #04" value={form.medioConservacion} onChange={(e) => set('medioConservacion')(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="precinto">Precinto de seguridad</Label>
                <Input id="precinto" maxLength={50} className="font-mono" placeholder="Ej.: PREC-9024" value={form.precintoSeguridad} onChange={(e) => set('precintoSeguridad')(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="obs">Observaciones</Label>
                <Textarea id="obs" rows={3} value={form.observaciones} onChange={(e) => set('observaciones')(e.target.value)} />
              </div>
            </div>
          </Seccion>

          <section className="bg-white p-6">
            <p className="text-sm text-gray-700 mb-4">
              {paradas.length} parada(s) · {form.repartidorId ? repartidores.find((r) => r.id === form.repartidorId)?.usuario?.nombre : 'sin repartidor'}
            </p>
            {error && <p role="alert" className="mb-4 text-sm text-danger">{error}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={!valido || crear.isPending} loading={crear.isPending}>
              Programar despacho
            </Button>
            {/* Antes el botón quedaba deshabilitado sin explicar qué faltaba */}
            {!valido && (
              <p className="mt-3 text-xs text-gray-600">
                {[paradas.length === 0 && 'marque al menos un pedido en la lista', !form.repartidorId && 'elija el repartidor'].filter(Boolean).join(' y ').replace(/^./, (c) => c.toUpperCase())} para habilitar el botón.
              </p>
            )}
          </section>
        </div>
      </div>
    </form>
  )
}
