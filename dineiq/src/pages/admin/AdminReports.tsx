import { useState } from 'react'
import { FileBarChart, FileSpreadsheet, FileText } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import ChartCard from '@/components/charts/ChartCard'
import StatusBadge from '@/components/ui/StatusBadge'
import { LOCATIONS } from '@/data/mockData'

const HISTORY = [
  { name: 'User Activity — September', type: 'PDF', generated: 'Sep 25, 09:44', by: 'System Administrator', status: 'Completed' },
  { name: 'Data Quality Summary Q3', type: 'Excel', generated: 'Sep 24, 16:20', by: 'System Administrator', status: 'Completed' },
  { name: 'Audit Trail — Sept week 3', type: 'CSV', generated: 'Sep 23, 11:02', by: 'Compliance Bot', status: 'Completed' },
  { name: 'Location Performance Pack', type: 'Excel', generated: 'Sep 22, 08:15', by: 'Dana Cole', status: 'Completed' },
]

/** Shared report generator used by all three report pages. */
export function ReportGenerator({ roleScope }: { roleScope: string }) {
  const [type, setType] = useState('PDF')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const generate = () => {
    setBusy(true)
    setDone(false)
    setTimeout(() => {
      setBusy(false)
      setDone(true)
      if (type === 'CSV') {
        const url = URL.createObjectURL(new Blob(['report,note\nDineIQ demo report,generated client-side'], { type: 'text/csv' }))
        const a = document.createElement('a')
        a.href = url
        a.download = 'dineiq-report.csv'
        a.click()
        URL.revokeObjectURL(url)
      }
    }, 800)
  }

  return (
    <div className="card anim-fade-up p-5">
      <h3 className="font-display mb-4 text-sm font-bold text-ink-900">Generate {roleScope} Report</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="label">Report type</label>
          <select className="input">
            <option>Sales Summary</option>
            <option>Data Quality</option>
            <option>User Activity</option>
            <option>System Health</option>
          </select>
        </div>
        <div>
          <label className="label">Date range</label>
          <select className="input">
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>This quarter</option>
            <option>Custom…</option>
          </select>
        </div>
        <div>
          <label className="label">Location</label>
          <select className="input">
            <option>All locations</option>
            {LOCATIONS.map((l) => <option key={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Format</label>
          <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
            <option>PDF</option>
            <option>Excel</option>
            <option>CSV</option>
          </select>
        </div>
      </div>
      <div className="mt-5 flex items-center gap-3">
        <button className="btn btn-primary !px-6 !py-2.5 text-xs" onClick={generate} disabled={busy}>
          {busy ? 'Generating…' : 'Generate report'}
        </button>
        {done && <span className="anim-pop text-xs font-bold text-emerald-600">Report ready — demo download triggered for CSV</span>}
      </div>
    </div>
  )
}

export default function AdminReports() {
  return (
    <>
      <PageHeader title="Reports" subtitle="Generate and export platform reports" demo />
      <ReportGenerator roleScope="Platform" />
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { icon: FileBarChart, label: 'Reports this month', value: '128' },
          { icon: FileSpreadsheet, label: 'Excel exports', value: '54' },
          { icon: FileText, label: 'PDF exports', value: '61' },
          { icon: FileText, label: 'Scheduled reports', value: '13' },
        ].map((s, i) => (
          <div key={s.label} className="card card-hover anim-fade-up flex items-center gap-3 p-4" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-500"><s.icon size={17} /></div>
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.1em] text-ink-400">{s.label}</p>
              <p className="font-display text-lg font-extrabold text-ink-900">{s.value}</p>
            </div>
          </div>
        ))}
      </div>
      <ChartCard title="Report History" subtitle="Recently generated exports" className="mt-5">
        <div className="overflow-x-auto">
          <table className="dq-table">
            <thead><tr><th>Report</th><th>Format</th><th>Generated</th><th>By</th><th>Status</th></tr></thead>
            <tbody>
              {HISTORY.map((h) => (
                <tr key={h.name}>
                  <td className="font-semibold text-ink-900">{h.name}</td>
                  <td><span className="badge badge-blue">{h.type}</span></td>
                  <td className="text-ink-500">{h.generated}</td>
                  <td>{h.by}</td>
                  <td><StatusBadge status={h.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </>
  )
}
