/** Consistent page header for dashboard inner pages. */
export default function PageHeader({ title, subtitle, actions, demo }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-xl font-extrabold text-ink-900 sm:text-2xl">{title}</h1>
          {demo && <span className="badge badge-violet">Demo / Mock Data</span>}
        </div>
        {subtitle && <p className="mt-1 text-sm text-ink-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
