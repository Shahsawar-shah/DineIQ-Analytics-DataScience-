import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip as RTooltip } from 'recharts'
import PageHeader from '@/components/layout/PageHeader'
import ChartCard from '@/components/charts/ChartCard'
import StatusBadge from '@/components/ui/StatusBadge'
import { DATA_QUALITY } from '@/data/mockData'

const ISSUES = [
  { rule: 'Missing order totals', dataset: ' bronze.orders', affected: '0.4% rows', severity: 'Warning', status: 'Open' },
  { rule: 'Invalid item prices (<= 0)', dataset: 'silver.menu_items', affected: '2 rows', severity: 'Critical', status: 'Resolved' },
  { rule: 'Duplicate customer emails', dataset: 'gold.customers', affected: '7 rows', severity: 'Warning', status: 'Investigating' },
  { rule: 'Stale inventory sync (> 1h)', dataset: 'bronze.inventory', affected: '1 source', severity: 'Warning', status: 'Open' },
  { rule: 'Rating outside 0–5 range', dataset: 'silver.ratings', affected: '0 rows', severity: 'Normal', status: 'Resolved' },
  { rule: 'Late delivery records', dataset: 'bronze.deliveries', affected: '0.9% rows', severity: 'Warning', status: 'Open' },
]

export default function AdminDataQuality() {
  const avg = Math.round(DATA_QUALITY.reduce((s, d) => s + d.score, 0) / DATA_QUALITY.length)
  return (
    <>
      <PageHeader title="Data Quality" subtitle="Composite quality scoring across the data lake" demo />
      <div className="grid gap-5 lg:grid-cols-3">
        <ChartCard title="Quality Radar" subtitle="Six SRS quality dimensions">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={DATA_QUALITY} outerRadius="72%">
                <PolarGrid stroke="#e5e7f0" />
                <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 10, fill: '#686d8c' }} />
                <RTooltip />
                <Radar dataKey="score" stroke="#f95d0b" fill="#f95d0b" fillOpacity={0.28} name="Score %" />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Dimension Scores" subtitle="Current cycle">
          <div className="space-y-4 pt-2">
            {DATA_QUALITY.map((d, i) => (
              <div key={d.dimension}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-semibold text-ink-700">{d.dimension}</span>
                  <span className="font-bold text-ink-900">{d.score}%</span>
                </div>
                <div className="meter">
                  <span
                    style={{
                      width: `${d.score}%`,
                      background: d.score >= 95 ? 'linear-gradient(90deg,#34d399,#0d9459)' : d.score >= 90 ? 'linear-gradient(90deg,#fbbf24,#d97706)' : 'linear-gradient(90deg,#fb7185,#e11d48)',
                      transitionDelay: `${i * 90}ms`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Composite Score" subtitle="Weighted average">
          <div className="flex h-full flex-col items-center justify-center py-8">
            <div className="relative grid h-40 w-40 place-items-center">
              <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
                <circle cx="60" cy="60" r="52" fill="none" stroke="#f0f1f6" strokeWidth="10" />
                <circle
                  cx="60" cy="60" r="52" fill="none" stroke="#0d9459" strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={`${(avg / 100) * 327} 327`}
                />
              </svg>
              <div className="text-center">
                <p className="font-display text-4xl font-extrabold text-ink-900">{avg}%</p>
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-ink-400">Overall</p>
              </div>
            </div>
            <span className="badge badge-green mt-4">Grade A — publication ready</span>
          </div>
        </ChartCard>
      </div>

      <div className="card mt-5 p-4 sm:p-5">
        <h3 className="font-display mb-4 text-sm font-bold text-ink-900">Quality Rule Results</h3>
        <div className="overflow-x-auto">
          <table className="dq-table">
            <thead><tr><th>Rule</th><th>Dataset</th><th>Affected</th><th>Severity</th><th>Status</th></tr></thead>
            <tbody>
              {ISSUES.map((i) => (
                <tr key={i.rule}>
                  <td className="font-medium text-ink-800">{i.rule}</td>
                  <td><code className="rounded bg-ink-50 px-1.5 py-0.5 text-[0.7rem]">{i.dataset}</code></td>
                  <td className="text-ink-500">{i.affected}</td>
                  <td><StatusBadge status={i.severity === 'Critical' ? 'Critical' : i.severity === 'Warning' ? 'Warning' : 'Normal'} /></td>
                  <td><StatusBadge status={i.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
