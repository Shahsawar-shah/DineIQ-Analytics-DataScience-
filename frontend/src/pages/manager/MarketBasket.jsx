import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowRight, ListChecks, Network, ShoppingBasket, TrendingUp } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts'
import { api } from '../../services/api'
import PageHeader from '../../components/layout/PageHeader'
import ChartCard from '../../components/charts/ChartCard'
import DataTable from '../../components/ui/DataTable'
import KpiCard from '../../components/ui/KpiCard'
import LoadingState, { ErrorState } from '../../components/ui/LoadingState'
import useApi from '../../hooks/useApi'
import { downloadCSV, fmtNum } from '../../utils/helpers'

const LIFT_OPTIONS = [1.0, 1.2, 1.5, 2.0]
const TYPE_TONE = { 'Combo Meal': 'badge-green', 'Cross-Sell': 'badge-blue', Upsell: 'badge-orange', 'Do Not Bundle': 'badge-red' }

const itemsLabel = (list) => list.map((i) => i.item_name).join(' + ')

export default function MarketBasket() {
  const bundles = useApi(() => api.basket.bundles())
  const recs = useApi(() => api.basket.recommendations())
  const [minLift, setMinLift] = useState(1.5)
  const [hideLoss, setHideLoss] = useState(false)
  const [rules, setRules] = useState({ loading: true, error: null, data: null })

  useEffect(() => {
    setRules((r) => ({ ...r, loading: true }))
    api.basket.rules({ minLift, includeLossItems: !hideLoss, limit: 100 })
      .then((data) => setRules({ loading: false, error: null, data }))
      .catch((err) => setRules({ loading: false, error: err.message, data: null }))
  }, [minLift, hideLoss])

  if (rules.error) return <ErrorState message={rules.error} />
  if (!rules.data) return <LoadingState />

  const s = rules.data.summary
  const top = rules.data.rules.slice(0, 12).map((r) => ({ ...r, label: r.rule.length > 42 ? `${r.rule.slice(0, 40)}…` : r.rule }))

  const columns = [
    {
      key: 'rule', header: 'Antecedent → Consequent',
      render: (r) => (
        <span className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-ink-900">{itemsLabel(r.antecedents)}</span>
          <ArrowRight size={13} className="shrink-0 text-brand-500" />
          <span className="font-semibold text-ink-900">{itemsLabel(r.consequents)}</span>
          {r.has_loss_making_item && <span className="badge badge-red">loss item</span>}
        </span>
      ),
    },
    { key: 'support', header: 'Support', align: 'right', render: (r) => `${(r.support * 100).toFixed(2)}%` },
    {
      key: 'confidence', header: 'Confidence', align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-2">
          <div className="meter w-20"><span style={{ width: `${r.confidence * 100}%`, background: '#f95d0b' }} /></div>
          <span className="w-10 text-right text-xs font-semibold">{(r.confidence * 100).toFixed(1)}%</span>
        </div>
      ),
    },
    {
      key: 'lift', header: 'Lift', align: 'right',
      render: (r) => <span className={`badge ${r.lift >= 2 ? 'badge-green' : r.lift >= 1.5 ? 'badge-amber' : 'badge-gray'}`}>{r.lift.toFixed(2)}×</span>,
    },
    { key: 'orders', header: 'Orders', align: 'right', render: (r) => fmtNum(r.order_count) },
  ]

  const recColumns = [
    { key: 'type', header: 'Type', render: (r) => <span className={`badge ${TYPE_TONE[r.type] ?? 'badge-gray'}`}>{r.type}</span> },
    { key: 'rec', header: 'Recommendation', render: (r) => <span className="text-xs font-semibold text-ink-900">{r.recommendation}</span> },
    { key: 'why', header: 'Evidence', render: (r) => <span className="text-xs text-ink-500">{r.reason}</span> },
    { key: 'lift', header: 'Lift', align: 'right', render: (r) => `${r.lift.toFixed(2)}×` },
    { key: 'priority', header: 'Priority', render: (r) => <span className={`badge ${r.priority === 'High' ? 'badge-red' : 'badge-amber'}`}>{r.priority}</span> },
  ]

  return (
    <>
      <PageHeader title="Market Basket Analysis" subtitle={`${rules.data.algorithm} over ${fmtNum(s.transactions)} orders: support, confidence and lift`} />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard label="Orders analysed" value={fmtNum(s.transactions)} icon={ShoppingBasket} accent="#f95d0b"
          footer={<p className="mt-1 text-[0.68rem] text-ink-400">avg {s.avg_basket_items} distinct items / order</p>} />
        <KpiCard label="Association rules" value={fmtNum(s.rules)} icon={Network} accent="#1d4ed8" delay={60}
          footer={<p className="mt-1 text-[0.68rem] text-ink-400">{fmtNum(s.frequent_itemsets)} frequent itemsets (support ≥ {rules.data.parameters.min_support})</p>} />
        <KpiCard label={`Strong rules (lift > ${rules.data.parameters.bundle_min_lift})`} value={fmtNum(s.strong_rules)} icon={TrendingUp} accent="#0d9459" delay={120}
          footer={<p className="mt-1 text-[0.68rem] text-ink-400">{s.strong_rules_with_loss_items} involve a loss-making item</p>} />
        <KpiCard label="Bundle recommendations" value={fmtNum(s.combo_recommendations + s.cross_sell_recommendations + s.upsell_recommendations)} icon={ListChecks} accent="#6938ef" delay={180}
          footer={<p className="mt-1 text-[0.68rem] text-ink-400">{s.combo_recommendations} combos · {s.cross_sell_recommendations} cross-sell · {s.upsell_recommendations} upsell</p>} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-5">
        <ChartCard
          title="Association rules" subtitle={`${fmtNum(rules.data.total_matching)} rules match, showing the top ${rules.data.rules.length} by lift`}
          className="xl:col-span-3"
          actions={
            <div className="flex items-center gap-2">
              <select className="input !w-auto !py-1.5 text-xs" value={minLift} onChange={(e) => setMinLift(Number(e.target.value))}>
                {LIFT_OPTIONS.map((l) => <option key={l} value={l}>Lift ≥ {l}</option>)}
              </select>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-ink-600">
                <input type="checkbox" checked={hideLoss} onChange={(e) => setHideLoss(e.target.checked)} /> Hide loss items
              </label>
              <button className="btn btn-ghost !rounded-lg !px-3 !py-1.5 text-xs" onClick={() => downloadCSV(rules.data.rules.map((r) => ({
                rule: r.rule, support: r.support, confidence: r.confidence, lift: r.lift, orders: r.order_count, loss_item: r.has_loss_making_item,
              })), 'association_rules.csv')}>CSV</button>
            </div>
          }
        >
          <DataTable columns={columns} rows={rules.data.rules} rowKey={(r) => r.rule} maxHeight={440} />
        </ChartCard>

        <ChartCard title="Lift of the strongest rules" subtitle="Lift = how many times more often than chance" className="xl:col-span-2" height={440}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={top} layout="vertical" margin={{ left: 10, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="label" width={170} tick={{ fontSize: 9, fill: '#555a78' }} axisLine={false} tickLine={false} />
              <RTooltip formatter={(v) => `${Number(v).toFixed(2)}×`} />
              <Bar dataKey="lift" radius={[0, 6, 6, 0]} name="Lift" barSize={14}>
                {top.map((r) => <Cell key={r.rule} fill={r.has_loss_making_item ? '#e11d48' : r.lift >= 2 ? '#0d9459' : '#f9a825'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {bundles.data && (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {bundles.data.combos.slice(0, 6).map((c) => (
            <div key={c.rule} className="card p-5">
              <p className="text-[0.68rem] font-bold uppercase tracking-wider text-emerald-600">Combo meal</p>
              <p className="mt-1 text-sm font-bold text-ink-900">{c.antecedents[0].item_name} + {c.consequents[0].item_name}</p>
              <p className="text-xs text-ink-400">{c.antecedents[0].category} + {c.consequents[0].category}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div><p className="text-[0.62rem] text-ink-400">Support</p><p className="text-xs font-extrabold">{(c.support * 100).toFixed(2)}%</p></div>
                <div><p className="text-[0.62rem] text-ink-400">Confidence</p><p className="text-xs font-extrabold">{(c.confidence * 100).toFixed(1)}%</p></div>
                <div><p className="text-[0.62rem] text-ink-400">Lift</p><p className="text-xs font-extrabold text-brand-600">{c.lift.toFixed(2)}×</p></div>
              </div>
              <p className="mt-3 text-xs text-ink-500">{c.reason}. Combined margin ${c.combined_margin_per_unit.toFixed(2)} per pair.</p>
            </div>
          ))}
        </div>
      )}

      {bundles.data?.loss_warnings?.length > 0 && (
        <div className="mt-5 rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-800">
          <p className="flex items-center gap-2 font-bold"><AlertTriangle size={15} /> {bundles.data.loss_warnings.length} strong associations are not recommended as bundles</p>
          <p className="mt-1 text-xs">
            e.g. {bundles.data.loss_warnings[0].rule} (lift {bundles.data.loss_warnings[0].lift.toFixed(2)}×). These pairs contain a loss-making item, so bundling them would amplify losses.
          </p>
        </div>
      )}

      {recs.data && (
        <ChartCard title="Bundle, cross-sell and upsell recommendations" subtitle={`${recs.data.total} evidence-backed actions`} className="mt-5">
          <DataTable columns={recColumns} rows={recs.data.recommendations} rowKey={(r) => `${r.type}-${r.rule}`} maxHeight={420} />
        </ChartCard>
      )}
    </>
  )
}
