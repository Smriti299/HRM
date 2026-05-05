import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { Alert } from '../components/common/index.jsx'
import '../styles/login.css'

const DEMOS = [
  { label: 'Admin',    email: 'admin@hrm.com', password: 'Admin@123', slug: 'hrm' },
  { label: 'Manager',  email: 'manager@hrm.com', password: 'Manager@123', slug: 'hrm' },
  { label: 'Employee', email: 'ravi@hrm.com',  password: 'Emp@12345', slug: 'hrm' },
]

export default function Login() {
  const [form, setForm]       = useState({ email: '', password: '', slug: '' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const { login }             = useAuth()
  const navigate              = useNavigate()

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.email || !form.password || !form.slug) { setError('Please fill in all fields'); return }
    setLoading(true)
    try {
      await login(form.email, form.password, form.slug)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      {/* Left */}
      <div className="login-left">
        <div className="login-brand">
          <div className="login-brand-icon">🏢</div>
          <div className="login-brand-name">HRM<span>Pro</span></div>
        </div>
        <div className="login-headline">
          <h1>Manage your <span>people,</span> effortlessly.</h1>
          <p>A complete HR platform for attendance, leaves, payroll, and everything in between.</p>
        </div>
        <div className="login-features">
          {['Employee Management', 'Attendance Tracking', 'Leave Management', 'Payroll Generation'].map((f) => (
            <div key={f} className="login-feature">
              <div className="login-feature-dot" />
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* Right */}
      <div className="login-right">
        <div className="login-form-container">
          <div className="login-form-header">
            <h2>Welcome back</h2>
            <p>Sign in to your HRM account</p>
          </div>

          <Alert type="error" message={error} />

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Company Portal / Email <span>*</span></label>
              <div style={{ display:'flex', alignItems:'center', border:'1.5px solid var(--border)', borderRadius:'var(--radius-sm)', overflow:'hidden', background:'var(--bg-card)' }}>
                <input
                  name="slug"
                  className="form-control"
                  placeholder="acme-corp or owner@company.com"
                  value={form.slug}
                  onChange={handleChange}
                  style={{ border:'none', borderRadius:0, flex:1 }}
                />
                <span style={{ padding:'0 12px', color:'var(--text-muted)', fontSize:'.85rem', background:'var(--bg)', borderLeft:'1.5px solid var(--border)', whiteSpace:'nowrap' }}>.hrm.com</span>
              </div>
              <div style={{ fontSize:'.73rem', color:'var(--text-muted)', marginTop:4 }}>
                Your portal: <strong>{form.slug && !form.slug.includes('@') ? `${form.slug}.hrm.com` : 'your-company.hrm.com'}</strong>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Email Address <span>*</span></label>
              <input type="email" name="email" className="form-control" placeholder="you@company.com"
                value={form.email} onChange={handleChange} autoComplete="email" />
            </div>
            <div className="form-group">
              <label className="form-label">Password <span>*</span></label>
              <input type="password" name="password" className="form-control" placeholder="Enter your password"
                value={form.password} onChange={handleChange} autoComplete="current-password" />
            </div>
            <button type="submit" className="btn btn-primary login-submit" disabled={loading}>
              {loading ? '⏳ Signing in...' : 'Sign In →'}
            </button>
          </form>

          <div className="demo-credentials">
            <h4>Demo Accounts — click to fill</h4>
            {DEMOS.map((d) => (
              <div key={d.label} className="demo-cred-item" onClick={() => setForm({ email: d.email, password: d.password, slug: d.slug })}>
                <strong>{d.label}</strong>
                <span>{d.email}</span>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 16, fontSize: '.85rem', color: 'var(--text-muted)' }}>
            New company? <a href="/register" style={{ color: 'var(--accent)', fontWeight: 600 }}>Register your company and try one month free trial -&gt;</a>
          </div>
        </div>
      </div>
    </div>
  )
}
