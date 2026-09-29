import { Snowflake, Droplets, Package, Wheat, Recycle } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { num, pct } from './formato'

const ESTADO_SECTOR = {
  OPTIMO: { label: 'Óptimo', variant: 'success' },
  REGULAR: { label: 'Regular', variant: 'info' },
  ATENCION: { label: 'Atención', variant: 'warning' },
  SIN_DATOS: { label: 'Sin cierres', variant: 'default' },
}
// Colores de la barra de distribución por sector (escala Carbon)
const COLOR_SECTOR = ['bg-primary', 'bg-[#78a9ff]', 'bg-gray-500', 'bg-gray-300', 'bg-[#a6c8ff]', 'bg-gray-700']

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

export function SectoresPanel({ reporte }) {
  const { sectores, metas } = reporte
  const volumen = sectores.reduce((s, x) => s + x.volumen, 0)
  return (
    <section className="bg-white p-6 min-w-0" aria-labelledby="rep-sectores">
      <Encabezado
        antetitulo="Trazabilidad geo-operativa"
        titulo={<span id="rep-sectores">Distribución y cumplimiento por sector</span>}
        extra={<span className="font-mono text-xs bg-gray-50 px-2 py-1 text-gray-600">Meta entrega conforme ≥ {metas.eficaciaMinima}%</span>}
      />
      {!sectores.length ? (
        <p className="bg-gray-50 p-4 text-sm text-gray-600">Sin pedidos por sector en el periodo seleccionado.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th scope="col" className="px-3 py-3 label-caps">Sector / cuadrante</th>
                  <th scope="col" className="px-3 py-3 label-caps text-right">Volumen</th>
                  <th scope="col" className="px-3 py-3 label-caps text-right">Entrega conforme</th>
                  <th scope="col" className="px-3 py-3 label-caps text-right">Ciclo</th>
                  <th scope="col" className="px-3 py-3 label-caps text-right">Incidencias</th>
                  <th scope="col" className="px-3 py-3 label-caps">Estado ruta</th>
                </tr>
              </thead>
              <tbody>
                {sectores.map((s, i) => {
                  const estado = ESTADO_SECTOR[s.estado]
                  return (
                    <tr key={s.id} className="border-b border-gray-100">
                      <td className="px-3 py-3">
                        <span className="flex items-center gap-2">
                          <span className={cn('h-2 w-2 rounded-full flex-shrink-0', COLOR_SECTOR[i % COLOR_SECTOR.length])} aria-hidden="true" />
                          <span>
                            <span className="block text-gray-900">{s.nombre}</span>
                            {s.municipio && <span className="block text-xs text-gray-600">{s.municipio}</span>}
                          </span>
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-mono whitespace-nowrap">{s.volumen} ped.</td>
                      <td className={cn('px-3 py-3 text-right font-mono', s.eficacia !== null && s.eficacia < metas.eficaciaMinima ? 'text-[#8a3800]' : 'text-success')}>{pct(s.eficacia)}</td>
                      <td className="px-3 py-3 text-right font-mono whitespace-nowrap">{s.cicloMin === null ? '—' : `${num(s.cicloMin)} min`}</td>
                      <td className="px-3 py-3 text-right font-mono">{s.incidencias} cas.</td>
                      <td className="px-3 py-3"><Badge variant={estado.variant} size="sm">{estado.label.toUpperCase()}</Badge></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-5">
            <div className="flex justify-between text-xs text-gray-700 mb-2">
              <span>Distribución porcentual del volumen total ({volumen} pedidos)</span>
              <span className="font-mono">{sectores.length} sector(es)</span>
            </div>
            <div className="flex h-3 w-full bg-gray-100" role="img" aria-label="Distribución del volumen por sector">
              {sectores.filter((s) => s.volumen > 0).map((s, i) => (
                <div key={s.id} className={COLOR_SECTOR[i % COLOR_SECTOR.length]} style={{ width: `${s.participacion}%` }} title={`${s.nombre}: ${pct(s.participacion)}`} />
              ))}
            </div>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-700">
              {sectores.filter((s) => s.volumen > 0).map((s, i) => (
                <li key={s.id} className="flex items-center gap-1.5">
                  <span className={cn('h-2.5 w-2.5', COLOR_SECTOR[i % COLOR_SECTOR.length])} aria-hidden="true" />
                  {s.nombre} ({pct(s.participacion)})
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  )
}

export function CausasPanel({ reporte }) {
  const { causas, cadenaFrio } = reporte
  const total = causas.reduce((s, c) => s + c.casos, 0)
  const frioOk = cadenaFrio.porcentaje === 100
  return (
    <section className="bg-white p-6 flex flex-col min-w-0" aria-labelledby="rep-causas">
      <Encabezado
        antetitulo="Análisis de desvíos"
        tono="text-danger"
        titulo={<span id="rep-causas">Causas de retraso e incidencias</span>}
        extra={<span className="font-mono text-xs bg-danger-light text-[#a2191f] px-2 py-1">{total} eventos</span>}
      />
      {!causas.length ? (
        <p className="bg-gray-50 p-4 text-sm text-gray-600 flex-1">Sin incidencias registradas en el periodo.</p>
      ) : (
        <ul className="space-y-4 flex-1">
          {causas.map((c, i) => (
            <li key={c.id}>
              <div className="flex justify-between gap-3 text-sm">
                <span className="font-semibold text-gray-900">{c.nombre}</span>
                <span className="font-mono whitespace-nowrap">{pct(c.porcentaje)} ({c.casos} caso{c.casos === 1 ? '' : 's'})</span>
              </div>
              <div className="h-1.5 bg-gray-100 my-1.5" aria-hidden="true">
                <div className={cn('h-1.5', i === 0 ? 'bg-primary' : 'bg-gray-500')} style={{ width: `${c.porcentaje}%` }} />
              </div>
              {c.descripcion && <p className="text-xs text-gray-600">{c.descripcion}</p>}
            </li>
          ))}
        </ul>
      )}
      <div className={cn('mt-5 flex items-center justify-between gap-3 border px-4 py-3 text-sm', frioOk ? 'border-success/40' : 'border-warning')}>
        <span className="flex items-center gap-2 text-gray-900">
          <Snowflake className={cn('h-4 w-4', frioOk ? 'text-success' : 'text-[#8a3800]')} aria-hidden="true" />
          Protocolo cadena de frío (≤ {cadenaFrio.limiteC} °C)
        </span>
        <span className={cn('font-mono text-xs text-right', frioOk ? 'text-success' : 'text-[#8a3800]')}>
          {cadenaFrio.registros ? `${pct(cadenaFrio.porcentaje)} ${frioOk ? 'ÍNTEGRO' : `· ${cadenaFrio.registros - cadenaFrio.dentro} fuera de rango`}` : 'Sin mediciones'}
        </span>
      </div>
    </section>
  )
}

// Tarjetas del balance de residuos (Figma): aceite, cartón/embalajes y merma
const TARJETAS_RESIDUO = [
  { codigos: ['RES-004'], titulo: 'Aceite de cocina usado (ACU)', icon: Droplets, tono: 'bg-success-light text-[#044317]' },
  { codigos: ['RES-002', 'RES-003'], titulo: 'Cartón corrugado y embalajes', icon: Package, tono: 'bg-gray-100 text-gray-700' },
  { codigos: ['RES-001', 'RES-005'], titulo: 'Merma por quiebre térmico y producción', icon: Wheat, tono: 'bg-danger-light text-danger', alerta: true },
]

export function BalanceResiduos({ reporte }) {
  const { residuos, periodo } = reporte
  return (
    <section className="bg-white p-6" aria-labelledby="rep-balance">
      <Encabezado
        antetitulo="Responsabilidad y economía circular"
        tono="text-success"
        titulo={<span id="rep-balance">Balance consolidado de residuos (planta Valera)</span>}
        extra={<span className="flex items-center gap-1.5 text-xs text-gray-700"><Recycle className="h-4 w-4 text-success" aria-hidden="true" />Periodo evaluado: {periodo.dias} días</span>}
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TARJETAS_RESIDUO.map((t) => {
          const tipos = residuos.porTipo.filter((x) => t.codigos.includes(x.codigo))
          const porUnidad = {}
          tipos.forEach((x) => x.cantidades.forEach((c) => { porUnidad[c.unidad] = (porUnidad[c.unidad] || 0) + c.total }))
          const entradas = Object.entries(porUnidad)
          const destino = tipos.map((x) => x.destinoHabitual).find(Boolean)
          const Icono = t.icon
          return (
            <div key={t.titulo} className="bg-gray-50 p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-gray-900">{t.titulo}</p>
                <span className={cn('h-8 w-8 flex items-center justify-center flex-shrink-0', t.tono)}><Icono className="h-4 w-4" aria-hidden="true" /></span>
              </div>
              <p className={cn('font-mono text-2xl font-semibold mt-1', t.alerta && entradas.length ? 'text-danger' : 'text-gray-900')}>
                {entradas.length ? entradas.map(([u, v]) => <span key={u} className="mr-3">{num(v)} <span className="font-sans text-sm font-normal text-gray-600">{u}</span></span>) : '0'}
              </p>
              <p className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-600">
                Destino: <span className="text-gray-900">{destino || 'sin gestor habitual'}</span> · {tipos.reduce((s, x) => s + x.registros, 0)} registro(s)
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
