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

export function useProcesarDevolucion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, accion, observaciones, detalles }) => {
      switch (accion) {
        case 'recibir':
          return devolucionService.recepcion(id, { observaciones: '' })
        case 'evaluar':
          return devolucionService.evaluar(id, { selloIntegro: true, condicionEmpaque: 'OK', observaciones: '', temperatura: 0 })
        case 'evaluar-detalle':
          return devolucionService.evaluarDetalle(id, { detalleDevolucionId: '', estadoProducto: '', decision: '', loteId: '', ubicacionId: '' })
        case 'cancelar':
          return devolucionService.updateEstado(id, 'CANCELADA', '')
        case 'cerrar':
          return devolucionService.updateEstado(id, 'CERRADA', '')
        default:
          return devolucionService.updateEstado(id, accion.toUpperCase(), '')
      }
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['devoluciones'] })
      queryClient.invalidateQueries({ queryKey: ['devoluciones', id] })
    },
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

export function useRecepcionDevolucion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, temperatura, observaciones }) => devolucionService.recepcion(id, { temperatura, observaciones }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['devoluciones'] })
      queryClient.invalidateQueries({ queryKey: ['devoluciones', id] })
    },
  })
}

export function useEvaluarDevolucion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, selloIntegro, condicionEmpaque, observaciones, temperatura }) => devolucionService.evaluar(id, { selloIntegro, condicionEmpaque, observaciones, temperatura }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['devoluciones'] })
      queryClient.invalidateQueries({ queryKey: ['devoluciones', id] })
    },
  })
}

export function useEvaluarDetalleDevolucion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, detalleDevolucionId, estadoProducto, decision, loteId, ubicacionId }) => devolucionService.evaluarDetalle(id, { detalleDevolucionId, estadoProducto, decision, loteId, ubicacionId }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['devoluciones'] })
      queryClient.invalidateQueries({ queryKey: ['devoluciones', id] })
    },
  })
}

export function useUpdateEstadoDevolucion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, estado, observaciones }) => devolucionService.updateEstado(id, estado, observaciones),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['devoluciones'] })
      queryClient.invalidateQueries({ queryKey: ['devoluciones', id] })
    },
  })
}