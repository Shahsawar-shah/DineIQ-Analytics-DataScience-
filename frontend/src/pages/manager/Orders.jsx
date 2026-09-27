import { useEffect, useState } from 'react'
import { Calendar, Clock, ShoppingBag, XCircle } from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { api } from '../../services/api'
import PageHeader from '../../components/layout/PageHeader'
import KpiCard from '../../components/ui/KpiCard'
import ChartCard from '../../components/charts/ChartCard'
import { InsightCard } from '../../components/ui/InsightCard'
import LoadingState, { ErrorState } from '../../components/ui/LoadingState'

const CHANNEL_COLORS = {
  'Dine-in': '#f95d0b',
  Takeaway: '#1d4ed8',
  App: '#6938ef',
  Delivery: '#0d9459',
}

export default function Orders() {
  const [summary, setSummary] = useState(null)
  const [byChannel, setByChannel] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sum, channels] = await Promise.all([api.orders.summary(), api.orders.byChannel()])
        setSummary(sum)
        setByChannel(channels)
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

  return (
    <>
      <PageHeader
        title="Orders & Channel Analysis"
        subtitle="Order volume, cancellations and channel mix"
        actions={<span className="badge badge-green"><span className="live-dot mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live data feed</span>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Total Orders" value={summary.total_orders.toLocaleString()} icon={ShoppingBag} accent="#f95d0b" />
        <KpiCard label="Cancelled" value={summary.cancelled_orders.toLocaleString()} icon={XCircle} accent="#d92d20" delay={60} />
        <KpiCard label="Date Range" value={`${summary.date_range.start} → ${summary.date_range.end}`} icon={Calendar} accent="#1d4ed8" delay={120} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <ChartCard title="Channel Distribution" subtitle="Share of orders by channel">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byChannel} dataKey="count" nameKey="channel" innerRadius={64} outerRadius={98} paddingAngle={4} strokeWidth={0}>
                  {byChannel.map((entry) => (
                    <Cell key={entry.channel} fill={CHANNEL_COLORS[entry.channel] ?? '#878ba7'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5">
            {byChannel.map((c) => (
              <div key={c.channel} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-ink-500">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: CHANNEL_COLORS[c.channel] ?? '#878ba7' }} />
                  {c.channel}
                </span>
                <span className="font-bold text-ink-900">{c.count.toLocaleString()} ({c.percentage}%)</span>
              </div>
            ))}
          </div>
        </ChartCard>

        <div className="space-y-4">
          <InsightCard tone="info" title="Peak Analysis" text={summary.peak_analysis.description} meta="Ordering pattern" />
          <InsightCard tone="success" title="Weekend Boost" text={summary.peak_analysis.weekend_boost} meta="Ordering pattern" delay={60} />
          <div className="card flex items-center gap-3 p-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-500"><Clock size={18} /></div>
            <p className="text-xs text-ink-500">Cancellation rate: <span className="font-bold text-ink-900">{((summary.cancelled_orders / summary.total_orders) * 100).toFixed(1)}%</span> of all orders</p>
          </div>
        </div>
      </div>
    </>
  )
}
