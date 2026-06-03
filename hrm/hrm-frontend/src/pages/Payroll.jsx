import React, { useEffect, useState, useCallback } from 'react'
import Layout from '../components/layout/Layout.jsx'
import { Spinner, Badge, EmptyState, Pagination, Modal, Alert } from '../components/common/index.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import api from '../services/api.js'
import { formatDate, formatCurrency, getMonthName } from '../utils/helpers.js'
import { saveAs } from 'file-saver'
import '../styles/pages.css'
import '../styles/components.css'

const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: getMonthName(i + 1) }))
const YEARS  = [2024, 2025, 2026]

export default function Payroll() {
  const { user }   = useAuth()
  const isAdminHR  = ['Admin', 'Manager', 'HR'].includes(user?.role)

  const [payrolls, setPayrolls]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [page, setPage]               = useState(1)
  const [totalPages, setTotalPages]   = useState(1)
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1)
  const [filterYear, setFilterYear]   = useState(new Date().getFullYear())
  const [myPayslip, setMyPayslip]     = useState(null)
  const [psMonth, setPsMonth]         = useState(new Date().getMonth() + 1)
  const [psYear, setPsYear]           = useState(new Date().getFullYear())
  const [psLoading, setPsLoading]     = useState(false)
  const [payslipLoading, setPayslipLoading] = useState(false)
  const [exporting, setExporting]     = useState(false)
  const [exportError, setExportError] = useState('')
  const [exportMsg, setExportMsg]     = useState('')
  const [showGenerate, setShowGenerate]   = useState(false)
  const [employees, setEmployees]         = useState([])
  const [genForm, setGenForm]             = useState({ employeeId: '', month: new Date().getMonth() + 1, year: new Date().getFullYear() })
  const [genError, setGenError]           = useState('')
  const [generating, setGenerating]       = useState(false)

  /* ── Admin/HR: list all payrolls ── */
  const fetchPayrolls = useCallback(async () => {
    if (!isAdminHR) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 10, month: filterMonth, year: filterYear })
      const res = await api.get(`/payroll?${params}`)
      setPayrolls((res.data.data || []).filter((p) => p.employee !== null && p.employee !== undefined))
      setTotalPages(res.data.meta?.totalPages || 1)
    } finally { setLoading(false) }
  }, [isAdminHR, page, filterMonth, filterYear])

  useEffect(() => { fetchPayrolls() }, [fetchPayrolls])

  /* ── Employee: fetch own payslip ── */
  const fetchMyPayslip = async () => {
    setPsLoading(true); setMyPayslip(null)
    try {
      const res = await api.get(`/payroll/me?month=${psMonth}&year=${psYear}`)
      setMyPayslip(res.data.data)
    } catch (_) { setMyPayslip(null) }
    finally { setPsLoading(false) }
  }

  useEffect(() => {
    if (!isAdminHR) fetchMyPayslip()
  }, [isAdminHR, psMonth, psYear])

  useEffect(() => {
    if (isAdminHR) api.get('/employees?limit=100').then((r) => setEmployees(r.data.data || []))
  }, [isAdminHR])

  const downloadBlob = (blob, filename) => {
    const file = new Blob([blob], { type: blob.type || 'application/octet-stream' })
    saveAs(file, filename)
  }

  const handleExportPayrollExcel = async () => {
    setExporting(true)
    setExportMsg('')
    setExportError('')
    try {
      const res = await api.get(`/payroll/export/excel?month=${filterMonth}&year=${filterYear}`, { responseType: 'blob' })
      downloadBlob(res.data, `payroll-${filterYear}-${filterMonth}.xlsx`)
      setExportMsg('Payroll Excel export is ready.')
    } catch (err) {
      setExportError(err.response?.data?.message || 'Failed to export payroll')
    } finally {
      setExporting(false)
    }
  }

  const downloadPayslip = async (payrollId) => {
    setPayslipLoading(true)
    setExportError('')
    setExportMsg('')
    try {
      const res = await api.get(`/payroll/${payrollId}/payslip/pdf`, { responseType: 'blob' })
      downloadBlob(res.data, `payslip-${payrollId}.pdf`)
      setExportMsg('Payslip PDF is downloading.')
    } catch (err) {
      setExportError(err.response?.data?.message || 'Payslip download failed')
    } finally {
      setPayslipLoading(false)
    }
  }

  const handleGenerate = async (e) => {
    e.preventDefault()
    setGenerating(true); setGenError('')
    try {
      await api.post('/payroll/generate', genForm)
      setShowGenerate(false); fetchPayrolls()
    } catch (err) {
      setGenError(err.response?.data?.message || 'Failed to generate')
    } finally { setGenerating(false) }
  }

  const handleMarkPaid = async (id) => {
    if (!window.confirm('Mark this payroll as paid?')) return
    try { await api.put(`/payroll/${id}/mark-paid`); fetchPayrolls() }
    catch (err) { alert(err.response?.data?.message || 'Failed') }
  }

  /* ── Payslip Card ── */
  const PayslipCard = ({ p }) => (
    <div className="payslip">
      <div className="payslip-header">
        <div>
          <div className="payslip-company">HRM Pro</div>
          <div className="payslip-period">Payslip — {getMonthName(p.month)} {p.year}</div>
        </div>
        <div className="payslip-emp-info">
          <div className="payslip-emp-name">{p.employee?.firstName} {p.employee?.lastName}</div>
          <div className="payslip-emp-id">{p.employee?.employeeId} · {p.employee?.designation || 'Employee'}</div>
          <div className="payslip-emp-id" style={{ marginTop: 4 }}><Badge status={p.status} /></div>
        </div>
      </div>

      <div className="payslip-body">
        {/* Attendance summary */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:22, background:'var(--bg)', borderRadius:'var(--radius-md)', padding:'14px 16px' }}>
          {[
            { label:'Working Days', value: p.workingDaysInMonth },
            { label:'Present',      value: p.presentDays },
            { label:'Absent',       value: p.absentDays  },
            { label:'Leave',        value: p.leaveDays   },
          ].map((s) => (
            <div key={s.label} style={{ textAlign:'center' }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:'1.3rem', fontWeight:800 }}>{s.value}</div>
              <div style={{ fontSize:'.72rem', color:'var(--text-muted)', marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div className="payslip-row">
          {/* Earnings */}
          <div>
            <div className="payslip-section-title">Earnings</div>
            {[
              ['Basic Salary', p.earnings?.basic],
              ['HRA',          p.earnings?.hra  ],
              ['DA',           p.earnings?.da   ],
              ['Travel Allow.',p.earnings?.ta   ],
              ['Bonus',        p.earnings?.bonus],
            ].map(([label, val]) => (
              <div key={label} className="payslip-line">
                <span>{label}</span><span>{formatCurrency(val)}</span>
              </div>
            ))}
            <div className="payslip-line" style={{ fontWeight:700, marginTop:6 }}>
              <span>Gross Salary</span><span>{formatCurrency(p.grossSalary)}</span>
            </div>
          </div>

          {/* Deductions */}
          <div>
            <div className="payslip-section-title">Deductions</div>
            {[
              ['Provident Fund', p.deductions?.pf   ],
              ['Tax',            p.deductions?.tax  ],
              ['Loss of Pay',    p.deductions?.lop  ],
              ['Others',         p.deductions?.other],
            ].map(([label, val]) => (
              <div key={label} className="payslip-line deduction">
                <span>{label}</span><span>- {formatCurrency(val)}</span>
              </div>
            ))}
            <div className="payslip-line" style={{ fontWeight:700, marginTop:6 }}>
              <span>Total Deductions</span><span style={{ color:'var(--danger)' }}>- {formatCurrency(p.totalDeductions)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="payslip-net">
        <div className="payslip-net-label">Net Take-Home Salary</div>
        <div className="payslip-net-value">{formatCurrency(p.netSalary)}</div>
      </div>
    </div>
  )

  /* ── Employee view ── */
  if (!isAdminHR) {
    return (
      <Layout title="My Payslip" subtitle="View your monthly salary details">
        <div style={{ display:'flex', gap:12, marginBottom:22, alignItems:'center', flexWrap:'wrap' }}>
          <h3 style={{ fontFamily:'var(--font-display)', fontSize:'1rem' }}>Select Month</h3>
          <select className="form-control" style={{ width:'auto' }} value={psMonth} onChange={(e) => setPsMonth(Number(e.target.value))}>
            {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <select className="form-control" style={{ width:'auto' }} value={psYear} onChange={(e) => setPsYear(Number(e.target.value))}>
            {YEARS.map((y) => <option key={y}>{y}</option>)}
          </select>
          <button className="btn btn-secondary" onClick={() => myPayslip && downloadPayslip(myPayslip._id)} disabled={psLoading || !myPayslip}>Download Payslip</button>
        </div>
        {(exportMsg || exportError) && (
          <div style={{ marginBottom: 16 }}>
            {exportMsg && <Alert type="success" message={exportMsg} />}
            {exportError && <Alert type="error" message={exportError} />}
          </div>
        )}
        {psLoading ? <Spinner /> : myPayslip ? <PayslipCard p={myPayslip} /> : (
          <EmptyState icon="💰" title="No payslip found" message={`Payslip for ${getMonthName(psMonth)} ${psYear} has not been generated yet.`} />
        )}
      </Layout>
    )
  }

  /* ── Admin/HR view ── */
  return (
    <Layout title="Payroll" subtitle="Manage employee payroll">

      <div className="page-header">
        <div className="page-header-left">
          <h2>Payroll Records</h2>
        </div>
        <div className="page-header-actions">
          <select className="form-control" style={{ width:'auto' }} value={filterMonth} onChange={(e) => { setFilterMonth(Number(e.target.value)); setPage(1) }}>
            {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <select className="form-control" style={{ width:'auto' }} value={filterYear} onChange={(e) => { setFilterYear(Number(e.target.value)); setPage(1) }}>
            {YEARS.map((y) => <option key={y}>{y}</option>)}
          </select>
          <button className="btn btn-secondary" disabled={exporting} onClick={handleExportPayrollExcel}>Export Payroll Excel</button>
          <button className="btn btn-primary" onClick={() => setShowGenerate(true)}>⚙ Generate Payroll</button>
        </div>
      </div>

      {(exportMsg || exportError) && (
        <div style={{ margin: '0 0 16px' }}>
          {exportMsg && <Alert type="success" message={exportMsg} />}
          {exportError && <Alert type="error" message={exportError} />}
        </div>
      )}

      {loading ? <Spinner /> : payrolls.length === 0 ? (
        <EmptyState icon="💰" title="No payroll records" message="Generate payroll for employees using the button above" />
      ) : (
        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Employee</th><th>Period</th><th>Present</th>
                  <th>Gross</th><th>Deductions</th><th>Net Salary</th>
                  <th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payrolls.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <div className="avatar-name">{p.employee?.firstName} {p.employee?.lastName}</div>
                      <div className="avatar-sub">{p.employee?.employeeId}</div>
                    </td>
                    <td className="td-muted">{getMonthName(p.month)} {p.year}</td>
                    <td>{p.presentDays}/{p.workingDaysInMonth}</td>
                    <td>{formatCurrency(p.grossSalary)}</td>
                    <td style={{ color:'var(--danger)' }}>- {formatCurrency(p.totalDeductions)}</td>
                    <td style={{ fontWeight:700 }}>{formatCurrency(p.netSalary)}</td>
                    <td><Badge status={p.status} /></td>
                    <td style={{ display:'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => downloadPayslip(p._id)} disabled={payslipLoading}>
                        Download Payslip
                      </button>
                      {p.status !== 'Paid' && user?.role === 'Admin' && (
                        <button className="btn btn-success btn-sm" onClick={() => handleMarkPaid(p._id)}>
                          Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      {/* Generate Modal */}
      {showGenerate && (
        <Modal title="Generate Payroll"
          onClose={() => { setShowGenerate(false); setGenError('') }}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowGenerate(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
                {generating ? 'Generating...' : 'Generate'}
              </button>
            </>
          }
        >
          <Alert type="error" message={genError} />
          <div className="form-group">
            <label className="form-label">Employee <span>*</span></label>
            <select className="form-control" value={genForm.employeeId}
              onChange={(e) => setGenForm((f) => ({ ...f, employeeId: e.target.value }))} required>
              <option value="">Select Employee</option>
              {employees.map((e) => (
                <option key={e._id} value={e._id}>{e.firstName} {e.lastName} ({e.employeeId})</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Month <span>*</span></label>
              <select className="form-control" value={genForm.month}
                onChange={(e) => setGenForm((f) => ({ ...f, month: Number(e.target.value) }))}>
                {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Year <span>*</span></label>
              <select className="form-control" value={genForm.year}
                onChange={(e) => setGenForm((f) => ({ ...f, year: Number(e.target.value) }))}>
                {YEARS.map((y) => <option key={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <div style={{ background:'var(--info-soft)', border:'1px solid rgba(59,130,246,.2)', borderRadius:'var(--radius-sm)', padding:'12px 14px', fontSize:'.83rem', color:'var(--info)' }}>
            ℹ️ Payroll is auto-calculated from attendance records for the selected month.
          </div>
        </Modal>
      )}
    </Layout>
  )
}
