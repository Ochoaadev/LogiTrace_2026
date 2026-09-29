import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { devolucionService } from '../devolucionService'

export function useDevoluciones(filters = {}, pagination = { page: 1, limit: 10 }) {
  return useQuery({
    queryKey: ['devoluciones', filters, pagination],
    queryFn: () => devolucionService.getAll({ ...filters, ...pagination }),
    staleTime: 30_000,
  })
}

// Indicadores del módulo 05, últimas decisiones y paradas que admiten un retorno
export function useDevolucionesResumen() {
  return useQuery({
    queryKey: ['devoluciones', 'resumen'],
    queryFn: () => devolucionService.getResumen(),
    select: (res) => res.data,
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

// Cada paso de la logística inversa cambia también pedidos, despachos, inventario (reingreso,
// cuarentena), residuos (descarte) y la trazabilidad.
function useMutacionDevolucion(mutationFn) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      for (const key of ['devoluciones', 'pedidos', 'despachos', 'inventario', 'residuos', 'incidencias', 'trazabilidad']) {
        queryClient.invalidateQueries({ queryKey: [key] })
      }
    },
  })
}

export const useCreateDevolucion = () => useMutacionDevolucion((data) => devolucionService.create(data))

export const useRecepcionDevolucion = () =>
  useMutacionDevolucion(({ id, temperatura, observaciones }) => devolucionService.recepcion(id, { temperatura, observaciones }))

export const useEvaluarDevolucion = () =>
  useMutacionDevolucion(({ id, selloIntegro, condicionEmpaque, observaciones, temperatura }) =>
    devolucionService.evaluar(id, { selloIntegro, condicionEmpaque, observaciones, temperatura }))

export const useEvaluarDetalleDevolucion = () =>
  useMutacionDevolucion(({ id, ...datos }) => devolucionService.evaluarDetalle(id, datos))

export const useUpdateEstadoDevolucion = () =>
  useMutacionDevolucion(({ id, estado, observaciones }) => devolucionService.updateEstado(id, estado, observaciones))
