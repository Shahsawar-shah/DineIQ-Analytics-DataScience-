import { useEffect, useRef, useState } from 'react'

const NAV_LINKS = [
  { label: 'Capabilities', href: '#capabilities' },
  { label: 'Features', href: '#features' },
  { label: 'Pipeline', href: '#pipeline' },
  { label: 'FAQ', href: '#faq' },
]

const CAPABILITY_HIGHLIGHTS = [
  {
    icon: '🔥',
    color: 'from-red-500/20 to-orange-500/20 text-red-400',
    tag: 'Menu',
    title: 'Menu Intelligence',
    description:
      'Classifies every item into Profit Driver, Volume Driver, Hidden Opportunity, or Low Performer.',
  },
  {
    icon: '👥',
    color: 'from-indigo-500/20 to-purple-500/20 text-indigo-400',
    tag: 'Customers',
    title: 'Customer Segmentation',
    description: 'RFM analysis groups 50K+ customers into behavioral segments worth acting on.',
  },
  {
    icon: '📊',
    color: 'from-emerald-500/20 to-teal-500/20 text-emerald-400',
    tag: 'Forecast',
    title: 'Demand Forecasting',
    description: 'Chronological models predict demand with MAE/RMSE-validated accuracy.',
  },
]

const EXPERTISE_POINTS = [
  {
    icon: '⚙️',
    title: 'Data Evaluation & Intelligence',
    description:
      'Every order, menu item, and customer record is cleaned, validated, and structured before it ever reaches a model.',
  },
  {
    icon: '📈',
    title: 'Analytics & Business Insights',
    description:
      'Model outputs are translated into prioritized, evidence-based recommendations — not just raw numbers.',
  },
]

const STATS = [
  { icon: '📊', target: 1300000, label: 'Records Processed', format: (v) => `${formatCompact(v)}+` },
  { icon: '🍽️', target: 150, label: 'Menu Items Analyzed', format: (v) => `${Math.round(v)}` },
  { icon: '👥', target: 50000, label: 'Customers Segmented', format: (v) => `${formatCompact(v)}+` },
  { icon: '⚡', target: 1000000, label: 'Orders via Spark', format: (v) => `${formatCompact(v)}+` },
  { icon: '🎯', target: 99, label: 'Model Accuracy', format: (v) => `${Math.round(v)}%` },
]

const FEATURES = [
  {
    icon: '🔥',
    color: 'from-red-500/20 to-orange-500/20 text-red-400',
    title: 'Menu Intelligence',
    description:
      'Classifies 150+ items into Profit Driver, Volume Driver, Hidden Opportunity, Low Performer.',
  },
  {
    icon: '👥',
    color: 'from-indigo-500/20 to-purple-500/20 text-indigo-400',
    title: 'Customer Segmentation',
    description: 'RFM analysis segments 50K+ customers into behavioral groups.',
  },
  {
    icon: '⚡',
    color: 'from-amber-500/20 to-yellow-500/20 text-amber-400',
    title: 'Apache Spark Processing',
    description: '1M+ order records processed with PySpark, Spark SQL, and Spark MLlib.',
  },
  {
    icon: '🤖',
    color: 'from-cyan-500/20 to-blue-500/20 text-cyan-400',
    title: 'Dual ML Pipeline',
    description: 'Independent Spark MLlib + Python XGBoost models compared for accuracy.',
  },
  {
    icon: '📊',
    color: 'from-emerald-500/20 to-teal-500/20 text-emerald-400',
    title: 'Demand Forecasting',
    description: 'Predict future demand with MAE/RMSE evaluation and chronological splits.',
  },
  {
    icon: '🎯',
    color: 'from-fuchsia-500/20 to-pink-500/20 text-fuchsia-400',
    title: 'Recommendation Engine',
    description: 'Evidence-based recommendations with priority levels and business impact.',
  },
]

