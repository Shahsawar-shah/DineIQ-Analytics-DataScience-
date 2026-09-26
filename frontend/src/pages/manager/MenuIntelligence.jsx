import { useEffect, useMemo, useState } from 'react'
import { Flame, Gem, TrendingUp, TriangleAlert } from 'lucide-react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../../services/api'
import PageHeader from '../../components/layout/PageHeader'
import KpiCard from '../../components/ui/KpiCard'
import ChartCard from '../../components/charts/ChartCard'
import DataTable from '../../components/ui/DataTable'
import LoadingState, { ErrorState } from '../../components/ui/LoadingState'

const TABS = ['All', 'Profit Driver', 'Volume Driver', 'Hidden Opportunity', 'Low Performer']

const CLASS_TONE = {
  'Profit Driver': 'badge-green',
  'Volume Driver': 'badge-blue',
  'Hidden Opportunity': 'badge-amber',
  'Low Performer': 'badge-red',
}

// Small static reference table (processed_data/menu_categories_clean.csv) — no /categories API exists yet.
const CATEGORY_NAMES = {
  1: 'Appetizers', 2: 'Main Course', 3: 'Beverages', 4: 'Desserts', 5: 'Soups',
  6: 'Salads', 7: 'Grills', 8: 'Seafood', 9: 'Pasta', 10: 'Breakfast',
}

export default function MenuIntelligence() {
  const [items, setItems] = useState([])
  const [classifications, setClassifications] = useState([])
  const [topItems, setTopItems] = useState([])
  const [highWastage, setHighWastage] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('All')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [itemsData, clsData, top, waste] = await Promise.all([
          api.menu.items(),
          api.menu.classifications(),
          api.menu.topRevenue(10),
          api.menu.highWastage(5),
        ])
        setItems(itemsData)
        setClassifications(clsData)
        setTopItems(top)
        setHighWastage(waste)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Merge menu features (revenue/profit/rating/wastage) with the ML classification for each item_id.
  const mergedItems = useMemo(() => {
    const classById = new Map(classifications.map((c) => [c.item_id, c]))
    return items.map((item) => {
      const cls = classById.get(item.item_id)
      return {
        ...item,
        python_class: cls?.python_class ?? 'Unclassified',
        python_probability: cls?.python_probability ?? 0,
      }
    })
  }, [items, classifications])

  const counts = useMemo(() => {
    const c = { 'Profit Driver': 0, 'Volume Driver': 0, 'Hidden Opportunity': 0, 'Low Performer': 0 }
    classifications.forEach((row) => {
      if (c[row.python_class] !== undefined) c[row.python_class] += 1
    })
    return c
  }, [classifications])

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />

  const tableData = activeTab === 'All' ? mergedItems : mergedItems.filter((i) => i.python_class === activeTab)

  const tableColumns = [
    { key: 'name', header: 'Item Name', render: (r) => r.item_name },
    { key: 'category', header: 'Category', render: (r) => CATEGORY_NAMES[r.category_id] ?? `Category ${r.category_id}` },
    { key: 'revenue', header: 'Revenue', render: (r) => `$${r.total_revenue.toLocaleString()}` },
    { key: 'margin', header: 'Profit %', render: (r) => `${r.profit_percentage.toFixed(1)}%` },
    { key: 'rating', header: 'Rating', render: (r) => `⭐ ${r.avg_rating.toFixed(1)}` },
    { key: 'wastage', header: 'Wastage %', render: (r) => `${r.wastage_percentage.toFixed(1)}%` },
    { key: 'class', header: 'Class', render: (r) => <span className={`badge ${CLASS_TONE[r.python_class] ?? 'badge-gray'}`}>{r.python_class}</span> },
    { key: 'prob', header: 'Confidence', render: (r) => `${(r.python_probability * 100).toFixed(0)}%` },
  ]

  const wasteColumns = [
    { key: 'name', header: 'Item Name', render: (r) => r.item_name },
    {
      key: 'wastage',
      header: 'Wastage',
      render: (r) => (
        <span className="badge badge-red">
          {r.wastage_percentage > 50 && '⚠️ '}
          {r.wastage_percentage.toFixed(1)}%
        </span>
      ),
    },
    { key: 'revenue', header: 'Revenue', render: (r) => `$${r.total_revenue.toLocaleString()}` },
  ]

  return (
    <>
      <PageHeader title="Menu Intelligence" subtitle="Classification, revenue and wastage by menu item" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Profit Drivers" value={`${counts['Profit Driver']} items`} icon={Flame} accent="#0d9459" />
        <KpiCard label="Volume Drivers" value={`${counts['Volume Driver']} items`} icon={TrendingUp} accent="#1d4ed8" delay={60} />
        <KpiCard label="Hidden Opportunities" value={`${counts['Hidden Opportunity']} items`} icon={Gem} accent="#b54708" delay={120} />
        <KpiCard label="Low Performers" value={`${counts['Low Performer']} items`} icon={TriangleAlert} accent="#d92d20" delay={180} />
      </div>

      <ChartCard title="Menu Items" subtitle="Filter by performance class" className="mt-5">
        <div className="mb-4 flex flex-wrap gap-2 border-b border-ink-100 pb-4">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`chip ${activeTab === tab ? 'chip-active' : ''}`}
            >
              {tab}
            </button>
          ))}
        </div>
        <DataTable columns={tableColumns} rows={tableData} rowKey={(r) => r.item_id} maxHeight="520px" />
      </ChartCard>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <ChartCard title="Top 10 Revenue" subtitle="Highest earning items">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topItems} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="item_name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#878ba7', fontSize: 11 }} width={130} />
                <Tooltip formatter={(v) => `$${Number(v).toLocaleString()}`} />
                <Bar dataKey="total_revenue" fill="#f95d0b" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="High Wastage Warning" subtitle="Items above the wastage threshold">
          <DataTable columns={wasteColumns} rows={highWastage} rowKey={(r) => r.item_id} />
        </ChartCard>
      </div>
    </>
  )
}
