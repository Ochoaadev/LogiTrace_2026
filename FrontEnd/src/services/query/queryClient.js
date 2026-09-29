import { QueryClient } from '@tanstack/react-query'
import { sesion } from '@/lib/sesion'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: 'always',
    },
    mutations: {
      retry: 0,
    },
  },
})

export async function queryErrorHandler(error) {
  if (error?.response?.status === 401) {
    sesion.limpiar()
    window.location.href = '/login'
    return
  }
  console.error('Query error:', error)
  return error?.response?.data?.message || error?.message || 'Error desconocido'
}