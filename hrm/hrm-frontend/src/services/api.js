import axios from 'axios'

const rawBaseURL = import.meta.env.VITE_API_URL || '/api'
const normalizedBaseURL = rawBaseURL.startsWith('http')
  ? rawBaseURL.replace(/\/+$/, '')
  : rawBaseURL.startsWith('/')
    ? rawBaseURL.replace(/\/+$/, '')
    : `/${rawBaseURL.replace(/\/+$/, '')}`

const api = axios.create({
  baseURL: normalizedBaseURL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hrm_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('hrm_token')
      localStorage.removeItem('hrm_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
