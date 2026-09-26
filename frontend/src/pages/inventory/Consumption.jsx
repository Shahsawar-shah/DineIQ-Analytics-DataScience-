import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts'
import PageHeader from '../../components/layout/PageHeader'
import ChartCard from '../../components/charts/ChartCard'
import { CONSUMPTION_TREND, INVENTORY, fmtNum } from '../../data/mockData'

const CATS = [...new Set(INVENTORY.map((i) => i.category))]

export default function Consumption() {
  const catUsage = CATS.map((c, i) => ({
    name: c,
    units: INVENTORY.filter((x) => x.category === c).reduce((s, x) => s + x.consumption30d, 0),
    color: ['#f95d0b', '#1d4ed8', '#0d9459', '#f9a825', '#6938ef', '#e11d48'][i % 6],
  }))

  return (
    <>
      <PageHeader title="Consumption" subtitle="Usage velocity across the inventory" demo />

      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="Weekly Consumption vs Stock" subtitle="All locations, last 4 weeks">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={CONSUMPTION_TREND}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#878ba7' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#878ba7' }} axisLine={false} tickLine={false} />
                <RTooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="consumption" stroke="#f95d0b" strokeWidth={2.6} name="Consumption" />
                <Line type="monotone" dataKey="stock" stroke="#1d4ed8" strokeWidth={2} strokeDasharray="5 4" name="Stock on hand" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="30-Day Usage by Category" subtitle="Total units consumed">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={catUsage}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#878ba7' }} axisLine={false} tickLine={false} interval={0} />
                <YAxis tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} />
                <RTooltip />
                <Bar dataKey="units" radius={[6, 6, 0, 0]} name="Units (30d)">
                  {catUsage.map((c, i) => <Cell key={i} fill={c.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="card mt-5 p-2 sm:p-4">
        <div className="flex items-center justify-between px-2 pb-3 pt-1">
          <h3 className="font-display text-sm font-bold text-ink-900">Item-level Consumption (30 days)</h3>
          <span className="badge badge-violet">Demo / Mock Data</span>
        </div>
        <div className="overflow-x-auto">
          <table className="dq-table">
            <thead><tr><th>Item</th><th>Category</th><th>Avg Daily Use</th><th>30d Usage</th><th>Days of Cover</th></tr></thead>
            <tbody>
              {INVENTORY.map((i) => {
                const daily = i.consumption30d / 30
                const cover = daily > 0 ? Math.floor(i.stock / daily) : Infinity
                return (
                  <tr key={i.id}>
                    <td className="font-semibold text-ink-900">{i.item}</td>
                    <td>{i.category}</td>
                    <td>{daily.toFixed(1)} {i.unit}/day</td>
                    <td>{fmtNum(i.consumption30d)} {i.unit}</td>
                    <td className={cover < 21 ? 'font-bold text-rose-600' : 'text-ink-600'}>
                      {cover === Infinity ? '∞' : `${cover} days`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
