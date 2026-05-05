import React, { useEffect, useState, useCallback } from 'react'
import Layout from '../components/layout/Layout.jsx'
import { Spinner, EmptyState, Modal, Alert } from '../components/common/index.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import api from '../services/api.js'
import '../styles/pages.css'
import '../styles/components.css'

const DEPT_ICONS = ['🏢','💻','🎨','💰','📣','⚙️','🔬','📦','🤝','🌐']
const EMPTY_FORM = { name: '', description: '', head: '' }

export default function Departments() {
  const { user } = useAuth()
  const [departments, setDepts]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving]       = useState(false)
  const [employees, setEmployees] = useState([])
  const isAdmin = user?.role === 'Admin'

  const fetchDepts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/departments')
      setDepts(res.data.data || [])
    } finally { setLoading(false) }
  }, [])

useEffect(() => { fetchDepts() }, [fetchDepts])

useEffect(() => {
  api.get('/employees?limit=100&isActive=true')
    .then((r) => {
      console.log('employees loaded:', r.data.data?.length)
      setEmployees(r.data.data || [])
    })
    .catch((err) => console.error('employee fetch failed:', err.response?.data || err.message))
}, [])
  const openAdd  = () => { setEditing(null); setForm(EMPTY_FORM); setFormError(''); setShowModal(true) }
  const openEdit = (d) => {
  setEditing(d)
  setForm({
    name: d.name,
    description: d.description || '',
    head: d.head?._id || '',
  })
  setFormError('')
  setShowModal(true)
}
  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true); setFormError('')
    try {
      if (editing) await api.put(`/departments/${editing._id}`, form)
      else         await api.post('/departments', form)
      setShowModal(false); fetchDepts()
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this department?')) return
    try { await api.delete(`/departments/${id}`); fetchDepts() }
    catch (err) { alert(err.response?.data?.message || 'Cannot delete') }
  }

  return (
    <Layout title="Departments" subtitle="Manage your organisation structure">

      <div className="page-header">
        <div className="page-header-left">
          <h2>All Departments</h2>
          <p>{departments.length} departments</p>
        </div>
        {isAdmin && (
          <div className="page-header-actions">
            <button className="btn btn-primary" onClick={openAdd}>+ New Department</button>
          </div>
        )}
      </div>

      {loading ? <Spinner /> : departments.length === 0 ? (
        <EmptyState icon="🏢" title="No departments yet" message="Create your first department" />
      ) : (
        <div className="dept-grid">
          {departments.map((d, idx) => (
            <div key={d._id} className="dept-card">
              <div className="dept-card-icon">{DEPT_ICONS[idx % DEPT_ICONS.length]}</div>
              <div className="dept-card-name">{d.name}</div>
              <div className="dept-card-desc">{d.description || 'No description provided.'}</div>

              {d.head && (
                <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 0', borderTop:'1px solid var(--border-light)', marginBottom:8, fontSize:'.82rem', color:'var(--text-secondary)' }}>
                  <span>👤</span>
                  <span>Head: <strong>{d.head.firstName} {d.head.lastName}</strong></span>
                </div>
              )}

              <div className="dept-card-stats">
                <div className="dept-stat">
                  <div className="dept-stat-value">{d.employeeCount ?? '—'}</div>
                  <div className="dept-stat-label">Employees</div>
                </div>
                <div className="dept-stat">
                  <div className="dept-stat-value" style={{ color: d.isActive ? 'var(--success)' : 'var(--danger)', fontSize:'0.85rem' }}>
                    {d.isActive ? 'Active' : 'Inactive'}
                  </div>
                  <div className="dept-stat-label">Status</div>
                </div>
              </div>

              {isAdmin && (
                <div className="dept-card-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => openEdit(d)}>✏ Edit</button>
                  <button className="btn btn-danger btn-sm"    onClick={() => handleDelete(d._id)}>🗑 Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal
          title={editing ? `Edit — ${editing.name}` : 'New Department'}
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
              </button>
            </>
          }
        >
          <Alert type="error" message={formError} />
          <div className="form-group">
            <label className="form-label">Department Name <span>*</span></label>
            <input className="form-control" value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Engineering" required />
          </div>
          <div className="form-group">
  <label className="form-label">Description</label>
  <textarea className="form-control" rows={3} value={form.description}
    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
    placeholder="Brief description of this department..." />
</div>

<div className="form-group">
  <label className="form-label">Department Head</label>
  <select
    className="form-control"
    value={form.head}
    onChange={(e) => setForm((f) => ({ ...f, head: e.target.value }))}
  >
    <option value="">— No head assigned —</option>
    {employees.map((emp) => (
      <option key={emp._id} value={emp._id}>
        {emp.firstName} {emp.lastName} ({emp.employeeId}) — {emp.designation || emp.role}
      </option>
    ))}
  </select>
  <div style={{ fontSize:'.73rem', color:'var(--text-muted)', marginTop:4 }}>
    Only active employees are shown
  </div>
</div>
        </Modal>
      )}
    </Layout>
  )
}
