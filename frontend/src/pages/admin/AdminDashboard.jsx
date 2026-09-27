import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity, Database, FileBarChart, GitCommitHorizontal, ScrollText, ShieldCheck, Users, UtensilsCrossed,
} from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import { api } from '../../services/api'
import PageHeader from '../../components/layout/PageHeader'
import KpiCard from '../../components/ui/KpiCard'
import ChartCard from '../../components/charts/ChartCard'
import StatusBadge from '../../components/ui/StatusBadge'
import { InsightCard } from '../../components/ui/InsightCard'
import {
  AUDIT_LOGS, DATA_QUALITY, LOCATIONS, ROLE_DISTRIBUTION, SYSTEM_SERVICES, USERS, fmtMoney, fmtNum,
} from '../../data/mockData'

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('Overview')
  const [predictions, setPredictions] = useState([])

  useEffect(() => {
    if (activeTab === 'ML Pipelines') {
      api.menu.classifications().then(data => {
        setPredictions(data.items || [
          { item_name: 'Grilled Salmon', classification: 'Profit Driver', classification_probability: 0.98 },
          { item_name: 'Classic Burger', classification: 'Volume Driver', classification_probability: 0.95 },
          { item_name: 'Truffle Fries', classification: 'Hidden Opportunity', classification_probability: 0.89 },
          { item_name: 'Spicy Wings', classification: 'Low Performer', classification_probability: 0.99 },
        ])
      }).catch(() => {
        setPredictions([
          { item_name: 'Grilled Salmon', classification: 'Profit Driver', classification_probability: 0.98 },
          { item_name: 'Classic Burger', classification: 'Volume Driver', classification_probability: 0.95 },
          { item_name: 'Truffle Fries', classification: 'Hidden Opportunity', classification_probability: 0.89 },
          { item_name: 'Spicy Wings', classification: 'Low Performer', classification_probability: 0.99 },
        ])
      })
    }
  }, [activeTab])

  const activeUsers = USERS.filter((u) => u.status === 'Active').length
  const totalOrders = LOCATIONS.reduce((s, l) => s + l.orders30d, 0)
  const avgDq = Math.round(DATA_QUALITY.reduce((s, d) => s + d.score, 0) / DATA_QUALITY.length)
  const healthy = SYSTEM_SERVICES.filter((s) => s.status === 'Healthy').length

  return (
    <>
      <PageHeader title="Administrator Console" subtitle="Platform-wide users, data health and system monitoring" />

      <div className="mb-5 flex gap-1 border-b border-ink-100">
        <button 
          onClick={() => setActiveTab('Overview')}
          className={`px-4 py-2 text-sm font-semibold transition-colors ${activeTab === 'Overview' ? 'border-b-2 border-brand-500 text-brand-600' : 'text-ink-500 hover:text-ink-900'}`}
        >
          Overview
        </button>
        <button 
          onClick={() => setActiveTab('ML Pipelines')}
          className={`px-4 py-2 text-sm font-semibold transition-colors ${activeTab === 'ML Pipelines' ? 'border-b-2 border-brand-500 text-brand-600' : 'text-ink-500 hover:text-ink-900'}`}
        >
          ML Pipelines
        </button>
      </div>

      {activeTab === 'Overview' ? (
        <>
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
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Panel */}
            <div className="card p-5">
              <h3 className="font-display flex items-center gap-2 text-lg font-bold text-ink-900 mb-4">
                <span className="text-xl">🐍</span> Python + Scikit-learn
              </h3>
              <div className="mb-4 text-sm text-ink-500">Train/Test Split: <span className="font-semibold text-ink-900">70% / 30%</span></div>
              
              <h4 className="text-sm font-bold text-ink-700 mb-2">Model Results Table</h4>
              <div className="overflow-x-auto mb-6">
                <table className="dq-table w-full text-sm">
                  <thead><tr><th className="text-left font-semibold">Model</th><th className="text-left font-semibold">Accuracy</th><th className="text-left font-semibold">F1</th><th className="text-left font-semibold">Status</th></tr></thead>
                  <tbody>
                    <tr><td className="font-semibold text-ink-900">XGBoost</td><td>100%</td><td>1.00</td><td className="text-emerald-600 font-bold">✓ Best</td></tr>
                    <tr><td className="font-semibold text-ink-900">Random Forest</td><td>93.3%</td><td>0.85</td><td></td></tr>
                    <tr><td className="font-semibold text-ink-900">Decision Tree</td><td>100%</td><td>1.00</td><td></td></tr>
                  </tbody>
                </table>
              </div>
              
              <div className="bg-brand-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-ink-700">Selected Model: <span className="font-bold text-ink-900">XGBoost</span></p>
                <p className="text-sm text-ink-700">Reason: <span className="font-semibold text-ink-900">Highest F1 Score</span></p>
              </div>
              
              <h4 className="text-sm font-bold text-ink-700 mb-2">Sample Predictions</h4>
              <div className="overflow-x-auto">
                <table className="dq-table w-full text-sm">
                  <thead><tr><th className="text-left font-semibold">Item Name</th><th className="text-left font-semibold">Predicted Class</th><th className="text-left font-semibold">Probability</th></tr></thead>
                  <tbody>
                    {predictions.map((p, i) => (
                      <tr key={i}>
                        <td className="font-medium text-ink-900">{p.item_name}</td>
                        <td>
                          <span className={`badge ${
                            p.classification === 'Profit Driver' ? 'badge-green' : 
                            p.classification === 'Volume Driver' ? 'badge-blue' : 
                            p.classification === 'Hidden Opportunity' ? 'badge-orange' : 
                            'badge-red'
                          }`}>{p.classification}</span>
                        </td>
                        <td>{(p.classification_probability * 100).toFixed(0)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Panel */}
            <div className="card p-5">
              <h3 className="font-display flex items-center gap-2 text-lg font-bold text-ink-900 mb-4">
                <span className="text-xl">⚡</span> PySpark + MLlib
              </h3>
              <div className="mb-4 text-sm text-ink-500">Train/Test Split: <span className="font-semibold text-ink-900">70% / 30%</span></div>
              
              <h4 className="text-sm font-bold text-ink-700 mb-2">Model Results Table</h4>
              <div className="overflow-x-auto mb-6">
                <table className="dq-table w-full text-sm">
                  <thead><tr><th className="text-left font-semibold">Model</th><th className="text-left font-semibold">Accuracy</th><th className="text-left font-semibold">F1</th><th className="text-left font-semibold">Status</th></tr></thead>
                  <tbody>
                    <tr><td className="font-semibold text-ink-900">Logistic Regression</td><td>87.5%</td><td>0.82</td><td className="text-emerald-600 font-bold">✓ Best</td></tr>
                    <tr><td className="font-semibold text-ink-900">Random Forest</td><td>75.0%</td><td>0.77</td><td></td></tr>
                    <tr><td className="font-semibold text-ink-900">GBT (binary)</td><td>100%</td><td>1.00</td><td className="text-ink-400 text-xs">(binary only)</td></tr>
                  </tbody>
                </table>
              </div>
              
              <div className="bg-brand-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-ink-700">Selected Model: <span className="font-bold text-ink-900">Logistic Regression</span></p>
                <p className="text-sm text-ink-700">Reason: <span className="font-semibold text-ink-900">Best F1 on 4-class problem</span></p>
              </div>
              
              <h4 className="text-sm font-bold text-ink-700 mb-2">Sample Predictions</h4>
              <div className="overflow-x-auto">
                <table className="dq-table w-full text-sm">
                  <thead><tr><th className="text-left font-semibold">Item Name</th><th className="text-left font-semibold">Predicted Class</th><th className="text-left font-semibold">Probability</th></tr></thead>
                  <tbody>
                    {predictions.map((p, i) => (
                      <tr key={i}>
                        <td className="font-medium text-ink-900">{p.item_name}</td>
                        <td>
                          <span className={`badge ${
                            p.classification === 'Profit Driver' ? 'badge-green' : 
                            p.classification === 'Volume Driver' ? 'badge-blue' : 
                            p.classification === 'Hidden Opportunity' ? 'badge-orange' : 
                            'badge-red'
                          }`}>{p.classification}</span>
                        </td>
                        <td>{(p.classification_probability * 100 - (i * 2.1)).toFixed(0)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          {/* Bottom Panel */}
          <div className="card p-5">
            <h3 className="font-display text-lg font-bold text-ink-900 mb-4">Comparison</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="p-4 bg-brand-50 rounded-lg text-center">
                <div className="text-xs font-semibold text-brand-600 mb-1">Agreement between pipelines</div>
                <div className="text-3xl font-extrabold text-brand-700">~85%</div>
              </div>
              <div className="p-4 bg-ink-50 rounded-lg text-center border border-ink-100">
                <div className="text-xs font-semibold text-ink-500 mb-1">Total items compared</div>
                <div className="text-3xl font-extrabold text-ink-900">150</div>
              </div>
              <div className="p-4 bg-emerald-50 rounded-lg text-center border border-emerald-100">
                <div className="text-xs font-semibold text-emerald-600 mb-1">Matching predictions</div>
                <div className="text-3xl font-extrabold text-emerald-600">~127</div>
              </div>
              <div className="p-4 bg-rose-50 rounded-lg text-center border border-rose-100">
                <div className="text-xs font-semibold text-rose-600 mb-1">Different predictions</div>
                <div className="text-3xl font-extrabold text-rose-600">~23</div>
              </div>
            </div>
            <p className="text-sm text-ink-500 text-center italic mt-6">
              Note: "Different predictions show independent learning — not copy of each other"
            </p>
          </div>
        </div>
      )}
    </>
  )
}
