import { useState } from 'react'
import { AlertTriangle, Gauge, Siren, Star, TriangleAlert } from 'lucide-react'
import { api } from '../../services/api'
import PageHeader from '../../components/layout/PageHeader'
import KpiCard from '../../components/ui/KpiCard'
import DataTable from '../../components/ui/DataTable'
import ChartCard from '../../components/charts/ChartCard'
import LoadingState, { ErrorState } from '../../components/ui/LoadingState'
import useApi from '../../hooks/useApi'
import { downloadCSV } from '../../utils/helpers'

const SEVERITY_TONE = {
  Critical: 'badge-red',
  High: 'badge-orange',
  Medium: 'badge-amber',
}
const RATING_RULES = new Set(['RATING_SHIFT', 'IDENTICAL_BURST', 'VOLUME_BURST'])
const VIEWS = [
  { key: 'all', label: 'All anomalies' },
  { key: 'sales', label: 'Sales' },
  { key: 'ratings', label: 'Ratings' },
]

export default function AnomalyDetection() {
  const all = useApi(() => api.anomalies.sales())
  const ratings = useApi(() => api.anomalies.ratings())
  const [view, setView] = useState('all')
  const [severity, setSeverity] = useState('all')

  if (all.loading) return <LoadingState />
  if (all.error) return <ErrorState message={all.error} />

  const data = all.data
  const ratingCount = data.anomalies.filter((a) => RATING_RULES.has(a.rule)).length
  const rows = data.anomalies
    .filter((a) => view === 'all' || (view === 'ratings') === RATING_RULES.has(a.rule))
    .filter((a) => severity === 'all' || a.severity === severity)

  const columns = [
    { key: 'name', header: 'Item', render: (r) => <span className="font-semibold text-ink-900">{r.item_name}</span> },
    { key: 'type', header: 'Type', render: (r) => r.type },
    { key: 'severity', header: 'Severity', render: (r) => <span className={`badge ${SEVERITY_TONE[r.severity] ?? 'badge-gray'}`}>{r.severity}</span> },
    { key: 'date', header: 'Date', render: (r) => r.date ?? '—' },
    { key: 'value', header: 'Value', align: 'right', render: (r) => r.value },
    { key: 'baseline', header: 'Baseline', align: 'right', render: (r) => r.baseline ?? '—' },
    { key: 'rule', header: 'Rule', render: (r) => <span className="font-mono text-[0.68rem] text-ink-500">{r.rule}</span> },
    { key: 'description', header: 'Evidence', render: (r) => <span className="text-xs text-ink-500">{r.description}</span> },
  ]

  return (
    <>
      <PageHeader title="Anomaly Detection" subtitle="Rule-based detection of unusual sales and rating patterns, with the evidence for each flag" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Total Anomalies" value={String(data.total)} icon={Gauge} accent="#6938ef" />
        <KpiCard label="Critical" value={String(data.critical)} icon={Siren} accent="#d92d20" delay={60} />
        <KpiCard label="High" value={String(data.high)} icon={AlertTriangle} accent="#e6650f" delay={120} />
        <KpiCard label="Medium" value={String(data.medium)} icon={TriangleAlert} accent="#eab308" delay={180} />
        <KpiCard label="Rating anomalies" value={String(ratingCount)} icon={Star} accent="#1d4ed8" delay={240} />
      </div>

      {ratings.data && (
        <ChartCard title="Rating anomaly rules" subtitle="Time-window checks on every item's ratings" className="mt-5">
          <div className="grid gap-3 md:grid-cols-3">
            {Object.entries(ratings.data.rules).map(([rule, text]) => (
              <div key={rule} className="rounded-xl border border-ink-100 p-3.5">
                <p className="font-mono text-xs font-bold text-ink-900">{rule}</p>
                <p className="mt-1 text-xs text-ink-500">{text}</p>
                <p className="mt-2 text-xs font-semibold text-brand-600">{ratings.data.anomalies.filter((a) => a.rule === rule).length} item(s) flagged</p>
              </div>
            ))}
          </div>
        </ChartCard>
      )}

      <ChartCard
        title="Detected anomalies" subtitle={`${rows.length} shown`} className="mt-5"
        actions={
          <div className="flex items-center gap-2">
            {VIEWS.map((v) => (
              <button key={v.key} className={`chip ${view === v.key ? 'chip-active' : ''}`} onClick={() => setView(v.key)}>{v.label}</button>
            ))}
            <select className="input !w-auto !py-1.5 text-xs" value={severity} onChange={(e) => setSeverity(e.target.value)}>
              <option value="all">All severities</option>
              {Object.keys(SEVERITY_TONE).map((s) => <option key={s}>{s}</option>)}
            </select>
            <button className="btn btn-ghost !rounded-lg !px-3 !py-1.5 text-xs" onClick={() => downloadCSV(rows, 'anomalies.csv')}>CSV</button>
          </div>
        }
      >
        <DataTable columns={columns} rows={rows} rowKey={(r) => `${r.rule}-${r.item_id}-${r.type}-${r.date}`} maxHeight={560} emptyMessage="No anomalies detected." />
      </ChartCard>
    </>
  )
}
