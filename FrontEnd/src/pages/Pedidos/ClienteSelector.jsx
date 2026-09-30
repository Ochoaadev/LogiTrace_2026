import { useDeferredValue, useId, useState } from 'react'
import { useMutation, useQueryClient, keepPreviousData, useQuery } from '@tanstack/react-query'
import { Search, UserPlus, X, IdCard, Phone } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogCancel } from '@/components/ui/Dialog'
import { catalogoService, clienteService } from '@/services/catalogoService'
import { usePermissions } from '@/hooks/usePermissions'
import { cn } from '@/lib/utils'

const TIPOS_DOCUMENTO = [
  { value: 'V', label: 'V · Venezolano' },
  { value: 'E', label: 'E · Extranjero' },
  { value: 'J', label: 'J · Persona jurídica (RIF)' },
  { value: 'G', label: 'G · Gobierno' },
  { value: 'P', label: 'P · Pasaporte' },
]
const mensaje = (err, porDefecto) => err?.errors?.map((e) => e.mensaje).join(' · ') || err?.message || porDefecto
// Lo escrito en el buscador parece un documento (cédula o RIF) y no un nombre
const pareceDocumento = (t) => /^[VEJGP]?[-\s.]*\d[\d.\s-]*$/i.test(t.trim())

/**
 * Búsqueda de cliente por nombre, código o cédula/RIF (con o sin puntos). Si no existe, permite
 * registrarlo sin salir del pedido. Antes era una lista fija de los primeros 100 clientes.
 */
