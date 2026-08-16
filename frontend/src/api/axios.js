import axios from 'axios'

// Use an explicit API URL (e.g. an ngrok/Cloudflare tunnel) when set, otherwise
// fall back to the relative /api path that the Vite dev server proxies to the
// backend on localhost. This lets the app run from any network, not just the
// dev machine's LAN.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export default api
