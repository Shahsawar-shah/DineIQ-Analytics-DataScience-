import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'

/** Standard chart/panel container used across all dashboards. */
export default function ChartCard({ title, subtitle, actions, children, className = '', height, delay = 0 }) {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <div className={`card anim-fade-up p-4 sm:p-5 ${className}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-[0.95rem] font-bold text-ink-900">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-ink-400">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          {actions === undefined && (
            <div className="relative">
              <button
                aria-label="Chart options"
                className="topbar-icon-btn !h-8 !w-8 !rounded-lg"
                onClick={() => setMenuOpen((v) => !v)}
                onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
              >
                <MoreHorizontal size={16} />
              </button>
              {menuOpen && (
                <div className="anim-pop absolute right-0 top-10 z-20 w-40 rounded-xl border border-ink-100 bg-white py-1.5 shadow-xl">
                  {['View details', 'Download PNG', 'Refresh data'].map((m) => (
                    <button key={m} className="block w-full px-4 py-1.5 text-left text-xs font-medium text-ink-600 hover:bg-brand-50 hover:text-brand-600">
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <div style={height ? { height } : undefined}>{children}</div>
    </div>
  )
}
