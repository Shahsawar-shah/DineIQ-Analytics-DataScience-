import { type ReactNode } from 'react'
import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react'

interface Props {
  label: string
  value: string
  delta?: number
  icon: LucideIcon
  accent?: string
  footer?: ReactNode
  delay?: number
}

/** Riday-style KPI card with donut accent and delta indicator. */
export default function KpiCard({ label, value, delta, icon: Icon, accent = '#f95d0b', footer, delay = 0 }: Props) {
  const positive = (delta ?? 0) >= 0
  return (
    <div className="card card-hover anim-fade-up p-4 sm:p-5" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-ink-400">{label}</p>
          <p className="font-display mt-1.5 text-xl font-extrabold text-ink-900 sm:text-2xl">{value}</p>
          {delta !== undefined && (
            <p className={`mt-1 flex items-center gap-1 text-xs font-semibold ${positive ? 'text-emerald-600' : 'text-rose-600'}`}>
              {positive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              {positive ? '+' : ''}
              {delta}% vs last month
            </p>
          )}
          {footer}
        </div>
        <div
          className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl"
          style={{ background: `${accent}1a`, color: accent }}
        >
          <Icon size={22} strokeWidth={2.2} />
        </div>
      </div>
    </div>
  )
}
