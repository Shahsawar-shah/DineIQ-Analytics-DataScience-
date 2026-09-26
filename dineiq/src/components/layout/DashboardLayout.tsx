import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell, ChevronDown, CircleUser, LogOut, Menu as MenuIcon, PanelsTopLeft, Search, Settings, X,
} from 'lucide-react'
import { ROLE_NAV, ROLE_HOME, ICONS } from '@/data/navigation'
import { useAuth } from '@/context/AuthContext'
import { NotificationRow } from '@/components/ui/InsightCard'
import { Megaphone, ShieldCheck, TrendingUp, TriangleAlert } from 'lucide-react'
import type { Role } from '@/types'

const ROLE_LABEL: Record<Role, string> = {
  Customer: 'Customer Workspace',
  Admin: 'Administrator Console',
  'Restaurant Manager': 'Business Intelligence Suite',
  'Inventory Manager': 'Inventory Control Center',
}

const NOTIFICATIONS = [
  { icon: TriangleAlert, color: '#d92d20', title: 'Critical anomaly detected', text: 'Revenue @ Harbor Point dropped 32% below forecast', time: '12m' },
  { icon: ShieldCheck, color: '#b54708', title: 'Low stock: Roma Tomatoes', text: '34 kg remaining — below par level of 80 kg', time: '1h' },
  { icon: TrendingUp, color: '#0d9459', title: 'Weekly forecast updated', text: 'Revenue forecast +3.8% for next week', time: '3h' },
  { icon: Megaphone, color: '#1d4ed8', title: 'Campaign milestone', text: 'September Bundle Fest passed 1,400 orders', time: '6h' },
]

