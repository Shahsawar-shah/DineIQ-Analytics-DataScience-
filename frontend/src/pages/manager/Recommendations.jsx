import { useEffect, useMemo, useState } from 'react'
import { AlertOctagon, AlertTriangle, CircleAlert, ListChecks } from 'lucide-react'
import { api } from '../../services/api'
import PageHeader from '../../components/layout/PageHeader'
import KpiCard from '../../components/ui/KpiCard'
import LoadingState, { ErrorState } from '../../components/ui/LoadingState'

const PRIORITY_TONE = {
  Critical: 'badge-red',
  High: 'badge-amber',
  Medium: 'badge-blue',
  Low: 'badge-gray',
}

const EVIDENCE_LABELS = {
  profit_percentage: 'Profit %',
  avg_rating: 'Rating',
  wastage_percentage: 'Wastage %',
  total_quantity_sold: 'Units Sold',
  total_wastage: 'Total Wastage',
  wastage_cost_estimate: 'Wastage Cost',
  promotion_dependency: 'Promo Dependency',
}

function formatEvidenceValue(key, value) {
  if (key === 'promotion_dependency') return `${(value * 100).toFixed(0)}%`
  if (key === 'wastage_cost_estimate') return `$${value.toLocaleString()}`
  if (key.includes('percentage')) return `${value}%`
  if (typeof value === 'number') return value.toLocaleString()
  return String(value)
}

function RecommendationCard({ rec, delay }) {
  return (
    <div className="card anim-fade-up p-5" style={{ animationDelay: `${delay}ms` }}>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <span className="badge badge-orange">{rec.action}</span>
        <span className={`badge ${PRIORITY_TONE[rec.priority] ?? 'badge-gray'}`}>{rec.priority}</span>
      </div>
      <h4 className="font-display text-[0.95rem] font-bold text-ink-900">{rec.item_name}</h4>
      <p className="mt-1.5 text-xs leading-relaxed text-ink-500">{rec.reason}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {Object.entries(rec.evidence).map(([key, value]) => (
          <span key={key} className="chip !cursor-default !py-1 !text-[0.68rem]">
            {EVIDENCE_LABELS[key] ?? key}: <strong>{formatEvidenceValue(key, value)}</strong>
          </span>
        ))}
      </div>
      <p className="mt-3 text-xs font-bold text-brand-600">{rec.estimated_impact}</p>
    </div>
  )
}

const TABS = ['All', 'Critical', 'High', 'Medium']

export default function Recommendations() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('All')

  useEffect(() => {
    api.recommendations
      .all()
      .then((res) => setData(res))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const rows = useMemo(() => {
    if (!data) return []
    return activeTab === 'All' ? data.recommendations : data.recommendations.filter((r) => r.priority === activeTab)
  }, [data, activeTab])

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />

  return (
    <>
      <PageHeader
        title="Recommendations"
        subtitle="Suggested actions, ranked by priority, based on menu performance"
        actions={<span className="badge badge-green"><span className="live-dot mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live data feed</span>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Recommendations" value={String(data.total)} icon={ListChecks} accent="#f95d0b" />
        <KpiCard label="Critical" value={String(data.critical)} icon={AlertOctagon} accent="#d92d20" delay={60} />
        <KpiCard label="High Priority" value={String(data.high)} icon={AlertTriangle} accent="#b54708" delay={120} />
        <KpiCard label="Medium Priority" value={String(data.medium)} icon={CircleAlert} accent="#1d4ed8" delay={180} />
      </div>

      <div className="my-5 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`chip ${activeTab === tab ? 'chip-active' : ''}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((r, i) => (
          <RecommendationCard key={`${r.item_id}-${r.action}`} rec={r} delay={(i % 3) * 70} />
        ))}
      </div>

      {rows.length === 0 && (
        <div className="card p-10 text-center text-sm text-ink-400">No recommendations in this priority right now.</div>
      )}
    </>
  )
}
