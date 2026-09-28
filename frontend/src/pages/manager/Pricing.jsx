import { useState } from 'react'
import { Activity, DollarSign, TrendingDown, TrendingUp } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts'
import { api } from '../../services/api'
import PageHeader from '../../components/layout/PageHeader'
import ChartCard from '../../components/charts/ChartCard'
import DataTable from '../../components/ui/DataTable'
import { InsightCard, MiniStat } from '../../components/ui/InsightCard'
import LoadingState, { ErrorState } from '../../components/ui/LoadingState'
import useApi from '../../hooks/useApi'
import { downloadCSV, fmtMoney, fmtNum, fmtPct } from '../../utils/helpers'

const CLASSES = ['Highly Price Sensitive', 'Moderately Price Sensitive', 'Low Price Sensitivity', 'Insufficient Data']
const TONE = {
  'Highly Price Sensitive': { badge: 'badge-red', color: '#e11d48' },
  'Moderately Price Sensitive': { badge: 'badge-amber', color: '#d97706' },
  'Low Price Sensitivity': { badge: 'badge-green', color: '#0d9459' },
  'Insufficient Data': { badge: 'badge-gray', color: '#878ba7' },
}

export default function Pricing() {
  const { data, loading, error } = useApi(() => api.pricing.sensitivity())
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const detail = useApi(() => (selected ? api.pricing.item(selected) : Promise.resolve(null)), [selected])

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />

  const counts = data.summary.classification_counts
  const items = filter === 'all' ? data.items : data.items.filter((i) => i.sensitivity === filter)
  const chartItems = data.items.filter((i) => i.elasticity !== null).slice(0, 20)

  const columns = [
    { key: 'item', header: 'Item', render: (r) => <button className="text-left font-semibold text-ink-900 hover:text-brand-600" onClick={() => setSelected(r.item_id)}>{r.item_name}</button> },
    { key: 'price', header: 'Price', align: 'right', render: (r) => fmtMoney(r.current_price, 2) },
    { key: 'changes', header: 'Price changes', align: 'right', render: (r) => `${r.price_changes} (${r.significant_changes} sig.)` },
    { key: 'maxchg', header: 'Largest change', align: 'right', render: (r) => fmtPct(r.max_abs_price_change_pct) },
    { key: 'e', header: 'Elasticity', align: 'right', render: (r) => (r.elasticity === null ? '—' : r.elasticity.toFixed(2)) },
    { key: 'cls', header: 'Sensitivity', render: (r) => <span className={`badge ${TONE[r.sensitivity].badge}`}>{r.sensitivity}</span> },
    { key: 'margin', header: 'Margin', align: 'right', render: (r) => fmtPct(r.profit_percentage) },
    { key: 'rating', header: 'Rating', align: 'right', render: (r) => r.avg_rating ?? '—' },
    { key: 'repeat', header: 'Repeat rate', align: 'right', render: (r) => fmtPct(r.repeat_purchase_rate * 100) },
    { key: 'note', header: 'Note', render: (r) => <span className="text-xs text-ink-400">{r.note}</span> },
  ]

  const eventColumns = [
    { key: 'date', header: 'Change date', render: (e) => e.change_date },
    { key: 'price', header: 'Price', render: (e) => `${fmtMoney(e.old_price, 2)} → ${fmtMoney(e.new_price, 2)}` },
    { key: 'pchg', header: 'Price Δ', align: 'right', render: (e) => fmtPct(e.price_change_pct) },
    { key: 'dchg', header: 'Demand-share Δ', align: 'right', render: (e) => (e.demand_change_pct === null ? '—' : fmtPct(e.demand_change_pct)) },
    { key: 'e', header: 'Elasticity', align: 'right', render: (e) => (e.elasticity === null ? '—' : e.elasticity.toFixed(2)) },
    { key: 'p', header: 'p-value', align: 'right', render: (e) => e.p_value ?? '—' },
    { key: 'sig', header: 'Significant', render: (e) => (e.significant ? <span className="badge badge-red">yes</span> : <span className="badge badge-gray">no</span>) },
    { key: 'reason', header: 'Reason', render: (e) => <span className="text-xs text-ink-500">{e.change_reason}</span> },
  ]

  return (
    <>
      <PageHeader title="Pricing Intelligence" subtitle="Price elasticity per item, measured from price-change history and order volumes" />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <MiniStat icon={<TrendingDown size={17} />} color="#e11d48" label="Highly price sensitive" value={fmtNum(counts['Highly Price Sensitive'] ?? 0)} />
        <MiniStat icon={<Activity size={17} />} color="#d97706" label="Moderately sensitive" value={fmtNum(counts['Moderately Price Sensitive'] ?? 0)} />
        <MiniStat icon={<TrendingUp size={17} />} color="#0d9459" label="Low sensitivity" value={fmtNum(counts['Low Price Sensitivity'] ?? 0)} />
        <MiniStat icon={<DollarSign size={17} />} color="#1d4ed8" label="Price changes analysed" value={fmtNum(data.summary.price_changes)} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <ChartCard title="Most price-sensitive items" subtitle="Median elasticity. More negative = demand falls more when price rises" height={360}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartItems} layout="vertical" margin={{ left: 10, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="item_name" tick={{ fontSize: 9, fill: '#686d8c' }} width={150} axisLine={false} tickLine={false} />
              <ReferenceLine x={-data.thresholds.high} stroke="#e11d48" strokeDasharray="4 4" />
              <ReferenceLine x={-data.thresholds.moderate} stroke="#d97706" strokeDasharray="4 4" />
              <RTooltip formatter={(v) => Number(v).toFixed(2)} />
              <Bar dataKey="elasticity" radius={[0, 6, 6, 0]} name="Elasticity" barSize={12}>
                {chartItems.map((r) => <Cell key={r.item_id} fill={TONE[r.sensitivity].color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <div className="space-y-4">
          <InsightCard tone="info" title="How sensitivity is measured" text={`${data.method}. An item is Highly sensitive at |e| ≥ ${data.thresholds.high} and Moderately at |e| ≥ ${data.thresholds.moderate}, but only if at least one price change produced a statistically significant demand shift (p < ${data.thresholds.significance}).`} />
          <InsightCard tone="warn" title="What the data shows" text={`${data.summary.items_with_significant_demand_change} of ${data.summary.items_analysed} items had a significant demand shift after at least one price change; the median elasticity across items is ${data.summary.median_elasticity}. Most items show little measurable price response.`} />
          {selected && detail.data && (
            <InsightCard tone="success" title={detail.data.item_name} text={`${detail.data.price_changes} price changes, elasticity ${detail.data.elasticity ?? '—'} → ${detail.data.sensitivity}. Price events are listed below.`} />
          )}
        </div>
      </div>

      {selected && detail.data && (
        <ChartCard title={`Price-change events: ${detail.data.item_name}`} subtitle="Demand share in the 28 days before vs after each change" className="mt-5"
          actions={<button className="btn btn-ghost !rounded-lg !px-3 !py-1.5 text-xs" onClick={() => setSelected(null)}>Close</button>}>
          <DataTable columns={eventColumns} rows={detail.data.events} rowKey={(e) => e.price_id} />
        </ChartCard>
      )}

      <ChartCard
        title="Price sensitivity by item" subtitle={`${items.length} items. Click an item to see its price-change evidence`} className="mt-5"
        actions={
          <div className="flex items-center gap-2">
            <select className="input !w-auto !py-1.5 text-xs" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All classes</option>
              {CLASSES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <button className="btn btn-ghost !rounded-lg !px-3 !py-1.5 text-xs" onClick={() => downloadCSV(items.map(({ events: _events, ...r }) => r), 'price_sensitivity.csv')}>CSV</button>
          </div>
        }
      >
        <DataTable columns={columns} rows={items} rowKey={(r) => r.item_id} maxHeight={480} />
      </ChartCard>
    </>
  )
}
