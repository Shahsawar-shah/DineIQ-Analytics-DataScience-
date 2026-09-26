import { useMemo, useState } from 'react'
import { Download, Pencil, Search, UserPlus } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import DataTable, { type Column } from '@/components/ui/DataTable'
import StatusBadge from '@/components/ui/StatusBadge'
import FilterBar from '@/components/ui/FilterBar'
import Modal from '@/components/ui/Modal'
import { USERS, LOCATIONS } from '@/data/mockData'
import { ROLES, type UserRow } from '@/types'

export default function AdminUsers() {
  const [filters, setFilters] = useState<Record<string, string>>({ role: 'all', status: 'all', q: '' })
  const [editing, setEditing] = useState<UserRow | null>(null)

  const rows = useMemo(
    () =>
      USERS.filter(
        (u) =>
          (filters.role === 'all' || u.role === filters.role) &&
          (filters.status === 'all' || u.status === filters.status) &&
          (filters.q === '' || `${u.name} ${u.email}`.toLowerCase().includes(filters.q.toLowerCase())),
      ),
    [filters],
  )

  const columns: Column<UserRow>[] = [
    { key: 'id', header: 'ID', render: (r) => <span className="text-ink-400">{r.id}</span> },
    {
      key: 'name',
      header: 'User',
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-ink-600 to-ink-800 text-[0.65rem] font-bold text-white">
            {r.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
          </span>
          <div>
            <p className="font-semibold text-ink-900">{r.name}</p>
            <p className="text-[0.68rem] text-ink-400">{r.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'role', header: 'Role', render: (r) => <span className="badge badge-orange">{r.role}</span> },
    { key: 'location', header: 'Location', render: (r) => r.location },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'lastLogin', header: 'Last Login', render: (r) => <span className="text-ink-400">{r.lastLogin}</span> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => (
        <button className="btn btn-ghost !rounded-lg !px-3 !py-1.5 text-xs" onClick={() => setEditing(r)}>
          <Pencil size={13} /> Edit
        </button>
      ),
    },
  ]

  const exportCsv = () => {
    const head = 'id,name,email,role,location,status,lastLogin'
    const body = rows.map((r) => [r.id, r.name, r.email, r.role, r.location, r.status, r.lastLogin].join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([`${head}\n${body}`], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'dineiq-users.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <PageHeader
        title="User Management"
        subtitle="All accounts across the DineIQ platform"
        demo
        actions={
          <>
            <button className="btn btn-ghost !px-4 !py-2.5 text-xs" onClick={exportCsv}><Download size={14} /> Export CSV</button>
            <button className="btn btn-primary !px-4 !py-2.5 text-xs"><UserPlus size={14} /> Add user</button>
          </>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterBar
          filters={[
            { key: 'role', label: 'Role', options: ROLES.map((r) => ({ label: r, value: r })) },
            { key: 'status', label: 'Status', options: ['Active', 'Inactive', 'Suspended'].map((s) => ({ label: s, value: s })) },
          ]}
          values={filters}
          onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
          onReset={() => setFilters({ role: 'all', status: 'all', q: '' })}
        />
        <div className="relative ml-auto">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
          <input className="input !w-56 !rounded-xl !py-2 !pl-9 text-xs" placeholder="Search users…" value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} />
        </div>
      </div>
      <div className="card p-2 sm:p-4">
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} />
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Edit user — ${editing?.name ?? ''}`}>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label">Role</label>
              <select className="input" defaultValue={editing?.role}>
                {ROLES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div><label className="label">Location</label>
              <select className="input" defaultValue={editing?.location}>
                <option>All Locations</option>
                {LOCATIONS.map((l) => <option key={l.id}>{l.name}</option>)}
                <option>—</option>
              </select>
            </div>
          </div>
          <div><label className="label">Status</label>
            <select className="input" defaultValue={editing?.status}>
              <option>Active</option><option>Inactive</option><option>Suspended</option>
            </select>
          </div>
          <p className="rounded-xl bg-violet-50 p-3 text-xs text-violet-700">Demo note — changes are not persisted to a backend.</p>
          <div className="flex justify-end gap-2">
            <button className="btn btn-ghost !px-5 !py-2.5 text-xs" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn btn-primary !px-5 !py-2.5 text-xs" onClick={() => setEditing(null)}>Save (demo)</button>
          </div>
        </div>
      </Modal>
    </>
  )
}
