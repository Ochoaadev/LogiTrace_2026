import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { incidenciaService } from '../incidenciaService'

export function useIncidencias(filters = {}, pagination = { page: 1, limit: 10 }) {
  return useQuery({
    queryKey: ['incidencias', filters, pagination],
    queryFn: () => incidenciaService.getAll({ ...filters, ...pagination }),
    staleTime: 30_000,
  })
}

export function useIncidencia(id) {
  return useQuery({
    queryKey: ['incidencias', id],
    queryFn: () => incidenciaService.getById(id),
    enabled: !!id,
    staleTime: 30_000,
  })
}

export function useCreateIncidencia() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => incidenciaService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidencias'] })
    },
  })
}

export function useUpdateIncidencia() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => incidenciaService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['incidencias'] })
      queryClient.invalidateQueries({ queryKey: ['incidencias', id] })
    },
  })
}

export function useResolverIncidencia() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, resolucion }) => incidenciaService.resolver(id, resolucion),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['incidencias'] })
      queryClient.invalidateQueries({ queryKey: ['incidencias', id] })
    },
  })
}