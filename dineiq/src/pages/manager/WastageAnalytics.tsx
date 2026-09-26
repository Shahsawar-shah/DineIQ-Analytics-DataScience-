import { TriangleAlert, Trash2, Wallet } from 'lucide-react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import PageHeader from '@/components/layout/PageHeader'
import ChartCard from '@/components/charts/ChartCard'
import StatusBadge from '@/components/ui/StatusBadge'
import { InsightCard } from '@/components/ui/InsightCard'
import { INVENTORY, LOCATIONS, WASTAGE_BY_CATEGORY, WASTAGE_TREND, fmtMoney } from '@/data/mockData'

const HIGH_RISK = [...INVENTORY].sort((a, b) => b.wastagePct - a.wastagePct).slice(0, 6)

export default function WastageAnalytics() {
  const totalCost = WASTAGE_TREND.reduce((s, d) => s + d.cost, 0)
  return (
    <>
      <PageHeader title="Wastage Analytics" subtitle="Track, trend and reduce kitchen waste" demo />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          { icon: Trash2, label: 'Total Wastage (week)', value: `${WASTAGE_TREND.reduce((s, d) => s + d.wastage, 0).toLocaleString()} units`, accent: '#d92d20' },
          { icon: Wallet, label: 'Wastage Cost (week)', value: fmtMoney(totalCost), accent: '#b54708' },
          { icon: TriangleAlert, label: 'High-Risk Items', value: String(HIGH_RISK.filter((i) => i.wastagePct >= 5).length), accent: '#e11d48' },
          { icon: Wallet, label: 'Wastage % of COGS', value: '3.1%', accent: '#f95d0b' },
        ].map((k, i) => (
          <div key={k.label} className="card card-hover anim-fade-up p-4" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-center justify-between">
              <div className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: `${k.accent}18`, color: k.accent }}>
                <k.icon size={17} />
              </div>
            </div>
            <p className="font-display mt-3 text-xl font-extrabold text-ink-900">{k.value}</p>
            <p className="text-[0.66rem] font-bold uppercase tracking-[0.1em] text-ink-400">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <ChartCard title="Wastage Trend" subtitle="Units and cost by day (week)" className="xl:col-span-2">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={WASTAGE_TREND}>
                <defs>
                  <linearGradient id="wasteGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e11d48" stopOpacity={0.32} />
                    <stop offset="100%" stopColor="#e11d48" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#878ba7' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#878ba7' }} axisLine={false} tickLine={false} />
                <RTooltip />
                <Area type="monotone" dataKey="wastage" stroke="#e11d48" strokeWidth={2.5} fill="url(#wasteGrad)" name="Units wasted" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Category-wise Wastage" subtitle="Share of total waste %">
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={WASTAGE_BY_CATEGORY} dataKey="value" innerRadius={42} outerRadius={66} paddingAngle={4} strokeWidth={0}>
                  {WASTAGE_BY_CATEGORY.map((_, i) => <Cell key={i} fill={['#e11d48', '#f95d0b', '#f9a825', '#1d4ed8', '#878ba7'][i % 5]} />)}
                </Pie>
                <RTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5">
            {WASTAGE_BY_CATEGORY.map((c, i) => (
              <div key={c.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-ink-500">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: ['#e11d48', '#f95d0b', '#f9a825', '#1d4ed8', '#878ba7'][i % 5] }} />
                  {c.name}
                </span>
                <span className="font-bold text-ink-900">{c.value}%</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <ChartCard title="Location-wise Wastage Cost" subtitle="Estimated weekly cost by location">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={LOCATIONS.map((l, i) => ({ name: l.name.split(' ')[0], cost: 320 + i * 87 + (i === 3 ? 210 : 0) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9.5, fill: '#878ba7' }} axisLine={false} tickLine={false} interval={0} />
                <YAxis tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} />
                <RTooltip />
                <Bar dataKey="cost" radius={[6, 6, 0, 0]} name="Cost ($)">
                  {LOCATIONS.map((_, i) => <Cell key={i} fill={i === 3 ? '#e11d48' : '#fb7f38'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="High-Risk Items" subtitle="Ranked by wastage percentage">
          <div className="space-y-2">
            {HIGH_RISK.map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-xl border border-ink-100 px-3.5 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-ink-900">{item.item}</p>
                  <p className="text-[0.65rem] text-ink-400">{item.category} · {item.stock} {item.unit} in stock</p>
                </div>
                <div className="w-24">
                  <div className="meter"><span style={{ width: `${Math.min(100, item.wastagePct * 11)}%`, background: item.wastagePct >= 5 ? 'linear-gradient(90deg,#fb7185,#e11d48)' : 'linear-gradient(90deg,#fbbf24,#d97706)' }} /></div>
                </div>
                <StatusBadge status={item.wastagePct >= 5 ? 'Critical' : 'Warning'} />
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <InsightCard tone="danger" title="Romaine Lettuce — 7.4% wastage" text="Highest waste rate in the catalog. Reduce ordering to 3 deliveries per week and switch to smaller crates." />
        <InsightCard tone="warn" title="Saturday spike pattern" text="Wastage peaks every Saturday (+25% vs average). Pre-position prep buffers Friday evening." delay={70} />
        <InsightCard tone="success" title="Dessert wastage nearly zero" text="Lava Cake batch workflow keeps waste at 1.4% — replicate this prep model for Tiramisu." delay={140} />
      </div>
    </>
  )
}
