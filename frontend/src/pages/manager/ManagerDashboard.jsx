import { useEffect, useState } from 'react'
import { CalendarDays, CheckCircle2, Clock, DollarSign, Receipt, Repeat, ShieldCheck, ShoppingBag, Star, TrendingUp, TriangleAlert, UserCheck, Users } from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { api } from '../../services/api'
import PageHeader from '../../components/layout/PageHeader'
import KpiCard from '../../components/ui/KpiCard'
import ChartCard from '../../components/charts/ChartCard'
import LoadingState, { ErrorState } from '../../components/ui/LoadingState'

const CLASS_COLORS = {
  'Profit Driver': '#0d9459',
  'Volume Driver': '#1d4ed8',
  'Hidden Opportunity': '#b54708',
  'Low Performer': '#d92d20',
}

export default function ManagerDashboard() {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.dashboard
      .summary()
      .then((data) => setSummary(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />

  const pieData = Object.entries(summary.menu_classifications).map(([name, value]) => ({ name, value }))

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle="Menu, orders, customers and wastage across all locations"
        actions={<span className="badge badge-green"><span className="live-dot mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live data feed</span>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Total Revenue" value={`$${summary.total_revenue.toLocaleString()}`} icon={DollarSign} accent="#f95d0b" />
        <KpiCard label="Total Orders" value={summary.total_orders.toLocaleString()} icon={ShoppingBag} accent="#1d4ed8" delay={60} />
        <KpiCard label="Total Customers" value={summary.total_customers.toLocaleString()} icon={Users} accent="#6938ef" delay={120} />
        <KpiCard label="Avg Rating" value={summary.avg_rating.toFixed(2)} icon={Star} accent="#f9a825" delay={180} />
        <KpiCard label="Avg Wastage" value={`${summary.avg_wastage_percentage.toFixed(1)}%`} icon={ShieldCheck} accent="#d92d20" delay={240} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <KpiCard label="Gross Profit" value={`$${Math.round(summary.total_profit).toLocaleString()}`} icon={TrendingUp} accent="#0d9459" />
        <KpiCard label="Avg Order Value" value={`$${summary.avg_order_value.toFixed(2)}`} icon={Receipt} accent="#1d4ed8" delay={60} />
        <KpiCard label="Active Customers (90d)" value={summary.active_customers.toLocaleString()} icon={UserCheck} accent="#6938ef" delay={120} />
        <KpiCard label="Repeat Customers" value={summary.repeat_customers.toLocaleString()} icon={Repeat} accent="#f95d0b" delay={180} />
        <KpiCard label="Churn-Risk Customers" value={summary.at_risk_customers.toLocaleString()} icon={TriangleAlert} accent="#d92d20" delay={240} />
        <KpiCard label="Forecast Units (7d)" value={summary.forecast_units_next_7_days ? Math.round(summary.forecast_units_next_7_days).toLocaleString() : '—'} icon={CalendarDays} accent="#f9a825" delay={300}
          footer={<p className="mt-1 text-[0.68rem] text-ink-400">Model estimate</p>} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <ChartCard title="Menu Classification Mix" subtitle="All menu items" className="xl:col-span-2">
          <div className="grid gap-5 sm:grid-cols-2 sm:items-center">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" innerRadius={56} outerRadius={84} paddingAngle={4} strokeWidth={0}>
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={CLASS_COLORS[entry.name] ?? '#878ba7'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {pieData.map((c) => (
                <div key={c.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-ink-500">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: CLASS_COLORS[c.name] ?? '#878ba7' }} />
                    {c.name}
                  </span>
                  <span className="font-bold text-ink-900">{c.value}</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Data Quality" subtitle="Ingestion pipeline health">
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <p className="font-display text-4xl font-extrabold text-emerald-600">{summary.data_quality_score}%</p>
            <p className="mt-1 text-xs text-ink-400">records passing quality checks</p>
            <div className="mt-5 w-full space-y-2 text-left text-xs">
              <div className="flex justify-between"><span className="text-ink-500">Processed</span><span className="font-semibold text-ink-900">{summary.records_processed?.toLocaleString() ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-ink-500">Cleaned</span><span className="font-semibold text-ink-900">{summary.records_cleaned?.toLocaleString() ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-ink-500">Removed</span><span className="font-semibold text-rose-600">{summary.records_removed?.toLocaleString() ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-ink-500">Quarantined</span><span className="font-semibold text-amber-600">{summary.records_quarantined?.toLocaleString() ?? "—"}</span></div>
            </div>
          </div>
        </ChartCard>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        {[['Python pipeline', summary.ml_pipeline.python], ['Spark MLlib pipeline', summary.ml_pipeline.spark]].map(([title, p]) => (
          <div key={title} className="card p-5">
            <h3 className="font-display flex items-center gap-2 text-sm font-bold text-ink-900">{title}</h3>
            {p ? (
              <>
                <p className="mt-3 flex items-center gap-2 text-lg font-bold text-emerald-600"><CheckCircle2 size={18} /> Trained</p>
                <p className="mt-2 text-xs text-ink-500">Best model: <span className="font-semibold text-ink-900">{p.best_model}</span></p>
                <p className="text-xs text-ink-500">Test accuracy: <span className="font-semibold text-ink-900">{(p.accuracy * 100).toFixed(1)}%</span> · Macro F1: <span className="font-semibold text-ink-900">{p.f1_score.toFixed(2)}</span></p>
                <p className="text-[0.68rem] text-ink-400">Version {p.model_version}</p>
              </>
            ) : (
              <p className="mt-3 flex items-center gap-2 text-sm font-bold text-amber-600"><Clock size={16} /> Not trained yet</p>
            )}
          </div>
        ))}
      </div>
    </>
  )
}
