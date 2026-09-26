import { Activity, Cpu, HardDrive, MemoryStick, Wifi } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts'
import PageHeader from '../../components/layout/PageHeader'
import ChartCard from '../../components/charts/ChartCard'
import StatusBadge from '../../components/ui/StatusBadge'
import { SYSTEM_SERVICES } from '../../data/mockData'

const LATENCY_SERIES = Array.from({ length: 24 }, (_, h) => ({
  time: `${String(h).padStart(2, '0')}:00`,
  api: 70 + Math.round(24 * Math.sin(h / 3.4) + 12 * Math.cos(h / 2.1)) + (h === 14 ? 55 : 0),
  spark: 1500 + Math.round(420 * Math.sin(h / 4) + 180 * Math.cos(h / 2.6)) + (h === 14 ? 900 : 0),
}))

export default function AdminSystemMonitoring() {
  return (
    <>
      <PageHeader title="System Monitoring" subtitle="Service health, latency and resource utilization" demo />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          { icon: Cpu, label: 'Cluster CPU', value: '64%', tone: 'amber' },
          { icon: MemoryStick, label: 'Memory', value: '71%', tone: 'amber' },
          { icon: HardDrive, label: 'Storage', value: '52%', tone: 'green' },
          { icon: Wifi, label: 'Network I/O', value: '38%', tone: 'green' },
        ].map((r, i) => (
          <div key={r.label} className="card card-hover anim-fade-up p-4" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-center justify-between">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-500"><r.icon size={17} /></div>
              <span className={`badge badge-${r.tone}`}>{r.tone === 'green' ? 'Normal' : 'Elevated'}</span>
            </div>
            <p className="font-display mt-3 text-2xl font-extrabold text-ink-900">{r.value}</p>
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-ink-400">{r.label}</p>
            <div className="meter mt-2"><span style={{ width: r.value, background: r.tone === 'green' ? 'linear-gradient(90deg,#34d399,#0d9459)' : 'linear-gradient(90deg,#fbbf24,#d97706)' }} /></div>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <ChartCard title="API Latency (24h)" subtitle="p95 response time, ms">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={LATENCY_SERIES}>
                <defs>
                  <linearGradient id="latApi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f95d0b" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#f95d0b" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
                <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#878ba7' }} axisLine={false} tickLine={false} interval={3} />
                <YAxis tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} />
                <RTooltip />
                <Area type="monotone" dataKey="api" stroke="#f95d0b" strokeWidth={2.2} fill="url(#latApi)" name="API p95 (ms)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Spark Cluster Latency (24h)" subtitle="Job completion time, ms">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={LATENCY_SERIES}>
                <defs>
                  <linearGradient id="latSpark" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1d4ed8" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
                <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#878ba7' }} axisLine={false} tickLine={false} interval={3} />
                <YAxis tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} />
                <RTooltip />
                <Area type="monotone" dataKey="spark" stroke="#1d4ed8" strokeWidth={2.2} fill="url(#latSpark)" name="Spark job (ms)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="card mt-5 p-4 sm:p-5">
        <h3 className="font-display mb-4 text-sm font-bold text-ink-900">Service Health</h3>
        <div className="overflow-x-auto">
          <table className="dq-table">
            <thead><tr><th>Service</th><th>Status</th><th>Latency</th><th>Uptime (30d)</th><th>Load</th></tr></thead>
            <tbody>
              {SYSTEM_SERVICES.map((s) => (
                <tr key={s.name}>
                  <td className="font-semibold text-ink-900">{s.name}</td>
                  <td><StatusBadge status={s.status} /></td>
                  <td>{s.latency}</td>
                  <td className="text-ink-500">{s.uptime}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="meter w-24"><span style={{ width: `${s.load}%`, background: s.load > 75 ? 'linear-gradient(90deg,#fb7185,#e11d48)' : 'linear-gradient(90deg,#34d399,#0d9459)' }} /></div>
                      <span className="text-xs font-semibold">{s.load}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 flex items-center gap-2 text-xs text-ink-400">
          <Activity size={13} className="text-emerald-500" /> Mock telemetry — in production these panels read from the platform observability stack.
        </p>
      </div>
    </>
  )
}
