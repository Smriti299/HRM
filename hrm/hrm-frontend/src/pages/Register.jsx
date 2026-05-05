import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api.js'
import { Alert } from '../components/common/index.jsx'
import '../styles/login.css'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    companyName: '', slug: '', adminFirstName: '',
    adminLastName: '', adminEmail: '', password: '',
  })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({
      ...f,
      [name]: value,
      // Auto-generate slug from company name
      ...(name === 'companyName' ? { slug: value.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') } : {}),
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const registerRes = await api.post('/companies/register', {
        name: form.companyName,
        email: form.adminEmail,
        slug: form.slug,
        password: form.password,
        admin: {
          firstName: form.adminFirstName,
          lastName: form.adminLastName,
          email: form.adminEmail,
          password: form.password,
        },
      })
      const { company } = registerRes.data.data
      const loginRes = await api.post('/auth/login', {
        email: form.adminEmail,
        password: form.password,
        companyId: company.id,
      })
      const { token, employee } = loginRes.data.data
      localStorage.setItem('hrm_token', token)
      localStorage.setItem('hrm_user', JSON.stringify(employee))
      localStorage.setItem('hrm_company', JSON.stringify(company))
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-brand">
          <div className="login-brand-icon">🏢</div>
          <div className="login-brand-name">HRM<span>Pro</span></div>
        </div>
        <div className="login-headline">
          <h1>Set up your <span>company</span> in minutes.</h1>
          <p>Register your company and get a dedicated HR portal instantly. No setup required.</p>
        </div>
        <div className="login-features">
          {['Your own subdomain (company.hrm.com)', 'Complete data isolation', 'Unlimited employees on Pro plan', 'Cancel anytime'].map((f) => (
            <div key={f} className="login-feature">
              <div className="login-feature-dot" />
              {f}
            </div>
          ))}
        </div>
      </div>

      <div className="login-right">
        <div className="login-form-container">
          <div className="login-form-header">
            <h2>Create your account</h2>
            <p>Already registered? <a href="/login" style={{ color:'var(--accent)' }}>Sign in</a></p>
          </div>
          <Alert type="error" message={error} />
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Company Name <span>*</span></label>
              <input name="companyName" className="form-control" value={form.companyName} onChange={handleChange} placeholder="Acme Corp" required />
            </div>
            <div className="form-group">
              <label className="form-label">Your Portal URL <span>*</span></label>
              <div style={{ display:'flex', alignItems:'center', border:'1.5px solid var(--border)', borderRadius:'var(--radius-sm)', overflow:'hidden', background:'var(--bg-card)' }}>
                <input
                  name="slug" className="form-control"
                  value={form.slug} onChange={handleChange}
                  placeholder="acme-corp" required
                  style={{ border:'none', borderRadius:0, flex:1 }}
                />
                <span style={{ padding:'0 12px', color:'var(--text-muted)', fontSize:'.85rem', background:'var(--bg)', borderLeft:'1.5px solid var(--border)', whiteSpace:'nowrap' }}>.hrm.com</span>
              </div>
              <div style={{ fontSize:'.73rem', color:'var(--text-muted)', marginTop:4 }}>
                Your portal: <strong>{form.slug || 'your-company'}hrm.com</strong>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">First Name <span>*</span></label>
                <input name="adminFirstName" className="form-control" value={form.adminFirstName} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name <span>*</span></label>
                <input name="adminLastName" className="form-control" value={form.adminLastName} onChange={handleChange} required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Work Email <span>*</span></label>
              <input type="email" name="adminEmail" className="form-control" value={form.adminEmail} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password <span>*</span></label>
              <input type="password" name="password" className="form-control" value={form.password} onChange={handleChange} placeholder="Min 6 characters" required />
            </div>
            <button type="submit" className="btn btn-primary login-submit" disabled={loading}>
              {loading ? '⏳ Creating your portal...' : 'Create Company Portal →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
