import { API_BASE_URL } from '../config/api'

const BASE = API_BASE_URL

const getToken = () => localStorage.getItem('dineiq_token')

const authHeaders = () => ({
  'Content-Type': 'application/json',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {})
})

const asJson = async (res) => {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail || data.error || `Request failed (${res.status})`)
  return data
}

const get = (path) => fetch(`${BASE}${path}`, { headers: authHeaders() }).then(asJson)
const send = (method, path, body) => fetch(`${BASE}${path}`, {
  method,
  headers: authHeaders(),
  body: body === undefined ? undefined : JSON.stringify(body),
}).then(asJson)
const qs = (params) => {
  const s = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))
  return s.toString() ? `?${s}` : ''
}

export const api = {
  menu: {
    items: () => get('/menu/items'),
    summary: () => get('/menu/summary'),
    topRevenue: (n = 10) => get(`/menu/top-revenue?limit=${n}`),
    classifications: () => get('/menu/classifications'),
    profitDrivers: () => get('/menu/profit-drivers'),
    volumeDrivers: () => get('/menu/volume-drivers'),
    hiddenOpportunities: () => get('/menu/hidden-opportunities'),
    lowPerformers: () => get('/menu/low-performers'),
    highWastage: (n = 10) => get(`/menu/high-wastage?limit=${n}`),
  },
  auth: {
    login: (email, password) => fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    }).then(r => r.json()),
    register: (name, email, password, role) => fetch(`${BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role })
    }).then(r => r.json()),
    me: () => get('/auth/me'),
    roles: () => get('/auth/roles'),
    users: () => get('/auth/users'),
    createUser: (data) => send('POST', '/auth/users', data),
    updateUser: (id, data) => send('PUT', `/auth/users/${id}`, data),
    deleteUser: (id) => send('DELETE', `/auth/users/${id}`),
  },

  dashboard: {
    summary: () => get('/dashboard/summary'),
    mlMetrics: () => get('/dashboard/ml-metrics'),
  },

  customers: {
    summary: () => get('/customers/summary'),
    segments: () => get('/customers/segments'),
    rfm: (n = 20) => get(`/customers/rfm?limit=${n}`),
    rfmDistribution: () => get('/customers/rfm-distribution'),
    atRisk: (n = 20) => get(`/customers/at-risk?limit=${n}`),
    promotionSensitive: (n = 20) => get(`/customers/promotion-sensitive?limit=${n}`),
  },

  wastage: {
    summary: () => get('/wastage/summary'),
    highRisk: (n = 10) => get(`/wastage/high-risk?limit=${n}`),
    byReason: () => get('/wastage/by-reason'),
    trends: () => get('/wastage/trends'),
    byLocation: () => get('/wastage/by-location'),
  },

  forecast: {
    demand: ({ level = 'overall', entityId, horizon = 30 } = {}) =>
      get(`/forecast/demand${qs({ level, entity_id: entityId, horizon })}`),
    metrics: (level = 'overall') => get(`/forecast/metrics?level=${level}`),
    comparison: () => get('/forecast/comparison'),
    entities: (level) => get(`/forecast/entities?level=${level}`),
  },

  basket: {
    rules: ({ minLift = 1, minConfidence = 0, includeLossItems = true, limit = 50 } = {}) =>
      get(`/basket/rules${qs({ min_lift: minLift, min_confidence: minConfidence, include_loss_items: includeLossItems, limit })}`),
    bundles: () => get('/basket/bundles'),
    recommendations: () => get('/basket/recommendations'),
  },

  pricing: {
    sensitivity: (sensitivity) => get(`/pricing/sensitivity${qs({ sensitivity })}`),
    item: (id) => get(`/pricing/items/${id}`),
  },

  dualPipeline: {
    summary: () => get('/dual-pipeline/summary'),
    customers: ({ status = 'all', segment, limit = 200, offset = 0 } = {}) =>
      get(`/dual-pipeline/customers${qs({ status, segment, limit, offset })}`),
    menu: (split = 'all') => get(`/dual-pipeline/menu?split=${split}`),
  },

  locations: {
    summary: () => get('/locations/summary'),
    top: (n = 5) => get(`/locations/top?limit=${n}`),
  },

  recommendations: {
    all: () => get('/recommendations/all'),
  },

  anomalies: {
    sales: () => get('/anomalies/sales'),
    ratings: () => get('/anomalies/ratings'),
  },

  orders: {
    summary: () => get('/orders/summary'),
    byChannel: () => get('/orders/by-channel'),
  },

  promotions: {
    summary: () => get('/promotions/summary'),
    traps: () => get('/promotions/traps'),
    effectiveness: () => get('/promotions/effectiveness'),
  },

  whatif: {
    items: () => get('/whatif/items'),
    simulate: (data) => send('POST', '/whatif/simulate', data),
  },

  notifications: {
    list: () => get('/notifications'),
    dismiss: (keys) => send('POST', '/notifications/dismiss', { keys }),
    dismissAll: () => send('POST', '/notifications/dismiss-all'),
  },

  admin: {
    auditLogs: ({ limit = 200, eventType, q } = {}) => get(`/admin/audit-logs${qs({ limit, event_type: eventType, q })}`),
    sparkJobs: (limit = 50) => get(`/admin/spark-jobs?limit=${limit}`),
    pipelinePresets: () => get('/admin/run-pipeline/presets'),
    runPipeline: (preset = 'core') => send('POST', '/admin/run-pipeline', { preset }),
    pipelineStatus: () => get('/admin/run-pipeline/status'),
    cancelPipeline: () => send('POST', '/admin/run-pipeline/cancel'),
  },
}
