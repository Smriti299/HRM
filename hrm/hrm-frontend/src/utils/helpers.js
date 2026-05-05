export const formatDate = (date) => {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const formatTime = (date) => {
  if (!date) return '—'
  return new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

export const formatCurrency = (amount) => {
  if (amount == null) return '₹0'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

export const getInitials = (first = '', last = '') =>
  `${first[0] || ''}${last[0] || ''}`.toUpperCase()

export const getMonthName = (m) =>
  ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1] || ''

export const statusBadgeClass = (status) => ({
  Active: 'badge-success', Inactive: 'badge-danger',
  Present: 'badge-success', Absent: 'badge-danger',
  'Half-Day': 'badge-warning', Late: 'badge-info', 'On-Leave': 'badge-muted',
  Approved: 'badge-success', Rejected: 'badge-danger',
  Pending: 'badge-warning', Cancelled: 'badge-muted',
  Paid: 'badge-success', Generated: 'badge-info', Draft: 'badge-muted',
  Admin: 'badge-danger', Manager: 'badge-info', HR: 'badge-info', Employee: 'badge-muted',
})[status] || 'badge-muted'

const COLORS = ['#e94560','#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899','#14b8a6']
export const getAvatarColor = (name = '') => {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return COLORS[Math.abs(h) % COLORS.length]
}
