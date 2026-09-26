import { type ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, Sparkles, type LucideIcon } from 'lucide-react'

/** Insight / alert card used for wastage risks, anomalies and tips. */
export function InsightCard({
  tone = 'info',
  title,
  text,
  meta,
  delay = 0,
}: {
  tone?: 'info' | 'warn' | 'danger' | 'success'
  title: string
  text: string
  meta?: string
  delay?: number
}) {
  const cfg = {
    info: { icon: Info, bg: '#e9f1fe', fg: '#1d4ed8' },
    warn: { icon: AlertTriangle, bg: '#fef4e0', fg: '#b54708' },
    danger: { icon: AlertTriangle, bg: '#fdecef', fg: '#d92d20' },
    success: { icon: CheckCircle2, bg: '#e7f8ef', fg: '#0d9459' },
  }[tone]
  const Icon = cfg.icon
  return (
    <div className="card card-hover anim-fade-up flex gap-3 p-4" style={{ animationDelay: `${delay}ms` }}>
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: cfg.bg, color: cfg.fg }}>
        <Icon size={19} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink-900">{title}</p>
        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-ink-500">{text}</p>
        {meta && <p className="mt-1.5 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-ink-400">{meta}</p>}
      </div>
    </div>
  )
}

/** Recommendation card with impact badge and confidence meter. */
export function RecommendationCard({
  area,
  title,
  detail,
  impact,
  confidence,
  delay = 0,
}: {
  area: string
  title: string
  detail: string
  impact: string
  confidence: number
  delay?: number
}) {
  const tone = impact === 'High' ? 'badge-red' : impact === 'Medium' ? 'badge-amber' : 'badge-gray'
  return (
    <div className="card card-hover anim-fade-up p-5" style={{ animationDelay: `${delay}ms` }}>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <span className="badge badge-orange">{area}</span>
        <span className={`badge ${tone}`}>{impact} impact</span>
      </div>
      <h4 className="font-display text-[0.95rem] font-bold text-ink-900">{title}</h4>
      <p className="mt-1.5 text-xs leading-relaxed text-ink-500">{detail}</p>
      <div className="mt-4">
        <div className="mb-1 flex justify-between text-[0.68rem] font-semibold text-ink-400">
          <span>Model confidence</span>
          <span className="text-ink-700">{confidence}%</span>
        </div>
        <div className="meter">
          <span style={{ width: `${confidence}%`, background: 'linear-gradient(90deg,#fb7f38,#f95d0b)' }} />
        </div>
      </div>
    </div>
  )
}

/** Forecast summary card (predicted value + range + trend). */
export function ForecastCard({
  label,
  value,
  range,
  delta,
  delay = 0,
}: {
  label: string
  value: string
  range: string
  delta: number
  delay?: number
}) {
  const positive = delta >= 0
  return (
    <div className="card card-hover anim-fade-up p-5" style={{ animationDelay: `${delay}ms` }}>
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-ink-400">{label}</p>
      <p className="font-display mt-1.5 text-2xl font-extrabold text-ink-900">{value}</p>
      <p className="mt-1 text-xs text-ink-400">Range: {range}</p>
      <p className={`mt-2 inline-flex items-center gap-1 text-xs font-bold ${positive ? 'text-emerald-600' : 'text-rose-600'}`}>
        <Sparkles size={13} /> {positive ? '+' : ''}
        {delta}% vs last period
      </p>
    </div>
  )
}

/** Small labeled panel used in NotificationPanel lists. */
export function NotificationRow({ icon: Icon, color, title, text, time }: { icon: LucideIcon; color: string; title: string; text: string; time: string }) {
  return (
    <div className="flex gap-3 rounded-xl px-3 py-2.5 transition hover:bg-brand-50/60">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ background: `${color}1a`, color }}>
        <Icon size={15} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-ink-900">{title}</p>
        <p className="truncate text-[0.7rem] text-ink-400">{text}</p>
      </div>
      <span className="shrink-0 text-[0.65rem] font-medium text-ink-300">{time}</span>
    </div>
  )
}

/** Generic metric strip for inside panels. */
export function MiniStat({ icon, color, label, value }: { icon: ReactNode; color: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-ink-100 bg-ink-50/40 p-3">
      <div className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: `${color}1a`, color }}>
        {icon}
      </div>
      <div>
        <p className="text-[0.66rem] font-bold uppercase tracking-[0.1em] text-ink-400">{label}</p>
        <p className="font-display text-sm font-extrabold text-ink-900">{value}</p>
      </div>
    </div>
  )
}
