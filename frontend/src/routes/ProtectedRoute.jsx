import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Real-auth protected route: verifies the JWT (via AuthContext's /me check)
 * and the signed-in user's role before rendering the workspace.
 */
export default function ProtectedRoute({ role, children }) {
  const { isAuthenticated, user, loading } = useAuth()
  const location = useLocation()

  // Still resolving the stored token against /api/auth/me — don't redirect yet,
  // otherwise a valid session gets bounced to /login on every page refresh.
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f6f7fb]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-500" />
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  if (user.role !== role) {
    return <Navigate to="/login" replace />
  }
  return children
}
