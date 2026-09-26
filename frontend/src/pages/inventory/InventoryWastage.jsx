import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts'
import PageHeader from '../../components/layout/PageHeader'
import ChartCard from '../../components/charts/ChartCard'
import { INVENTORY, WASTAGE_BY_CATEGORY, WASTAGE_TREND, fmtMoney } from '../../data/mockData'

export default function InventoryWastage() {
  const topWaste = [...INVENTORY].sort((a, b) => b.wastagePct - a.wastagePct).slice(0, 8)
  const weekCost = WASTAGE_TREND.reduce((s, d) => s + d.cost, 0)
  return (
    <>
      <PageHeader title="Wastage" subtitle="Where waste happens and what it costs" demo />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          { label: 'Units Wasted (week)', value: WASTAGE_TREND.reduce((s, d) => s + d.wastage, 0).toLocaleString() },
          { label: 'Cost of Waste (week)', value: fmtMoney(weekCost) },
          { label: 'Top Waste Category', value: 'Produce — 34%' },
          { label: 'Items Above 5% Waste', value: String(INVENTORY.filter((i) => i.wastagePct >= 5).length) },
        ].map((k, i) => (
          <div key={k.label} className="card card-hover anim-fade-up p-4" style={{ animationDelay: `${i * 60}ms` }}>
            <p className="font-display mt-1 text-xl font-extrabold text-ink-900">{k.value}</p>
            <p className="text-[0.66rem] font-bold uppercase tracking-[0.1em] text-ink-400">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <ChartCard title="Daily Wastage Cost" subtitle="This week ($)">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={WASTAGE_TREND}>
                <defs>
                  <linearGradient id="wcost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e11d48" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#e11d48" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#878ba7' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} />
                <RTooltip formatter={(v) => (typeof v === 'number' ? fmtMoney(v) : String(v))} />
                <Area type="monotone" dataKey="cost" stroke="#e11d48" strokeWidth={2.4} fill="url(#wcost)" name="Cost" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Wastage by Category" subtitle="% of total waste">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={WASTAGE_BY_CATEGORY}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9.5, fill: '#878ba7' }} axisLine={false} tickLine={false} interval={0} />
                <YAxis tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} />
                <RTooltip />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} name="% of waste">
                  {WASTAGE_BY_CATEGORY.map((_, i) => <Cell key={i} fill={['#e11d48', '#f95d0b', '#f9a825', '#1d4ed8', '#878ba7'][i % 5]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="card mt-5 p-2 sm:p-4">
        <div className="flex items-center justify-between px-2 pb-3 pt-1">
          <h3 className="font-display text-sm font-bold text-ink-900">Top Wasted Items</h3>
          <span className="badge badge-violet">Demo / Mock Data</span>
        </div>
        <div className="overflow-x-auto">
          <table className="dq-table">
            <thead><tr><th>Item</th><th>Category</th><th>Wastage %</th><th>Est. Weekly Cost</th><th>Recommended Action</th></tr></thead>
            <tbody>
              {topWaste.map((i) => (
                <tr key={i.id}>
                  <td className="font-semibold text-ink-900">{i.item}</td>
                  <td>{i.category}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="meter w-20"><span style={{ width: `${Math.min(100, i.wastagePct * 11)}%`, background: i.wastagePct >= 5 ? 'linear-gradient(90deg,#fb7185,#e11d48)' : 'linear-gradient(90deg,#fbbf24,#d97706)' }} /></div>
                      {i.wastagePct}%
                    </div>
                  </td>
                  <td className="font-semibold">{fmtMoney(Math.round(i.consumption30d * (i.wastagePct / 100) * 2.4))}</td>
                  <td className="text-ink-500">
                    {i.wastagePct >= 5 ? 'Reduce order size / renegotiate crates' : i.wastagePct >= 2 ? 'Monitor prep portions' : 'Within tolerance'}
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
