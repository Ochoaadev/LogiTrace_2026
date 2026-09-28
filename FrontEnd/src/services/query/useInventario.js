import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventarioService } from '../inventarioService'

export function useInventario(filters = {}, pagination = { page: 1, limit: 10 }) {
  return useQuery({
    queryKey: ['inventario', filters, pagination],
    queryFn: () => inventarioService.getAll({ ...filters, ...pagination }),
    staleTime: 30_000,
  })
}

export function useInventarioDetalle(id) {
  return useQuery({
    queryKey: ['inventario', 'detalle', id],
    queryFn: () => inventarioService.getById(id),
    enabled: !!id,
    staleTime: 30_000,
  })
}

export function useGetLoteDetalle(id) {
  return useQuery({
    queryKey: ['inventario', 'lote', id],
    queryFn: () => inventarioService.getLoteDetalle(id),
    enabled: !!id,
    staleTime: 30_000,
  })
}

export function useMovimientos(filters = {}, pagination = { page: 1, limit: 20 }) {
  return useQuery({
    queryKey: ['inventario', 'movimientos', filters, pagination],
    queryFn: () => inventarioService.getMovimientos({ ...filters, ...pagination }),
    staleTime: 15_000,
  })
}

export function useCrearMovimiento() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => inventarioService.crearMovimiento(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventario'] })
      queryClient.invalidateQueries({ queryKey: ['inventario', 'movimientos'] })
    },
  })
}

export function useAjustarStock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ loteId, ubicacionId, cantidadNueva, observaciones }) => inventarioService.ajustarStock(loteId, ubicacionId, cantidadNueva, observaciones),
    onSuccess: (_, { loteId }) => {
      queryClient.invalidateQueries({ queryKey: ['inventario'] })
      queryClient.invalidateQueries({ queryKey: ['inventario', 'detalle', loteId] })
    },
  })
}