import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { MockUser, Role } from '@/types'

/**
 * FRONTEND-ONLY MOCK AUTHENTICATION.
 * No backend, no real tokens. State lives in React + sessionStorage so a
 * refresh keeps you logged in during the demo. Replace `login`/`register`
 * with real API calls later — the rest of the app only consumes this context.
 */

const SESSION_KEY = 'dineiq.mock.session'

interface AuthContextValue {
  user: MockUser | null
  isAuthenticated: boolean
  login: (email: string, role: Role) => MockUser
  register: (fullName: string, email: string, role: Role) => MockUser
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const DEMO_NAMES: Record<Role, string> = {
  'Customer': 'Amelia Hart',
  'Admin': 'System Administrator',
  'Restaurant Manager': 'Victor Laurent',
  'Inventory Manager': 'Priya Nair',
}

function readSession(): MockUser | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as MockUser) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(() => readSession())

  const persist = useCallback((u: MockUser | null) => {
    setUser(u)
    try {
      if (u) sessionStorage.setItem(SESSION_KEY, JSON.stringify(u))
      else sessionStorage.removeItem(SESSION_KEY)
    } catch {
      /* storage unavailable — session stays in memory only */
    }
  }, [])

  const login = useCallback(
    (_email: string, role: Role) => {
      const u: MockUser = {
        id: `U-${role.slice(0, 2).toUpperCase()}-001`,
        fullName: DEMO_NAMES[role],
        email: _email,
        role,
        location: role === 'Restaurant Manager' ? 'Downtown Flagship' : 'All Locations',
      }
      persist(u)
      return u
    },
    [persist],
  )

  const register = useCallback(
    (fullName: string, email: string, role: Role) => {
      const u: MockUser = {
        id: `U-${role.slice(0, 2).toUpperCase()}-NEW`,
        fullName,
        email,
        role,
        location: role === 'Restaurant Manager' ? 'Downtown Flagship' : 'All Locations',
      }
      persist(u)
      return u
    },
    [persist],
  )

  const logout = useCallback(() => persist(null), [persist])

  const value = useMemo(
    () => ({ user, isAuthenticated: !!user, login, register, logout }),
    [user, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

/** Landing path per role after mock login. */
export function roleHome(role: Role): string {
  switch (role) {
    case 'Customer':
      return '/customer/dashboard'
    case 'Admin':
      return '/admin/dashboard'
    case 'Restaurant Manager':
      return '/manager/dashboard'
    case 'Inventory Manager':
      return '/inventory/dashboard'
  }
}
