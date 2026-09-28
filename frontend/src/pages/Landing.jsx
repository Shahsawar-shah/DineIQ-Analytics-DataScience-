import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, CheckCircle2, Database, Gauge, LayoutDashboard, LineChart,
  ListChecks, Mail, MapPin, Megaphone, Menu as MenuIcon, Package, Phone, Quote, Tags,
  TrendingUp, TriangleAlert, Users, UtensilsCrossed, X,
} from 'lucide-react'
import {
  Area, AreaChart, Bar, BarChart as RBarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import { Reveal } from '../hooks/useReveal'
import Logo from '../components/ui/Logo'
import { CHANNEL_SHARE, CATEGORY_REVENUE, REVENUE_TREND, MENU_ITEMS } from '../data/mockData'

/* ---------------- Landing navbar ---------------- */

function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState('home')

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40)
      const ids = ['home', 'features', 'analytics', 'about']
      for (const id of ids) {
        const el = document.getElementById(id)
        if (el) {
          const rect = el.getBoundingClientRect()
          if (rect.top <= 120 && rect.bottom > 120) {
            setActive(id)
            break
          }
          setActive((prev) => (id === 'home' && rect.top > 120 ? 'home' : prev))
        }
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const links = [
    { id: 'home', label: 'Home' },
    { id: 'features', label: 'Features' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'about', label: 'About' },
  ]

  const go = (id) => {
    setOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-ink-950 py-2 shadow-sm' : 'bg-transparent py-4'
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <Logo size={40} className="shrink-0" />
          <span>
            <span className="font-display block text-lg font-extrabold leading-none text-white">
              DineIQ <span className="text-brand-500">Analytics</span>
            </span>
            <span className="block text-[0.6rem] font-medium uppercase tracking-[0.12em] text-white/50">
              Restaurant analytics
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {links.map((l) => (
            <button key={l.id} onClick={() => go(l.id)} className={`nav-link-landing ${active === l.id ? 'active !text-white' : ''}`}>
              {l.label}
            </button>
          ))}
          <Link
            to="/login"
            className="btn btn-primary !rounded-lg !px-5 !py-2 text-sm"
          >
            Log in
          </Link>
        </nav>

        <button className="topbar-icon-btn lg:hidden" onClick={() => setOpen((v) => !v)} aria-label="Menu">
          {open ? <X size={17} /> : <MenuIcon size={17} />}
        </button>
      </div>

      {open && (
        <div className="anim-fade-in mx-4 mt-3 rounded-xl border border-white/10 bg-ink-950 p-3 lg:hidden">
          {links.map((l) => (
            <button key={l.id} onClick={() => go(l.id)} className="block w-full rounded-xl px-4 py-2.5 text-left text-sm font-semibold text-white/80 hover:bg-white/5">
              {l.label}
            </button>
          ))}
          <Link to="/login" className="btn btn-primary mt-2 w-full !py-3">Log in</Link>
        </div>
      )}
    </header>
  )
}

/* ---------------- Hero ---------------- */

function Hero() {
  return (
    <section id="home" className="hero-vignette relative flex min-h-screen items-center overflow-hidden">
      <div className="relative mx-auto max-w-3xl px-4 pt-28 pb-32 text-center sm:px-6">
        <p className="font-script text-3xl text-brand-400 sm:text-4xl">DineIQ Analytics</p>
        <h1 className="font-display mt-4 text-4xl font-extrabold leading-[1.12] text-white sm:text-5xl">
          See what's selling, what's wasted and <span className="text-brand-400">where the profit is.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">
          Sales, menu, guest and stock data from all your locations in one place, with reports your
          managers and kitchen staff can actually use.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a href="#features" className="btn btn-primary !rounded-lg !px-7 !py-3.5 text-sm">
            See the features
          </a>
          <Link to="/login" className="btn btn-outline !rounded-lg !px-7 !py-3.5 text-sm">
            Log in
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ---------------- Platform overview ticker + stats ---------------- */

const TICKER_ITEMS = [
  { icon: TrendingUp, text: 'Sales Analytics' },
  { icon: UtensilsCrossed, text: 'Menu Intelligence' },
  { icon: Users, text: 'Customer Insights' },
  { icon: Package, text: 'Inventory' },
  { icon: TriangleAlert, text: 'Wastage Analytics' },
  { icon: Tags, text: 'Pricing & Promotions' },
  { icon: LineChart, text: 'Forecasting' },
  { icon: ListChecks, text: 'Recommendations' },
]

function Overview() {
  const stats = [
    { value: '1.2M+', label: 'Orders Analyzed' },
    { value: '14', label: 'ML Models in Suite' },
    { value: '5', label: 'Locations Connected' },
    { value: '94.2%', label: 'Forecast Accuracy' },
  ]
  return (
    <section className="border-b border-ink-100 bg-white py-4">
      <div className="overflow-hidden">
        <div className="ticker">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((t, i) => (
            <span key={i} className="flex items-center gap-2 whitespace-nowrap text-sm font-semibold text-ink-500">
              <t.icon size={16} className="text-brand-500" />
              {t.text}
              <span className="ml-6 h-1 w-1 rounded-full bg-ink-200" />
            </span>
          ))}
        </div>
      </div>
      <Reveal className="mx-auto mt-12 grid max-w-6xl grid-cols-2 gap-6 px-4 sm:px-6 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <p className="font-display text-3xl font-extrabold text-ink-900 sm:text-4xl">{s.value}</p>
            <p className="mt-1 text-xs font-medium text-ink-400">{s.label}</p>
          </div>
        ))}
      </Reveal>
    </section>
  )
}

