import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { devolucionService } from '../devolucionService'

export function useDevoluciones(filters = {}, pagination = { page: 1, limit: 10 }) {
  return useQuery({
    queryKey: ['devoluciones', filters, pagination],
    queryFn: () => devolucionService.getAll({ ...filters, ...pagination }),
    staleTime: 30_000,
  })
}

export function useDevolucion(id) {
  return useQuery({
    queryKey: ['devoluciones', id],
    queryFn: () => devolucionService.getById(id),
    enabled: !!id,
    staleTime: 30_000,
  })
}

export function useCreateDevolucion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => devolucionService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devoluciones'] })
    },
  })
}

export function useProcesarDevolucion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, accion, observaciones }) => devolucionService.procesar(id, accion, observaciones),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['devoluciones'] })
      queryClient.invalidateQueries({ queryKey: ['devoluciones', id] })
    },
  })
}