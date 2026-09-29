import { useMemo, useState } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, WifiOff } from 'lucide-react'
import { hora } from './formato'

// Colores de marca (Leaflet dibuja en SVG y no lee clases de Tailwind)
const AZUL = '#0f62fe'
const VERDE = '#198038'
const NEGRO = '#161616'

/**
 * Recorrido GPS del despacho (UbicacionGPS) y punto de entrega del pedido.
 * Los mosaicos vienen de OpenStreetMap (requiere internet); sin conexión se sigue
 * dibujando el trazado sobre fondo neutro y se avisa.
 */
/**
 * soloPosiciones: los puntos son la posición actual de varias unidades (no un recorrido), así que
 * se dibujan como marcadores independientes, sin trazado.
 */
export function MapaRecorrido({ gps, zona, soloPosiciones = false, titulo = 'Sector recorrido' }) {
  const [sinMosaicos, setSinMosaicos] = useState(false)
  const { puntos, destino } = gps
  // Un expediente tiene un destino; un despacho, uno por parada (gps.destinos)
  const destinos = useMemo(() => gps.destinos || (destino ? [destino] : []), [gps.destinos, destino])

  const posiciones = useMemo(() => puntos.map((p) => [p.lat, p.lng]), [puntos])
  const todos = useMemo(
    () => [...posiciones, ...destinos.map((d) => [d.lat, d.lng])],
    [posiciones, destinos]
  )

  const inicio = puntos[0]
  const fin = puntos[puntos.length - 1]

  return (
    <section className="bg-white p-5" aria-labelledby="sector-recorrido">
      <div className="flex items-start justify-between gap-2 mb-3">
        <h2 id="sector-recorrido" className="label-caps text-gray-900">{titulo}</h2>
        {zona && <span className="text-xs text-gray-600 text-right">{zona}</span>}
      </div>

      {todos.length === 0 ? (
        <div className="h-56 bg-gray-50 flex flex-col items-center justify-center gap-2 text-sm text-gray-600 text-center px-4">
          <MapPin className="h-6 w-6" aria-hidden="true" />
          Sin posiciones GPS registradas para este expediente.
        </div>
      ) : (
        <div className="relative">
          <MapContainer
            bounds={todos}
            boundsOptions={{ padding: [24, 24], maxZoom: 16 }}
            scrollWheelZoom={false}
            className="h-64 w-full bg-gray-100 z-0"
            attributionControl
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              eventHandlers={{ tileerror: () => setSinMosaicos(true) }}
            />
            {soloPosiciones && puntos.map((p, i) => (
              <CircleMarker key={`${p.despacho}-${i}`} center={[p.lat, p.lng]} radius={7} pathOptions={{ color: '#fff', weight: 2, fillColor: AZUL, fillOpacity: 1 }}>
                <Tooltip>{p.despacho}{p.repartidor ? ` · ${p.repartidor}` : ''} · {hora(p.fechaHora)}</Tooltip>
              </CircleMarker>
            ))}
            {!soloPosiciones && posiciones.length > 1 && (
              <Polyline positions={posiciones} pathOptions={{ color: AZUL, weight: 3, lineCap: 'round', lineJoin: 'round' }} />
            )}
            {!soloPosiciones && inicio && (
              <CircleMarker center={[inicio.lat, inicio.lng]} radius={6} pathOptions={{ color: '#fff', weight: 2, fillColor: NEGRO, fillOpacity: 1 }}>
                <Tooltip>Salida · {hora(inicio.fechaHora)}</Tooltip>
              </CircleMarker>
            )}
            {!soloPosiciones && fin && fin !== inicio && (
              <CircleMarker center={[fin.lat, fin.lng]} radius={6} pathOptions={{ color: '#fff', weight: 2, fillColor: AZUL, fillOpacity: 1 }}>
                <Tooltip>Última posición · {hora(fin.fechaHora)}</Tooltip>
              </CircleMarker>
            )}
            {destinos.map((d, i) => (
              <CircleMarker key={`${d.lat},${d.lng},${i}`} center={[d.lat, d.lng]} radius={7} pathOptions={{ color: '#fff', weight: 2, fillColor: VERDE, fillOpacity: 1 }}>
                <Tooltip>{d.etiqueta || 'Destino'} · {d.direccion}</Tooltip>
              </CircleMarker>
            ))}
          </MapContainer>
          {sinMosaicos && (
            <p className="absolute left-2 right-2 bottom-2 z-[400] flex items-center gap-2 bg-white/95 px-2 py-1 text-xs text-gray-700">
              <WifiOff className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
              Sin conexión al servidor de mapas: se muestra solo el trazado GPS.
            </p>
          )}
        </div>
      )}

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-700" aria-label="Leyenda del mapa">
        {soloPosiciones ? (
          <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: AZUL }} />Unidades en ruta ({puntos.length})</li>
        ) : (
          <>
            <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: NEGRO }} />Salida</li>
            <li className="flex items-center gap-1.5"><span className="h-0.5 w-4" style={{ background: AZUL }} />Trayecto ({puntos.length} posiciones)</li>
          </>
        )}
        <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: VERDE }} />{destinos.length > 1 ? `Destinos (${destinos.length})` : 'Destino'}</li>
      </ul>
      {inicio && !soloPosiciones && (
        <p className="mt-2 text-xs text-gray-600">
          Trayecto registrado de {hora(inicio.fechaHora)} a {hora(fin.fechaHora)}
          {destinos.length === 1 && ` con destino ${destinos[0].direccion}`}
          {destinos.length > 1 && ` con ${destinos.length} paradas`}.
        </p>
      )}
    </section>
  )
}
