import React from 'react'
import { useTheme } from '../../context/ThemeContext.jsx'

export default function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button
      aria-label="Toggle theme"
      title="Toggle theme"
      onClick={toggle}
      style={{
        background: 'none',
        border: '1.5px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        width: 36,
        height: 36,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        fontSize: '1.05rem',
        color: 'var(--text-primary)'
      }}
    >
      {theme === 'dark' ? '🌙' : '☀️'}
    </button>
  )
}
