import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, LogIn, Mail, ShieldCheck } from 'lucide-react'
import { useAuth, roleHome } from '../../context/AuthContext'
import AuthShell from './AuthShell'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const validate = () => {
    const e = {}
    if (!email.trim()) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email address'
    if (!password) e.password = 'Password is required'
    else if (password.length < 6) e.password = 'Password must be at least 6 characters'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async (ev) => {
    ev.preventDefault()
    if (!validate()) return
    setBusy(true)
    try {
      const data = await login(email, password)
      const from = location.state?.from
      navigate(from && from !== '/' ? from : roleHome(data.user.role), { replace: true })
    } catch (err) {
      setErrors({ form: err.message || 'Login failed' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Welcome Back"
      script="Sign in to intelligence"
      subtitle="Log in to your DineIQ Analytics workspace."
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        {errors.form && (
          <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-600">{errors.form}</p>
        )}
        <div>
          <label className="label" htmlFor="email">Email</label>
          <div className="relative">
            <Mail size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300" />
            <input
              id="email"
              type="email"
              className={`input !pl-10 ${errors.email ? 'input-error' : ''}`}
              placeholder="you@restaurant.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {errors.email && <p className="mt-1.5 text-xs font-medium text-rose-600">{errors.email}</p>}
        </div>

        <div>
          <label className="label" htmlFor="password">Password</label>
          <div className="relative">
            <Lock size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300" />
            <input
              id="password"
              type={showPw ? 'text' : 'password'}
              className={`input !pl-10 !pr-10 ${errors.password ? 'input-error' : ''}`}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-300 hover:text-ink-600"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? 'Hide password' : 'Show password'}
            >
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {errors.password && <p className="mt-1.5 text-xs font-medium text-rose-600">{errors.password}</p>}
        </div>

        <div className="flex items-center justify-between text-xs">
          <label className="flex cursor-pointer items-center gap-2 font-medium text-ink-500">
            <input type="checkbox" className="h-3.5 w-3.5 accent-brand-500" defaultChecked /> Remember me
          </label>
          <button type="button" className="font-semibold text-brand-600 hover:underline">
            Forgot Password?
          </button>
        </div>

        <button type="submit" disabled={busy} className="btn btn-primary w-full !py-3.5 text-sm uppercase tracking-[0.15em] disabled:opacity-70">
          {busy ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Signing in…
            </span>
          ) : (
            <>
              <LogIn size={16} /> Login
            </>
          )}
        </button>

        <p className="flex items-center justify-center gap-1.5 text-xs text-ink-400">
          <ShieldCheck size={13} className="text-emerald-500" /> Secured with a real JWT session
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="font-bold text-brand-600 hover:underline">
          Create Account
        </Link>
      </p>
    </AuthShell>
  )
}
