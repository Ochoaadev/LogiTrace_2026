import { useState } from 'react'
import { FileText, Sheet } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogCancel } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Checkbox } from '@/components/ui/Checkbox'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { cn } from '@/lib/utils'
import { isoLocal } from './formato'

const SECCIONES = [
  { value: 'entregas', label: 'Pedidos, despachos y sectores', detalle: 'Eficacia, ciclo, distribución por sector y cadena de frío' },
  { value: 'incidencias', label: 'Incidencias y contingencias', detalle: 'Tasa, causas y tiempos de resolución' },
  { value: 'devoluciones', label: 'Devoluciones y calidad', detalle: 'Motivos, dictámenes y tiempos de recepción' },
  { value: 'residuos', label: 'Gestión ambiental y residuos', detalle: 'Balance por tipo, retiros y trazabilidad' },
]
const TODOS = 'TODOS'

/** "+ Generar reporte personalizado": rango de fechas, sector, secciones y formato. */
export function ReportePersonalizadoDialog({ zonas, onGenerar, onClose }) {
  const hoy = new Date()
  const [desde, setDesde] = useState(isoLocal(new Date(hoy.getFullYear(), hoy.getMonth(), 1)))
  const [hasta, setHasta] = useState(isoLocal(hoy))
  const [zonaId, setZonaId] = useState(TODOS)
  const [secciones, setSecciones] = useState(SECCIONES.map((s) => s.value))
  const [formato, setFormato] = useState('pdf')
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState(null)

  const alternar = (valor) => setSecciones((s) => (s.includes(valor) ? s.filter((x) => x !== valor) : [...s, valor]))
  const valido = desde && hasta && desde <= hasta && secciones.length > 0

  const generar = async (e) => {
    e.preventDefault()
    setGenerando(true)
    setError(null)
    const fallo = await onGenerar(formato, {
      fechaDesde: new Date(`${desde}T00:00:00`).toISOString(),
      fechaHasta: new Date(`${hasta}T23:59:59`).toISOString(),
      ...(zonaId !== TODOS && { zonaId }),
      secciones: SECCIONES.map((s) => s.value).filter((s) => secciones.includes(s)).join(','),
    })
    setGenerando(false)
    if (fallo) setError(fallo)
    else onClose()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <form onSubmit={generar} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Generar reporte personalizado</DialogTitle>
            <DialogDescription>Elija el periodo, el sector y las secciones que debe incluir el documento.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="rp-desde">Desde</Label>
              <Input id="rp-desde" type="date" value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rp-hasta">Hasta</Label>
              <Input id="rp-hasta" type="date" value={hasta} min={desde} max={isoLocal(hoy)} onChange={(e) => setHasta(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="rp-zona">Eje territorial</Label>
            <Select value={zonaId} onValueChange={setZonaId}>
              <SelectTrigger id="rp-zona"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos los sectores</SelectItem>
                {zonas.map((z) => <SelectItem key={z.id} value={z.id}>{z.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <fieldset className="grid gap-2">
            <legend className="text-xs font-medium tracking-[0.04em] text-gray-600 mb-2">Secciones del reporte *</legend>
            {SECCIONES.map((s) => (
              <label key={s.value} className="flex items-start gap-3 bg-gray-50 p-3 cursor-pointer">
                <Checkbox checked={secciones.includes(s.value)} onCheckedChange={() => alternar(s.value)} className="mt-0.5" aria-label={s.label} />
                <span>
                  <span className="block text-sm font-semibold text-gray-900">{s.label}</span>
                  <span className="block text-xs text-gray-600">{s.detalle}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <fieldset className="grid grid-cols-2 gap-2">
            <legend className="text-xs font-medium tracking-[0.04em] text-gray-600 mb-2">Formato</legend>
            {[['pdf', 'PDF ejecutivo', FileText], ['csv', 'CSV (Excel)', Sheet]].map(([valor, texto, Icono]) => (
              <button
                key={valor}
                type="button"
                onClick={() => setFormato(valor)}
                aria-pressed={formato === valor}
                className={cn('flex items-center gap-2 px-3 py-3 text-sm', formato === valor ? 'bg-primary-light text-[#002d9c] outline-2 outline-primary' : 'bg-gray-50 text-gray-900 hover:bg-gray-100')}
              >
                <Icono className="h-4 w-4" aria-hidden="true" /> {texto}
              </button>
            ))}
          </fieldset>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <DialogFooter>
            <DialogCancel type="button">Cancelar</DialogCancel>
            <Button type="submit" disabled={!valido || generando} loading={generando}>Generar reporte</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
