import { useQuery } from '@tanstack/react-query'
import { catalogoService } from '../catalogoService'

export function useClientes(filters = {}, pagination = { page: 1, limit: 10 }) {
  return useQuery({
    queryKey: ['catalogos', 'clientes', filters, pagination],
    queryFn: () => catalogoService.getClientes({ ...filters, ...pagination }),
    staleTime: 60_000,
  })
}

export function useZonas(filters = {}, pagination = { page: 1, limit: 10 }) {
  return useQuery({
    queryKey: ['catalogos', 'zonas', filters, pagination],
    queryFn: () => catalogoService.getZonas({ ...filters, ...pagination }),
    staleTime: 60_000,
  })
}

export function useProductos(filters = {}, pagination = { page: 1, limit: 10 }) {
  return useQuery({
    queryKey: ['catalogos', 'productos', filters, pagination],
    queryFn: () => catalogoService.getProductos({ ...filters, ...pagination }),
    staleTime: 60_000,
  })
}

export function useVehiculos(filters = {}, pagination = { page: 1, limit: 10 }) {
  return useQuery({
    queryKey: ['catalogos', 'vehiculos', filters, pagination],
    queryFn: () => catalogoService.getVehiculos({ ...filters, ...pagination }),
    staleTime: 60_000,
  })
}

export function useRepartidores(filters = {}, pagination = { page: 1, limit: 10 }) {
  return useQuery({
    queryKey: ['catalogos', 'repartidores', filters, pagination],
    queryFn: () => catalogoService.getRepartidores({ ...filters, ...pagination }),
    staleTime: 60_000,
  })
}

export function useTiposIncidencia(filters = {}, pagination = { page: 1, limit: 10 }) {
  return useQuery({
    queryKey: ['catalogos', 'tipos-incidencia', filters, pagination],
    queryFn: () => catalogoService.getTiposIncidencia({ ...filters, ...pagination }),
    staleTime: 60_000,
  })
}

export function useMotivosDevolucion(filters = {}, pagination = { page: 1, limit: 10 }) {
  return useQuery({
    queryKey: ['catalogos', 'motivos-devolucion', filters, pagination],
    queryFn: () => catalogoService.getMotivosDevolucion({ ...filters, ...pagination }),
    staleTime: 60_000,
  })
}

export function useTiposResiduo(filters = {}, pagination = { page: 1, limit: 10 }) {
  return useQuery({
    queryKey: ['catalogos', 'tipos-residuo', filters, pagination],
    queryFn: () => catalogoService.getTiposResiduo({ ...filters, ...pagination }),
    staleTime: 60_000,
  })
}

export function useGestoresResiduo(filters = {}, pagination = { page: 1, limit: 10 }) {
  return useQuery({
    queryKey: ['catalogos', 'gestores-residuo', filters, pagination],
    queryFn: () => catalogoService.getGestoresResiduo({ ...filters, ...pagination }),
    staleTime: 60_000,
  })
}