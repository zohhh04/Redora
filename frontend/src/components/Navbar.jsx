import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()
  const onHome = location.pathname === '/'

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

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
