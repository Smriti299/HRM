import React, { useState } from 'react'
import Sidebar from './Sidebar.jsx'
import NotificationBell from '../common/NotificationBell.jsx'
import ThemeToggle from '../common/ThemeToggle.jsx'
import { formatDate } from '../../utils/helpers.js'
import { useAuth } from '../../context/AuthContext.jsx'

export default function Layout({ children, title, subtitle }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { company } = useAuth()

  return (
    <div className="layout">

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Dark overlay — tap to close sidebar */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay show"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="main-content">
        <header className="header">
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>

            {/* Hamburger button */}
            <button
              className="hamburger-btn"
              onClick={() => setSidebarOpen((v) => !v)}
              style={{
                background: 'none',
                border: '1.5px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '1.1rem',
                flexShrink: 0,
                color: 'var(--text-primary)',
              }}
            >
              ☰
            </button>

            <div className="header-left">
              <h1>{title}</h1>
              {(company?.name || subtitle) && <p>{company?.name ? `${company.name}${subtitle ? ' · ' + subtitle : ''}` : subtitle}</p>}
            </div>
          </div>

          <div className="header-right">
            <span className="header-date">📅 {formatDate(new Date())}</span>
            <ThemeToggle />
            <NotificationBell />
          </div>
        </header>

        <main className="page-content page-enter">
          {children}
        </main>
      </div>
    </div>
  )
}
