import { useEffect, useMemo, useState } from 'react'
import { Download, Pencil, Search, Trash2, UserPlus } from 'lucide-react'
import PageHeader from '../../components/layout/PageHeader'
import DataTable from '../../components/ui/DataTable'
import FilterBar from '../../components/ui/FilterBar'
import Modal from '../../components/ui/Modal'
import Toast, { useToast } from '../../components/ui/Toast'
import LoadingState, { ErrorState } from '../../components/ui/LoadingState'
import { api } from '../../services/api'
import { downloadCSV } from '../../utils/helpers'

// Must match ALL_ROLES in backend/middleware/auth_middleware.py. Only a Super Admin
// may assign Admin / Super Admin; the backend enforces that and returns a 403 message.
const ROLES = ['Customer', 'Cashier', 'Restaurant Manager', 'Inventory Manager', 'Admin', 'Super Admin']

const ROLE_BADGE = {
  'Super Admin': 'badge-violet',
  Admin: 'badge-red',
  Cashier: 'badge-orange',
  'Restaurant Manager': 'badge-blue',
  'Inventory Manager': 'badge-green',
  Customer: 'badge-gray',
}

const emptyForm = { name: '', email: '', password: '', role: ROLES[0] }

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ role: 'all', status: 'all', q: '' })

  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [addBusy, setAddBusy] = useState(false)
  const [addError, setAddError] = useState(null)

  const [editing, setEditing] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', role: '', is_active: true })
  const [editBusy, setEditBusy] = useState(false)
  const [editError, setEditError] = useState(null)

  const [deleting, setDeleting] = useState(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const { toast, showToast, hideToast } = useToast()

  const loadUsers = () => {
    setLoading(true)
    setError(null)
    return api.auth.users()
      .then((data) => setUsers(data))
      .catch((err) => setError(err.message || 'Could not load users.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const rows = useMemo(
    () =>
      users.filter(
        (u) =>
          (filters.role === 'all' || u.role === filters.role) &&
          (filters.status === 'all' || (filters.status === 'Active' ? u.is_active : !u.is_active)) &&
          (filters.q === '' || `${u.name} ${u.email}`.toLowerCase().includes(filters.q.toLowerCase())),
      ),
    [users, filters],
  )

  const openAdd = () => {
    setForm(emptyForm)
    setAddError(null)
    setAdding(true)
  }

  const submitAdd = async (e) => {
    e.preventDefault()
    setAddBusy(true)
    setAddError(null)
    try {
      await api.auth.createUser(form)
      setAdding(false)
      showToast(`${form.name} was added successfully.`, 'success')
      await loadUsers()
    } catch (err) {
      setAddError(err.message || 'Could not create the user. Please try again.')
      showToast('Failed to add user.', 'error')
    } finally {
      setAddBusy(false)
    }
  }

  const openEdit = (user) => {
    setEditing(user)
    setEditForm({ name: user.name, role: user.role, is_active: user.is_active })
    setEditError(null)
  }

  const submitEdit = async (e) => {
    e.preventDefault()
    setEditBusy(true)
    setEditError(null)
    try {
      await api.auth.updateUser(editing.id, editForm)
      setEditing(null)
      showToast(`${editForm.name} was updated.`, 'success')
      await loadUsers()
    } catch (err) {
      setEditError(err.message || 'Could not update the user. Please try again.')
      showToast('Failed to update user.', 'error')
    } finally {
      setEditBusy(false)
    }
  }

  const runDelete = async () => {
    setDeleteBusy(true)
    try {
      await api.auth.deleteUser(deleting.id)
      setDeleting(null)
      showToast(`${deleting.name} was deactivated.`, 'success')
      await loadUsers()
    } catch (err) {
      showToast(err.message || 'Failed to deactivate user.', 'error')
    } finally {
      setDeleteBusy(false)
    }
  }

  const columns = [
    { key: 'id', header: 'ID', render: (r) => <span className="text-ink-400">{r.id}</span> },
    {
      key: 'name',
      header: 'Name',
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink-700 text-[0.65rem] font-bold text-white">
            {r.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
          </span>
          <p className="font-semibold text-ink-900">{r.name}</p>
        </div>
      ),
    },
    { key: 'email', header: 'Email', render: (r) => <span className="text-ink-500">{r.email}</span> },
    { key: 'role', header: 'Role', render: (r) => <span className={`badge ${ROLE_BADGE[r.role] ?? 'badge-gray'}`}>{r.role}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <span className={`badge ${r.is_active ? 'badge-green' : 'badge-red'}`}>{r.is_active ? 'Active' : 'Inactive'}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => (
        <div className="flex justify-end gap-1.5">
          <button className="btn btn-ghost !rounded-lg !px-3 !py-1.5 text-xs" onClick={() => openEdit(r)}>
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
      rows.map((r) => ({ id: r.id, name: r.name, email: r.email, role: r.role, status: r.is_active ? 'Active' : 'Inactive' })),
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
            { key: 'status', label: 'Status', options: ['Active', 'Inactive'].map((s) => ({ label: s, value: s })) },
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

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <div className="card p-2 sm:p-4">
          <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} />
        </div>
      )}

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
          {addError && <p className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-600">{addError}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-ghost !px-5 !py-2.5 text-xs" onClick={() => setAdding(false)} disabled={addBusy}>Cancel</button>
            <button type="submit" className="btn btn-primary !px-5 !py-2.5 text-xs" disabled={addBusy}>{addBusy ? 'Adding…' : 'Add user'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Edit user: ${editing?.name ?? ''}`}>
        <form className="space-y-4" onSubmit={submitEdit}>
          <div><label className="label">Name</label>
            <input className="input" required value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div><label className="label">Role</label>
            <select className="input" value={editForm.role} onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}>
              {ROLES.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input type="checkbox" checked={editForm.is_active} onChange={(e) => setEditForm((f) => ({ ...f, is_active: e.target.checked }))} />
            Active
          </label>
          {editError && <p className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-600">{editError}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-ghost !px-5 !py-2.5 text-xs" onClick={() => setEditing(null)} disabled={editBusy}>Cancel</button>
            <button type="submit" className="btn btn-primary !px-5 !py-2.5 text-xs" disabled={editBusy}>{editBusy ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Deactivate this user?" width="max-w-sm">
        <p className="text-sm text-ink-600">
          <strong>{deleting?.name}</strong> will be marked inactive and lose access. This can be reversed later by an admin.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn btn-ghost !px-5 !py-2.5 text-xs" onClick={() => setDeleting(null)} disabled={deleteBusy}>Cancel</button>
          <button className="btn btn-primary !px-5 !py-2.5 text-xs !bg-rose-600 hover:!bg-rose-700" onClick={runDelete} disabled={deleteBusy}>
            {deleteBusy ? 'Deactivating…' : 'Deactivate'}
          </button>
        </div>
      </Modal>

      <Toast toast={toast} onClose={hideToast} />
    </>
  )
}
