import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, Eye, EyeOff, Lock, Mail, UserPlus, User as UserIcon, XCircle } from 'lucide-react'
import { useAuth, roleHome } from '@/context/AuthContext'
import { ROLES, type Role } from '@/types'
import AuthShell from './AuthShell'

interface Errors {
  fullName?: string
  email?: string
  password?: string
  confirm?: string
  role?: string
}

const PW_RULES = [
  { label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
  { label: 'One uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'One number', test: (v: string) => /\d/.test(v) },
]

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [role, setRole] = useState<Role | ''>('')
  const [showPw, setShowPw] = useState(false)
  const [errors, setErrors] = useState<Errors>({})

  const validate = (): boolean => {
    const e: Errors = {}
    if (!fullName.trim()) e.fullName = 'Full name is required'
    else if (fullName.trim().length < 3) e.fullName = 'Name must be at least 3 characters'
    if (!email.trim()) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email address'
    if (!password) e.password = 'Password is required'
    else if (PW_RULES.some((r) => !r.test(password))) e.password = 'Password does not meet all requirements'
    if (!confirm) e.confirm = 'Please confirm your password'
    else if (confirm !== password) e.confirm = 'Passwords do not match'
    if (!role) e.role = 'Please select a role'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = (ev: FormEvent) => {
    ev.preventDefault()
    if (!validate() || !role) return
    // Mock registration — replace with a real API call later.
    register(fullName.trim(), email, role)
    navigate(roleHome(role), { replace: true })
  }

  const ruleState = (test: (v: string) => boolean) => (password ? test(password) : false)

  return (
    <AuthShell
      title="Create Account"
      script="Join DineIQ today"
      subtitle="Register for the DineIQ Analytics demo and pick the workspace that fits your role."
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <div>
          <label className="label" htmlFor="fullName">Full Name</label>
          <div className="relative">
            <UserIcon size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300" />
            <input
              id="fullName"
              className={`input !pl-10 ${errors.fullName ? 'input-error' : ''}`}
              placeholder="Jane Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          {errors.fullName && <p className="mt-1.5 text-xs font-medium text-rose-600">{errors.fullName}</p>}
        </div>

        <div>
          <label className="label" htmlFor="regEmail">Email</label>
          <div className="relative">
            <Mail size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300" />
            <input
              id="regEmail"
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
          <label className="label" htmlFor="regPassword">Password</label>
          <div className="relative">
            <Lock size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300" />
            <input
              id="regPassword"
              type={showPw ? 'text' : 'password'}
              className={`input !pl-10 !pr-10 ${errors.password ? 'input-error' : ''}`}
              placeholder="Create a strong password"
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
          <div className="mt-2 grid gap-1.5 sm:grid-cols-3">
            {PW_RULES.map((r) => {
              const ok = ruleState(r.test)
              return (
                <span key={r.label} className={`flex items-center gap-1.5 text-[0.68rem] font-medium ${ok ? 'text-emerald-600' : 'text-ink-400'}`}>
                  {ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />} {r.label}
                </span>
              )
            })}
          </div>
          {errors.password && <p className="mt-1.5 text-xs font-medium text-rose-600">{errors.password}</p>}
        </div>

        <div>
          <label className="label" htmlFor="confirm">Confirm Password</label>
          <div className="relative">
            <Lock size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300" />
            <input
              id="confirm"
              type="password"
              className={`input !pl-10 ${errors.confirm ? 'input-error' : ''}`}
              placeholder="Repeat your password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          {errors.confirm && <p className="mt-1.5 text-xs font-medium text-rose-600">{errors.confirm}</p>}
        </div>

        <div>
          <label className="label" htmlFor="regRole">Role</label>
          <div className="relative">
            <UserIcon size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300" />
            <select
              id="regRole"
              className={`input !pl-10 appearance-none ${errors.role ? 'input-error' : ''} ${!role ? 'text-ink-300' : ''}`}
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              <option value="" disabled>
                Select a role…
              </option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          {errors.role && <p className="mt-1.5 text-xs font-medium text-rose-600">{errors.role}</p>}
        </div>

        <button type="submit" className="btn btn-primary w-full !py-3.5 text-sm uppercase tracking-[0.15em]">
          <UserPlus size={16} /> Create Account
        </button>

        <p className="text-center text-[0.7rem] text-ink-400">
          Demo only — accounts are stored in browser session memory and never sent to a server.
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        Already have an account?{' '}
        <Link to="/login" className="font-bold text-brand-600 hover:underline">
          Login
        </Link>
      </p>
    </AuthShell>
  )
}
