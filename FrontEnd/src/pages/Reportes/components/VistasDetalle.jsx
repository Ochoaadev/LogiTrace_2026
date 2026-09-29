import { Link } from 'react-router-dom'
import { TriangleAlert, Timer, CircleCheck, Undo2, PackageCheck, ShieldAlert, Trash2, Recycle, Truck, ArrowRight } from 'lucide-react'
import { Panel } from '@/components/layout/ModuloUI'
import { Badge } from '@/components/ui/Badge'
import { getEstadoConfig } from '@/schemas/incidenciaSchema'
import { cn } from '@/lib/utils'
import { num, pct, fechaHora, cantidades } from './formato'
import { CausasPanel } from './VistaEntregas'

function Dato({ icon: Icon, titulo, valor, detalle, tono = 'text-gray-900' }) {
  return (
    <div className="bg-white p-5">
      <p className="flex items-center gap-2 label-caps text-gray-600"><Icon className="h-4 w-4" aria-hidden="true" />{titulo}</p>
      <p className={cn('font-mono text-2xl font-semibold mt-2', tono)}>{valor}</p>
      {detalle && <p className="text-xs text-gray-600 mt-1">{detalle}</p>}
    </div>
  )
}

function Barras({ filas, vacio, color = 'bg-primary' }) {
  if (!filas.length) return <p className="text-sm text-gray-600">{vacio}</p>
  return (
    <ul className="space-y-3">
      {filas.map((f) => (
        <li key={f.id || f.nombre}>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-900">{f.nombre}</span>
            <span className="font-mono">{f.casos} · {pct(f.porcentaje)}</span>
          </div>
          <div className="h-2 bg-gray-100" aria-hidden="true"><div className={cn('h-2', color)} style={{ width: `${f.porcentaje || 0}%` }} /></div>
        </li>
      ))}
    </ul>
  )
}

