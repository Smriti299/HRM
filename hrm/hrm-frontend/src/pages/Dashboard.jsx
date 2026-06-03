import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout.jsx'
import { StatCard, Spinner, Badge } from '../components/common/index.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import api from '../services/api.js'
import { formatDate } from '../utils/helpers.js'
import '../styles/dashboard.css'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  AreaChart,
  Area,
} from 'recharts'

const statusColors = {
  present: '#38bdf8',
  absent: '#fb7185',
  onLeave: '#fbbf24',
  'on leave': '#fbbf24',
  late: '#f97316',
  halfDay: '#60a5fa',
  'half-day': '#60a5fa',
}

const leaveColors = {
  'Sick Leave': '#60a5fa',
  'Casual Leave': '#f59e0b',
  'Earned Leave': '#22c55e',
  'Unpaid Leave': '#ef4444',
}

const formatChartDate = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function Dashboard() {
  const { user }   = useAuth()
  const navigate   = useNavigate()
  const [data, setData]               = useState({})
  const [leaves, setLeaves]           = useState([])
  const [loading, setLoading]         = useState(true)
  const [analytics, setAnalytics]     = useState({ attendance: null, leave: null, departments: null })
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [analyticsError, setAnalyticsError]     = useState(null)
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

  useEffect(() => {
    if (!isAdminHR) return
    const loadAnalytics = async () => {
      setAnalyticsError(null)
      setAnalyticsLoading(true)
      try {
        const [attendanceRes, leaveRes, deptRes] = await Promise.all([
          api.get('/analytics/attendance'),
          api.get('/analytics/leave'),
          api.get('/analytics/departments'),
        ])
        setAnalytics({
          attendance: attendanceRes.data.data,
          leave: leaveRes.data.data,
          departments: deptRes.data.data,
        })
      } catch (err) {
        setAnalyticsError(err.response?.data?.message || err.message || 'Failed to load analytics')
      } finally {
        setAnalyticsLoading(false)
      }
    }
    loadAnalytics()
  }, [isAdminHR])

  const hr = new Date().getHours()
  const greeting = hr < 12 ? 'Morning' : hr < 17 ? 'Afternoon' : 'Evening'

  if (loading) return <Layout title="Dashboard"><Spinner /></Layout>

  const attendanceTrend = analytics.attendance?.attendanceTrend || []
  const attendanceDistribution = analytics.attendance?.attendanceDistribution || []
  const monthlyAttendanceOverview = analytics.attendance?.monthlyAttendanceOverview || []
  const leaveDistribution = analytics.leave?.leaveDistribution || []
  const leaveRequestsTrend = analytics.leave?.leaveRequestsTrend || []
  const departmentComparison = analytics.departments?.departmentComparison || []

  const presentLast30 = attendanceTrend.reduce((sum, row) => sum + (row.present || 0), 0)
  const absentLast30 = attendanceTrend.reduce((sum, row) => sum + (row.absent || 0), 0)
  const leaveRequestsLast12 = leaveRequestsTrend.reduce((sum, row) => sum + (row.approved || 0) + (row.rejected || 0), 0)
  const totalDepartments = departmentComparison.length

  const renderLegend = (data, colorMap) => (
    <div className="chart-legend">
      {data.map((entry) => (
        <div key={entry.name} className="chart-legend-item">
          <span className="chart-legend-swatch" style={{ background: colorMap[entry.name] || statusColors[entry.name.toLowerCase()] }} />
          <span>{entry.name}</span>
        </div>
      ))}
    </div>
  )

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
        <div className="dashboard-kpi">
          <StatCard icon="👥" label="Total Employees" value={data.totalEmp || 0}          type="accent"  />
          <StatCard icon="✅" label="Present Today"   value={data.today?.present || 0}    type="success" />
          <StatCard icon="❌" label="Absent Today"    value={data.today?.absent || 0}     type="accent"  />
          <StatCard icon="🌴" label="On Leave Today"  value={data.today?.onLeave || 0}    type="warning" />
        </div>
      )}

      {data.summary && !analyticsLoading && !analyticsError && (
        <div className="dashboard-kpi">
          <StatCard icon="📅" label="Present This Month" value={data.summary.present} type="success" />
          <StatCard icon="📈" label="30-Day Present"    value={presentLast30}      type="success" />
          <StatCard icon="📉" label="30-Day Absent"     value={absentLast30}       type="accent"  />
          <StatCard icon="📝" label="Leave Requests"    value={leaveRequestsLast12} type="warning" />
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

      {isAdminHR && (
        <>
          {analyticsLoading && (
            <div className="dashboard-grid analytics-skeleton">
              {[1, 2, 3, 4].map((index) => <div key={index} className="skeleton-box" />)}
            </div>
          )}

          {analyticsError && (
            <div className="dashboard-grid">
              <div className="card span-full">
                <div className="card-header">
                  <div><div className="card-title">Analytics unavailable</div><div className="card-subtitle">Unable to load chart data</div></div>
                </div>
                <div className="card-body">
                  <p style={{ color: 'var(--text-muted)', margin: 0 }}>{analyticsError}</p>
                </div>
              </div>
            </div>
          )}

          {!analyticsLoading && !analyticsError && (
            <>
              <div className="dashboard-grid">
                <div className="card span-full">
                  <div className="card-header">
                    <div>
                      <div className="card-title">Attendance Trend</div>
                      <div className="card-subtitle">Last 30 days of present, absent and on leave</div>
                    </div>
                  </div>
                  <div className="card-body chart-card-body">
                    {attendanceTrend.length === 0
                      ? <div className="analytics-empty">No attendance trend data available.</div>
                      : (
                        <ResponsiveContainer width="100%" height={340}>
                          <LineChart data={attendanceTrend} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="date" tickFormatter={formatChartDate} stroke="var(--text-muted)" />
                            <YAxis stroke="var(--text-muted)" />
                            <Tooltip formatter={(value) => [value, '']} contentStyle={{ background: 'var(--bg)', borderColor: 'var(--border)' }} />
                            <Legend wrapperStyle={{ color: 'var(--text-primary)' }} />
                            <Line type="monotone" dataKey="present" name="Present" stroke={statusColors.present} strokeWidth={3} dot={false} />
                            <Line type="monotone" dataKey="absent" name="Absent" stroke={statusColors.absent} strokeWidth={3} dot={false} />
                            <Line type="monotone" dataKey="onLeave" name="On Leave" stroke={statusColors.onLeave} strokeWidth={3} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                  </div>
                </div>
              </div>

              <div className="dashboard-grid">
                <div className="card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">Attendance Distribution</div>
                      <div className="card-subtitle">Present, absent, late and half day</div>
                    </div>
                  </div>
                  <div className="card-body chart-card-body" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    {attendanceDistribution.length === 0
                      ? <div className="analytics-empty">No attendance distribution data available.</div>
                      : (
                        <>
                          <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                              <Pie data={attendanceDistribution} dataKey="value" nameKey="name" innerRadius={56} outerRadius={96} paddingAngle={2}>
                                {attendanceDistribution.map((entry) => (
                                  <Cell key={entry.name} fill={statusColors[entry.name.toLowerCase()] || statusColors.present} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value) => [`${value}`, '']} contentStyle={{ background: 'var(--bg)', borderColor: 'var(--border)' }} />
                            </PieChart>
                          </ResponsiveContainer>
                          {renderLegend(attendanceDistribution, statusColors)}
                        </>
                      )}
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">Leave Analytics</div>
                      <div className="card-subtitle">Leave type breakdown</div>
                    </div>
                  </div>
                  <div className="card-body chart-card-body" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    {leaveDistribution.length === 0
                      ? <div className="analytics-empty">No leave analytics data available.</div>
                      : (
                        <>
                          <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                              <Pie data={leaveDistribution} dataKey="value" nameKey="name" innerRadius={54} outerRadius={92} paddingAngle={2}>
                                {leaveDistribution.map((entry) => (
                                  <Cell key={entry.name} fill={leaveColors[entry.name] || '#8b5cf6'} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value) => [`${value} day(s)`, '']} contentStyle={{ background: 'var(--bg)', borderColor: 'var(--border)' }} />
                            </PieChart>
                          </ResponsiveContainer>
                          {renderLegend(leaveDistribution, leaveColors)}
                        </>
                      )}
                  </div>
                </div>
              </div>

              <div className="dashboard-grid">
                <div className="card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">Monthly Attendance Overview</div>
                      <div className="card-subtitle">Past 12 months attendance %</div>
                    </div>
                  </div>
                  <div className="card-body chart-card-body">
                    {monthlyAttendanceOverview.length === 0
                      ? <div className="analytics-empty">No monthly attendance data available.</div>
                      : (
                        <ResponsiveContainer width="100%" height={320}>
                          <BarChart data={monthlyAttendanceOverview} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="month" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                            <YAxis stroke="var(--text-muted)" unit="%" />
                            <Tooltip formatter={(value) => [`${value}%`, 'Attendance']} contentStyle={{ background: 'var(--bg)', borderColor: 'var(--border)' }} />
                            <Bar dataKey="attendance" name="Attendance" fill={statusColors.present} radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">Leave Requests Trend</div>
                      <div className="card-subtitle">Approved vs rejected requests</div>
                    </div>
                  </div>
                  <div className="card-body chart-card-body">
                    {leaveRequestsTrend.length === 0
                      ? <div className="analytics-empty">No leave request trend data available.</div>
                      : (
                        <ResponsiveContainer width="100%" height={320}>
                          <AreaChart data={leaveRequestsTrend} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="approvedGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#34d399" stopOpacity={0.7} />
                                <stop offset="95%" stopColor="#34d399" stopOpacity={0.05} />
                              </linearGradient>
                              <linearGradient id="rejectedGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#fb7185" stopOpacity={0.7} />
                                <stop offset="95%" stopColor="#fb7185" stopOpacity={0.05} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="month" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                            <YAxis stroke="var(--text-muted)" />
                            <Tooltip contentStyle={{ background: 'var(--bg)', borderColor: 'var(--border)' }} />
                            <Legend wrapperStyle={{ color: 'var(--text-primary)' }} />
                            <Area type="monotone" dataKey="approved" name="Approved" stroke="#34d399" fill="url(#approvedGradient)" />
                            <Area type="monotone" dataKey="rejected" name="Rejected" stroke="#fb7185" fill="url(#rejectedGradient)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      )}
                  </div>
                </div>
              </div>

              <div className="dashboard-grid">
                <div className="card span-full">
                  <div className="card-header">
                    <div>
                      <div className="card-title">Department Comparison</div>
                      <div className="card-subtitle">Employees and attendance by department</div>
                    </div>
                  </div>
                  <div className="card-body chart-card-body">
                    {departmentComparison.length === 0
                      ? <div className="analytics-empty">No department comparison data available.</div>
                      : (
                        <ResponsiveContainer width="100%" height={360}>
                          <BarChart data={departmentComparison} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="department" stroke="var(--text-muted)" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={70} />
                            <YAxis stroke="var(--text-muted)" />
                            <Tooltip contentStyle={{ background: 'var(--bg)', borderColor: 'var(--border)' }} />
                            <Legend wrapperStyle={{ color: 'var(--text-primary)' }} />
                            <Bar dataKey="employeeCount" name="Employees" fill="#818cf8" radius={[8, 8, 0, 0]} />
                            <Bar dataKey="present" name="Present" fill={statusColors.present} radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </Layout>
  )
}
