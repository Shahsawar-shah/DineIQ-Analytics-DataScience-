import { Link } from 'react-router-dom'
import {
  Activity, Database, FileBarChart, GitCommitHorizontal, ScrollText, ShieldCheck, Users, UtensilsCrossed,
} from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import PageHeader from '@/components/layout/PageHeader'
import KpiCard from '@/components/ui/KpiCard'
import ChartCard from '@/components/charts/ChartCard'
import StatusBadge from '@/components/ui/StatusBadge'
import { InsightCard } from '@/components/ui/InsightCard'
import {
  AUDIT_LOGS, DATA_QUALITY, LOCATIONS, ROLE_DISTRIBUTION, SYSTEM_SERVICES, USERS, fmtMoney, fmtNum,
} from '@/data/mockData'

export default function AdminDashboard() {
  const activeUsers = USERS.filter((u) => u.status === 'Active').length
  const totalOrders = LOCATIONS.reduce((s, l) => s + l.orders30d, 0)
  const avgDq = Math.round(DATA_QUALITY.reduce((s, d) => s + d.score, 0) / DATA_QUALITY.length)
  const healthy = SYSTEM_SERVICES.filter((s) => s.status === 'Healthy').length

  return (
    <>
      <PageHeader title="Administrator Console" subtitle="Platform-wide users, data health and system monitoring" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <KpiCard label="Total Users" value={fmtNum(879)} delta={4.2} icon={Users} accent="#f95d0b" />
        <KpiCard label="Active Users" value={fmtNum(861)} delta={2.8} icon={Activity} accent="#0d9459" delay={60} />
        <KpiCard label="Locations" value={String(LOCATIONS.length)} icon={UtensilsCrossed} accent="#1d4ed8" delay={120} />
        <KpiCard label="Orders (30d)" value={fmtNum(totalOrders)} delta={6.1} icon={GitCommitHorizontal} accent="#6938ef" delay={180} />
        <KpiCard label="Data Quality" value={`${avgDq}%`} delta={1.2} icon={ShieldCheck} accent="#f9a825" delay={240} />
        <KpiCard label="System Status" value={`${healthy}/${SYSTEM_SERVICES.length}`} footer={<span className="badge badge-green mt-1">All core services up</span>} icon={Database} accent="#0d9459" delay={300} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <ChartCard title="User Management" subtitle="Newest accounts" className="xl:col-span-2"
          actions={<Link to="/admin/users" className="text-xs font-bold text-brand-600 hover:underline">Manage users</Link>}>
          <div className="overflow-x-auto">
            <table className="dq-table">
              <thead><tr><th>User</th><th>Role</th><th>Location</th><th>Status</th><th>Last login</th></tr></thead>
              <tbody>
                {USERS.slice(0, 6).map((u) => (
                  <tr key={u.id}>
                    <td>
                      <p className="font-semibold text-ink-900">{u.name}</p>
                      <p className="text-[0.68rem] text-ink-400">{u.email}</p>
                    </td>
                    <td>{u.role}</td>
                    <td>{u.location}</td>
                    <td><StatusBadge status={u.status} /></td>
                    <td className="text-ink-400">{u.lastLogin}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>

        <ChartCard title="Role Distribution" subtitle="Platform-wide accounts">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={ROLE_DISTRIBUTION} dataKey="value" nameKey="name" innerRadius={50} outerRadius={75} paddingAngle={4} strokeWidth={0}>
                  {ROLE_DISTRIBUTION.map((r) => <Cell key={r.name} fill={r.color} />)}
                </Pie>
                <RTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5">
            {ROLE_DISTRIBUTION.map((r) => (
              <div key={r.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-ink-500">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
                  {r.name}
                </span>
                <span className="font-bold text-ink-900">{fmtNum(r.value)}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <ChartCard title="Data Quality Dimensions" subtitle="Composite score by dimension">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DATA_QUALITY}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
                <XAxis dataKey="dimension" tick={{ fontSize: 9, fill: '#878ba7' }} axisLine={false} tickLine={false} interval={0} />
                <YAxis domain={[80, 100]} tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} />
                <RTooltip />
                <Bar dataKey="score" radius={[6, 6, 0, 0]} fill="#f95d0b" name="Score" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="System Monitoring" subtitle="Service health at a glance"
          actions={<Link to="/admin/system-monitoring" className="text-xs font-bold text-brand-600 hover:underline">Details</Link>}>
          <div className="space-y-2.5">
            {SYSTEM_SERVICES.map((s) => (
              <div key={s.name} className="flex items-center gap-3 rounded-xl border border-ink-100 px-3.5 py-2.5">
                <span className={`live-dot h-2 w-2 rounded-full ${s.status === 'Healthy' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span className="flex-1 truncate text-xs font-semibold text-ink-700">{s.name}</span>
                <span className="text-[0.68rem] text-ink-400">{s.latency}</span>
                <StatusBadge status={s.status} />
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Recent Activity" subtitle="Latest platform events"
          actions={<Link to="/admin/audit-logs" className="text-xs font-bold text-brand-600 hover:underline">Audit logs</Link>}>
          <div className="space-y-0.5">
            {AUDIT_LOGS.slice(0, 6).map((l) => (
              <div key={l.id} className="flex gap-3 rounded-xl px-2 py-2.5 transition hover:bg-brand-50/60">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${l.severity === 'Critical' ? 'bg-rose-500' : l.severity === 'Warning' ? 'bg-amber-500' : 'bg-sky-400'}`} />
                <div className="min-w-0">
                  <p className="text-xs font-medium leading-snug text-ink-700">{l.action} — <span className="text-ink-400">{l.entity}</span></p>
                  <p className="text-[0.65rem] text-ink-300">{l.actor} · {l.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InsightCard tone="danger" title="ML Scoring Service degraded" text="Latency 3.4s (threshold 2s). Auto-scaling triggered; investigate model cache pressure." />
        <InsightCard tone="warn" title="Uptown Grill in maintenance" text="Location data feed paused since Sep 20 — reports exclude its live data." delay={60} />
        <InsightCard tone="info" title="Weekly data re-ingestion" text="Next scheduled partition rebuild: Sep 28, 02:00 UTC." delay={120} />
        <InsightCard tone="success" title="Data quality improved" text="Timeliness score +2.1 pts after the delivery-platform connector fix." delay={180} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <ChartCard title="Locations Overview" subtitle="Orders and revenue (30 days)">
          <div className="overflow-x-auto">
            <table className="dq-table">
              <thead><tr><th>Location</th><th>City</th><th>Orders</th><th>Revenue</th><th>DQ Score</th><th>Status</th></tr></thead>
              <tbody>
                {LOCATIONS.map((l) => (
                  <tr key={l.id}>
                    <td className="font-semibold text-ink-900">{l.name}</td>
                    <td>{l.city}</td>
                    <td>{fmtNum(l.orders30d)}</td>
                    <td className="font-semibold">{fmtMoney(l.revenue30d)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="meter w-16"><span style={{ width: `${l.dataQuality}%`, background: 'linear-gradient(90deg,#34d399,#0d9459)' }} /></div>
                        {l.dataQuality}%
                      </div>
                    </td>
                    <td><StatusBadge status={l.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>

        <ChartCard title="Quick Reports" subtitle="Frequently generated exports"
          actions={<Link to="/admin/reports" className="text-xs font-bold text-brand-600 hover:underline">All reports</Link>}>
          <div className="grid gap-3 sm:grid-cols-2">
            {['User Activity Report', 'Data Quality Summary', 'System Uptime Report', 'Audit Trail Export'].map((r, i) => (
              <div key={r} className="group flex items-center gap-3 rounded-xl border border-ink-100 p-3.5 transition hover:border-brand-200 hover:shadow-md">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-500">
                  <FileBarChart size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-ink-900">{r}</p>
                  <p className="text-[0.65rem] text-ink-400">Last run: Sep {25 - i}, 2026</p>
                </div>
                <button className="btn btn-ghost !rounded-lg !px-3 !py-1.5 text-[0.68rem] opacity-0 transition group-hover:opacity-100">Run</button>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </>
  )
}
