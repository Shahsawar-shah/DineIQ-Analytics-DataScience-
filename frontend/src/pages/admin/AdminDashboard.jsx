import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity, Cpu, FileBarChart, GitCommitHorizontal, ShieldCheck, Users, UtensilsCrossed,
} from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import { api } from '../../services/api'
import PageHeader from '../../components/layout/PageHeader'
import KpiCard from '../../components/ui/KpiCard'
import ChartCard from '../../components/charts/ChartCard'
import ConfusionMatrix from '../../components/charts/ConfusionMatrix'
import LoadingState, { ErrorState } from '../../components/ui/LoadingState'
import { InsightCard } from '../../components/ui/InsightCard'
import { fmtMoney, fmtNum, fmtPct } from '../../utils/helpers'

const CLASS_BADGE = {
  'Profit Driver': 'badge-green',
  'Volume Driver': 'badge-blue',
  'Hidden Opportunity': 'badge-orange',
  'Low Performer': 'badge-red',
}
const ROLE_COLORS = ['#f95d0b', '#1d4ed8', '#0d9459', '#6938ef', '#f9a825', '#e11d48', '#878ba7']
const COMPARISON_PAGE_SIZE = 25
const MENU_FILTERS = ['All', 'Profit Driver', 'Volume Driver', 'Hidden Opportunity', 'Low Performer']
const TABS = ['Overview', 'ML Pipelines', 'Menu Items']

const pct = (x) => (x === null || x === undefined ? '—' : `${(x * 100).toFixed(1)}%`)

