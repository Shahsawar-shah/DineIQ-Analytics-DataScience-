import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, Repeat, Search, ShoppingBag, Star, XCircle } from 'lucide-react'
import PageHeader from '../../components/layout/PageHeader'
import DataTable from '../../components/ui/DataTable'
import StatusBadge from '../../components/ui/StatusBadge'
import FilterBar from '../../components/ui/FilterBar'
import Modal from '../../components/ui/Modal'
import DishImage from '../../components/customer/DishImage'
import { useCustomer } from '../../context/CustomerContext'
import { fmtMoney } from '../../data/mockData'
import { PREP_MINUTES, fmtDateTime, isFulfilled, isLocationOpen, menuItem } from './shared'

const EMPTY_FILTERS = { channel: 'all', status: 'all', q: '' }

function OrderLines({ lines }) {
  return (
    <ul className="divide-y divide-ink-100">
      {lines.map((l) => {
        const item = menuItem(l.itemId)
        return (
          <li key={l.itemId} className="flex items-center gap-3 py-2.5">
            {item && <DishImage item={item} className="h-10 w-10 shrink-0 rounded-lg" iconSize={16} />}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink-900">{l.name}</p>
              <p className="text-[0.7rem] text-ink-400">{l.qty} × {fmtMoney(l.price, 2)}</p>
            </div>
            <span className="text-sm font-semibold text-ink-900">{fmtMoney(l.price * l.qty, 2)}</span>
          </li>
        )
      })}
    </ul>
  )
}

