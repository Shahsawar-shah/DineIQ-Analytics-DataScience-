import { useEffect, useState } from 'react'
import { AlertOctagon, Megaphone, Percent, ShoppingBag } from 'lucide-react'
import { api } from '../../services/api'
import PageHeader from '../../components/layout/PageHeader'
import KpiCard from '../../components/ui/KpiCard'
import DataTable from '../../components/ui/DataTable'
import LoadingState, { ErrorState } from '../../components/ui/LoadingState'

function trapReason(discountPct) {
  if (discountPct >= 45) return 'Discount too high — profit likely turns negative'
  if (discountPct >= 30) return 'Deep discount — sales lift rarely offsets the margin loss'
  return 'Customers cluster purchases around the promo window only'
}

export default function Promotions() {
  const [summary, setSummary] = useState(null)
  const [traps, setTraps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sum, trapData] = await Promise.all([api.promotions.summary(), api.promotions.traps()])
        setSummary(sum)
        setTraps(trapData)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />

  const trapColumns = [
    { key: 'name', header: 'Promo Name', render: (r) => <span className="font-semibold text-ink-900">{r.promo_name}</span> },
    { key: 'discount', header: 'Discount %', align: 'right', render: (r) => `${r.discount_percentage}%` },
    { key: 'reason', header: 'Reason', render: (r) => <span className="badge badge-red">{r.reason ?? trapReason(r.discount_percentage)}</span> },
  ]

  return (
    <>
      <PageHeader
        title="Promotion Analytics"
        subtitle="Campaign counts, order share and promotion-trap detection"
        actions={<span className="badge badge-green"><span className="live-dot mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live data feed</span>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Promotions" value={String(summary.total_promotions)} icon={Megaphone} accent="#f95d0b" />
        <KpiCard label="Active" value={String(summary.active_promotions)} icon={ShoppingBag} accent="#0d9459" delay={60} />
        <KpiCard label="Promo Orders" value={`${summary.promo_orders.toLocaleString()} (${summary.promo_order_pct}%)`} icon={Percent} accent="#1d4ed8" delay={120} />
        <KpiCard label="Traps Found" value={String(summary.promotion_traps)} icon={AlertOctagon} accent="#d92d20" delay={180} />
      </div>

      <div className="card mt-5 p-2 sm:p-4">
        <div className="flex items-center gap-2 px-2 pb-3 pt-1">
          <AlertOctagon size={16} className="text-rose-600" />
          <h3 className="font-display text-sm font-bold text-ink-900">⚠️ Promotion Traps Detected</h3>
        </div>
        <DataTable columns={trapColumns} rows={traps} rowKey={(r) => r.promotion_id} emptyMessage="No promotion traps detected." />
      </div>
    </>
  )
}
