import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { getInitials, getAvatarColor } from '../../utils/helpers.js'
import '../../styles/layout.css'
import { FaUser } from 'react-icons/fa'
const NAV = [
  { section: 'Main', links: [
    { to: '/dashboard', icon: '📊', label: 'Dashboard' },
    { to: '/profile',   icon: '👤', label: 'My Profile' },
  ]},
  { section: 'Workforce', roles: ['Admin', 'Manager', 'HR'], links: [
    { to: '/employees',   icon: '👥', label: 'Employees' },
    { to: '/departments', icon: '🏢', label: 'Departments' },
  ]},
  { section: 'Attendance', links: [
    { to: '/attendance', icon: '📅', label: 'My Attendance' },
  ]},
  { section: 'Admin Tools', roles: ['Admin', 'Manager', 'HR'], links: [
    { to: '/admin/attendance', icon: '🗂️', label: 'Manage Attendance' },
  ]},
  { section: 'Leave & Pay', links: [
    { to: '/leaves',  icon: '🌴', label: 'Leaves' },
    { to: '/payroll', icon: '💰', label: 'Payroll' },
  ]},
]

export default function Sidebar({ onClose }) {
  const { user, company, logout } = useAuth()
  const navigate = useNavigate()
  const initials = getInitials(user?.firstName, user?.lastName)
  const color    = getAvatarColor(`${user?.firstName}${user?.lastName}`)

  return (
    <>
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🏢</div>
        <div className="sidebar-logo-text">{company?.name || 'HRM'}<span>{company?.name ? '' : 'Pro'}</span></div>
      </div>

      <nav className="sidebar-nav">
        {NAV.map((section) => {
          if (section.roles && !section.roles.includes(user?.role)) return null
          return (
            <React.Fragment key={section.section}>
              <div className="nav-section-label">{section.section}</div>
              {section.links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                  onClick={onClose}
                >
                  <span className="nav-link-icon">{link.icon}</span>
                  {link.label}
                </NavLink>
              ))}
            </React.Fragment>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar" style={{ background: color }}><FaUser size={12}/></div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.firstName} {user?.lastName}</div>
            <div className="sidebar-user-role">{user?.role}</div>
          </div>
          <button
            className="logout-btn"
            onClick={() => { if (onClose) onClose(); logout(); navigate('/login') }}
            title="Logout"
            
          >
            ↩
          </button>
        </div>
      </div>
    </>
  )
}
