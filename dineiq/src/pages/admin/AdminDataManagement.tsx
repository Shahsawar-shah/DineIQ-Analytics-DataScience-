import { CloudUpload, Database, FileSpreadsheet, RefreshCw, Server } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'

const SOURCES = [
  { name: 'POS Transactions', type: 'Rest API', status: 'Connected', frequency: 'Every 5 min', lastSync: '10:02', volume: '1.2M rows/mo', icon: Server },
  { name: 'Menu & Recipes', type: 'SFTP CSV', status: 'Connected', frequency: 'Daily 01:00', lastSync: '01:00', volume: '14 items', icon: FileSpreadsheet },
  { name: 'Inventory Ledger', type: 'Rest API', status: 'Connected', frequency: 'Every 15 min', lastSync: '09:45', volume: '86k rows/mo', icon: Database },
  { name: 'Loyalty & Customers', type: 'Webhook', status: 'Connected', frequency: 'Real-time', lastSync: '10:04', volume: '879 profiles', icon: CloudUpload },
  { name: 'Delivery Platforms', type: 'Partner API', status: 'Sync Issue', frequency: 'Hourly', lastSync: '08:00', volume: '214k rows/mo', icon: Server },
]

const JOBS = [
  { name: 'bronze_ingest_orders', pipeline: 'Python + Spark', status: 'Succeeded', duration: '1m 42s', schedule: 'Every 5 min' },
  { name: 'silver_cleanse_menu', pipeline: 'PySpark', status: 'Succeeded', duration: '48s', schedule: 'Daily 01:30' },
  { name: 'gold_feature_store', pipeline: 'Spark SQL', status: 'Running', duration: '3m 10s…', schedule: 'Every 30 min' },
  { name: 'ml_train_forecast', pipeline: 'Python / XGBoost', status: 'Succeeded', duration: '8m 04s', schedule: 'Daily 03:00' },
  { name: 'ml_score_churn', pipeline: 'Python / Scikit-learn', status: 'Queued', duration: '—', schedule: 'Daily 04:00' },
]

export default function AdminDataManagement() {
  return (
    <>
      <PageHeader
        title="Data Management"
        subtitle="Sources, ingestion jobs and pipeline health"
        demo
        actions={<button className="btn btn-primary !px-4 !py-2.5 text-xs"><RefreshCw size={14} /> Trigger re-ingestion</button>}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card anim-fade-up p-4 sm:p-5">
          <h3 className="font-display mb-4 text-sm font-bold text-ink-900">Connected Data Sources</h3>
          <div className="space-y-3">
            {SOURCES.map((s) => (
              <div key={s.name} className="flex items-center gap-3 rounded-xl border border-ink-100 p-3.5">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-500">
                  <s.icon size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink-900">{s.name}</p>
                  <p className="text-[0.68rem] text-ink-400">{s.type} · {s.frequency} · {s.volume}</p>
                </div>
                <div className="text-right">
                  <StatusBadge status={s.status === 'Connected' ? 'Healthy' : 'Warning'} />
                  <p className="mt-1 text-[0.65rem] text-ink-300">Last sync {s.lastSync}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card anim-fade-up p-4 sm:p-5" style={{ animationDelay: '90ms' }}>
          <h3 className="font-display mb-4 text-sm font-bold text-ink-900">Pipeline Jobs (mock)</h3>
          <div className="overflow-x-auto">
            <table className="dq-table">
              <thead><tr><th>Job</th><th>Engine</th><th>Status</th><th>Duration</th><th>Schedule</th></tr></thead>
              <tbody>
                {JOBS.map((j) => (
                  <tr key={j.name}>
                    <td><code className="rounded bg-ink-50 px-1.5 py-0.5 text-[0.7rem] font-semibold text-ink-700">{j.name}</code></td>
                    <td>{j.pipeline}</td>
                    <td><StatusBadge status={j.status === 'Succeeded' ? 'Completed' : j.status === 'Running' ? 'Preparing' : j.status === 'Queued' ? 'Scheduled' : 'Warning'} /></td>
                    <td className="text-ink-400">{j.duration}</td>
                    <td className="text-ink-400">{j.schedule}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 rounded-xl bg-violet-50 p-3 text-xs text-violet-700">
            The dual-pipeline architecture (Python + Spark/PySpark) from the SRS is represented here in mock
            form — no processing is executed in this frontend demo.
          </p>
        </div>
      </div>
    </>
  )
}