const TECH_STACK = [
  { icon: '⚡', name: 'Apache Spark' },
  { icon: '🐍', name: 'PySpark' },
  { icon: '🐍', name: 'Python' },
  { icon: '🌲', name: 'XGBoost' },
  { icon: '🔬', name: 'Scikit-learn' },
  { icon: '🚀', name: 'FastAPI' },
  { icon: '⚛️', name: 'React' },
  { icon: '🐘', name: 'PostgreSQL' },
  { icon: '🐳', name: 'Docker' },
  { icon: '🐼', name: 'Pandas' },
  { icon: '🔢', name: 'NumPy' },
  { icon: '📦', name: 'Parquet' },
]

const PIPELINE_STAGES = [
  { icon: '📥', title: 'Ingest', description: 'Raw order, menu, and customer CSVs loaded into Spark.', gradient: 'from-indigo-600/30 to-indigo-900/30' },
  { icon: '⚙️', title: 'Process', description: 'Spark SQL cleans, joins, and aggregates at scale.', gradient: 'from-cyan-600/30 to-cyan-900/30' },
  { icon: '🧠', title: 'Model', description: 'Dual ML pipelines train and cross-validate results.', gradient: 'from-purple-600/30 to-purple-900/30' },
  { icon: '💡', title: 'Recommend', description: 'FastAPI serves ranked insights to the dashboard.', gradient: 'from-emerald-600/30 to-emerald-900/30' },
]

const BENEFITS = [
  {
    title: 'Innovate with Machine Learning',
    description: 'Dual pipelines mean every prediction is cross-checked before it reaches your dashboard.',
  },
  {
    title: 'Maximize Data Impact',
    description: 'Recommendations come ranked by priority and business impact — not just raw model scores.',
  },
]

const FAQS = [
  {
    q: 'How accurate are the machine learning models?',
    a: 'Classification and forecasting models are validated with MAE/RMSE on chronological splits, and the Spark MLlib and XGBoost pipelines are compared independently before either is trusted for a recommendation.',
  },
  {
    q: 'What data powers the platform?',
    a: 'Over 1 million order records, 150+ menu items, and 50K+ customer profiles, processed through PySpark and Spark SQL before reaching the API layer.',
  },
  {
    q: 'What is the Dual ML Pipeline?',
    a: 'Every prediction task runs through two independent implementations — Spark MLlib and Python/XGBoost — so results can be cross-validated rather than taken on faith.',
  },
  {
    q: 'Can this scale to a real restaurant deployment?',
    a: 'The pipeline is built on Apache Spark for distributed processing, with a FastAPI backend and PostgreSQL storage designed to handle production-scale data volumes.',
  },
]

const PIPELINE_STEPS = [
  {
    title: 'Ingest & Clean',
    description: 'Raw order, menu, and customer data ingested via PySpark, cleaned and validated at scale.',
  },
  {
    title: 'Process & Model',
    description: 'Spark SQL aggregations feed dual ML pipelines — Spark MLlib and XGBoost — trained independently.',
  },
  {
    title: 'Serve & Recommend',
    description: 'FastAPI serves predictions and evidence-based recommendations to the dashboard in real time.',
  },
]

const INSIGHT_CARDS = [
  {
    icon: '🔥',
    tag: 'Menu Intelligence',
    statement: 'Top Profit Driver identified',
    description: 'A high-margin, high-volume item surfaces automatically as a menu star worth protecting.',
  },
  {
    icon: '💎',
    tag: 'Hidden Opportunity',
    statement: 'Underexposed item found',
    description: 'Strong margins, low visibility — the model flags it for repositioning on the menu.',
  },
  {
    icon: '👥',
    tag: 'Customer Segmentation',
    statement: 'High-value segment uncovered',
    description: 'RFM scoring isolates the "Champions" segment driving a disproportionate share of repeat revenue.',
  },
]

