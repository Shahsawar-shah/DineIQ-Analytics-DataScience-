import { useEffect, useState } from 'react'
import { AlertTriangle, Gauge, Siren, TriangleAlert } from 'lucide-react'
import { api } from '../../services/api'
import PageHeader from '../../components/layout/PageHeader'
import KpiCard from '../../components/ui/KpiCard'
import DataTable from '../../components/ui/DataTable'
import LoadingState, { ErrorState } from '../../components/ui/LoadingState'

const SEVERITY_TONE = {
  Critical: 'badge-red',
  High: 'badge-orange',
  Medium: 'badge-amber',
}

export default function AnomalyDetection() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.anomalies
      .sales()
      .then((res) => setData(res))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />

  const columns = [
    { key: 'name', header: 'Item Name', render: (r) => <span className="font-semibold text-ink-900">{r.item_name}</span> },
    { key: 'type', header: 'Type', render: (r) => r.type },
    { key: 'severity', header: 'Severity', render: (r) => <span className={`badge ${SEVERITY_TONE[r.severity] ?? 'badge-gray'}`}>{r.severity}</span> },
    { key: 'value', header: 'Value', align: 'right', render: (r) => r.value },
    { key: 'description', header: 'Description', render: (r) => <span className="text-ink-500">{r.description}</span> },
  ]

  return (
    <>
      <PageHeader
        title="Anomaly Detection"
        subtitle="Automatic deviation scoring across sales, margin and rating signals"
        actions={<span className="badge badge-green"><span className="live-dot mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live data feed</span>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Anomalies" value={String(data.total)} icon={Gauge} accent="#6938ef" />
        <KpiCard label="Critical" value={String(data.critical)} icon={Siren} accent="#d92d20" delay={60} />
        <KpiCard label="High" value={String(data.high)} icon={AlertTriangle} accent="#e6650f" delay={120} />
        <KpiCard label="Medium" value={String(data.medium)} icon={TriangleAlert} accent="#eab308" delay={180} />
      </div>

      <div className="card mt-5 p-2 sm:p-4">
        <div className="flex items-center justify-between px-2 pb-3 pt-1">
          <h3 className="font-display text-sm font-bold text-ink-900">Detected Anomalies</h3>
          <span className="badge badge-green">{data.anomalies.length} found</span>
        </div>
        <DataTable columns={columns} rows={data.anomalies} rowKey={(r) => `${r.item_id}-${r.type}`} emptyMessage="No anomalies detected." />
      </div>
    </>
  )
}
