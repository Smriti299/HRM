import React, { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext()

const STORAGE_KEY = 'hrm_theme'

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return saved
    } catch (e) {}
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'light'
  })

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, theme) } catch (e) {}
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
  }, [theme])

  useEffect(() => {
    // Listen to system changes if user has not explicitly set preference
    const mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)')
    const handle = (e) => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) return // user preference takes precedence
      } catch (e) {}
      setTheme(e.matches ? 'dark' : 'light')
    }
    if (mq && mq.addEventListener) mq.addEventListener('change', handle)
    else if (mq && mq.addListener) mq.addListener(handle)
    return () => {
      if (mq && mq.removeEventListener) mq.removeEventListener('change', handle)
      else if (mq && mq.removeListener) mq.removeListener(handle)
    }
  }, [])

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)

export default ThemeContext
