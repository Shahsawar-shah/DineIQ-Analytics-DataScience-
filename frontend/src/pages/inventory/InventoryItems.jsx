import { useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import PageHeader from '../../components/layout/PageHeader'
import DataTable from '../../components/ui/DataTable'
import StatusBadge from '../../components/ui/StatusBadge'
import FilterBar from '../../components/ui/FilterBar'
import Modal from '../../components/ui/Modal'
import { INVENTORY, fmtMoney, fmtNum } from '../../data/mockData'

const CATEGORIES = [...new Set(INVENTORY.map((i) => i.category))]

export default function InventoryItems() {
  const [filters, setFilters] = useState({ category: 'all', status: 'all', q: '' })
  const [editing, setEditing] = useState(null)

  const rows = useMemo(
    () =>
      INVENTORY.filter(
        (i) =>
          (filters.category === 'all' || i.category === filters.category) &&
          (filters.status === 'all' || i.status === filters.status) &&
          (filters.q === '' || i.item.toLowerCase().includes(filters.q.toLowerCase())),
      ),
    [filters],
  )

  const columns = [
    {
      key: 'item',
      header: 'Item',
      render: (r) => (
        <div>
          <p className="font-semibold text-ink-900">{r.item}</p>
          <p className="text-[0.68rem] text-ink-400">{r.supplier}</p>
        </div>
      ),
    },
    { key: 'category', header: 'Category', render: (r) => <span className="badge badge-gray">{r.category}</span> },
    { key: 'stock', header: 'Stock', align: 'right', render: (r) => <span className="font-bold">{fmtNum(r.stock)} {r.unit}</span> },
    { key: 'par', header: 'Par Level', align: 'right', render: (r) => `${fmtNum(r.parLevel)} ${r.unit}` },
    { key: 'value', header: 'Value', align: 'right', render: (r) => fmtMoney(r.value) },
    { key: 'consumption', header: '30d Usage', align: 'right', render: (r) => fmtNum(r.consumption30d) },
    { key: 'wastage', header: 'Wastage', align: 'right', render: (r) => `${r.wastagePct}%` },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => (
        <button className="btn btn-ghost !rounded-lg !px-3 !py-1.5 text-xs" onClick={() => setEditing(r)}>Edit</button>
      ),
    },
  ]

  return (
    <>
      <PageHeader title="Inventory" subtitle="Master item list across all locations" demo
        actions={<button className="btn btn-primary !px-4 !py-2.5 text-xs"><Plus size={14} /> Add item</button>} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterBar
          filters={[
            { key: 'category', label: 'Category', options: CATEGORIES.map((c) => ({ label: c, value: c })) },
            { key: 'status', label: 'Status', options: ['In Stock', 'Low Stock', 'Out of Stock'].map((s) => ({ label: s, value: s })) },
          ]}
          values={filters}
          onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
          onReset={() => setFilters({ category: 'all', status: 'all', q: '' })}
        />
        <div className="relative ml-auto">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
          <input className="input !w-52 !rounded-xl !py-2 !pl-9 text-xs" placeholder="Search items…" value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} />
        </div>
      </div>

      <div className="card p-2 sm:p-4">
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} emptyMessage="No items match your filters." />
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Edit — ${editing?.item ?? ''}`}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label">Stock on hand</label><input className="input" defaultValue={editing?.stock} /></div>
          <div><label className="label">Par level</label><input className="input" defaultValue={editing?.parLevel} /></div>
          <div><label className="label">Reorder quantity</label><input className="input" defaultValue={editing?.reorderQty} /></div>
          <div><label className="label">Supplier</label><input className="input" defaultValue={editing?.supplier} /></div>
        </div>
        <p className="mt-4 rounded-xl bg-violet-50 p-3 text-xs text-violet-700">Demo note — changes are not persisted.</p>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn btn-ghost !px-5 !py-2.5 text-xs" onClick={() => setEditing(null)}>Cancel</button>
          <button className="btn btn-primary !px-5 !py-2.5 text-xs" onClick={() => setEditing(null)}>Save (demo)</button>
        </div>
      </Modal>
    </>
  )
}
