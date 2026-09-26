import { useMemo, useState } from 'react'
import { CheckCircle2, ShoppingCart } from 'lucide-react'
import PageHeader from '../../components/layout/PageHeader'
import StatusBadge from '../../components/ui/StatusBadge'
import { INVENTORY, fmtMoney, fmtNum } from '../../data/mockData'

export default function PurchasePlanning() {
  const [approved, setApproved] = useState({})
  const toReorder = useMemo(() => INVENTORY.filter((i) => i.reorderQty > 0), [])

  const totalCost = toReorder.reduce((s, i) => s + i.reorderQty * (i.value / Math.max(1, i.stock || 1)), 0)
  const approvedCount = Object.values(approved).filter(Boolean).length

  return (
    <>
      <PageHeader
        title="Purchase Planning"
        subtitle="Suggested reorder quantities from forecast demand + par levels"
        demo
        actions={
          <button className="btn btn-primary !px-4 !py-2.5 text-xs" disabled={approvedCount === 0}>
            <ShoppingCart size={14} /> Create PO ({approvedCount})
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          { label: 'Items to Reorder', value: String(toReorder.length) },
          { label: 'Approved (demo)', value: String(approvedCount) },
          { label: 'Est. PO Value', value: fmtMoney(totalCost * 12) },
          { label: 'Next Deliveries', value: 'Sep 26 – Sep 30' },
        ].map((k, i) => (
          <div key={k.label} className="card card-hover anim-fade-up p-4" style={{ animationDelay: `${i * 60}ms` }}>
            <p className="font-display mt-1 text-lg font-extrabold text-ink-900">{k.value}</p>
            <p className="text-[0.66rem] font-bold uppercase tracking-[0.1em] text-ink-400">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="card mt-5 p-2 sm:p-4">
        <div className="overflow-x-auto">
          <table className="dq-table">
            <thead>
              <tr>
                <th>Item</th><th>Supplier</th><th>Stock</th><th>Par</th><th>Reorder Qty</th>
                <th>Est. Cost</th><th>Next Delivery</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {toReorder.map((i) => {
                const unit = i.value / Math.max(1, i.stock || 1)
                const isApproved = !!approved[i.id]
                return (
                  <tr key={i.id} className={isApproved ? '!bg-emerald-50/50' : undefined}>
                    <td className="font-semibold text-ink-900">{i.item}</td>
                    <td>{i.supplier}</td>
                    <td>{fmtNum(i.stock)} {i.unit}</td>
                    <td>{fmtNum(i.parLevel)} {i.unit}</td>
                    <td className="font-bold text-brand-600">+{fmtNum(i.reorderQty)} {i.unit}</td>
                    <td>{fmtMoney(Math.round(i.reorderQty * unit))}</td>
                    <td className="text-ink-400">{i.nextDelivery}</td>
                    <td><StatusBadge status={i.status === 'Out of Stock' ? 'Critical' : 'Warning'} /></td>
                    <td>
                      <button
                        className={`btn !rounded-lg !px-3 !py-1.5 text-xs ${isApproved ? 'btn-ghost !text-emerald-600' : 'btn-ghost'}`}
                        onClick={() => setApproved((a) => ({ ...a, [i.id]: !a[i.id] }))}
                      >
                        {isApproved ? <><CheckCircle2 size={13} className="text-emerald-500" /> Approved</> : 'Approve'}
                      </button>
                    </td>
                  </tr>
                )
              })}
              {toReorder.length === 0 && (
                <tr><td colSpan={9} className="!py-8 !text-center text-ink-400">Nothing to reorder — stock above par.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="px-2 pt-3 text-[0.68rem] text-ink-300">
          Demo / Mock Data — approvals are visual only. In production this writes purchase orders through the
          inventory API.
        </p>
      </div>
    </>
  )
}
