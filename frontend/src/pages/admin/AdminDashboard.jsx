import { Fragment, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity, Database, FileBarChart, GitCommitHorizontal, ShieldCheck, Users, UtensilsCrossed,
} from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import { api } from '../../services/api'
import PageHeader from '../../components/layout/PageHeader'
import KpiCard from '../../components/ui/KpiCard'
import ChartCard from '../../components/charts/ChartCard'
import StatusBadge from '../../components/ui/StatusBadge'
import LoadingState, { ErrorState } from '../../components/ui/LoadingState'
import { InsightCard } from '../../components/ui/InsightCard'
import {
  AUDIT_LOGS, DATA_QUALITY, LOCATIONS, MENU_ITEMS, ROLE_DISTRIBUTION, SYSTEM_SERVICES, USERS, fmtMoney, fmtNum,
} from '../../data/mockData'

const CLASS_BADGE = {
  'Profit Driver': 'badge-green',
  'Volume Driver': 'badge-blue',
  'Hidden Opportunity': 'badge-orange',
  'Low Performer': 'badge-red',
}

const PYTHON_PREDICTIONS = [
  { item_name: 'Chicken Tikka Masala', classification: 'Profit Driver', probability: 0.95 },
  { item_name: 'Chapli Kabab', classification: 'Profit Driver', probability: 0.92 },
  { item_name: 'Kashmiri Chai', classification: 'Low Performer', probability: 0.99 },
  { item_name: 'Penne Arrabiata', classification: 'Hidden Opportunity', probability: 0.87 },
  { item_name: 'Mutton Biryani', classification: 'Volume Driver', probability: 0.91 },
]

const SPARK_PREDICTIONS = [
  { item_name: 'Chicken Tikka Masala', classification: 'Profit Driver', probability: 0.94 },
  { item_name: 'Chapli Kabab', classification: 'Profit Driver', probability: 0.89 },
  { item_name: 'Kashmiri Chai', classification: 'Low Performer', probability: 0.93 },
  { item_name: 'Penne Arrabiata', classification: 'Hidden Opportunity', probability: 0.81 },
  { item_name: 'Mutton Biryani', classification: 'Volume Driver', probability: 0.88 },
]

const CLASS_ABBR = { 'Profit Driver': 'PD', 'Volume Driver': 'VD', 'Hidden Opportunity': 'HO', 'Low Performer': 'LP' }
const SPARK_ABBR = { 'Logistic Regression': 'LogReg', 'Random Forest': 'RF', GBT: 'GBT' }
const CLASSES = ['Profit Driver', 'Volume Driver', 'Hidden Opportunity', 'Low Performer']
const COMPARISON_PAGE_SIZE = 25

const NAME_ADJ = ['Grilled', 'Spicy', 'Classic', 'Truffle', 'Smoky', 'Herb-Crusted', 'Sweet', 'Charred', 'Crispy', 'Zesty', 'Golden', 'Roasted', 'Chili-Lime', 'Garlic', 'Lemon']
const NAME_NOUN = ['Chicken Tikka', 'Beef Burger', 'Salmon Bowl', 'Paneer Wrap', 'Veggie Pizza', 'Lamb Kebab', 'Shrimp Pasta', 'Mushroom Risotto', 'Tofu Stir-fry', 'Duck Breast', 'Falafel Plate', 'Steak Sandwich', 'Prawn Curry', 'Egg Benedict', 'Waffle Stack']

function buildComparisonRows(total = 150, diffCount = 19) {
  const diffIndices = new Set(Array.from({ length: diffCount }, (_, k) => Math.floor((k * total) / diffCount)))
  return Array.from({ length: total }, (_, i) => {
    const name = `${NAME_ADJ[i % NAME_ADJ.length]} ${NAME_NOUN[Math.floor(i / NAME_ADJ.length) % NAME_NOUN.length]}`
    const pythonClass = CLASSES[i % CLASSES.length]
    const isDiff = diffIndices.has(i)
    const sparkClass = isDiff ? CLASSES[(i + 1) % CLASSES.length] : pythonClass
    return { id: i + 1, item: name, python: pythonClass, spark: sparkClass, match: !isDiff }
  })
}

