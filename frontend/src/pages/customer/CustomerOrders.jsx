import { useMemo, useState } from 'react'
import { Repeat, Search } from 'lucide-react'
import PageHeader from '../../components/layout/PageHeader'
import DataTable from '../../components/ui/DataTable'
import StatusBadge from '../../components/ui/StatusBadge'
import FilterBar from '../../components/ui/FilterBar'
import Modal from '../../components/ui/Modal'
import { MY_ORDERS, fmtMoney } from '../../data/mockData'

const CHANNELS = [...new Set(MY_ORDERS.map((o) => o.channel))]
const STATUSES = [...new Set(MY_ORDERS.map((o) => o.status))]

export default function CustomerOrders() {
  const [filters, setFilters] = useState({ channel: 'all', status: 'all', q: '' })

  const rows = useMemo(
    () =>
      MY_ORDERS.filter(
        (o) =>
          (filters.channel === 'all' || o.channel === filters.channel) &&
          (filters.status === 'all' || o.status === filters.status) &&
          (filters.q === '' || o.id.toLowerCase().includes(filters.q.toLowerCase()) || o.location.toLowerCase().includes(filters.q.toLowerCase())),
      ),
    [filters],
  )

  const [reorder, setReorder] = useState(null)

  const columns = [
    { key: 'id', header: 'Order', render: (r) => <span className="font-semibold text-ink-900">{r.id}</span> },
    { key: 'date', header: 'Date', render: (r) => r.date },
    { key: 'items', header: 'Items', align: 'center', render: (r) => r.items },
    { key: 'channel', header: 'Channel', render: (r) => r.channel },
    { key: 'location', header: 'Location', render: (r) => r.location },
    { key: 'total', header: 'Total', align: 'right', render: (r) => <span className="font-semibold">{fmtMoney(r.total, 2)}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => (
        <button className="btn btn-ghost !rounded-lg !px-3 !py-1.5 text-xs" onClick={() => setReorder(r)}>
          <Repeat size={13} /> Reorder
        </button>
      ),
    },
  ]

  return (
    <>
      <PageHeader title="My Orders" subtitle="Every order you have placed with DineIQ partner locations" demo />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterBar
          filters={[
            { key: 'channel', label: 'Channel', options: CHANNELS.map((c) => ({ label: c, value: c })) },
            { key: 'status', label: 'Status', options: STATUSES.map((s) => ({ label: s, value: s })) },
          ]}
          values={filters}
          onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
          onReset={() => setFilters({ channel: 'all', status: 'all', q: '' })}
        />
        <div className="relative ml-auto">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
          <input
            className="input !w-56 !rounded-xl !py-2 !pl-9 text-xs"
            placeholder="Search orders…"
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
          />
        </div>
      </div>

      <div className="card p-2 sm:p-4">
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} emptyMessage="No orders match your filters." />
      </div>

      <Modal open={!!reorder} onClose={() => setReorder(null)} title={`Reorder ${reorder?.id ?? ''}`}>
        <p className="text-sm text-ink-500">
          Your previous basket from <strong>{reorder?.location}</strong> ({reorder?.items} items,{' '}
          {reorder && fmtMoney(reorder.total, 2)}) would be added to a new order.
        </p>
        <p className="mt-3 rounded-xl bg-brand-50 p-3 text-xs text-brand-700">
          Demo note — ordering is not implemented in this frontend prototype.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn btn-ghost !px-5 !py-2.5 text-xs" onClick={() => setReorder(null)}>Cancel</button>
          <button className="btn btn-primary !px-5 !py-2.5 text-xs" onClick={() => setReorder(null)}>Add to basket (demo)</button>
        </div>
      </Modal>
    </>
  )
}
