import { useState } from 'react'
import { MapPin, Plus } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts'
import PageHeader from '../../components/layout/PageHeader'
import DataTable from '../../components/ui/DataTable'
import StatusBadge from '../../components/ui/StatusBadge'
import Modal from '../../components/ui/Modal'
import Toast, { useToast } from '../../components/ui/Toast'
import { LOCATIONS, fmtMoney, fmtNum } from '../../data/mockData'

const emptyForm = { name: '', city: '', manager: '', status: 'Operational' }

export default function AdminLocations() {
  const [locations, setLocations] = useState(LOCATIONS)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState(null)
  const { toast, showToast, hideToast } = useToast()

  const openAdd = () => {
    setForm(emptyForm)
    setFormError(null)
    setAdding(true)
  }

  const submitAdd = (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.city.trim() || !form.manager.trim()) {
      setFormError('Name, city and manager are required.')
      return
    }
    if (locations.some((l) => l.name.toLowerCase() === form.name.trim().toLowerCase())) {
      setFormError('A location with that name already exists.')
      return
    }
    setLocations((prev) => [
      {
        id: `L${prev.length + 1}`.padStart(3, '0'),
        name: form.name.trim(),
        city: form.city.trim(),
        manager: form.manager.trim(),
        status: form.status,
        orders30d: 0,
        revenue30d: 0,
        dataQuality: 0,
      },
      ...prev,
    ])
    setAdding(false)
    showToast(`${form.name.trim()} was added.`, 'success')
  }

  const columns = [
    {
      key: 'name',
      header: 'Location',
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-500"><MapPin size={15} /></span>
          <div>
            <p className="font-semibold text-ink-900">{r.name}</p>
            <p className="text-[0.68rem] text-ink-400">{r.city}</p>
          </div>
        </div>
      ),
    },
    { key: 'manager', header: 'Manager', render: (r) => r.manager },
    { key: 'orders', header: 'Orders (30d)', align: 'right', render: (r) => fmtNum(r.orders30d) },
    { key: 'revenue', header: 'Revenue (30d)', align: 'right', render: (r) => <span className="font-semibold">{fmtMoney(r.revenue30d)}</span> },
    {
      key: 'dq',
      header: 'Data Quality',
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="meter w-20"><span style={{ width: `${r.dataQuality}%`, background: 'linear-gradient(90deg,#34d399,#0d9459)' }} /></div>
          <span className="text-xs font-semibold">{r.dataQuality}%</span>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ]

  return (
    <>
      <PageHeader
        title="Restaurants / Locations"
        subtitle="Every site connected to the DineIQ data platform"
        actions={<button className="btn btn-primary !px-4 !py-2.5 text-xs" onClick={openAdd}><Plus size={14} /> Add location</button>}
      />
      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <div className="card anim-fade-up p-4 sm:p-5">
          <h3 className="font-display mb-3 text-sm font-bold text-ink-900">Revenue by Location (30 days)</h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={locations}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#878ba7' }} axisLine={false} tickLine={false} interval={0} />
                <YAxis tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} />
                <RTooltip />
                <Bar dataKey="revenue30d" fill="#f95d0b" radius={[6, 6, 0, 0]} name="Revenue ($)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card anim-fade-up p-4 sm:p-5" style={{ animationDelay: '90ms' }}>
          <h3 className="font-display mb-3 text-sm font-bold text-ink-900">Orders by Location (30 days)</h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={locations}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#878ba7' }} axisLine={false} tickLine={false} interval={0} />
                <YAxis tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} />
                <RTooltip />
                <Bar dataKey="orders30d" fill="#1d4ed8" radius={[6, 6, 0, 0]} name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="card p-2 sm:p-4">
        <DataTable columns={columns} rows={locations} rowKey={(r) => r.id} />
      </div>

      <Modal open={adding} onClose={() => setAdding(false)} title="Add location">
        <form className="space-y-4" onSubmit={submitAdd}>
          <div><label className="label">Location name</label>
            <input className="input" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label">City</label>
              <input className="input" required value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
            </div>
            <div><label className="label">Manager</label>
              <input className="input" required value={form.manager} onChange={(e) => setForm((f) => ({ ...f, manager: e.target.value }))} />
            </div>
          </div>
          <div><label className="label">Status</label>
            <select className="input" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              <option>Operational</option>
              <option>Maintenance</option>
            </select>
          </div>
          {formError && <p className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-600">{formError}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-ghost !px-5 !py-2.5 text-xs" onClick={() => setAdding(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary !px-5 !py-2.5 text-xs">Add location</button>
          </div>
        </form>
      </Modal>

      <Toast toast={toast} onClose={hideToast} />
    </>
  )
}
