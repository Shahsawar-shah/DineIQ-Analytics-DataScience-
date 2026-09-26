import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Scatter, ScatterChart,
  Tooltip as RTooltip, XAxis, YAxis, ZAxis,
} from 'recharts'
import PageHeader from '@/components/layout/PageHeader'
import DataTable, { type Column } from '@/components/ui/DataTable'
import StatusBadge from '@/components/ui/StatusBadge'
import FilterBar from '@/components/ui/FilterBar'
import ChartCard from '@/components/charts/ChartCard'
import { CATEGORIES, MENU_ITEMS, MENU_PERF_SCATTER, fmtMoney, fmtNum, fmtPct } from '@/data/mockData'
import type { MenuItemRow } from '@/types'

const CLASS_COLORS: Record<string, string> = { High: '#0d9459', Medium: '#d97706', Low: '#e11d48' }

export default function MenuIntelligence() {
  const [filters, setFilters] = useState<Record<string, string>>({ cls: 'all', category: 'all', q: '' })

  const rows = useMemo(
    () =>
      MENU_ITEMS.filter(
        (m) =>
          (filters.cls === 'all' || m.perfClass === filters.cls) &&
          (filters.category === 'all' || m.category === filters.category) &&
          (filters.q === '' || m.name.toLowerCase().includes(filters.q.toLowerCase())),
      ),
    [filters],
  )

  const columns: Column<MenuItemRow>[] = [
    {
      key: 'name',
      header: 'Menu Item',
      render: (r) => (
        <div>
          <p className="font-semibold text-ink-900">{r.name}</p>
          <p className="text-[0.68rem] text-ink-400">{r.category} · {fmtMoney(r.price, 2)}</p>
        </div>
      ),
    },
    { key: 'sold', header: 'Sold', align: 'right', render: (r) => fmtNum(r.sold) },
    { key: 'revenue', header: 'Revenue', align: 'right', render: (r) => <span className="font-semibold">{fmtMoney(r.revenue)}</span> },
    { key: 'cost', header: 'Cost', align: 'right', render: (r) => fmtMoney(r.cost, 2) },
    { key: 'profit', header: 'Profit/Unit', align: 'right', render: (r) => fmtMoney(r.profit, 2) },
    { key: 'margin', header: 'Margin', align: 'right', render: (r) => fmtPct(r.margin) },
    { key: 'rating', header: 'Rating', align: 'right', render: (r) => `★ ${r.rating.toFixed(1)}` },
    { key: 'repeat', header: 'Repeat', align: 'right', render: (r) => `${r.repeatRate}%` },
    { key: 'wastage', header: 'Wastage', align: 'right', render: (r) => fmtPct(r.wastagePct) },
    { key: 'promo', header: 'Promo Lift', align: 'right', render: (r) => `+${r.promoLift}%` },
    {
      key: 'trend',
      header: 'Trend',
      align: 'right',
      render: (r) => (
        <span className={r.trend >= 0 ? 'font-semibold text-emerald-600' : 'font-semibold text-rose-600'}>
          {r.trend >= 0 ? '▲' : '▼'} {Math.abs(r.trend)}%
        </span>
      ),
    },
    { key: 'cls', header: 'Class', render: (r) => <StatusBadge status={r.perfClass} tone={r.perfClass === 'High' ? 'green' : r.perfClass === 'Medium' ? 'amber' : 'red'} /> },
  ]

  const exportCsv = () => {
    const head = 'name,category,price,sold,revenue,margin,rating,repeat,wastage,class'
    const body = rows.map((m) => [m.name, m.category, m.price, m.sold, m.revenue, m.margin, m.rating, m.repeatRate, m.wastagePct, m.perfClass].join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([`${head}\n${body}`], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'dineiq-menu-intelligence.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <PageHeader title="Menu Intelligence" subtitle="Menu Matrix classification of every item — sales, margin, rating, wastage" demo
        actions={<button className="btn btn-ghost !px-4 !py-2.5 text-xs" onClick={exportCsv}><Download size={14} /> Export CSV</button>} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterBar
          filters={[
            { key: 'cls', label: 'Class', options: ['High', 'Medium', 'Low'].map((c) => ({ label: c, value: c })) },
            { key: 'category', label: 'Category', options: CATEGORIES.map((c) => ({ label: c, value: c })) },
          ]}
          values={filters}
          onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
          onReset={() => setFilters({ cls: 'all', category: 'all', q: '' })}
        />
        <input className="input ml-auto !w-52 !rounded-xl !py-2 text-xs" placeholder="Search items…" value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} />
      </div>

      <div className="grid gap-5 xl:grid-cols-5">
        <ChartCard title="Menu Matrix Map" subtitle="Sold volume vs margin (bubble = revenue)" className="xl:col-span-3" height={300}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 8, right: 16, bottom: 4, left: -8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" />
              <XAxis type="number" dataKey="x" name="Sold" tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} />
              <YAxis type="number" dataKey="y" name="Margin %" tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} />
              <ZAxis type="number" dataKey="z" range={[40, 320]} />
              <RTooltip
                content={({ payload }) => {
                  const p = payload?.[0]?.payload as (typeof MENU_PERF_SCATTER)[number] | undefined
                  if (!p) return null
                  return (
                    <div className="rounded-xl border border-ink-100 bg-white px-3 py-2 text-xs shadow-lg">
                      <p className="font-bold text-ink-900">{p.name}</p>
                      <p className="text-ink-500">{fmtNum(p.x)} sold · {p.y}% margin · class {p.cls}</p>
                    </div>
                  )
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {(['High', 'Medium', 'Low'] as const).map((cls) => (
                <Scatter key={cls} name={cls} data={MENU_PERF_SCATTER.filter((s) => s.cls === cls)} fill={CLASS_COLORS[cls]} fillOpacity={0.75} />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Margin by Category" subtitle="Average margin %" className="xl:col-span-2" height={300}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={CATEGORIES.map((c) => {
              const items = MENU_ITEMS.filter((m) => m.category === c)
              return { name: c, margin: +(items.reduce((s, m) => s + m.margin, 0) / items.length).toFixed(1) }
            })}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#878ba7' }} axisLine={false} tickLine={false} interval={0} />
              <YAxis tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} />
              <RTooltip />
              <Bar dataKey="margin" radius={[6, 6, 0, 0]} name="Margin %">
                {CATEGORIES.map((_, i) => <Cell key={i} fill={['#f95d0b', '#fb7f38', '#f9a825', '#1d4ed8', '#6938ef'][i % 5]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="card mt-5 p-2 sm:p-4">
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} emptyMessage="No items match your filters." maxHeight="560px" />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {(['High', 'Medium', 'Low'] as const).map((cls, i) => {
          const items = MENU_ITEMS.filter((m) => m.perfClass === cls)
          return (
            <div key={cls} className="card card-hover anim-fade-up p-4" style={{ animationDelay: `${i * 70}ms` }}>
              <div className="mb-2 flex items-center justify-between">
                <StatusBadge status={cls} tone={cls === 'High' ? 'green' : cls === 'Medium' ? 'amber' : 'red'} />
                <span className="font-display text-xl font-extrabold text-ink-900">{items.length}</span>
              </div>
              <p className="text-xs text-ink-400">
                {cls === 'High' && 'Protect, promote and feature these items prominently.'}
                {cls === 'Medium' && 'Optimize price, portion or placement to lift performance.'}
                {cls === 'Low' && 'Rework, reprice or retire — review recipes and demand.'}
              </p>
            </div>
          )
        })}
      </div>
    </>
  )
}
