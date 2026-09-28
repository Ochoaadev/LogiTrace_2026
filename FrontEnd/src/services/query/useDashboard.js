import { useQuery } from '@tanstack/react-query'
import { reporteService } from '../reporteService'

export function useKPIs() {
  return useQuery({
    queryKey: ['dashboard', 'kpis'],
    queryFn: () => reporteService.getKPIs(),
    staleTime: 60_000,
  })
}

export function usePedidosPorEstado() {
  return useQuery({
    queryKey: ['dashboard', 'pedidos-por-estado'],
    queryFn: () => reporteService.getPedidosPorEstado(),
    staleTime: 60_000,
  })
}

export function useTimelinePedidos(dias = 30) {
  return useQuery({
    queryKey: ['dashboard', 'timeline', dias],
    queryFn: () => reporteService.getTimelinePedidos(dias),
    staleTime: 60_000,
  })
}

export function useTopClientes(limit = 5) {
  return useQuery({
    queryKey: ['dashboard', 'top-clientes', limit],
    queryFn: () => reporteService.getTopClientes(limit),
    staleTime: 60_000,
  })
}

export function useActividadReciente(limit = 10) {
  return useQuery({
    queryKey: ['dashboard', 'actividad', limit],
    queryFn: () => reporteService.getActividadReciente(limit),
    staleTime: 30_000,
  })
}

export function useAlertas() {
  return useQuery({
    queryKey: ['dashboard', 'alertas'],
    queryFn: () => reporteService.getAlertas(),
    staleTime: 60_000,
  })
}