import { useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts'
import PageHeader from '../../components/layout/PageHeader'
import ChartCard from '../../components/charts/ChartCard'
import StatusBadge from '../../components/ui/StatusBadge'
import { api } from '../../services/api'
import { SYSTEM_SERVICES } from '../../data/mockData'

const LATENCY_SERIES = Array.from({ length: 24 }, (_, h) => ({
  time: `${String(h).padStart(2, '0')}:00`,
  api: 70 + Math.round(24 * Math.sin(h / 3.4) + 12 * Math.cos(h / 2.1)) + (h === 14 ? 55 : 0),
  spark: 1500 + Math.round(420 * Math.sin(h / 4) + 180 * Math.cos(h / 2.6)) + (h === 14 ? 900 : 0),
}))

function StatusCard({ title, status, rows, delay }) {
  return (
    <div className="card card-hover anim-fade-up p-4" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-ink-400">{title}</p>
        <span className="badge badge-green flex items-center gap-1"><CheckCircle2 size={12} /> {status}</span>
      </div>
      <div className="mt-3 space-y-1">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between text-xs">
            <span className="text-ink-400">{label}</span>
            <span className="font-semibold text-ink-900">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AdminSystemMonitoring() {
  const [userCount, setUserCount] = useState(null)

  useEffect(() => {
    api.auth.users().then((data) => setUserCount(data.length)).catch(() => setUserCount(null))
  }, [])

  const cards = [
    {
      title: 'Server Status', status: 'Online', rows: [
        ['VPS IP', '187.127.98.233'],
        ['OS', 'Ubuntu 24.04 LTS'],
        ['Uptime', '95 days 22 hours'],
      ],
    },
    {
      title: 'API Status', status: 'Running', rows: [
        ['Port', '8000'],
        ['Framework', 'FastAPI'],
        ['Response time', '45ms'],
      ],
    },
    {
      title: 'Database Status', status: 'Connected', rows: [
        ['Type', 'PostgreSQL 16'],
        ['Host', 'localhost:5432'],
        ['Database', 'dineiq_analytics'],
        ['Total Users', userCount ?? '—'],
      ],
    },
    {
      title: 'Spark Status', status: 'Installed', rows: [
        ['Version', '4.2.0'],
        ['Java', 'OpenJDK 17'],
        ['Last Run', 'Today'],
      ],
    },
    {
      title: 'Nginx Status', status: 'Running', rows: [
        ['Port', '80'],
        ['Serving', 'React Build'],
      ],
    },
    {
      title: 'ML Models Status', status: 'Ready', rows: [
        ['Python Models', '3 trained'],
        ['Spark Models', '3 trained'],
        ['Best Python', 'XGBoost F1:1.00'],
        ['Best Spark', 'LogReg F1:0.82'],
      ],
    },
  ]

  return (
    <>
      <PageHeader title="System Monitoring" subtitle="Service health, latency and resource utilization" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c, i) => (
          <StatusCard key={c.title} title={c.title} status={c.status} rows={c.rows} delay={i * 60} />
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
      </div>
    </>
  )
}
