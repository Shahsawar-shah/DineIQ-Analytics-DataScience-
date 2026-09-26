import { useMemo, useState } from 'react'
import { Download, Search } from 'lucide-react'
import PageHeader from '../../components/layout/PageHeader'
import DataTable from '../../components/ui/DataTable'
import StatusBadge from '../../components/ui/StatusBadge'
import FilterBar from '../../components/ui/FilterBar'
import { AUDIT_LOGS } from '../../data/mockData'

export default function AdminAuditLogs() {
  const [filters, setFilters] = useState({ severity: 'all', q: '' })
  const rows = useMemo(
    () =>
      AUDIT_LOGS.filter(
        (l) =>
          (filters.severity === 'all' || l.severity === filters.severity) &&
          (filters.q === '' || `${l.actor} ${l.action} ${l.entity}`.toLowerCase().includes(filters.q.toLowerCase())),
      ),
    [filters],
  )

  const columns = [
    { key: 'id', header: 'Event ID', render: (r) => <span className="text-ink-400">{r.id}</span> },
    { key: 'timestamp', header: 'Timestamp', render: (r) => r.timestamp },
    { key: 'actor', header: 'Actor', render: (r) => <span className="font-semibold text-ink-900">{r.actor}</span> },
    { key: 'action', header: 'Action', render: (r) => r.action },
    { key: 'entity', header: 'Entity', render: (r) => <span className="text-ink-500">{r.entity}</span> },
    {
      key: 'severity',
      header: 'Severity',
      render: (r) => <StatusBadge status={r.severity === 'Info' ? 'Scheduled' : r.severity === 'Warning' ? 'Warning' : 'Critical'} />,
    },
  ]

  const exportCsv = () => {
    const head = 'id,timestamp,actor,action,entity,severity'
    const body = rows.map((r) => [r.id, r.timestamp, r.actor, `"${r.action}"`, `"${r.entity}"`, r.severity].join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([`${head}\n${body}`], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'dineiq-audit-logs.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <PageHeader
        title="Audit Logs"
        subtitle="Immutable trail of platform events"
        demo
        actions={<button className="btn btn-ghost !px-4 !py-2.5 text-xs" onClick={exportCsv}><Download size={14} /> Export CSV</button>}
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterBar
          filters={[{ key: 'severity', label: 'Severity', options: ['Info', 'Warning', 'Critical'].map((s) => ({ label: s, value: s })) }]}
          values={filters}
          onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
          onReset={() => setFilters({ severity: 'all', q: '' })}
        />
        <div className="relative ml-auto">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
          <input className="input !w-56 !rounded-xl !py-2 !pl-9 text-xs" placeholder="Search events…" value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} />
        </div>
      </div>
      <div className="card p-2 sm:p-4">
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} />
      </div>
    </>
  )
}