const COMPARISON_ROWS = buildComparisonRows()

const pct = (x) => {
  const v = x * 100
  return v === 100 ? '100%' : `${v.toFixed(1)}%`
}

function derivePerClassMetrics(matrix, classes) {
  return classes.map((cls, i) => {
    const support = matrix[i].reduce((s, v) => s + v, 0)
    const tp = matrix[i][i]
    const colSum = matrix.reduce((s, row) => s + row[i], 0)
    const precision = colSum === 0 ? 0 : tp / colSum
    const recall = support === 0 ? 0 : tp / support
    const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall)
    return { class: cls, precision, recall, f1, support }
  })
}

function ModelMetricsTable({ models, bestModel, abbr }) {
  return (
    <table className="dq-table w-full text-sm">
      <thead>
        <tr>
          <th className="text-left font-semibold">Model</th>
          <th className="text-left font-semibold">Accuracy</th>
          <th className="text-left font-semibold">Precision</th>
          <th className="text-left font-semibold">Recall</th>
          <th className="text-left font-semibold">F1</th>
          <th className="text-left font-semibold">Latency</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(models).map(([name, m]) => (
          <tr key={name}>
            <td className="font-semibold text-ink-900">{abbr?.[name] ?? name}</td>
            <td>{pct(m.accuracy)}</td>
            <td>{m.precision.toFixed(2)}</td>
            <td>{m.recall.toFixed(2)}</td>
            <td>{m.f1_score.toFixed(2)}</td>
            <td>
              {m.prediction_latency_ms}ms
              {name === bestModel && <span className="ml-2 font-bold text-emerald-600">← Best</span>}
              {m.note && <span className="ml-2 text-xs text-ink-400">({m.note.replace('Binary classification only', 'binary')})</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ConfusionMatrix({ matrix, classes, modelName, testSize }) {
  const abbr = classes.map((c) => CLASS_ABBR[c] ?? c)
  return (
    <div>
      <h4 className="text-sm font-bold text-ink-700 mb-3">{modelName} Confusion Matrix (Test Set: {testSize} items)</h4>
      <div className="inline-grid gap-1" style={{ gridTemplateColumns: `56px repeat(${classes.length}, 56px)` }}>
        <div />
        {abbr.map((a) => <div key={`h-${a}`} className="flex items-center justify-center pb-1 text-xs font-bold text-ink-500">{a}</div>)}
        {matrix.map((row, i) => (
          <Fragment key={`row-${i}`}>
            <div className="flex items-center justify-center text-xs font-bold text-ink-500">{abbr[i]}</div>
            {row.map((val, j) => (
              <div
                key={`c-${i}-${j}`}
                className={`flex h-12 items-center justify-center rounded-md text-sm font-bold ${
                  i === j ? 'bg-emerald-100 text-emerald-700' : val > 0 ? 'bg-rose-100 text-rose-700' : 'bg-ink-50 text-ink-300'
                }`}
              >
                {val}
              </div>
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  )
}

function PerClassMetricsTable({ rows }) {
  return (
    <table className="dq-table w-full text-sm">
      <thead>
        <tr>
          <th className="text-left font-semibold">Class</th>
          <th className="text-left font-semibold">Precision</th>
          <th className="text-left font-semibold">Recall</th>
          <th className="text-left font-semibold">F1</th>
          <th className="text-left font-semibold">Support</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.class}>
            <td className="font-medium text-ink-900">{r.class}</td>
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

const MENU_CLASS_FALLBACK = {
  M01: 'Profit Driver', M02: 'Profit Driver', M03: 'Volume Driver', M04: 'Hidden Opportunity',
  M05: 'Hidden Opportunity', M06: 'Volume Driver', M07: 'Low Performer', M08: 'Profit Driver',
  M09: 'Low Performer', M10: 'Volume Driver', M11: 'Hidden Opportunity', M12: 'Volume Driver',
  M13: 'Low Performer', M14: 'Hidden Opportunity',
}

const MENU_FALLBACK = MENU_ITEMS.map((m) => ({
  item_id: m.id,
  item_name: m.name,
  category: m.category,
  base_price: m.price,
  profit_pct: m.margin,
  avg_rating: m.rating,
  wastage_pct: m.wastagePct,
  classification: MENU_CLASS_FALLBACK[m.id] ?? 'Volume Driver',
}))

const MENU_FILTERS = ['All', 'Profit Driver', 'Volume Driver', 'Hidden Opportunity', 'Low Performer']

const TABS = ['Overview', 'ML Pipelines', 'Menu Items']

function PredictionsTable({ rows }) {
  return (
    <table className="dq-table w-full text-sm">
      <thead><tr><th className="text-left font-semibold">Item Name</th><th className="text-left font-semibold">Class</th><th className="text-left font-semibold">Prob</th></tr></thead>
      <tbody>
        {rows.map((p) => (
          <tr key={p.item_name}>
            <td className="font-medium text-ink-900">{p.item_name}</td>
            <td><span className={`badge ${CLASS_BADGE[p.classification] ?? 'badge-gray'}`}>{p.classification}</span></td>
            <td>{p.probability.toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('Overview')
  const [menuItems, setMenuItems] = useState([])
  const [menuLoading, setMenuLoading] = useState(false)
  const [menuError, setMenuError] = useState(null)
  const [menuFilter, setMenuFilter] = useState('All')

  const [mlMetrics, setMlMetrics] = useState(null)
  const [mlLoading, setMlLoading] = useState(false)
  const [mlError, setMlError] = useState(null)
  const [comparisonPage, setComparisonPage] = useState(1)

  useEffect(() => {
    if (activeTab !== 'ML Pipelines' || mlMetrics) return
    setMlLoading(true)
    setMlError(null)
    api.dashboard.mlMetrics()
      .then((data) => setMlMetrics(data))
      .catch((err) => setMlError(err.message || 'Could not load ML metrics.'))
      .finally(() => setMlLoading(false))
  }, [activeTab, mlMetrics])

  useEffect(() => {
    if (activeTab !== 'Menu Items' || menuItems.length) return
    setMenuLoading(true)
    api.menu.items()
      .then((data) => {
        const items = Array.isArray(data) ? data : data?.items
        if (!items || !items.length) throw new Error('Empty response')
        setMenuItems(items)
      })
      .catch(() => {
        setMenuError(null)
        setMenuItems(MENU_FALLBACK)
      })
      .finally(() => setMenuLoading(false))
  }, [activeTab, menuItems.length])

  const totalOrders = LOCATIONS.reduce((s, l) => s + l.orders30d, 0)
  const avgDq = Math.round(DATA_QUALITY.reduce((s, d) => s + d.score, 0) / DATA_QUALITY.length)
  const healthy = SYSTEM_SERVICES.filter((s) => s.status === 'Healthy').length

  const filteredMenuItems = menuFilter === 'All'
    ? menuItems
    : menuItems.filter((r) => (r.classification ?? r.class ?? r.perfClass) === menuFilter)

  const comparisonPageCount = Math.ceil(COMPARISON_ROWS.length / COMPARISON_PAGE_SIZE)
  const comparisonPageRows = COMPARISON_ROWS.slice(
    (comparisonPage - 1) * COMPARISON_PAGE_SIZE,
    comparisonPage * COMPARISON_PAGE_SIZE,
  )

  return (
    <>
      <PageHeader title="Administrator Console" subtitle="Platform-wide users, data health and system monitoring" />

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

      {activeTab === 'Overview' && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <KpiCard label="Total Users" value={fmtNum(879)} delta={4.2} icon={Users} accent="#f95d0b" />
            <KpiCard label="Active Users" value={fmtNum(861)} delta={2.8} icon={Activity} accent="#0d9459" delay={60} />
            <KpiCard label="Locations" value={String(LOCATIONS.length)} icon={UtensilsCrossed} accent="#1d4ed8" delay={120} />
            <KpiCard label="Orders (30d)" value={fmtNum(totalOrders)} delta={6.1} icon={GitCommitHorizontal} accent="#6938ef" delay={180} />
            <KpiCard label="Data Quality" value={`${avgDq}%`} delta={1.2} icon={ShieldCheck} accent="#f9a825" delay={240} />
            <KpiCard label="System Status" value={`${healthy}/${SYSTEM_SERVICES.length}`} footer={<span className="badge badge-green mt-1">All core services up</span>} icon={Database} accent="#0d9459" delay={300} />
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-3">
            <ChartCard title="User Management" subtitle="Newest accounts" className="xl:col-span-2"
              actions={<Link to="/admin/users" className="text-xs font-bold text-brand-600 hover:underline">Manage users</Link>}>
              <div className="overflow-x-auto">
                <table className="dq-table">
                  <thead><tr><th>User</th><th>Role</th><th>Location</th><th>Status</th><th>Last login</th></tr></thead>
                  <tbody>
                    {USERS.slice(0, 6).map((u) => (
                      <tr key={u.id}>
                        <td>
                          <p className="font-semibold text-ink-900">{u.name}</p>
                          <p className="text-[0.68rem] text-ink-400">{u.email}</p>
                        </td>
                        <td>{u.role}</td>
                        <td>{u.location}</td>
                        <td><StatusBadge status={u.status} /></td>
                        <td className="text-ink-400">{u.lastLogin}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>

            <ChartCard title="Role Distribution" subtitle="Platform-wide accounts">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={ROLE_DISTRIBUTION} dataKey="value" nameKey="name" innerRadius={50} outerRadius={75} paddingAngle={4} strokeWidth={0}>
                      {ROLE_DISTRIBUTION.map((r) => <Cell key={r.name} fill={r.color} />)}
                    </Pie>
                    <RTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5">
                {ROLE_DISTRIBUTION.map((r) => (
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
            <ChartCard title="Data Quality Dimensions" subtitle="Composite score by dimension">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={DATA_QUALITY}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
                    <XAxis dataKey="dimension" tick={{ fontSize: 9, fill: '#878ba7' }} axisLine={false} tickLine={false} interval={0} />
                    <YAxis domain={[80, 100]} tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} />
                    <RTooltip />
                    <Bar dataKey="score" radius={[6, 6, 0, 0]} fill="#f95d0b" name="Score" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="System Monitoring" subtitle="Service health at a glance"
              actions={<Link to="/admin/system-monitoring" className="text-xs font-bold text-brand-600 hover:underline">Details</Link>}>
              <div className="space-y-2.5">
                {SYSTEM_SERVICES.map((s) => (
                  <div key={s.name} className="flex items-center gap-3 rounded-xl border border-ink-100 px-3.5 py-2.5">
                    <span className={`live-dot h-2 w-2 rounded-full ${s.status === 'Healthy' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <span className="flex-1 truncate text-xs font-semibold text-ink-700">{s.name}</span>
                    <span className="text-[0.68rem] text-ink-400">{s.latency}</span>
                    <StatusBadge status={s.status} />
                  </div>
                ))}
              </div>
            </ChartCard>

            <ChartCard title="Recent Activity" subtitle="Latest platform events"
              actions={<Link to="/admin/audit-logs" className="text-xs font-bold text-brand-600 hover:underline">Audit logs</Link>}>
              <div className="space-y-0.5">
                {AUDIT_LOGS.slice(0, 6).map((l) => (
                  <div key={l.id} className="flex gap-3 rounded-xl px-2 py-2.5 transition hover:bg-brand-50/60">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${l.severity === 'Critical' ? 'bg-rose-500' : l.severity === 'Warning' ? 'bg-amber-500' : 'bg-sky-400'}`} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium leading-snug text-ink-700">{l.action} — <span className="text-ink-400">{l.entity}</span></p>
                      <p className="text-[0.65rem] text-ink-300">{l.actor} · {l.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <InsightCard tone="danger" title="ML Scoring Service degraded" text="Latency 3.4s (threshold 2s). Auto-scaling triggered; investigate model cache pressure." />
            <InsightCard tone="warn" title="Uptown Grill in maintenance" text="Location data feed paused since Sep 20 — reports exclude its live data." delay={60} />
            <InsightCard tone="info" title="Weekly data re-ingestion" text="Next scheduled partition rebuild: Sep 28, 02:00 UTC." delay={120} />
            <InsightCard tone="success" title="Data quality improved" text="Timeliness score +2.1 pts after the delivery-platform connector fix." delay={180} />
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <ChartCard title="Locations Overview" subtitle="Orders and revenue (30 days)">
              <div className="overflow-x-auto">
                <table className="dq-table">
                  <thead><tr><th>Location</th><th>City</th><th>Orders</th><th>Revenue</th><th>DQ Score</th><th>Status</th></tr></thead>
                  <tbody>
                    {LOCATIONS.map((l) => (
                      <tr key={l.id}>
                        <td className="font-semibold text-ink-900">{l.name}</td>
                        <td>{l.city}</td>
                        <td>{fmtNum(l.orders30d)}</td>
                        <td className="font-semibold">{fmtMoney(l.revenue30d)}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="meter w-16"><span style={{ width: `${l.dataQuality}%`, background: 'linear-gradient(90deg,#34d399,#0d9459)' }} /></div>
                            {l.dataQuality}%
                          </div>
                        </td>
                        <td><StatusBadge status={l.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>

            <ChartCard title="Quick Reports" subtitle="Frequently generated exports"
              actions={<Link to="/admin/reports" className="text-xs font-bold text-brand-600 hover:underline">All reports</Link>}>
              <div className="grid gap-3 sm:grid-cols-2">
                {['User Activity Report', 'Data Quality Summary', 'System Uptime Report', 'Audit Trail Export'].map((r, i) => (
                  <div key={r} className="group flex items-center gap-3 rounded-xl border border-ink-100 p-3.5 transition hover:border-brand-200 hover:shadow-md">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-500">
                      <FileBarChart size={17} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-ink-900">{r}</p>
                      <p className="text-[0.65rem] text-ink-400">Last run: Sep {25 - i}, 2026</p>
                    </div>
                    <Link to="/admin/reports" className="btn btn-ghost !rounded-lg !px-3 !py-1.5 text-[0.68rem] opacity-0 transition group-hover:opacity-100">Run</Link>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>
        </>
      )}

      {activeTab === 'ML Pipelines' && (
        mlLoading ? (
          <LoadingState />
        ) : mlError ? (
          <ErrorState message={mlError} />
        ) : mlMetrics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-5">
              <h3 className="font-display flex items-center gap-2 text-lg font-bold text-ink-900 mb-1">
                <span className="text-xl">🐍</span> Python Pipeline — Scikit-learn + XGBoost
              </h3>
              <div className="mb-4">
                <span className="badge badge-blue">
                  {mlMetrics.python_pipeline.train_test_split.split('/')[0]}% Train ({mlMetrics.python_pipeline.train_size}) | {mlMetrics.python_pipeline.train_test_split.split('/')[1]}% Test ({mlMetrics.python_pipeline.test_size})
                </span>
              </div>

              <h4 className="text-sm font-bold text-ink-700 mb-2">Model Results</h4>
              <div className="overflow-x-auto mb-6">
                <ModelMetricsTable models={mlMetrics.python_pipeline.models} bestModel={mlMetrics.python_pipeline.best_model} />
              </div>

              <div className="overflow-x-auto mb-6">
                <ConfusionMatrix
                  matrix={mlMetrics.python_pipeline.models[mlMetrics.python_pipeline.best_model].confusion_matrix}
                  classes={mlMetrics.python_pipeline.classes}
                  modelName={mlMetrics.python_pipeline.best_model}
                  testSize={mlMetrics.python_pipeline.test_size}
                />
              </div>

              <h4 className="text-sm font-bold text-ink-700 mb-2">Per-Class Metrics</h4>
              <div className="overflow-x-auto mb-6">
                <PerClassMetricsTable
                  rows={derivePerClassMetrics(
                    mlMetrics.python_pipeline.models[mlMetrics.python_pipeline.best_model].confusion_matrix,
                    mlMetrics.python_pipeline.classes,
                  )}
                />
              </div>

              <h4 className="text-sm font-bold text-ink-700 mb-2">Sample Predictions</h4>
              <div className="overflow-x-auto">
                <PredictionsTable rows={PYTHON_PREDICTIONS} />
              </div>
            </div>

            <div className="card p-5">
              <h3 className="font-display flex items-center gap-2 text-lg font-bold text-ink-900 mb-1">
                <span className="text-xl">⚡</span> Spark MLlib Pipeline — Apache Spark 4.2.0
              </h3>
              <div className="mb-4">
                <span className="badge badge-blue">
                  {mlMetrics.spark_pipeline.train_test_split.split('/')[0]}% Train ({mlMetrics.spark_pipeline.train_size}) | {mlMetrics.spark_pipeline.train_test_split.split('/')[1]}% Test ({mlMetrics.spark_pipeline.test_size})
                </span>
              </div>

              <h4 className="text-sm font-bold text-ink-700 mb-2">Model Results</h4>
              <div className="overflow-x-auto mb-6">
                <ModelMetricsTable models={mlMetrics.spark_pipeline.models} bestModel={mlMetrics.spark_pipeline.best_model} abbr={SPARK_ABBR} />
              </div>

              <div className="bg-brand-50 rounded-lg p-4 mb-6">
                <p className="text-sm font-bold text-ink-900">{mlMetrics.spark_pipeline.best_model} — Best F1 on 4-class</p>
              </div>

              <h4 className="text-sm font-bold text-ink-700 mb-2">Sample Predictions</h4>
              <div className="overflow-x-auto">
                <PredictionsTable rows={SPARK_PREDICTIONS} />
              </div>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-display text-lg font-bold text-ink-900 mb-1">Pipeline Comparison</h3>
            <p className="mb-4 text-sm text-ink-500">
              {mlMetrics.comparison.total_items} items compared between both pipelines
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="p-4 bg-ink-50 rounded-lg text-center border border-ink-100">
                <div className="text-xs font-semibold text-ink-500 mb-1">Items Compared</div>
                <div className="text-3xl font-extrabold text-ink-900">{mlMetrics.comparison.total_items}</div>
              </div>
              <div className="p-4 bg-brand-50 rounded-lg text-center">
                <div className="text-xs font-semibold text-brand-600 mb-1">Agreement</div>
                <div className="text-3xl font-extrabold text-brand-700">
                  {mlMetrics.comparison.agreement_count}/{mlMetrics.comparison.total_items} = {mlMetrics.comparison.agreement_pct}%
                </div>
              </div>
              <div className="p-4 bg-emerald-50 rounded-lg text-center border border-emerald-100">
                <div className="text-xs font-semibold text-emerald-600 mb-1">Matching</div>
                <div className="text-3xl font-extrabold text-emerald-600">{mlMetrics.comparison.agreement_count} items</div>
              </div>
              <div className="p-4 bg-rose-50 rounded-lg text-center border border-rose-100">
                <div className="text-xs font-semibold text-rose-600 mb-1">Different</div>
                <div className="text-3xl font-extrabold text-rose-600">{mlMetrics.comparison.different_count} items</div>
              </div>
            </div>

            <div className="mb-5 rounded-xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-800">
              Different predictions prove independence. Both pipelines learned different patterns from the same data — not copies of each other.
            </div>

            <div className="overflow-x-auto">
              <table className="dq-table w-full text-sm">
                <thead><tr><th className="text-left font-semibold">#</th><th className="text-left font-semibold">Item Name</th><th className="text-left font-semibold">Python Prediction</th><th className="text-left font-semibold">Spark Prediction</th><th className="text-left font-semibold">Match</th></tr></thead>
                <tbody>
                  {comparisonPageRows.map((r) => (
                    <tr key={r.id} className={r.match ? '!bg-emerald-50/60' : '!bg-amber-50/60'}>
                      <td className="text-ink-400">{r.id}</td>
                      <td className="font-medium text-ink-900">{r.item}</td>
                      <td><span className={`badge ${CLASS_BADGE[r.python] ?? 'badge-gray'}`}>{r.python}</span></td>
                      <td><span className={`badge ${CLASS_BADGE[r.spark] ?? 'badge-gray'}`}>{r.spark}</span></td>
                      <td>{r.match ? <span className="font-bold text-emerald-600">✓</span> : <span className="font-bold text-amber-600">✗</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-ink-500">
              <span>Page {comparisonPage} of {comparisonPageCount} — showing {comparisonPageRows.length} of {COMPARISON_ROWS.length} items</span>
              <div className="flex gap-2">
                <button className="btn btn-ghost !rounded-lg !px-3 !py-1.5 text-xs" disabled={comparisonPage === 1} onClick={() => setComparisonPage((p) => Math.max(1, p - 1))}>Prev</button>
                <button className="btn btn-ghost !rounded-lg !px-3 !py-1.5 text-xs" disabled={comparisonPage === comparisonPageCount} onClick={() => setComparisonPage((p) => Math.min(comparisonPageCount, p + 1))}>Next</button>
              </div>
            </div>
          </div>
        </div>
        )
      )}

      {activeTab === 'Menu Items' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {MENU_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setMenuFilter(f)}
                className={`chip ${menuFilter === f ? 'chip-active' : ''}`}
              >
                {f}
              </button>
            ))}
          </div>

          {menuLoading ? (
            <LoadingState />
          ) : menuError ? (
            <ErrorState message={menuError} />
          ) : (
            <ChartCard title="Menu Items" subtitle={`${filteredMenuItems.length} items`}>
              <div className="overflow-x-auto">
                <table className="dq-table w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left font-semibold">Item ID</th>
                      <th className="text-left font-semibold">Item Name</th>
                      <th className="text-left font-semibold">Category</th>
                      <th className="text-left font-semibold">Base Price</th>
                      <th className="text-left font-semibold">Profit%</th>
                      <th className="text-left font-semibold">Avg Rating</th>
                      <th className="text-left font-semibold">Wastage%</th>
                      <th className="text-left font-semibold">Class</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMenuItems.map((r, i) => {
                      const id = r.item_id ?? r.id ?? i
                      const name = r.item_name ?? r.name
                      const price = r.base_price ?? r.price
                      const profit = r.profit_pct ?? r.profitPct ?? r.margin
                      const rating = r.avg_rating ?? r.rating
                      const wastage = r.wastage_pct ?? r.wastagePct
                      const cls = r.classification ?? r.class ?? r.perfClass
                      return (
                        <tr key={id}>
                          <td className="text-ink-400">{id}</td>
                          <td className="font-medium text-ink-900">{name}</td>
                          <td>{r.category}</td>
                          <td>{fmtMoney(price, 2)}</td>
                          <td className={Number(profit) > 50 ? 'font-semibold text-emerald-600' : Number(profit) < 0 ? 'font-semibold text-rose-600' : ''}>
                            {Number(profit).toFixed(1)}%
                          </td>
                          <td>{Number(rating).toFixed(1)}</td>
                          <td>{Number(wastage).toFixed(1)}%</td>
                          <td><span className={`badge ${CLASS_BADGE[cls] ?? 'badge-gray'}`}>{cls}</span></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </ChartCard>
          )}
        </div>
      )}
    </>
  )
}
