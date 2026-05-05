import React, { useEffect, useState, useCallback } from 'react'
import Layout from '../components/layout/Layout.jsx'
import { Spinner, Badge, EmptyState, Pagination, Modal, Alert } from '../components/common/index.jsx'
import api from '../services/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { formatDate, getInitials, getAvatarColor } from '../utils/helpers.js'
import '../styles/pages.css'
import '../styles/components.css'
import { FaUser } from "react-icons/fa";
const EMPTY_ADD = {
  employeeId: '', firstName: '', lastName: '', email: '', password: '',
  phone: '', department: '', role: 'Employee', designation: '', joiningDate: '',
  salary: { basic: 0, hra: 0, da: 0, ta: 0, pf: 0, tax: 0 },
}

const SalaryFields = ({ form, onChange }) => (
  <>
    <div style={{ fontFamily:'var(--font-display)', fontSize:'.74rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text-muted)', margin:'16px 0 10px' }}>
      Salary Structure (₹ / month)
    </div>
    <div className="form-row">
      {[['basic','Basic Salary'],['hra','HRA'],['da','DA'],['ta','Travel Allowance'],['pf','PF Deduction'],['tax','Tax']].map(([k,l]) => (
        <div className="form-group" key={k}>
          <label className="form-label">{l}</label>
          <input type="number" name={`salary.${k}`} className="form-control" min={0}
            value={form.salary[k]}
            onChange={onChange} />
        </div>
      ))}
    </div>
  </>
)

export default function Employees() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'Admin'
  const [employees, setEmployees]     = useState([])
  const [departments, setDepts]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [filterRole, setFilterRole]   = useState('')
  const [filterDept, setFilterDept]   = useState('')
  const [page, setPage]               = useState(1)
  const [totalPages, setTotalPages]   = useState(1)
  const [total, setTotal]             = useState(0)
  const [viewMode, setViewMode]       = useState('table')
  const [showInactive, setShowInactive] = useState(false)
 

  const [showAdd, setShowAdd]         = useState(false)
  const [addForm, setAddForm]         = useState(EMPTY_ADD)
  const [addError, setAddError]       = useState('')
  const [addSaving, setAddSaving]     = useState(false)

  const [showEdit, setShowEdit]       = useState(false)
  const [editTarget, setEditTarget]   = useState(null)
  const [editForm, setEditForm]       = useState({})
  const [editError, setEditError]     = useState('')
  const [editSaving, setEditSaving]   = useState(false)

  const [showLeave, setShowLeave]     = useState(false)
  const [leaveTarget, setLeaveTarget] = useState(null)
  const [leaveForm, setLeaveForm]     = useState({ annual: 0, sick: 0, casual: 0 })
  const [leaveError, setLeaveError]   = useState('')
  const [leaveOk, setLeaveOk]         = useState('')
  const [leaveSaving, setLeaveSaving] = useState(false)

  const fetchEmployees = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams({ page, limit: 9, search, role: filterRole, department: filterDept })
