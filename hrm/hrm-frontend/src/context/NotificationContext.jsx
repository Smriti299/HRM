import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api.js'
import { useAuth } from './AuthContext.jsx'

const NotificationContext = createContext(null)

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount]     = useState(0)
  const [loading, setLoading]             = useState(false)

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return
    try {
      const res = await api.get('/notifications/unread-count')
      setUnreadCount(res.data.data?.count || 0)
    } catch (_) {}
  }, [user])

  const fetchNotifications = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const res = await api.get('/notifications?limit=20')
      setNotifications(res.data.data || [])
      setUnreadCount(res.data.meta?.unreadCount || 0)
    } catch (_) {}
    finally { setLoading(false) }
  }, [user])

  const markOneRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`)
      setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, isRead: true } : n))
      setUnreadCount((c) => Math.max(0, c - 1))
    } catch (_) {}
  }

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all')
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch (_) {}
  }

  const deleteOne = async (id) => {
    try {
      await api.delete(`/notifications/${id}`)
      const removed = notifications.find((n) => n._id === id)
      setNotifications((prev) => prev.filter((n) => n._id !== id))
      if (removed && !removed.isRead) setUnreadCount((c) => Math.max(0, c - 1))
    } catch (_) {}
  }

  // Poll every 30 seconds
  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [fetchUnreadCount])

  return (
    <NotificationContext.Provider value={{
      notifications, unreadCount, loading,
      fetchNotifications, markOneRead, markAllRead, deleteOne,
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => useContext(NotificationContext)
