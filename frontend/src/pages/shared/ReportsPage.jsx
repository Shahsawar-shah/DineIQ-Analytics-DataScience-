import { useMemo, useState } from 'react'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts'
import PageHeader from '../../components/layout/PageHeader'
import ChartCard from '../../components/charts/ChartCard'
import FilterBar from '../../components/ui/FilterBar'
import { LOCATIONS, REVENUE_TREND, fmtMoney } from '../../data/mockData'

const TYPES = ['Sales Summary', 'Menu Performance', 'Customer Insights', 'Inventory & Wastage', 'Forecast Accuracy']

/** Generic reports page reused by Manager and Inventory roles (Admin has its own). */
export default function ReportsPage({ scope }) {
  const [filters, setFilters] = useState({ type: 'all', location: 'all' })
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)

  const series = useMemo(() => {
    const f = filters.location === 'all' ? 1 : 0.62
    return REVENUE_TREND.map((r) => ({ month: r.month, revenue: Math.round(r.revenue * f) }))
  }, [filters.location])

  const generate = (format) => {
    setBusy(true)
    setDone(null)
    setTimeout(() => {
      setBusy(false)
      if (format !== 'PDF') {
        const rows = series.map((s) => `${s.month},${s.revenue}`).join('\n')
        const blob = new Blob([`month,revenue\n${rows}`], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `dineiq-${format === 'CSV' ? 'report' : 'report'}.csv`
        a.click()
        URL.revokeObjectURL(url)
      }
      setDone(`${format} report generated (demo${format === 'PDF' ? ' — preview only' : ' — CSV downloaded'})`)
    }, 700)
  }

  const total = series.reduce((s, r) => s + r.revenue, 0)

  return (
    <>
      <PageHeader title="Reports" subtitle={`${scope} reporting with export`} demo />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterBar
          filters={[
            { key: 'type', label: 'Report Type', options: TYPES.map((t) => ({ label: t, value: t })) },
            { key: 'location', label: 'Location', options: LOCATIONS.map((l) => ({ label: l.name, value: l.name })) },
          ]}
          values={filters}
          onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
          onReset={() => setFilters({ type: 'all', location: 'all' })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          { label: 'Report Total Revenue', value: fmtMoney(total) },
          { label: 'Periods Covered', value: String(series.length) },
          { label: 'Report Type', value: filters.type === 'all' ? 'Sales Summary' : filters.type },
          { label: 'Scope', value: filters.location === 'all' ? 'All locations' : filters.location },
        ].map((k, i) => (
          <div key={k.label} className="card card-hover anim-fade-up p-4" style={{ animationDelay: `${i * 60}ms` }}>
            <p className="text-[0.66rem] font-bold uppercase tracking-[0.1em] text-ink-400">{k.label}</p>
            <p className="font-display mt-1 truncate text-lg font-extrabold text-ink-900">{k.value}</p>
          </div>
        ))}
      </div>

      <ChartCard title="Report Data Preview" subtitle="Series included in the export" className="mt-5">
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series}>
              <defs>
                <linearGradient id="repGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f95d0b" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#f95d0b" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#878ba7' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
              <RTooltip formatter={(v) => (typeof v === 'number' ? fmtMoney(v) : String(v))} />
              <Area type="monotone" dataKey="revenue" stroke="#f95d0b" strokeWidth={2.4} fill="url(#repGrad)" name="Revenue" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <div className="card mt-5 flex flex-wrap items-center gap-3 p-5">
        <button className="btn btn-primary !px-5 !py-2.5 text-xs" disabled={busy} onClick={() => generate('CSV')}>
          <Download size={14} /> Export CSV
        </button>
        <button className="btn btn-ghost !px-5 !py-2.5 text-xs" disabled={busy} onClick={() => generate('Excel')}>
          <FileSpreadsheet size={14} /> Export Excel
        </button>
        <button className="btn btn-ghost !px-5 !py-2.5 text-xs" disabled={busy} onClick={() => generate('PDF')}>
          <FileText size={14} /> Export PDF
        </button>
        {busy && <span className="text-xs font-semibold text-ink-400">Generating…</span>}
        {done && <span className="anim-pop text-xs font-bold text-emerald-600">{done}</span>}
      </div>
    </>
  )
}
