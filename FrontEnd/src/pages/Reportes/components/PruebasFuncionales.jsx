import { useState } from 'react'
import { CirclePlay, Check, Clock, Info, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import api from '@/services/api'
import { cn } from '@/lib/utils'

const REPETICIONES = 3
const UMBRAL_MS = 2000

// Consulta representativa de cada módulo (solo lectura: la batería no modifica datos)
const ESCENARIOS = [
  { id: 'M02', modulo: 'M02. Pedidos', detalle: 'Listado de pedidos activos e indicadores', criterio: 'Lista e indicadores del tablero en < 2,0 s', consulta: () => Promise.all([api.get('/pedidos', { params: { limit: 10, vista: 'activos' } }), api.get('/pedidos/resumen')]) },
  { id: 'M03', modulo: 'M03. Despachos y ruta GPS', detalle: 'Resumen de flota, posiciones GPS y ciclo', criterio: 'Estado de flota y última posición en < 2,0 s', consulta: () => api.get('/despachos/resumen') },
  { id: 'M04', modulo: 'M04. Incidencias en tránsito', detalle: 'Incidencias abiertas y paradas en tránsito', criterio: 'Alerta visible al despachador en < 2,0 s', consulta: () => Promise.all([api.get('/incidencias', { params: { abiertas: 'true', limit: 10 } }), api.get('/incidencias/resumen')]) },
  { id: 'M05', modulo: 'M05. Logística inversa', detalle: 'Retornos activos y decisiones de calidad', criterio: 'Estación de dictamen cargada en < 2,0 s', consulta: () => api.get('/devoluciones/resumen') },
  { id: 'M06', modulo: 'M06. Inventario en cava', detalle: 'Stock por ubicación, lotes y temperatura', criterio: 'Stock y alertas de lotes en < 2,0 s', consulta: () => api.get('/inventario/resumen') },
  {
    id: 'M07', modulo: 'M07. Expediente de trazabilidad', detalle: 'Línea temporal completa del último pedido', criterio: 'Expediente con eventos, GPS y temperaturas en < 2,0 s',
    consulta: async () => {
      const { data } = await api.get('/pedidos', { params: { limit: 1, vista: 'historial' } })
      if (!data[0]) throw new Error('No hay pedidos para consultar')
      return api.get(`/trazabilidad/pedido/${data[0].id}/expediente`)
    },
  },
  { id: 'M08', modulo: 'M08. Residuos y cierre de ciclo', detalle: 'Balance del mes y gestores', criterio: 'Indicadores ambientales en < 2,0 s', consulta: () => api.get('/residuos/resumen') },
  { id: 'M09', modulo: 'M09. Reporte consolidado', detalle: 'Agregación de 30 días de operación', criterio: 'Reporte de rendimiento en < 2,0 s', consulta: () => api.get('/reportes/operativo') },
]

const ms = (v) => `${Math.round(v).toLocaleString('es-VE')} ms`

/**
 * Evaluación de pruebas (Figma "Validación académica y metodológica"): mide desde el navegador el
 * tiempo de respuesta real de la consulta principal de cada módulo (red local + API + PostgreSQL).
 */
export function PruebasFuncionales() {
  const [resultados, setResultados] = useState({})
  const [ejecutando, setEjecutando] = useState(null)
  const [fin, setFin] = useState(null)

  const ejecutar = async () => {
    setResultados({})
    setFin(null)
    for (const e of ESCENARIOS) {
      setEjecutando(e.id)
      const tiempos = []
      let error = null
      for (let i = 0; i < REPETICIONES && !error; i++) {
        const t0 = performance.now()
        try {
          await e.consulta()
          tiempos.push(performance.now() - t0)
        } catch (err) {
          error = err?.message || 'La consulta falló'
        }
      }
      const promedio = tiempos.length ? tiempos.reduce((s, t) => s + t, 0) / tiempos.length : null
      setResultados((r) => ({ ...r, [e.id]: { promedio, min: Math.min(...tiempos), max: Math.max(...tiempos), error } }))
    }
    setEjecutando(null)
    setFin(new Date())
  }

  const medidos = Object.values(resultados).filter((r) => r.promedio !== null)
  const aprobados = medidos.filter((r) => !r.error && r.promedio < UMBRAL_MS).length

  return (
    <section className="bg-white p-6" aria-labelledby="rep-pruebas">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div className="max-w-3xl">
          <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-primary">
            Validación académica y metodológica <span className="bg-primary-light text-[#002d9c] px-1.5 normal-case tracking-normal">Fase de defensa</span>
          </p>
          <h2 id="rep-pruebas" className="text-base font-semibold text-gray-900">Medición de tiempos de respuesta y pruebas funcionales</h2>
          <p className="text-sm text-gray-600 mt-1">
            Cada escenario ejecuta {REPETICIONES} veces la consulta principal del módulo contra la base de datos real y registra el promedio.
            Las consultas son de solo lectura: la batería no modifica datos.
          </p>
        </div>
        <Button variant="outline" onClick={ejecutar} disabled={!!ejecutando} loading={!!ejecutando}>
          {!ejecutando && <CirclePlay className="h-4 w-4" aria-hidden="true" />} {ejecutando ? `Midiendo ${ejecutando}…` : 'Iniciar batería de pruebas'}
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th scope="col" className="px-3 py-3 label-caps">Módulo / flujo evaluado</th>
              <th scope="col" className="px-3 py-3 label-caps text-right">Tiempo de respuesta (promedio)</th>
              <th scope="col" className="px-3 py-3 label-caps text-right">Mejor / peor</th>
              <th scope="col" className="px-3 py-3 label-caps">Criterio de aceptación</th>
              <th scope="col" className="px-3 py-3 label-caps">Estado</th>
            </tr>
          </thead>
          <tbody>
            {ESCENARIOS.map((e) => {
              const r = resultados[e.id]
              const ok = r && !r.error && r.promedio < UMBRAL_MS
              return (
                <tr key={e.id} className="border-b border-gray-100" data-escenario={e.id}>
                  <td className="px-3 py-3">
                    <p className="font-semibold text-gray-900">{e.modulo}</p>
                    <p className="text-xs text-gray-600">{e.detalle}</p>
                  </td>
                  <td className="px-3 py-3 text-right font-mono whitespace-nowrap">{r?.promedio != null ? ms(r.promedio) : ejecutando === e.id ? 'midiendo…' : '—'}</td>
                  <td className="px-3 py-3 text-right font-mono text-xs text-gray-600 whitespace-nowrap">{r?.promedio != null ? `${ms(r.min)} / ${ms(r.max)}` : '—'}</td>
                  <td className="px-3 py-3 text-gray-700 max-w-[16rem]">{e.criterio}</td>
                  <td className="px-3 py-3">
                    {!r ? (
                      <span className="inline-flex items-center gap-1.5 bg-primary-light text-[#002d9c] px-2 py-1 text-xs whitespace-nowrap"><Clock className="h-3.5 w-3.5" aria-hidden="true" />Listo p/ medir</span>
                    ) : ok ? (
                      <span className="inline-flex items-center gap-1.5 bg-success-light text-[#044317] px-2 py-1 text-xs"><Check className="h-3.5 w-3.5" aria-hidden="true" />Validado</span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 bg-danger-light text-[#a2191f] px-2 py-1 text-xs" title={r.error || undefined}><TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />{r.error ? 'Error' : 'Revisar'}</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className={cn('mt-4 flex flex-wrap items-center justify-between gap-2 bg-gray-50 px-4 py-3 text-xs text-gray-700')}>
        <span className="flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" aria-hidden="true" />
          {fin
            ? `Batería completada ${fin.toLocaleTimeString('es-VE')}: ${aprobados} de ${ESCENARIOS.length} escenarios bajo ${UMBRAL_MS / 1000} s.`
            : 'Los tiempos se miden desde el navegador e incluyen red local, API Node.js y PostgreSQL.'}
        </span>
        <span className="font-mono">Motor: PostgreSQL / Node.js</span>
      </p>
    </section>
  )
}
