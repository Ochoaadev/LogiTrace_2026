import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogCancel } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { useRegistrarTemperatura } from '@/services/query/useTrazabilidad'

const TIPOS_REGISTRO = [
  { value: 'CAVA', label: 'Cava / almacén' },
  { value: 'VEHICULO_SALIDA', label: 'Vehículo (salida o en ruta)' },
  { value: 'RECEPCION_DEVOLUCION', label: 'Recepción de devolución' },
  { value: 'OTRA', label: 'Otra medición' },
]

/**
 * Registro manual de temperatura para el expediente. Se asocia al despacho vigente o a una
 * de sus devoluciones (el registro con cava suelta se hace desde Inventario).
 */
export function RegistrarTemperaturaDialog({ open, onOpenChange, expediente }) {
  const registrar = useRegistrarTemperatura()
  const destinos = [
    expediente.logistica && { value: `despacho:${expediente.logistica.despachoId}`, label: `Despacho ${expediente.logistica.codigo}` },
    ...expediente.devoluciones.map((d) => ({ value: `devolucion:${d.id}`, label: `Devolución ${d.codigo}` })),
  ].filter(Boolean)

  const [form, setForm] = useState({ destino: destinos[0]?.value || '', tipoRegistro: 'VEHICULO_SALIDA', temperaturaC: '', observaciones: '' })
  const [error, setError] = useState(null)
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    const [tipo, id] = form.destino.split(':')
    try {
      await registrar.mutateAsync({
        tipoRegistro: form.tipoRegistro,
        temperaturaC: Number(form.temperaturaC),
        observaciones: form.observaciones || undefined,
        ...(tipo === 'despacho' ? { despachoId: id } : { devolucionId: id }),
      })
      setForm((f) => ({ ...f, temperaturaC: '', observaciones: '' }))
      onOpenChange(false)
    } catch (err) {
      setError(err?.errors?.[0]?.mensaje || err?.message || 'No se pudo registrar la temperatura')
    }
  }

  const valida = form.destino && form.temperaturaC !== '' && !Number.isNaN(Number(form.temperaturaC))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Registrar temperatura</DialogTitle>
            <DialogDescription>Medición manual con termómetro. Límite crítico: {expediente.cadenaFrio.limiteCriticoC} °C.</DialogDescription>
          </DialogHeader>

          {destinos.length === 0 ? (
            <p className="text-sm text-gray-700">El pedido aún no tiene despacho ni devoluciones a los que asociar la medición.</p>
          ) : (
            <>
              <div className="grid gap-2">
                <Label>Asociar a</Label>
                <Select value={form.destino} onValueChange={set('destino')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {destinos.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Punto de medición</Label>
                <Select value={form.tipoRegistro} onValueChange={set('tipoRegistro')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_REGISTRO.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="temperaturaC">Temperatura (°C)</Label>
                <Input
                  id="temperaturaC"
                  type="number"
                  step="0.1"
                  min="-60"
                  max="40"
                  inputMode="decimal"
                  placeholder="-18.0"
                  value={form.temperaturaC}
                  onChange={(e) => set('temperaturaC')(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="observacionesTemp">Observaciones</Label>
                <Textarea id="observacionesTemp" rows={2} value={form.observaciones} onChange={(e) => set('observaciones')(e.target.value)} />
              </div>
            </>
          )}

          {error && <p className="text-sm text-danger" role="alert">{error}</p>}

          <DialogFooter>
            <DialogCancel type="button">Cancelar</DialogCancel>
            <Button type="submit" disabled={!valida || registrar.isPending} loading={registrar.isPending}>
              Registrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Consulta rápida por código: acepta lo que se escriba o lo que envíe un lector QR/código de
 * barras (que actúa como teclado y termina con Enter). Busca pedido, despacho, precinto,
 * lote, incidencia o devolución.
 */
export function ConsultaCodigoDialog({ open, onOpenChange, onConsultar }) {
  const [codigo, setCodigo] = useState('')

  const onSubmit = (e) => {
    e.preventDefault()
    if (!codigo.trim()) return
    onConsultar(codigo.trim())
    setCodigo('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Consultar por código QR / precinto</DialogTitle>
            <DialogDescription>
              Escanee el código con el lector o escríbalo: pedido, despacho, precinto, lote, incidencia o devolución.
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            aria-label="Código a consultar"
            placeholder="Ej.: PREC-9024"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            className="font-mono"
          />
          <DialogFooter>
            <DialogCancel type="button">Cancelar</DialogCancel>
            <Button type="submit" disabled={!codigo.trim()}>Consultar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
