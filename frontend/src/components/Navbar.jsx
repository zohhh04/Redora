import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from './ThemeToggle'
import api from '../api/axios'

export default function Navbar() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [unread, setUnread] = useState(0)
  const location = useLocation()
  const onHome = location.pathname === '/'

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (user?.role !== 'donor') return
    let active = true
    const load = () =>
      api
        .get('/notifications', { params: { unread: 'true' } })
        .then(({ data }) => {
          if (active) setUnread(data.unreadCount || 0)
        })
        .catch(() => {})
    load()
    const timer = setInterval(load, 10000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [user?.role, location.pathname])

  const className = `navbar ${scrolled || !onHome ? 'navbar-solid' : ''}`

  return (
    <nav className={className}>
      <Link to="/" className="nav-brand">
        <span className="nav-logo">🩸</span>
        Redora
      </Link>

      {onHome && (
        <div className="nav-links">
          <a href="#blood-types">Blood Types</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#impact">Why Donate</a>
        </div>
      )}

      <div className="nav-actions">
        <ThemeToggle />
        {user && user.role === 'donor' && (
          <button
            type="button"
            className="notif-bell"
            onClick={() => navigate('/notifications')}
            aria-label="Notifications"
            title="Notifications"
          >
            🔔
            {unread > 0 && <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>}
          </button>
        )}
        {user ? (
          user.role === 'donor' ? (
            <>
              <Link to="/dashboard" className="btn nav-btn">
                Dashboard
              </Link>
              <Link to="/profile" className="btn nav-btn">
                Profile
              </Link>
              <Link to="/journey" className="btn nav-btn">
                My Journey
              </Link>
              <Link to="/donations" className="btn nav-btn">
                Donations
              </Link>
              <Link to="/logout" className="btn nav-btn">
                Logout
              </Link>
            </>
          ) : (
            <>
              <Link to="/dashboard" className="btn nav-btn">
                Dashboard
              </Link>
              <Link to="/request-blood" className="btn nav-btn">
                Request Blood
              </Link>
              <Link to="/logout" className="btn nav-btn">
                Logout
              </Link>
            </>
          )
        ) : (
          <>
            <Link to="/login" className="btn nav-btn">
              Login
            </Link>
            <Link to="/register" className="btn nav-btn">
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}
