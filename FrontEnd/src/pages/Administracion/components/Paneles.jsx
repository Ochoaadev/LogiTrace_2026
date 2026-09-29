import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck, ShieldUser, Truck, Bike, CircleCheck, Plus, Pencil, RotateCcw, Ban, Settings2, Info, ScrollText, Check, Minus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Badge } from '@/components/ui/Badge'
import { PaginacionServidor } from '@/components/ui/PaginacionServidor'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogCancel } from '@/components/ui/Dialog'
import { usePermissions } from '@/hooks/usePermissions'
import { useCatalogoNegocio, useMutacionCatalogo, useAuditoria } from '@/services/query/useAdministracion'
import { CATALOGOS_NEGOCIO, catalogoNegocioService } from '@/services/administracionService'
import { cn } from '@/lib/utils'
import { ROLES, MODULOS, accionesDe, modulosHabilitados } from './roles'

const ICONO_ROL = { ADMINISTRADOR: ShieldUser, SUPERVISOR: ShieldCheck, OPERADOR: Truck, REPARTIDOR: Bike }
const mensaje = (err, porDefecto) => err?.errors?.[0]?.mensaje || err?.message || porDefecto
const fechaHora = (d) => new Date(d).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' })

function Encabezado({ antetitulo, titulo, extra, tono = 'text-primary' }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
      <div>
        <p className={cn('font-mono text-xs uppercase tracking-wider', tono)}>{antetitulo}</p>
        <h2 className="text-base font-semibold text-gray-900">{titulo}</h2>
      </div>
      {extra}
    </div>
  )
}

// ------------------------------------------------------------------ Roles

