import { DollarSign, TrendingDown, TrendingUp } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts'
import PageHeader from '@/components/layout/PageHeader'
import ChartCard from '@/components/charts/ChartCard'
import StatusBadge from '@/components/ui/StatusBadge'
import { MiniStat } from '@/components/ui/InsightCard'
import { PRICING_ROWS, fmtMoney, fmtNum } from '@/data/mockData'

export default function Pricing() {
  const sensitivityColors: Record<string, string> = { Low: '#0d9459', Medium: '#d97706', High: '#e11d48' }
  return (
    <>
      <PageHeader title="Pricing Intelligence" subtitle="Price sensitivity and demand elasticity per menu item" demo />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <MiniStat icon={<DollarSign size={17} />} color="#f95d0b" label="Avg Price Change" value="+6.1%" />
        <MiniStat icon={<TrendingUp size={17} />} color="#0d9459" label="Items Gaining Demand" value={String(PRICING_ROWS.filter((p) => p.demandChange > 0).length)} />
        <MiniStat icon={<TrendingDown size={17} />} color="#e11d48" label="Elastic Items" value={String(PRICING_ROWS.filter((p) => Math.abs(p.elasticity) >= 1.2).length)} />
        <MiniStat icon={<DollarSign size={17} />} color="#1d4ed8" label="Est. Price Uplift" value="+$4.8k/mo" />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <ChartCard title="Price Elasticity by Item" subtitle="More negative = more price-sensitive" height={320}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={PRICING_ROWS} layout="vertical" margin={{ left: 46 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="item" tick={{ fontSize: 8.5, fill: '#686d8c' }} width={128} axisLine={false} tickLine={false} />
              <RTooltip />
              <Bar dataKey="elasticity" radius={[0, 6, 6, 0]} name="Elasticity" barSize={13}>
                {PRICING_ROWS.map((r) => <Cell key={r.id} fill={sensitivityColors[r.sensitivity]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Demand Change After Price Update" subtitle="Post-change volume trend %" height={320}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={PRICING_ROWS}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
              <XAxis dataKey="item" tick={{ fontSize: 8, fill: '#878ba7' }} axisLine={false} tickLine={false} interval={0} />
              <YAxis tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} />
              <RTooltip />
              <Bar dataKey="demandChange" radius={[5, 5, 0, 0]} name="Demand Δ%">
                {PRICING_ROWS.map((r) => <Cell key={r.id} fill={r.demandChange >= 0 ? '#0d9459' : '#e11d48'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="card mt-5 p-2 sm:p-4">
        <div className="flex items-center justify-between px-2 pb-3 pt-1">
          <h3 className="font-display text-sm font-bold text-ink-900">Price Sensitivity Table</h3>
          <span className="badge badge-violet">Demo / Mock Data</span>
        </div>
        <div className="overflow-x-auto">
          <table className="dq-table">
            <thead>
              <tr><th>Item</th><th>Old Price</th><th>Current Price</th><th>Sales</th><th>Revenue</th><th>Demand Δ</th><th>Elasticity</th><th>Sensitivity</th></tr>
            </thead>
            <tbody>
              {PRICING_ROWS.map((p) => (
                <tr key={p.id}>
                  <td className="font-semibold text-ink-900">{p.item}</td>
                  <td className="text-ink-400">{fmtMoney(p.oldPrice, 2)}</td>
                  <td className="font-bold text-brand-600">{fmtMoney(p.currentPrice, 2)}</td>
                  <td>{fmtNum(p.sales)}</td>
                  <td className="font-semibold">{fmtMoney(p.revenue)}</td>
                  <td className={p.demandChange >= 0 ? 'font-semibold text-emerald-600' : 'font-semibold text-rose-600'}>
                    {p.demandChange >= 0 ? '▲' : '▼'} {Math.abs(p.demandChange)}%
                  </td>
                  <td>{p.elasticity.toFixed(1)}</td>
                  <td>
                    <StatusBadge
                      status={p.sensitivity}
                      tone={p.sensitivity === 'Low' ? 'green' : p.sensitivity === 'Medium' ? 'amber' : 'red'}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
