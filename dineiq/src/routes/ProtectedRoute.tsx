import { Navigate, useLocation } from 'react-router-dom'
import type { Role } from '@/types'
import { useAuth } from '@/context/AuthContext'

/**
 * Frontend-only protected route. Checks mock auth state + role match.
 * When a real API arrives, swap the check for a real session/token lookup.
 */
export default function ProtectedRoute({ role, children }: { role: Role; children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  if (user.role !== role) {
    // A signed-in user may not see another role's dashboard — send them home.
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}