if (showInactive) {
  p.set('isActive', 'false')   // show ONLY inactive
} else {
  p.set('isActive', 'true')    // show ONLY active (default)
}
const res = await api.get(`/employees?${p}`)
      setEmployees(res.data.data || [])
      setTotalPages(res.data.meta?.totalPages || 1)
      setTotal(res.data.meta?.total || 0)
    } finally { setLoading(false) }
  }, [page, search, filterRole, filterDept, showInactive])
  useEffect(() => { fetchEmployees() }, [fetchEmployees])
  useEffect(() => { api.get('/departments').then((r) => setDepts(r.data.data || [])) }, [])

  const formChange = (setter) => (e) => {
    const { name, value } = e.target
    if (name.startsWith('salary.')) {
      const k = name.split('.')[1]
      setter((f) => ({ ...f, salary: { ...f.salary, [k]: Number(value) } }))
    } else {
      setter((f) => ({ ...f, [name]: value }))
    }
  }

  const handleAdd = async (e) => {
    e.preventDefault(); setAddSaving(true); setAddError('')
    try {
      await api.post('/employees', addForm)
      setShowAdd(false); setAddForm(EMPTY_ADD); fetchEmployees()
    } catch (err) { setAddError(err.response?.data?.message || 'Failed to create') }
    finally { setAddSaving(false) }
  }

  const openEdit = (emp) => {
    setEditTarget(emp)
    setEditForm({
      employeeId: emp.employeeId || '', firstName: emp.firstName || '',
      lastName: emp.lastName || '', email: emp.email || '', phone: emp.phone || '',
      department: emp.department?._id || '', role: emp.role || 'Employee',
      designation: emp.designation || '',
      joiningDate: emp.joiningDate ? emp.joiningDate.slice(0, 10) : '',
      salary: { basic: emp.salary?.basic||0, hra: emp.salary?.hra||0, da: emp.salary?.da||0, ta: emp.salary?.ta||0, pf: emp.salary?.pf||0, tax: emp.salary?.tax||0 },
    })
    setEditError(''); setShowEdit(true)
  }

  const handleEdit = async (e) => {
    e.preventDefault(); setEditSaving(true); setEditError('')
    try {
      await api.put(`/employees/${editTarget._id}`, editForm)
      setShowEdit(false); setEditTarget(null); fetchEmployees()
    } catch (err) { setEditError(err.response?.data?.message || 'Failed to update') }
    finally { setEditSaving(false) }
  }

  const handleDeactivate = async (id, name) => {
  if (!window.confirm(`Deactivate "${name}"?\n\nThey will lose system access but their data will be kept. You can permanently delete them after deactivation.`)) return
  try {
    await api.delete(`/employees/${id}`)
    setEmployees((prev) => prev.filter((e) => e._id !== id))
    setTotal((t) => t - 1)
  } catch (err) {
    alert(err.response?.data?.message || 'Failed to deactivate')
  }
}

