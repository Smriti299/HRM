import React from 'react'
import { statusBadgeClass } from '../../utils/helpers.js'

export const Badge = ({ status }) => (
  <span className={`badge ${statusBadgeClass(status)}`}>{status}</span>
)

export const Spinner = ({ text = 'Loading...' }) => (
  <div className="loading-container">
    <div className="spinner" />
    <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{text}</span>
  </div>
)

export const Alert = ({ type = 'error', message }) => {
  if (!message) return null
  const icon = { error: '⚠️', success: '✅', warning: '⚡', info: 'ℹ️' }[type] || 'ℹ️'
  return (
    <div className={`alert alert-${type}`}>
      <span>{icon}</span>
      <span>{message}</span>
    </div>
  )
}

export const EmptyState = ({ icon = '📭', title = 'Nothing here', message = '' }) => (
  <div className="empty-state">
    <div className="empty-state-icon">{icon}</div>
    <h3>{title}</h3>
    {message && <p>{message}</p>}
  </div>
)

export const Pagination = ({ page, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null
  return (
    <div className="pagination">
      <button className="page-btn" disabled={page === 1} onClick={() => onPageChange(page - 1)}>←</button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button key={p} className={`page-btn${p === page ? ' active' : ''}`} onClick={() => onPageChange(p)}>{p}</button>
      ))}
      <button className="page-btn" disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>→</button>
    </div>
  )
}

export const Modal = ({ title, onClose, children, footer }) => (
  <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
    <div className="modal">
      <div className="modal-header">
        <h3 className="modal-title">{title}</h3>
        <button className="modal-close" onClick={onClose}>✕</button>
      </div>
      <div className="modal-body">{children}</div>
      {footer && <div className="modal-footer">{footer}</div>}
    </div>
  </div>
)

export const StatCard = ({ icon, label, value, type = 'accent' }) => (
  <div className={`stat-card ${type}`}>
    <div className={`stat-icon ${type}`}>{icon}</div>
    <div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  </div>
)
