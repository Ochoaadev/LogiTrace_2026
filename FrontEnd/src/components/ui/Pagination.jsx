import * as React from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'

export function Pagination({
  pageCount,
  currentPage,
  onPageChange,
  showFirstLast = true,
  showPageNumbers = true,
  maxPageNumbers = 5,
  className,
}) {
  const pages = React.useMemo(() => {
    if (!showPageNumbers) return []
    if (pageCount <= maxPageNumbers) {
      return Array.from({ length: pageCount }, (_, i) => i + 1)
    }

    const half = Math.floor(maxPageNumbers / 2)
    let start = Math.max(1, currentPage - half)
    let end = Math.min(pageCount, start + maxPageNumbers - 1)

    if (end - start + 1 < maxPageNumbers) {
      start = Math.max(1, end - maxPageNumbers + 1)
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }, [pageCount, currentPage, maxPageNumbers, showPageNumbers])

  if (pageCount <= 1) return null

  return (
    <nav className={cn('flex items-center gap-1', className)} aria-label="Paginación">
      {showFirstLast && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          aria-label="Primera página"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Página anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {showPageNumbers && (
        <div className="flex items-center gap-1">
          {pages.length > 0 && pages[0] > 1 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(1)}
                aria-label="Página 1"
              >
                1
              </Button>
              {pages[0] > 2 && <span className="px-1 text-gray-400">...</span>}
            </>
          )}
          {pages.map((page) => (
            <Button
              key={page}
              variant={page === currentPage ? 'primary' : 'outline'}
              size="sm"
              onClick={() => onPageChange(page)}
              aria-label={`Página ${page}`}
              aria-current={page === currentPage ? 'page' : undefined}
            >
              {page}
            </Button>
          ))}
          {pages.length > 0 && pages[pages.length - 1] < pageCount && (
            <>
              {pages[pages.length - 1] < pageCount - 1 && <span className="px-1 text-gray-400">...</span>}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(pageCount)}
                aria-label={`Página ${pageCount}`}
              >
                {pageCount}
              </Button>
            </>
          )}
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === pageCount}
        aria-label="Página siguiente"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      {showFirstLast && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pageCount)}
          disabled={currentPage === pageCount}
          aria-label="Última página"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      )}
    </nav>
  )
}