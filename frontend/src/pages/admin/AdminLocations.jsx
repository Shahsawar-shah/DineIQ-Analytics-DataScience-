import { MapPin, Plus } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts'
import PageHeader from '../../components/layout/PageHeader'
import DataTable from '../../components/ui/DataTable'
import StatusBadge from '../../components/ui/StatusBadge'
import { LOCATIONS, fmtMoney, fmtNum } from '../../data/mockData'

export default function AdminLocations() {
  const columns = [
    {
      key: 'name',
      header: 'Location',
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-500"><MapPin size={15} /></span>
          <div>
            <p className="font-semibold text-ink-900">{r.name}</p>
            <p className="text-[0.68rem] text-ink-400">{r.city}</p>
          </div>
        </div>
      ),
    },
    { key: 'manager', header: 'Manager', render: (r) => r.manager },
    { key: 'orders', header: 'Orders (30d)', align: 'right', render: (r) => fmtNum(r.orders30d) },
    { key: 'revenue', header: 'Revenue (30d)', align: 'right', render: (r) => <span className="font-semibold">{fmtMoney(r.revenue30d)}</span> },
    {
      key: 'dq',
      header: 'Data Quality',
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="meter w-20"><span style={{ width: `${r.dataQuality}%`, background: 'linear-gradient(90deg,#34d399,#0d9459)' }} /></div>
          <span className="text-xs font-semibold">{r.dataQuality}%</span>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ]

  return (
    <>
      <PageHeader
        title="Restaurants / Locations"
        subtitle="Every site connected to the DineIQ data platform"
        demo
        actions={<button className="btn btn-primary !px-4 !py-2.5 text-xs"><Plus size={14} /> Add location</button>}
      />
      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <div className="card anim-fade-up p-4 sm:p-5">
          <h3 className="font-display mb-3 text-sm font-bold text-ink-900">Revenue by Location (30 days)</h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={LOCATIONS}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#878ba7' }} axisLine={false} tickLine={false} interval={0} />
                <YAxis tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} />
                <RTooltip />
                <Bar dataKey="revenue30d" fill="#f95d0b" radius={[6, 6, 0, 0]} name="Revenue ($)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card anim-fade-up p-4 sm:p-5" style={{ animationDelay: '90ms' }}>
          <h3 className="font-display mb-3 text-sm font-bold text-ink-900">Orders by Location (30 days)</h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={LOCATIONS}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#878ba7' }} axisLine={false} tickLine={false} interval={0} />
                <YAxis tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} />
                <RTooltip />
                <Bar dataKey="orders30d" fill="#1d4ed8" radius={[6, 6, 0, 0]} name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="card p-2 sm:p-4">
        <DataTable columns={columns} rows={LOCATIONS} rowKey={(r) => r.id} />
      </div>
    </>
  )
}
