import { useEffect, useState } from 'react'
import { Check, Download, X } from 'lucide-react'
import { api } from '../../services/api'
import PageHeader from '../../components/layout/PageHeader'
import ChartCard from '../../components/charts/ChartCard'
import DataTable from '../../components/ui/DataTable'
import LoadingState, { ErrorState } from '../../components/ui/LoadingState'
import { InsightCard } from '../../components/ui/InsightCard'
import useApi from '../../hooks/useApi'
import { downloadCSV, fmtNum } from '../../utils/helpers'

const PAGE_SIZE = 100
const SEGMENT_TONE = {
  'High-Value Loyal': 'badge-green',
  Frequent: 'badge-blue',
  'Promotion-Driven': 'badge-orange',
  'At-Risk': 'badge-red',
  Occasional: 'badge-gray',
}

/** "Logistic Regression (spark-menu-2026…)" -> model name on one line, version below, wrapping inside its cell. */
function ModelLabel({ text }) {
  const match = /^(.*?)\s*\((.+)\)$/.exec(text ?? '')
  const [name, version] = match ? [match[1], match[2]] : [null, text]
  return (
    <div className="min-w-0 whitespace-normal">
      {name && <p className="font-semibold text-ink-900">{name}</p>}
      <p className="break-all font-mono text-[0.68rem] text-ink-500">{version}</p>
    </div>
  )
}

