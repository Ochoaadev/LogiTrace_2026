import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { despachoService } from '../despachoService'

export function useDespachos(filters = {}, pagination = { page: 1, limit: 10 }) {
  return useQuery({
    queryKey: ['despachos', filters, pagination],
    queryFn: () => despachoService.getAll({ ...filters, ...pagination }),
    staleTime: 30_000,
  })
}

// Indicadores del módulo 03 (tarjetas, pestañas y resumen de flota)
export function useDespachosResumen() {
  return useQuery({
    queryKey: ['despachos', 'resumen'],
    queryFn: () => despachoService.getResumen(),
    select: (res) => res.data,
    staleTime: 30_000,
  })
}

export function useDespacho(id) {
  return useQuery({
    queryKey: ['despachos', id],
    queryFn: () => despachoService.getById(id),
    enabled: !!id,
    staleTime: 30_000,
  })
}

export function useFlujoOperativo() {
  return useQuery({
    queryKey: ['despachos', 'flujo-operativo'],
    queryFn: () => despachoService.getFlujoOperativo(),
    select: (res) => res.data,
    staleTime: 15_000,
  })
}

export function useCreateDespacho() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => despachoService.create(data),
    onSuccess: () => {
      // Crear un despacho cambia el estado de sus pedidos y del repartidor
      queryClient.invalidateQueries({ queryKey: ['despachos'] })
      queryClient.invalidateQueries({ queryKey: ['pedidos'] })
      queryClient.invalidateQueries({ queryKey: ['catalogos', 'repartidores'] })
    },
  })
}

export function useUpdateDespacho() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => despachoService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['despachos'] })
      queryClient.invalidateQueries({ queryKey: ['despachos', id] })
    },
  })
}

export function useUpdateEstadoDespacho() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, estado, observaciones }) => despachoService.updateEstado(id, estado, observaciones),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['despachos'] })
      queryClient.invalidateQueries({ queryKey: ['despachos', id] })
      queryClient.invalidateQueries({ queryKey: ['despachos', 'flujo-operativo'] })
      queryClient.invalidateQueries({ queryKey: ['pedidos'] })
      queryClient.invalidateQueries({ queryKey: ['trazabilidad'] })
      queryClient.invalidateQueries({ queryKey: ['catalogos', 'repartidores'] })
    },
  })
}

export function useAsignarRepartidor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, repartidorId }) => despachoService.asignarRepartidor(id, repartidorId),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['despachos'] })
      queryClient.invalidateQueries({ queryKey: ['despachos', id] })
    },
  })
}