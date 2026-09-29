import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { TrazabilidadService } from '../trazabilidadService'

export function useBuscarExpedientes(filtros, { enabled = true } = {}) {
  return useQuery({
    queryKey: ['trazabilidad', 'expedientes', filtros],
    queryFn: () => TrazabilidadService.buscarExpedientes(filtros),
    enabled,
    staleTime: 30_000,
  })
}

export function useExpediente(pedidoId) {
  return useQuery({
    queryKey: ['trazabilidad', 'expediente', pedidoId],
    queryFn: () => TrazabilidadService.getExpediente(pedidoId),
    select: (res) => res.data,
    enabled: !!pedidoId,
    staleTime: 30_000,
  })
}

export function useRegistrarTemperatura() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => TrazabilidadService.registrarTemperatura(data),
    onSuccess: () => {
      // Una medición puede ser de cava (inventario), de un despacho o de una devolución
      for (const key of ['trazabilidad', 'despachos', 'inventario', 'pedidos', 'devoluciones']) {
        queryClient.invalidateQueries({ queryKey: [key] })
      }
    },
  })
}

// Línea temporal de un despacho (eventos propios y de sus pedidos), mismo formato que el expediente
export function useTrazabilidadDespacho(despachoId) {
  return useQuery({
    queryKey: ['trazabilidad', 'despacho', despachoId],
    queryFn: () => TrazabilidadService.getByDespacho(despachoId, { limit: 100 }),
    select: (res) => res.data,
    enabled: !!despachoId,
    staleTime: 30_000,
  })
}
