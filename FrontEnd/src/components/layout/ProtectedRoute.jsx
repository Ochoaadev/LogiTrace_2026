import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'

function ProtectedRoute({ allowedPermissions = [], allowedRoles = [] }) {
  const { isAuthenticated, loading, user } = useAuth()
  const { can, hasRole } = usePermissions()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-3 border-primary border-t-transparent" />
          <p className="text-gray-500">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (allowedRoles.length > 0 && !hasRole(allowedRoles)) {
    return <Navigate to="/dashboard" replace />
  }

  if (allowedPermissions.length > 0) {
    const hasPermission = allowedPermissions.some((p) => can(p))
    if (!hasPermission) {
      return <Navigate to="/dashboard" replace />
    }
  }

  return <Outlet />
}

export default ProtectedRoute