import { Link } from 'react-router-dom'
import { FileText, Thermometer, Lock, CircleCheck, TriangleAlert, ChevronRight, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fechaHora } from './formato'

function Tarjeta({ titulo, icono, children }) {
  return (
    <section className="bg-white p-5">
      <div className="flex items-start justify-between gap-2 mb-4">
        <h2 className="label-caps text-gray-900">{titulo}</h2>
        {icono}
      </div>
      {children}
    </section>
  )
}

function Evidencia({ icon: Icon, titulo, detalle, accion }) {
  return (
    <div className="flex items-center gap-3 bg-gray-50 p-3">
      <Icon className="h-5 w-5 text-primary flex-shrink-0" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 break-words">{titulo}</p>
        {detalle && <p className="text-xs text-gray-600">{detalle}</p>}
      </div>
      {accion}
    </div>
  )
}

export function PanelLateral({ expediente, puedeExportar, exportando, onDescargarPdf, puedeRegistrarTemp, onRegistrarTemp }) {
  const { evidencias, responsables, logistica, incidencias, devoluciones, movimientos } = expediente
  const todasVerificadas = evidencias.precinto?.integro !== false && evidencias.registrosTemperatura > 0

  // Enlaces a los registros de otros módulos que originaron este expediente
  const accesos = [
    logistica && { n: '03', label: `Ver despacho ${logistica.codigo}`, to: `/despachos/${logistica.despachoId}` },
    ...incidencias.map((i) => ({ n: '04', label: `Ver incidencia ${i.codigo}`, to: `/incidencias/${i.id}` })),
    ...devoluciones.map((d) => ({ n: '05', label: `Ver devolución ${d.codigo}`, to: `/devoluciones/${d.id}` })),
    ...movimientos.map((m) => ({ n: '06', label: `Ver kardex del lote ${m.lote} (${m.tipo.toLowerCase()})`, to: `/inventario/movimiento/${m.loteId}` })),
  ].filter(Boolean)

  return (
    <div className="space-y-6">
      <Tarjeta
        titulo="Evidencias digitales y firmas"
        icono={todasVerificadas ? <CircleCheck className="h-5 w-5 text-success" aria-label="Evidencias verificadas" /> : null}
      >
        <div className="space-y-2">
          {evidencias.guiaDespacho ? (
            <Evidencia
              icon={FileText}
              titulo={`Guía ${evidencias.guiaDespacho.codigo}`}
              detalle="Expediente completo en PDF"
              accion={
                puedeExportar && (
                  <button
                    type="button"
                    onClick={onDescargarPdf}
                    disabled={exportando}
                    className="font-mono text-xs px-2 py-1 bg-white border border-gray-300 hover:bg-gray-100 disabled:opacity-50"
                  >
                    {exportando ? '…' : 'PDF'}
                  </button>
                )
              }
            />
          ) : (
            <Evidencia icon={FileText} titulo="Sin guía de despacho" detalle="El pedido aún no fue despachado" />
          )}

          <Evidencia
            icon={Thermometer}
            titulo={`${evidencias.registrosTemperatura} registro(s) de temperatura`}
            detalle="Medición manual"
            accion={
              puedeRegistrarTemp && (
                <button
                  type="button"
                  onClick={onRegistrarTemp}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-white border border-gray-300 hover:bg-gray-100"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Registrar
                </button>
              )
            }
          />

          {evidencias.precinto ? (
            <Evidencia
              icon={Lock}
              titulo={`Precinto ${evidencias.precinto.codigo}`}
              detalle={evidencias.precinto.integro ? 'Sin rotura ni manipulación' : 'Sello reportado como no íntegro'}
              accion={
                evidencias.precinto.integro
                  ? <CircleCheck className="h-5 w-5 text-success" aria-label="Íntegro" />
                  : <TriangleAlert className="h-5 w-5 text-danger" aria-label="No íntegro" />
              }
            />
          ) : (
            <Evidencia icon={Lock} titulo="Sin precinto registrado" />
          )}

          {evidencias.entrega && (
            <Evidencia
              icon={CircleCheck}
              titulo={`Entregado a ${evidencias.entrega.receptor || '—'}`}
              detalle={fechaHora(evidencias.entrega.fechaHora)}
            />
          )}
        </div>

        {responsables.length > 0 && (
          <div className="mt-6">
            <h3 className="label-caps mb-3">Responsables involucrados</h3>
            <dl className="space-y-2 text-sm">
              {responsables.map((r) => (
                <div key={`${r.funcion}-${r.nombre}`} className="grid grid-cols-2 gap-3">
                  <dt className="text-gray-600">{r.funcion}</dt>
                  <dd className="text-gray-900 text-right">{r.nombre}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </Tarjeta>

      <Tarjeta titulo="Acceso directo cruzado">
        <p className="text-sm text-gray-600 mb-3">Navegación directa a los registros generadores de esta auditoría:</p>
        {accesos.length === 0 ? (
          <p className="text-sm text-gray-500">Sin registros relacionados todavía.</p>
        ) : (
          <ul className="space-y-2">
            {accesos.map((a) => (
              <li key={a.to + a.label}>
                <Link
                  to={a.to}
                  className={cn('flex items-center gap-3 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 hover:bg-gray-100')}
                >
                  <span className="font-mono text-xs text-danger">{a.n}</span>
                  <span className="flex-1 min-w-0 truncate">{a.label}</span>
                  <ChevronRight className="h-4 w-4 text-gray-600" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>
    </div>
  )
}
