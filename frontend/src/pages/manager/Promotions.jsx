import { AlertOctagon, CheckCircle2, Megaphone, Percent } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts'
import { api } from '../../services/api'
import PageHeader from '../../components/layout/PageHeader'
import ChartCard from '../../components/charts/ChartCard'
import KpiCard from '../../components/ui/KpiCard'
import DataTable from '../../components/ui/DataTable'
import { InsightCard } from '../../components/ui/InsightCard'
import LoadingState, { ErrorState } from '../../components/ui/LoadingState'
import useApi from '../../hooks/useApi'
import { fmtMoney, fmtNum, fmtPct } from '../../utils/helpers'

const VERDICT_BADGE = {
  'Promotion Trap': 'badge-red',
  Effective: 'badge-green',
  Neutral: 'badge-gray',
  'Insufficient baseline': 'badge-amber',
}

const signed = (v) => (v === null || v === undefined ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(1)}%`)

export default function Promotions() {
  const summary = useApi(() => api.promotions.summary())
  const promos = useApi(() => api.promotions.effectiveness())

  if (summary.loading || promos.loading) return <LoadingState />
  if (summary.error || promos.error) return <ErrorState message={summary.error || promos.error} />

  const s = summary.data
  const rows = promos.data
  const traps = rows.filter((p) => p.is_trap)
  const chart = rows.filter((p) => p.baseline_available).map((p) => ({
    name: p.promo_name, sales: p.sales_change_pct, profit: p.profit_change_pct,
  }))

  const columns = [
    { key: 'name', header: 'Promotion', render: (r) => <span className="font-semibold text-ink-900">{r.promo_name}</span> },
    { key: 'period', header: 'Period', render: (r) => <span className="text-xs text-ink-500">{r.start_date} → {r.end_date}</span> },
    { key: 'disc', header: 'Discount', align: 'right', render: (r) => `${r.discount_percentage}%` },
    { key: 'orders', header: 'Promo orders', align: 'right', render: (r) => fmtNum(r.promo_orders) },
    { key: 'sales', header: 'Sales Δ', align: 'right', render: (r) => signed(r.sales_change_pct) },
    { key: 'profit', header: 'Profit Δ', align: 'right', render: (r) => <span className={r.profit_change_pct < 0 ? 'font-semibold text-rose-600' : ''}>{signed(r.profit_change_pct)}</span> },
    { key: 'margin', header: 'Margin promo / regular', align: 'right', render: (r) => <span className={r.promo_margin_pct < 0 ? 'font-semibold text-rose-600' : ''}>{fmtPct(r.promo_margin_pct)} / {fmtPct(r.regular_margin_pct)}</span> },
    { key: 'aov', header: 'AOV promo', align: 'right', render: (r) => fmtMoney(r.promo_avg_order_value, 2) },
    { key: 'new', header: 'New customers', align: 'right', render: (r) => fmtNum(r.new_customers_acquired) },
    { key: 'ret', header: 'Came back (30d)', align: 'right', render: (r) => (r.post_promo_retention_pct === null ? '—' : `${r.post_promo_retention_pct}% vs ${r.other_customer_retention_pct}%`) },
    { key: 'verdict', header: 'Verdict', render: (r) => <span className={`badge ${VERDICT_BADGE[r.verdict] ?? 'badge-gray'}`}>{r.verdict}</span> },
  ]

  return (
    <>
      <PageHeader title="Promotion Analytics" subtitle="Effectiveness and trap detection from actual orders and profit, before vs during each promotion" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Promotions evaluated" value={fmtNum(s.total_promotions)} icon={Megaphone} accent="#f95d0b" />
        <KpiCard label="Effective" value={fmtNum(s.effective_promotions)} icon={CheckCircle2} accent="#0d9459" delay={60} />
        <KpiCard label="Promo orders" value={`${fmtNum(s.promo_orders)} (${s.promo_order_pct}%)`} icon={Percent} accent="#1d4ed8" delay={120} />
        <KpiCard label="Traps detected" value={fmtNum(s.promotion_traps)} icon={AlertOctagon} accent="#d92d20" delay={180}
          footer={<p className="mt-1 text-[0.68rem] text-ink-400">from order and profit data only</p>} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <ChartCard title="Sales vs profit change during each promotion" subtitle="Daily averages, promotion period vs the same number of days before it" className="xl:col-span-2" height={340}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#686d8c' }} angle={-30} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <ReferenceLine y={0} stroke="#878ba7" />
              <RTooltip formatter={(v) => `${Number(v).toFixed(1)}%`} />
              <Legend wrapperStyle={{ fontSize: 11 }} verticalAlign="top" />
              <Bar dataKey="sales" name="Revenue / day Δ" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="profit" name="Profit / day Δ" fill="#f95d0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <div className="space-y-4">
          <InsightCard tone="info" title="Trap rules"
            text={`R1 revenue up > ${s.thresholds.sales_up_pct}% while profit down > ${s.thresholds.profit_down_pct}%; R2 promo-order margin negative or ${s.thresholds.margin_gap_pts}+ pts below regular orders; R3 wastage grows ${s.thresholds.wastage_gap_pts}+ pts faster than revenue; R4 promo customers return at under ${s.thresholds.retention_ratio * 100}% of the normal rate.`} />
          <InsightCard tone={s.validation.false_positives.length ? 'warn' : 'success'} title="Validation against injected test cases"
            text={`${s.validation.injected_traps_found} of ${s.validation.injected_traps.length} designed trap promotions were detected; ${s.validation.false_positives.length} additional promotion(s) flagged. ${s.validation.note}.`} />
        </div>
      </div>

      {traps.length > 0 && (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {traps.map((t) => (
            <div key={t.promotion_id} className="card border-rose-100 p-5">
              <p className="flex items-center gap-2 text-sm font-bold text-rose-700"><AlertOctagon size={15} /> {t.promo_name}</p>
              <p className="mt-1 text-xs text-ink-400">{t.discount_percentage}% off · {t.start_date} → {t.end_date}</p>
              <ul className="mt-3 space-y-1.5">
                {t.trap_rules.map((r) => (
                  <li key={r.rule} className="text-xs text-ink-600"><span className="font-bold text-ink-900">{r.rule}:</span> {r.evidence}</li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-ink-500">Promo profit {fmtMoney(t.promo_profit)} on {fmtMoney(t.promo_revenue)} revenue ({fmtNum(t.promo_orders)} orders)</p>
            </div>
          ))}
        </div>
      )}

      <ChartCard title="Promotion effectiveness" subtitle="Order volume, revenue, margin, acquisition, repeat and post-promotion behaviour" className="mt-5">
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.promotion_id} />
      </ChartCard>
    </>
  )
}
