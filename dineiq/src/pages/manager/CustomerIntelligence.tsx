import { useMemo, useState } from 'react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import PageHeader from '@/components/layout/PageHeader'
import DataTable, { type Column } from '@/components/ui/DataTable'
import StatusBadge from '@/components/ui/StatusBadge'
import FilterBar from '@/components/ui/FilterBar'
import ChartCard from '@/components/charts/ChartCard'
import { CHURN_TREND, CUSTOMERS, SEGMENTS, fmtMoney, fmtNum } from '@/data/mockData'
import type { CustomerRow } from '@/types'

export default function CustomerIntelligence() {
  const [filters, setFilters] = useState<Record<string, string>>({ segment: 'all', churn: 'all' })

  const rows = useMemo(
    () =>
      CUSTOMERS.filter(
        (c) =>
          (filters.segment === 'all' || c.segment === filters.segment) &&
          (filters.churn === 'all' || c.churnRisk === filters.churn),
      ),
    [filters],
  )

  const columns: Column<CustomerRow>[] = [
    { key: 'name', header: 'Customer', render: (r) => <span className="font-semibold text-ink-900">{r.name}</span> },
    { key: 'segment', header: 'Segment', render: (r) => <span className="badge badge-orange">{r.segment}</span> },
    { key: 'rfm', header: 'RFM', align: 'center', render: (r) => <code className="rounded bg-ink-50 px-1.5 py-0.5 text-[0.7rem] font-bold">{r.rfm}</code> },
    { key: 'recency', header: 'Recency (d)', align: 'right', render: (r) => r.recencyDays },
    { key: 'frequency', header: 'Orders', align: 'right', render: (r) => r.orders },
    { key: 'monetary', header: 'Spend', align: 'right', render: (r) => fmtMoney(r.monetary) },
    { key: 'ltv', header: 'LTV', align: 'right', render: (r) => <span className="font-semibold">{fmtMoney(r.ltv)}</span> },
    { key: 'last', header: 'Last Visit', render: (r) => <span className="text-ink-400">{r.lastVisit}</span> },
    { key: 'risk', header: 'Churn Risk', render: (r) => <StatusBadge status={r.churnRisk === 'Low' ? 'Normal' : r.churnRisk === 'Medium' ? 'Warning' : 'Critical'} /> },
  ]

  return (
    <>
      <PageHeader title="Customer Intelligence" subtitle="RFM segmentation, churn risk and lifetime value" demo />

      <div className="mb-4">
        <FilterBar
          filters={[
            { key: 'segment', label: 'Segment', options: SEGMENTS.map((s) => ({ label: s.name, value: s.name })) },
            { key: 'churn', label: 'Churn Risk', options: ['Low', 'Medium', 'High'].map((c) => ({ label: c, value: c })) },
          ]}
          values={filters}
          onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
          onReset={() => setFilters({ segment: 'all', churn: 'all' })}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {SEGMENTS.map((s, i) => (
          <div key={s.name} className="card card-hover anim-fade-up p-4" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="mb-2 flex items-center justify-between">
              <span className="h-3 w-3 rounded-full" style={{ background: s.color }} />
              <span className="font-display text-lg font-extrabold text-ink-900">{s.count}</span>
            </div>
            <p className="text-xs font-bold text-ink-800">{s.name}</p>
            <p className="mt-0.5 text-[0.65rem] leading-snug text-ink-400">{s.desc}</p>
            <p className="mt-2 text-[0.68rem] font-semibold text-ink-500">Avg spend {fmtMoney(s.avgSpend, 2)} · {s.share}%</p>
            <div className="meter mt-1.5"><span style={{ width: `${s.share * 3}%`, background: s.color }} /></div>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <ChartCard title="Segment Distribution" subtitle="Customers per RFM segment">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={SEGMENTS} dataKey="count" nameKey="name" innerRadius={44} outerRadius={70} paddingAngle={3} strokeWidth={0}>
                  {SEGMENTS.map((s) => <Cell key={s.name} fill={s.color} />)}
                </Pie>
                <RTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Churn Trend" subtitle="Monthly churn vs retention %" className="xl:col-span-2">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={CHURN_TREND}>
                <defs>
                  <linearGradient id="churnGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e11d48" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#e11d48" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#878ba7' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#878ba7' }} axisLine={false} tickLine={false} />
                <RTooltip />
                <Area type="monotone" dataKey="churn" stroke="#e11d48" strokeWidth={2.4} fill="url(#churnGrad)" name="Churn %" />
                <Area type="monotone" dataKey="retained" stroke="#0d9459" strokeWidth={1.6} strokeDasharray="4 3" fill="transparent" name="Retained %" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <ChartCard title="Spending Patterns" subtitle="Avg spend per segment ($)">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={SEGMENTS}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 8.5, fill: '#878ba7' }} axisLine={false} tickLine={false} interval={0} />
                <YAxis tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} />
                <RTooltip />
                <Bar dataKey="avgSpend" radius={[6, 6, 0, 0]} name="Avg spend ($)">
                  {SEGMENTS.map((s) => <Cell key={s.name} fill={s.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Order Frequency by Segment" subtitle="Average orders per customer">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={SEGMENTS.map((s) => ({
                name: s.name,
                avgOrders: +(CUSTOMERS.filter((c) => c.segment === s.name).reduce((a, c) => a + c.orders, 0) / Math.max(1, CUSTOMERS.filter((c) => c.segment === s.name).length)).toFixed(1),
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 8.5, fill: '#878ba7' }} axisLine={false} tickLine={false} interval={0} />
                <YAxis tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} />
                <RTooltip />
                <Bar dataKey="avgOrders" fill="#f95d0b" radius={[6, 6, 0, 0]} name="Avg orders" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="card mt-5 p-2 sm:p-4">
        <div className="flex items-center justify-between px-2 pb-3 pt-1">
          <h3 className="font-display text-sm font-bold text-ink-900">Customer Table</h3>
          <span className="text-[0.68rem] text-ink-300">{fmtNum(rows.length)} of {CUSTOMERS.length} shown</span>
        </div>
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} emptyMessage="No customers match your filters." maxHeight="480px" />
      </div>
    </>
  )
}