const DISCOVER_CARDS = [
  {
    icon: '📈',
    tag: 'Dashboard',
    title: 'Executive Dashboard',
    description: 'A single view of revenue, orders, and top-line KPIs across the whole operation.',
    gradient: 'from-indigo-600/40 to-cyan-500/20',
  },
  {
    icon: '📉',
    tag: 'Forecasting',
    title: 'Forecast Dashboard',
    description: 'Demand predictions with MAE/RMSE evaluation, broken down by item and time window.',
    gradient: 'from-purple-600/40 to-indigo-500/20',
  },
  {
    icon: '🧪',
    tag: 'Simulation',
    title: 'What-If Analysis',
    description: 'Simulate pricing and staffing scenarios before committing to a real-world change.',
    gradient: 'from-emerald-600/40 to-cyan-500/20',
  },
]

function formatCompact(value) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${Math.round(value / 1000)}K`
  return `${Math.round(value)}`
}

function Reveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true)
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`${visible ? 'fade-up-visible' : 'fade-up-hidden'} ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

function AnimatedCounter({ target, format, duration = 2000 }) {
  const ref = useRef(null)
  const [value, setValue] = useState(0)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setStarted(true)
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.4 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!started) return undefined

    let startTime = null
    let raf

    const step = (timestamp) => {
      if (startTime === null) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const eased = 1 - (1 - progress) ** 3
      setValue(target * eased)
      if (progress < 1) raf = requestAnimationFrame(step)
    }

    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [started, target, duration])

  return <span ref={ref}>{format(value)}</span>
}

function Logo({ className = '' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 shadow-[0_0_20px_rgba(99,102,241,0.5)]">
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white">
          <path
            d="M4 20V12M12 20V4M20 20V8"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <span className="text-lg font-bold tracking-tight text-slate-50">
        Dine<span className="text-gradient">IQ</span>
      </span>
    </div>
  )
}

function TopBar() {
  return (
    <div className="hidden items-center justify-between border-b border-white/5 bg-[#03060f] px-6 py-2 text-xs text-slate-500 sm:flex">
      <span>📊 DineIQ Analytics — Restaurant Intelligence Platform</span>
      <div className="flex items-center gap-4">
        <a href="#" className="transition-colors hover:text-slate-300">
          GitHub
        </a>
        <span className="text-slate-700">|</span>
        <span>Aptech TechWiz 7 Competition</span>
      </div>
    </div>
  )
}

function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-indigo-500/20 bg-[#050B18]/90 py-4 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6">
        <Logo />
        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-slate-400 transition-colors hover:text-slate-50"
            >
              {link.label}
            </a>
          ))}
        </div>
        <button
          type="button"
          className="rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 px-5 py-2 text-sm font-semibold text-white shadow-[0_0_15px_rgba(99,102,241,0.4)] transition-shadow hover:shadow-[0_0_25px_rgba(99,102,241,0.7)]"
        >
          Login
        </button>
      </div>
    </nav>
  )
}

