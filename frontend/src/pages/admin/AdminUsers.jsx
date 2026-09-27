import { useMemo, useState } from 'react'
import { Download, Pencil, Search, Trash2, UserPlus } from 'lucide-react'
import PageHeader from '../../components/layout/PageHeader'
import DataTable from '../../components/ui/DataTable'
import StatusBadge from '../../components/ui/StatusBadge'
import FilterBar from '../../components/ui/FilterBar'
import Modal from '../../components/ui/Modal'
import Toast, { useToast } from '../../components/ui/Toast'
import { api } from '../../services/api'
import { USERS, LOCATIONS } from '../../data/mockData'
import { downloadCSV } from '../../utils/helpers'

const ROLES = ['Customer', 'Admin', 'Restaurant Manager', 'Inventory Manager']

const emptyForm = { name: '', email: '', password: '', role: ROLES[0] }

export default function AdminUsers() {
  const [users, setUsers] = useState(USERS)
  const [filters, setFilters] = useState({ role: 'all', status: 'all', q: '' })
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState(null)
  const { toast, showToast, hideToast } = useToast()

  const rows = useMemo(
    () =>
      users.filter(
        (u) =>
          (filters.role === 'all' || u.role === filters.role) &&
          (filters.status === 'all' || u.status === filters.status) &&
          (filters.q === '' || `${u.name} ${u.email}`.toLowerCase().includes(filters.q.toLowerCase())),
      ),
    [users, filters],
  )

  const openAdd = () => {
    setForm(emptyForm)
    setFormError(null)
    setAdding(true)
  }

  const submitAdd = async (e) => {
    e.preventDefault()
    setBusy(true)
    setFormError(null)
    try {
      const res = await api.auth.register(form.name, form.email, form.password, form.role)
      if (res?.error || res?.detail) throw new Error(res.error || res.detail)
      setUsers((prev) => [
        {
          id: res?.id ?? `U${prev.length + 1}`.padStart(4, '0'),
          name: form.name,
          email: form.email,
          role: form.role,
          location: 'All Locations',
          status: 'Active',
          lastLogin: '—',
        },
        ...prev,
      ])
      setAdding(false)
      showToast(`${form.name} was added successfully.`, 'success')
    } catch (err) {
      setFormError(err.message || 'Could not create user — please try again.')
      showToast('Failed to add user.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const submitEdit = () => {
    showToast('Editing users is coming soon — no update endpoint yet.', 'error')
    setEditing(null)
  }

  const runDelete = () => {
    setUsers((prev) => prev.filter((u) => u.id !== deleting.id))
    showToast(`${deleting.name} was removed.`, 'success')
    setDeleting(null)
  }

  const columns = [
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
        <div className="flex justify-end gap-1.5">
          <button className="btn btn-ghost !rounded-lg !px-3 !py-1.5 text-xs" onClick={() => setEditing(r)}>
            <Pencil size={13} /> Edit
          </button>
          <button className="btn btn-ghost !rounded-lg !px-3 !py-1.5 text-xs !text-rose-600" onClick={() => setDeleting(r)}>
            <Trash2 size={13} /> Delete
          </button>
        </div>
      ),
    },
  ]

  const exportCsv = () => {
    downloadCSV(
      rows.map((r) => ({ id: r.id, name: r.name, email: r.email, role: r.role, location: r.location, status: r.status, lastLogin: r.lastLogin })),
      'dineiq-users.csv',
    )
  }

  return (
    <>
      <PageHeader
        title="User Management"
        subtitle="All accounts across the DineIQ platform"
        actions={
          <>
            <button className="btn btn-ghost !px-4 !py-2.5 text-xs" onClick={exportCsv}><Download size={14} /> Export CSV</button>
            <button className="btn btn-primary !px-4 !py-2.5 text-xs" onClick={openAdd}><UserPlus size={14} /> Add user</button>
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

      <Modal open={adding} onClose={() => setAdding(false)} title="Add user">
        <form className="space-y-4" onSubmit={submitAdd}>
          <div><label className="label">Name</label>
            <input className="input" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div><label className="label">Email</label>
            <input type="email" className="input" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <div><label className="label">Password</label>
            <input type="password" className="input" required minLength={6} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
          </div>
          <div><label className="label">Role</label>
            <select className="input" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
              {ROLES.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          {formError && <p className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-600">{formError}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-ghost !px-5 !py-2.5 text-xs" onClick={() => setAdding(false)} disabled={busy}>Cancel</button>
            <button type="submit" className="btn btn-primary !px-5 !py-2.5 text-xs" disabled={busy}>{busy ? 'Adding…' : 'Add user'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Edit user — ${editing?.name ?? ''}`}>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label">Name</label>
              <input className="input" defaultValue={editing?.name} />
            </div>
            <div><label className="label">Email</label>
              <input className="input" defaultValue={editing?.email} />
            </div>
          </div>
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
          <div className="flex justify-end gap-2">
            <button className="btn btn-ghost !px-5 !py-2.5 text-xs" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn btn-primary !px-5 !py-2.5 text-xs" onClick={submitEdit}>Save</button>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Delete user" width="max-w-sm">
        <p className="text-sm text-ink-600">
          Remove <strong>{deleting?.name}</strong> from the platform? This cannot be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn btn-ghost !px-5 !py-2.5 text-xs" onClick={() => setDeleting(null)}>Cancel</button>
          <button className="btn btn-primary !px-5 !py-2.5 text-xs !bg-rose-600 hover:!bg-rose-700" onClick={runDelete}>Delete</button>
        </div>
      </Modal>

      <Toast toast={toast} onClose={hideToast} />
    </>
  )
}
