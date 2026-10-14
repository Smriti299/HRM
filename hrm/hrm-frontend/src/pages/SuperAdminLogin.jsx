import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api.js'
import { Alert } from '../components/common/index.jsx'
import '../styles/login.css'

export default function SuperAdminLogin() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { token, superAdmin } = (await api.post('/super-admin/login', form)).data.data
      localStorage.removeItem('hrm_user')
      localStorage.removeItem('hrm_company')
      localStorage.setItem('hrm_token', token)
      localStorage.setItem('hrm_super_admin', JSON.stringify(superAdmin))
      navigate('/super-admin/companies')
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to sign in')
    } finally { setLoading(false) }
  }

  return <div className="login-page">
    <div className="login-left"><div className="login-brand"><div className="login-brand-icon">◆</div><div className="login-brand-name">HRM<span>Pro</span></div></div>
      <div className="login-headline"><h1>Platform <span>control.</span></h1><p>Review company requests and manage account access across the platform.</p></div>
      <div className="login-features">{['Review registrations', 'Pause or restore company access', 'Keep a record of account actions'].map((item) => <div key={item} className="login-feature"><div className="login-feature-dot" />{item}</div>)}</div>
    </div>
    <div className="login-right"><div className="login-form-container">
      <div className="login-form-header"><h2>Super admin sign in</h2><p>Platform administrator access</p></div>
      <Alert type="error" message={error} />
      <form onSubmit={submit}>
        <div className="form-group"><label className="form-label">Email <span>*</span></label><input type="email" className="form-control" autoComplete="username" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
        <div className="form-group"><label className="form-label">Password <span>*</span></label><input type="password" className="form-control" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></div>
        <button className="btn btn-primary login-submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign in to platform →'}</button>
      </form>
    </div></div>
  </div>
}
