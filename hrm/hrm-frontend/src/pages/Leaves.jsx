import React, { useEffect, useState, useCallback } from 'react'
import Layout from '../components/layout/Layout.jsx'
import { Spinner, Badge, EmptyState, Pagination, Modal, Alert } from '../components/common/index.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import api from '../services/api.js'
import { formatDate } from '../utils/helpers.js'
import '../styles/pages.css'
import '../styles/components.css'

const EMPTY_FORM = { leaveType: 'Annual', startDate: '', endDate: '', reason: '', isHalfDay: false }

export default function Leaves() {
  const { user } = useAuth()
  const [leaves, setLeaves]         = useState([])
  const [balance, setBalance]       = useState(null)
  const [loading, setLoading]       = useState(true)
  const [page, setPage]             = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filterStatus, setStatus]   = useState('')
  const [showApply, setShowApply]   = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [selected, setSelected]     = useState(null)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [reviewForm, setReviewForm] = useState({ status: 'Approved', reviewRemarks: '' })
  const [formError, setFormError]   = useState('')
  const [saving, setSaving]         = useState(false)
  const isAdminHR = ['Admin', 'Manager', 'HR'].includes(user?.role)

  const fetchLeaves = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 10, status: filterStatus })
      const res = await api.get(`/leaves?${params}`)
      setLeaves((res.data.data || []).filter((l) => l.employee !== null && l.employee !== undefined))
      setTotalPages(res.data.meta?.totalPages || 1)
    } finally { setLoading(false) }
  }, [page, filterStatus])

  useEffect(() => { fetchLeaves() }, [fetchLeaves])

  useEffect(() => {
    api.get('/leaves/balance/me')
      .then((r) => setBalance(r.data.data?.leaveBalance))
      .catch(() => {})
  }, [])

  const handleApply = async (e) => {
    e.preventDefault()
    setSaving(true); setFormError('')
    try {
      await api.post('/leaves', form)
      setShowApply(false); setForm(EMPTY_FORM); fetchLeaves()
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to apply')
    } finally { setSaving(false) }
  }

  const handleReview = async (e) => {
    e.preventDefault()
    setSaving(true); setFormError('')
    try {
      await api.put(`/leaves/${selected._id}/review`, reviewForm)
      setShowReview(false); setSelected(null); fetchLeaves()
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to review')
    } finally { setSaving(false) }
  }

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this leave request?')) return
    try { await api.put(`/leaves/${id}/cancel`); fetchLeaves() }
    catch (err) { alert(err.response?.data?.message || 'Failed') }
  }

  return (
    <Layout title="Leave Management" subtitle="Apply and track your leaves">

      {/* Leave Balance Cards */}
      {balance && (
        <div className="leave-balance-grid">
          {[
            { key: 'annual',  label: 'Annual Leave',  total: 18, cls: 'annual' },
            { key: 'sick',    label: 'Sick Leave',    total: 12, cls: 'sick'   },
            { key: 'casual',  label: 'Casual Leave',  total: 6,  cls: 'casual' },
          ].map((b) => (
            <div key={b.key} className={`leave-balance-card ${b.cls}`}>
              <div className="leave-balance-value">{balance[b.key]}</div>
              <div className="leave-balance-type">{b.label}</div>
              <div className="leave-balance-total">of {b.total} days remaining</div>
            </div>
          ))}
          <div className="leave-balance-card" style={{ borderBottom: '3px solid var(--text-muted)' }}>
            <div className="leave-balance-value" style={{ color: 'var(--text-secondary)' }}>∞</div>
            <div className="leave-balance-type">Unpaid Leave</div>
            <div className="leave-balance-total">No limit</div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h2>{isAdminHR ? 'All Leave Requests' : 'My Leave Requests'}</h2>
        </div>
        <div className="page-header-actions">
          <select className="form-control" style={{ width: 'auto' }} value={filterStatus}
            onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
            <option value="">All Status</option>
            <option>Pending</option><option>Approved</option>
            <option>Rejected</option><option>Cancelled</option>
          </select>
          <button className="btn btn-primary" onClick={() => setShowApply(true)}>+ Apply Leave</button>
        </div>
      </div>

      {/* Table */}
      {loading ? <Spinner /> : leaves.length === 0 ? (
        <EmptyState icon="🌴" title="No leave requests" message="Apply for a leave using the button above" />
      ) : (
        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  {isAdminHR && <th>Employee</th>}
                  <th>Type</th><th>From</th><th>To</th>
                  <th>Days</th><th>Reason</th><th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((l) => (
                  <tr key={l._id}>
                    {isAdminHR && (
                      <td>
                        <div className="avatar-name">{l.employee?.firstName} {l.employee?.lastName}</div>
                        <div className="avatar-sub">{l.employee?.employeeId}</div>
                      </td>
                    )}
                    <td><Badge status={l.leaveType} /></td>
                    <td>{formatDate(l.startDate)}</td>
                    <td>{formatDate(l.endDate)}</td>
                    <td>{l.totalDays}</td>
                    <td className="td-muted" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.reason}</td>
                    <td><Badge status={l.status} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {isAdminHR && l.status === 'Pending' && (
                          <button className="btn btn-success btn-sm" onClick={() => { setSelected(l); setShowReview(true) }}>
                            Review
                          </button>
                        )}
                        {!isAdminHR && l.status === 'Pending' && (
                          <button className="btn btn-danger btn-sm" onClick={() => handleCancel(l._id)}>
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      {/* Apply Leave Modal */}
      {showApply && (
        <Modal title="Apply for Leave"
          onClose={() => { setShowApply(false); setForm(EMPTY_FORM); setFormError('') }}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowApply(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleApply} disabled={saving}>
                {saving ? 'Submitting...' : 'Submit Application'}
              </button>
            </>
          }
        >
          <Alert type="error" message={formError} />
          <div className="form-group">
            <label className="form-label">Leave Type <span>*</span></label>
            <select className="form-control" value={form.leaveType}
              onChange={(e) => setForm((f) => ({ ...f, leaveType: e.target.value }))}>
              <option>Annual</option><option>Sick</option><option>Casual</option><option>Unpaid</option>
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Start Date <span>*</span></label>
              <input type="date" className="form-control" value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">End Date <span>*</span></label>
              <input type="date" className="form-control" value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">
              <input type="checkbox" checked={form.isHalfDay}
                onChange={(e) => setForm((f) => ({ ...f, isHalfDay: e.target.checked }))}
                style={{ marginRight: 8 }} />
              Half Day
            </label>
          </div>
          <div className="form-group">
            <label className="form-label">Reason <span>*</span></label>
            <textarea className="form-control" rows={3} value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              placeholder="Briefly describe your reason..." required />
          </div>
        </Modal>
      )}

      {/* Review Modal (Admin/HR) */}
      {showReview && selected && (
        <Modal title={`Review Leave — ${selected.employee?.firstName} ${selected.employee?.lastName}`}
          onClose={() => { setShowReview(false); setSelected(null); setFormError('') }}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowReview(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleReview} disabled={saving}>
                {saving ? 'Saving...' : 'Submit Review'}
              </button>
            </>
          }
        >
          <Alert type="error" message={formError} />
          <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius-md)', padding: '14px 16px', marginBottom: 18, fontSize: '.875rem' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 6 }}>
              <span style={{ color:'var(--text-muted)' }}>Type</span><strong>{selected.leaveType}</strong>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 6 }}>
              <span style={{ color:'var(--text-muted)' }}>Period</span>
              <strong>{formatDate(selected.startDate)} – {formatDate(selected.endDate)} ({selected.totalDays} days)</strong>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <span style={{ color:'var(--text-muted)' }}>Reason</span><strong>{selected.reason}</strong>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Decision <span>*</span></label>
            <select className="form-control" value={reviewForm.status}
              onChange={(e) => setReviewForm((f) => ({ ...f, status: e.target.value }))}>
              <option value="Approved">Approve</option>
              <option value="Rejected">Reject</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Remarks</label>
            <textarea className="form-control" rows={3} value={reviewForm.reviewRemarks}
              onChange={(e) => setReviewForm((f) => ({ ...f, reviewRemarks: e.target.value }))}
              placeholder="Optional comment to the employee..." />
          </div>
        </Modal>
      )}
    </Layout>
  )
}
