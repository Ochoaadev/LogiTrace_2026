import { ConfirmarDialog } from '@/components/ConfirmarDialog'
import { useDespacho } from '@/services/query/useDespachos'

// Paradas que al finalizar el despacho se dan por entregadas (las devueltas o con incidencia no)
const PARADAS_ABIERTAS = ['PENDIENTE', 'EN_RUTA', 'EN_ESPERA']

/**
 * Confirmación de un cambio de estado del despacho, común al detalle, la lista y el tablero.
 * Carga las paradas del despacho para advertir cuántas se darán por entregadas al finalizar.
 */
export function ConfirmarEstadoDespacho({ despacho, destino, onConfirmar, onClose }) {
  const { data, isLoading } = useDespacho(despacho.id)
  const paradas = data?.data?.pedidos || []
  const abiertas = paradas.filter((p) => PARADAS_ABIERTAS.includes(p.estado))

  const c = destino === 'FINALIZADO'
    ? {
        titulo: `Finalizar el despacho ${despacho.codigo}`,
        descripcion: isLoading
          ? 'Revisando las paradas del despacho…'
          : abiertas.length
            ? `Hay ${abiertas.length} parada(s) sin entrega registrada: al finalizar se darán por ENTREGADAS. Las devueltas o con incidencia conservan su estado.`
            : 'Todas las paradas tienen su resultado registrado. El despacho se cierra y el repartidor queda disponible.',
        boton: abiertas.length ? `Finalizar y dar ${abiertas.length} por entregada(s)` : 'Finalizar despacho',
        peligro: abiertas.length > 0,
      }
    : {
        titulo: `Registrar la salida a ruta de ${despacho.codigo}`,
        descripcion: `Se fija la hora de salida y ${paradas.length === 1 ? 'el pedido pasa' : 'los pedidos pasan'} a "En ruta". Verifique antes la carga, el medio de conservación y la temperatura.`,
        boton: 'Registrar salida',
      }

  return (
    <ConfirmarDialog
      titulo={c.titulo}
      descripcion={c.descripcion}
      textoConfirmar={c.boton}
      peligro={c.peligro}
      deshabilitado={isLoading}
      onConfirmar={onConfirmar}
      onClose={onClose}
    >
      {destino === 'FINALIZADO' && abiertas.length > 0 && (
        <ul className="divide-y divide-gray-100 bg-gray-50 text-sm">
          {abiertas.map((p) => (
            <li key={p.id} className="px-3 py-2">
              <span className="font-mono text-xs text-gray-600">Parada {p.ordenParada} · {p.pedido?.codigo}</span>
              <span className="block text-gray-900 truncate">{p.pedido?.cliente?.razonSocial}</span>
            </li>
          ))}
        </ul>
      )}
    </ConfirmarDialog>
  )
}
