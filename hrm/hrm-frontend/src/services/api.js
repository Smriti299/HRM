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
    const requestUrl = err.config?.url || ''
    const isSuperAdminRequest = requestUrl.includes('/super-admin/')
    const isLoginRequest = /\/(auth|super-admin)\/login(?:\?|$)/.test(requestUrl)
    const companyPaused = err.response?.data?.code === 'COMPANY_INACTIVE'

    if (companyPaused || (err.response?.status === 401 && !isLoginRequest)) {
      if (companyPaused) {
        localStorage.setItem('hrm_access_notice', err.response.data.message || 'Company access is paused.')
      }
      localStorage.removeItem('hrm_token')
      localStorage.removeItem('hrm_user')
      localStorage.removeItem('hrm_company')
      localStorage.removeItem('hrm_super_admin')
      window.location.href = isSuperAdminRequest && !companyPaused ? '/super-admin/login' : '/login'
    }
    return Promise.reject(err)
  }
)

export default api
