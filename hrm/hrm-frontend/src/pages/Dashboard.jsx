import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout.jsx'
import { StatCard, Spinner, Badge } from '../components/common/index.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import api from '../services/api.js'
import { formatDate } from '../utils/helpers.js'
import '../styles/dashboard.css'

export default function Dashboard() {
  const { user }   = useAuth()
  const navigate   = useNavigate()
  const [data, setData]       = useState({})
  const [leaves, setLeaves]   = useState([])
  const [loading, setLoading] = useState(true)
  const isAdminHR = ['Admin', 'Manager', 'HR'].includes(user?.role)

  useEffect(() => {
    const load = async () => {
      const month = new Date().getMonth() + 1
      const year  = new Date().getFullYear()
      const results = await Promise.allSettled([
        api.get(`/attendance/me?month=${month}&year=${year}`),
        api.get('/leaves?limit=5'),
        isAdminHR ? api.get('/employees?limit=1') : Promise.resolve(null),
        isAdminHR ? api.get('/attendance/today/summary') : Promise.resolve(null),
      ])
      const d = {}
      if (results[0].status === 'fulfilled') d.summary = results[0].value.data.data?.summary
      if (results[1].status === 'fulfilled') setLeaves(results[1].value.data.data || [])
      if (results[2].status === 'fulfilled' && results[2].value) d.totalEmp = results[2].value.data.meta?.total
      if (results[3].status === 'fulfilled' && results[3].value) d.today    = results[3].value.data.data?.summary
      setData(d)
      setLoading(false)
    }
    load()
  }, [isAdminHR])

  const hr = new Date().getHours()
  const greeting = hr < 12 ? 'Morning' : hr < 17 ? 'Afternoon' : 'Evening'

  if (loading) return <Layout title="Dashboard"><Spinner /></Layout>

  return (
    <Layout title={`Good ${greeting}, ${user?.firstName}! 👋`} subtitle="Here's what's happening today">

      <div className="welcome-banner">
        <div className="welcome-text">
          <h2>{user?.firstName} {user?.lastName}</h2>
          <p>{user?.role} · {formatDate(new Date())}</p>
        </div>
        <div className="welcome-emoji">🏢</div>
      </div>

      {isAdminHR && (
        <div className="dashboard-stats">
          <StatCard icon="👥" label="Total Employees" value={data.totalEmp || 0}          type="accent"  />
          <StatCard icon="✅" label="Present Today"   value={data.today?.present || 0}    type="success" />
          <StatCard icon="❌" label="Absent Today"    value={data.today?.absent || 0}     type="accent"  />
          <StatCard icon="🌴" label="On Leave Today"  value={data.today?.onLeave || 0}    type="warning" />
        </div>
      )}

      {data.summary && (
        <div className="dashboard-stats">
          <StatCard icon="📅" label="Present This Month" value={data.summary.present}               type="success" />
          <StatCard icon="🌴" label="Leave Days"         value={data.summary.onLeave}               type="warning" />
          <StatCard icon="⏰" label="Total Hours"        value={`${data.summary.totalHours}h`}      type="info"    />
          <StatCard icon="📊" label="Days Tracked"       value={data.summary.totalDays}             type="accent"  />
        </div>
      )}

      <div className="dashboard-grid">
        <div className="card">
          <div className="card-header">
            <div><div className="card-title">Quick Actions</div><div className="card-subtitle">Jump to common tasks</div></div>
          </div>
          <div className="card-body">
            <div className="quick-actions">
              {[
                { icon:'⏱️', label:'Check In / Out',  sub:'Mark attendance', to:'/attendance' },
                { icon:'📝', label:'Apply Leave',      sub:'Request time off', to:'/leaves'    },
                { icon:'💰', label:'View Payslip',     sub:'Salary details',   to:'/payroll'   },
                { icon:'👤', label:'My Profile',       sub:'View details',     to:'/profile'   },
              ].map((a) => (
                <button key={a.to} className="quick-action-btn" onClick={() => navigate(a.to)}>
                  <span className="quick-action-icon">{a.icon}</span>
                  <span className="quick-action-label">{a.label}</span>
                  <span className="quick-action-sub">{a.sub}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div><div className="card-title">Recent Leave Requests</div><div className="card-subtitle">Your latest applications</div></div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/leaves')}>View all</button>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {leaves.length === 0
              ? <div style={{ padding:'24px', textAlign:'center', color:'var(--text-muted)', fontSize:'.875rem' }}>No leave requests yet</div>
              : leaves.slice(0,4).map((l) => (
                  <div key={l._id} className="activity-item">
                    <div className="activity-dot" style={{
                      background: l.status==='Approved' ? 'var(--success)' : l.status==='Rejected' ? 'var(--danger)' : 'var(--warning)'
                    }} />
                    <div className="activity-content">
                      <div className="activity-title">{l.leaveType} Leave · {l.totalDays} day(s)</div>
                      <div className="activity-time">{formatDate(l.startDate)} – {formatDate(l.endDate)}</div>
                    </div>
                    <Badge status={l.status} />
                  </div>
                ))
            }
          </div>
        </div>
      </div>
    </Layout>
  )
}
