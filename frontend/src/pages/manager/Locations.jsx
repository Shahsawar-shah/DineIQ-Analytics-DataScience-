import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../../services/api'
import PageHeader from '../../components/layout/PageHeader'
import ChartCard from '../../components/charts/ChartCard'
import DataTable from '../../components/ui/DataTable'
import LoadingState, { ErrorState } from '../../components/ui/LoadingState'

export default function Locations() {
  const [locations, setLocations] = useState([])
  const [top, setTop] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [all, topFive] = await Promise.all([api.locations.summary(), api.locations.top(5)])
        setLocations(all)
        setTop(topFive)
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

  const columns = [
    { key: 'name', header: 'Restaurant Name', render: (r) => <span className="font-semibold text-ink-900">{r.restaurant_name}</span> },
    { key: 'city', header: 'City', render: (r) => r.location_city },
    { key: 'revenue', header: 'Revenue', align: 'right', render: (r) => `$${r.total_revenue.toLocaleString()}` },
    { key: 'orders', header: 'Orders', align: 'right', render: (r) => r.total_orders.toLocaleString() },
    { key: 'rating', header: 'Avg Rating', align: 'right', render: (r) => <span className="inline-flex items-center justify-end gap-1"><Star size={12} className="fill-amber-400 text-amber-400" />{r.avg_rating.toFixed(2)}</span> },
    { key: 'wastage', header: 'Wastage Cost', align: 'right', render: (r) => `$${r.total_wastage_cost.toLocaleString()}` },
    { key: 'channel', header: 'Top Channel', render: (r) => <span className="badge badge-blue">{r.top_channel}</span> },
  ]

  return (
    <>
      <PageHeader
        title="Location Comparison"
        subtitle="Revenue, orders and wastage across every restaurant"
        actions={<span className="badge badge-green"><span className="live-dot mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live data feed</span>}
      />

      <ChartCard title="Top 5 Locations by Revenue" subtitle="Highest earning restaurants">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={top} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
              <YAxis dataKey="restaurant_name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#686d8c', fontSize: 11 }} width={150} />
              <Tooltip formatter={(v) => `$${Number(v).toLocaleString()}`} />
              <Bar dataKey="total_revenue" fill="#f95d0b" radius={[0, 6, 6, 0]} name="Revenue ($)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="All Locations" subtitle={`${locations.length} restaurants`} className="mt-5">
        <DataTable columns={columns} rows={locations} rowKey={(r) => r.restaurant_id} maxHeight="520px" />
      </ChartCard>
    </>
  )
}
