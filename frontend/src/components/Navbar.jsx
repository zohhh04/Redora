import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

export default function Navbar() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [unread, setUnread] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const onHome = location.pathname === '/'

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (user?.role !== 'donor' && user?.role !== 'patient') return
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
    const onMarkAllRead = () => load()
    window.addEventListener('redora:notif-read', onMarkAllRead)
    return () => {
      active = false
      clearInterval(timer)
      window.removeEventListener('redora:notif-read', onMarkAllRead)
    }
  }, [user?.role, location.pathname])

  const className = `navbar ${scrolled || !onHome ? 'navbar-solid' : ''}`

  return (
    <nav className={className}>
      <Link to="/" className="nav-brand">
        <span className="nav-logo">🩸</span>
        Redora
      </Link>

      {onHome && <div className="nav-links"></div>}

      <div className={`nav-actions ${menuOpen ? 'open' : ''}`}>
        {user && (user.role === 'donor' || user.role === 'patient') && (
          <button
            type="button"
            className="btn nav-btn notif-bell"
            onClick={() => navigate('/notifications')}
            aria-label="Notifications"
            title="Notifications"
          >
            Notification
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
              <Link to="/donations" className="btn nav-btn">
                Journey &amp; Donations
              </Link>
              <Link to="/leaderboard" className="btn nav-btn">
                Leaderboard
              </Link>
              <Link to="/community" className="btn nav-btn">
                Community
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
              <Link to="/search-donors" className="btn nav-btn">
                Search Donor
              </Link>
              <Link to="/my-requests" className="btn nav-btn">
                My Requests
              </Link>
              <Link to="/leaderboard" className="btn nav-btn">
                Leaderboard
              </Link>
              <Link to="/community" className="btn nav-btn">
                Community
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

      <div className="nav-tools">
        <button
          type="button"
          className={`nav-burger ${menuOpen ? 'open' : ''}`}
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </nav>
  )
}
