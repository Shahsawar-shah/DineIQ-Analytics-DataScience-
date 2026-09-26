const BASE = 'http://localhost:8000/api'

const getToken = () => localStorage.getItem('dineiq_token')

const authHeaders = () => ({
  'Content-Type': 'application/json',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {})
})

export const api = {
  menu: {
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
  }
}
