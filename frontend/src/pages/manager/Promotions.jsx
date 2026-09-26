import { Megaphone, Percent, TrendingUp, Target } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts'
import PageHeader from '../../components/layout/PageHeader'
import ChartCard from '../../components/charts/ChartCard'
import StatusBadge from '../../components/ui/StatusBadge'
import { PROMOTIONS, fmtMoney, fmtNum, fmtPct } from '../../data/mockData'

export default function Promotions() {
  const active = PROMOTIONS.filter((p) => p.status === 'Active')
  const totalRev = PROMOTIONS.reduce((s, p) => s + p.revenue, 0)
  const avgRoi = (PROMOTIONS.reduce((s, p) => s + p.roi, 0) / PROMOTIONS.length).toFixed(1)
  return (
    <>
      <PageHeader title="Promotion Analytics" subtitle="Campaign performance, conversion and ROI" demo />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          { icon: Megaphone, label: 'Active Campaigns', value: String(active.length), accent: '#f95d0b' },
          { icon: TrendingUp, label: 'Promo Revenue', value: fmtMoney(totalRev), accent: '#0d9459' },
          { icon: Percent, label: 'Avg Conversion', value: fmtPct(PROMOTIONS.reduce((s, p) => s + p.conversion, 0) / PROMOTIONS.length), accent: '#1d4ed8' },
          { icon: Target, label: 'Avg ROI', value: `${avgRoi}×`, accent: '#6938ef' },
        ].map((k, i) => (
          <div key={k.label} className="card card-hover anim-fade-up p-4" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: `${k.accent}18`, color: k.accent }}>
              <k.icon size={17} />
            </div>
            <p className="font-display mt-3 text-xl font-extrabold text-ink-900">{k.value}</p>
            <p className="text-[0.66rem] font-bold uppercase tracking-[0.1em] text-ink-400">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <ChartCard title="Revenue by Campaign" subtitle="Total promo-attributed revenue">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={PROMOTIONS} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                <YAxis type="category" dataKey="campaign" tick={{ fontSize: 9, fill: '#686d8c' }} width={132} axisLine={false} tickLine={false} />
                <RTooltip formatter={(v) => (typeof v === 'number' ? fmtMoney(v) : String(v))} />
                <Bar dataKey="revenue" radius={[0, 6, 6, 0]} name="Revenue" barSize={16}>
                  {PROMOTIONS.map((p, i) => <Cell key={i} fill={p.status === 'Active' ? '#f95d0b' : p.status === 'Scheduled' ? '#878ba7' : '#fbbf24'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="ROI vs Conversion" subtitle="Return on promo spend vs conversion rate">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={PROMOTIONS}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
                <XAxis dataKey="campaign" tick={{ fontSize: 7.5, fill: '#878ba7' }} axisLine={false} tickLine={false} interval={0} />
                <YAxis yAxisId="l" tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} />
                <RTooltip />
                <Bar yAxisId="l" dataKey="roi" fill="#0d9459" radius={[5, 5, 0, 0]} name="ROI (×)" barSize={14} />
                <Bar yAxisId="r" dataKey="conversion" fill="#f95d0b" radius={[5, 5, 0, 0]} name="Conversion %" barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="card mt-5 p-2 sm:p-4">
        <div className="flex items-center justify-between px-2 pb-3 pt-1">
          <h3 className="font-display text-sm font-bold text-ink-900">Campaign Performance Table</h3>
          <span className="badge badge-violet">Demo / Mock Data</span>
        </div>
        <div className="overflow-x-auto">
          <table className="dq-table">
            <thead>
              <tr><th>Campaign</th><th>Type</th><th>Discount</th><th>Orders</th><th>Revenue</th><th>Conversion</th><th>Uplift</th><th>ROI</th><th>Status</th></tr>
            </thead>
            <tbody>
              {PROMOTIONS.map((p) => (
                <tr key={p.id}>
                  <td className="font-semibold text-ink-900">{p.campaign}</td>
                  <td>{p.type}</td>
                  <td>{p.discount > 0 ? `${p.discount}%` : 'Points'}</td>
                  <td>{fmtNum(p.orders)}</td>
                  <td className="font-semibold">{fmtMoney(p.revenue)}</td>
                  <td>{fmtPct(p.conversion)}</td>
                  <td className="font-semibold text-emerald-600">+{p.uplift}%</td>
                  <td><span className={`badge ${p.roi >= 3 ? 'badge-green' : p.roi >= 2.6 ? 'badge-amber' : 'badge-red'}`}>{p.roi}×</span></td>
                  <td><StatusBadge status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