function Stat({ label, value, sub, tone = 'text-ink-900' }) {
  return (
    <div className="card p-5 text-center">
      <p className="text-xs font-semibold text-ink-500">{label}</p>
      <p className={`mt-2 text-3xl font-extrabold ${tone}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-ink-400">{sub}</p>}
    </div>
  )
}

export default function DualPipeline() {
  const summary = useApi(() => api.dualPipeline.summary())
  const [filters, setFilters] = useState({ status: 'all', segment: '' })
  const [page, setPage] = useState(0)
  const [table, setTable] = useState({ loading: true, error: null, total: 0, records: [] })

  useEffect(() => {
    setTable((t) => ({ ...t, loading: true }))
    api.dualPipeline.customers({ ...filters, limit: PAGE_SIZE, offset: page * PAGE_SIZE })
      .then((d) => setTable({ loading: false, error: null, total: d.total, records: d.records }))
      .catch((err) => setTable({ loading: false, error: err.message, total: 0, records: [] }))
  }, [filters, page])

  if (summary.loading) return <LoadingState />
  if (summary.error) return <ErrorState message={summary.error} />

  const menu = summary.data.menu_classification
  const cust = summary.data.customer_segmentation
  const pageCount = Math.max(1, Math.ceil(table.total / PAGE_SIZE))

  const columns = [
    { key: 'id', header: 'Customer ID', render: (r) => <span className="font-mono text-xs">{r.record_id}</span> },
    { key: 'actual', header: 'Designed segment', render: (r) => <span className="text-xs text-ink-500">{r.actual_segment}</span> },
    { key: 'spark', header: 'Spark K-Means', render: (r) => <span className={`badge ${SEGMENT_TONE[r.spark_result] ?? 'badge-gray'}`}>{r.spark_result}</span> },
    { key: 'python', header: 'Python K-Means', render: (r) => <span className={`badge ${SEGMENT_TONE[r.python_result] ?? 'badge-gray'}`}>{r.python_result}</span> },
    { key: 'match', header: 'Match', render: (r) => (r.match ? <span className="inline-flex items-center gap-1 font-semibold text-emerald-600"><Check size={14} /> Match</span> : <span className="inline-flex items-center gap-1 font-semibold text-rose-600"><X size={14} /> Mismatch</span>) },
    { key: 'diff', header: 'Distance Δ', align: 'right', render: (r) => r.numerical_difference.toFixed(4) },
    { key: 'margin', header: 'Margin (S / P)', align: 'right', render: (r) => `${r.spark_margin.toFixed(2)} / ${r.python_margin.toFixed(2)}` },
    { key: 'rfm', header: 'R / F / M', render: (r) => <span className="text-xs text-ink-500">{r.recency_days}d / {r.frequency} / ${fmtNum(r.monetary_value)}</span> },
    { key: 'why', header: 'Explanation', render: (r) => <span className="block min-w-[320px] whitespace-normal text-xs leading-snug text-ink-500">{r.explanation || '—'}</span> },
  ]

  return (
    <>
      <PageHeader title="Dual Pipeline Comparison" subtitle="Spark MLlib vs Python, trained independently on the same records, compared on unseen data" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Customer segmentation agreement" value={`${cust.agreement_pct}%`} sub={`${fmtNum(cust.agreement_count)} of ${fmtNum(cust.test_records)} unseen customers`} tone="text-emerald-600" />
        <Stat label="Disagreements" value={fmtNum(cust.disagreement_count)} sub={`${cust.boundary_disagreements} are cluster-boundary cases`} tone="text-rose-600" />
        <Stat label="Menu classification agreement" value={`${menu.test_agreement_pct}%`} sub={`${menu.test_records} unseen items (${menu.agreement_pct}% on all ${menu.total_records})`} tone="text-brand-600" />
        <Stat label="Accuracy on unseen items" value={`${menu.spark_test_accuracy_pct}% / ${menu.python_test_accuracy_pct}%`} sub="Spark / Python vs rule-based label" />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <ChartCard title="Models compared" subtitle="Each pipeline's own saved model version">
          <div className="overflow-x-auto">
            <table className="dq-table w-full table-fixed text-sm">
              <colgroup><col className="w-[36%]" /><col className="w-[32%]" /><col className="w-[32%]" /></colgroup>
              <thead><tr><th>Task</th><th>Spark MLlib</th><th>Python + scikit-learn</th></tr></thead>
              <tbody>
                <tr><td className="!whitespace-normal font-semibold">{menu.task}</td><td><ModelLabel text={menu.spark_model} /></td><td><ModelLabel text={menu.python_model} /></td></tr>
                <tr><td className="!whitespace-normal font-semibold">{cust.task}</td><td><ModelLabel text={cust.spark_model} /></td><td><ModelLabel text={cust.python_model} /></td></tr>
                <tr><td className="!whitespace-normal font-semibold">Test silhouette</td><td>{cust.spark_test_silhouette}</td><td>{cust.python_test_silhouette}</td></tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-ink-400">{cust.silhouette_note}</p>
        </ChartCard>

        <ChartCard title="Agreement by segment" subtitle="Rows = Spark segment">
          <table className="dq-table w-full text-sm">
            <thead><tr><th>Segment</th><th>Customers</th><th>Matches</th><th>Agreement</th></tr></thead>
            <tbody>
              {cust.per_segment.map((s) => (
                <tr key={s.segment}>
                  <td><span className={`badge ${SEGMENT_TONE[s.segment] ?? 'badge-gray'}`}>{s.segment}</span></td>
                  <td>{fmtNum(s.records)}</td>
                  <td>{fmtNum(s.matches)}</td>
                  <td className="font-semibold">{s.agreement_pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ChartCard>
      </div>

      <ChartCard
        title="Record-level comparison: unseen customers"
        subtitle={`${fmtNum(table.total)} records · page ${page + 1} of ${pageCount}`}
        className="mt-5"
        actions={
          <div className="flex items-center gap-2">
            <select className="input !py-1.5 text-xs" value={filters.status} onChange={(e) => { setFilters((f) => ({ ...f, status: e.target.value })); setPage(0) }}>
              <option value="all">All records</option>
              <option value="match">Matches</option>
              <option value="mismatch">Mismatches</option>
            </select>
            <select className="input !py-1.5 text-xs" value={filters.segment} onChange={(e) => { setFilters((f) => ({ ...f, segment: e.target.value })); setPage(0) }}>
              <option value="">All segments</option>
              {Object.keys(SEGMENT_TONE).map((s) => <option key={s}>{s}</option>)}
            </select>
            <button className="btn btn-ghost !rounded-lg !px-3 !py-1.5 text-xs" onClick={() => downloadCSV(table.records, 'dual_pipeline_comparison_page.csv')}>
              <Download size={13} /> CSV
            </button>
          </div>
        }
      >
        {table.error ? <ErrorState message={table.error} /> : (
          <>
            <DataTable columns={columns} rows={table.records} rowKey={(r) => r.record_id} maxHeight={520} emptyMessage={table.loading ? 'Loading…' : 'No records.'} />
            <div className="mt-4 flex items-center justify-end gap-2 text-xs">
              <button className="btn btn-ghost !rounded-lg !px-3 !py-1.5 text-xs" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Prev</button>
              <button className="btn btn-ghost !rounded-lg !px-3 !py-1.5 text-xs" disabled={page + 1 >= pageCount} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          </>
        )}
      </ChartCard>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <InsightCard
          tone="info"
          title="Why the pipelines disagree"
          text={`${cust.boundary_disagreements} of ${cust.disagreement_count} customer disagreements are boundary cases whose nearest two centroids are almost equally close. Spark uses k-means|| with a sample-std scaler; scikit-learn uses k-means++ with 10 restarts and a population-std scaler, so the centroids differ slightly.`}
        />
        <InsightCard
          tone="warn"
          title="Menu classification disagreements"
          text={`${menu.disagreement_count} of ${menu.total_records} items differ between Spark (${menu.spark_model}) and Python (${menu.python_model}). Different model families draw different decision boundaries, so items close to a label threshold can land in different classes. Each row's explanation is in the Admin ML Pipelines tab.`}
        />
      </div>
    </>
  )
}
