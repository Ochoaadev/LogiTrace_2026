import { useState } from 'react'
import { Building2, FileText, MapPin, Phone, ListFilter, Truck, Warehouse, ShieldCheck, ChartColumn, Recycle } from 'lucide-react'
import { Panel } from '@/components/layout/ModuloUI'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { DataTable } from '@/components/ui/Table'
import { PaginacionServidor } from '@/components/ui/PaginacionServidor'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { usePermissions } from '@/hooks/usePermissions'
import { useResiduos } from '@/services/query/useResiduos'
import { ESTADOS_RESIDUO } from '@/schemas/residuoSchema'
import { cn } from '@/lib/utils'
import { columnasResiduos } from './columnas'
import { cantidades, cantidad, fecha } from './formato'

// Fechas para <input type="date"> en hora local
const isoLocal = (d) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return z.toISOString().slice(0, 10)
}
const inicioMes = () => { const d = new Date(); return isoLocal(new Date(d.getFullYear(), d.getMonth(), 1)) }

// ------------------------------------------------------------------ Gestores

/** Gestores y destinos finales: lo que cada uno tiene pendiente por retirar y lo ya entregado. */
export function VistaGestores({ gestores = [], cargando, onVerRegistros, onManifiesto }) {
  const { can } = usePermissions()
  if (cargando) return <div className="h-48 bg-white animate-pulse" />
  if (!gestores.length) return <p className="bg-white p-6 text-sm text-gray-600">No hay gestores de residuos registrados en Catálogos.</p>

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {gestores.map((g) => (
        <section key={g.id} className={cn('bg-white p-6 border-l-4', g.tipo === 'EXTERNO' ? 'border-success' : 'border-primary')} aria-label={g.nombre}>
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-start gap-3">
              <span className="h-10 w-10 flex items-center justify-center bg-gray-50 text-gray-700 flex-shrink-0">
                <Building2 className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-gray-900">{g.nombre}</h2>
                <p className="font-mono text-xs text-gray-600">{g.codigo}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge variant={g.tipo === 'EXTERNO' ? 'success' : 'info'}>{g.tipo === 'EXTERNO' ? 'Gestor externo' : 'Gestión interna'}</Badge>
              {!g.activo && <Badge variant="danger">Inactivo</Badge>}
            </div>
          </div>
          <ul className="space-y-1 text-sm text-gray-700 mb-4">
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-gray-500" aria-hidden="true" />{g.ubicacion || 'Ubicación no registrada'}</li>
            <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-gray-500" aria-hidden="true" />{g.contacto || 'Contacto no registrado'}</li>
          </ul>
          <dl className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-gray-50 p-3">
              <dt className="label-caps text-gray-600">Por retirar</dt>
              <dd className="font-mono text-lg font-semibold text-gray-900">{g.pendientes.registros}</dd>
              <dd className="text-xs text-gray-600">{g.pendientes.registros ? cantidades(g.pendientes.cantidades) : 'Sin pendientes'}</dd>
            </div>
            <div className="bg-gray-50 p-3">
              <dt className="label-caps text-gray-600">Entregado (histórico)</dt>
              <dd className="font-mono text-lg font-semibold text-success">{g.retirados.registros}</dd>
              <dd className="text-xs text-gray-600">{g.retirados.registros ? cantidades(g.retirados.cantidades) : 'Sin retiros'}</dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => onVerRegistros(g.id)}>
              <ListFilter className="h-4 w-4" aria-hidden="true" /> Ver en bitácora
            </Button>
            {can('residuos.export') && g.retirados.registros > 0 && (
              <Button variant="ghost" size="sm" onClick={() => onManifiesto({ gestorId: g.id })}>
                <FileText className="h-4 w-4" aria-hidden="true" /> Manifiesto del mes
              </Button>
            )}
          </div>
        </section>
      ))}
    </div>
  )
}

// ------------------------------------------------------------------ Retiros

function TablaEstado({ titulo, icon, filtros, vacio, onAbrir, extra }) {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError } = useResiduos(filtros, { page, limit: 5 })
  return (
    <Panel titulo={titulo} icon={icon} extra={extra} className="p-0 [&>div:first-child]:px-6 [&>div:first-child]:pt-6">
      {isError ? (
        <p role="alert" className="px-6 pb-6 text-sm text-danger">No se pudieron cargar los registros.</p>
      ) : (
        <>
          <DataTable columns={columnasResiduos()} data={data?.data || []} loading={isLoading} sortable={false} pagination={false} showPagination={false} onRowClick={(r) => onAbrir(r.id)} emptyMessage={vacio} />
          <PaginacionServidor pagination={data?.pagination} onPageChange={setPage} etiqueta="registros" />
        </>
      )}
    </Panel>
  )
}

