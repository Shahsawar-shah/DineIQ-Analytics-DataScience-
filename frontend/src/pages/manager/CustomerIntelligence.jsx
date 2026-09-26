import { useEffect, useState } from 'react'
import { Gem, TrendingUp, TriangleAlert, Users } from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { api } from '../../services/api'
import PageHeader from '../../components/layout/PageHeader'
import KpiCard from '../../components/ui/KpiCard'
import ChartCard from '../../components/charts/ChartCard'
import DataTable from '../../components/ui/DataTable'
import LoadingState, { ErrorState } from '../../components/ui/LoadingState'

const SEGMENT_COLORS = {
  'High-Value Loyal': '#0d9459',
  'Occasional': '#1d4ed8',
  'Promotion-Driven': '#f9a825',
  'At-Risk': '#d92d20',
  'New': '#6938ef',
}

export default function CustomerIntelligence() {
  const [summary, setSummary] = useState(null)
  const [segments, setSegments] = useState([])
  const [rfm, setRfm] = useState([])
  const [atRisk, setAtRisk] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sum, segs, rfmData, riskData] = await Promise.all([
          api.customers.summary(),
          api.customers.segments(),
          api.customers.rfm(15),
          api.customers.atRisk(10),
        ])
        setSummary(sum)
        setSegments(segs)
        setRfm(rfmData)
        setAtRisk(riskData)
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

  const rfmColumns = [
    { key: 'id', header: 'Customer ID', render: (r) => `#${r.customer_id}` },
    { key: 'segment', header: 'Segment', render: (r) => <span className="badge" style={{ background: `${SEGMENT_COLORS[r.customer_segment] ?? '#878ba7'}1a`, color: SEGMENT_COLORS[r.customer_segment] ?? '#878ba7' }}>{r.customer_segment}</span> },
    { key: 'rfm', header: 'RFM Score', render: (r) => <span className="badge badge-green">⭐ {r.rfm_score}</span> },
    { key: 'monetary', header: 'Monetary Value', render: (r) => `$${r.monetary_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
    { key: 'aov', header: 'Avg Order Value', render: (r) => `$${r.avg_order_value.toFixed(2)}` },
  ]

  const atRiskColumns = [
    { key: 'code', header: 'Customer', render: (r) => r.customer_code },
    { key: 'city', header: 'City', render: (r) => r.city },
    { key: 'channel', header: 'Channel', render: (r) => r.preferred_channel },
    { key: 'rfm', header: 'RFM', render: (r) => r.rfm_score },
    { key: 'recency', header: 'Days Since Last Visit', render: (r) => <span className="badge badge-red">{Math.round(r.recency_days)}d</span> },
    { key: 'value', header: 'Monetary Value', render: (r) => `$${r.monetary_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
  ]

  return (
    <>
      <PageHeader title="Customer Intelligence" subtitle="RFM segmentation and churn signals — live from customer data" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Customers" value={summary.total_customers.toLocaleString()} icon={Users} accent="#1d4ed8" />
        <KpiCard label="High-Value" value={summary.high_value_count.toLocaleString()} icon={Gem} accent="#0d9459" delay={60} />
        <KpiCard label="At-Risk" value={summary.at_risk_count.toLocaleString()} icon={TriangleAlert} accent="#d92d20" delay={120} />
        <KpiCard label="Avg RFM Score" value={summary.avg_rfm_score.toFixed(1)} icon={TrendingUp} accent="#6938ef" delay={180} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <ChartCard title="Customer Segments" subtitle="Distribution by segment">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={segments} dataKey="count" nameKey="segment" innerRadius={64} outerRadius={98} paddingAngle={4} strokeWidth={0}>
                  {segments.map((entry) => (
                    <Cell key={entry.segment} fill={SEGMENT_COLORS[entry.segment] ?? '#878ba7'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5">
            {segments.map((s) => (
              <div key={s.segment} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-ink-500">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: SEGMENT_COLORS[s.segment] ?? '#878ba7' }} />
                  {s.segment}
                </span>
                <span className="font-bold text-ink-900">{s.count.toLocaleString()} ({s.percentage}%)</span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="At-Risk Customers" subtitle="Highest churn risk — longest since last visit">
          <DataTable columns={atRiskColumns} rows={atRisk} rowKey={(r) => r.customer_id} maxHeight="360px" />
        </ChartCard>
      </div>

      <ChartCard title="Top RFM Customers" subtitle="Highest recency · frequency · monetary scores" className="mt-5">
        <DataTable columns={rfmColumns} rows={rfm} rowKey={(r) => r.customer_id} maxHeight="480px" />
      </ChartCard>
    </>
  )
}
