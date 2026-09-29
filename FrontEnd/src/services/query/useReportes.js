import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { reporteService } from '../reporteService'

// Reporte operativo del periodo y sector; conserva el anterior mientras se recalcula
export function useReporteOperativo(filtros) {
  return useQuery({
    queryKey: ['reportes', 'operativo', filtros],
    queryFn: () => reporteService.getOperativo(filtros),
    select: (res) => res.data,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  })
}
