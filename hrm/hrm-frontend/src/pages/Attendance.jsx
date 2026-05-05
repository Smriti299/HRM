import React, { useEffect, useState } from 'react'
import Layout from '../components/layout/Layout.jsx'
import { Spinner, Badge, EmptyState, Alert } from '../components/common/index.jsx'
import api from '../services/api.js'
import { formatDate, formatTime } from '../utils/helpers.js'
import '../styles/pages.css'
import '../styles/components.css'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function Attendance() {
  const [records, setRecords]       = useState([])
  const [summary, setSummary]       = useState(null)
  const [loading, setLoading]       = useState(true)
  const [actionMsg, setActionMsg]   = useState('')
  const [actionErr, setActionErr]   = useState('')
  const [busy, setBusy]             = useState(false)
  const [clock, setClock]           = useState(new Date())
  const [month, setMonth]           = useState(new Date().getMonth() + 1)
  const [year, setYear]             = useState(new Date().getFullYear())

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const fetchAttendance = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/attendance/me?month=${month}&year=${year}`)
      setRecords(res.data.data.records || [])
      setSummary(res.data.data.summary || null)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchAttendance() }, [month, year])

  const doAction = async (endpoint, successMsg) => {
    setBusy(true); setActionMsg(''); setActionErr('')
    try {
      await api.post(`/attendance/${endpoint}`)
      setActionMsg(successMsg)
      fetchAttendance()
    } catch (err) {
      setActionErr(err.response?.data?.message || `${endpoint} failed`)
    } finally { setBusy(false) }
  }

  return (
    <Layout title="Attendance" subtitle="Track your daily attendance">

      {/* Live Clock + Check-in Card */}
      <div className="checkin-card">
        <div>
          <div className="checkin-time">
            {clock.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
          </div>
          <div className="checkin-date">{formatDate(new Date())}</div>
        </div>
        <div className="checkin-actions">
          <button className="btn-checkin" onClick={() => doAction('check-in', '✅ Checked in successfully!')} disabled={busy}>
            ✅ Check In
          </button>
          <button className="btn-checkout" onClick={() => doAction('check-out', '✅ Checked out successfully!')} disabled={busy}>
            🚪 Check Out
          </button>
        </div>
      </div>

      {actionMsg && <Alert type="success" message={actionMsg} />}
      {actionErr && <Alert type="error"   message={actionErr} />}

      {/* Month / Year Filter */}
      <div style={{ display:'flex', gap:12, marginBottom:18, alignItems:'center', flexWrap:'wrap' }}>
        <h3 style={{ fontFamily:'var(--font-display)', fontSize:'1rem', fontWeight:700 }}>Monthly Report</h3>
        <select className="form-control" style={{ width:'auto' }} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select className="form-control" style={{ width:'auto' }} value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {[2024, 2025, 2026].map((y) => <option key={y}>{y}</option>)}
        </select>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="attendance-summary-cards">
          <div className="attendance-summary-card present"><div className="value">{summary.present}</div><div className="label">Present</div></div>
          <div className="attendance-summary-card absent"> <div className="value">{summary.absent}</div> <div className="label">Absent</div></div>
          <div className="attendance-summary-card leave">  <div className="value">{summary.onLeave}</div><div className="label">On Leave</div></div>
          <div className="attendance-summary-card late">   <div className="value">{summary.late}</div>   <div className="label">Late</div></div>
          <div className="attendance-summary-card half">   <div className="value">{summary.halfDay}</div><div className="label">Half Day</div></div>
          <div className="attendance-summary-card" style={{ borderBottom:'3px solid var(--primary)' }}>
            <div className="value" style={{ color:'var(--primary)', fontSize:'1.3rem' }}>{summary.totalHours}h</div>
            <div className="label">Total Hours</div>
          </div>
        </div>
      )}

      {/* Records Table */}
      {loading ? <Spinner /> : records.length === 0 ? (
        <EmptyState icon="📅" title="No records found" message="No attendance recorded for this month" />
      ) : (
        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Status</th><th>Check In</th>
                  <th>Check Out</th><th>Working Hours</th><th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r._id}>
                    <td>{formatDate(r.date)}</td>
                    <td><Badge status={r.status} /></td>
                    <td>{r.checkIn  ? formatTime(r.checkIn)  : '—'}</td>
                    <td>{r.checkOut ? formatTime(r.checkOut) : '—'}</td>
                    <td>{r.workingHours > 0 ? `${r.workingHours}h` : '—'}</td>
                    <td className="td-muted">{r.remarks || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  )
}
