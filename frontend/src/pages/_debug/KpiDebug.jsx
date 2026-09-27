import { DollarSign, ShieldCheck, ShoppingBag, Star, Users } from 'lucide-react'
import KpiCard from '../../components/ui/KpiCard'

/** Temporary debug harness to visually verify KpiCard layout at real dashboard width. */
export default function KpiDebug() {
  return (
    <div className="flex min-h-screen bg-[#f6f7fb]">
      <div className="w-[248px] shrink-0 bg-white" />
      <main className="flex-1 p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard label="Total Revenue" value="$26,197,045.07" icon={DollarSign} accent="#f95d0b" />
          <KpiCard label="Total Orders" value="97,000" icon={ShoppingBag} accent="#1d4ed8" />
          <KpiCard label="Total Customers" value="50,000" icon={Users} accent="#6938ef" />
          <KpiCard label="Avg Rating" value="3.96" icon={Star} accent="#f9a825" />
          <KpiCard label="Avg Wastage" value="24.8%" icon={ShieldCheck} accent="#d92d20" />
        </div>
      </main>
    </div>
  )
}
