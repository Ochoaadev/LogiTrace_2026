import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ClipboardList, Save } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { useCreateResiduo } from '@/services/query/useResiduos'
import { devolucionService } from '@/services/devolucionService'
import { UNIDADES_RESIDUO, ORIGENES_RESIDUO, ORIGEN_DEVOLUCION } from '@/schemas/residuoSchema'
import { mensajeError } from './formato'

const VACIO = { tipoResiduoId: '', cantidad: '', unidad: '', origen: '', devolucionId: '', gestorId: '', observaciones: '' }

/**
 * "Registrar residuo operativo" del Figma. Si el origen es una devolución rechazada, el residuo
 * queda vinculado a ella y a la trazabilidad de su pedido.
 */
export function RegistroResiduo({ tipos, gestores }) {
  const crear = useCreateResiduo()
  const [form, setForm] = useState(VACIO)
  const [error, setError] = useState(null)
  const [ok, setOk] = useState(null)
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))
  const desdeDevolucion = form.origen === ORIGEN_DEVOLUCION

  const { data: devoluciones } = useQuery({
    queryKey: ['devoluciones', 'para-residuo'],
    queryFn: () => devolucionService.getAll({ limit: 50 }),
    select: (res) => res.data.filter((d) => d.estado !== 'CANCELADA'),
    enabled: desdeDevolucion,
    staleTime: 30_000,
  })

  const elegirTipo = (id) => {
    const tipo = tipos.find((t) => t.id === id)
    // La unidad sugerida es la base del tipo; el operador puede cambiarla
    setForm((f) => ({ ...f, tipoResiduoId: id, unidad: tipo?.unidadBase || f.unidad }))
  }

  const valido = form.tipoResiduoId && Number(form.cantidad) > 0 && form.unidad && form.origen && form.gestorId
    && (!desdeDevolucion || form.devolucionId)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setOk(null)
    try {
      const { data } = await crear.mutateAsync({
        tipoResiduoId: form.tipoResiduoId,
        cantidad: String(form.cantidad).replace(',', '.'),
        unidad: form.unidad,
        gestorId: form.gestorId,
        ...(desdeDevolucion ? { devolucionId: form.devolucionId } : { origen: form.origen }),
        ...(form.observaciones.trim() && { observaciones: form.observaciones.trim() }),
      })
      setForm(VACIO)
      setOk(`Residuo ${data.codigo} registrado en la bitácora.`)
    } catch (err) {
      setError(await mensajeError(err, 'No se pudo registrar el residuo'))
    }
  }

  return (
    <section className="bg-white p-6" aria-labelledby="registro-residuo">
      <div className="flex items-start gap-3 mb-5 pb-4 border-b border-gray-100">
        <span className="h-10 w-10 flex items-center justify-center bg-primary text-white flex-shrink-0">
          <ClipboardList className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 id="registro-residuo" className="text-base font-semibold text-gray-900">Registrar residuo operativo</h2>
          <p className="text-xs text-gray-600">Formulario de control ambiental en planta</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="rs-tipo">Tipo de residuo *</Label>
          <Select value={form.tipoResiduoId} onValueChange={elegirTipo}>
            <SelectTrigger id="rs-tipo"><SelectValue placeholder="Seleccione el residuo a registrar…" /></SelectTrigger>
            <SelectContent>
              {tipos.filter((t) => t.activo).map((t) => <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="rs-cantidad">Cantidad *</Label>
            <Input id="rs-cantidad" type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="Ej: 15.5" value={form.cantidad} onChange={(e) => set('cantidad')(e.target.value)} className="font-mono" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="rs-unidad">Unidad de medida *</Label>
            <Select value={form.unidad} onValueChange={set('unidad')}>
              <SelectTrigger id="rs-unidad"><SelectValue placeholder="Unidad" /></SelectTrigger>
              <SelectContent>
                {UNIDADES_RESIDUO.map((u) => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="rs-origen">Origen operativo en planta *</Label>
          <Select value={form.origen} onValueChange={(v) => setForm((f) => ({ ...f, origen: v, devolucionId: '' }))}>
            <SelectTrigger id="rs-origen"><SelectValue placeholder="Seleccione área o evento de origen…" /></SelectTrigger>
            <SelectContent>
              {ORIGENES_RESIDUO.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              <SelectItem value={ORIGEN_DEVOLUCION}>Devolución rechazada (logística inversa)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-600">Si proviene de una devolución rechazada, se vincula a la trazabilidad del pedido.</p>
        </div>
        {desdeDevolucion && (
          <div className="grid gap-2">
            <Label htmlFor="rs-devolucion">Devolución *</Label>
            <Select value={form.devolucionId} onValueChange={set('devolucionId')}>
              <SelectTrigger id="rs-devolucion"><SelectValue placeholder={devoluciones ? 'Seleccione la devolución…' : 'Cargando devoluciones…'} /></SelectTrigger>
              <SelectContent>
                {(devoluciones || []).map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.codigo}{d.despachoPedido?.pedido ? ` · ${d.despachoPedido.pedido.codigo}` : ''}{d.motivo ? ` (${d.motivo.nombre})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="grid gap-2">
          <Label htmlFor="rs-gestor">Destino previsto / gestor *</Label>
          <Select value={form.gestorId} onValueChange={set('gestorId')}>
            <SelectTrigger id="rs-gestor"><SelectValue placeholder="Seleccione destino ambiental…" /></SelectTrigger>
            <SelectContent>
              {gestores.filter((g) => g.activo).map((g) => (
                <SelectItem key={g.id} value={g.id}>{g.nombre} ({g.tipo === 'EXTERNO' ? 'externo' : 'interno'})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="rs-obs">Contenedor / tambor y observaciones</Label>
          <Textarea id="rs-obs" rows={2} maxLength={500} placeholder="Ej: Tambor #04, lote de fritura, precinto…" value={form.observaciones} onChange={(e) => set('observaciones')(e.target.value)} />
        </div>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        {ok && <p role="status" className="text-sm bg-success-light text-[#044317] px-3 py-2">{ok}</p>}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => { setForm(VACIO); setError(null); setOk(null) }}>Limpiar</Button>
          <Button type="submit" disabled={!valido || crear.isPending} loading={crear.isPending}>
            {!crear.isPending && <Save className="h-4 w-4" aria-hidden="true" />} Guardar registro ambiental
          </Button>
        </div>
      </form>
    </section>
  )
}
