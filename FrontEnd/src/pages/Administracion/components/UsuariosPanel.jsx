import { useDeferredValue, useState } from 'react'
import { Search, Download, Pencil, KeyRound, UserCog, Power, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Badge } from '@/components/ui/Badge'
import { DataTable, createTableColumns } from '@/components/ui/Table'
import { PaginacionServidor } from '@/components/ui/PaginacionServidor'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogCancel } from '@/components/ui/Dialog'
import { useAuth } from '@/hooks/useAuth'
import { useUsuarios, useMutacionUsuario } from '@/services/query/useAdministracion'
import { usuarioService } from '@/services/administracionService'
import { cn } from '@/lib/utils'
import { ROLES, rolInfo, iniciales } from './roles'

const TODOS = 'TODOS'
const COLOR_AVATAR = { ADMINISTRADOR: 'bg-gray-900', SUPERVISOR: 'bg-success', OPERADOR: 'bg-primary', REPARTIDOR: 'bg-gray-700' }
const REGLA_CLAVE = 'Mínimo 8 caracteres, con mayúscula, minúscula, número y carácter especial.'

const mensaje = (err, porDefecto) => err?.errors?.[0]?.mensaje || err?.message || porDefecto

function ultimoAcceso(d) {
  if (!d) return 'Nunca'
  const f = new Date(d)
  const hoy = new Date()
  const ayer = new Date(Date.now() - 864e5)
  const hora = f.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })
  if (f.toDateString() === hoy.toDateString()) return `Hoy ${hora}`
  if (f.toDateString() === ayer.toDateString()) return `Ayer ${hora}`
  return f.toLocaleDateString('es-VE')
}

function estadoOperativo(u) {
  if (!u.activo) return { texto: 'Inactivo', clase: 'text-gray-500', punto: 'bg-gray-400' }
  if (u.repartidor?.estado === 'EN_RUTA' || u.repartidor?.despachos?.length) return { texto: 'En ruta', clase: 'text-primary', punto: 'bg-primary' }
  return { texto: 'Activo', clase: 'text-success', punto: 'bg-success' }
}

function ubicacion(u) {
  const d = u.repartidor?.despachos?.[0]
  if (d) return { principal: `Despacho ${d.codigo}`, detalle: [d.ruta?.nombre, d.vehiculo && `${d.vehiculo.codigo}${d.vehiculo.esTermico ? ' · térmico' : ''}`].filter(Boolean).join(' · ') }
  if (u.rol === 'REPARTIDOR') return { principal: 'Disponible en planta', detalle: 'Planta El Murachí' }
  return { principal: u.rol === 'ADMINISTRADOR' ? 'Sede principal' : 'Planta El Murachí', detalle: null }
}

