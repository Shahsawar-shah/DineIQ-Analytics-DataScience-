import { Check, Minus, ShieldCheck } from 'lucide-react'
import PageHeader from '../../components/layout/PageHeader'
import { ROLE_DISTRIBUTION, fmtNum } from '../../data/mockData'

const MATRIX = {
  permissions: [
    'View dashboards',
    'Manage users & roles',
    'Manage locations',
    'View sales analytics',
    'Edit menu & pricing',
    'Manage inventory',
    'Approve purchase orders',
    'Export reports',
    'Run what-if simulation',
    'View audit logs',
  ],
  roles: ['Customer', 'Restaurant Manager', 'Inventory Manager', 'Admin'],
  grants: {
    'Customer':            [true, false, false, false, false, false, false, false, false, false],
    'Restaurant Manager':  [true, false, false, true, true, false, false, true, true, false],
    'Inventory Manager':   [true, false, false, false, false, true, true, true, false, false],
    'Admin':               [true, true, true, true, true, true, true, true, true, true],
  },
}

export default function AdminRoles() {
  return (
    <>
      <PageHeader title="Role Management" subtitle="The four SRS roles and their platform permissions" demo />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {ROLE_DISTRIBUTION.map((r, i) => (
          <div key={r.name} className="card card-hover anim-fade-up p-5" style={{ animationDelay: `${i * 70}ms` }}>
            <div className="mb-3 flex items-center justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-xl text-white" style={{ background: r.color }}>
                <ShieldCheck size={18} />
              </span>
              <span className="font-display text-2xl font-extrabold text-ink-900">{fmtNum(r.value)}</span>
            </div>
            <p className="text-sm font-bold text-ink-900">{r.name}</p>
            <p className="mt-1 text-xs text-ink-400">
              {r.name === 'Customers' && 'Browse, order, rate, receive recommendations'}
              {r.name === 'Restaurant Managers' && 'Full business intelligence suite'}
              {r.name === 'Inventory Managers' && 'Stock, wastage & purchase planning'}
              {r.name === 'Admins' && 'Platform administration & monitoring'}
            </p>
          </div>
        ))}
      </div>

      <div className="card mt-5 p-4 sm:p-5">
        <h3 className="font-display mb-4 text-sm font-bold text-ink-900">Permission Matrix</h3>
        <div className="overflow-x-auto">
          <table className="dq-table">
            <thead>
              <tr>
                <th>Permission</th>
                {MATRIX.roles.map((r) => <th key={r} className="!text-center">{r}</th>)}
              </tr>
            </thead>
            <tbody>
              {MATRIX.permissions.map((p, pi) => (
                <tr key={p}>
                  <td className="font-medium text-ink-800">{p}</td>
                  {MATRIX.roles.map((r) => (
                    <td key={r} className="!text-center">
                      {MATRIX.grants[r][pi] ? (
                        <Check size={16} className="mx-auto text-emerald-500" />
                      ) : (
                        <Minus size={16} className="mx-auto text-ink-200" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 rounded-xl bg-violet-50 p-3 text-xs text-violet-700">
          Demo matrix — in production these permissions map to backend authorization policies from the SRS.
        </p>
      </div>
    </>
  )
}
