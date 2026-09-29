import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { incidenciaService } from '../incidenciaService'

export function useIncidencias(filters = {}, pagination = { page: 1, limit: 10 }) {
  return useQuery({
    queryKey: ['incidencias', filters, pagination],
    queryFn: () => incidenciaService.getAll({ ...filters, ...pagination }),
    staleTime: 30_000,
  })
}

// Indicadores del módulo 04 y paradas en tránsito para el registro rápido
export function useIncidenciasResumen() {
  return useQuery({
    queryKey: ['incidencias', 'resumen'],
    queryFn: () => incidenciaService.getResumen(),
    select: (res) => res.data,
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
      // Reportar una incidencia cambia el estado de la parada, del despacho y del pedido
      queryClient.invalidateQueries({ queryKey: ['incidencias'] })
      queryClient.invalidateQueries({ queryKey: ['despachos'] })
      queryClient.invalidateQueries({ queryKey: ['pedidos'] })
      queryClient.invalidateQueries({ queryKey: ['trazabilidad'] })
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
// Cambio de estado con decisión operativa. Resolver o anular devuelve la parada, el pedido y el
// despacho a ruta, así que también se refrescan esos módulos.
export function useCambiarEstadoIncidencia() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, estado, decisionOperativa }) => incidenciaService.updateEstado(id, estado, decisionOperativa),
    onSuccess: () => {
      for (const key of ['incidencias', 'despachos', 'pedidos', 'trazabilidad']) {
        queryClient.invalidateQueries({ queryKey: [key] })
      }
    },
  })
}
