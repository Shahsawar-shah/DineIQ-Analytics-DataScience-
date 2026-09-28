import { useEffect, useState } from 'react'
import { Download, RefreshCw, Search } from 'lucide-react'
import { api } from '../../services/api'
import PageHeader from '../../components/layout/PageHeader'
import DataTable from '../../components/ui/DataTable'
import LoadingState, { ErrorState } from '../../components/ui/LoadingState'
import { downloadCSV, fmtNum } from '../../utils/helpers'

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
  const [query, setQuery] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [state, setState] = useState({ loading: true, error: null, data: null })

  // debounce the search box so every keystroke is not a request
  useEffect(() => {
    const t = setTimeout(() => setQuery(filters.q.trim()), 350)
    return () => clearTimeout(t)
  }, [filters.q])

  useEffect(() => {
    setState((s) => ({ ...s, loading: true }))
    api.admin.auditLogs({ limit: 500, eventType: filters.type === 'all' ? undefined : filters.type, q: query || undefined })
      .then((data) => setState({ loading: false, error: null, data }))
      .catch((err) => setState({ loading: false, error: err.message, data: null }))
  }, [filters.type, query, refresh])

  const columns = [
    { key: 'time', header: 'Time', render: (r) => <span className="whitespace-nowrap text-ink-400">{r.created_at?.replace('T', ' ').slice(0, 19)}</span> },
    { key: 'user', header: 'User', render: (r) => <span className="font-semibold text-ink-900">{r.user_email}</span> },
    { key: 'role', header: 'Role', render: (r) => <span className="text-xs text-ink-500">{r.user_role ?? '—'}</span> },
    { key: 'action', header: 'Action', render: (r) => r.action },
    { key: 'endpoint', header: 'Endpoint', render: (r) => <span className="font-mono text-[0.68rem] text-ink-500">{r.method} {r.endpoint}{r.details ? `?${r.details}` : ''}</span> },
    { key: 'result', header: 'Result', render: (r) => <span className={`badge ${r.result === 'success' ? 'badge-green' : 'badge-red'}`}>{r.status_code} {r.result}</span> },
    { key: 'ms', header: 'Duration', align: 'right', render: (r) => (r.duration_ms === null ? '—' : `${r.duration_ms} ms`) },
    { key: 'type', header: 'Type', render: (r) => <span className={`badge ${TYPE_BADGE[r.event_type] ?? 'badge-gray'}`}>{r.event_type}</span> },
  ]

  const rows = state.data?.logs ?? []

  return (
    <>
      <PageHeader
        title="Audit Logs"
        subtitle={state.data ? `${fmtNum(state.data.total)} events recorded: every API call, login, prediction and export` : 'Every API call, login, prediction and export'}
        actions={
          <div className="flex gap-2">
            <button className="btn btn-ghost !px-4 !py-2.5 text-xs" onClick={() => setRefresh((n) => n + 1)}><RefreshCw size={14} /> Refresh</button>
            <button className="btn btn-ghost !px-4 !py-2.5 text-xs" onClick={() => downloadCSV(rows, 'dineiq-audit-logs.csv')}><Download size={14} /> Export CSV</button>
          </div>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button className={`chip ${filters.type === 'all' ? 'chip-active' : ''}`} onClick={() => setFilters((f) => ({ ...f, type: 'all' }))}>All</button>
        {TYPES.map((t) => (
          <button key={t} className={`chip ${filters.type === t ? 'chip-active' : ''}`} onClick={() => setFilters((f) => ({ ...f, type: t }))}>
            {t}{state.data?.by_type?.[t] ? ` (${fmtNum(state.data.by_type[t])})` : ''}
          </button>
        ))}
        <div className="relative ml-auto">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
          <input className="input !w-56 !rounded-xl !py-2 !pl-9 text-xs" placeholder="Search user, action, endpoint…" value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} />
        </div>
      </div>
      {state.error ? <ErrorState message={state.error} /> : !state.data ? <LoadingState /> : (
        <div className="card p-2 sm:p-4">
          <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} maxHeight={620} emptyMessage="No audit events match these filters." />
        </div>
      )}
    </>
  )
}
