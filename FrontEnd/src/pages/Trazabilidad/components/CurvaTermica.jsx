import { useEffect, useMemo, useRef, useState } from 'react'
import { TrendingDown, Table2, ChartLine } from 'lucide-react'
import { hora, temp } from './formato'

const SERIE = '#0f62fe' // validado: contraste ≥ 3:1 sobre blanco
const CRITICO = '#da1e28' // color de estado reservado (siempre con etiqueta)
// Variables del tema: la gráfica se adapta al modo claro / oscuro
const REJILLA = 'var(--color-gray-100)'
const TINTA = 'var(--color-gray-600)'

const ALTO = 220
const M = { top: 20, right: 16, bottom: 28, left: 48 }

// visible: el contenedor se desmonta al ver la tabla; al volver hay que observar el nuevo nodo
function useAncho(ref, visible) {
  const [ancho, setAncho] = useState(600)
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([entry]) => setAncho(Math.max(280, entry.contentRect.width)))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [ref, visible])
  return ancho
}

/** Curva de temperatura (registros manuales) frente al límite crítico de la cadena de frío. */
export function CurvaTermica({ cadenaFrio }) {
  const { registros, limiteCriticoC } = cadenaFrio
  const contenedor = useRef(null)
  const [activo, setActivo] = useState(null)
  const [verTabla, setVerTabla] = useState(false)
  const ancho = useAncho(contenedor, !verTabla)

  const escala = useMemo(() => {
    const valores = [...registros.map((r) => r.temperaturaC), limiteCriticoC]
    const yMin = Math.floor(Math.min(...valores) - 1)
    const yMax = Math.ceil(Math.max(...valores) + 1)
    const tiempos = registros.map((r) => new Date(r.fechaHora).getTime())
    const tMin = Math.min(...tiempos)
    const tMax = Math.max(...tiempos)
    const plotW = ancho - M.left - M.right
    const plotH = ALTO - M.top - M.bottom
    const x = (t) => (tMax === tMin ? M.left + plotW / 2 : M.left + ((t - tMin) / (tMax - tMin)) * plotW)
    const y = (v) => M.top + ((yMax - v) / (yMax - yMin)) * plotH
    // 4 marcas enteras repartidas en el rango
    const paso = Math.max(1, Math.round((yMax - yMin) / 4))
    const ticks = []
    for (let v = yMax; v >= yMin; v -= paso) ticks.push(v)
    return { x, y, ticks, plotW }
  }, [registros, limiteCriticoC, ancho])

  if (registros.length === 0) {
    return (
      <section className="bg-white p-6">
        <h2 className="label-caps text-gray-900 mb-2">Curva térmica registrada durante el proceso (°C)</h2>
        <p className="text-sm text-gray-600">Sin registros manuales de temperatura para este expediente.</p>
      </section>
    )
  }

  const puntos = registros.map((r) => ({ ...r, px: escala.x(new Date(r.fechaHora).getTime()), py: escala.y(r.temperaturaC) }))
  const d = puntos.map((p, i) => `${i ? 'L' : 'M'}${p.px},${p.py}`).join(' ')
  const yLimite = escala.y(limiteCriticoC)
  const primero = puntos[0]
  const ultimo = puntos[puntos.length - 1]

  // Punto más cercano al cursor (crosshair)
  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const mx = ((e.clientX - rect.left) / rect.width) * ancho
    let mejor = 0
    puntos.forEach((p, i) => { if (Math.abs(p.px - mx) < Math.abs(puntos[mejor].px - mx)) mejor = i })
    setActivo(mejor)
  }

  const act = activo !== null ? puntos[activo] : null

  return (
    <section className="bg-white p-6" aria-labelledby="curva-termica">
      <div className="flex items-start justify-between gap-4 mb-4">
        <h2 id="curva-termica" className="flex items-center gap-2 label-caps text-gray-900">
          <TrendingDown className="h-4 w-4 text-primary" aria-hidden="true" />
          Curva térmica registrada durante el proceso (°C)
        </h2>
        <button
          type="button"
          onClick={() => setVerTabla((v) => !v)}
          className="inline-flex items-center gap-1.5 text-xs px-2 py-1 bg-gray-50 hover:bg-gray-100 text-gray-900"
        >
          {verTabla ? <ChartLine className="h-3.5 w-3.5" /> : <Table2 className="h-3.5 w-3.5" />}
          {verTabla ? 'Ver gráfica' : 'Ver tabla'}
        </button>
      </div>

      {verTabla ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                {['Hora', 'Temperatura', 'Punto de medición', 'Registró', 'Estado'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.08em] text-gray-900">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 even:bg-gray-50">
                  <td className="px-3 py-2 font-mono">{hora(r.fechaHora)}</td>
                  <td className="px-3 py-2 font-mono">{temp(r.temperaturaC)}</td>
                  <td className="px-3 py-2">{r.origen}{r.observaciones ? ` · ${r.observaciones}` : ''}</td>
                  <td className="px-3 py-2">{r.usuario || '—'}</td>
                  <td className="px-3 py-2">{r.fueraDeRango ? <span className="text-danger font-medium">Fuera de rango</span> : 'Conforme'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={contenedor} className="relative">
          <svg
            width={ancho}
            height={ALTO}
            role="img"
            aria-label={`Temperatura de ${temp(primero.temperaturaC)} a ${temp(ultimo.temperaturaC)} en ${registros.length} mediciones; límite crítico ${limiteCriticoC} °C`}
            onMouseMove={onMove}
            onMouseLeave={() => setActivo(null)}
            className="block"
          >
            {/* Rejilla y eje Y (recesivos) */}
            {escala.ticks.map((v) => (
              <g key={v}>
                <line x1={M.left} x2={ancho - M.right} y1={escala.y(v)} y2={escala.y(v)} stroke={REJILLA} strokeWidth="1" />
                <text x={M.left - 8} y={escala.y(v)} textAnchor="end" dominantBaseline="middle" fontSize="11" fill={TINTA} className="font-mono">{v}°</text>
              </g>
            ))}

            {/* Límite crítico: color de estado + etiqueta */}
            <line x1={M.left} x2={ancho - M.right} y1={yLimite} y2={yLimite} stroke={CRITICO} strokeWidth="1" />
            <text x={ancho - M.right} y={yLimite - 6} textAnchor="end" fontSize="11" fill={CRITICO} className="font-mono">
              Límite crítico operativo {limiteCriticoC.toFixed(1)} °C
            </text>

            {/* Serie */}
            <path d={d} fill="none" stroke={SERIE} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

            {act && <line x1={act.px} x2={act.px} y1={M.top} y2={ALTO - M.bottom} stroke={TINTA} strokeWidth="1" />}

            {puntos.map((p, i) => (
              <circle
                key={p.id}
                cx={p.px}
                cy={p.py}
                r={i === activo ? 6 : 4}
                fill={p.fueraDeRango ? CRITICO : SERIE}
                stroke="var(--lt-capa)"
                strokeWidth="2"
              />
            ))}

            {/* Etiquetas directas selectivas: primera y última medición */}
            <text x={primero.px} y={primero.py - 10} textAnchor="start" fontSize="11" fill="var(--color-gray-900)" className="font-mono">
              {temp(primero.temperaturaC)}
            </text>
            {ultimo !== primero && (
              <text x={ultimo.px} y={ultimo.py - 10} textAnchor="end" fontSize="11" fill="var(--color-gray-900)" className="font-mono">
                {temp(ultimo.temperaturaC)}
              </text>
            )}

            {/* Eje X: primera y última hora */}
            <text x={primero.px} y={ALTO - 8} textAnchor="start" fontSize="11" fill={TINTA} className="font-mono">{hora(primero.fechaHora)}</text>
            {ultimo !== primero && (
              <text x={ultimo.px} y={ALTO - 8} textAnchor="end" fontSize="11" fill={TINTA} className="font-mono">{hora(ultimo.fechaHora)}</text>
            )}
          </svg>

          {act && (
            <div
              className="pointer-events-none absolute z-10 bg-gray-900 text-white text-xs px-3 py-2 shadow-level2 whitespace-nowrap"
              style={{
                left: Math.min(Math.max(act.px - 90, 0), ancho - 180),
                top: Math.max(act.py - 70, 0),
              }}
            >
              <p className="font-mono font-semibold">{temp(act.temperaturaC)} · {hora(act.fechaHora)}</p>
              <p className="text-gray-100">{act.origen}</p>
              {act.fueraDeRango && <p className="text-[#ff8389] font-medium">Fuera de rango</p>}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
