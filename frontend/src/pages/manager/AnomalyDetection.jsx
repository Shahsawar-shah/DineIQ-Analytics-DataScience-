import { useState } from 'react'
import { ShieldQuestion, Siren } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts'
import PageHeader from '../../components/layout/PageHeader'
import ChartCard from '../../components/charts/ChartCard'
import DataTable from '../../components/ui/DataTable'
import StatusBadge from '../../components/ui/StatusBadge'
import FilterBar from '../../components/ui/FilterBar'
import { ANOMALIES, fmtMoney } from '../../data/mockData'

export default function AnomalyDetection() {
  const [filters, setFilters] = useState({ severity: 'all', status: 'all' })

  const rows = ANOMALIES.filter(
    (a) =>
      (filters.severity === 'all' || a.severity === filters.severity) &&
      (filters.status === 'all' || a.status === filters.status),
  )

  const columns = [
    { key: 'id', header: 'ID', render: (r) => <span className="text-ink-400">{r.id}</span> },
    { key: 'date', header: 'Date', render: (r) => r.date },
    { key: 'location', header: 'Location', render: (r) => <span className="font-semibold text-ink-900">{r.location}</span> },
    { key: 'metric', header: 'Metric', render: (r) => r.metric },
    { key: 'expected', header: 'Expected', align: 'right', render: (r) => fmtMoney(r.expected, r.expected < 100 ? 1 : 0) },
    {
      key: 'actual',
      header: 'Actual',
      align: 'right',
      render: (r) => (
        <span className={r.actual < r.expected * 0.9 ? 'font-bold text-rose-600' : r.actual > r.expected * 1.1 ? 'font-bold text-amber-600' : 'text-ink-700'}>
          {fmtMoney(r.actual, r.actual < 100 ? 1 : 0)}
        </span>
      ),
    },
    {
      key: 'dev',
      header: 'Deviation',
      align: 'right',
      render: (r) => {
        const dev = (((r.actual - r.expected) / r.expected) * 100).toFixed(1)
        return <span className={Number(dev) >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{Number(dev) >= 0 ? '+' : ''}{dev}%</span>
      },
    },
    { key: 'severity', header: 'Severity', render: (r) => <StatusBadge status={r.severity} /> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ]

  const counts = ['Critical', 'Warning', 'Normal'].map((s) => ({ name: s, count: ANOMALIES.filter((a) => a.severity === s).length }))

  return (
    <>
      <PageHeader title="Anomaly Detection" subtitle="Automatic deviation scoring on revenue, orders, wastage and ops metrics" demo />

      <div className="mb-4">
        <FilterBar
          filters={[
            { key: 'severity', label: 'Severity', options: ['Critical', 'Warning', 'Normal'].map((s) => ({ label: s, value: s })) },
            { key: 'status', label: 'Status', options: ['Open', 'Investigating', 'Resolved'].map((s) => ({ label: s, value: s })) },
          ]}
          values={filters}
          onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
          onReset={() => setFilters({ severity: 'all', status: 'all' })}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <ChartCard title="Anomalies by Severity" subtitle="Last 7 days">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={counts}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#878ba7' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#878ba7' }} axisLine={false} tickLine={false} />
                <RTooltip />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} name="Count">
                  <Cell fill="#e11d48" /><Cell fill="#d97706" /><Cell fill="#0d9459" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <div className="space-y-4 xl:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="card card-hover anim-fade-up flex items-start gap-3 p-4">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-rose-50 text-rose-600"><Siren size={18} /></div>
              <div>
                <p className="text-sm font-bold text-ink-900">Critical: Revenue drop at Harbor Point</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-500">
                  Sep 24 revenue of {fmtMoney(2860)} came in 32% below the {fmtMoney(4180)} expectation. Marketing
                  attribution and POS sync are being investigated.
                </p>
                <span className="badge badge-amber mt-2">Investigating</span>
              </div>
            </div>
            <div className="card card-hover anim-fade-up flex items-start gap-3 p-4" style={{ animationDelay: '80ms' }}>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-600"><ShieldQuestion size={18} /></div>
              <div>
                <p className="text-sm font-bold text-ink-900">Model health</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-500">
                  Isolation-Forest detector scored 1,462 metric series in the last 24h (mock). False-positive
                  rate: 2.1% — within the 3% threshold.
                </p>
                <span className="badge badge-green mt-2">Detector nominal</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card mt-5 p-2 sm:p-4">
        <div className="flex items-center justify-between px-2 pb-3 pt-1">
          <h3 className="font-display text-sm font-bold text-ink-900">Detected Anomalies</h3>
          <span className="badge badge-violet">Mock frontend results</span>
        </div>
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} emptyMessage="No anomalies match your filters." />
      </div>
    </>
  )
}
