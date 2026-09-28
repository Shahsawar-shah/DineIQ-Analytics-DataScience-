import { useEffect, useState } from 'react'
import { AlertTriangle, DollarSign, Eraser, PackageX } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
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
  const [trends, setTrends] = useState([])
  const [byLocation, setByLocation] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sum, risk, reasons, monthly, locations] = await Promise.all([
          api.wastage.summary(),
          api.wastage.highRisk(10),
          api.wastage.byReason(),
          api.wastage.trends(),
          api.wastage.byLocation(),
        ])
        setSummary(sum)
        setHighRisk(risk)
        setByReason(reasons)
        setTrends(monthly)
        setByLocation(locations)
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
          {r.wastage_percentage > 50 && <AlertTriangle size={11} />}
          {r.wastage_percentage.toFixed(1)}%
        </span>
      ),
    },
    { key: 'revenue', header: 'Revenue', render: (r) => `$${r.total_revenue.toLocaleString()}` },
    { key: 'margin', header: 'Profit %', render: (r) => `${r.profit_percentage.toFixed(1)}%` },
  ]

  return (
    <>
      <PageHeader title="Wastage Analytics" subtitle="Item-level wastage risk and revenue impact from wastage records" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Wastage Records" value={summary.total_records.toLocaleString()} icon={AlertTriangle} accent="#b54708" />
        <KpiCard label="Total Wastage Cost" value={`$${summary.total_wastage_cost.toLocaleString()}`} icon={DollarSign} accent="#d92d20" delay={60} />
        <KpiCard label="High Wastage Items" value={String(summary.high_wastage_items)} icon={PackageX} accent="#1d4ed8" delay={120} />
        <KpiCard label="Impossible Records Removed" value={summary.impossible_removed?.toLocaleString() ?? '—'} icon={Eraser} accent="#0d9459" delay={180} />
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

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <ChartCard title="Wastage Trend" subtitle="Monthly wastage cost and quantity" height={300}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="cost" tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${Math.round(v / 1000)}k`} />
              <YAxis yAxisId="qty" orientation="right" tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => Number(v).toLocaleString()} />
              <Line yAxisId="cost" type="monotone" dataKey="cost" stroke="#d92d20" strokeWidth={2.2} dot={false} name="Cost ($)" />
              <Line yAxisId="qty" type="monotone" dataKey="quantity" stroke="#1d4ed8" strokeWidth={2} dot={false} name="Quantity" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="High-Wastage Locations" subtitle="Total wastage cost by restaurant" height={300}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byLocation.slice(0, 10)} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${Math.round(v / 1000)}k`} />
              <YAxis type="category" dataKey="restaurant_name" width={150} tick={{ fontSize: 9, fill: '#686d8c' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => `$${Number(v).toLocaleString()}`} />
              <Bar dataKey="cost" fill="#b54708" radius={[0, 5, 5, 0]} barSize={13} name="Wastage cost" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </>
  )
}
