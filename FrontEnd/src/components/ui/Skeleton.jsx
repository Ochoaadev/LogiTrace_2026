import { cn } from '@/lib/utils'

export function Skeleton({ className, variant = 'text', width, height, ...props }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gray-200',
        variant === 'circular' && 'rounded-full',
        variant === 'rectangular' && 'rounded-lg',
        className
      )}
      style={{ width, height }}
      {...props}
    />
  )
}

export function SkeletonTable({ rows = 5, columns = 4 }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {[...Array(columns)].map((_, i) => (
              <th key={i} className="px-4 py-3">
                <Skeleton variant="rectangular" width="80px" height="16px" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {[...Array(rows)].map((_, rowIndex) => (
            <tr key={rowIndex}>
              {[...Array(columns)].map((_, colIndex) => (
                <td key={colIndex} className="px-4 py-3">
                  <Skeleton variant="text" width="100%" height="16px" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="rounded-none border border-gray-200 bg-gray-50 p-4 space-y-3">
      <Skeleton variant="rectangular" width="40%" height="24px" />
      {[...Array(lines)].map((_, i) => (
        <Skeleton key={i} variant="text" width="100%" height="16px" />
      ))}
    </div>
  )
}

export function SkeletonKPI() {
  return (
    <div className="rounded-none border border-gray-200 bg-gray-50 p-4 space-y-2">
      <Skeleton variant="text" width="30%" height="14px" />
      <Skeleton variant="rectangular" width="60%" height="32px" />
      <Skeleton variant="text" width="40%" height="12px" />
    </div>
  )
}