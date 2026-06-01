import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { NotificationProvider } from './context/NotificationContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'

import Login            from './pages/Login.jsx'
import Dashboard        from './pages/Dashboard.jsx'
import Employees        from './pages/Employees.jsx'
import Departments      from './pages/Departments.jsx'
import Attendance       from './pages/Attendance.jsx'
import AdminAttendance  from './pages/AdminAttendance.jsx'
import Leaves           from './pages/Leaves.jsx'
import Payroll          from './pages/Payroll.jsx'
import Profile          from './pages/Profile.jsx'
import Register         from './pages/Register.jsx'
const PrivateRoute = ({ children, roles }) => {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return children
}

const PublicRoute = ({ children }) => {
  const { user } = useAuth()
  return user ? <Navigate to="/dashboard" replace /> : children
}

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
    <Route path="/dashboard"          element={<PrivateRoute><Dashboard /></PrivateRoute>} />
    <Route path="/employees"          element={<PrivateRoute roles={['Admin', 'Manager', 'HR']}><Employees /></PrivateRoute>} />
    <Route path="/departments"        element={<PrivateRoute roles={['Admin']}><Departments /></PrivateRoute>} />
    <Route path="/attendance"         element={<PrivateRoute><Attendance /></PrivateRoute>} />
    <Route path="/admin/attendance"   element={<PrivateRoute roles={['Admin', 'Manager', 'HR']}><AdminAttendance /></PrivateRoute>} />
    <Route path="/leaves"             element={<PrivateRoute><Leaves /></PrivateRoute>} />
    <Route path="/payroll"            element={<PrivateRoute><Payroll /></PrivateRoute>} />
    <Route path="/profile"            element={<PrivateRoute><Profile /></PrivateRoute>} />
    <Route path="*"                   element={<Navigate to="/dashboard" replace />} />
    <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
  </Routes>
)

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
