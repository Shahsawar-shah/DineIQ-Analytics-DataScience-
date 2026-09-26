import { Link } from 'react-router-dom'
import { ArrowLeft, BarChart3, LineChart, UtensilsCrossed } from 'lucide-react'
import Logo from '../../components/ui/Logo'

/** Shared visual shell for Login & Register — mirrors the landing page language. */
export default function AuthShell({ title, script, subtitle, children }) {
  return (
    <div className="flex min-h-screen">
      {/* Left visual panel */}
      <div className="hero-vignette relative hidden w-[46%] flex-col justify-between p-10 lg:flex">
        <div className="grid-lines absolute inset-0 opacity-60" />
        <Link to="/" className="relative flex items-center gap-2.5">
          <Logo size={40} className="shrink-0 drop-shadow-lg" />
          <span>
            <span className="font-display block text-lg font-extrabold leading-none text-white">
              DineIQ <span className="text-brand-500">Analytics</span>
            </span>
            <span className="block text-[0.55rem] font-semibold uppercase tracking-[0.35em] text-white/50">
              Dining Intelligence
            </span>
          </span>
        </Link>

        <div className="relative">
          <p className="font-script text-3xl text-brand-400">{script}</p>
          <h2 className="font-display mt-3 max-w-md text-3xl font-extrabold leading-tight text-white">
            One platform for every restaurant decision.
          </h2>
          <div className="mt-8 space-y-3">
            {[
              { icon: BarChart3, text: 'Menu, customer & inventory intelligence' },
              { icon: LineChart, text: 'Forecasts, anomalies & what-if simulation' },
              { icon: UtensilsCrossed, text: 'Four role-based workspaces in one product' },
            ].map((f) => (
              <div key={f.text} className="glass flex items-center gap-3 rounded-xl px-4 py-3">
                <f.icon size={17} className="text-brand-400" />
                <span className="text-xs font-medium text-white/80">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-[0.68rem] text-white/40">© 2026 DineIQ Analytics — demo environment with mock data</p>
      </div>

      {/* Right form panel */}
      <div className="relative flex flex-1 items-center justify-center bg-[#f6f7fb] px-4 py-10 sm:px-8">
        <Link
          to="/"
          className="btn btn-ghost absolute left-4 top-5 !rounded-xl !px-4 !py-2 text-xs sm:left-8"
        >
          <ArrowLeft size={14} /> Back to website
        </Link>
        <div className="anim-fade-up w-full max-w-md">
          <div className="mb-7 text-center lg:text-left">
            <p className="font-script text-2xl text-brand-500 lg:hidden">DineIQ Analytics</p>
            <h1 className="font-display mt-1 text-2xl font-extrabold text-ink-900 sm:text-3xl">{title}</h1>
            <p className="mt-2 text-sm text-ink-400">{subtitle}</p>
          </div>
          <div className="card p-6 sm:p-7">{children}</div>
        </div>
      </div>
    </div>
  )
}
