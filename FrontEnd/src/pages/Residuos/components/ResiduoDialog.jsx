import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogCancel } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { usePermissions } from '@/hooks/usePermissions'
import { useResiduo, useCambiarEstadoResiduo } from '@/services/query/useResiduos'
import { TRANSICIONES_RESIDUO, ACCION_RESIDUO, getEstadoResiduo } from '@/schemas/residuoSchema'
import { cantidad, fechaHora, mensajeError } from './formato'

/** Ficha del residuo con su historial y el siguiente paso del circuito de disposición. */
export function ResiduoDialog({ id, gestores, onClose }) {
  const { can } = usePermissions()
  const { data: residuo, isLoading, isError } = useResiduo(id)
  const cambiar = useCambiarEstadoResiduo()
  const [accion, setAccion] = useState(null)
  const [gestorId, setGestorId] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [error, setError] = useState(null)

  const siguientes = residuo ? TRANSICIONES_RESIDUO[residuo.estado] || [] : []
  const estado = residuo && getEstadoResiduo(residuo.estado)
  const pedido = residuo?.devolucion?.despachoPedido?.pedido
  const gestorRetiro = gestorId || residuo?.gestorId || ''
  const listo = accion && (accion !== 'RETIRADO' || gestorRetiro) && (accion !== 'ANULADO' || observaciones.trim())

  const elegir = (a) => {
    setAccion(a)
    setError(null)
  }

  const confirmar = async () => {
    setError(null)
    try {
      await cambiar.mutateAsync({
        id,
        estado: accion,
        ...(observaciones.trim() && { observaciones: observaciones.trim() }),
        ...(accion === 'RETIRADO' && { gestorId: gestorRetiro }),
      })
      setAccion(null)
      setObservaciones('')
    } catch (err) {
      setError(await mensajeError(err, 'No se pudo actualizar el residuo'))
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-mono">{residuo ? `#${residuo.codigo}` : 'Residuo'}</DialogTitle>
          <DialogDescription>{residuo ? `${residuo.tipoResiduo.nombre} · registrado ${fechaHora(residuo.fechaGeneracion)}` : 'Cargando registro…'}</DialogDescription>
        </DialogHeader>

        {isError && <p role="alert" className="text-sm text-danger">No se pudo cargar el residuo.</p>}
        {isLoading && <div className="h-40 bg-gray-50 animate-pulse" />}

        {residuo && (
          <div className="grid gap-5 max-h-[60vh] overflow-y-auto pr-1">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="label-caps text-gray-600">Cantidad</dt>
                <dd className="font-mono font-semibold text-gray-900">{cantidad(residuo.cantidad)} {residuo.unidad}</dd>
              </div>
              <div>
                <dt className="label-caps text-gray-600">Estado</dt>
                <dd><Badge variant={estado.color}>{estado.label}</Badge></dd>
              </div>
              <div>
                <dt className="label-caps text-gray-600">Origen en planta</dt>
                <dd className="text-gray-900">{residuo.origen || '—'}</dd>
              </div>
              <div>
                <dt className="label-caps text-gray-600">Destino / gestor</dt>
                <dd className="text-gray-900">{residuo.gestor ? `${residuo.gestor.nombre} (${residuo.gestor.tipo === 'EXTERNO' ? 'externo' : 'interno'})` : 'Sin gestor asignado'}</dd>
              </div>
              {residuo.devolucion && (
                <div>
                  <dt className="label-caps text-gray-600">Logística inversa</dt>
                  <dd className="flex flex-wrap gap-x-3">
                    <Link to={`/devoluciones/${residuo.devolucion.id}`} className="font-mono text-primary hover:underline">{residuo.devolucion.codigo}</Link>
                    {pedido && <Link to={`/trazabilidad?q=${pedido.codigo}`} className="font-mono text-primary hover:underline">Pedido {pedido.codigo}</Link>}
                  </dd>
                </div>
              )}
              <div>
                <dt className="label-caps text-gray-600">Fecha de retiro</dt>
                <dd className="font-mono text-gray-900">{fechaHora(residuo.fechaRetiro)}</dd>
              </div>
              {residuo.observaciones && (
                <div className="col-span-2">
                  <dt className="label-caps text-gray-600">Contenedor / observaciones</dt>
                  <dd className="text-gray-900">{residuo.observaciones}</dd>
                </div>
              )}
            </dl>

            <section aria-labelledby="historial-residuo">
              <h3 id="historial-residuo" className="label-caps text-gray-900 mb-2">Historial del registro</h3>
              <ol className="border-l-2 border-gray-100 pl-4 space-y-3">
                {residuo.eventos.map((e) => (
                  <li key={e.id} className="relative">
                    <span className="absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" aria-hidden="true" />
                    <p className="text-sm font-semibold text-gray-900">{getEstadoResiduo(e.estadoNuevo).label}</p>
                    <p className="text-xs text-gray-600">{fechaHora(e.fechaHora)}{e.usuario ? ` · ${e.usuario.nombre}` : ''}</p>
                    {e.descripcion && <p className="text-xs text-gray-700">{e.descripcion}</p>}
                  </li>
                ))}
              </ol>
            </section>

            {can('residuos.update') && siguientes.length > 0 && (
              <section aria-labelledby="siguiente-paso" className="bg-gray-50 p-4 grid gap-3">
                <h3 id="siguiente-paso" className="label-caps text-gray-900">Siguiente paso del circuito</h3>
                <div className="flex flex-wrap gap-2">
                  {siguientes.map((s) => (
                    <Button key={s} type="button" size="sm" variant={accion === s ? (s === 'ANULADO' ? 'danger' : 'primary') : 'outline'} onClick={() => elegir(s)} aria-pressed={accion === s}>
                      {ACCION_RESIDUO[s]}
                    </Button>
                  ))}
                </div>
                {accion === 'RETIRADO' && (
                  <div className="grid gap-2">
                    <Label htmlFor="rd-gestor">Gestor que retira *</Label>
                    <Select value={gestorRetiro} onValueChange={setGestorId}>
                      <SelectTrigger id="rd-gestor"><SelectValue placeholder="Seleccione el gestor…" /></SelectTrigger>
                      <SelectContent>
                        {gestores.filter((g) => g.activo).map((g) => <SelectItem key={g.id} value={g.id}>{g.nombre}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {accion && (
                  <div className="grid gap-2">
                    <Label htmlFor="rd-obs">{accion === 'ANULADO' ? 'Motivo de la anulación *' : 'Observaciones (guía de retiro, comprobante…)'}</Label>
                    <Textarea id="rd-obs" rows={2} maxLength={500} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
                  </div>
                )}
              </section>
            )}
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          </div>
        )}

        <DialogFooter>
          <DialogCancel type="button">Cerrar</DialogCancel>
          {accion && (
            <Button type="button" variant={accion === 'ANULADO' ? 'danger' : 'primary'} onClick={confirmar} disabled={!listo || cambiar.isPending} loading={cambiar.isPending}>
              {ACCION_RESIDUO[accion]}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