export function VistaIncidencias({ reporte }) {
  const { incidencias, indicadores, metas } = reporte
  const tasa = indicadores.incidencias.valor
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Dato icon={TriangleAlert} titulo="Incidencias en el periodo" valor={incidencias.total} detalle={`Tasa ${pct(tasa)} · umbral < ${metas.incidenciasMaxima}%`} tono={tasa !== null && tasa >= metas.incidenciasMaxima ? 'text-danger' : 'text-gray-900'} />
        <Dato icon={ShieldAlert} titulo="Abiertas" valor={incidencias.abiertas} detalle="Reportadas, en revisión o en atención" tono={incidencias.abiertas ? 'text-danger' : 'text-success'} />
        <Dato icon={Timer} titulo="Resolución promedio" valor={incidencias.resolucionPromedioMin === null ? '—' : `${num(incidencias.resolucionPromedioMin)} min`} detalle={`${incidencias.resueltas} incidencia(s) resuelta(s)`} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CausasPanel reporte={reporte} />
        <Panel titulo="Incidencias recientes del periodo" icon={TriangleAlert} extra={<Link to="/incidencias" className="text-xs text-primary hover:underline">Ir a incidencias</Link>}>
          {!incidencias.recientes.length ? (
            <p className="text-sm text-gray-600">Sin incidencias en el periodo.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {incidencias.recientes.map((i) => {
                const e = getEstadoConfig(i.estado)
                return (
                  <li key={i.id} className="py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <Link to={`/incidencias/${i.id}`} className="font-mono text-sm font-semibold text-primary hover:underline">{i.codigo}</Link>
                      <p className="text-xs text-gray-600">{i.tipo} · pedido {i.pedido} · {fechaHora(i.fechaHora)}</p>
                    </div>
                    <Badge variant={e.color}>{e.label}</Badge>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}

const DECISIONES = [
  { clave: 'REINGRESO', titulo: 'Reingreso a inventario', icon: PackageCheck, tono: 'text-success' },
  { clave: 'CUARENTENA', titulo: 'Cuarentena', icon: ShieldAlert, tono: 'text-[#8a3800]' },
  { clave: 'DESCARTE', titulo: 'Descarte (merma a residuos)', icon: Trash2, tono: 'text-danger' },
]

export function VistaDevoluciones({ reporte }) {
  const { devoluciones, indicadores, metas, cadenaFrio } = reporte
  const totalDecisiones = Object.values(devoluciones.decisiones).reduce((s, n) => s + n, 0)
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Dato icon={Undo2} titulo="Devoluciones" valor={devoluciones.total} detalle={`Tasa de retornos ${pct(indicadores.retornos.valor)} · umbral < ${metas.retornosMaximo}%`} tono={indicadores.retornos.valor !== null && indicadores.retornos.valor >= metas.retornosMaximo ? 'text-danger' : 'text-gray-900'} />
        <Dato icon={Timer} titulo="Registro → recepción" valor={devoluciones.recepcionPromedioMin === null ? '—' : `${num(devoluciones.recepcionPromedioMin)} min`} detalle="Tiempo promedio de retorno a planta" />
        <Dato icon={CircleCheck} titulo="Cadena de frío" valor={pct(cadenaFrio.porcentaje)} detalle={`${cadenaFrio.dentro} de ${cadenaFrio.registros} mediciones ≤ ${cadenaFrio.limiteC} °C`} tono={cadenaFrio.porcentaje === 100 ? 'text-success' : 'text-[#8a3800]'} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel titulo="Motivos de devolución" icon={Undo2}>
          <Barras filas={devoluciones.porMotivo} vacio="Sin devoluciones en el periodo." />
        </Panel>
        <Panel titulo="Dictamen de calidad" icon={PackageCheck} extra={<Link to="/devoluciones" className="text-xs text-primary hover:underline">Ir a devoluciones</Link>}>
          {!totalDecisiones ? (
            <p className="text-sm text-gray-600">Sin productos evaluados en el periodo.</p>
          ) : (
            <ul className="space-y-3">
              {DECISIONES.map((d) => {
                const Icono = d.icon
                const n = devoluciones.decisiones[d.clave]
                return (
                  <li key={d.clave} className="flex items-center gap-3 bg-gray-50 px-4 py-3">
                    <Icono className={cn('h-5 w-5', d.tono)} aria-hidden="true" />
                    <span className="flex-1 text-sm text-gray-900">{d.titulo}</span>
                    <span className="font-mono text-sm">{n} · {pct(Math.round((n / totalDecisiones) * 1000) / 10)}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}

export function VistaResiduos({ reporte }) {
  const { residuos } = reporte
  const t = residuos.trazabilidad
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Dato icon={Truck} titulo="Retiros por gestores" valor={residuos.retiros} detalle="Entregas con fecha de retiro en el periodo" tono="text-success" />
        <Dato icon={Recycle} titulo="Pendientes en planta" valor={residuos.pendientesRetiro} detalle="Registrados o en almacenamiento temporal" tono={residuos.pendientesRetiro ? 'text-[#8a3800]' : 'text-gray-900'} />
        <Dato icon={CircleCheck} titulo="Destino trazable" valor={pct(t.porcentaje)} detalle={`${t.conGestor} de ${t.vigentes} registros con gestor asignado`} />
      </div>
      <Panel titulo="Generación por tipo de residuo" icon={Recycle} extra={<Link to="/residuos" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">Ir a gestión de residuos <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>}>
        {!residuos.porTipo.length ? (
          <p className="text-sm text-gray-600">Sin residuos registrados en el periodo.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th scope="col" className="px-3 py-3 label-caps">Tipo</th>
                  <th scope="col" className="px-3 py-3 label-caps text-right">Cantidad</th>
                  <th scope="col" className="px-3 py-3 label-caps text-right">Registros</th>
                  <th scope="col" className="px-3 py-3 label-caps text-right">De devoluciones</th>
                  <th scope="col" className="px-3 py-3 label-caps">Destino habitual</th>
                </tr>
              </thead>
              <tbody>
                {residuos.porTipo.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100">
                    <td className="px-3 py-3 text-gray-900">{r.nombre}</td>
                    <td className="px-3 py-3 text-right font-mono whitespace-nowrap">{cantidades(r.cantidades)}</td>
                    <td className="px-3 py-3 text-right font-mono">{r.registros}</td>
                    <td className={cn('px-3 py-3 text-right font-mono', r.desdeDevolucion && 'text-danger')}>{r.desdeDevolucion}</td>
                    <td className="px-3 py-3 text-gray-700">{r.destinoHabitual || 'Sin gestor habitual'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}
