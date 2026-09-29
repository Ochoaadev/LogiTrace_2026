import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Crosshair, X, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { posicionActual } from '@/lib/useSeguimientoGPS'

// Centro de Valera (Av. Bolívar): vista inicial cuando aún no hay ubicación
const VALERA = [9.3186, -70.6035]

// Marcador propio (el ícono por defecto de Leaflet depende de imágenes que Vite no resuelve)
const icono = L.divIcon({
  className: '',
  html: '<span style="display:block;width:22px;height:22px;border-radius:50% 50% 50% 0;background:#0f62fe;border:3px solid #fff;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,.35)"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 22],
})

function Clics({ onElegir }) {
  useMapEvents({ click: (e) => onElegir({ lat: e.latlng.lat, lng: e.latlng.lng }) })
  return null
}

function Centrar({ punto }) {
  const map = useMap()
  useEffect(() => {
    if (punto) map.setView([punto.lat, punto.lng], Math.max(map.getZoom(), 16), { animate: true })
  }, [map, punto])
  return null
}

/**
 * Selector de la ubicación de entrega: clic en el mapa (o arrastrar el marcador) o la posición GPS
 * del equipo. `valor` = { lat, lng } | null.
 */
export function MapaSelector({ valor, onChange }) {
  const [buscando, setBuscando] = useState(false)
  const [aviso, setAviso] = useState(null)
  const [centrarEn, setCentrarEn] = useState(null)

  const usarMiUbicacion = async () => {
    setAviso(null)
    setBuscando(true)
    const p = await posicionActual()
    setBuscando(false)
    if (!p) {
      setAviso(window.isSecureContext ? 'No se pudo obtener la ubicación del equipo (permiso denegado o sin señal).' : 'El GPS del navegador requiere HTTPS.')
      return
    }
    const punto = { lat: p.latitud, lng: p.longitud }
    onChange(punto)
    setCentrarEn(punto)
  }

  return (
    <div className="grid gap-2">
      <div className="relative">
        <MapContainer center={valor ? [valor.lat, valor.lng] : VALERA} zoom={valor ? 16 : 14} scrollWheelZoom className="h-64 w-full bg-gray-100 z-0">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
          <Clics onElegir={onChange} />
          {centrarEn && <Centrar punto={centrarEn} />}
          {valor && (
            <Marker
              position={[valor.lat, valor.lng]}
              icon={icono}
              draggable
              eventHandlers={{ dragend: (e) => { const { lat, lng } = e.target.getLatLng(); onChange({ lat, lng }) } }}
            />
          )}
        </MapContainer>
        {!valor && (
          <p className="pointer-events-none absolute left-14 right-2 top-2 z-[400] flex items-center gap-1.5 bg-white/95 px-2 py-1 text-xs text-gray-700">
            <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" aria-hidden="true" />
            Haga clic en el mapa para marcar el punto de entrega
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={usarMiUbicacion} loading={buscando} disabled={buscando}>
          {!buscando && <Crosshair className="h-4 w-4" aria-hidden="true" />} Usar mi ubicación actual
        </Button>
        {valor && (
          <>
            <span className="font-mono text-xs text-gray-700">{valor.lat.toFixed(5)}, {valor.lng.toFixed(5)}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}><X className="h-4 w-4" aria-hidden="true" /> Quitar</Button>
          </>
        )}
      </div>
      {aviso && <p role="alert" className="text-xs text-danger">{aviso}</p>}
    </div>
  )
}