const handlePermanentDelete = async (id, name) => {
  if (!window.confirm(`⚠️ PERMANENTLY DELETE "${name}"?\n\nThis action CANNOT be undone. All their data will be erased.`)) return
  if (!window.confirm(`Are you absolutely sure you want to permanently delete "${name}"? This is irreversible.`)) return
  try {
    await api.delete(`/employees/${id}/permanent`)
    setEmployees((prev) => prev.filter((e) => e._id !== id))
    setTotal((t) => t - 1)
  } catch (err) {
    alert(err.response?.data?.message || 'Failed to permanently delete')
  }
}

  const openLeave = (emp) => {
    setLeaveTarget(emp)
    setLeaveForm({ annual: emp.leaveBalance?.annual??18, sick: emp.leaveBalance?.sick??12, casual: emp.leaveBalance?.casual??6 })
    setLeaveError(''); setLeaveOk(''); setShowLeave(true)
  }

  const handleLeaveUpdate = async (e) => {
    e.preventDefault(); setLeaveSaving(true); setLeaveError(''); setLeaveOk('')
    try {
      await api.put(`/employees/${leaveTarget._id}/leave-balance`, leaveForm)
      setLeaveOk('✅ Leave balance updated! Employee has been notified.')
      fetchEmployees()
    } catch (err) { setLeaveError(err.response?.data?.message || 'Failed') }
    finally { setLeaveSaving(false) }
  }

  const EmpID = ({ id }) => (
    <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'.8rem', background:'var(--bg)', padding:'3px 8px', borderRadius:6, border:'1px solid var(--border)' }}>{id}</span>
  )

  return (
    <Layout title="Employee Management" subtitle={isAdmin ? 'Admin — full control over workforce' : 'Workforce directory'}>

      <div className="page-header">
        <div className="page-header-left"><h2>All Employees</h2><p>{total} records</p></div>
        <div className="page-header-actions">
  <button
    className={`btn btn-sm ${showInactive ? 'btn-warning' : 'btn-secondary'}`}
    onClick={() => { setShowInactive((v) => !v); setPage(1) }}
  >
    {showInactive ? '👥 Show Active' : '🗂 Show Inactive'}
  </button>
  <button className={`btn btn-${viewMode==='table'?'primary':'secondary'} btn-sm`} onClick={() => setViewMode('table')}>☰ Table</button>
  <button className={`btn btn-${viewMode==='grid'?'primary':'secondary'} btn-sm`}  onClick={() => setViewMode('grid')}>⊞ Grid</button>
  {!showInactive && isAdmin && <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Employee</button>}
</div>
      </div>

      <div className="filter-bar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input placeholder="Search by name, email or employee ID..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <select className="form-control" style={{ width:'auto' }} value={filterRole} onChange={(e) => { setFilterRole(e.target.value); setPage(1) }}>
          <option value="">All Roles</option><option>Admin</option><option>Manager</option><option>Employee</option>
        </select>
        <select className="form-control" style={{ width:'auto' }} value={filterDept} onChange={(e) => { setFilterDept(e.target.value); setPage(1) }}>
          <option value="">All Departments</option>
          {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
        </select>
      </div>

      {loading ? <Spinner /> : employees.length === 0 ? (
        <EmptyState icon="👥" title="No employees found" message="Try adjusting your search or add a new employee" />
      ) : viewMode === 'table' ? (
        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Employee</th><th>Emp ID</th><th>Department</th><th>Role</th><th>Leave Balance</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {employees.map((emp) => {
                  
                  return (
                    <tr key={emp._id}>
                      <td>
                        <div className="avatar-info">
                          <div className="avatar"><FaUser size={12} /></div>
                          <div>
                            <div className="avatar-name">{emp.firstName} {emp.lastName}</div>
                            <div className="avatar-sub">{emp.email}</div>
                          </div>
                        </div>
                      </td>
                      <td><EmpID id={emp.employeeId} /></td>
                      <td>{emp.department?.name || '—'}</td>
                      <td><Badge status={emp.role} /></td>
                      <td>
                        <span style={{ fontSize:'.78rem', color:'var(--text-secondary)' }}>
                          A:{emp.leaveBalance?.annual} · S:{emp.leaveBalance?.sick} · C:{emp.leaveBalance?.casual}
                        </span>
                      </td>
                      <td><Badge status={emp.isActive ? 'Active' : 'Inactive'} /></td>
                      <td>
                        <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                        {isAdmin && emp.isActive ? (
                           <>
                       <button className="btn btn-secondary btn-sm" onClick={() => openEdit(emp)}>✏ Edit</button>
                        <button className="btn btn-secondary btn-sm"   onClick={() => openLeave(emp)}>🌴 Leave</button>
                        <button className="btn btn-danger btn-sm"    onClick={() => handleDeactivate(emp._id, `${emp.firstName} ${emp.lastName}`)}>⛔ Deactivate</button>
                        </>
                       ) : isAdmin ? (
                        <button className="btn btn-danger btn-sm" onClick={() => handlePermanentDelete(emp._id, `${emp.firstName} ${emp.lastName}`)}>🗑 Delete Forever</button>
                        ) : (
                          <span className="td-muted">View only</span>
                        )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      ) : (
        <>
          <div className="employee-grid">
            {employees.map((emp) => {
              const color = getAvatarColor(`${emp.firstName}${emp.lastName}`)
              return (
                <div key={emp._id} className="employee-card">
                  <div className="employee-card-header">
                    <div className="employee-card-avatar" ><FaUser size={12} /></div>
                    <div className="employee-card-info">
                      <div className="employee-card-name">{emp.firstName} {emp.lastName}</div>
                      <div className="employee-card-id">{emp.employeeId}</div>
                    </div>
                    <Badge status={emp.role} />
                  </div>
                  <div className="employee-card-body">
                    <div className="employee-card-detail"><span>Email</span><span>{emp.email}</span></div>
                    <div className="employee-card-detail"><span>Department</span><span>{emp.department?.name || '—'}</span></div>
                    <div className="employee-card-detail"><span>Designation</span><span>{emp.designation || '—'}</span></div>
                    <div className="employee-card-detail"><span>Joined</span><span>{formatDate(emp.joiningDate)}</span></div>
                    <div className="employee-card-detail">
                      <span>Leave Bal.</span>
                      <span style={{ fontSize:'.75rem' }}>A:{emp.leaveBalance?.annual} S:{emp.leaveBalance?.sick} C:{emp.leaveBalance?.casual}</span>
                    </div>
                  </div>
                  <div className="employee-card-footer">
  {isAdmin && emp.isActive ? (
    <>
      <button className="btn btn-success btn-sm" onClick={() => openEdit(emp)}>✏ Edit</button>
      <button className="btn btn-secondary btn-sm"   onClick={() => openLeave(emp)}>🌴 Leave</button>
      <button className="btn btn-danger btn-sm"    onClick={() => handleDeactivate(emp._id, `${emp.firstName} ${emp.lastName}`)}>⛔ Deactivate</button>
    </>
  ) : isAdmin ? (
    <button className="btn btn-danger btn-sm" style={{ width:'100%' }} onClick={() => handlePermanentDelete(emp._id, `${emp.firstName} ${emp.lastName}`)}>🗑 Delete Forever</button>
  ) : (
    <span className="td-muted">View only</span>
  )}
</div>
                </div>
              )
            })}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      {/* Add Modal */}
      {showAdd && (
        <Modal title="Add New Employee" onClose={() => { setShowAdd(false); setAddForm(EMPTY_ADD); setAddError('') }}
          footer={<><button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button><button className="btn btn-primary" onClick={handleAdd} disabled={addSaving}>{addSaving?'Creating...':'Create Employee'}</button></>}>
          <Alert type="error" message={addError} />
          <div style={{ background:'var(--info-soft)', border:'1px solid rgba(59,130,246,.2)', borderRadius:'var(--radius-sm)', padding:'10px 14px', fontSize:'.82rem', color:'var(--info)', marginBottom:14 }}>
            💡 Leave Employee ID blank to auto-generate (EMP0001…), or enter a custom unique ID.
          </div>
          <div className="form-group">
            <label className="form-label">Employee ID <span style={{ color:'var(--text-muted)', fontSize:'.73rem' }}>(optional)</span></label>
            <input name="employeeId" className="form-control" value={addForm.employeeId} onChange={formChange(setAddForm)} placeholder="e.g. EMP0042 — leave blank to auto-generate" />
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">First Name <span>*</span></label><input name="firstName" className="form-control" value={addForm.firstName} onChange={formChange(setAddForm)} required /></div>
            <div className="form-group"><label className="form-label">Last Name <span>*</span></label><input name="lastName" className="form-control" value={addForm.lastName} onChange={formChange(setAddForm)} required /></div>
          </div>
          <div className="form-group"><label className="form-label">Email <span>*</span></label><input type="email" name="email" className="form-control" value={addForm.email} onChange={formChange(setAddForm)} required /></div>
          <div className="form-group"><label className="form-label">Password <span>*</span></label><input type="password" name="password" className="form-control" value={addForm.password} onChange={formChange(setAddForm)} required /></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Phone</label><input name="phone" className="form-control" value={addForm.phone} onChange={formChange(setAddForm)} /></div>
            <div className="form-group"><label className="form-label">Role</label><select name="role" className="form-control" value={addForm.role} onChange={formChange(setAddForm)}><option>Employee</option><option>Manager</option><option>Admin</option></select></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Department</label><select name="department" className="form-control" value={addForm.department} onChange={formChange(setAddForm)}><option value="">Select…</option>{departments.map((d)=><option key={d._id} value={d._id}>{d.name}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Designation</label><input name="designation" className="form-control" value={addForm.designation} onChange={formChange(setAddForm)} /></div>
          </div>
          <div className="form-group"><label className="form-label">Joining Date</label><input type="date" name="joiningDate" className="form-control" value={addForm.joiningDate} onChange={formChange(setAddForm)} /></div>
          <SalaryFields form={addForm} onChange={formChange(setAddForm)} />
        </Modal>
      )}

      {/* Edit Modal */}
      {showEdit && editTarget && (
        <Modal title={`Edit — ${editTarget.firstName} ${editTarget.lastName}`}
          onClose={() => { setShowEdit(false); setEditTarget(null); setEditError('') }}
          footer={<><button className="btn btn-secondary" onClick={() => setShowEdit(false)}>Cancel</button><button className="btn btn-primary" onClick={handleEdit} disabled={editSaving}>{editSaving?'Saving...':'Save Changes'}</button></>}>
          <Alert type="error" message={editError} />
          <div className="form-group">
            <label className="form-label">Employee ID <span>*</span></label>
            <input name="employeeId" className="form-control" value={editForm.employeeId} onChange={formChange(setEditForm)} placeholder="Must be unique" required />
            <div style={{ fontSize:'.73rem', color:'var(--text-muted)', marginTop:3 }}>⚠ Must be unique across all employees</div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">First Name <span>*</span></label><input name="firstName" className="form-control" value={editForm.firstName||''} onChange={formChange(setEditForm)} required /></div>
            <div className="form-group"><label className="form-label">Last Name <span>*</span></label><input name="lastName" className="form-control" value={editForm.lastName||''} onChange={formChange(setEditForm)} required /></div>
          </div>
          <div className="form-group"><label className="form-label">Email</label><input type="email" name="email" className="form-control" value={editForm.email||''} onChange={formChange(setEditForm)} /></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Phone</label><input name="phone" className="form-control" value={editForm.phone||''} onChange={formChange(setEditForm)} /></div>
            <div className="form-group"><label className="form-label">Role</label><select name="role" className="form-control" value={editForm.role||'Employee'} onChange={formChange(setEditForm)}><option>Employee</option><option>Manager</option><option>Admin</option></select></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Department</label><select name="department" className="form-control" value={editForm.department||''} onChange={formChange(setEditForm)}><option value="">Select…</option>{departments.map((d)=><option key={d._id} value={d._id}>{d.name}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Designation</label><input name="designation" className="form-control" value={editForm.designation||''} onChange={formChange(setEditForm)} /></div>
          </div>
          <div className="form-group"><label className="form-label">Joining Date</label><input type="date" name="joiningDate" className="form-control" value={editForm.joiningDate||''} onChange={formChange(setEditForm)} /></div>
          <SalaryFields form={editForm} onChange={formChange(setEditForm)} />
        </Modal>
      )}

      {/* Leave Balance Modal */}
      {showLeave && leaveTarget && (
        <Modal title={`Leave Balance — ${leaveTarget.firstName} ${leaveTarget.lastName}`}
          onClose={() => { setShowLeave(false); setLeaveTarget(null) }}
          footer={<><button className="btn btn-secondary" onClick={() => setShowLeave(false)}>Close</button><button className="btn btn-primary" onClick={handleLeaveUpdate} disabled={leaveSaving}>{leaveSaving?'Updating...':'Update Balance'}</button></>}>
          <Alert type="error"   message={leaveError} />
          <Alert type="success" message={leaveOk} />
          <div style={{ background:'var(--warning-soft)', border:'1px solid rgba(245,158,11,.25)', borderRadius:'var(--radius-sm)', padding:'10px 14px', fontSize:'.82rem', color:'#92400e', marginBottom:18 }}>
            🔔 The employee will receive an in-app notification when their balance is updated.
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16 }}>
            {[['annual','Annual','var(--info)',18],['sick','Sick','var(--danger)',30],['casual','Casual','var(--warning)',20]].map(([k,l,c,mx]) => (
              <div key={k} style={{ textAlign:'center' }}>
                <label className="form-label" style={{ display:'block', textAlign:'center', marginBottom:8 }}>{l} Leave</label>
                <input type="number" min={0} max={mx} className="form-control"
                  style={{ textAlign:'center', fontFamily:'var(--font-display)', fontSize:'1.5rem', fontWeight:800, color:c, padding:'12px 8px' }}
                  value={leaveForm[k]} onChange={(e) => setLeaveForm((f) => ({ ...f, [k]: Number(e.target.value) }))} />
                <div style={{ fontSize:'.7rem', color:'var(--text-muted)', marginTop:5 }}>max {mx} days</div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </Layout>
  )
}