export default function CustomerOrders() {
  const { orders, basketCount, reorder, cancelOrder } = useCustomer()
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [detailsId, setDetailsId] = useState(null)
  const [reorderId, setReorderId] = useState(null)
  const [cancelId, setCancelId] = useState(null)

  // Look orders up by id so an open dialog always shows the live status
  const details = orders.find((o) => o.id === detailsId) ?? null
  const reordering = orders.find((o) => o.id === reorderId) ?? null
  const cancelling = orders.find((o) => o.id === cancelId) ?? null

  const channels = useMemo(() => [...new Set(orders.map((o) => o.channel))], [orders])
  const statuses = useMemo(() => [...new Set(orders.map((o) => o.status))], [orders])

  const rows = useMemo(() => {
    const q = filters.q.trim().toLowerCase()
    return orders.filter(
      (o) =>
        (filters.channel === 'all' || o.channel === filters.channel) &&
        (filters.status === 'all' || o.status === filters.status) &&
        (q === '' ||
          o.id.toLowerCase().includes(q) ||
          o.location.toLowerCase().includes(q) ||
          o.lines.some((l) => l.name.toLowerCase().includes(q))),
    )
  }, [orders, filters])

  const columns = [
    { key: 'id', header: 'Order', render: (r) => <span className="font-semibold text-ink-900">{r.id}</span> },
    { key: 'date', header: 'Date', render: (r) => fmtDateTime(r.placedAt) },
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
        <div className="flex justify-end gap-1.5">
          <button className="btn btn-ghost !rounded-lg !px-2.5 !py-1.5 text-xs" onClick={() => setDetailsId(r.id)} aria-label={`Details of ${r.id}`} title="Order details">
            <Eye size={13} />
          </button>
          {r.status === 'Preparing' && (
            <button className="btn btn-ghost !rounded-lg !px-3 !py-1.5 text-xs !text-rose-600" onClick={() => setCancelId(r.id)}>
              <XCircle size={13} /> Cancel
            </button>
          )}
          <button className="btn btn-ghost !rounded-lg !px-3 !py-1.5 text-xs" onClick={() => setReorderId(r.id)}>
            <Repeat size={13} /> Reorder
          </button>
        </div>
      ),
    },
  ]

  const confirmReorder = () => {
    reorder(reordering.id)
    setReorderId(null)
  }

  const confirmCancel = () => {
    cancelOrder(cancelling.id)
    setCancelId(null)
  }

  return (
    <>
      <PageHeader title="My Orders" subtitle="Every order you have placed with DineIQ partner locations" />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterBar
          filters={[
            { key: 'channel', label: 'Channel', options: channels.map((c) => ({ label: c, value: c })) },
            { key: 'status', label: 'Status', options: statuses.map((s) => ({ label: s, value: s })) },
          ]}
          values={filters}
          onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
          onReset={() => setFilters(EMPTY_FILTERS)}
        />
        <div className="relative ml-auto">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
          <input
            className="input !w-56 !rounded-xl !py-2 !pl-9 text-xs"
            placeholder="Search orders or dishes…"
            aria-label="Search orders"
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
          />
        </div>
      </div>

      <div className="card p-2 sm:p-4">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center py-14 text-center">
            <ShoppingBag size={26} className="text-ink-300" />
            <p className="mt-3 text-sm font-bold text-ink-900">No orders yet</p>
            <p className="mt-1 text-xs text-ink-400">Your orders appear here once you place one.</p>
            <Link to="/customer/recommendations" className="btn btn-primary mt-4 !px-5 !py-2 text-xs">Find something to order</Link>
          </div>
        ) : (
          <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} emptyMessage="No orders match your filters." />
        )}
      </div>

      {/* Order details */}
      <Modal open={!!details} onClose={() => setDetailsId(null)} title={`Order ${details?.id ?? ''}`}>
        {details && (
          <>
            <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500">
              <StatusBadge status={details.status} />
              <span>{fmtDateTime(details.placedAt)}</span>
              <span className="text-ink-200">·</span>
              <span>{details.channel}</span>
              <span className="text-ink-200">·</span>
              <span>{details.location}</span>
            </div>
            {details.status === 'Preparing' && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[0.72rem] font-medium text-amber-700">
                The kitchen is preparing this order (about {PREP_MINUTES} minutes). You can cancel it until it is ready.
              </p>
            )}
            <div className="mt-3">
              <OrderLines lines={details.lines} />
            </div>
            <dl className="mt-3 space-y-1.5 border-t border-ink-100 pt-3 text-xs text-ink-500">
              <div className="flex justify-between"><dt>Subtotal</dt><dd className="font-semibold">{fmtMoney(details.subtotal, 2)}</dd></div>
              {details.deliveryFee > 0 && (
                <div className="flex justify-between"><dt>Delivery fee</dt><dd className="font-semibold">{fmtMoney(details.deliveryFee, 2)}</dd></div>
              )}
              {details.discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <dt>Discount ({details.promoCode})</dt><dd className="font-semibold">−{fmtMoney(details.discount, 2)}</dd>
                </div>
              )}
              <div className="flex justify-between pt-1 text-sm font-extrabold text-ink-900"><dt>Total</dt><dd>{fmtMoney(details.total, 2)}</dd></div>
            </dl>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              {isFulfilled(details.status) && (
                <Link to={`/customer/ratings?item=${details.lines[0].itemId}`} className="btn btn-ghost !px-4 !py-2.5 text-xs">
                  <Star size={13} /> Rate this order
                </Link>
              )}
              {details.status === 'Preparing' && (
                <button className="btn btn-ghost !px-4 !py-2.5 text-xs !text-rose-600" onClick={() => { setDetailsId(null); setCancelId(details.id) }}>
                  <XCircle size={13} /> Cancel order
                </button>
              )}
              <button className="btn btn-primary !px-5 !py-2.5 text-xs" onClick={() => { setDetailsId(null); setReorderId(details.id) }}>
                <Repeat size={13} /> Reorder
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* Reorder */}
      <Modal open={!!reordering} onClose={() => setReorderId(null)} title={`Reorder ${reordering?.id ?? ''}`}>
        {reordering && (
          <>
            <p className="text-sm text-ink-500">
              These dishes from <strong>{reordering.location}</strong> will be added to your basket at today&apos;s prices.
            </p>
            <div className="mt-3">
              <OrderLines lines={reordering.lines.map((l) => ({ ...l, price: menuItem(l.itemId)?.price ?? l.price }))} />
            </div>
            {basketCount > 0 && (
              <p className="mt-3 text-[0.72rem] text-ink-400">Your basket already has {basketCount} item{basketCount === 1 ? '' : 's'}; these will be added to it.</p>
            )}
            {basketCount === 0 && !isLocationOpen(reordering.location) && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[0.72rem] font-medium text-amber-700">
                {reordering.location} is temporarily closed, so choose another location in your basket.
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn btn-ghost !px-5 !py-2.5 text-xs" onClick={() => setReorderId(null)}>Cancel</button>
              <button className="btn btn-primary !px-5 !py-2.5 text-xs" onClick={confirmReorder}>Add to basket</button>
            </div>
          </>
        )}
      </Modal>

      {/* Cancel */}
      <Modal open={!!cancelling} onClose={() => setCancelId(null)} title={`Cancel ${cancelling?.id ?? ''}?`} width="max-w-sm">
        {cancelling && (
          <>
            {cancelling.status === 'Preparing' ? (
              <p className="text-sm text-ink-500">
                The kitchen will stop preparing this order ({cancelling.items} item{cancelling.items === 1 ? '' : 's'}, {fmtMoney(cancelling.total, 2)}).
              </p>
            ) : (
              <p className="text-sm text-ink-500">This order is already {cancelling.status.toLowerCase()} and can no longer be cancelled.</p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn btn-ghost !px-5 !py-2.5 text-xs" onClick={() => setCancelId(null)}>Keep order</button>
              {cancelling.status === 'Preparing' && (
                <button className="btn !bg-rose-600 !px-5 !py-2.5 text-xs text-white hover:!bg-rose-700" onClick={confirmCancel}>Cancel order</button>
              )}
            </div>
          </>
        )}
      </Modal>
    </>
  )
}
