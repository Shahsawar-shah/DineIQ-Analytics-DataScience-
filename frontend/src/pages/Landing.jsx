import { useEffect, useRef, useState } from 'react'

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Tech Stack', href: '#tech-stack' },
  { label: 'Dashboard', href: '#cta' },
]

const STATS = [
  {
    target: 1300000,
    label: 'Records Processed',
    format: (v) => `${formatCompact(v)}+`,
  },
  {
    target: 150,
    label: 'Menu Items Analyzed',
    format: (v) => `${Math.round(v)}`,
  },
  {
    target: 50000,
    label: 'Customers Segmented',
    format: (v) => `${formatCompact(v)}+`,
  },
  {
    target: 99,
    label: 'Model Accuracy',
    format: (v) => `${Math.round(v)}%`,
  },
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

function Navbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'border-b border-indigo-500/20 bg-[#050B18]/90 py-3 backdrop-blur-md'
          : 'border-b border-transparent bg-transparent py-5'
      }`}
    >
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
    <section className="relative flex min-h-screen items-center overflow-hidden pt-24">
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

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 px-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-sm text-indigo-300">
            🏆 TechWiz 7 Competition
          </div>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-slate-50 sm:text-5xl lg:text-6xl">
            Restaurant Intelligence
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
              href="#features"
              className="rounded-lg border border-white/20 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Watch Demo
            </a>
          </div>
        </div>

        <div className="lg:col-span-2">
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
        </div>
      </div>
    </section>
  )
}

function Stats() {
  return (
    <section className="border-y border-white/5 bg-[#050B18] py-20">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-6 lg:grid-cols-4">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-white/5 p-8 text-center transition-all duration-300 hover:border-indigo-500/40 hover:shadow-[0_0_30px_rgba(99,102,241,0.2)]"
          >
            <p className="text-gradient text-4xl font-extrabold sm:text-5xl">
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
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-6 py-10 md:flex-row md:justify-between">
        <div className="flex flex-col items-center gap-1 md:items-start">
          <Logo />
          <span className="text-xs text-slate-500">TechWiz 7 Competition Project</span>
        </div>
        <div className="flex gap-6 text-sm text-slate-400">
          <a href="#cta" className="hover:text-slate-50">
            Dashboard
          </a>
          <a href="#features" className="hover:text-slate-50">
            Features
          </a>
          <a href="#tech-stack" className="hover:text-slate-50">
            Tech Stack
          </a>
        </div>
        <p className="text-xs text-slate-500">© 2024 DineIQ Analytics — Aptech TechWiz 7</p>
      </div>
    </footer>
  )
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#050B18] text-slate-50">
      <Navbar />
      <Hero />
      <Stats />
      <Features />
      <TechStack />
      <CTA />
      <Footer />
    </div>
  )
}
