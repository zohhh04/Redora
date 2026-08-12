import { useTheme } from '../context/ThemeContext'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const dark = theme === 'dark'

  return (
    <button
      type="button"
      className={`theme-toggle ${dark ? 'is-dark' : ''}`}
      onClick={toggleTheme}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={dark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      <span className="theme-toggle-icon">{dark ? '☀️' : '🌙'}</span>
    </button>
  )
}