/** Tarjetas de los 4 perfiles con su nivel, cuentas activas y módulos habilitados. */
export function RolesResumen({ porRol = [] }) {
  return (
    <section className="bg-white p-6" aria-labelledby="roles-sistema">
      <Encabezado antetitulo="Matriz de acceso" titulo={<span id="roles-sistema">Roles del sistema (RBAC simple)</span>} />
      <p className="text-xs text-gray-600 -mt-2 mb-4">4 perfiles diseñados según el organigrama operativo de SuperTequeños C.A.</p>
      <ul className="space-y-3">
        {ROLES.map((r) => {
          const Icono = ICONO_ROL[r.rol]
          const cuentas = porRol.find((c) => c.rol === r.rol)
          const modulos = modulosHabilitados(r.rol)
          return (
            <li key={r.rol} className="border border-gray-100 p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="flex items-center gap-2 text-sm font-semibold text-gray-900"><Icono className="h-4 w-4 text-primary" aria-hidden="true" />{r.nombre}</p>
                <span className="font-mono text-[11px] bg-gray-50 px-1.5 py-0.5 whitespace-nowrap">NIVEL {r.nivel}</span>
              </div>
              <p className="text-sm text-gray-700 mt-2">{r.descripcion}</p>
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-success">
                <span className="flex items-center gap-1"><CircleCheck className="h-3.5 w-3.5" aria-hidden="true" />{modulos.length} módulos habilitados</span>
                {cuentas && <span className="text-gray-600">{cuentas.activos} cuenta(s) activa(s) de {cuentas.total}</span>}
              </p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** Matriz completa módulo × perfil, generada del mapa de permisos que aplica la interfaz. */
export function MatrizPermisos() {
  return (
    <section className="bg-white p-6" aria-labelledby="matriz-permisos">
      <Encabezado antetitulo="Control de acceso basado en roles" titulo={<span id="matriz-permisos">Matriz de permisos por módulo</span>} />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th scope="col" className="px-3 py-3 label-caps">Módulo</th>
              {ROLES.map((r) => <th key={r.rol} scope="col" className="px-3 py-3 label-caps">{r.nombre}</th>)}
            </tr>
          </thead>
          <tbody>
            {MODULOS.map((m) => (
              <tr key={m.prefijo} className="border-b border-gray-100 align-top">
                <th scope="row" className="px-3 py-3 text-left font-normal">
                  <span className="font-mono text-xs text-gray-500 mr-2">{m.n}</span>
                  <span className="text-gray-900">{m.nombre}</span>
                </th>
                {ROLES.map((r) => {
                  const acciones = accionesDe(r.rol, m.prefijo)
                  return (
                    <td key={r.rol} className="px-3 py-3">
                      {acciones.length ? (
                        <span className="flex flex-wrap gap-1">
                          {acciones.map((a) => <span key={a} className="inline-flex items-center gap-1 bg-success-light text-[#044317] px-1.5 py-0.5 text-xs"><Check className="h-3 w-3" aria-hidden="true" />{a}</span>)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500"><Minus className="h-3 w-3" aria-hidden="true" />Sin acceso</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-gray-600">El backend valida el rol vigente de la cuenta en cada solicitud; esta matriz refleja las acciones que la interfaz habilita a cada perfil.</p>
    </section>
  )
}

// ------------------------------------------------------------------ Catálogos

/** Catálogos del negocio: selección CAT-01…04, alta, edición y activación/desactivación. */
export function CatalogosNegocio({ resumenCatalogos = [] }) {
  const { can } = usePermissions()
  const [clave, setClave] = useState(CATALOGOS_NEGOCIO[0].clave)
  const [dialogo, setDialogo] = useState(null) // { registro } o { nuevo: true }
  const [error, setError] = useState(null)
  const catalogo = CATALOGOS_NEGOCIO.find((c) => c.clave === clave)
  const { data: registros, isLoading } = useCatalogoNegocio(catalogo.ruta)
  const alternar = useMutacionCatalogo((r) => catalogoNegocioService.update(catalogo.ruta, r.id, { activo: !r.activo }))
  const puedeEditar = can('catalogos.edit')

  const cambiarEstado = async (r) => {
    setError(null)
    try {
      await alternar.mutateAsync(r)
    } catch (err) {
      setError(mensaje(err, 'No se pudo cambiar el estado'))
    }
  }

  return (
    <section className="bg-white p-6" aria-labelledby="catalogos-negocio">
      <Encabezado
        antetitulo="Normalización operativa"
        titulo={<span id="catalogos-negocio">Catálogos operativos configurables</span>}
        extra={can('catalogos.create') && <Button variant="secondary" onClick={() => setDialogo({ nuevo: true })}><Plus className="h-4 w-4" aria-hidden="true" /> Nuevo elemento</Button>}
      />
      <p className="label-caps text-gray-600 mb-2">Seleccionar catálogo a modificar</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-5" role="group" aria-label="Catálogos">
        {CATALOGOS_NEGOCIO.map((c) => {
          const r = resumenCatalogos.find((x) => x.clave === c.clave)
          return (
            <button
              key={c.clave}
              type="button"
              onClick={() => { setClave(c.clave); setError(null) }}
              aria-pressed={clave === c.clave}
              className={cn('text-left p-3 border-l-4', clave === c.clave ? 'bg-primary-light border-primary' : 'bg-gray-50 border-transparent hover:bg-gray-100')}
            >
              <span className="block font-mono text-[11px] text-gray-600">{c.codigo}</span>
              <span className={cn('block text-sm', clave === c.clave ? 'font-semibold text-gray-900' : 'text-gray-700')}>{c.nombre}</span>
              {r && <span className="block font-mono text-[11px] text-gray-500 mt-1">{r.activos}/{r.total} activos</span>}
            </button>
          )
        })}
      </div>

      <p className="label-caps text-gray-900 mb-2">Registros: {catalogo.nombre}</p>
      {error && <p role="alert" className="mb-2 text-sm text-danger">{error}</p>}
      {isLoading ? (
        <div className="h-40 bg-gray-50 animate-pulse" />
      ) : !registros?.length ? (
        <p className="bg-gray-50 p-4 text-sm text-gray-600">El catálogo no tiene registros.</p>
      ) : (
        <ul className="space-y-2">
          {registros.map((r, i) => (
            <li key={r.id} className={cn('flex items-center gap-3 bg-gray-50 px-4 py-3', !r.activo && 'opacity-70')}>
              <span className="font-mono text-xs bg-white px-1.5 py-0.5 text-gray-600">{String(i + 1).padStart(2, '0')}</span>
              <span className="flex-1 min-w-0">
                <span className={cn('block text-sm font-semibold text-gray-900', !r.activo && 'line-through text-gray-500')}>{r.nombre} <span className="font-mono text-xs font-normal text-gray-500 no-underline">{r.codigo}</span></span>
                {r[catalogo.extra.campo] && <span className="block text-xs text-gray-600 truncate">{r[catalogo.extra.campo]}</span>}
              </span>
              <Badge variant={r.activo ? 'success' : 'default'} size="sm">{r.activo ? 'ACTIVO' : 'INACTIVO'}</Badge>
              {puedeEditar && (
                <>
                  <button type="button" className="h-8 w-8 inline-flex items-center justify-center text-primary hover:bg-white" aria-label={`Editar ${r.nombre}`} title="Editar" onClick={() => setDialogo({ registro: r })}><Pencil className="h-4 w-4" /></button>
                  <button type="button" className={cn('h-8 w-8 inline-flex items-center justify-center hover:bg-white', r.activo ? 'text-danger' : 'text-success')} aria-label={`${r.activo ? 'Desactivar' : 'Reactivar'} ${r.nombre}`} title={r.activo ? 'Desactivar' : 'Reactivar'} disabled={alternar.isPending} onClick={() => cambiarEstado(r)}>
                    {r.activo ? <Ban className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs text-gray-600">
        Un elemento inactivo deja de ofrecerse en los formularios, pero se conserva en los registros históricos. Otros catálogos maestros:{' '}
        {[['Productos', '/catalogos/productos'], ['Clientes', '/catalogos/clientes'], ['Vehículos', '/catalogos/vehiculos'], ['Gestores de residuo', '/catalogos/gestores-residuo']].map(([t, to], i) => (
          <span key={to}>{i > 0 && ' · '}<Link to={to} className="text-primary hover:underline">{t}</Link></span>
        ))}
      </p>

      {dialogo && <ElementoDialog catalogo={catalogo} registro={dialogo.registro} onClose={() => setDialogo(null)} />}
    </section>
  )
}

function ElementoDialog({ catalogo, registro, onClose }) {
  const editando = !!registro
  const campo = catalogo.extra.campo
  const [form, setForm] = useState({ codigo: registro?.codigo || '', nombre: registro?.nombre || '', extra: registro?.[campo] || '' })
  const [error, setError] = useState(null)
  const guardar = useMutacionCatalogo((datos) => (editando ? catalogoNegocioService.update(catalogo.ruta, registro.id, datos) : catalogoNegocioService.create(catalogo.ruta, datos)))

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    const datos = { nombre: form.nombre.trim(), [campo]: form.extra.trim() || undefined, ...(!editando && { codigo: form.codigo.trim().toUpperCase() }) }
    try {
      await guardar.mutateAsync(datos)
      onClose()
    } catch (err) {
      setError(mensaje(err, 'No se pudo guardar el elemento'))
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{editando ? `Editar ${registro.codigo}` : 'Nuevo elemento'}</DialogTitle>
            <DialogDescription>{catalogo.codigo} · {catalogo.nombre}</DialogDescription>
          </DialogHeader>
          {!editando && (
            <div className="grid gap-2">
              <Label htmlFor="el-codigo">Código *</Label>
              <Input id="el-codigo" required maxLength={20} placeholder="Ej: INC-008" value={form.codigo} onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))} className="font-mono uppercase" />
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="el-nombre">Nombre *</Label>
            <Input id="el-nombre" required maxLength={100} value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="el-extra">{catalogo.extra.etiqueta}{catalogo.extra.requerido ? ' *' : ''}</Label>
            <Input id="el-extra" required={catalogo.extra.requerido} maxLength={catalogo.extra.campo === 'unidadBase' ? 20 : 255} value={form.extra} onChange={(e) => setForm((f) => ({ ...f, extra: e.target.value }))} />
          </div>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <DialogFooter>
            <DialogCancel type="button">Cancelar</DialogCancel>
            <Button type="submit" loading={guardar.isPending} disabled={guardar.isPending}>{editando ? 'Guardar cambios' : 'Crear elemento'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ------------------------------------------------------------------ Parámetros

/** Parámetros locales de la planta: valores vigentes y la variable del servidor que los define. */
export function ParametrosPlanta({ parametros, detallado = false }) {
  if (!parametros) return <div className="h-64 bg-white animate-pulse" />
  const filas = [
    { etiqueta: 'Eje operativo', valor: parametros.ejeOperativo, variable: 'EJE_OPERATIVO', nota: <span className="text-success text-xs">Activo</span> },
    { etiqueta: 'Temperatura objetivo en cava', valor: `${parametros.temperaturaObjetivoCavaC.toFixed(1)} °C`, variable: 'TEMP_OBJETIVO_CAVA_C', mono: true, tono: 'text-primary', nota: <Badge variant="success" size="sm">ESTÁNDAR</Badge> },
    { etiqueta: 'Límite térmico crítico de retorno', valor: `${parametros.limiteCriticoC.toFixed(1)} °C`, variable: 'TEMP_LIMITE_CRITICO_C', mono: true, tono: 'text-danger', nota: <Badge variant="danger" size="sm">TOLERANCIA MÁX.</Badge> },
    { etiqueta: 'Meta de entrega conforme', valor: `≥ ${parametros.eficaciaMinima} %`, variable: 'META_EFICACIA_PCT', mono: true },
    { etiqueta: 'Tiempo de ciclo estándar', valor: `${parametros.cicloEstandarMin} min`, variable: 'META_CICLO_MIN', mono: true },
    { etiqueta: 'Umbral de incidencias', valor: `< ${parametros.incidenciasMaxima} %`, variable: 'META_INCIDENCIAS_MAX_PCT', mono: true },
    { etiqueta: 'Tasa máxima de retornos', valor: `< ${String(parametros.tasaRetornoMax).replace('.', ',')} %`, variable: 'TASA_RETORNO_MAX', mono: true },
    { etiqueta: 'Base de datos', valor: `${parametros.baseDatos} · servidor de planta`, variable: 'DATABASE_URL' },
    { etiqueta: 'Duración de la sesión', valor: parametros.expiracionSesion, variable: 'JWT_EXPIRES_IN', mono: true },
    { etiqueta: 'Zona horaria', valor: `${parametros.zonaHoraria} (UTC-4)`, variable: null, mono: true },
  ]
  const visibles = detallado ? filas : filas.slice(0, 3).concat(filas.slice(7, 8))
  return (
    <section className="bg-white p-6" aria-labelledby="parametros-planta">
      <Encabezado antetitulo="Configuración base" titulo={<span id="parametros-planta" className="flex items-center gap-2">Parámetros locales de la planta (Valera) <Settings2 className="h-4 w-4 text-primary" aria-hidden="true" /></span>} />
      <dl className="divide-y divide-gray-100">
        {visibles.map((f) => (
          <div key={f.etiqueta} className="py-3">
            <dt className="label-caps text-gray-600">{f.etiqueta}</dt>
            <dd className="flex flex-wrap items-center justify-between gap-2 mt-1">
              <span className={cn('text-sm', f.mono && 'font-mono', f.tono || 'text-gray-900')}>{f.valor}</span>
              {f.nota}
            </dd>
            {detallado && f.variable && <dd className="font-mono text-[11px] text-gray-500 mt-0.5">Variable del servidor: {f.variable}</dd>}
          </div>
        ))}
      </dl>
      <p className="mt-4 flex gap-2 bg-gray-50 p-3 text-xs text-gray-700">
        <Info className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
        Los parámetros se definen en el archivo .env del servidor de planta y aplican al reiniciarlo; su modificación requiere al administrador general con acceso al servidor.
      </p>
    </section>
  )
}

// ------------------------------------------------------------------ Auditoría

function Sparkline({ valores }) {
  const max = Math.max(1, ...valores)
  const puntos = valores.map((v, i) => `${(i / (valores.length - 1)) * 100},${28 - (v / max) * 24}`).join(' ')
  return (
    <svg viewBox="0 0 100 30" className="h-8 w-28" role="img" aria-label="Acciones registradas por hora en las últimas 24 horas" preserveAspectRatio="none">
      <polyline points={puntos} fill="none" stroke="#0f62fe" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/** Monitoreo de auditoría (últimas 24 h) con acceso al registro completo. */
export function MonitorAuditoria({ resumen }) {
  const [abierto, setAbierto] = useState(false)
  if (!resumen) return null
  return (
    <section className="bg-white p-5 flex flex-wrap items-center gap-4" aria-labelledby="monitor-auditoria">
      <span className="h-10 w-10 flex items-center justify-center bg-primary-light text-primary flex-shrink-0"><ShieldCheck className="h-5 w-5" aria-hidden="true" /></span>
      <div className="flex-1 min-w-[14rem]">
        <h2 id="monitor-auditoria" className="text-sm font-semibold text-gray-900">Monitoreo de auditoría y trazabilidad de acciones</h2>
        <p className="text-xs text-gray-600">Registro de {resumen.total} acción(es) de usuarios y {resumen.eventosTrazabilidad} evento(s) de trazabilidad en las últimas 24 horas.</p>
      </div>
      <div className="flex items-center gap-3">
        <span className={cn('flex items-center gap-1.5 font-mono text-xs', resumen.fallidosAutenticacion ? 'text-danger' : 'text-success')}>
          <span className={cn('h-2 w-2 rounded-full', resumen.fallidosAutenticacion ? 'bg-danger' : 'bg-success')} aria-hidden="true" />
          {resumen.fallidosAutenticacion} inicio(s) de sesión fallido(s)
        </span>
        <Sparkline valores={resumen.porHora} />
      </div>
      <Button variant="outline" onClick={() => setAbierto(true)}><ScrollText className="h-4 w-4" aria-hidden="true" /> Ver registro</Button>
      {abierto && <RegistroAuditoriaDialog onClose={() => setAbierto(false)} />}
    </section>
  )
}

const MODULOS_AUDITORIA = ['Acceso', 'Usuarios', 'Catálogos', 'Pedidos', 'Despachos', 'Incidencias', 'Devoluciones', 'Inventario', 'Trazabilidad', 'Residuos']

function RegistroAuditoriaDialog({ onClose }) {
  const [modulo, setModulo] = useState('TODOS')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const { data, isLoading, isError } = useAuditoria({ ...(modulo !== 'TODOS' && { modulo }), search: search.trim() }, { page, limit: 15 })
  const registros = data?.data || []
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Registro de auditoría</DialogTitle>
          <DialogDescription>Acciones de los usuarios: inicios de sesión y operaciones que modificaron datos. Solo lectura.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          <Input aria-label="Buscar en auditoría" placeholder="Buscar por usuario, acción o ruta…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="flex-1 min-w-[12rem]" />
          <Select value={modulo} onValueChange={(v) => { setModulo(v); setPage(1) }}>
            <SelectTrigger className="w-48" aria-label="Filtrar por módulo"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos los módulos</SelectItem>
              {MODULOS_AUDITORIA.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {isError ? (
          <p role="alert" className="text-sm text-danger">No se pudo cargar el registro de auditoría.</p>
        ) : (
          <div className="overflow-x-auto max-h-[50vh]">
            <table className="w-full text-sm">
              <thead className="sticky top-0">
                <tr className="bg-gray-50 text-left">
                  {['Fecha y hora', 'Usuario', 'Acción', 'Módulo', 'Detalle', 'IP'].map((h) => <th key={h} scope="col" className="px-3 py-2 label-caps">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {isLoading && <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-600">Cargando…</td></tr>}
                {!isLoading && !registros.length && <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-600">Sin registros.</td></tr>}
                {registros.map((a) => (
                  <tr key={a.id} className="border-b border-gray-100">
                    <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{fechaHora(a.fechaHora)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{a.usuario?.nombre}</td>
                    <td className={cn('px-3 py-2 font-mono text-xs', a.accion === 'INICIO_SESION_FALLIDO' && 'text-danger')}>{a.accion}</td>
                    <td className="px-3 py-2">{a.modulo}</td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-700">{a.detalle || '—'}</td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-600">{a.ip || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <PaginacionServidor pagination={data?.pagination} onPageChange={setPage} etiqueta="registros" />
        <DialogFooter>
          <DialogCancel type="button">Cerrar</DialogCancel>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
