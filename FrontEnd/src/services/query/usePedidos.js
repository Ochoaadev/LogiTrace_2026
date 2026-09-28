import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { pedidoService } from '../pedidoService'

export function usePedidos(filters = {}, pagination = { page: 1, limit: 10 }) {
  return useQuery({
    queryKey: ['pedidos', filters, pagination],
    queryFn: () => pedidoService.getAll({ ...filters, ...pagination }),
    staleTime: 30_000,
  })
}

export function usePedido(id) {
  return useQuery({
    queryKey: ['pedidos', id],
    queryFn: () => pedidoService.getById(id),
    enabled: !!id,
    staleTime: 30_000,
  })
}

export function useCreatePedido() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => pedidoService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] })
    },
  })
}

export function useUpdatePedido() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => pedidoService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] })
      queryClient.invalidateQueries({ queryKey: ['pedidos', id] })
    },
  })
}

export function useUpdateEstadoPedido() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, estado }) => pedidoService.updateEstado(id, estado),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] })
      queryClient.invalidateQueries({ queryKey: ['pedidos', id] })
    },
  })
}

export function useCancelPedido() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, motivo }) => pedidoService.cancel(id, motivo),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] })
      queryClient.invalidateQueries({ queryKey: ['pedidos', id] })
    },
  })
}

export function useAsignarDespacho() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, despachoId }) => pedidoService.assignDespacho(id, despachoId),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] })
      queryClient.invalidateQueries({ queryKey: ['pedidos', id] })
      queryClient.invalidateQueries({ queryKey: ['despachos'] })
    },
  })
}

export function usePedidosByCliente(clienteId, pagination = { page: 1, limit: 10 }) {
  return useQuery({
    queryKey: ['pedidos', 'cliente', clienteId, pagination],
    queryFn: () => pedidoService.getByCliente(clienteId, pagination),
    enabled: !!clienteId,
    staleTime: 30_000,
  })
}