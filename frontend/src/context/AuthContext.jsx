import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

const API = 'http://localhost:8000/api/auth'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('dineiq_token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      fetch(`${API}/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(r => r.json())
        .then(data => {
          if (data.user_id) setUser(data)
          else logout()
        })
        .catch(() => logout())
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [token])

  const register = async (name, email, password, role = 'analyst') => {
    const res = await fetch(`${API}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.detail || 'Registration failed')
    localStorage.setItem('dineiq_token', data.token)
    setToken(data.token)
    setUser(data.user)
    return data
  }

  const login = async (email, password) => {
    const res = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.detail || 'Login failed')
    localStorage.setItem('dineiq_token', data.token)
    setToken(data.token)
    setUser(data.user)
    return data
  }

  const logout = () => {
    localStorage.removeItem('dineiq_token')
    setToken(null)
    setUser(null)
  }

  const getAuthHeader = () => ({
    Authorization: `Bearer ${token}`
  })

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      login, register, logout,
      getAuthHeader,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
export default AuthContext

/** Landing path per role after login/register. Pure route lookup — not tied to mock vs real auth. */
export function roleHome(role) {
  switch (role) {
    case 'Customer':
      return '/customer/dashboard'
    case 'Admin':
      return '/admin/dashboard'
    case 'Restaurant Manager':
      return '/manager/dashboard'
    case 'Inventory Manager':
      return '/inventory/dashboard'
    default:
      return '/'
  }
}
