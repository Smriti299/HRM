import React, { useEffect, useState, useCallback } from 'react'
import Layout from '../components/layout/Layout.jsx'
import { Spinner, Badge, EmptyState, Pagination, Modal, Alert } from '../components/common/index.jsx'
import api from '../services/api.js'
import { formatDate, formatTime } from '../utils/helpers.js'
import { saveAs } from 'file-saver'
import '../styles/pages.css'
import '../styles/components.css'

const MONTHS  = ['January','February','March','April','May','June','July','August','September','October','November','December']
const STATUSES = ['Present','Absent','Half-Day','Late','On-Leave']

export default function AdminAttendance() {
  // ── list state ──────────────────────────────────────────────────────────────
  const [records, setRecords]       = useState([])
  const [employees, setEmployees]   = useState([])
  const [loading, setLoading]       = useState(false)   // ← false so page doesn't hang on mount
  const [fetchError, setFetchError] = useState('')
  const [page, setPage]             = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal]           = useState(0)
  const [summary, setSummary]       = useState(null)

  // ── filters ──────────────────────────────────────────────────────────────────
  const [month, setMonth]           = useState(new Date().getMonth() + 1)
  const [year, setYear]             = useState(new Date().getFullYear())
  const [filterEmp, setFilterEmp]   = useState('')
  const [filterStatus, setStatus]   = useState('')
  const [searchName, setSearchName] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [exporting, setExporting]   = useState(false)
  const [exportMsg, setExportMsg]   = useState('')
  const [exportError, setExportError] = useState('')

  // ── edit modal ───────────────────────────────────────────────────────────────
  const [showEdit, setShowEdit]     = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm]     = useState({ status:'Present', checkIn:'', checkOut:'', remarks:'' })
  const [editError, setEditError]   = useState('')
  const [editOk, setEditOk]         = useState('')
  const [editSaving, setEditSaving] = useState(false)

  // ── mark modal ───────────────────────────────────────────────────────────────
  const [showMark, setShowMark]     = useState(false)
  const [markForm, setMarkForm]     = useState({ employee:'', date:'', status:'Present', checkIn:'', checkOut:'', remarks:'' })
  const [markError, setMarkError]   = useState('')
  const [markSaving, setMarkSaving] = useState(false)

  // ── fetch attendance records ─────────────────────────────────────────────────
  const fetchRecords = useCallback(async () => {
    setLoading(true)
    setFetchError('')
    try {
      const params = new URLSearchParams({ page, limit: 15, month, year })
      if (filterEmp)    params.set('employeeId', filterEmp)
      if (filterStatus) params.set('status',     filterStatus)

      const res  = await api.get(`/attendance/all?${params}`)
      let data   = res.data.data   || []
      // Remove records where employee was permanently deleted
      data = data.filter((r) => r.employee !== null && r.employee !== undefined)
      const meta = res.data.meta   || {}

      // client-side name / date filter (fast, no extra round-trip)
      if (searchName.trim()) {
        const q = searchName.trim().toLowerCase()
        data = data.filter((r) =>
          `${r.employee?.firstName ?? ''} ${r.employee?.lastName ?? ''}`.toLowerCase().includes(q) ||
          (r.employee?.employeeId ?? '').toLowerCase().includes(q)
        )
      }
      if (filterDate) {
        data = data.filter((r) =>
          new Date(r.date).toISOString().slice(0, 10) === filterDate
        )
      }

      setRecords(data)
      setTotalPages(meta.totalPages || 1)
      setTotal(meta.total || 0)
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to load attendance records'
      setFetchError(msg)
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [page, month, year, filterEmp, filterStatus, searchName, filterDate])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  // ── fetch employees list + today summary once ────────────────────────────────
  useEffect(() => {
    api.get('/employees?limit=200&isActive=true')
      .then((r) => setEmployees(r.data.data || []))
      .catch(() => {})

    api.get('/attendance/today/summary')
      .then((r) => setSummary(r.data.data?.summary ?? null))
      .catch(() => {})
  }, [])

  const downloadBlob = (blob, filename) => {
    const file = new Blob([blob], { type: blob.type || 'application/octet-stream' })
    saveAs(file, filename)
  }

  const getAttendanceExportQuery = () => {
    const params = new URLSearchParams({ month, year })
    if (filterEmp) params.set('employeeId', filterEmp)
    if (filterStatus) params.set('status', filterStatus)
    if (filterDate) {
      params.set('from', filterDate)
      params.set('to', filterDate)
      params.delete('month')
      params.delete('year')
    }
    return params.toString()
  }

  const handleExportAttendance = async (format) => {
    setExporting(true)
    setExportError('')
    setExportMsg('')
    try {
      const query = getAttendanceExportQuery()
      const res = await api.get(`/attendance/export/${format}?${query}`, { responseType: 'blob' })
      const ext = format === 'pdf' ? 'pdf' : 'xlsx'
      downloadBlob(res.data, `attendance-${new Date().toISOString().slice(0,10)}.${ext}`)
      setExportMsg(`Attendance ${format.toUpperCase()} export is ready.`)
    } catch (err) {
      setExportError(err.response?.data?.message || 'Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  // ── clear all filters ────────────────────────────────────────────────────────
  const clearFilters = () => {
    setSearchName(''); setFilterDate(''); setFilterEmp(''); setStatus(''); setPage(1)
  }
  const hasFilters = searchName || filterDate || filterEmp || filterStatus

  // ── open edit modal ──────────────────────────────────────────────────────────
  const openEdit = (r) => {
    setEditTarget(r)
    setEditForm({
      status:   r.status,
      checkIn:  r.checkIn  ? new Date(r.checkIn).toISOString().slice(0, 16)  : '',
      checkOut: r.checkOut ? new Date(r.checkOut).toISOString().slice(0, 16) : '',
      remarks:  r.remarks  || '',
    })
    setEditError(''); setEditOk(''); setShowEdit(true)
  }

  // ── save edited record ───────────────────────────────────────────────────────
  const handleEdit = async (e) => {
    e.preventDefault()
    setEditSaving(true); setEditError(''); setEditOk('')
    try {
      const res     = await api.put(`/attendance/${editTarget._id}`, editForm)
      const updated = res.data.data

      // update row in-place immediately
      setRecords((prev) =>
        prev.map((r) => r._id === editTarget._id ? { ...r, ...updated } : r)
      )
      setEditOk('✅ Attendance updated! Employee has been notified.')

      // full sync after 1.5 s
      setTimeout(fetchRecords, 1500)
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update')
    } finally {
      setEditSaving(false)
    }
  }

  // ── mark new attendance ──────────────────────────────────────────────────────
  const handleMark = async (e) => {
    e.preventDefault()
    setMarkSaving(true); setMarkError('')
    try {
      await api.post('/attendance/mark', markForm)
      setShowMark(false)
      setMarkForm({ employee:'', date:'', status:'Present', checkIn:'', checkOut:'', remarks:'' })
      fetchRecords()
    } catch (err) {
      setMarkError(err.response?.data?.message || 'Failed to mark attendance')
    } finally {
      setMarkSaving(false)
    }
  }

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <Layout title="Manage Attendance" subtitle="Admin — view and edit all employees' attendance">

      {/* Today Summary Cards */}
      {summary && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:12, marginBottom:22 }}>
          {[
            { label:"Today's Present", value: summary.present,      color:'var(--text-secondary)' },
            { label:"Today's Absent",  value: summary.absent,       color:'var(--text-secondary)'  },
            { label:"On Leave",        value: summary.onLeave,      color:'var(--text-secondary)' },
            { label:"Late",            value: summary.late,         color:'var(--text-secondary)'    },
            { label:"Half Day",        value: summary.halfDay,      color:'var(--text-secondary)' },
            { label:"Total Marked",    value: summary.totalMarked,  color:'var(--text-secondary)' },
          ].map((s) => (
            <div key={s.label} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', padding:'14px 12px', textAlign:'center' }}>
              <div style={{ fontFamily:'var(--font-body)', fontSize:'1.7rem', fontWeight:800, color:s.color, lineHeight:1 }}>{s.value}</div>
              <div style={{ fontSize:'.72rem', color:'var(--text-muted)', marginTop:5, fontWeight:500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h2>Attendance Records</h2>
          <p>{total} records for {MONTHS[month - 1]} {year}</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" disabled={exporting} onClick={() => handleExportAttendance('pdf')}>Export Attendance PDF</button>
          <button className="btn btn-secondary" disabled={exporting} onClick={() => handleExportAttendance('excel')}>Export Attendance Excel</button>
          <button className="btn btn-primary" onClick={() => setShowMark(true)}>+ Mark Attendance</button>
        </div>
      </div>

      {(exportMsg || exportError) && (
        <div style={{ margin: '0 0 16px' }}>
          {exportMsg && <Alert type="success" message={exportMsg} />}
          {exportError && <Alert type="error" message={exportError} />}
        </div>
      )}

      {/* Filter Bar */}
      <div className="filter-bar">
        {/* Name / ID search */}
        <div className="search-box" style={{ minWidth: 220 }}>
          <span className="search-icon">🔍</span>
          <input
            placeholder="Search by name or employee ID..."
            value={searchName}
            onChange={(e) => { setSearchName(e.target.value); setPage(1) }}
          />
        </div>

        {/* Specific date */}
        <input
          type="date"
          className="form-control"
          style={{ width:'auto', cursor:'pointer' }}
          value={filterDate}
          title="Filter by specific date"
          onChange={(e) => { setFilterDate(e.target.value); setPage(1) }}
        />

        {/* Employee dropdown */}
        <select className="form-control" style={{ width:'auto' }} value={filterEmp}
          onChange={(e) => { setFilterEmp(e.target.value); setPage(1) }}>
          <option value="">All Employees</option>
          {employees.map((e) => (
            <option key={e._id} value={e._id}>{e.firstName} {e.lastName} ({e.employeeId})</option>
          ))}
        </select>

        {/* Month */}
        <select className="form-control" style={{ width:'auto' }} value={month}
          onChange={(e) => { setMonth(Number(e.target.value)); setPage(1) }}>
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>

        {/* Year */}
        <select className="form-control" style={{ width:'auto' }} value={year}
          onChange={(e) => { setYear(Number(e.target.value)); setPage(1) }}>
          {[2024, 2025, 2026].map((y) => <option key={y}>{y}</option>)}
        </select>

        {/* Status */}
        <select className="form-control" style={{ width:'auto' }} value={filterStatus}
          onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
          <option value="">All Status</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>

        {/* Clear all */}
        {hasFilters && (
          <button className="btn btn-ghost btn-sm" onClick={clearFilters}>✕ Clear</button>
        )}
      </div>

      {/* Error */}
      {fetchError && <Alert type="error" message={`Failed to load records: ${fetchError}`} />}

      {/* Table */}
      {loading ? (
        <Spinner text="Loading attendance records..." />
      ) : records.length === 0 ? (
        <EmptyState
          icon="📅"
          title={hasFilters ? 'No records match your filters' : 'No attendance records found'}
          message={hasFilters ? 'Try clearing filters or selecting a different month.' : 'Mark attendance using the button above.'}
        />
      ) : (
        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Hours</th>
                  <th>Remarks</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r._id}>
                    <td>
                      <div className="avatar-name">{r.employee?.firstName} {r.employee?.lastName}</div>
                      <div className="avatar-sub">{r.employee?.employeeId}</div>
                    </td>
                    <td>{formatDate(r.date)}</td>
                    <td><Badge status={r.status} /></td>
                    <td>{r.checkIn  ? formatTime(r.checkIn)  : '—'}</td>
                    <td>{r.checkOut ? formatTime(r.checkOut) : '—'}</td>
                    <td>{r.workingHours > 0 ? `${r.workingHours}h` : '—'}</td>
                    <td className="td-muted" style={{ maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {r.remarks || '—'}
                    </td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(r)}>✏ Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && editTarget && (
        <Modal
          title={`Edit Attendance — ${editTarget.employee?.firstName} ${editTarget.employee?.lastName} · ${formatDate(editTarget.date)}`}
          onClose={() => { setShowEdit(false); setEditTarget(null) }}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowEdit(false)}>Close</button>
              <button className="btn btn-primary" onClick={handleEdit} disabled={editSaving}>
                {editSaving ? 'Saving...' : '💾 Save & Notify Employee'}
              </button>
            </>
          }
        >
          <Alert type="error"   message={editError} />
          <Alert type="success" message={editOk} />
          <div style={{ background:'var(--warning-soft)', border:'1px solid rgba(245,158,11,.25)', borderRadius:'var(--radius-sm)', padding:'10px 14px', fontSize:'.82rem', color:'#92400e', marginBottom:16 }}>
            🔔 The employee will automatically receive a notification when you save.
          </div>
          <div className="form-group">
            <label className="form-label">Status <span>*</span></label>
            <select className="form-control" value={editForm.status}
              onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Check In Time</label>
              <input type="datetime-local" className="form-control" value={editForm.checkIn}
                onChange={(e) => setEditForm((f) => ({ ...f, checkIn: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Check Out Time</label>
              <input type="datetime-local" className="form-control" value={editForm.checkOut}
                onChange={(e) => setEditForm((f) => ({ ...f, checkOut: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Remarks</label>
            <textarea className="form-control" rows={2} value={editForm.remarks}
              onChange={(e) => setEditForm((f) => ({ ...f, remarks: e.target.value }))}
              placeholder="Optional note..." />
          </div>
        </Modal>
      )}

      {/* Mark Attendance Modal */}
      {showMark && (
        <Modal
          title="Mark Attendance"
          onClose={() => { setShowMark(false); setMarkError('') }}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowMark(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleMark} disabled={markSaving}>
                {markSaving ? 'Marking...' : '✅ Mark & Notify'}
              </button>
            </>
          }
        >
          <Alert type="error" message={markError} />
          <div className="form-group">
            <label className="form-label">Employee <span>*</span></label>
            <select className="form-control" value={markForm.employee}
              onChange={(e) => setMarkForm((f) => ({ ...f, employee: e.target.value }))} required>
              <option value="">Select Employee</option>
              {employees.map((e) => (
                <option key={e._id} value={e._id}>{e.firstName} {e.lastName} ({e.employeeId})</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Date <span>*</span></label>
              <input type="date" className="form-control" value={markForm.date}
                onChange={(e) => setMarkForm((f) => ({ ...f, date: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Status <span>*</span></label>
              <select className="form-control" value={markForm.status}
                onChange={(e) => setMarkForm((f) => ({ ...f, status: e.target.value }))}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Check In</label>
              <input type="datetime-local" className="form-control" value={markForm.checkIn}
                onChange={(e) => setMarkForm((f) => ({ ...f, checkIn: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Check Out</label>
              <input type="datetime-local" className="form-control" value={markForm.checkOut}
                onChange={(e) => setMarkForm((f) => ({ ...f, checkOut: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Remarks</label>
            <textarea className="form-control" rows={2} value={markForm.remarks}
              onChange={(e) => setMarkForm((f) => ({ ...f, remarks: e.target.value }))} />
          </div>
          <div style={{ background:'var(--info-soft)', border:'1px solid rgba(59,130,246,.2)', borderRadius:'var(--radius-sm)', padding:'10px 14px', fontSize:'.82rem', color:'var(--info)', marginTop:4 }}>
            ℹ️ Employee will receive a notification when attendance is marked.
          </div>
        </Modal>
      )}
    </Layout>
  )
}
