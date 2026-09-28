import * as React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

function BreadcrumbItem({ label, href, isCurrent }) {
  return (
    <li>
      {!isCurrent && href ? (
        <Link to={href} className="text-sm text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1">
          {label}
        </Link>
      ) : (
        <span className="text-sm font-medium text-gray-900" aria-current={isCurrent ? 'page' : undefined}>
          {label}
        </span>
      )}
    </li>
  )
}

export function Breadcrumb({ items = [], className, autoGenerate = true }) {
  const location = useLocation()
  const autoItems = React.useMemo(() => {
    if (!autoGenerate) return []
    const pathnames = location.pathname.split('/').filter(Boolean)
    return pathnames.map((segment, index) => {
      const href = '/' + pathnames.slice(0, index + 1).join('/')
      const label = segment
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
      return { label, href, isCurrent: index === pathnames.length - 1 }
    })
  }, [location.pathname, autoGenerate])

  const allItems = items.length > 0 ? items : autoItems

  if (allItems.length === 0) return null

  return (
    <nav className={cn('flex items-center gap-1 text-sm', className)} aria-label="Navegación">
      <Link to="/" className="text-gray-500 hover:text-gray-900 transition-colors" aria-label="Inicio">
        <Home className="h-4 w-4" />
      </Link>
      <ol className="flex items-center gap-1" role="list">
        {allItems.map((item, index) => (
          <React.Fragment key={index}>
            {index > 0 && <ChevronRight className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />}
            <BreadcrumbItem {...item} />
          </React.Fragment>
        ))}
      </ol>
    </nav>
  )
}