/** Manifiestos y retiros: cola de residuos por retirar, retirados sin cierre y emisión del manifiesto. */
export function VistaRetiros({ gestores = [], resumen, onAbrir, onManifiesto, generando }) {
  const { can } = usePermissions()
  const [desde, setDesde] = useState(inicioMes)
  const [hasta, setHasta] = useState(() => isoLocal(new Date()))
  const [gestorId, setGestorId] = useState('TODOS')

  const generar = (e) => {
    e.preventDefault()
    onManifiesto({
      fechaDesde: new Date(`${desde}T00:00:00`).toISOString(),
      fechaHasta: new Date(`${hasta}T23:59:59`).toISOString(),
      ...(gestorId !== 'TODOS' && { gestorId }),
    })
  }

  return (
    <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-6">
      <div className="min-w-0 space-y-6">
        <TablaEstado
          titulo="Pendientes de retiro en planta"
          icon={Warehouse}
          filtros={{ pendientes: 'true' }}
          vacio="No hay residuos esperando retiro."
          onAbrir={onAbrir}
          extra={resumen?.pendientesSinGestor ? <Badge variant="danger">{resumen.pendientesSinGestor} sin gestor asignado</Badge> : null}
        />
        <TablaEstado
          titulo="Retirados · por confirmar disposición final"
          icon={Truck}
          filtros={{ estado: 'RETIRADO' }}
          vacio="No hay retiros pendientes de confirmar."
          onAbrir={onAbrir}
        />
      </div>

      <div className="space-y-6 min-w-0">
        {can('residuos.export') && (
          <Panel titulo="Manifiesto de entrega ambiental" icon={FileText}>
            <p className="text-sm text-gray-600 mb-4">PDF con los residuos retirados en el periodo, agrupados por gestor, con totales y espacio para firma y sello de entrega y recepción.</p>
            <form onSubmit={generar} className="grid gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="mf-desde">Desde</Label>
                  <Input id="mf-desde" type="date" value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="mf-hasta">Hasta</Label>
                  <Input id="mf-hasta" type="date" value={hasta} min={desde} onChange={(e) => setHasta(e.target.value)} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="mf-gestor">Gestor</Label>
                <Select value={gestorId} onValueChange={setGestorId}>
                  <SelectTrigger id="mf-gestor"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS">Todos los gestores</SelectItem>
                    {gestores.map((g) => <SelectItem key={g.id} value={g.id}>{g.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={!desde || !hasta || generando} loading={generando}>
                {!generando && <FileText className="h-4 w-4" aria-hidden="true" />} Generar manifiesto PDF
              </Button>
            </form>
          </Panel>
        )}
        <Panel titulo="Último retiro registrado" icon={Truck}>
          {resumen?.retiros.ultimo ? (
            <div className="text-sm text-gray-700 space-y-1">
              <p className="font-mono font-semibold text-gray-900">#{resumen.retiros.ultimo.codigo}</p>
              <p>{fecha(resumen.retiros.ultimo.fecha)} · {resumen.retiros.ultimo.gestor}</p>
              <p className="text-xs text-gray-600">{resumen.retiros.periodo} retiro(s) en el mes en curso.</p>
            </div>
          ) : (
            <p className="text-sm text-gray-600">Aún no se han registrado retiros.</p>
          )}
        </Panel>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ Indicadores

function Indicador({ titulo, valor, detalle, tono = 'text-gray-900' }) {
  return (
    <div className="bg-gray-50 p-4">
      <p className="label-caps text-gray-600">{titulo}</p>
      <p className={cn('font-mono text-2xl font-semibold mt-1', tono)}>{valor}</p>
      <p className="text-xs text-gray-600 mt-1">{detalle}</p>
    </div>
  )
}

const COLOR_ESTADO = {
  REGISTRADO: 'bg-primary',
  EN_ALMACENAMIENTO: 'bg-warning',
  RETIRADO: 'bg-gray-500',
  DISPOSICION_FINAL: 'bg-success',
  ANULADO: 'bg-danger',
}

/** Indicadores de sostenibilidad calculados con los registros reales del módulo. */
export function VistaIndicadores({ resumen, cargando }) {
  if (cargando || !resumen) return <div className="h-48 bg-white animate-pulse" />

  const { trazabilidad, porEstado, porTipo } = resumen
  const vigentes = trazabilidad.vigentes
  const cerrados = porEstado.DISPOSICION_FINAL || 0
  const deDevolucion = porTipo.reduce((s, t) => s + t.desdeDevolucion, 0)
  const registrosMes = porTipo.reduce((s, t) => s + t.registros, 0)
  const pct = (n, d) => (d ? `${Math.round((n / d) * 100)}%` : '—')

  // Barras por tipo: cada unidad se compara con el máximo de su misma unidad
  const filas = porTipo.flatMap((t) => t.cantidades.map((c) => ({ ...c, tipo: t.nombre, codigo: t.codigo })))
  const maximo = (unidad) => Math.max(...filas.filter((f) => f.unidad === unidad).map((f) => f.total), 0)
  const totalEstados = Object.values(porEstado).reduce((s, n) => s + n, 0)

  return (
    <div className="space-y-6">
      <Panel titulo="Indicadores de sostenibilidad" icon={ShieldCheck} extra={<span className="text-xs text-gray-600">Mes en curso y registros vigentes</span>}>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Indicador titulo="Destino trazable" valor={trazabilidad.porcentaje === null ? '—' : `${trazabilidad.porcentaje}%`} detalle={`${trazabilidad.conGestor} de ${vigentes} registros con gestor asignado`} tono={trazabilidad.porcentaje === 100 ? 'text-success' : 'text-gray-900'} />
          <Indicador titulo="Ciclo cerrado" valor={pct(cerrados, vigentes)} detalle={`${cerrados} registro(s) con disposición final confirmada`} />
          <Indicador titulo="Pendientes en planta" valor={resumen.pendientesRetiro} detalle="Registrados o en almacenamiento temporal" tono={resumen.pendientesRetiro ? 'text-[#8a3800]' : 'text-gray-900'} />
          <Indicador titulo="Descartes de devoluciones" valor={deDevolucion} detalle={`${pct(deDevolucion, registrosMes)} de los ${registrosMes} registros del mes`} tono={deDevolucion ? 'text-danger' : 'text-gray-900'} />
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel titulo="Generación por tipo de residuo" icon={ChartColumn} extra={<span className="text-xs text-gray-600">Mes en curso</span>}>
          {!filas.length ? (
            <p className="text-sm text-gray-600">Sin residuos registrados en el mes.</p>
          ) : (
            <ul className="space-y-3">
              {filas.map((f) => (
                <li key={`${f.codigo}-${f.unidad}`}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-900">{f.tipo}</span>
                    <span className="font-mono text-gray-900">{cantidad(f.total)} {f.unidad}</span>
                  </div>
                  <div className="h-2 bg-gray-100" aria-hidden="true">
                    <div className="h-2 bg-primary" style={{ width: `${(f.total / (maximo(f.unidad) || 1)) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel titulo="Estado del circuito de disposición" icon={Recycle} extra={<span className="text-xs text-gray-600">Todos los registros</span>}>
          {!totalEstados ? (
            <p className="text-sm text-gray-600">Sin registros.</p>
          ) : (
            <>
              <div className="flex h-4 w-full mb-4" role="img" aria-label="Distribución de registros por estado">
                {ESTADOS_RESIDUO.filter((e) => porEstado[e.value]).map((e) => (
                  <div key={e.value} className={COLOR_ESTADO[e.value]} style={{ width: `${(porEstado[e.value] / totalEstados) * 100}%` }} title={`${e.label}: ${porEstado[e.value]}`} />
                ))}
              </div>
              <ul className="grid grid-cols-2 gap-2 text-sm">
                {ESTADOS_RESIDUO.map((e) => (
                  <li key={e.value} className="flex items-center gap-2">
                    <span className={cn('h-2.5 w-2.5', COLOR_ESTADO[e.value])} aria-hidden="true" />
                    <span className="text-gray-700 flex-1">{e.label}</span>
                    <span className="font-mono text-gray-900">{porEstado[e.value] || 0}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>
      </div>
    </div>
  )
}
