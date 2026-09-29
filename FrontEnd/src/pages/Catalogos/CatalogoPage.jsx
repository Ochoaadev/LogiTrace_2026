import { useDeferredValue, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Plus, Search, Pencil, Ban, RotateCcw, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Pestana, Pestanas } from '@/components/layout/ModuloUI'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { Checkbox } from '@/components/ui/Checkbox'
import { Badge } from '@/components/ui/Badge'
import { DataTable, createTableColumns } from '@/components/ui/Table'
import { PaginacionServidor } from '@/components/ui/PaginacionServidor'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogCancel } from '@/components/ui/Dialog'
import { usePermissions } from '@/hooks/usePermissions'
import { cn } from '@/lib/utils'
import { CATALOGOS, ORDEN_CATALOGOS } from './catalogos'

const ESTADOS = [
  { value: 'TODOS', label: 'Todos' },
  { value: 'true', label: 'Activos' },
  { value: 'false', label: 'Inactivos' },
]
const mensaje = (err, porDefecto) => err?.errors?.map((e) => e.mensaje).join(' · ') || err?.message || porDefecto

/**
 * Pantalla genérica de catálogo maestro (módulo 10): búsqueda, filtro por estado, tabla paginada,
 * alta, edición, activación/desactivación y eliminación. Los campos salen de catalogos.js.
 */