/* ---------------- Features grid ---------------- */

const FEATURES = [
  { icon: TrendingUp, title: 'Sales Analytics', desc: 'Revenue, orders and channel performance across every location, hour and daypart.' },
  { icon: UtensilsCrossed, title: 'Menu Intelligence', desc: 'Classify every item into High / Medium / Low performance using sales, margin and wastage.' },
  { icon: Users, title: 'Customer Intelligence', desc: 'RFM segmentation, churn risk and lifetime value for every guest profile.' },
  { icon: LineChart, title: 'Sales Forecasting', desc: 'Daily, weekly and monthly revenue and order forecasts with confidence ranges.' },
  { icon: Package, title: 'Inventory Tracking', desc: 'Stock levels, consumption and purchase planning, updated as orders come in.' },
  { icon: TriangleAlert, title: 'Wastage Analytics', desc: 'Category and location wastage trends with item-level risk scoring.' },
  { icon: Tags, title: 'Pricing Intelligence', desc: 'Price sensitivity and demand elasticity per item to find the optimal price point.' },
  { icon: Megaphone, title: 'Promotion Analytics', desc: 'Measure campaign ROI, conversion lift and incremental revenue per promotion.' },
  { icon: Gauge, title: 'Anomaly Detection', desc: 'Automatic alerts when revenue, orders or wastage deviate from expected ranges.' },
]