function exportarCsv(usuarios) {
  const celda = (v) => { const s = String(v ?? ''); return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
  const filas = [
    ['Código', 'Nombre', 'Correo', 'Documento', 'Rol', 'Estado', 'Último acceso'],
    ...usuarios.map((u) => [u.codigo, u.nombre, u.email, u.documento, rolInfo(u.rol).nombre, estadoOperativo(u).texto, u.ultimoAcceso ? new Date(u.ultimoAcceso).toLocaleString('es-VE') : 'Nunca']),
  ]
  const blob = new Blob(['﻿' + filas.map((f) => f.map(celda).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `usuarios-logitrace-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

/** Directorio de usuarios: búsqueda, filtro por rol, acciones de administración y exportación. */
export function UsuariosPanel({ onNuevo }) {
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [rol, setRol] = useState(TODOS)
  const [page, setPage] = useState(1)
  const [dialogo, setDialogo] = useState(null) // { tipo: 'editar' | 'rol' | 'clave' | 'estado', usuario }
  const busqueda = useDeferredValue(search)
  const filtros = { search: busqueda.trim(), ...(rol !== TODOS && { rol }) }
  const { data, isLoading, isError } = useUsuarios(filtros, { page, limit: 10 })
  const usuarios = data?.data || []

  const columnas = createTableColumns([
    {
      accessorKey: 'nombre',
      header: 'Colaborador / identificador',
      cell: (v, row) => (
        <div className="flex items-center gap-3 min-w-[14rem]">
          <span className={cn('h-9 w-9 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0', COLOR_AVATAR[row.original.rol], !row.original.activo && 'opacity-40')} aria-hidden="true">
            {iniciales(v)}
          </span>
          <span className="min-w-0">
            <span className={cn('block font-semibold', row.original.activo ? 'text-gray-900' : 'text-gray-500 line-through')}>{v}{row.original.id === user?.id && <span className="ml-1 font-normal text-xs text-gray-500">(tú)</span>}</span>
            <span className="block font-mono text-xs text-gray-600 truncate">{row.original.email}</span>
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'rol',
      header: 'Perfil y asignación',
      cell: (v, row) => (
        <div>
          <Badge variant={rolInfo(v).variante}>{rolInfo(v).nombre}</Badge>
          {row.original.repartidor?.numeroLicencia && <p className="font-mono text-xs text-gray-600 mt-1">Lic. {row.original.repartidor.numeroLicencia}</p>}
        </div>
      ),
    },
    {
      accessorKey: 'id',
      header: 'Ubicación operativa',
      cell: (_, row) => {
        const u = ubicacion(row.original)
        return (
          <div className="min-w-[9rem]">
            <p className="text-sm text-gray-900">{u.principal}</p>
            {u.detalle && <p className="text-xs text-gray-600">{u.detalle}</p>}
          </div>
        )
      },
    },
    {
      accessorKey: 'activo',
      header: 'Estado',
      cell: (_, row) => {
        const e = estadoOperativo(row.original)
        return <span className={cn('inline-flex items-center gap-1.5 text-sm whitespace-nowrap', e.clase)}><span className={cn('h-2 w-2 rounded-full', e.punto)} aria-hidden="true" />{e.texto}</span>
      },
    },
    {
      accessorKey: 'ultimoAcceso',
      header: 'Último acceso',
      cell: (v) => <span className="font-mono text-xs text-gray-700 whitespace-nowrap">{ultimoAcceso(v)}</span>,
    },
    {
      accessorKey: 'codigo',
      header: 'Acciones',
      cell: (_, row) => {
        const u = row.original
        const propio = u.id === user?.id
        const boton = 'h-8 w-8 inline-flex items-center justify-center text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent'
        return (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button type="button" className={boton} title="Editar datos" aria-label={`Editar ${u.nombre}`} onClick={() => setDialogo({ tipo: 'editar', usuario: u })}><Pencil className="h-4 w-4" /></button>
            <button type="button" className={boton} title="Cambiar rol" aria-label={`Cambiar rol de ${u.nombre}`} disabled={propio} onClick={() => setDialogo({ tipo: 'rol', usuario: u })}><UserCog className="h-4 w-4" /></button>
            <button type="button" className={boton} title="Restablecer contraseña" aria-label={`Restablecer contraseña de ${u.nombre}`} onClick={() => setDialogo({ tipo: 'clave', usuario: u })}><KeyRound className="h-4 w-4" /></button>
            <button type="button" className={cn(boton, u.activo ? 'text-danger' : 'text-success')} title={u.activo ? 'Desactivar cuenta' : 'Activar cuenta'} aria-label={`${u.activo ? 'Desactivar' : 'Activar'} ${u.nombre}`} disabled={propio} onClick={() => setDialogo({ tipo: 'estado', usuario: u })}><Power className="h-4 w-4" /></button>
          </div>
        )
      },
    },
  ])

  return (
    <section className="bg-white min-w-0" aria-labelledby="directorio-usuarios">
      <div className="flex flex-wrap items-end justify-between gap-3 p-5">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-primary">Directorio de operaciones</p>
          <h2 id="directorio-usuarios" className="text-base font-semibold text-gray-900">Usuarios del sistema LogiTrace</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 pointer-events-none" aria-hidden="true" />
            <Input aria-label="Buscar usuarios" placeholder="Buscar por nombre, correo o cédula…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-9" />
          </div>
          <Select value={rol} onValueChange={(v) => { setRol(v); setPage(1) }}>
            <SelectTrigger className="w-44" aria-label="Filtrar por rol"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos los perfiles</SelectItem>
              {ROLES.map((r) => <SelectItem key={r.rol} value={r.rol}>{r.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => exportarCsv(usuarios)} disabled={!usuarios.length} aria-label="Exportar usuarios en CSV" title="Exportar CSV">
            <Download className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
      {isError ? (
        <p role="alert" className="bg-danger-light text-[#a2191f] px-4 py-3 text-sm">No se pudieron cargar los usuarios.</p>
      ) : (
        <>
          <DataTable columns={columnas} data={usuarios} loading={isLoading} sortable={false} pagination={false} showPagination={false} emptyMessage="Ningún usuario coincide con la búsqueda." />
          <PaginacionServidor pagination={data?.pagination} onPageChange={setPage} etiqueta="usuarios" />
        </>
      )}
      <p className="px-5 pb-4 text-xs text-gray-600">Autenticación: base de datos local con contraseñas cifradas (bcrypt); cada solicitud valida el estado y el rol vigentes de la cuenta.</p>

      {dialogo?.tipo === 'editar' && <UsuarioDialog usuario={dialogo.usuario} onClose={() => setDialogo(null)} />}
      {dialogo?.tipo === 'rol' && <RolDialog usuario={dialogo.usuario} onClose={() => setDialogo(null)} />}
      {dialogo?.tipo === 'clave' && <ClaveDialog usuario={dialogo.usuario} onClose={() => setDialogo(null)} />}
      {dialogo?.tipo === 'estado' && <EstadoDialog usuario={dialogo.usuario} onClose={() => setDialogo(null)} />}
      {onNuevo?.abierto && <UsuarioDialog onClose={onNuevo.cerrar} />}
    </section>
  )
}

/** Registro (sin usuario) o edición de datos (con usuario). */
function UsuarioDialog({ usuario, onClose }) {
  const editando = !!usuario
  const [form, setForm] = useState({
    nombre: usuario?.nombre || '',
    email: usuario?.email || '',
    documento: usuario?.documento || '',
    rol: usuario?.rol || 'OPERADOR',
    password: '',
    telefono: usuario?.repartidor?.telefono || '',
    numeroLicencia: usuario?.repartidor?.numeroLicencia || '',
  })
  const [error, setError] = useState(null)
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))
  const guardar = useMutacionUsuario((datos) => (editando ? usuarioService.update(usuario.id, datos) : usuarioService.create(datos)))
  const esRepartidor = form.rol === 'REPARTIDOR'

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    const datos = {
      nombre: form.nombre.trim(),
      email: form.email.trim(),
      documento: form.documento.trim(),
      ...(!editando && { rol: form.rol, password: form.password }),
      ...(esRepartidor && { telefono: form.telefono.trim(), numeroLicencia: form.numeroLicencia.trim() }),
    }
    try {
      await guardar.mutateAsync(datos)
      onClose()
    } catch (err) {
      setError(mensaje(err, 'No se pudo guardar el usuario'))
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{editando ? `Editar ${usuario.nombre}` : 'Registrar nuevo usuario'}</DialogTitle>
            <DialogDescription>{editando ? 'El rol y la contraseña se cambian con sus acciones propias.' : 'La cuenta queda activa y podrá iniciar sesión de inmediato.'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="us-nombre">Nombre completo *</Label>
            <Input id="us-nombre" required minLength={2} maxLength={120} value={form.nombre} onChange={(e) => set('nombre')(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="us-email">Correo *</Label>
              <Input id="us-email" type="email" required value={form.email} onChange={(e) => set('email')(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="us-doc">Cédula / RIF</Label>
              <Input id="us-doc" maxLength={30} placeholder="V-12345678" value={form.documento} onChange={(e) => set('documento')(e.target.value)} />
            </div>
          </div>
          {!editando && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="us-rol">Perfil *</Label>
                <Select value={form.rol} onValueChange={set('rol')}>
                  <SelectTrigger id="us-rol"><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLES.map((r) => <SelectItem key={r.rol} value={r.rol}>{r.nombre}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="us-clave">Contraseña inicial *</Label>
                <Input id="us-clave" type="password" required autoComplete="new-password" value={form.password} onChange={(e) => set('password')(e.target.value)} />
              </div>
              <p className="sm:col-span-2 text-xs text-gray-600 -mt-2">{REGLA_CLAVE}</p>
            </div>
          )}
          {esRepartidor && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="us-tel">Teléfono del repartidor</Label>
                <Input id="us-tel" maxLength={30} placeholder="0414-0000000" value={form.telefono} onChange={(e) => set('telefono')(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="us-lic">N° de licencia</Label>
                <Input id="us-lic" maxLength={30} value={form.numeroLicencia} onChange={(e) => set('numeroLicencia')(e.target.value)} />
              </div>
            </div>
          )}
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <DialogFooter>
            <DialogCancel type="button">Cancelar</DialogCancel>
            <Button type="submit" loading={guardar.isPending} disabled={guardar.isPending}>{editando ? 'Guardar cambios' : <><UserPlus className="h-4 w-4" aria-hidden="true" /> Registrar usuario</>}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RolDialog({ usuario, onClose }) {
  const [rol, setRol] = useState(usuario.rol)
  const [error, setError] = useState(null)
  const cambiar = useMutacionUsuario((r) => usuarioService.cambiarRol(usuario.id, r))
  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      await cambiar.mutateAsync(rol)
      onClose()
    } catch (err) {
      setError(mensaje(err, 'No se pudo cambiar el rol'))
    }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Cambiar perfil de {usuario.nombre}</DialogTitle>
            <DialogDescription>El cambio aplica de inmediato, también en las sesiones abiertas de la cuenta.</DialogDescription>
          </DialogHeader>
          <fieldset className="grid gap-2">
            <legend className="sr-only">Perfil</legend>
            {ROLES.map((r) => (
              <label key={r.rol} className={cn('flex items-start gap-3 p-3 cursor-pointer bg-gray-50', rol === r.rol && 'outline-2 outline-primary')}>
                <input type="radio" name="rol" value={r.rol} checked={rol === r.rol} onChange={() => setRol(r.rol)} className="mt-1 accent-[#0f62fe]" />
                <span>
                  <span className="block text-sm font-semibold text-gray-900">{r.nombre} <span className="font-mono text-xs font-normal text-gray-500">Nivel {r.nivel}</span></span>
                  <span className="block text-xs text-gray-600">{r.descripcion}</span>
                </span>
              </label>
            ))}
          </fieldset>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <DialogFooter>
            <DialogCancel type="button">Cancelar</DialogCancel>
            <Button type="submit" disabled={rol === usuario.rol || cambiar.isPending} loading={cambiar.isPending}>Cambiar perfil</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ClaveDialog({ usuario, onClose }) {
  const [clave, setClave] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [error, setError] = useState(null)
  const restablecer = useMutacionUsuario((c) => usuarioService.restablecerPassword(usuario.id, c))
  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (clave !== confirmacion) return setError('Las contraseñas no coinciden')
    try {
      await restablecer.mutateAsync(clave)
      onClose()
    } catch (err) {
      setError(mensaje(err, 'No se pudo restablecer la contraseña'))
    }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Restablecer contraseña</DialogTitle>
            <DialogDescription>Asigne una contraseña nueva a {usuario.nombre} y entréguesela por un canal seguro.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="cl-nueva">Contraseña nueva *</Label>
            <Input id="cl-nueva" type="password" required autoComplete="new-password" value={clave} onChange={(e) => setClave(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cl-conf">Confirmar contraseña *</Label>
            <Input id="cl-conf" type="password" required autoComplete="new-password" value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} />
          </div>
          <p className="text-xs text-gray-600">{REGLA_CLAVE}</p>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <DialogFooter>
            <DialogCancel type="button">Cancelar</DialogCancel>
            <Button type="submit" disabled={!clave || restablecer.isPending} loading={restablecer.isPending}>Restablecer</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EstadoDialog({ usuario, onClose }) {
  const [error, setError] = useState(null)
  const cambiar = useMutacionUsuario(() => usuarioService.cambiarEstado(usuario.id, !usuario.activo))
  const confirmar = async () => {
    setError(null)
    try {
      await cambiar.mutateAsync()
      onClose()
    } catch (err) {
      setError(mensaje(err, 'No se pudo cambiar el estado'))
    }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{usuario.activo ? 'Desactivar' : 'Activar'} la cuenta de {usuario.nombre}</DialogTitle>
          <DialogDescription>
            {usuario.activo
              ? 'La cuenta no podrá iniciar sesión y sus sesiones abiertas dejarán de funcionar de inmediato. Su historial se conserva.'
              : 'La cuenta podrá volver a iniciar sesión con su contraseña actual.'}
          </DialogDescription>
        </DialogHeader>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <DialogFooter>
          <DialogCancel type="button">Cancelar</DialogCancel>
          <Button type="button" variant={usuario.activo ? 'danger' : 'primary'} onClick={confirmar} loading={cambiar.isPending} disabled={cambiar.isPending}>
            {usuario.activo ? 'Desactivar cuenta' : 'Activar cuenta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
