import { useMemo, useState } from 'react'
import { Download, Search } from 'lucide-react'
import PageHeader from '../../components/layout/PageHeader'
import DataTable from '../../components/ui/DataTable'
import { downloadCSV } from '../../utils/helpers'

const AUDIT_LOGS = [
  { time: '2026-09-27 14:23:11', user: 'admin@dineiq.demo', action: 'Login', details: 'Admin logged in successfully', type: 'auth' },
  { time: '2026-09-27 14:20:05', user: 'manager@dineiq.demo', action: 'View Dashboard', details: 'Accessed Manager Dashboard', type: 'view' },
  { time: '2026-09-27 13:45:22', user: 'admin@dineiq.demo', action: 'Add User', details: 'Created user: inventory@dineiq.demo', type: 'crud' },
  { time: '2026-09-27 13:30:00', user: 'system', action: 'Spark Pipeline', details: 'MLlib training completed - F1: 0.82', type: 'ml' },
  { time: '2026-09-27 12:15:44', user: 'system', action: 'Data Quality', details: '1,289,177 records passed quality checks', type: 'data' },
  { time: '2026-09-27 11:00:00', user: 'system', action: 'Ingestion', details: '1,305,677 records ingested via Spark', type: 'data' },
  { time: '2026-09-26 18:30:00', user: 'admin@dineiq.demo', action: 'Deploy', details: 'Production deployment to VPS 187.127.98.233', type: 'system' },
  { time: '2026-09-26 16:00:00', user: 'system', action: 'ML Training', details: 'XGBoost trained - F1: 1.00, Accuracy: 100%', type: 'ml' },
  { time: '2026-09-26 14:00:00', user: 'system', action: 'Feature Engineering', details: '30 features extracted for 150 menu items', type: 'data' },
  { time: '2026-09-26 12:00:00', user: 'system', action: 'Data Cleaning', details: '13,500 records removed, 3,000 quarantined', type: 'data' },
]

const TYPE_BADGE = {
  auth: 'badge-blue',
  view: 'badge-gray',
  crud: 'badge-orange',
  ml: 'badge-violet',
  data: 'badge-green',
  system: 'badge-gray',
}

const TYPES = ['auth', 'view', 'crud', 'ml', 'data', 'system']

export default function AdminAuditLogs() {
  const [filters, setFilters] = useState({ type: 'all', q: '' })

  const rows = useMemo(
    () =>
      AUDIT_LOGS.filter(
        (l) =>
          (filters.type === 'all' || l.type === filters.type) &&
          (filters.q === '' || `${l.user} ${l.action} ${l.details}`.toLowerCase().includes(filters.q.toLowerCase())),
      ),
    [filters],
  )

  const columns = [
    { key: 'time', header: 'Time', render: (r) => <span className="text-ink-400">{r.time}</span> },
    { key: 'user', header: 'User', render: (r) => <span className="font-semibold text-ink-900">{r.user}</span> },
    { key: 'action', header: 'Action', render: (r) => r.action },
    { key: 'details', header: 'Details', render: (r) => <span className="text-ink-500">{r.details}</span> },
    { key: 'type', header: 'Type', render: (r) => <span className={`badge ${TYPE_BADGE[r.type] ?? 'badge-gray'}`}>{r.type}</span> },
  ]

  const exportCsv = () => {
    downloadCSV(rows, 'dineiq-audit-logs.csv')
  }

  return (
    <>
      <PageHeader
        title="Audit Logs"
        subtitle="Immutable trail of platform events"
        actions={<button className="btn btn-ghost !px-4 !py-2.5 text-xs" onClick={exportCsv}><Download size={14} /> Export CSV</button>}
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button className={`chip ${filters.type === 'all' ? 'chip-active' : ''}`} onClick={() => setFilters((f) => ({ ...f, type: 'all' }))}>All</button>
        {TYPES.map((t) => (
          <button key={t} className={`chip ${filters.type === t ? 'chip-active' : ''}`} onClick={() => setFilters((f) => ({ ...f, type: t }))}>{t}</button>
        ))}
        <div className="relative ml-auto">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
          <input className="input !w-56 !rounded-xl !py-2 !pl-9 text-xs" placeholder="Search events…" value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} />
        </div>
      </div>
      <div className="card p-2 sm:p-4">
        <DataTable columns={columns} rows={rows} rowKey={(r) => `${r.time}-${r.action}`} />
      </div>
    </>
  )
}
