/** Backend base URL (including /api). Set VITE_API_BASE_URL in frontend/.env — see frontend/.env.example. */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api').replace(/\/$/, '')
