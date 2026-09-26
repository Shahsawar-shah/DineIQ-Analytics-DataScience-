import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts'
import PageHeader from '@/components/layout/PageHeader'
import ChartCard from '@/components/charts/ChartCard'
import StatusBadge from '@/components/ui/StatusBadge'
import { INVENTORY } from '@/data/mockData'

export default function StockLevels() {
  const data = INVENTORY.map((i) => ({ name: i.item, pct: Math.round((i.stock / i.parLevel) * 100), status: i.status, stock: i.stock, par: i.parLevel, unit: i.unit }))
  const lowCount = INVENTORY.filter((i) => i.status !== 'In Stock').length

  return (
    <>
      <PageHeader title="Stock Levels" subtitle="Current stock vs par level per item" demo
        actions={<span className={`badge ${lowCount > 0 ? 'badge-amber' : 'badge-green'}`}>{lowCount} items need attention</span>} />

      <ChartCard title="Stock Coverage" subtitle="Stock as % of par level — 100% means fully covered" height={380}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 70 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#686d8c' }} width={140} axisLine={false} tickLine={false} />
            <RTooltip
              content={({ payload }) => {
                const p = payload?.[0]?.payload as (typeof data)[number] | undefined
                if (!p) return null
                return (
                  <div className="rounded-xl border border-ink-100 bg-white px-3 py-2 text-xs shadow-lg">
                    <p className="font-bold text-ink-900">{p.name}</p>
                    <p className="text-ink-500">{p.stock} / {p.par} {p.unit} ({p.pct}%) · {p.status}</p>
                  </div>
                )
              }}
            />
            <Bar dataKey="pct" radius={[0, 6, 6, 0]} barSize={15} name="% of par">
              {data.map((d, i) => (
                <Cell key={i} fill={d.pct === 0 ? '#e11d48' : d.pct < 70 ? '#d97706' : '#0d9459'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {INVENTORY.map((i, idx) => {
          const pct = Math.min(100, Math.round((i.stock / i.parLevel) * 100))
          return (
            <div key={i.id} className="card card-hover anim-fade-up p-4" style={{ animationDelay: `${(idx % 6) * 50}ms` }}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="truncate text-sm font-bold text-ink-900">{i.item}</p>
                <StatusBadge status={i.status} />
              </div>
              <div className="meter mb-1"><span style={{ width: `${pct}%`, background: pct === 0 ? '#e11d48' : pct < 70 ? 'linear-gradient(90deg,#fbbf24,#d97706)' : 'linear-gradient(90deg,#34d399,#0d9459)' }} /></div>
              <div className="flex justify-between text-[0.68rem] text-ink-400">
                <span>{i.stock} / {i.parLevel} {i.unit}</span>
                <span className="font-semibold">{pct}%</span>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
