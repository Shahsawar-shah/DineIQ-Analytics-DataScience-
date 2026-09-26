const BASE = 'http://localhost:8000/api';

export const api = {
  menu: {
    summary: () => fetch(`${BASE}/menu/summary`).then(r => r.json()),
    topRevenue: (n=10) => fetch(`${BASE}/menu/top-revenue?limit=${n}`).then(r => r.json()),
    classifications: () => fetch(`${BASE}/menu/classifications`).then(r => r.json()),
    profitDrivers: () => fetch(`${BASE}/menu/profit-drivers`).then(r => r.json()),
    volumeDrivers: () => fetch(`${BASE}/menu/volume-drivers`).then(r => r.json()),
    hiddenOpportunities: () => fetch(`${BASE}/menu/hidden-opportunities`).then(r => r.json()),
    lowPerformers: () => fetch(`${BASE}/menu/low-performers`).then(r => r.json()),
    highWastage: (n=10) => fetch(`${BASE}/menu/high-wastage?limit=${n}`).then(r => r.json()),
  }
};
