import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/services/query/queryClient'

export function QueryProvider({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}