export default function CatalogoPage({ clave }) {
  const cat = CATALOGOS[clave]
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { can } = usePermissions()
  const [search, setSearch] = useState('')
  const [estado, setEstado] = useState('TODOS')
  const [page, setPage] = useState(1)
  const [dialogo, setDialogo] = useState(null) // { tipo: 'form', registro? } | { tipo: 'eliminar', registro }
  const [aviso, setAviso] = useState(null)
  const busqueda = useDeferredValue(search)

  const filtros = { search: busqueda.trim(), ...(estado !== 'TODOS' && { activo: estado }) }
  const { data, isLoading, isError } = useQuery({
    queryKey: ['catalogos', cat.ruta, filtros, page],
    queryFn: () => cat.servicio.getAll({ ...filtros, page, limit: 10 }),
    placeholderData: keepPreviousData,
  })
  const registros = data?.data || []

  // Los catálogos alimentan formularios de otros módulos
  const invalidar = () => {
    for (const k of ['catalogos', 'administracion', 'pedidos', 'despachos', 'incidencias', 'devoluciones', 'residuos']) queryClient.invalidateQueries({ queryKey: [k] })
  }
  const alternar = useMutation({ mutationFn: (r) => cat.servicio.update(r.id, { activo: !r.activo }), onSuccess: invalidar })

  const cambiarEstado = async (r) => {
    setAviso(null)
    try {
      await alternar.mutateAsync(r)
      setAviso({ tipo: 'ok', texto: `${r.nombre || r.razonSocial || r.codigo} ${r.activo ? 'desactivado' : 'reactivado'}.` })
    } catch (err) {
      setAviso({ tipo: 'error', texto: mensaje(err, 'No se pudo cambiar el estado') })
    }
  }

  const columnas = createTableColumns([
    { accessorKey: 'codigo', header: 'Código', cell: (v) => <span className="font-mono text-sm font-semibold text-primary whitespace-nowrap">{v}</span> },
    ...cat.columnas.map((c, i) => ({
      id: `col-${i}`,
      accessorKey: 'id',
      header: c.header,
      cell: (_, row) => (
        <div className="min-w-[8rem] max-w-[22rem]">
          <p className={cn('text-gray-900', c.mono && 'font-mono text-sm', i === 0 && 'font-semibold')}>{c.valor(row.original)}</p>
          {c.detalle?.(row.original) && <p className="text-xs text-gray-600 truncate" title={c.detalle(row.original)}>{c.detalle(row.original)}</p>}
        </div>
      ),
    })),
    { accessorKey: 'activo', header: 'Estado', cell: (v) => <Badge variant={v ? 'success' : 'default'}>{v ? 'Activo' : 'Inactivo'}</Badge> },
    {
      id: 'acciones',
      accessorKey: 'id',
      header: 'Acciones',
      cell: (_, row) => {
        const r = row.original
        const boton = 'h-8 w-8 inline-flex items-center justify-center hover:bg-gray-100 disabled:opacity-30'
        return (
          <div className="flex items-center gap-1">
            {can('catalogos.edit') && (
              <>
                <button type="button" className={cn(boton, 'text-gray-700')} title="Editar" aria-label={`Editar ${r.codigo}`} onClick={() => setDialogo({ tipo: 'form', registro: r })}><Pencil className="h-4 w-4" /></button>
                <button type="button" className={cn(boton, r.activo ? 'text-[#8a3800]' : 'text-success')} title={r.activo ? 'Desactivar' : 'Reactivar'} aria-label={`${r.activo ? 'Desactivar' : 'Reactivar'} ${r.codigo}`} disabled={alternar.isPending} onClick={() => cambiarEstado(r)}>
                  {r.activo ? <Ban className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
                </button>
              </>
            )}
            {can('catalogos.delete') && (
              <button type="button" className={cn(boton, 'text-danger')} title="Eliminar" aria-label={`Eliminar ${r.codigo}`} onClick={() => setDialogo({ tipo: 'eliminar', registro: r })}><Trash2 className="h-4 w-4" /></button>
            )}
          </div>
        )
      },
    },
  ])

  const Icono = cat.icon
  return (
    <div>
      <PageHeader
        modulo="10"
        seccion="Catálogos maestros"
        title={cat.titulo}
        description={cat.descripcion}
        actions={can('catalogos.create') && (
          <Button size="lg" onClick={() => setDialogo({ tipo: 'form' })}>
            <Plus className="h-5 w-5" aria-hidden="true" /> Nuevo {cat.singular}
          </Button>
        )}
      >
        <Pestanas etiqueta="Catálogos maestros">
          {ORDEN_CATALOGOS.map((k) => (
            <Pestana key={k} activa={k === clave} onClick={() => navigate(`/catalogos/${CATALOGOS[k].ruta}`)} icon={CATALOGOS[k].icon}>
              {CATALOGOS[k].titulo}
            </Pestana>
          ))}
        </Pestanas>
      </PageHeader>

      {aviso && (
        <p role={aviso.tipo === 'error' ? 'alert' : 'status'} className={cn('mb-4 px-4 py-3 text-sm', aviso.tipo === 'error' ? 'bg-danger-light text-[#a2191f]' : 'bg-success-light text-[#044317]')}>
          {aviso.texto}
        </p>
      )}

      <section className="bg-white" aria-labelledby="titulo-catalogo">
        <div className="flex flex-wrap items-end justify-between gap-3 p-4 sm:p-5">
          <h2 id="titulo-catalogo" className="flex items-center gap-2 label-caps text-gray-900">
            <Icono className="h-5 w-5 text-primary" aria-hidden="true" />
            Registros ({data?.pagination?.total ?? '…'})
          </h2>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <div className="relative flex-1 min-w-0 sm:flex-none sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 pointer-events-none" aria-hidden="true" />
              <Input aria-label={`Buscar ${cat.titulo.toLowerCase()}`} placeholder="Buscar por código o nombre…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-9" />
            </div>
            <Select value={estado} onValueChange={(v) => { setEstado(v); setPage(1) }}>
              <SelectTrigger className="w-36" aria-label="Filtrar por estado"><SelectValue /></SelectTrigger>
              <SelectContent>{ESTADOS.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        {isError ? (
          <p role="alert" className="bg-danger-light text-[#a2191f] px-4 py-3 text-sm">No se pudo cargar el catálogo.</p>
        ) : (
          <>
            <DataTable columns={columnas} data={registros} loading={isLoading} sortable={false} pagination={false} showPagination={false} emptyMessage={search || estado !== 'TODOS' ? 'Ningún registro coincide con el filtro.' : 'El catálogo no tiene registros.'} />
            <PaginacionServidor pagination={data?.pagination} onPageChange={setPage} etiqueta="registros" />
          </>
        )}
      </section>

      {dialogo?.tipo === 'form' && (
        <FormularioDialog cat={cat} registro={dialogo.registro} onClose={() => setDialogo(null)} onGuardado={(t) => { invalidar(); setAviso({ tipo: 'ok', texto: t }) }} />
      )}
      {dialogo?.tipo === 'eliminar' && (
        <EliminarDialog cat={cat} registro={dialogo.registro} onClose={() => setDialogo(null)} onEliminado={(t) => { invalidar(); setAviso({ tipo: 'ok', texto: t }) }} />
      )}
    </div>
  )
}

function valorInicial(campo, registro) {
  const v = registro?.[campo.name]
  if (campo.type === 'check') return v ?? campo.predeterminado ?? false
  if (v === null || v === undefined) return campo.predeterminado ?? ''
  return campo.type === 'number' ? String(Number(v)) : String(v)
}

function FormularioDialog({ cat, registro, onClose, onGuardado }) {
  const editando = !!registro
  const campos = cat.campos.filter((c) => !(editando && c.soloAlCrear))
  const [valores, setValores] = useState(() => Object.fromEntries(cat.campos.map((c) => [c.name, valorInicial(c, registro)])))
  const [error, setError] = useState(null)
  const guardar = useMutation({ mutationFn: (datos) => (editando ? cat.servicio.update(registro.id, datos) : cat.servicio.create(datos)) })
  const set = (k) => (v) => setValores((x) => ({ ...x, [k]: v }))

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    const datos = {}
    for (const c of campos) {
      const v = valores[c.name]
      if (c.type === 'check') datos[c.name] = !!v
      else if (c.type === 'number') { if (v !== '') datos[c.name] = Number(v) }
      else if (c.soloAlCrear) datos[c.name] = String(v).trim().toUpperCase()
      else if (String(v).trim() || editando) datos[c.name] = String(v).trim()
    }
    try {
      await guardar.mutateAsync(datos)
      onGuardado(editando ? `${registro.codigo} actualizado.` : `${datos.codigo} registrado.`)
      onClose()
    } catch (err) {
      setError(mensaje(err, 'No se pudo guardar'))
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{editando ? `Editar ${registro.codigo}` : `Nuevo ${cat.singular}`}</DialogTitle>
            <DialogDescription>{cat.titulo} · los campos con * son obligatorios.</DialogDescription>
          </DialogHeader>
          {campos.map((c) => {
            const id = `cat-${c.name}`
            if (c.type === 'check') {
              return (
                <label key={c.name} htmlFor={id} className="flex items-start gap-3 bg-gray-50 p-3 cursor-pointer text-sm text-gray-900">
                  <Checkbox id={id} checked={!!valores[c.name]} onCheckedChange={(v) => set(c.name)(v === true)} className="mt-0.5" />
                  {c.label}
                </label>
              )
            }
            return (
              <div key={c.name} className="grid gap-2">
                <Label htmlFor={id}>{c.label}{c.required ? ' *' : ''}</Label>
                {c.type === 'textarea' ? (
                  <Textarea id={id} rows={2} maxLength={c.max || 500} value={valores[c.name]} onChange={(e) => set(c.name)(e.target.value)} />
                ) : c.type === 'select' ? (
                  <Select value={valores[c.name]} onValueChange={set(c.name)}>
                    <SelectTrigger id={id}><SelectValue placeholder="Seleccione…" /></SelectTrigger>
                    <SelectContent>{c.options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={id}
                    type={c.type === 'number' ? 'number' : c.type === 'email' ? 'email' : 'text'}
                    step={c.type === 'number' ? '0.01' : undefined}
                    min={c.type === 'number' ? '0' : undefined}
                    required={c.required}
                    maxLength={c.max}
                    placeholder={c.placeholder}
                    value={valores[c.name]}
                    onChange={(e) => set(c.name)(e.target.value)}
                    className={cn(c.soloAlCrear && 'font-mono uppercase')}
                  />
                )}
                {c.ayuda && <p className="text-xs text-gray-600">{c.ayuda}</p>}
              </div>
            )
          })}
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <DialogFooter>
            <DialogCancel type="button">Cancelar</DialogCancel>
            <Button type="submit" loading={guardar.isPending} disabled={guardar.isPending || campos.some((c) => c.required && !String(valores[c.name]).trim())}>
              {editando ? 'Guardar cambios' : 'Registrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EliminarDialog({ cat, registro, onClose, onEliminado }) {
  const [error, setError] = useState(null)
  const eliminar = useMutation({ mutationFn: () => cat.servicio.delete(registro.id) })
  const confirmar = async () => {
    setError(null)
    try {
      await eliminar.mutateAsync()
      onEliminado(`${registro.codigo} eliminado.`)
      onClose()
    } catch (err) {
      setError(mensaje(err, 'No se pudo eliminar'))
    }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar {registro.codigo}</DialogTitle>
          <DialogDescription>
            Solo se puede eliminar un registro que no se haya usado nunca. Si ya tiene movimientos, desactívelo: dejará de ofrecerse sin perder el historial.
          </DialogDescription>
        </DialogHeader>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <DialogFooter>
          <DialogCancel type="button">Cancelar</DialogCancel>
          <Button type="button" variant="danger" onClick={confirmar} loading={eliminar.isPending} disabled={eliminar.isPending}>Eliminar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
