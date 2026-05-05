import React, { createContext, useContext, useState } from 'react'
import api from '../services/api.js'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hrm_user')) } catch { return null }
  })
  const [company, setCompany] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hrm_company')) } catch { return null }
  })

  const login = async (email, password, companyKey) => {
    const companyField = companyKey?.includes('@') ? { companyEmail: companyKey } : { slug: companyKey }
    const res = await api.post('/auth/login', { email, password, ...companyField })
    const { token, employee, tenant, company } = res.data.data
    localStorage.setItem('hrm_token', token)
    localStorage.setItem('hrm_user', JSON.stringify(employee))
    if (company) {
      localStorage.setItem('hrm_company', JSON.stringify(company))
      setCompany(company)
    }
    if (tenant) {
      localStorage.setItem('hrm_tenant', JSON.stringify(tenant))
    }
    setUser(employee)
    return employee
  }

  const logout = () => {
    localStorage.removeItem('hrm_token')
    localStorage.removeItem('hrm_user')
    localStorage.removeItem('hrm_company')
    localStorage.removeItem('hrm_tenant')
    setCompany(null)
    setUser(null)
  }

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me')
      const updated = res.data.data
      localStorage.setItem('hrm_user', JSON.stringify(updated))
      setUser(updated)
    } catch (_) {}
  }

  return (
    <AuthContext.Provider value={{ user, company, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
