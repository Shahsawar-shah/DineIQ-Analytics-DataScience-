import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts'
import { api } from '../../services/api'
import { API_BASE_URL } from '../../config/api'
import PageHeader from '../../components/layout/PageHeader'
import ChartCard from '../../components/charts/ChartCard'
import DataTable from '../../components/ui/DataTable'
import LoadingState, { ErrorState } from '../../components/ui/LoadingState'
import { fmtNum } from '../../utils/helpers'

const STATUS_BADGE = { success: 'badge-green', failed: 'badge-red', running: 'badge-blue', stale: 'badge-amber' }

function StatusCard({ title, ok, status, rows }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-ink-400">{title}</p>
        <span className={`badge flex items-center gap-1 ${ok ? 'badge-green' : 'badge-red'}`}>
          {ok ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />} {status}
        </span>
      </div>
      <div className="mt-3 space-y-1">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3 text-xs">
            <span className="text-ink-400">{label}</span>
            <span className="truncate font-semibold text-ink-900">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

async function pingHealth() {
  const url = API_BASE_URL.replace(/\/api$/, '') + '/health'
  const started = performance.now()
  const res = await fetch(url)
  return { ok: res.ok, ms: Math.round(performance.now() - started) }
}

export default function AdminSystemMonitoring() {
  const [refresh, setRefresh] = useState(0)
  const [state, setState] = useState({ loading: true })

  useEffect(() => {
    setState((s) => ({ ...s, loading: true }))
    Promise.allSettled([pingHealth(), api.admin.sparkJobs(100), api.auth.users(), api.admin.auditLogs({ limit: 500 }), api.dashboard.mlMetrics()])
      .then(([health, jobs, users, audit, ml]) => {
        const v = (r) => (r.status === 'fulfilled' ? r.value : null)
        setState({
          loading: false,
          health: v(health), jobs: v(jobs), users: v(users), audit: v(audit), ml: v(ml),
          jobsError: jobs.status === 'rejected' ? jobs.reason?.message : null,
        })
      })
  }, [refresh])

  if (state.loading && !state.jobs) return <LoadingState />
  const { health, jobs, users, audit, ml } = state

  // API latency from real audit-log durations, averaged per endpoint section
  const latency = Object.values((audit?.logs ?? []).reduce((acc, l) => {
    const key = l.endpoint.split('/')[2] ?? 'root'
    acc[key] = acc[key] ?? { section: key, total: 0, n: 0, max: 0 }
    acc[key].total += l.duration_ms ?? 0
    acc[key].n += 1
    acc[key].max = Math.max(acc[key].max, l.duration_ms ?? 0)
    return acc
  }, {})).map((r) => ({ section: r.section, avg: Math.round(r.total / r.n), max: Math.round(r.max), requests: r.n }))

  const jobDurations = (jobs?.latest_by_job ?? []).map((j) => ({ job: j.job_name, seconds: j.duration_seconds ?? 0 }))

  const jobColumns = [
    { key: 'name', header: 'Job', render: (r) => <span className="font-semibold text-ink-900">{r.job_name}</span> },
    { key: 'status', header: 'Status', render: (r) => <span className={`badge ${STATUS_BADGE[r.status] ?? 'badge-gray'}`}>{r.status}</span> },
    { key: 'start', header: 'Started', render: (r) => r.started_at?.replace('T', ' ') },
    { key: 'end', header: 'Finished', render: (r) => r.finished_at?.replace('T', ' ') ?? '—' },
    { key: 'dur', header: 'Duration', align: 'right', render: (r) => (r.duration_seconds === null ? '—' : `${r.duration_seconds} s`) },
    { key: 'in', header: 'Records processed', align: 'right', render: (r) => fmtNum(r.records_processed) },
    { key: 'out', header: 'Records output', align: 'right', render: (r) => fmtNum(r.records_output) },
    { key: 'spark', header: 'Spark', render: (r) => r.spark_version ?? '—' },
    { key: 'err', header: 'Error', render: (r) => <span className="text-xs text-rose-600">{r.error ?? ''}</span> },
  ]

  const cards = [
    {
      title: 'API', ok: !!health?.ok, status: health?.ok ? 'Healthy' : 'Unreachable',
      rows: [['Base URL', API_BASE_URL], ['Health check round trip', health ? `${health.ms} ms` : '—'], ['Framework', 'FastAPI']],
    },
    {
      title: 'Database', ok: !!users && !!audit, status: users && audit ? 'Connected' : 'Error',
      rows: [['Engine', 'PostgreSQL'], ['User accounts', users ? fmtNum(users.length) : '—'], ['Audit events', audit ? fmtNum(audit.total) : '—']],
    },
    {
      title: 'Spark Jobs', ok: !!jobs && jobs.failed_runs === 0, status: jobs ? (jobs.failed_runs ? `${jobs.failed_runs} failed` : 'All succeeded') : 'No log',
      rows: [
        ['Recorded runs', jobs ? fmtNum(jobs.total_runs) : '—'],
        ['Success rate', jobs?.success_rate_pct !== null && jobs?.success_rate_pct !== undefined ? `${jobs.success_rate_pct}%` : '—'],
        ['Last run', jobs?.runs?.[0] ? `${jobs.runs[0].job_name} · ${jobs.runs[0].started_at.replace('T', ' ')}` : '—'],
      ],
    },
    {
      title: 'ML Models', ok: !!ml, status: ml ? 'Trained' : 'Missing',
      rows: ml ? [
        ['Python best', `${ml.python_pipeline.best_model} (F1 ${ml.python_pipeline.models[ml.python_pipeline.best_model].f1_score.toFixed(2)})`],
        ['Spark best', `${ml.spark_pipeline.best_model} (F1 ${ml.spark_pipeline.models[ml.spark_pipeline.best_model].f1_score.toFixed(2)})`],
        ['Python version', ml.python_pipeline.model_version],
        ['Spark version', ml.spark_pipeline.model_version],
      ] : [['Status', 'Run the training pipelines']],
    },
  ]

  return (
    <>
      <PageHeader
        title="System Monitoring"
        subtitle="Live API, database, Spark job and model status"
        actions={<button className="btn btn-ghost !px-4 !py-2.5 text-xs" onClick={() => setRefresh((n) => n + 1)}><RefreshCw size={14} /> Refresh</button>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => <StatusCard key={c.title} {...c} />)}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <ChartCard title="API latency by endpoint group" subtitle={`From the last ${fmtNum(audit?.logs?.length ?? 0)} audited requests`} height={280}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={latency}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
              <XAxis dataKey="section" tick={{ fontSize: 9, fill: '#878ba7' }} axisLine={false} tickLine={false} interval={0} />
              <YAxis tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} unit=" ms" />
              <RTooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="avg" fill="#f95d0b" radius={[4, 4, 0, 0]} name="Average (ms)" />
              <Bar dataKey="max" fill="#1d4ed8" radius={[4, 4, 0, 0]} name="Max (ms)" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Spark job duration" subtitle="Latest run of each job, seconds" height={280}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={jobDurations} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#878ba7' }} axisLine={false} tickLine={false} unit=" s" />
              <YAxis type="category" dataKey="job" width={150} tick={{ fontSize: 10, fill: '#686d8c' }} axisLine={false} tickLine={false} />
              <RTooltip />
              <Bar dataKey="seconds" fill="#6938ef" radius={[0, 5, 5, 0]} name="Seconds" barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Spark job history" subtitle="Start / end time, status and records processed for every run" className="mt-5">
        {state.jobsError ? <ErrorState message={state.jobsError} /> : (
          <DataTable columns={jobColumns} rows={jobs?.runs ?? []} rowKey={(r) => r.job_id} maxHeight={480} emptyMessage="No Spark runs recorded yet." />
        )}
      </ChartCard>
    </>
  )
}
