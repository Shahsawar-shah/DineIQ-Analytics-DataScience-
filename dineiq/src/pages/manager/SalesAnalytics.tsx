import { useMemo, useState } from 'react'
import { Download, ShoppingBag, Users, Wallet, Receipt } from 'lucide-react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import PageHeader from '@/components/layout/PageHeader'
import KpiCard from '@/components/ui/KpiCard'
import ChartCard from '@/components/charts/ChartCard'
import FilterBar from '@/components/ui/FilterBar'
import { CHANNEL_SHARE, HOURLY_SALES, LOCATIONS, MENU_ITEMS, REVENUE_TREND, ORDERS, fmtMoney, fmtNum } from '@/data/mockData'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAILY_SALES = DAY_NAMES.map((d, i) => ({ day: d, sales: 15600 + i * 640, orders: 520 + i * 24 }))

export default function SalesAnalytics() {
  const [filters, setFilters] = useState<Record<string, string>>({ location: 'all', channel: 'all' })

  const data = useMemo(() => {
    // Visually respond to filters — scale mock series deterministically.
    const locFactor = filters.location === 'all' ? 1 : 1 - LOCATIONS.findIndex((l) => l.name === filters.location) * 0.11
    const chFactor = filters.channel === 'all' ? 1 : filters.channel === 'Dine-in' ? 0.46 : filters.channel === 'Delivery' ? 0.28 : 0.7
    return {
      monthly: REVENUE_TREND.map((r) => ({ ...r, revenue: Math.round(r.revenue * locFactor * chFactor) })),
      hourly: HOURLY_SALES.map((r) => ({ ...r, sales: Math.round(r.sales * locFactor * chFactor) })),
      daily: DAILY_SALES.map((r) => ({ ...r, sales: Math.round(r.sales * locFactor * chFactor) })),
    }
  }, [filters])

  const totalRev = data.monthly.reduce((s, r) => s + r.revenue, 0)
  const totalOrders = Math.round(data.monthly.reduce((s, r) => s + r.orders, 0) * 0.35)

  return (
    <>
      <PageHeader title="Sales Analytics" subtitle="Revenue, orders and channel performance" demo
        actions={<button className="btn btn-ghost !px-4 !py-2.5 text-xs" onClick={() => window.print?.()}><Download size={14} /> Export</button>} />

      <div className="mb-4">
        <FilterBar
          filters={[
            { key: 'location', label: 'Location', options: LOCATIONS.map((l) => ({ label: l.name, value: l.name })) },
            { key: 'channel', label: 'Channel', options: CHANNEL_SHARE.map((c) => ({ label: c.name, value: c.name })) },
          ]}
          values={filters}
          onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
          onReset={() => setFilters({ location: 'all', channel: 'all' })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard label="Revenue (6 mo)" value={fmtMoney(totalRev)} delta={5.5} icon={Wallet} accent="#f95d0b" />
        <KpiCard label="Orders (30d)" value={fmtNum(totalOrders)} delta={3.9} icon={ShoppingBag} accent="#1d4ed8" delay={60} />
        <KpiCard label="Avg Order Value" value={fmtMoney(30.7, 2)} delta={1.6} icon={Receipt} accent="#6938ef" delay={120} />
        <KpiCard label="Unique Customers" value={fmtNum(1020)} delta={4.8} icon={Users} accent="#0d9459" delay={180} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <ChartCard title="Monthly Revenue" subtitle="Revenue vs target" className="xl:col-span-2">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.monthly}>
                <defs>
                  <linearGradient id="salesRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f95d0b" stopOpacity={0.42} />
                    <stop offset="100%" stopColor="#f95d0b" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#878ba7' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#878ba7' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v / 1000}k`} />
                <RTooltip formatter={(v: unknown) => (typeof v === 'number' ? fmtMoney(v) : String(v))} />
                <Area type="monotone" dataKey="revenue" stroke="#f95d0b" strokeWidth={2.6} fill="url(#salesRev)" name="Revenue" />
                <Area type="monotone" dataKey="target" stroke="#1d4ed8" strokeWidth={1.5} strokeDasharray="5 4" fill="transparent" name="Target" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Daily Pattern" subtitle="Sales by weekday">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.daily} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v / 1000}k`} />
                <YAxis type="category" dataKey="day" tick={{ fontSize: 11, fill: '#686d8c' }} width={38} axisLine={false} tickLine={false} />
                <RTooltip formatter={(v: unknown) => (typeof v === 'number' ? fmtMoney(v) : String(v))} />
                <Bar dataKey="sales" fill="#fb7f38" radius={[0, 6, 6, 0]} name="Sales" barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <ChartCard title="Hourly Sales" subtitle="Average by hour of day">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.hourly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} />
                <RTooltip />
                <Bar dataKey="sales" fill="#f95d0b" radius={[4, 4, 0, 0]} name="Sales ($)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Recent Orders" subtitle="Latest transactions">
          <div className="max-h-60 overflow-auto">
            <table className="dq-table">
              <thead><tr><th>Order</th><th>Channel</th><th>Location</th><th>Total</th></tr></thead>
              <tbody>
                {ORDERS.slice(0, 8).map((o) => (
                  <tr key={o.id}>
                    <td className="font-semibold text-ink-900">{o.id}</td>
                    <td>{o.channel}</td>
                    <td className="text-ink-500">{o.location}</td>
                    <td className="font-semibold">{fmtMoney(o.total, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>

      <ChartCard title="Top Performing Items" subtitle="Ranked by revenue" className="mt-5">
        <div className="overflow-x-auto">
          <table className="dq-table">
            <thead><tr><th>#</th><th>Item</th><th>Category</th><th>Sold</th><th>Revenue</th><th>Margin</th><th>Trend</th></tr></thead>
            <tbody>
              {[...MENU_ITEMS].sort((a, b) => b.revenue - a.revenue).slice(0, 8).map((m, i) => (
                <tr key={m.id}>
                  <td className="font-display font-extrabold text-ink-300">#{i + 1}</td>
                  <td className="font-semibold text-ink-900">{m.name}</td>
                  <td>{m.category}</td>
                  <td>{fmtNum(m.sold)}</td>
                  <td className="font-semibold">{fmtMoney(m.revenue)}</td>
                  <td>{m.margin.toFixed(1)}%</td>
                  <td className={m.trend >= 0 ? 'font-semibold text-emerald-600' : 'font-semibold text-rose-600'}>
                    {m.trend >= 0 ? '▲' : '▼'} {Math.abs(m.trend)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </>
  )
}
