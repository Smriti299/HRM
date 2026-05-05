import React, { useState, useRef, useEffect } from 'react'
import { useNotifications } from '../../context/NotificationContext.jsx'
import '../../styles/notification.css'

const TYPE_ICON = {
  ATTENDANCE_UPDATED:    '📅',
  LEAVE_BALANCE_UPDATED: '🌴',
  LEAVE_REVIEWED:        '✅',
  GENERAL:               '🔔',
}

const timeAgo = (date) => {
  const diff = (Date.now() - new Date(date)) / 1000
  if (diff < 60)   return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function NotificationBell() {
  const { notifications, unreadCount, loading, fetchNotifications, markOneRead, markAllRead, deleteOne } = useNotifications()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleOpen = () => {
    setOpen((v) => !v)
    if (!open) fetchNotifications()
  }

  const handleClickNotif = (n) => {
    if (!n.isRead) markOneRead(n._id)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="notif-btn" onClick={handleOpen} title="Notifications">
        🔔
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notif-dropdown">
          <div className="notif-dropdown-header">
            <div className="notif-dropdown-title">
              Notifications
              {unreadCount > 0 && (
                <span style={{ background:'var(--accent-soft)', color:'var(--accent)', fontSize:'.7rem', fontWeight:700, padding:'2px 8px', borderRadius:10 }}>
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="notif-dropdown-actions">
              {unreadCount > 0 && (
                <button className="btn btn-ghost btn-sm" onClick={markAllRead} title="Mark all read">
                  ✓ All read
                </button>
              )}
            </div>
          </div>

          <div className="notif-list">
            {loading ? (
              <div className="notif-empty">
                <div className="spinner" style={{ margin: '20px auto' }} />
              </div>
            ) : notifications.length === 0 ? (
              <div className="notif-empty">
                <div className="notif-empty-icon">🔔</div>
                <div>You're all caught up!</div>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  className={`notif-item${n.isRead ? '' : ' unread'}`}
                  onClick={() => handleClickNotif(n)}
                >
                  <div className={`notif-icon ${n.type}`}>
                    {TYPE_ICON[n.type] || '🔔'}
                  </div>
                  <div className="notif-content">
                    <div className="notif-title">{n.title}</div>
                    <div className="notif-message">{n.message}</div>
                    <div className="notif-time">{timeAgo(n.createdAt)}</div>
                  </div>
                  <button
                    className="notif-delete"
                    onClick={(e) => { e.stopPropagation(); deleteOne(n._id) }}
                    title="Delete"
                  >✕</button>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="notif-footer">
              Showing last {notifications.length} notifications
            </div>
          )}
        </div>
      )}
    </div>
  )
}
