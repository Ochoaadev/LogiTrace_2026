import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { residuoService } from '../residuoService'

export function useResiduos(filters = {}, pagination = { page: 1, limit: 10 }) {
  return useQuery({
    queryKey: ['residuos', filters, pagination],
    queryFn: () => residuoService.getAll({ ...filters, ...pagination }),
    staleTime: 30_000,
  })
}

// Indicadores del módulo 08 (mes en curso), gestores y porcentaje con destino trazable
export function useResiduosResumen() {
  return useQuery({
    queryKey: ['residuos', 'resumen'],
    queryFn: () => residuoService.getResumen(),
    select: (res) => res.data,
    staleTime: 30_000,
  })
}

export function useResiduo(id) {
  return useQuery({
    queryKey: ['residuos', 'detalle', id],
    queryFn: () => residuoService.getById(id),
    select: (res) => res.data,
    enabled: !!id,
  })
}

// Un residuo que viene de una devolución deja eventos en el expediente del pedido
function useMutacionResiduo(mutationFn) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      for (const key of ['residuos', 'devoluciones', 'trazabilidad']) {
        queryClient.invalidateQueries({ queryKey: [key] })
      }
    },
  })
}

export const useCreateResiduo = () => useMutacionResiduo((data) => residuoService.create(data))

export const useCambiarEstadoResiduo = () =>
  useMutacionResiduo(({ id, ...cambio }) => residuoService.updateEstado(id, cambio))
