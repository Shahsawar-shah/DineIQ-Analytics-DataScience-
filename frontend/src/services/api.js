const BASE = 'http://localhost:8000/api'

const getToken = () => localStorage.getItem('dineiq_token')

const authHeaders = () => ({
  'Content-Type': 'application/json',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {})
})

export const api = {
  menu: {
    items: () => fetch(`${BASE}/menu/items`,
      { headers: authHeaders() }).then(r => r.json()),
    summary: () => fetch(`${BASE}/menu/summary`,
      { headers: authHeaders() }).then(r => r.json()),
    topRevenue: (n=10) => fetch(`${BASE}/menu/top-revenue?limit=${n}`,
      { headers: authHeaders() }).then(r => r.json()),
    classifications: () => fetch(`${BASE}/menu/classifications`,
      { headers: authHeaders() }).then(r => r.json()),
    profitDrivers: () => fetch(`${BASE}/menu/profit-drivers`,
      { headers: authHeaders() }).then(r => r.json()),
    volumeDrivers: () => fetch(`${BASE}/menu/volume-drivers`,
      { headers: authHeaders() }).then(r => r.json()),
    hiddenOpportunities: () => fetch(`${BASE}/menu/hidden-opportunities`,
      { headers: authHeaders() }).then(r => r.json()),
    lowPerformers: () => fetch(`${BASE}/menu/low-performers`,
      { headers: authHeaders() }).then(r => r.json()),
    highWastage: (n=10) => fetch(`${BASE}/menu/high-wastage?limit=${n}`,
      { headers: authHeaders() }).then(r => r.json()),
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
    me: () => fetch(`${BASE}/auth/me`, {
      headers: authHeaders()
    }).then(r => r.json())
  },

  dashboard: {
    summary: () => fetch(`${BASE}/dashboard/summary`,
      { headers: authHeaders() }).then(r => r.json()),
    kpis: () => fetch(`${BASE}/dashboard/kpis`,
      { headers: authHeaders() }).then(r => r.json()),
  },

  customers: {
    summary: () => fetch(`${BASE}/customers/summary`,
      { headers: authHeaders() }).then(r => r.json()),
    segments: () => fetch(`${BASE}/customers/segments`,
      { headers: authHeaders() }).then(r => r.json()),
    rfm: (n=20) => fetch(`${BASE}/customers/rfm?limit=${n}`,
      { headers: authHeaders() }).then(r => r.json()),
    atRisk: (n=20) => fetch(`${BASE}/customers/at-risk?limit=${n}`,
      { headers: authHeaders() }).then(r => r.json()),
  },

  wastage: {
    summary: () => fetch(`${BASE}/wastage/summary`,
      { headers: authHeaders() }).then(r => r.json()),
    highRisk: (n=10) => fetch(`${BASE}/wastage/high-risk?limit=${n}`,
      { headers: authHeaders() }).then(r => r.json()),
    byReason: () => fetch(`${BASE}/wastage/by-reason`,
      { headers: authHeaders() }).then(r => r.json()),
  },

  locations: {
    summary: () => fetch(`${BASE}/locations/summary`,
      { headers: authHeaders() }).then(r => r.json()),
    top: (n=5) => fetch(`${BASE}/locations/top?limit=${n}`,
      { headers: authHeaders() }).then(r => r.json()),
  },

  recommendations: {
    all: () => fetch(`${BASE}/recommendations/all`,
      { headers: authHeaders() }).then(r => r.json()),
  },

  anomalies: {
    sales: () => fetch(`${BASE}/anomalies/sales`,
      { headers: authHeaders() }).then(r => r.json()),
  },

  orders: {
    summary: () => fetch(`${BASE}/orders/summary`,
      { headers: authHeaders() }).then(r => r.json()),
    byChannel: () => fetch(`${BASE}/orders/by-channel`,
      { headers: authHeaders() }).then(r => r.json()),
  },

  promotions: {
    summary: () => fetch(`${BASE}/promotions/summary`,
      { headers: authHeaders() }).then(r => r.json()),
    traps: () => fetch(`${BASE}/promotions/traps`,
      { headers: authHeaders() }).then(r => r.json()),
  },

  whatif: {
    items: () => fetch(`${BASE}/whatif/items`,
      { headers: authHeaders() }).then(r => r.json()),
    simulate: (data) => fetch(`${BASE}/whatif/simulate`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data)
    }).then(r => r.json()),
  }
}
