import { cn } from '@/lib/utils'
import { hora } from './formato'

// Color de la tarjeta y del punto según la categoría del evento (Figma: incidencia roja,
// logística inversa gris oscuro, inventario azul, cierre verde)
const ESTILO = {
  operacion: { card: 'bg-gray-50', dot: 'bg-primary', tag: 'bg-white text-gray-700' },
  incidencia: { card: 'bg-danger-light', dot: 'bg-danger', tag: 'bg-white text-[#a2191f]', title: 'text-[#a2191f]' },
  inversa: { card: 'bg-gray-100', dot: 'bg-gray-900', tag: 'bg-white text-gray-900' },
  inventario: { card: 'bg-primary-light', dot: 'bg-primary', tag: 'bg-white text-[#002d9c]' },
  cierre: { card: 'bg-gray-50', dot: 'bg-success', tag: 'bg-white text-[#044317]' },
  residuo: { card: 'bg-gray-50', dot: 'bg-success', tag: 'bg-white text-gray-700' },
}

const ESTADO_LABEL = (s) => (s ? s.replaceAll('_', ' ').toLowerCase() : null)

export function LineaTemporal({ eventos }) {
  return (
    <section className="bg-white p-6" aria-labelledby="linea-temporal">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h2 id="linea-temporal" className="text-base font-semibold text-gray-900">Línea temporal de eventos operativos</h2>
          <p className="text-sm text-gray-600">Secuencia cronológica verificada paso a paso</p>
        </div>
        <span className="font-mono text-xs bg-gray-50 px-2 py-1 text-gray-700 whitespace-nowrap">
          {eventos.length} {eventos.length === 1 ? 'evento auditado' : 'eventos auditados'}
        </span>
      </div>

      {eventos.length === 0 ? (
        <p className="text-sm text-gray-600 py-8 text-center">Este expediente todavía no tiene eventos registrados.</p>
      ) : (
        <ol className="relative">
          {/* Riel vertical */}
          <span className="absolute left-[5px] top-2 bottom-2 w-px bg-gray-200" aria-hidden="true" />
          {eventos.map((e, i) => {
            const estilo = ESTILO[e.categoria] || ESTILO.operacion
            return (
              <li key={e.id} className="relative pl-8 pb-4 last:pb-0">
                <span className={cn('absolute left-0 top-4 h-[11px] w-[11px] rounded-full ring-2 ring-white', estilo.dot)} aria-hidden="true" />
                <article className={cn('p-4', estilo.card)}>
                  <header className="flex flex-wrap items-start gap-x-4 gap-y-1">
                    <time className="font-mono text-xs font-semibold text-primary pt-0.5" dateTime={e.fechaHora}>
                      {hora(e.fechaHora)}
                    </time>
                    <h3 className={cn('flex-1 min-w-[12rem] text-sm font-semibold text-gray-900', estilo.title)}>
                      Evento {i + 1} · {e.titulo}
                    </h3>
                    <span className={cn('font-mono text-[11px] uppercase tracking-wide px-2 py-0.5', estilo.tag)}>
                      Módulo {e.modulo.numero} · {e.modulo.nombre}
                    </span>
                  </header>
                  {e.descripcion && <p className="mt-2 text-sm text-gray-700">{e.descripcion}</p>}
                  <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-1 font-mono text-xs text-gray-600">
                    {e.usuario && (
                      <div>
                        <dt className="inline">Operador: </dt>
                        <dd className="inline text-gray-900">{e.usuario}</dd>
                      </div>
                    )}
                    {e.estadoNuevo && (
                      <div>
                        <dt className="inline">Estado: </dt>
                        <dd className="inline text-gray-900">
                          {e.estadoAnterior ? `${ESTADO_LABEL(e.estadoAnterior)} → ` : ''}
                          {ESTADO_LABEL(e.estadoNuevo)}
                        </dd>
                      </div>
                    )}
                    {e.ubicacion && (
                      <div>
                        <dt className="inline">GPS: </dt>
                        <dd className="inline text-gray-900">{e.ubicacion.lat.toFixed(4)}, {e.ubicacion.lng.toFixed(4)}</dd>
                      </div>
                    )}
                  </dl>
                </article>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