function Hero() {
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-orb-float absolute -left-32 top-20 h-96 w-96 rounded-full bg-indigo-600/30 blur-3xl" />
        <div
          className="animate-orb-float absolute right-0 top-1/3 h-[28rem] w-[28rem] rounded-full bg-cyan-500/20 blur-3xl"
          style={{ animationDelay: '2s' }}
        />
        <div
          className="animate-orb-float absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-purple-600/20 blur-3xl"
          style={{ animationDelay: '4s' }}
        />
      </div>

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 px-6 py-24 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-sm text-indigo-300">
            🏆 TechWiz 7 Competition
          </div>
          <h1 className="text-4xl font-black uppercase leading-[0.95] tracking-tight text-slate-50 sm:text-5xl lg:text-7xl">
            Restaurant
            <br />
            Intelligence
            <br />
            <span className="text-gradient animate-gradient-shift">Powered by Big Data</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-slate-400">
            AI-driven analytics platform that transforms restaurant data into actionable insights.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <a
              href="#cta"
              className="animate-pulse-glow rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 px-7 py-3.5 text-sm font-semibold text-white transition-transform hover:scale-105"
            >
              View Dashboard
            </a>
            <a
              href="#pipeline"
              className="rounded-lg border border-white/20 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Watch Demo
            </a>
          </div>
        </div>

        <div className="relative lg:col-span-2">
          <div className="animate-spin-slow absolute left-1/2 top-1/2 hidden h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-indigo-500/20 lg:block" />

          <div className="animate-float mx-auto max-w-sm rounded-2xl border border-indigo-500/20 bg-[#0D1526] p-6 shadow-2xl shadow-indigo-950/50">
            <div className="mb-5 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-300">Live Overview</span>
              <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-blink absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                Live
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/5 bg-white/5 p-4">
                <p className="text-xs text-slate-400">Revenue</p>
                <p className="mt-1 text-xl font-bold text-slate-50">$128K</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/5 p-4">
                <p className="text-xs text-slate-400">Orders</p>
                <p className="mt-1 text-xl font-bold text-slate-50">5.8K</p>
              </div>
            </div>

            <div className="mt-5 flex h-24 items-end gap-2">
              {[40, 65, 45, 80, 60, 95, 70].map((height, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm bg-gradient-to-t from-indigo-500 to-cyan-400"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          </div>

          <div className="animate-float absolute -left-6 -top-6 z-20 hidden rounded-xl border border-emerald-500/30 bg-[#0D1526]/90 px-4 py-2 text-xs font-semibold text-emerald-400 shadow-lg backdrop-blur sm:block">
            🎯 99% Model Accuracy
          </div>
          <div
            className="animate-float absolute -bottom-6 -right-4 z-20 hidden rounded-xl border border-indigo-500/30 bg-[#0D1526]/90 px-4 py-2 text-xs font-semibold text-indigo-300 shadow-lg backdrop-blur sm:block"
            style={{ animationDelay: '1s' }}
          >
            📊 1.3M+ Records
          </div>
        </div>
      </div>
    </section>
  )
}

function Capabilities() {
  return (
    <section id="capabilities" className="relative overflow-hidden py-28">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600/10 blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-400">Our Capabilities</p>
          <h2 className="mt-3 text-3xl font-bold text-slate-50 sm:text-4xl">
            Turning Raw Data Into <span className="text-gradient">Restaurant Intelligence</span>
          </h2>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
          {CAPABILITY_HIGHLIGHTS.map((item, i) => (
            <Reveal key={item.title} delay={i * 120} className={i === 1 ? 'md:mt-12' : ''}>
              <div className="relative h-full rounded-2xl border border-white/10 bg-[#0D1526] p-8 shadow-xl shadow-black/20">
                <span className="absolute right-6 top-6 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  {item.tag}
                </span>
                <div
                  className={`mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br text-2xl ${item.color}`}
                >
                  {item.icon}
                </div>
                <h3 className="text-lg font-semibold text-slate-50">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function Expertise() {
  return (
    <section className="py-24">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-2 lg:items-center">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-400">Our Approach</p>
          <h2 className="mt-3 text-3xl font-bold text-slate-50 sm:text-4xl">
            Big Data meets <span className="text-gradient">Machine Learning</span> for real restaurant decisions
          </h2>
          <p className="mt-4 max-w-md text-slate-400">
            Every dataset is processed twice — once through Spark&apos;s distributed engine, once through
            Python&apos;s ML ecosystem — so recommendations are cross-validated, not guessed.
          </p>
        </Reveal>

        <div className="space-y-6">
          {EXPERTISE_POINTS.map((point, i) => (
            <Reveal key={point.title} delay={i * 120}>
              <div className="flex gap-4 rounded-xl border border-white/5 bg-[#0D1526] p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-xl">
                  {point.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-50">{point.title}</h3>
                  <p className="mt-1 text-sm text-slate-400">{point.description}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function DemoShowcase() {
  return (
    <section className="py-16">
      <div className="mx-auto max-w-5xl px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-[#0D1526] to-[#0a0f1e] p-10 text-center sm:p-16">
            <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-purple-600/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -right-10 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
            <div className="relative">
              <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">Platform Preview</p>
              <h3 className="mt-3 text-2xl font-bold text-slate-50 sm:text-3xl">See the Full Pipeline in Action</h3>
              <a
                href="#pipeline"
                className="group mt-8 inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 shadow-[0_0_40px_rgba(99,102,241,0.5)] transition-transform hover:scale-110"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="ml-1 h-7 w-7 text-white">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </a>
              <p className="mt-6 text-sm text-slate-400">Watch Demo · 3 min walkthrough</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function Stats() {
  return (
    <section className="border-y border-white/5 bg-[#050B18] py-20">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-6 sm:grid-cols-3 lg:grid-cols-5">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-white/5 p-6 text-center transition-all duration-300 hover:border-indigo-500/40 hover:shadow-[0_0_30px_rgba(99,102,241,0.2)]"
          >
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/10 text-lg">
              {stat.icon}
            </div>
            <p className="text-gradient text-3xl font-extrabold sm:text-4xl">
              <AnimatedCounter target={stat.target} format={stat.format} />
            </p>
            <p className="mt-2 text-sm text-slate-400">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function FeatureCard({ feature, delay }) {
  return (
    <Reveal delay={delay}>
      <div className="group h-full rounded-2xl bg-gradient-to-br from-transparent to-transparent p-px transition-all duration-300 hover:from-indigo-500/60 hover:to-cyan-400/60">
        <div className="h-full rounded-2xl border border-white/5 bg-[#0D1526] p-7 transition-colors group-hover:border-transparent">
          <div
            className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-2xl ${feature.color}`}
          >
            {feature.icon}
          </div>
          <h3 className="text-lg font-semibold text-slate-50">{feature.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">{feature.description}</p>
        </div>
      </div>
    </Reveal>
  )
}

function Features() {
  return (
    <section id="features" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal className="text-center">
          <h2 className="text-3xl font-bold text-slate-50 sm:text-4xl">
            Powered by <span className="text-gradient">Advanced Technology</span>
          </h2>
        </Reveal>
        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} delay={i * 100} />
          ))}
        </div>
      </div>
    </section>
  )
}

function TechStack() {
  const loop = [...TECH_STACK, ...TECH_STACK]

  return (
    <section id="tech-stack" className="overflow-hidden py-24">
      <div className="mx-auto max-w-7xl px-6 text-center">
        <h2 className="text-3xl font-bold text-slate-50 sm:text-4xl">
          Built With <span className="text-gradient">Industry-Leading Technology</span>
        </h2>
      </div>
      <div className="group relative mt-12 overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#050B18] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#050B18] to-transparent" />
        <div className="animate-marquee flex w-max gap-4 group-hover:[animation-play-state:paused]">
          {loop.map((tech, i) => (
            <div
              key={`${tech.name}-${i}`}
              className="flex items-center gap-2 whitespace-nowrap rounded-full border border-white/10 bg-[#0D1526] px-5 py-2.5 text-sm font-medium text-slate-300 transition-all hover:border-indigo-500/50 hover:shadow-[0_0_20px_rgba(99,102,241,0.3)]"
            >
              <span>{tech.icon}</span>
              {tech.name}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Gallery() {
  return (
    <section id="gallery" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-400">Explore</p>
          <h2 className="mt-3 text-3xl font-bold text-slate-50 sm:text-4xl">
            From Raw Data to <span className="text-gradient">Recommendation</span>
          </h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-2 gap-5 lg:grid-cols-4">
          {PIPELINE_STAGES.map((stage, i) => (
            <Reveal key={stage.title} delay={i * 100}>
              <div
                className={`flex aspect-[3/4] flex-col justify-end rounded-2xl border border-white/10 bg-gradient-to-br p-6 ${stage.gradient}`}
              >
                <span className="text-4xl">{stage.icon}</span>
                <h3 className="mt-4 text-lg font-semibold text-slate-50">{stage.title}</h3>
                <p className="mt-1 text-sm text-slate-300/80">{stage.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function TaglineStrip() {
  return (
    <section className="border-y border-white/5 bg-[#0a0f1e] py-6">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-6 text-center text-sm font-semibold uppercase tracking-wide">
        <span className="text-indigo-400">Data-Driven Decisions</span>
        <span className="text-slate-700">•</span>
        <span className="text-cyan-400">AI-Powered Insights</span>
        <span className="text-slate-700">•</span>
        <span className="text-amber-400">Built for Restaurants</span>
      </div>
    </section>
  )
}

function Benefits() {
  return (
    <section id="benefits" className="py-24">
      <div className="mx-auto grid max-w-7xl gap-16 px-6 lg:grid-cols-2 lg:items-center">
        <Reveal className="flex justify-center">
          <div className="relative h-72 w-72">
            <div className="absolute inset-0 rotate-6 rounded-2xl border border-white/10 bg-[#0D1526]" />
            <div className="absolute inset-0 -rotate-3 rounded-2xl border border-indigo-500/20 bg-[#0D1526] p-6">
              <div className="h-2 w-20 rounded-full bg-indigo-500/40" />
              <div className="mt-3 h-2 w-28 rounded-full bg-white/10" />
              <div className="mt-8 flex h-28 items-end gap-2">
                {[30, 55, 40, 75, 50, 90].map((height, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-sm bg-gradient-to-t from-indigo-500 to-cyan-400"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
              <div className="mt-6 h-2 w-16 rounded-full bg-white/10" />
              <div className="mt-2 h-2 w-24 rounded-full bg-white/5" />
            </div>
          </div>
        </Reveal>

        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-400">The Benefits</p>
          <h2 className="mt-3 text-3xl font-bold text-slate-50 sm:text-4xl">
            Accelerate Decisions With <span className="text-gradient">Data-Driven Intelligence</span>
          </h2>
          <div className="mt-8 space-y-6">
            {BENEFITS.map((benefit) => (
              <div key={benefit.title} className="flex gap-3">
                <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs text-emerald-400">
                  ✓
                </span>
                <div>
                  <h3 className="font-semibold text-slate-50">{benefit.title}</h3>
                  <p className="mt-1 text-sm text-slate-400">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function FaqAccordion() {
  const [open, setOpen] = useState(0)

  return (
    <div className="divide-y divide-white/5 rounded-2xl border border-white/5 bg-[#0D1526]">
      {FAQS.map((item, i) => (
        <div key={item.q}>
          <button
            type="button"
            onClick={() => setOpen(open === i ? -1 : i)}
            className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
          >
            <span className="font-medium text-slate-100">{item.q}</span>
            <span
              className={`shrink-0 text-xl font-light text-indigo-400 transition-transform duration-300 ${
                open === i ? 'rotate-45' : ''
              }`}
            >
              +
            </span>
          </button>
          <div
            className={`grid transition-all duration-300 ${
              open === i ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            }`}
          >
            <div className="overflow-hidden">
              <p className="px-6 pb-5 text-sm leading-relaxed text-slate-400">{item.a}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function Faq() {
  return (
    <section id="faq" className="py-24">
      <div className="mx-auto max-w-3xl px-6">
        <Reveal className="mb-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-400">Questions?</p>
          <h2 className="mt-3 text-3xl font-bold text-slate-50 sm:text-4xl">Frequently Asked Questions</h2>
        </Reveal>
        <Reveal>
          <FaqAccordion />
        </Reveal>
      </div>
    </section>
  )
}

function Pipeline() {
  return (
    <section id="pipeline" className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mb-14 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-400">How It Works</p>
          <h2 className="mt-3 text-3xl font-bold text-slate-50 sm:text-4xl">Our Data Pipeline</h2>
        </Reveal>

        <Reveal>
          <div className="grid items-center gap-12 rounded-3xl border border-white/5 bg-[#0D1526] p-10 lg:grid-cols-[1fr_auto] lg:p-14">
            <div className="space-y-8">
              {PIPELINE_STEPS.map((step, i) => (
                <div key={step.title} className="flex gap-5">
                  <span className="text-2xl font-bold text-indigo-500/50">0{i + 1}</span>
                  <div>
                    <h3 className="font-semibold text-slate-50">{step.title}</h3>
                    <p className="mt-1 text-sm text-slate-400">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center">
              <p className="text-gradient text-7xl font-black">03</p>
              <p className="mt-2 text-sm text-slate-400">
                stages from raw data
                <br />
                to recommendation
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function Insights() {
  return (
    <section id="insights" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-400">Sample Output</p>
          <h2 className="mt-3 text-3xl font-bold text-slate-50 sm:text-4xl">What the Data Reveals</h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {INSIGHT_CARDS.map((card, i) => (
            <Reveal key={card.statement} delay={i * 100}>
              <div className="h-full rounded-2xl border border-white/5 bg-[#0D1526] p-7">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-2xl">
                  {card.icon}
                </div>
                <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-indigo-400">{card.tag}</p>
                <h3 className="mt-2 text-lg font-semibold text-slate-50">{card.statement}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{card.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function Discover() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-400">Inside the Platform</p>
          <h2 className="mt-3 text-3xl font-bold text-slate-50 sm:text-4xl">What You&apos;ll Discover</h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {DISCOVER_CARDS.map((card, i) => (
            <Reveal key={card.title} delay={i * 100}>
              <div className="h-full overflow-hidden rounded-2xl border border-white/5 bg-[#0D1526]">
                <div
                  className={`flex h-32 items-center justify-center bg-gradient-to-br text-5xl ${card.gradient}`}
                >
                  {card.icon}
                </div>
                <div className="p-6">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    {card.tag}
                  </span>
                  <h3 className="mt-3 text-lg font-semibold text-slate-50">{card.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{card.description}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function CTA() {
  return (
    <section id="cta" className="relative overflow-hidden py-28">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600/20 blur-3xl" />
      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-3xl font-bold text-slate-50 sm:text-4xl">
          Ready to Explore Restaurant Intelligence?
        </h2>
        <p className="mt-4 text-lg text-slate-400">
          Dive into 1.3M+ records analyzed by Big Data and AI pipelines.
        </p>
        <a
          href="#"
          className="animate-pulse-glow mt-10 inline-block rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 px-9 py-4 text-base font-semibold text-white transition-transform hover:scale-105"
        >
          Access Dashboard
        </a>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="relative">
      <div className="h-px w-full bg-gradient-to-r from-indigo-500 to-cyan-400" />
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-10 px-6 py-14 md:grid-cols-4">
        <div className="col-span-2 md:col-span-1">
          <Logo />
          <p className="mt-4 text-sm text-slate-500">
            AI-driven restaurant analytics built on Apache Spark and a dual ML pipeline.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-200">Links</h4>
          <ul className="mt-4 space-y-2 text-sm text-slate-400">
            <li>
              <a href="#capabilities" className="hover:text-slate-50">
                Capabilities
              </a>
            </li>
            <li>
              <a href="#features" className="hover:text-slate-50">
                Features
              </a>
            </li>
            <li>
              <a href="#pipeline" className="hover:text-slate-50">
                Pipeline
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-200">Explore</h4>
          <ul className="mt-4 space-y-2 text-sm text-slate-400">
            <li>
              <a href="#gallery" className="hover:text-slate-50">
                Gallery
              </a>
            </li>
            <li>
              <a href="#faq" className="hover:text-slate-50">
                FAQ
              </a>
            </li>
            <li>
              <a href="#insights" className="hover:text-slate-50">
                Insights
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-200">Project</h4>
          <p className="mt-4 text-sm text-slate-400">Aptech TechWiz 7 Competition</p>
          <p className="mt-1 text-sm text-slate-500">© 2024 DineIQ Analytics</p>
        </div>
      </div>
      <div className="border-t border-white/5 px-6 py-6 text-center text-xs text-slate-500">
        Built with React, Tailwind, Apache Spark &amp; XGBoost
      </div>
    </footer>
  )
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#050B18] text-slate-50">
      <TopBar />
      <Navbar />
      <Hero />
      <Capabilities />
      <Expertise />
      <DemoShowcase />
      <Stats />
      <Features />
      <TechStack />
      <Gallery />
      <TaglineStrip />
      <Benefits />
      <Faq />
      <Pipeline />
      <Insights />
      <Discover />
      <CTA />
      <Footer />
    </div>
  )
}
