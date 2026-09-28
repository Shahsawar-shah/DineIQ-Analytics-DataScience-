import { Check, Minus, ShieldCheck } from 'lucide-react'
import PageHeader from '../../components/layout/PageHeader'
import { api } from '../../services/api'
import useApi from '../../hooks/useApi'
import { fmtNum } from '../../utils/helpers'

// Mirrors the backend RBAC in backend/middleware/auth_middleware.py
const MATRIX = {
  permissions: [
    'View menu & orders',
    'View analytics dashboards',
    'Forecasting, basket & pricing analytics',
    'Run what-if simulation',
    'Export reports',
    'Manage users (non-admin roles)',
    'Assign Admin / Super Admin roles',
    'View audit logs & Spark job monitor',
  ],
  roles: ['Customer', 'Cashier', 'Restaurant Manager', 'Inventory Manager', 'Admin', 'Super Admin'],
  grants: {
    Customer:             [false, false, false, false, false, false, false, false],
    Cashier:              [true, false, false, false, false, false, false, false],
    'Restaurant Manager': [true, true, true, true, true, false, false, false],
    'Inventory Manager':  [true, true, true, true, true, false, false, false],
    Admin:                [true, true, true, true, true, true, false, true],
    'Super Admin':        [true, true, true, true, true, true, true, true],
  },
}

const ROLE_INFO = {
  Customer: 'Customer portal only',
  Cashier: 'Orders and menu only',
  'Restaurant Manager': 'Full business intelligence suite',
  'Inventory Manager': 'Stock, wastage, forecast and purchase planning',
  Admin: 'Platform administration and monitoring',
  'Super Admin': 'Everything, including granting admin roles',
  analyst: 'Legacy analytics account',
}
const ROLE_COLORS = ['#878ba7', '#f9a825', '#1d4ed8', '#0d9459', '#d92d20', '#6938ef', '#f95d0b']

export default function AdminRoles() {
  const users = useApi(() => api.auth.users())
  const counts = (users.data ?? []).reduce((acc, u) => ({ ...acc, [u.role]: (acc[u.role] ?? 0) + 1 }), {})
  const roles = [...MATRIX.roles, ...Object.keys(counts).filter((r) => !MATRIX.roles.includes(r))]

  return (
    <>
      <PageHeader title="Role Management" subtitle="Platform roles, live account counts and the permissions the API enforces" />
      {users.error && <p className="mb-3 text-xs text-rose-600">Could not load account counts: {users.error}</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {roles.map((name, i) => (
          <div key={name} className="card card-hover anim-fade-up p-5" style={{ animationDelay: `${i * 70}ms` }}>
            <div className="mb-3 flex items-center justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-xl text-white" style={{ background: ROLE_COLORS[i % ROLE_COLORS.length] }}>
                <ShieldCheck size={18} />
              </span>
              <span className="font-display text-2xl font-extrabold text-ink-900">{users.loading ? '…' : fmtNum(counts[name] ?? 0)}</span>
            </div>
            <p className="text-sm font-bold text-ink-900">{name}</p>
            <p className="mt-1 text-xs text-ink-400">{ROLE_INFO[name] ?? ''}</p>
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
      </div>
    </>
  )
}
