import React, { useEffect, useState } from 'react'
import Layout from '../components/layout/Layout.jsx'
import { Spinner, Alert, Badge } from '../components/common/index.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import api from '../services/api.js'
import { formatDate, formatCurrency, getInitials, getAvatarColor } from '../utils/helpers.js'
import '../styles/pages.css'
import '../styles/components.css'
import { FaUser } from "react-icons/fa";
export default function Profile() {
  const { user, refreshUser } = useAuth()
  const [profile, setProfile]     = useState(null)
  const [loading, setLoading]     = useState(true)
  const [editing, setEditing]     = useState(false)
  const [form, setForm]           = useState({ phone: '', address: { street: '', city: '', state: '', country: '', pincode: '' } })
  const [pwForm, setPwForm]       = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [saving, setSaving]       = useState(false)
  const [msg, setMsg]             = useState('')
  const [err, setErr]             = useState('')
  const [pwMsg, setPwMsg]         = useState('')
  const [pwErr, setPwErr]         = useState('')
  const [tab, setTab]             = useState('info')

  useEffect(() => {
    api.get('/auth/me').then((r) => {
      const d = r.data.data
      setProfile(d)
      setForm({
        phone: d.phone || '',
        address: d.address || { street:'', city:'', state:'', country:'', pincode:'' },
      })
    }).finally(() => setLoading(false))
  }, [])

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSaving(true); setMsg(''); setErr('')
    try {
      await api.put('/employees/me/profile', form)
      await refreshUser()
      setMsg('Profile updated successfully!')
      setEditing(false)
    } catch (error) {
      setErr(error.response?.data?.message || 'Update failed')
    } finally { setSaving(false) }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPwMsg(''); setPwErr('')
    if (pwForm.newPassword !== pwForm.confirm) { setPwErr('Passwords do not match'); return }
    if (pwForm.newPassword.length < 6) { setPwErr('Password must be at least 6 characters'); return }
    setSaving(true)
    try {
      await api.put('/auth/change-password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword })
      setPwMsg('Password changed successfully!')
      setPwForm({ currentPassword:'', newPassword:'', confirm:'' })
    } catch (error) {
      setPwErr(error.response?.data?.message || 'Failed to change password')
    } finally { setSaving(false) }
  }

  if (loading) return <Layout title="My Profile"><Spinner /></Layout>

  const p      = profile
  const color  = getAvatarColor(`${p?.firstName}${p?.lastName}`)
  const initials = getInitials(p?.firstName, p?.lastName)

  return (
    <Layout title="My Profile" subtitle="View and update your personal information">

      {/* Profile Header */}
      <div className="profile-header-card">
        <div className="profile-avatar" ><FaUser />
</div>
        <div className="profile-info">
          <h2>{p?.firstName} {p?.lastName}</h2>
          <p>{p?.designation || 'Employee'} · {p?.department?.name || 'No Department'}</p>
          <div className="profile-meta">
            <div className="profile-meta-item">🪪 {p?.employeeId}</div>
            <div className="profile-meta-item">📧 {p?.email}</div>
            {p?.phone && <div className="profile-meta-item">📱 {p?.phone}</div>}
            <div className="profile-meta-item">📅 Joined {formatDate(p?.joiningDate)}</div>
          </div>
        </div>
        <Badge status={p?.role} />
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:22, borderBottom:'1px solid var(--border)', paddingBottom:0 }}>
        {[
          { key:'info',   label:'📋 Personal Info' },
          { key:'salary', label:'💰 Salary Details' },
          { key:'leave',  label:'🌴 Leave Balance'  },
          { key:'pw',     label:'🔒 Change Password'},
        ].map((t) => (
          <button key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding:'10px 18px', border:'none', background:'none', cursor:'pointer',
              fontFamily:'var(--font-body)', fontSize:'.875rem', fontWeight:600,
              color: tab === t.key ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
              transition:'all var(--transition)', marginBottom:-1,
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* Personal Info Tab */}
      {tab === 'info' && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Personal Information</div>
              <div className="card-subtitle">Your basic profile details</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(!editing)}>
              {editing ? '✕ Cancel' : '✏ Edit'}
            </button>
          </div>
          <div className="card-body">
            <Alert type="success" message={msg} />
            <Alert type="error"   message={err} />

            {editing ? (
              <form onSubmit={handleSaveProfile}>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input className="form-control" value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="+91-XXXXXXXXXX" />
                </div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:'.82rem', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:12 }}>Address</div>
                <div className="form-group">
                  <label className="form-label">Street</label>
                  <input className="form-control" value={form.address.street}
                    onChange={(e) => setForm((f) => ({ ...f, address: { ...f.address, street: e.target.value } }))} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input className="form-control" value={form.address.city}
                      onChange={(e) => setForm((f) => ({ ...f, address: { ...f.address, city: e.target.value } }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">State</label>
                    <input className="form-control" value={form.address.state}
                      onChange={(e) => setForm((f) => ({ ...f, address: { ...f.address, state: e.target.value } }))} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Country</label>
                    <input className="form-control" value={form.address.country}
                      onChange={(e) => setForm((f) => ({ ...f, address: { ...f.address, country: e.target.value } }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pincode</label>
                    <input className="form-control" value={form.address.pincode}
                      onChange={(e) => setForm((f) => ({ ...f, address: { ...f.address, pincode: e.target.value } }))} />
                  </div>
                </div>
                <div style={{ display:'flex', gap:10, marginTop:8 }}>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
                </div>
              </form>
            ) : (
              <div className="profile-details-grid">
                {[
                  { label:'Full Name',   value:`${p?.firstName} ${p?.lastName}` },
                  { label:'Employee ID', value:p?.employeeId },
                  { label:'Email',       value:p?.email },
                  { label:'Phone',       value:p?.phone || '—' },
                  { label:'Department',  value:p?.department?.name || '—' },
                  { label:'Designation', value:p?.designation || '—' },
                  { label:'Role',        value:p?.role },
                  { label:'Joining Date',value:formatDate(p?.joiningDate) },
                  { label:'Status',      value:p?.isActive ? 'Active' : 'Inactive' },
                  { label:'Address',     value: p?.address?.city ? `${p.address.city}, ${p.address.state}` : '—' },
                ].map((item) => (
                  <div key={item.label} className="profile-detail-group">
                    <div className="profile-detail-label">{item.label}</div>
                    <div className="profile-detail-value">{item.value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Salary Tab */}
      {tab === 'salary' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Salary Structure</div>
            <div className="card-subtitle">Your monthly compensation breakdown</div>
          </div>
          <div className="card-body">
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:22 }}>
              <div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:'.76rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text-muted)', marginBottom:10 }}>Earnings</div>
                {[
                  ['Basic Salary', p?.salary?.basic],
                  ['HRA',          p?.salary?.hra  ],
                  ['DA',           p?.salary?.da   ],
                  ['Travel Allow.',p?.salary?.ta   ],
                ].map(([label, val]) => (
                  <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border-light)', fontSize:'.875rem' }}>
                    <span style={{ color:'var(--text-secondary)' }}>{label}</span>
                    <span style={{ fontWeight:600 }}>{formatCurrency(val)}</span>
                  </div>
                ))}
                <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', fontSize:'.9rem', fontWeight:700 }}>
                  <span>Gross</span>
                  <span>{formatCurrency((p?.salary?.basic||0)+(p?.salary?.hra||0)+(p?.salary?.da||0)+(p?.salary?.ta||0))}</span>
                </div>
              </div>
              <div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:'.76rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text-muted)', marginBottom:10 }}>Deductions</div>
                {[
                  ['Provident Fund', p?.salary?.pf ],
                  ['Tax',            p?.salary?.tax],
                ].map(([label, val]) => (
                  <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border-light)', fontSize:'.875rem' }}>
                    <span style={{ color:'var(--text-secondary)' }}>{label}</span>
                    <span style={{ fontWeight:600, color:'var(--danger)' }}>- {formatCurrency(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leave Balance Tab */}
      {tab === 'leave' && (
        <div className="leave-balance-grid">
          {[
            { key:'annual',  label:'Annual Leave',  total:18, cls:'annual'  },
            { key:'sick',    label:'Sick Leave',    total:12, cls:'sick'    },
            { key:'casual',  label:'Casual Leave',  total:6,  cls:'casual'  },
          ].map((b) => (
            <div key={b.key} className={`leave-balance-card ${b.cls}`}>
              <div className="leave-balance-value">{p?.leaveBalance?.[b.key] ?? '—'}</div>
              <div className="leave-balance-type">{b.label}</div>
              <div className="leave-balance-total">of {b.total} days remaining</div>
            </div>
          ))}
        </div>
      )}

      {/* Change Password Tab */}
      {tab === 'pw' && (
        <div className="card" style={{ maxWidth:480 }}>
          <div className="card-header">
            <div className="card-title">Change Password</div>
          </div>
          <div className="card-body">
            <Alert type="success" message={pwMsg} />
            <Alert type="error"   message={pwErr} />
            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label className="form-label">Current Password <span>*</span></label>
                <input type="password" className="form-control" value={pwForm.currentPassword}
                  onChange={(e) => setPwForm((f) => ({ ...f, currentPassword: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">New Password <span>*</span></label>
                <input type="password" className="form-control" value={pwForm.newPassword}
                  onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
                  placeholder="Minimum 6 characters" required />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password <span>*</span></label>
                <input type="password" className="form-control" value={pwForm.confirm}
                  onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))} required />
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : '🔒 Update Password'}
              </button>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}
