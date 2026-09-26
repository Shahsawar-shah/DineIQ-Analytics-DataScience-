import { ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'
import { INVENTORY } from '@/data/mockData'

function riskScore(i: (typeof INVENTORY)[number]) {
  // Simple mock scoring: wastage % + stock pressure.
  const stockPressure = i.parLevel > 0 ? 1 - i.stock / i.parLevel : 1
  return Math.min(100, Math.round(i.wastagePct * 9 + stockPressure * 40))
}

function riskBand(score: number): 'Critical' | 'Warning' | 'Normal' {
  return score >= 70 ? 'Critical' : score >= 45 ? 'Warning' : 'Normal'
}

export default function WastageRisk() {
  const scored = INVENTORY.map((i) => ({ ...i, score: riskScore(i), band: riskBand(riskScore(i)) }))
    .sort((a, b) => b.score - a.score)

  const counts = {
    Critical: scored.filter((s) => s.band === 'Critical').length,
    Warning: scored.filter((s) => s.band === 'Warning').length,
    Normal: scored.filter((s) => s.band === 'Normal').length,
  }

  return (
    <>
      <PageHeader title="Wastage Risk" subtitle="Composite risk scoring: wastage rate + stock pressure" demo />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { icon: ShieldAlert, label: 'Critical Risk', value: counts.Critical, accent: '#e11d48', desc: 'Act this week' },
          { icon: ShieldQuestion, label: 'Warning', value: counts.Warning, accent: '#b54708', desc: 'Monitor daily' },
          { icon: ShieldCheck, label: 'Healthy', value: counts.Normal, accent: '#0d9459', desc: 'Within tolerance' },
        ].map((k, i) => (
          <div key={k.label} className="card card-hover anim-fade-up flex items-center gap-4 p-5" style={{ animationDelay: `${i * 70}ms` }}>
            <div className="grid h-12 w-12 place-items-center rounded-2xl" style={{ background: `${k.accent}16`, color: k.accent }}>
              <k.icon size={22} />
            </div>
            <div>
              <p className="font-display text-2xl font-extrabold text-ink-900">{k.value}</p>
              <p className="text-xs font-bold text-ink-700">{k.label} <span className="font-normal text-ink-400">· {k.desc}</span></p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {scored.map((s, i) => (
          <div key={s.id} className="card card-hover anim-fade-up p-5" style={{ animationDelay: `${(i % 6) * 50}ms` }}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="truncate text-sm font-bold text-ink-900">{s.item}</p>
              <StatusBadge status={s.band} />
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="font-display text-3xl font-extrabold text-ink-900">{s.score}</p>
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.12em] text-ink-400">Risk score /100</p>
              </div>
              <div className="text-right text-[0.7rem] leading-relaxed text-ink-500">
                <p>Wastage: <strong>{s.wastagePct}%</strong></p>
                <p>Stock: <strong>{s.stock}/{s.parLevel} {s.unit}</strong></p>
              </div>
            </div>
            <div className="meter mt-3">
              <span style={{
                width: `${s.score}%`,
                background: s.band === 'Critical' ? 'linear-gradient(90deg,#fb7185,#e11d48)' : s.band === 'Warning' ? 'linear-gradient(90deg,#fbbf24,#d97706)' : 'linear-gradient(90deg,#34d399,#0d9459)',
                transitionDelay: `${i * 40}ms`,
              }} />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
