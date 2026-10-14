import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api.js'
import '../styles/super-admin.css'

const prettyDate = (date) => date ? new Date(date).toLocaleDateString() : '—'

export default function SuperAdminCompanies() {
  const navigate = useNavigate()
  const [companies, setCompanies] = useState([])
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const admin = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('hrm_super_admin')) } catch { return null }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = {}
      if (status !== 'all') params.status = status
      if (search.trim()) params.search = search.trim()
      const response = await api.get('/super-admin/companies', { params })
      setCompanies(response.data.data.companies || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load companies')
    } finally { setLoading(false) }
  }, [status, search])

  useEffect(() => { load() }, [load])

  const review = async (company, decision) => {
    const reason = decision === 'reject' ? window.prompt('Reason for rejecting this request?') : ''
    if (decision === 'reject' && reason === null) return
    if (decision === 'reject' && !reason.trim()) { setError('Enter a reason to reject this request.'); return }
    if (decision === 'approve' && !window.confirm(`Approve ${company.name}?`)) return
    setBusyId(company.id)
    setError('')
    try {
      await api.patch(`/super-admin/companies/${company.id}/review/${decision}`, { reason: reason || '' })
      await load()
    } catch (err) { setError(err.response?.data?.message || 'Could not update registration') }
    finally { setBusyId('') }
  }

  const toggleAccess = async (company) => {
    const isActive = !company.isActive
    if (!window.confirm(`${isActive ? 'Reactivate' : 'Pause'} ${company.name}?`)) return
    setBusyId(company.id)
    setError('')
    try {
      await api.patch(`/super-admin/companies/${company.id}/access`, {
        isActive,
        reason: isActive ? 'Reactivated from super admin panel' : 'Paused from super admin panel',
      })
      await load()
    } catch (err) { setError(err.response?.data?.message || 'Could not update company access') }
    finally { setBusyId('') }
  }

  const logout = () => {
    localStorage.removeItem('hrm_token')
    localStorage.removeItem('hrm_super_admin')
    navigate('/super-admin/login')
  }

  const pendingCount = companies.filter((company) => company.registrationStatus === 'pending').length
  const activeCount = companies.filter((company) => company.isActive && company.registrationStatus === 'approved').length

  return <div className="sa-page">
    <header className="sa-topbar"><div className="sa-brand"><span>◆</span> HRM Pro <small>PLATFORM</small></div><div className="sa-account"><span>{admin?.name || admin?.email || 'Super Admin'}</span><button className="sa-quiet-button" onClick={logout}>Sign out</button></div></header>
    <main className="sa-main">
      <div className="sa-heading"><div><div className="sa-eyebrow">PLATFORM MANAGEMENT</div><h1>Companies</h1><p>Review registrations and manage company access.</p></div><button className="sa-button secondary" onClick={load}>↻ Refresh</button></div>
      <div className="sa-stats"><div><span>Requests shown</span><strong>{companies.length}</strong></div><div><span>Pending review</span><strong>{pendingCount}</strong></div><div><span>Active companies</span><strong>{activeCount}</strong></div></div>
      {error && <div className="sa-error" role="alert">{error}</div>}
      <section className="sa-panel">
        <div className="sa-toolbar"><div className="sa-tabs">{[['all', 'All'], ['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected']].map(([key, label]) => <button key={key} onClick={() => setStatus(key)} className={status === key ? 'selected' : ''}>{label}</button>)}</div><input aria-label="Search companies" placeholder="Search name, email, or portal" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        {loading ? <div className="sa-empty">Loading companies…</div> : companies.length === 0 ? <div className="sa-empty">No companies match this view.</div> : <div className="sa-table-wrap"><table className="sa-table"><thead><tr><th>Company</th><th>Portal</th><th>Employees</th><th>Requested</th><th>Status</th><th>Actions</th></tr></thead><tbody>{companies.map((company) => <tr key={company.id}>
          <td><strong>{company.name}</strong><small>{company.email}</small></td><td>{company.slug}.hrm.com</td><td>{company.employeeCount}</td><td>{prettyDate(company.createdAt)}</td>
          <td><span className={`sa-badge ${company.registrationStatus === 'approved' ? (company.isActive ? 'active' : 'paused') : company.registrationStatus}`}>{company.registrationStatus === 'approved' ? (company.isActive ? 'Active' : 'Paused') : company.registrationStatus}</span></td>
          <td><div className="sa-actions">{company.registrationStatus === 'pending' ? <><button disabled={busyId === company.id} className="sa-button approve" onClick={() => review(company, 'approve')}>Approve</button><button disabled={busyId === company.id} className="sa-button reject" onClick={() => review(company, 'reject')}>Reject</button></> : company.registrationStatus === 'approved' ? <button disabled={busyId === company.id} className={`sa-button ${company.isActive ? 'pause' : 'approve'}`} onClick={() => toggleAccess(company)}>{company.isActive ? 'Pause access' : 'Reactivate'}</button> : <span className="sa-muted">Reviewed {prettyDate(company.registrationReviewedAt)}</span>}</div></td>
        </tr>)}</tbody></table></div>}
        <div className="sa-footnote">Pausing a company blocks sign-in and API access. Company records are retained and become available again after reactivation.</div>
      </section>
      {companies.some((company) => company.accessHistory?.length) && <section className="sa-panel sa-history"><div className="sa-panel-heading"><h2>Recent account activity</h2><span>Most recent actions on companies shown</span></div>{companies.flatMap((company) => (company.accessHistory || []).map((entry, index) => ({ ...entry, companyName: company.name, key: `${company.id}-${index}` }))).sort((a, b) => new Date(b.performedAt) - new Date(a.performedAt)).slice(0, 8).map((entry) => <div className="sa-history-row" key={entry.key}><span className="sa-history-dot" /><div><strong>{entry.action} · {entry.companyName}</strong><small>{entry.reason || 'No reason provided'}</small></div><time>{prettyDate(entry.performedAt)}</time></div>)}</section>}
    </main>
  </div>
}
