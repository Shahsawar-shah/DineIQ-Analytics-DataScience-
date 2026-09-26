import { Heart, MapPin, ShieldCheck, User as UserIcon } from 'lucide-react'
import { useState } from 'react'
import PageHeader from '../../components/layout/PageHeader'
import { useAuth } from '../../context/AuthContext'

export default function CustomerProfile() {
  const { user } = useAuth()
  const [saved, setSaved] = useState(false)
  const submit = (e) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 2200)
  }
  return (
    <>
      <PageHeader title="Profile" subtitle="Your account and dining preferences" demo />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="card anim-fade-up p-6 text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 font-display text-2xl font-extrabold text-white shadow-lg shadow-brand-500/30">
            {user?.name?.slice(0, 1) ?? 'A'}
          </div>
          <h2 className="font-display mt-4 text-lg font-extrabold text-ink-900">{user?.name}</h2>
          <p className="text-sm text-ink-400">{user?.email}</p>
          <span className="badge badge-orange mt-3">Customer · Gold tier</span>
          <div className="mt-6 space-y-2.5 text-left">
            {[
              { icon: UserIcon, label: 'Member since', value: 'Jan 2026' },
              { icon: MapPin, label: 'Home location', value: 'Downtown Flagship' },
              { icon: Heart, label: 'Favorite category', value: 'Main Course' },
              { icon: ShieldCheck, label: 'Account', value: 'Live — JWT session' },
            ].map((r) => (
              <div key={r.label} className="flex items-center gap-3 rounded-xl bg-ink-50/70 px-3.5 py-2.5">
                <r.icon size={15} className="text-brand-500" />
                <span className="text-xs text-ink-400">{r.label}:</span>
                <span className="ml-auto text-xs font-bold text-ink-900">{r.value}</span>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={submit} className="card anim-fade-up space-y-4 p-6 lg:col-span-2" style={{ animationDelay: '90ms' }}>
          <h3 className="font-display text-sm font-bold text-ink-900">Personal details</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Full name</label>
              <input className="input" defaultValue={user?.name} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" defaultValue={user?.email} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" placeholder="+1 555 000 0000" />
            </div>
            <div>
              <label className="label">Preferred location</label>
              <select className="input">
                <option>Downtown Flagship</option>
                <option>Riverside Bistro</option>
                <option>Harbor Point</option>
                <option>Uptown Grill</option>
                <option>Airport Terminal 2</option>
              </select>
            </div>
          </div>
          <h3 className="font-display pt-2 text-sm font-bold text-ink-900">Dietary preferences</h3>
          <div className="flex flex-wrap gap-2">
            {['Vegetarian options', 'Gluten-free', 'Low spice', 'Seafood lover', 'Dessert first'].map((p, i) => (
              <label key={p} className={`chip cursor-pointer ${i === 0 || i === 3 ? 'chip-active' : ''}`}>
                <input type="checkbox" className="hidden" defaultChecked={i === 0 || i === 3} />
                {p}
              </label>
            ))}
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button type="submit" className="btn btn-primary !px-6 !py-2.5 text-xs">Save changes</button>
            {saved && <span className="anim-pop text-xs font-bold text-emerald-600">Saved (demo)</span>}
          </div>
        </form>
      </div>
    </>
  )
}