function ModelMetricsTable({ models, bestModel }) {
  return (
    <table className="dq-table w-full text-sm">
      <thead>
        <tr>
          <th>Model</th><th>Accuracy</th><th>Precision</th><th>Recall</th><th>Macro F1</th><th>Train F1</th><th>Latency</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(models).map(([name, m]) => (
          <tr key={name}>
            <td className="font-semibold text-ink-900">
              {name}
              {name === bestModel && <span className="badge badge-green ml-2">Best</span>}
            </td>
            <td>{pct(m.accuracy)}</td>
            <td>{m.precision.toFixed(2)}</td>
            <td>{m.recall.toFixed(2)}</td>
            <td className="font-semibold">{m.f1_score.toFixed(2)}</td>
            <td className="text-ink-400">{m.train?.f1_score?.toFixed(2) ?? '—'}</td>
            <td>
              {m.prediction_latency_ms.toFixed(1)} ms
              <span className="block text-[0.65rem] text-ink-400">{m.latency_per_record_ms} ms / record</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function PerClassTable({ perClass }) {
  return (
    <table className="dq-table w-full text-sm">
      <thead><tr><th>Class</th><th>Precision</th><th>Recall</th><th>F1</th><th>Support</th></tr></thead>
      <tbody>
        {Object.entries(perClass).map(([cls, r]) => (
          <tr key={cls}>
            <td className="font-medium text-ink-900">{cls}</td>
            <td>{r.precision.toFixed(2)}</td>
            <td>{r.recall.toFixed(2)}</td>
            <td>{r.f1.toFixed(2)}</td>
            <td>{r.support}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function PipelineCard({ title, pipeline }) {
  const best = pipeline.models[pipeline.best_model]
  return (
    <div className="card p-5">
      <h3 className="font-display mb-1 text-lg font-bold text-ink-900">{title}</h3>
      <p className="mb-3 text-xs text-ink-400">{pipeline.platform} · version <span className="font-mono">{pipeline.model_version}</span> · trained {pipeline.trained_at.replace('T', ' ')}</p>
      <div className="mb-4 flex flex-wrap gap-2">
        <span className="badge badge-blue">70% train ({pipeline.train_size}) / 30% test ({pipeline.test_size})</span>
        <span className="badge badge-gray">{pipeline.split_method}</span>
      </div>
      <h4 className="mb-2 text-sm font-bold text-ink-700">Test-set results</h4>
      <div className="mb-6 overflow-x-auto">
        <ModelMetricsTable models={pipeline.models} bestModel={pipeline.best_model} />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="overflow-x-auto">
          <ConfusionMatrix
            matrix={best.confusion_matrix}
            classes={pipeline.classes}
            title={`${pipeline.best_model} confusion matrix`}
            subtitle={`Test set: ${pipeline.test_size} unseen items`}
          />
        </div>
        <div className="overflow-x-auto">
          <h4 className="mb-2 text-sm font-bold text-ink-700">Per-class metrics</h4>
          <PerClassTable perClass={best.per_class} />
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Overview tab: every number comes from the API                      */
/* ------------------------------------------------------------------ */
function OverviewTab() {
  const [state, setState] = useState({ loading: true, error: null })

  useEffect(() => {
    Promise.allSettled([
      api.auth.users(), api.dashboard.summary(), api.locations.summary(),
      api.admin.sparkJobs(20), api.admin.auditLogs({ limit: 6 }),
    ]).then(([users, summary, locations, jobs, audit]) => {
      const value = (r) => (r.status === 'fulfilled' ? r.value : null)
      if (!value(summary)) {
        setState({ loading: false, error: summary.reason?.message || 'Could not load the dashboard summary.' })
        return
      }
      setState({
        loading: false, error: null,
        users: value(users) ?? [], summary: value(summary), locations: value(locations) ?? [],
        jobs: value(jobs), audit: value(audit),
      })
    })
  }, [])

  if (state.loading) return <LoadingState />
  if (state.error) return <ErrorState message={state.error} />

  const { users, summary, locations, jobs, audit } = state
  const roleCounts = Object.entries(
    users.reduce((acc, u) => ({ ...acc, [u.role]: (acc[u.role] ?? 0) + 1 }), {}),
  ).map(([name, value], i) => ({ name, value, color: ROLE_COLORS[i % ROLE_COLORS.length] }))
  const cleaning = [
    { stage: 'Raw records', value: summary.records_processed },
    { stage: 'Removed', value: summary.records_removed },
    { stage: 'Quarantined', value: summary.records_quarantined },
    { stage: 'Clean', value: summary.records_cleaned },
  ].filter((r) => r.value !== null && r.value !== undefined)
  const failedJobs = jobs?.failed_runs ?? 0

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <KpiCard label="Total Users" value={fmtNum(users.length)} icon={Users} accent="#f95d0b" />
        <KpiCard label="Active Users" value={fmtNum(users.filter((u) => u.is_active).length)} icon={Activity} accent="#0d9459" delay={60} />
        <KpiCard label="Locations" value={fmtNum(locations.length)} icon={UtensilsCrossed} accent="#1d4ed8" delay={120} />
        <KpiCard label="Completed Orders" value={fmtNum(summary.total_orders)} icon={GitCommitHorizontal} accent="#6938ef" delay={180} />
        <KpiCard label="Clean Data" value={fmtPct(summary.data_quality_score)} icon={ShieldCheck} accent="#f9a825" delay={240} />
        <KpiCard
          label="Spark Jobs"
          value={jobs ? `${jobs.successful_runs}/${jobs.total_runs}` : '—'}
          footer={<span className={`badge mt-1 ${failedJobs ? 'badge-red' : 'badge-green'}`}>{failedJobs ? `${failedJobs} failed run(s)` : 'No failed runs'}</span>}
          icon={Cpu} accent="#0d9459" delay={300}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <ChartCard title="User Management" subtitle="Newest accounts" className="xl:col-span-2"
          actions={<Link to="../users" relative="path" className="text-xs font-bold text-brand-600 hover:underline">Manage users</Link>}>
          <div className="overflow-x-auto">
            <table className="dq-table">
              <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Created</th></tr></thead>
              <tbody>
                {[...users].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '')).slice(0, 6).map((u) => (
                  <tr key={u.id}>
                    <td>
                      <p className="font-semibold text-ink-900">{u.name}</p>
                      <p className="text-[0.68rem] text-ink-400">{u.email}</p>
                    </td>
                    <td>{u.role}</td>
                    <td><span className={`badge ${u.is_active ? 'badge-green' : 'badge-gray'}`}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td className="text-ink-400">{u.created_at?.slice(0, 10) ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>

        <ChartCard title="Role Distribution" subtitle={`${users.length} accounts`}>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={roleCounts} dataKey="value" nameKey="name" innerRadius={50} outerRadius={75} paddingAngle={4} strokeWidth={0}>
                  {roleCounts.map((r) => <Cell key={r.name} fill={r.color} />)}
                </Pie>
                <RTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5">
            {roleCounts.map((r) => (
              <div key={r.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-ink-500">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
                  {r.name}
                </span>
                <span className="font-bold text-ink-900">{fmtNum(r.value)}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <ChartCard title="Data Cleaning Outcome" subtitle="From the Spark cleaning job">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cleaning}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
                <XAxis dataKey="stage" tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} />
                <YAxis scale="log" domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtNum(v)} />
                <RTooltip formatter={(v) => fmtNum(v)} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#f95d0b" name="Records" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Spark Jobs" subtitle="Latest run of each job"
          actions={<Link to="../system-monitoring" relative="path" className="text-xs font-bold text-brand-600 hover:underline">Details</Link>}>
          <div className="space-y-2.5">
            {(jobs?.latest_by_job ?? []).map((j) => (
              <div key={j.job_name} className="flex items-center gap-3 rounded-xl border border-ink-100 px-3.5 py-2.5">
                <span className={`h-2 w-2 rounded-full ${j.status === 'success' ? 'bg-emerald-500' : j.status === 'running' ? 'bg-sky-500' : 'bg-rose-500'}`} />
                <span className="flex-1 truncate text-xs font-semibold text-ink-700">{j.job_name}</span>
                <span className="text-[0.68rem] text-ink-400">{j.duration_seconds ?? '—'} s</span>
                <span className={`badge ${j.status === 'success' ? 'badge-green' : j.status === 'running' ? 'badge-blue' : 'badge-red'}`}>{j.status}</span>
              </div>
            ))}
            {!jobs && <p className="text-xs text-ink-400">Spark job log unavailable.</p>}
          </div>
        </ChartCard>

        <ChartCard title="Recent Activity" subtitle="Latest audit-trail events"
          actions={<Link to="../audit-logs" relative="path" className="text-xs font-bold text-brand-600 hover:underline">Audit logs</Link>}>
          <div className="space-y-0.5">
            {(audit?.logs ?? []).map((l) => (
              <div key={l.id} className="flex gap-3 rounded-xl px-2 py-2.5 transition hover:bg-brand-50/60">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${l.result === 'failure' ? 'bg-rose-500' : 'bg-sky-400'}`} />
                <div className="min-w-0">
                  <p className="text-xs font-medium leading-snug text-ink-700">{l.action} <span className="text-ink-400">{l.method} {l.endpoint} → {l.status_code}</span></p>
                  <p className="text-[0.65rem] text-ink-300">{l.user_email} · {l.created_at?.replace('T', ' ').slice(0, 19)}</p>
                </div>
              </div>
            ))}
            {!audit && <p className="text-xs text-ink-400">Audit log unavailable.</p>}
          </div>
        </ChartCard>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InsightCard tone={failedJobs ? 'danger' : 'success'} title="Spark pipeline"
          text={jobs ? `${jobs.successful_runs} of ${jobs.total_runs} recorded Spark runs succeeded; ${fmtNum(jobs.total_records_processed)} records in the latest runs.` : 'No Spark job log found.'} />
        <InsightCard tone="warn" title="Customers at risk"
          text={`${fmtNum(summary.at_risk_customers)} customers are 60+ days inactive with falling order frequency and spend.`} delay={60} />
        <InsightCard tone="info" title="Next 7 days demand"
          text={summary.forecast_units_next_7_days ? `${fmtNum(summary.forecast_units_next_7_days)} units forecast across all locations (estimate).` : 'Run the forecasting pipeline to see projected demand.'} delay={120} />
        <InsightCard tone="info" title="Data quality"
          text={`${fmtNum(summary.records_removed)} records removed and ${fmtNum(summary.records_quarantined)} quarantined by the Spark cleaning rules.`} delay={180} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <ChartCard title="Locations Overview" subtitle="Full-year revenue, orders and ratings">
          <div className="max-h-96 overflow-auto">
            <table className="dq-table">
              <thead><tr><th>Location</th><th>City</th><th>Orders</th><th>Revenue</th><th>Rating</th><th>Wastage cost</th></tr></thead>
              <tbody>
                {locations.map((l) => (
                  <tr key={l.restaurant_id}>
                    <td className="font-semibold text-ink-900">{l.restaurant_name}</td>
                    <td>{l.location_city}</td>
                    <td>{fmtNum(l.total_orders)}</td>
                    <td className="font-semibold">{fmtMoney(l.total_revenue)}</td>
                    <td>{Number(l.avg_rating).toFixed(2)}</td>
                    <td>{fmtMoney(l.total_wastage_cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>

        <ChartCard title="Quick Reports" subtitle="Generate and export from live data"
          actions={<Link to="../reports" relative="path" className="text-xs font-bold text-brand-600 hover:underline">All reports</Link>}>
          <div className="grid gap-3 sm:grid-cols-2">
            {[['User Activity Report', '../users'], ['Data Quality Summary', '../data-quality'], ['Spark Job History', '../system-monitoring'], ['Audit Trail Export', '../audit-logs']].map(([r, to]) => (
              <Link key={r} to={to} relative="path" className="group flex items-center gap-3 rounded-xl border border-ink-100 p-3.5 transition hover:border-brand-200 hover:shadow-md">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-500">
                  <FileBarChart size={17} />
                </div>
                <p className="min-w-0 flex-1 truncate text-xs font-bold text-ink-900">{r}</p>
              </Link>
            ))}
          </div>
        </ChartCard>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* ML Pipelines tab: real metrics + real Spark vs Python comparison   */
/* ------------------------------------------------------------------ */
function MlPipelinesTab() {
  const [state, setState] = useState({ loading: true, error: null })
  const [page, setPage] = useState(1)
  const [onlyMismatches, setOnlyMismatches] = useState(false)

  useEffect(() => {
    Promise.all([api.dashboard.mlMetrics(), api.dualPipeline.menu('all')])
      .then(([metrics, comparison]) => setState({ loading: false, error: null, metrics, rows: comparison.records }))
      .catch((err) => setState({ loading: false, error: err.message || 'Could not load ML metrics.' }))
  }, [])

  const rows = useMemo(() => (state.rows ?? []).filter((r) => !onlyMismatches || !r.match), [state.rows, onlyMismatches])

  if (state.loading) return <LoadingState />
  if (state.error) return <ErrorState message={state.error} />

  const { metrics } = state
  const cmp = metrics.comparison
  const customers = metrics.customer_comparison
  const pageCount = Math.max(1, Math.ceil(rows.length / COMPARISON_PAGE_SIZE))
  const pageRows = rows.slice((page - 1) * COMPARISON_PAGE_SIZE, page * COMPARISON_PAGE_SIZE)
  const gbt = metrics.spark_pipeline.models['GBT (binary)']

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
        <PipelineCard title="Python pipeline: scikit-learn + XGBoost" pipeline={metrics.python_pipeline} />
        <div className="space-y-3">
          <PipelineCard title="Spark MLlib pipeline" pipeline={{
            ...metrics.spark_pipeline,
            models: Object.fromEntries(Object.entries(metrics.spark_pipeline.models).filter(([n]) => n !== 'GBT (binary)')),
          }} />
          {gbt && (
            <div className="rounded-xl border border-sky-100 bg-sky-50 p-4 text-xs text-sky-800">
              <span className="font-bold">GBT (binary, Profit Driver vs rest):</span> accuracy {pct(gbt.accuracy)}, macro F1 {gbt.f1_score.toFixed(2)}, latency {gbt.prediction_latency_ms.toFixed(1)} ms.
              Spark's GBTClassifier has no multiclass mode, so it is reported separately and is not eligible as the 4-class model.
            </div>
          )}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-display mb-1 text-lg font-bold text-ink-900">Spark vs Python: independent results compared</h3>
        <p className="mb-4 text-sm text-ink-500">
          Menu classification: {cmp.total_items} items ({cmp.test_items} unseen test items) · Customer segmentation: {fmtNum(customers.test_records)} unseen customers
        </p>
        <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-ink-100 bg-ink-50 p-4 text-center">
            <div className="mb-1 text-xs font-semibold text-ink-500">Menu agreement (all)</div>
            <div className="text-3xl font-extrabold text-ink-900">{cmp.agreement_pct}%</div>
            <div className="text-xs text-ink-400">{cmp.agreement_count}/{cmp.total_items} items</div>
          </div>
          <div className="rounded-lg bg-brand-50 p-4 text-center">
            <div className="mb-1 text-xs font-semibold text-brand-600">Menu agreement (unseen)</div>
            <div className="text-3xl font-extrabold text-brand-700">{cmp.test_agreement_pct}%</div>
            <div className="text-xs text-brand-600">{cmp.test_items} test items</div>
          </div>
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-center">
            <div className="mb-1 text-xs font-semibold text-emerald-600">Customer agreement</div>
            <div className="text-3xl font-extrabold text-emerald-600">{customers.agreement_pct}%</div>
            <div className="text-xs text-emerald-600">{fmtNum(customers.agreement_count)} customers</div>
          </div>
          <div className="rounded-lg border border-rose-100 bg-rose-50 p-4 text-center">
            <div className="mb-1 text-xs font-semibold text-rose-600">Menu disagreements</div>
            <div className="text-3xl font-extrabold text-rose-600">{cmp.different_count}</div>
            <div className="text-xs text-rose-500">see explanations below</div>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-xs text-ink-500">Both pipelines are trained independently on the same records and split; neither reads the other's predictions.</p>
          <label className="flex items-center gap-2 text-xs font-semibold text-ink-600">
            <input type="checkbox" checked={onlyMismatches} onChange={(e) => { setOnlyMismatches(e.target.checked); setPage(1) }} />
            Only disagreements
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="dq-table w-full text-sm">
            <thead>
              <tr><th>ID</th><th>Item</th><th>Split</th><th>Actual</th><th>Spark</th><th>Python</th><th>Prob. Δ</th><th>Match</th><th>Explanation</th></tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.record_id} className={r.match ? '' : '!bg-amber-50/60'}>
                  <td className="text-ink-400">{r.record_id}</td>
                  <td className="font-medium text-ink-900">{r.item_name}</td>
                  <td><span className={`badge ${r.split === 'test' ? 'badge-blue' : 'badge-gray'}`}>{r.split}</span></td>
                  <td>{r.actual_class}</td>
                  <td><span className={`badge ${CLASS_BADGE[r.spark_result] ?? 'badge-gray'}`}>{r.spark_result}</span> <span className="text-[0.65rem] text-ink-400">{r.spark_probability}</span></td>
                  <td><span className={`badge ${CLASS_BADGE[r.python_result] ?? 'badge-gray'}`}>{r.python_result}</span> <span className="text-[0.65rem] text-ink-400">{r.python_probability}</span></td>
                  <td>{r.probability_difference}</td>
                  <td>{r.match ? <span className="font-semibold text-emerald-600">Yes</span> : <span className="font-semibold text-amber-600">No</span>}</td>
                  <td className="max-w-xs text-xs text-ink-500">{r.explanation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-ink-500">
          <span>Page {page} of {pageCount} · {rows.length} rows</span>
          <div className="flex gap-2">
            <button className="btn btn-ghost !rounded-lg !px-3 !py-1.5 text-xs" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
            <button className="btn btn-ghost !rounded-lg !px-3 !py-1.5 text-xs" disabled={page === pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>Next</button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Menu Items tab                                                       */
/* ------------------------------------------------------------------ */
function MenuItemsTab() {
  const [state, setState] = useState({ loading: true, error: null, items: [] })
  const [filter, setFilter] = useState('All')

  useEffect(() => {
    Promise.all([api.menu.items(), api.menu.classifications()])
      .then(([items, classes]) => {
        const byId = Object.fromEntries(classes.map((c) => [c.item_id, c]))
        setState({ loading: false, error: null, items: items.map((i) => ({ ...i, classification: byId[i.item_id]?.python_class, model_version: byId[i.item_id]?.model_version })) })
      })
      .catch((err) => setState({ loading: false, error: err.message, items: [] }))
  }, [])

  if (state.loading) return <LoadingState />
  if (state.error) return <ErrorState message={state.error} />
  const rows = filter === 'All' ? state.items : state.items.filter((r) => r.classification === filter)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {MENU_FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`chip ${filter === f ? 'chip-active' : ''}`}>{f}</button>
        ))}
      </div>
      <ChartCard title="Menu Items" subtitle={`${rows.length} items · classes from the Python pipeline (${state.items[0]?.model_version ?? ''})`}>
        <div className="overflow-x-auto">
          <table className="dq-table w-full text-sm">
            <thead><tr><th>ID</th><th>Item</th><th>Category</th><th>Base Price</th><th>Profit %</th><th>Avg Rating</th><th>Wastage %</th><th>Class</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.item_id}>
                  <td className="text-ink-400">{r.item_id}</td>
                  <td className="font-medium text-ink-900">{r.item_name}</td>
                  <td>{r.category_id}</td>
                  <td>{fmtMoney(r.base_price, 2)}</td>
                  <td className={r.profit_percentage > 50 ? 'font-semibold text-emerald-600' : r.profit_percentage < 0 ? 'font-semibold text-rose-600' : ''}>{fmtPct(r.profit_percentage)}</td>
                  <td>{Number(r.avg_rating).toFixed(2)}</td>
                  <td>{fmtPct(r.wastage_percentage)}</td>
                  <td><span className={`badge ${CLASS_BADGE[r.classification] ?? 'badge-gray'}`}>{r.classification ?? '—'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  )
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('Overview')
  return (
    <>
      <PageHeader title="Administrator Console" subtitle="Users, data health, Spark jobs and model quality, live from the platform" />
      <div className="mb-5 flex gap-1 border-b border-ink-100">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-semibold transition-colors ${activeTab === tab ? 'border-b-2 border-brand-500 text-brand-600' : 'text-ink-500 hover:text-ink-900'}`}
          >
            {tab}
          </button>
        ))}
      </div>
      {activeTab === 'Overview' && <OverviewTab />}
      {activeTab === 'ML Pipelines' && <MlPipelinesTab />}
      {activeTab === 'Menu Items' && <MenuItemsTab />}
    </>
  )
}
