import { Snowflake, Thermometer, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { hora, temp, ESTADO_PEDIDO_LABEL, ESTADO_PEDIDO_VARIANT } from './formato'

const VARIANT_CLASS = {
  default: 'bg-gray-100 text-gray-900',
  info: 'bg-primary-light text-[#002d9c]',
  success: 'bg-success-light text-[#044317]',
  warning: 'bg-warning-light text-[#684e00]',
  danger: 'bg-danger-light text-[#a2191f]',
}

function Columna({ titulo, children }) {
  return (
    <div className="min-w-0">
      <p className="label-caps mb-2">{titulo}</p>
      <div className="text-sm text-gray-700 space-y-0.5">{children}</div>
    </div>
  )
}

function EstadoCadenaFrio({ cadenaFrio }) {
  if (cadenaFrio.conforme === null) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 bg-gray-100 text-gray-700">
        <Thermometer className="h-3.5 w-3.5" aria-hidden="true" /> Sin registros de temperatura
      </span>
    )
  }
  return cadenaFrio.conforme ? (
    <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 bg-success-light text-[#044317] font-medium">
      <Snowflake className="h-3.5 w-3.5" aria-hidden="true" /> Cadena de frío preservada ({temp(cadenaFrio.ultima?.temperaturaC)})
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 bg-danger-light text-[#a2191f] font-medium">
      <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" /> Cadena de frío con registros fuera de rango
    </span>
  )
}

export function ExpedienteResumen({ expediente }) {
  const { pedido, cliente, carga, logistica, cadenaFrio } = expediente
  const variant = ESTADO_PEDIDO_VARIANT[pedido.estado] || 'default'

  return (
    <section className="bg-white mb-6" aria-label={`Expediente ${pedido.codigo}`}>
      <header className="flex flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3 border-b border-gray-100">
        <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.06em] text-gray-900">
          <span className="h-2.5 w-2.5 bg-primary" aria-hidden="true" />
          Expediente seleccionado: <span className="font-mono">#{pedido.codigo}</span>
        </p>
        {(pedido.zona || pedido.municipio) && (
          <span className="font-mono text-xs text-gray-600">{[pedido.zona, pedido.municipio].filter(Boolean).join(', ')}</span>
        )}
        <span className={cn('text-xs font-semibold uppercase px-2 py-1', VARIANT_CLASS[variant])}>
          {ESTADO_PEDIDO_LABEL[pedido.estado] || pedido.estado}
        </span>
        <span className="lg:ml-auto"><EstadoCadenaFrio cadenaFrio={cadenaFrio} /></span>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 px-6 py-5">
        <Columna titulo="Cliente / receptor">
          <p className="font-semibold text-gray-900">{cliente.razonSocial}</p>
          <p className="text-xs">{pedido.direccionEntrega}</p>
          {(cliente.contacto || cliente.telefono) && (
            <p className="font-mono text-xs">Contacto: {[cliente.contacto, cliente.telefono].filter(Boolean).join(' · ')}</p>
          )}
        </Columna>

        <Columna titulo="Carga & producción">
          {carga.length === 0 && <p className="text-xs">Sin productos</p>}
          {carga.map((c) => (
            <div key={c.codigo}>
              <p className="font-semibold text-gray-900">{c.cantidad} {c.unidad} · {c.producto}</p>
              {c.lotes.length > 0 && <p className="font-mono text-xs">Lote: {c.lotes.join(', ')}</p>}
            </div>
          ))}
        </Columna>

        <Columna titulo="Logística & despacho">
          {logistica ? (
            <>
              <p className="font-semibold text-gray-900">
                {logistica.repartidor || 'Sin repartidor'}
                {logistica.vehiculo && ` (${logistica.vehiculo.codigo})`}
              </p>
              {logistica.medioConservacion && <p className="text-xs">{logistica.medioConservacion}</p>}
              <p className="text-xs">Despacho: <span className="font-mono">{logistica.codigo}</span> · salida {hora(logistica.salida)}</p>
              {logistica.precinto && <p className="font-mono text-xs text-primary">Precinto: {logistica.precinto}</p>}
            </>
          ) : (
            <p className="text-xs">Aún no asignado a un despacho</p>
          )}
        </Columna>

        <Columna titulo="Cadena de frío final">
          {cadenaFrio.ultima ? (
            <>
              <p className={cn('flex items-center gap-1.5 text-base font-semibold', cadenaFrio.ultima.fueraDeRango ? 'text-danger' : 'text-success')}>
                <Thermometer className="h-4 w-4" aria-hidden="true" />
                {temp(cadenaFrio.ultima.temperaturaC)}
              </p>
              <p className="text-xs">{cadenaFrio.ultima.origen} · {hora(cadenaFrio.ultima.fechaHora)}</p>
              <p className="font-mono text-xs">Parámetro conforme: ≤ {cadenaFrio.limiteCriticoC} °C</p>
            </>
          ) : (
            <p className="text-xs">Sin mediciones registradas</p>
          )}
        </Columna>
      </div>
    </section>
  )
}