export function ClienteSelector({ cliente, onElegir }) {
  const { can } = usePermissions()
  const idLista = useId()
  const [texto, setTexto] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [activo, setActivo] = useState(0)
  const [registrar, setRegistrar] = useState(false)
  const busqueda = useDeferredValue(texto.trim())

  const { data, isFetching, isPlaceholderData } = useQuery({
    queryKey: ['catalogos', 'clientes', { activo: 'true', search: busqueda }, 'selector'],
    queryFn: () => catalogoService.getClientes({ activo: 'true', search: busqueda || undefined, page: 1, limit: 8 }),
    enabled: abierto,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
  const resultados = data?.data || []
  // Mientras llega la búsqueda nueva se ven los resultados anteriores: no se pueden elegir
  const vigentes = !isPlaceholderData && busqueda === texto.trim()

  const elegir = (c) => {
    onElegir(c)
    setTexto('')
    setAbierto(false)
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setAbierto(true); setActivo((i) => Math.min(i + 1, resultados.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActivo((i) => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && abierto) { e.preventDefault(); if (vigentes && resultados[activo]) elegir(resultados[activo]) }
    else if (e.key === 'Escape') setAbierto(false)
  }

  if (cliente) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 bg-primary-light px-4 py-3">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate">{cliente.razonSocial}</p>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-700">
            <span className="font-mono">{cliente.codigo}</span>
            {cliente.numeroDocumento && <span className="inline-flex items-center gap-1"><IdCard className="h-3.5 w-3.5" aria-hidden="true" />{cliente.numeroDocumento}</span>}
            {cliente.telefono && <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" aria-hidden="true" />{cliente.telefono}</span>}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => onElegir(null)}>
          <X className="h-4 w-4" aria-hidden="true" /> Cambiar cliente
        </Button>
      </div>
    )
  }

  return (
    <div className="grid gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gray-500" aria-hidden="true" />
        <Input
          id="np-cliente"
          role="combobox"
          aria-expanded={abierto}
          aria-controls={idLista}
          aria-autocomplete="list"
          aria-activedescendant={abierto && resultados[activo] ? `${idLista}-${activo}` : undefined}
          autoComplete="off"
          className="pl-9"
          placeholder="Nombre, código o cédula / RIF…"
          value={texto}
          onChange={(e) => { setTexto(e.target.value); setAbierto(true); setActivo(0) }}
          onFocus={() => setAbierto(true)}
          onBlur={() => setTimeout(() => setAbierto(false), 150)}
          onKeyDown={onKeyDown}
        />
        {abierto && (
          <ul id={idLista} role="listbox" aria-busy={!vigentes} className="absolute left-0 right-0 top-full z-20 max-h-72 overflow-y-auto border border-gray-200 bg-white shadow-level2">
            {resultados.map((c, i) => (
              <li
                key={c.id}
                id={`${idLista}-${i}`}
                role="option"
                aria-selected={i === activo}
                onMouseDown={(e) => { e.preventDefault(); if (vigentes) elegir(c) }}
                onMouseEnter={() => setActivo(i)}
                className={cn('cursor-pointer px-3 py-2', i === activo && 'bg-gray-50', !vigentes && 'opacity-50')}
              >
                <span className="block text-sm text-gray-900">{c.razonSocial}</span>
                <span className="block font-mono text-xs text-gray-600">{[c.codigo, c.numeroDocumento].filter(Boolean).join(' · ')}</span>
              </li>
            ))}
            {!resultados.length && (
              <li className="px-3 py-3 text-sm text-gray-600">{isFetching ? 'Buscando…' : busqueda ? 'Ningún cliente coincide.' : 'No hay clientes activos.'}</li>
            )}
            {/* La lista tapa el botón de abajo mientras está abierta: la misma acción va al final */}
            {can('clientes.create') && busqueda && vigentes && (
              <li
                role="option"
                aria-selected={false}
                onMouseDown={(e) => { e.preventDefault(); setAbierto(false); setRegistrar(true) }}
                className="flex cursor-pointer items-center gap-2 border-t border-gray-100 px-3 py-2 text-sm text-primary hover:bg-gray-50"
              >
                <UserPlus className="h-4 w-4 flex-shrink-0" aria-hidden="true" /> Registrar «{busqueda}» como cliente nuevo
              </li>
            )}
          </ul>
        )}
      </div>
      {can('clientes.create') && (
        <div>
          <Button type="button" variant="ghost" size="sm" onClick={() => setRegistrar(true)}>
            <UserPlus className="h-4 w-4" aria-hidden="true" /> ¿No aparece? Registrar cliente nuevo
          </Button>
        </div>
      )}
      {registrar && (
        <RegistroClienteDialog
          inicial={texto}
          onClose={() => setRegistrar(false)}
          onRegistrado={(c) => { setRegistrar(false); elegir(c) }}
        />
      )}
    </div>
  )
}

/** Alta rápida de cliente: documento, nombre y teléfono. El código lo asigna el sistema. */
function RegistroClienteDialog({ inicial, onClose, onRegistrado }) {
  const queryClient = useQueryClient()
  const esDoc = pareceDocumento(inicial)
  const letra = esDoc && /^[VEJGP]/i.test(inicial.trim()) ? inicial.trim()[0].toUpperCase() : 'V'
  const [form, setForm] = useState({
    tipoDocumento: letra,
    numeroDocumento: esDoc ? inicial.trim().replace(/^[VEJGP][-\s]*/i, '') : '',
    razonSocial: esDoc ? '' : inicial.trim(),
    telefono: '',
    email: '',
  })
  const [error, setError] = useState(null)
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))
  const crear = useMutation({ mutationFn: (datos) => clienteService.create(datos) })
  const juridico = form.tipoDocumento === 'J' || form.tipoDocumento === 'G'
  const valido = form.numeroDocumento.trim() && form.razonSocial.trim()

  const onSubmit = async (e) => {
    e.preventDefault()
    e.stopPropagation() // el diálogo vive dentro del formulario del pedido
    setError(null)
    try {
      const { data } = await crear.mutateAsync({
        tipoDocumento: form.tipoDocumento,
        numeroDocumento: form.numeroDocumento.trim(),
        razonSocial: form.razonSocial.trim(),
        ...(form.telefono.trim() && { telefono: form.telefono.trim() }),
        ...(form.email.trim() && { email: form.email.trim() }),
      })
      queryClient.invalidateQueries({ queryKey: ['catalogos', 'clientes'] })
      onRegistrado(data)
    } catch (err) {
      setError(mensaje(err, 'No se pudo registrar el cliente'))
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Registrar cliente nuevo</DialogTitle>
            <DialogDescription>Queda seleccionado en el pedido. El código se asigna automáticamente.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-[11rem_minmax(0,1fr)] gap-4 sm:gap-2">
            <div className="grid gap-2">
              <Label htmlFor="rc-tipo">Documento *</Label>
              <Select value={form.tipoDocumento} onValueChange={set('tipoDocumento')}>
                <SelectTrigger id="rc-tipo"><SelectValue /></SelectTrigger>
                <SelectContent>{TIPOS_DOCUMENTO.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rc-num">{juridico ? 'RIF' : form.tipoDocumento === 'P' ? 'N° de pasaporte' : 'Cédula'}</Label>
              <Input id="rc-num" autoFocus={!form.numeroDocumento} maxLength={30} inputMode={form.tipoDocumento === 'P' ? 'text' : 'numeric'} className="font-mono"
                placeholder={juridico ? '12345678-9' : form.tipoDocumento === 'P' ? 'AB123456' : '12345678'}
                value={form.numeroDocumento} onChange={(e) => set('numeroDocumento')(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="rc-nombre">{juridico ? 'Razón social *' : 'Nombre y apellido *'}</Label>
            <Input id="rc-nombre" autoFocus={!!form.numeroDocumento} maxLength={150} value={form.razonSocial} onChange={(e) => set('razonSocial')(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="rc-tel">Teléfono</Label>
              <Input id="rc-tel" maxLength={30} inputMode="tel" placeholder="0414-0000000" value={form.telefono} onChange={(e) => set('telefono')(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rc-email">Correo</Label>
              <Input id="rc-email" type="email" maxLength={120} value={form.email} onChange={(e) => set('email')(e.target.value)} />
            </div>
          </div>
          {error && <p role="alert" className="bg-danger-light px-3 py-2 text-sm text-[#a2191f]">{error}</p>}
          <DialogFooter>
            <DialogCancel type="button">Cancelar</DialogCancel>
            <Button type="submit" loading={crear.isPending} disabled={!valido || crear.isPending}>Registrar y usar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