function Features() {
  return (
    <section id="features" className="relative bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="section-eyebrow justify-center">Features</p>
          <h2 className="font-display mt-3 text-3xl font-extrabold text-ink-900 sm:text-4xl">
            What's in DineIQ
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-500">
            Nine modules covering the front of house, the kitchen and the stock room.
          </p>
        </Reveal>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 90}>
              <div className="card card-hover group h-full p-6">
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-brand-600">
                  <f.icon size={20} />
                </div>
                <h3 className="font-display text-base font-bold text-ink-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------------- Analytics preview ---------------- */

function AnalyticsPreview() {
  const revenue = REVENUE_TREND
  const channels = CHANNEL_SHARE
  const colors = ['#f95d0b', '#fb7f38', '#f9a825', '#1d4ed8']
  return (
    <section id="analytics" className="dark-panel relative overflow-hidden py-20 sm:py-24">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="section-eyebrow justify-center !text-brand-400">Dashboards</p>
          <h2 className="font-display mt-3 text-3xl font-extrabold text-white sm:text-4xl">A look inside</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/60">
            Sample data from a restaurant group with five locations.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          <Reveal className="lg:col-span-2">
            <div className="glass h-full rounded-2xl p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-sm font-bold text-white">Revenue vs target, 2026</h3>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenue}>
                    <defs>
                      <linearGradient id="lgRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f95d0b" stopOpacity={0.65} />
                        <stop offset="100%" stopColor="#f95d0b" stopOpacity={0.04} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <RTooltip contentStyle={{ background: '#1b1b2a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, color: '#fff', fontSize: 12 }} />
                    <Area type="monotone" dataKey="revenue" stroke="#f95d0b" strokeWidth={2.5} fill="url(#lgRev)" name="Revenue ($)" />
                    <Area type="monotone" dataKey="target" stroke="#5c8dff" strokeWidth={1.6} strokeDasharray="5 4" fill="transparent" name="Target ($)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="glass h-full rounded-2xl p-5">
              <h3 className="font-display mb-4 text-sm font-bold text-white">Ordering Channels</h3>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={channels} dataKey="value" innerRadius={52} outerRadius={78} paddingAngle={4} strokeWidth={0}>
                      {channels.map((_, i) => (
                        <Cell key={i} fill={colors[i % colors.length]} />
                      ))}
                    </Pie>
                    <RTooltip contentStyle={{ background: '#1b1b2a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, color: '#fff', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 space-y-2">
                {channels.map((c, i) => (
                  <div key={c.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-white/70">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: colors[i % colors.length] }} />
                      {c.name}
                    </span>
                    <span className="font-bold text-white">{c.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div className="glass rounded-2xl p-5">
              <h3 className="font-display mb-4 text-sm font-bold text-white">Top Categories by Revenue</h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <RBarChart data={CATEGORY_REVENUE} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.65)', fontSize: 10 }} width={88} axisLine={false} tickLine={false} />
                    <RTooltip contentStyle={{ background: '#1b1b2a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, color: '#fff', fontSize: 12 }} />
                    <Bar dataKey="value" fill="#f95d0b" radius={[0, 8, 8, 0]} name="Revenue ($)" barSize={14} />
                  </RBarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Reveal>
          <Reveal delay={160}>
            <div className="glass rounded-2xl p-5">
              <h3 className="font-display mb-4 text-sm font-bold text-white">Menu Matrix Snapshot</h3>
              <div className="space-y-3">
                {MENU_ITEMS.slice(0, 4).map((m) => (
                  <div key={m.id} className="flex items-center gap-3">
                    <span className={`badge ${m.perfClass === 'High' ? 'badge-green' : m.perfClass === 'Medium' ? 'badge-amber' : 'badge-red'}`}>
                      {m.perfClass}
                    </span>
                    <span className="flex-1 truncate text-xs font-medium text-white/80">{m.name}</span>
                    <span className="text-xs font-bold text-white">{m.margin.toFixed(0)}% margin</span>
                  </div>
                ))}
              </div>
              <Link to="/login" className="btn btn-outline mt-5 w-full !rounded-lg !py-2.5 text-xs">
                Open the full dashboard
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/* ---------------- Menu matrix spotlight ---------------- */

function MenuIntelligenceSection() {
  return (
    <section className="bg-ink-50/60 py-20 sm:py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
        <Reveal>
          <p className="section-eyebrow">Menu Matrix</p>
          <h2 className="font-display mt-3 text-3xl font-extrabold text-ink-900 sm:text-4xl">
            Know which dishes earn their place
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-ink-500">
            Each menu item is scored on sales volume, revenue, cost, margin, guest rating, repeat orders
            and wastage, then placed in one of three groups.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              'High performers: keep them, feature them',
              'Medium performers: adjust price, portion or placement',
              'Low performers: rework, reprice or take off the menu',
            ].map((t) => (
              <li key={t} className="flex items-start gap-2.5 text-sm text-ink-700">
                <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-brand-500" />
                {t}
              </li>
            ))}
          </ul>
          <Link to="/login" className="btn btn-primary mt-8 !rounded-lg !px-7 !py-3 text-sm">
            View menu analysis <ArrowRight size={16} />
          </Link>
        </Reveal>
        <Reveal delay={120}>
          <div className="card p-6">
            <div>
              <div className="mb-5 flex items-center justify-between">
                <h3 className="font-display text-sm font-bold text-ink-900">Menu Performance Classification</h3>
              </div>
              {MENU_ITEMS.slice(0, 6).map((m) => (
                <div key={m.id} className="mb-3">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-semibold text-ink-700">{m.name}</span>
                    <span className="text-ink-400">
                      {m.sold.toLocaleString()} sold · {m.margin.toFixed(0)}% margin
                    </span>
                  </div>
                  <div className="meter">
                    <span
                      style={{
                        width: `${Math.min(100, (m.revenue / 30000) * 100 + 8)}%`,
                        background:
                          m.perfClass === 'High'
                            ? '#0d9459'
                            : m.perfClass === 'Medium'
                              ? '#d97706'
                              : '#e11d48',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ---------------- Split features (customer / sales / inventory / pricing) ---------------- */

const SPLIT_SECTIONS = [
  {
    id: 'customer',
    eyebrow: 'Know Your Guests',
    title: 'Customer Intelligence',
    desc: 'RFM segments, churn risk and lifetime value show who your regulars are, who has stopped coming in, and who is worth a follow-up offer.',
    points: ['6 RFM segments from Champions to Hibernating', 'Churn-risk alerts with win-back playbooks', 'Order frequency & spending patterns per guest'],
    icon: Users,
    img: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1000&q=80',
  },
  {
    id: 'sales',
    eyebrow: 'See What Comes Next',
    title: 'Sales & Forecasting',
    desc: 'Daily, weekly and monthly forecasts for revenue and orders with confidence ranges, plus alerts when actual numbers drift away from the forecast.',
    points: ['Revenue & order forecasts with ranges', 'Dual Python / Spark pipeline comparison', 'Automatic anomaly detection & severity badges'],
    icon: LineChart,
    img: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1000&q=80',
  },
  {
    id: 'inventory',
    eyebrow: 'Waste Less, Earn More',
    title: 'Inventory & Wastage',
    desc: 'Stock levels, usage rates, par-level alerts and wastage risk help each kitchen order enough without over-ordering.',
    points: ['Low-stock and out-of-stock alerts', 'Category & location wastage breakdowns', 'Purchase planning with reorder quantities'],
    icon: Package,
    img: 'https://images.unsplash.com/photo-1580913428023-02c695666d61?auto=format&fit=crop&w=1000&q=80',
  },
  {
    id: 'pricing',
    eyebrow: 'Price With Confidence',
    title: 'Pricing & Promotions',
    desc: 'Price sensitivity per item and ROI per campaign show where a price change or discount is likely to pay off before you commit to it.',
    points: ['Price sensitivity classification per item', 'Promotion conversion & uplift tracking', 'What-if simulation for price & discount moves'],
    icon: Tags,
    img: 'https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?auto=format&fit=crop&w=1000&q=80',
  },
]

function SplitSections() {
  return (
    <section className="bg-white">
      {SPLIT_SECTIONS.map((s, i) => (
        <div key={s.id} id={s.id === 'customer' ? 'customer' : undefined} className="py-16 sm:py-20 odd:bg-ink-50/60">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
            <Reveal className={i % 2 === 1 ? 'lg:order-2' : ''}>
              <div className="group relative overflow-hidden rounded-xl">
                <img
                  src={s.img}
                  alt={s.title}
                  loading="lazy"
                  className="food-card-img aspect-[16/10] w-full object-cover"
                />

              </div>
            </Reveal>
            <Reveal delay={100} className={i % 2 === 1 ? 'lg:order-1' : ''}>
              <p className="section-eyebrow">{s.eyebrow}</p>
              <h2 className="font-display mt-3 text-2xl font-extrabold text-ink-900 sm:text-3xl">{s.title}</h2>
              <p className="mt-4 text-sm leading-relaxed text-ink-500">{s.desc}</p>
              <ul className="mt-5 space-y-2.5">
                {s.points.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm text-ink-700">
                    <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-brand-500" />
                    {p}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      ))}
    </section>
  )
}

/* ---------------- How it works ---------------- */

const STEPS = [
  { icon: Database, title: '1. Connect your data', desc: 'POS, inventory, loyalty and delivery-platform exports are loaded into one data store.' },
  { icon: Gauge, title: '2. Clean and score', desc: 'Python and Spark pipelines clean every record and score each menu item.' },
  { icon: LayoutDashboard, title: '3. Review dashboards', desc: 'Each role gets its own view: classifications, forecasts and suggested actions.' },
  { icon: CheckCircle2, title: '4. Act and measure', desc: 'Make the change, then check the result in the next reporting cycle.' },
]

function HowItWorks() {
  return (
    <section id="about" className="dark-panel relative overflow-hidden py-20 sm:py-24">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="section-eyebrow justify-center !text-brand-400">How it works</p>
          <h2 className="font-display mt-3 text-3xl font-extrabold text-white sm:text-4xl">From raw data to decisions</h2>
        </Reveal>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 100}>
              <div className="glass h-full rounded-xl p-6">
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-white/5 text-brand-400">
                  <s.icon size={20} />
                </div>
                <h3 className="font-display text-sm font-bold text-white">{s.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-white/55">{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------------- Testimonial + CTA + footer ---------------- */

function Testimonial() {
  return (
    <section className="bg-ink-50/60 py-16 sm:py-20">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
        <Reveal>
          <Quote size={34} className="mx-auto text-brand-200" />
          <p className="font-display mt-5 text-xl font-bold leading-relaxed text-ink-900 sm:text-2xl">
            "We found about $18k a month in margin we were leaving on the menu, and wastage came down
            23% in the first quarter."
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-ink-800 font-display font-bold text-white">
              VL
            </span>
            <div className="text-left">
              <p className="text-sm font-bold text-ink-900">Victor Laurent</p>
              <p className="text-xs text-ink-400">Restaurant Manager, Downtown Flagship</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function FinalCta() {
  return (
    <section className="relative overflow-hidden bg-brand-600 py-16 sm:py-20">
      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
        <Reveal>
          <h2 className="font-display text-3xl font-extrabold text-white sm:text-4xl">
            Try it with your own login
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-white/85">
            Create a free demo account and look around every dashboard with sample data.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/register" className="btn !rounded-lg !bg-white !px-7 !py-3.5 text-sm font-bold text-brand-700 hover:!bg-brand-50">
              Create account
            </Link>
            <Link to="/login" className="btn btn-outline !rounded-lg !px-7 !py-3.5 text-sm">
              Log in
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function Footer() {
  const cols = [
    { title: 'Platform', links: ['Sales Analytics', 'Menu Intelligence', 'Customer Intelligence', 'Forecasting', 'Wastage Analytics'] },
    { title: 'For Teams', links: ['Restaurant Managers', 'Inventory Managers', 'Administrators', 'Customers'] },
    { title: 'Resources', links: ['Documentation', 'API Reference', 'API Preview', 'Support'] },
  ]
  return (
    <footer className="dark-panel border-t border-white/10 pt-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-10 pb-12 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <Logo size={40} className="shrink-0" />
              <span>
                <span className="font-display block text-lg font-extrabold leading-none text-white">
                  DineIQ Analytics
                </span>
                <span className="block text-[0.6rem] font-medium uppercase tracking-[0.12em] text-white/50">
                  Restaurant analytics
                </span>
              </span>
            </div>
            <p className="mt-4 max-w-sm text-xs leading-relaxed text-white/50">
              Analytics for restaurant groups: sales, menus, customers, inventory, wastage, pricing
              and promotions in one place.
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <h4 className="font-display text-sm font-bold text-brand-400">{c.title}</h4>
              <ul className="mt-4 space-y-2.5">
                {c.links.map((l) => (
                  <li key={l}>
                    <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="text-xs text-white/55 transition hover:text-brand-400">
                      {l}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="grid gap-6 border-t border-white/10 py-8 md:grid-cols-3">
          <div className="flex items-center gap-2.5 text-xs text-white/60">
            <MapPin size={15} className="shrink-0 text-brand-400" /> 6 E Esplanade, St Albans VIC 3021
          </div>
          <div className="flex items-center gap-2.5 text-xs text-white/60">
            <Phone size={15} className="shrink-0 text-brand-400" /> +91 80005 89080
          </div>
          <div className="flex items-center gap-2.5 text-xs text-white/60">
            <Mail size={15} className="shrink-0 text-brand-400" /> support@dineiq.io
          </div>
        </div>
        <div className="flex flex-col items-center justify-between gap-3 border-t border-white/10 py-6 text-[0.7rem] text-white/40 sm:flex-row">
          <p>© 2026 DineIQ Analytics. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <span>Privacy</span>
            <span>Terms</span>
            <span>v1.0</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

/* ---------------- Newsletter band ---------------- */

function Newsletter() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  return (
    <section className="relative overflow-hidden py-14">
      <img
        src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1600&q=80"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-ink-950/78" />
      <div className="relative mx-auto max-w-2xl px-4 text-center sm:px-6">
        <Reveal>
          <p className="font-script text-3xl text-brand-400">Stay in the loop</p>
          <p className="mt-2 text-sm text-white/70">Get product updates and analytics tips. No spam, ever.</p>
          <form
            className="mx-auto mt-6 flex max-w-lg overflow-hidden rounded-xl bg-white p-1.5"
            onSubmit={(e) => {
              e.preventDefault()
              if (email.includes('@')) setSent(true)
            }}
          >
            <input
              className="flex-1 bg-transparent px-4 text-sm outline-none"
              placeholder="Your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-label="Email"
            />
            <button type="submit" className="btn btn-primary !rounded-lg !px-5 !py-2.5 text-sm">
              {sent ? 'Subscribed' : 'Subscribe'}
            </button>
          </form>
        </Reveal>
      </div>
    </section>
  )
}

/* ---------------- Page ---------------- */

export default function Landing() {
  useEffect(() => {
    document.title = 'DineIQ Analytics | Restaurant analytics'
  }, [])

  return (
    <div className="bg-white">
      <LandingNav />
      <Hero />
      <Overview />
      <Features />
      <AnalyticsPreview />
      <MenuIntelligenceSection />
      <SplitSections />
      <HowItWorks />
      <Testimonial />
      <FinalCta />
      <Newsletter />
      <Footer />
    </div>
  )
}
