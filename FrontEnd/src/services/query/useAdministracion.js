import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { administracionService, catalogoNegocioService, usuarioService } from '../administracionService'

export function useAdministracionResumen() {
  return useQuery({
    queryKey: ['administracion', 'resumen'],
    queryFn: () => administracionService.getResumen(),
    select: (res) => res.data,
    staleTime: 30_000,
  })
}

export function useParametrosPlanta() {
  return useQuery({
    queryKey: ['administracion', 'parametros'],
    queryFn: () => administracionService.getParametros(),
    select: (res) => res.data,
    staleTime: 300_000,
  })
}

export function useUsuarios(filtros, pagina) {
  return useQuery({
    queryKey: ['usuarios', filtros, pagina],
    queryFn: () => usuarioService.getAll({ ...filtros, ...pagina }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
}

export function useAuditoria(filtros, pagina, habilitado = true) {
  return useQuery({
    queryKey: ['auditoria', filtros, pagina],
    queryFn: () => administracionService.getAuditoria({ ...filtros, ...pagina }),
    placeholderData: keepPreviousData,
    enabled: habilitado,
  })
}

// Cualquier cambio de usuario altera las tarjetas de la cabecera y deja rastro en auditoría
export function useMutacionUsuario(mutationFn) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      for (const key of ['usuarios', 'administracion', 'auditoria']) queryClient.invalidateQueries({ queryKey: [key] })
    },
  })
}

export function useCatalogoNegocio(ruta) {
  return useQuery({
    queryKey: ['catalogos', ruta, 'administracion'],
    queryFn: () => catalogoNegocioService.getAll(ruta),
    select: (res) => res.data,
    enabled: !!ruta,
  })
}

// Los catálogos alimentan formularios de otros módulos (tipos de incidencia, motivos, zonas…)
export function useMutacionCatalogo(mutationFn) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      for (const key of ['catalogos', 'administracion', 'auditoria', 'incidencias', 'devoluciones', 'residuos']) queryClient.invalidateQueries({ queryKey: [key] })
    },
  })
}
