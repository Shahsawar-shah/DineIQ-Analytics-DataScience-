import { useEffect, useState } from 'react'
import { Gem, Percent, Repeat, TrendingUp, TriangleAlert, Users } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../../services/api'
import PageHeader from '../../components/layout/PageHeader'
import KpiCard from '../../components/ui/KpiCard'
import ChartCard from '../../components/charts/ChartCard'
import DataTable from '../../components/ui/DataTable'
import LoadingState, { ErrorState } from '../../components/ui/LoadingState'
import { downloadCSV, fmtMoney, fmtNum } from '../../utils/helpers'

const SEGMENT_COLORS = {
  'High-Value Loyal': '#0d9459',
  Frequent: '#1d4ed8',
  Occasional: '#878ba7',
  'Promotion-Driven': '#f9a825',
  'At-Risk': '#d92d20',
  New: '#6938ef',
  'No Orders': '#cfd2df',
}
const CHURN_TONE = { High: 'badge-red', Medium: 'badge-amber', Low: 'badge-green' }

const segBadge = (s) => (
  <span className="badge" style={{ background: `${SEGMENT_COLORS[s] ?? '#878ba7'}1a`, color: SEGMENT_COLORS[s] ?? '#878ba7' }}>{s}</span>
)

export default function CustomerIntelligence() {
  const [state, setState] = useState({ loading: true, error: null })

  useEffect(() => {
    Promise.all([
      api.customers.summary(), api.customers.segments(), api.customers.rfm(15),
      api.customers.atRisk(25), api.customers.rfmDistribution(), api.customers.promotionSensitive(15),
    ])
      .then(([summary, segments, rfm, atRisk, distribution, promo]) =>
        setState({ loading: false, error: null, summary, segments, rfm, atRisk, distribution, promo }))
      .catch((err) => setState({ loading: false, error: err.message }))
  }, [])

  if (state.loading) return <LoadingState />
  if (state.error) return <ErrorState message={state.error} />

  const { summary, segments, rfm, atRisk, distribution, promo } = state

  const rfmColumns = [
    { key: 'id', header: 'Customer', render: (r) => `#${r.customer_id}` },
    { key: 'segment', header: 'Segment', render: (r) => segBadge(r.customer_segment) },
    { key: 'rfm', header: 'RFM', render: (r) => <span className="badge badge-green">{r.rfm_score} ({r.recency_score}/{r.frequency_score}/{r.monetary_score})</span> },
    { key: 'recency', header: 'Recency', align: 'right', render: (r) => `${r.recency_days}d` },
    { key: 'freq', header: 'Orders', align: 'right', render: (r) => r.frequency },
    { key: 'monetary', header: 'Monetary', align: 'right', render: (r) => fmtMoney(r.monetary_value) },
    { key: 'aov', header: 'AOV', align: 'right', render: (r) => fmtMoney(r.avg_order_value, 2) },
  ]

  const atRiskColumns = [
    { key: 'code', header: 'Customer', render: (r) => <span className="font-mono text-xs">{r.customer_code}</span> },
    { key: 'city', header: 'City', render: (r) => r.city },
    { key: 'recency', header: 'Inactive', align: 'right', render: (r) => <span className="badge badge-red">{Math.round(r.recency_days)}d</span> },
    { key: 'orders', header: 'Orders 90d (prev)', align: 'right', render: (r) => `${r.orders_recent_90d} (${r.orders_prior_90d})` },
    { key: 'spend', header: 'Spend 90d (prev)', align: 'right', render: (r) => `${fmtMoney(r.spend_recent_90d)} (${fmtMoney(r.spend_prior_90d)})` },
    { key: 'score', header: 'Risk score', align: 'right', render: (r) => <span className={`badge ${CHURN_TONE[r.churn_risk_level]}`}>{r.churn_risk_score}</span> },
    { key: 'value', header: 'Lifetime value', align: 'right', render: (r) => fmtMoney(r.monetary_value) },
  ]

  const promoColumns = [
    { key: 'id', header: 'Customer', render: (r) => `#${r.customer_id}` },
    { key: 'ratio', header: 'Orders on promo', align: 'right', render: (r) => `${Math.round(r.promo_order_ratio * 100)}% (${r.promo_orders}/${r.frequency})` },
    { key: 'monetary', header: 'Monetary', align: 'right', render: (r) => fmtMoney(r.monetary_value) },
    { key: 'aov', header: 'AOV', align: 'right', render: (r) => fmtMoney(r.avg_order_value, 2) },
  ]

  return (
    <>
      <PageHeader title="Customer Intelligence" subtitle="RFM segments and churn risk calculated from order history" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <KpiCard label="Customers" value={fmtNum(summary.total_customers)} icon={Users} accent="#1d4ed8"
          footer={<p className="mt-1 text-[0.68rem] text-ink-400">{fmtNum(summary.customers_with_orders)} have ordered</p>} />
        <KpiCard label="High-Value Loyal" value={fmtNum(summary.high_value_count)} icon={Gem} accent="#0d9459" delay={60} />
        <KpiCard label="At churn risk" value={fmtNum(summary.at_risk_count)} icon={TriangleAlert} accent="#d92d20" delay={120}
          footer={<p className="mt-1 text-[0.68rem] text-ink-400">60+ days inactive, orders & spend falling</p>} />
        <KpiCard label="Promotion-sensitive" value={fmtNum(summary.promotion_sensitive_count)} icon={Percent} accent="#f9a825" delay={180} />
        <KpiCard label="Repeat customers" value={`${summary.repeat_customer_rate}%`} icon={Repeat} accent="#6938ef" delay={240} />
        <KpiCard label="Avg RFM score" value={summary.avg_rfm_score.toFixed(1)} icon={TrendingUp} accent="#f95d0b" delay={300} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <ChartCard title="Customer segments" subtitle="Computed from RFM and 90-day trends">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={segments} dataKey="count" nameKey="segment" innerRadius={56} outerRadius={88} paddingAngle={3} strokeWidth={0}>
                  {segments.map((entry) => <Cell key={entry.segment} fill={SEGMENT_COLORS[entry.segment] ?? '#878ba7'} />)}
                </Pie>
                <Tooltip formatter={(v) => fmtNum(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5">
            {segments.map((s) => (
              <div key={s.segment} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-ink-500">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: SEGMENT_COLORS[s.segment] ?? '#878ba7' }} />
                  {s.segment}
                </span>
                <span className="font-bold text-ink-900">{fmtNum(s.count)} ({s.percentage}%)</span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="RFM score distribution" subtitle="Recency + frequency + monetary quintile scores (3–15)" height={330}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={distribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
              <XAxis dataKey="rfm_score" tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtNum(v)} />
              <Tooltip formatter={(v) => fmtNum(v)} />
              <Bar dataKey="customers" radius={[5, 5, 0, 0]} fill="#6938ef" name="Customers" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Segment strategies" subtitle="Targeting recommendation per segment">
          <div className="max-h-80 space-y-2.5 overflow-auto">
            {segments.map((s) => (
              <div key={s.segment} className="rounded-xl border border-ink-100 p-3">
                <div className="flex items-center justify-between">{segBadge(s.segment)}<span className="text-[0.68rem] text-ink-400">avg {fmtMoney(s.avg_monetary)} · {s.avg_frequency ?? '—'} orders</span></div>
                <p className="mt-1.5 text-xs text-ink-600">{s.strategy}</p>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <ChartCard title="Churn-risk customers" subtitle="Highest risk score first: recency, falling frequency and falling spend" className="mt-5"
        actions={<button className="btn btn-ghost !rounded-lg !px-3 !py-1.5 text-xs" onClick={() => downloadCSV(atRisk, 'churn_risk_customers.csv')}>CSV</button>}>
        <DataTable columns={atRiskColumns} rows={atRisk} rowKey={(r) => r.customer_id} maxHeight="420px" />
      </ChartCard>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <ChartCard title="Top RFM customers" subtitle="High-value customers by RFM score">
          <DataTable columns={rfmColumns} rows={rfm} rowKey={(r) => r.customer_id} maxHeight="420px" />
        </ChartCard>
        <ChartCard title="Promotion-sensitive customers" subtitle="Most orders placed with a promotion">
          <DataTable columns={promoColumns} rows={promo} rowKey={(r) => r.customer_id} maxHeight="420px" />
        </ChartCard>
      </div>
    </>
  )
}