/** Shared dashboard shell for all four roles — sidebar adapts to the signed-in role. */
export default function DashboardLayout({ role }: { role: Role }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [query, setQuery] = useState('')
  const topRef = useRef<HTMLDivElement>(null)

  const nav = ROLE_NAV[role]

  useEffect(() => {
    setDrawerOpen(false)
    setNotifOpen(false)
    setProfileOpen(false)
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (topRef.current && !topRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const crumbs = useMemo(() => {
    const parts = location.pathname.split('/').filter(Boolean)
    return parts.map((p) => p.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))
  }, [location.pathname])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const sidebarBody = (
    <>
      <div className="flex h-16 items-center gap-2.5 border-b border-ink-100 px-5">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 font-display text-lg font-extrabold text-white shadow-md shadow-brand-500/30">
          D
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-display truncate text-[0.95rem] font-extrabold leading-tight text-ink-900">
              DineIQ <span className="text-brand-500">Analytics</span>
            </p>
            <p className="truncate text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-ink-400">Menu Matrix</p>
          </div>
        )}
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {!collapsed && (
          <p className="sidebar-heading !mt-0">{ROLE_LABEL[role]}</p>
        )}
        {nav.map((item) => {
          const Icon = ICONS[item.icon] ?? LayoutFallback
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''} ${collapsed ? 'justify-center' : ''}`}
              title={item.label}
            >
              <Icon size={18} strokeWidth={2.1} className="shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          )
        })}
      </nav>
      <div className="border-t border-ink-100 p-3">
        <div className={`flex items-center gap-2.5 rounded-xl bg-ink-50 p-2.5 ${collapsed ? 'justify-center' : ''}`}>
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-ink-700 to-ink-900 text-xs font-bold text-white">
            {user?.fullName?.slice(0, 1) ?? 'U'}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-ink-900">{user?.fullName}</p>
              <p className="truncate text-[0.65rem] text-ink-400">{role}</p>
            </div>
          )}
          {!collapsed && (
            <button onClick={handleLogout} className="topbar-icon-btn !h-7 !w-7 !rounded-lg" title="Logout" aria-label="Logout">
              <LogOut size={13} />
            </button>
          )}
        </div>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-[#f6f7fb]">
      {/* Desktop sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-ink-100 bg-white transition-[width] duration-300 lg:flex ${
          collapsed ? 'w-[76px]' : 'w-[248px]'
        }`}
      >
        {sidebarBody}
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="anim-fade-in absolute inset-0 bg-ink-950/50 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <aside className="anim-slide-left absolute inset-y-0 left-0 flex w-[272px] flex-col bg-white shadow-2xl">
            <button
              className="topbar-icon-btn absolute right-3 top-3.5 !h-8 !w-8 !rounded-lg"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
            >
              <X size={15} />
            </button>
            {sidebarBody}
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className={`flex min-h-screen flex-col transition-[padding] duration-300 ${collapsed ? 'lg:pl-[76px]' : 'lg:pl-[248px]'}`}>
        {/* Topbar */}
        <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/85 backdrop-blur-lg">
          <div ref={topRef} className="flex h-16 items-center gap-2 px-4 sm:gap-3 sm:px-6">
            <button className="topbar-icon-btn lg:hidden" onClick={() => setDrawerOpen(true)} aria-label="Open menu">
              <MenuIcon size={17} />
            </button>
            <button
              className="topbar-icon-btn !hidden lg:!inline-flex"
              onClick={() => setCollapsed((v) => !v)}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label="Toggle sidebar"
            >
              <PanelsTopLeft size={16} />
            </button>

            <div className="relative hidden max-w-md flex-1 md:block">
              <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300" />
              <input
                className="input !rounded-xl !bg-ink-50 !py-2.5 !pl-10 !border-ink-100"
                placeholder="Search modules, items, customers…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && query.trim()) {
                    const q = query.toLowerCase()
                    const match = nav.find((n) => n.label.toLowerCase().includes(q))
                    if (match) {
                      navigate(match.path)
                      setQuery('')
                    }
                  }
                }}
              />
            </div>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <Link to="/" className="topbar-icon-btn !hidden sm:!inline-flex" title="Back to website" aria-label="Back to website">
                <span className="text-[0.62rem] font-bold tracking-wide">WEB</span>
              </Link>

              {/* Notifications */}
              <div className="relative">
                <button
                  className="topbar-icon-btn"
                  onClick={() => {
                    setNotifOpen((v) => !v)
                    setProfileOpen(false)
                  }}
                  aria-label="Notifications"
                >
                  <Bell size={16} />
                  <span className="absolute -right-1 -top-1 grid h-4.5 w-4.5 place-items-center rounded-full bg-brand-500 px-1 text-[0.58rem] font-bold text-white">
                    4
                  </span>
                </button>
                {notifOpen && (
                  <div className="anim-pop absolute right-0 top-12 z-40 w-[320px] rounded-2xl border border-ink-100 bg-white p-2 shadow-2xl sm:w-[360px]">
                    <div className="flex items-center justify-between px-3 py-2">
                      <p className="font-display text-sm font-bold text-ink-900">Notifications</p>
                      <span className="badge badge-orange">4 new</span>
                    </div>
                    <div className="space-y-0.5">
                      {NOTIFICATIONS.map((n) => (
                        <NotificationRow key={n.title} {...n} />
                      ))}
                    </div>
                    <button className="mt-1 w-full rounded-xl py-2 text-center text-xs font-bold text-brand-600 hover:bg-brand-50">
                      View all activity
                    </button>
                  </div>
                )}
              </div>

              {/* Profile */}
              <div className="relative">
                <button
                  className="flex items-center gap-2.5 rounded-xl border border-ink-100 bg-white py-1.5 pl-1.5 pr-2.5 transition hover:border-brand-200 hover:bg-brand-50"
                  onClick={() => {
                    setProfileOpen((v) => !v)
                    setNotifOpen(false)
                  }}
                >
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 text-xs font-bold text-white">
                    {user?.fullName?.slice(0, 1) ?? 'U'}
                  </span>
                  <span className="hidden text-left sm:block">
                    <span className="block text-xs font-bold leading-tight text-ink-900">{user?.fullName}</span>
                    <span className="block text-[0.62rem] leading-tight text-ink-400">{role}</span>
                  </span>
                  <ChevronDown size={14} className="text-ink-400" />
                </button>
                {profileOpen && (
                  <div className="anim-pop absolute right-0 top-12 z-40 w-56 rounded-2xl border border-ink-100 bg-white p-1.5 shadow-2xl">
                    <div className="border-b border-ink-100 px-3 py-2.5">
                      <p className="text-sm font-bold text-ink-900">{user?.fullName}</p>
                      <p className="truncate text-xs text-ink-400">{user?.email}</p>
                    </div>
                    <Link to={ROLE_HOME[role]} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-ink-600 hover:bg-brand-50 hover:text-brand-600">
                      <CircleUser size={15} /> My workspace
                    </Link>
                    <Link to="/customer/profile" className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold hover:bg-brand-50 hover:text-brand-600 ${role === 'Customer' ? 'text-ink-600' : 'text-ink-300 pointer-events-none'}`}>
                      <Settings size={15} /> Profile settings
                    </Link>
                    <button onClick={handleLogout} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50">
                      <LogOut size={15} /> Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Breadcrumb + content */}
        <main className="page-enter flex-1 p-4 sm:p-6">
          <nav className="mb-4 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-ink-400">
            {crumbs.map((c, i) => (
              <span key={i} className={i === crumbs.length - 1 ? 'text-brand-600' : ''}>
                {c}
                {i < crumbs.length - 1 && <span className="ml-1.5 text-ink-200">/</span>}
              </span>
            ))}
          </nav>
          <Outlet />
        </main>

        <footer className="border-t border-ink-100 px-6 py-4 text-center text-[0.7rem] text-ink-400">
          DineIQ Analytics — Menu Matrix Dining Intelligence · Frontend demo with mock data
        </footer>
      </div>
    </div>
  )
}

function LayoutFallback(props: { size?: number; strokeWidth?: number; className?: string }) {
  return <CircleUser {...props} />
}
