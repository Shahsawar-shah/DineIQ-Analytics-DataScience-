import { useEffect, useState } from 'react'
import { AlertTriangle, DollarSign, PackageX, Sparkles } from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { api } from '../../services/api'
import PageHeader from '../../components/layout/PageHeader'
import KpiCard from '../../components/ui/KpiCard'
import ChartCard from '../../components/charts/ChartCard'
import DataTable from '../../components/ui/DataTable'
import LoadingState, { ErrorState } from '../../components/ui/LoadingState'

const REASON_COLORS = {
  Overproduction: '#f9a825',
  Spoilage: '#d92d20',
  'Prep Error': '#1d4ed8',
  Expired: '#878ba7',
  'Customer Return': '#0d9459',
}

export default function WastageAnalytics() {
  const [summary, setSummary] = useState(null)
  const [highRisk, setHighRisk] = useState([])
  const [byReason, setByReason] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sum, risk, reasons] = await Promise.all([
          api.wastage.summary(),
          api.wastage.highRisk(10),
          api.wastage.byReason(),
        ])
        setSummary(sum)
        setHighRisk(risk)
        setByReason(reasons)
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

  const riskColumns = [
    { key: 'name', header: 'Item Name', render: (r) => r.item_name },
    {
      key: 'wastage',
      header: 'Wastage %',
      render: (r) => (
        <span className="badge badge-red">
          {r.wastage_percentage > 50 && '⚠️ '}
          {r.wastage_percentage.toFixed(1)}%
        </span>
      ),
    },
    { key: 'revenue', header: 'Revenue', render: (r) => `$${r.total_revenue.toLocaleString()}` },
    { key: 'margin', header: 'Profit %', render: (r) => `${r.profit_percentage.toFixed(1)}%` },
  ]

  return (
    <>
      <PageHeader title="Wastage Analytics" subtitle="Item-level wastage risk and revenue impact — live from wastage records" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Wastage Records" value={summary.total_records.toLocaleString()} icon={AlertTriangle} accent="#b54708" />
        <KpiCard label="Total Wastage Cost" value={`$${summary.total_wastage_cost.toLocaleString()}`} icon={DollarSign} accent="#d92d20" delay={60} />
        <KpiCard label="High Wastage Items" value={String(summary.high_wastage_items)} icon={PackageX} accent="#1d4ed8" delay={120} />
        <KpiCard label="Records Cleaned" value={summary.impossible_removed.toLocaleString()} icon={Sparkles} accent="#0d9459" delay={180} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <ChartCard title="Wastage by Reason" subtitle="Share of total wastage events">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byReason} dataKey="count" nameKey="reason" innerRadius={64} outerRadius={98} paddingAngle={4} strokeWidth={0}>
                  {byReason.map((entry) => (
                    <Cell key={entry.reason} fill={REASON_COLORS[entry.reason] ?? '#878ba7'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5">
            {byReason.map((r) => (
              <div key={r.reason} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-ink-500">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: REASON_COLORS[r.reason] ?? '#878ba7' }} />
                  {r.reason}
                </span>
                <span className="font-bold text-ink-900">{r.percentage}% · ${r.cost.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="High Risk Items" subtitle="Highest wastage percentage on the menu">
          <DataTable columns={riskColumns} rows={highRisk} rowKey={(r) => r.item_id} maxHeight="360px" />
        </ChartCard>
      </div>
    </>
  )
}
